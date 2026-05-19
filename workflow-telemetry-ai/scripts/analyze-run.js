#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Parse command-line arguments
const runDir = process.argv[2];
if (!runDir) {
  console.error('Usage: node analyze-run.js <run-dir>');
  process.exit(1);
}

const eventsFile = path.join(runDir, 'events.jsonl');
const transcriptFile = path.join(runDir, 'transcript.snapshot.jsonl');

// Helper: read JSONL file
function readJsonl(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  return content
    .split('\n')
    .filter(line => line.trim())
    .map(line => JSON.parse(line));
}

// Parse events
const events = readJsonl(eventsFile);
const runStartEvent = events.find(e => e.type === 'runStart');
const runEndEvent = events.find(e => e.type === 'runEnd');
const stepEvents = events.filter(e => e.type === 'stepStart' || e.type === 'stepEnd');

// Build steps map
const steps = [];
let currentStep = null;
for (const event of stepEvents) {
  if (event.type === 'stepStart') {
    currentStep = {
      stepName: event.stepName,
      startTs: new Date(event.timestamp).getTime(),
      startUuid: event.lastUuid,
      endTs: null,
      endUuid: null
    };
  } else if (event.type === 'stepEnd') {
    if (currentStep && currentStep.stepName === event.stepName) {
      currentStep.endTs = new Date(event.timestamp).getTime();
      currentStep.endUuid = event.lastUuid;
      steps.push(currentStep);
      currentStep = null;
    }
  }
}

// Parse transcript
const transcript = readJsonl(transcriptFile);
const uuidToEntry = {};
const uuidToParent = {};
let sessionId, model, version, entrypoint, gitBranch, cwd;

for (const entry of transcript) {
  if (entry.uuid) {
    uuidToEntry[entry.uuid] = entry;
    if (entry.parentUuid !== undefined) {
      uuidToParent[entry.uuid] = entry.parentUuid;
    }
  }
  if (!sessionId && entry.sessionId) {
    sessionId = entry.sessionId;
    version = entry.version;
    entrypoint = entry.entrypoint;
    gitBranch = entry.gitBranch;
    cwd = entry.cwd;
  }
  if (!model && entry.message && entry.message.model) {
    model = entry.message.model;
  }
}

// Helper: walk parent chain
function getParentChain(uuid) {
  const chain = [uuid];
  let current = uuid;
  while (uuidToParent[current]) {
    current = uuidToParent[current];
    if (!current) break;
    chain.push(current);
  }
  return chain;
}

// Helper: walk parent chain between two UUIDs (exclusive on both ends)
function getChainBetween(endUuid, startUuid) {
  const chain = [];
  const endChain = getParentChain(endUuid);
  const startIdx = endChain.indexOf(startUuid);
  if (startIdx === -1) return chain;

  // Collect from endUuid backward to (but not including) startUuid
  for (let i = 0; i < startIdx; i++) {
    if (endChain[i] !== endUuid && endChain[i] !== startUuid) {
      chain.push(endChain[i]);
    }
  }
  return chain;
}

// Helper: get messages in a segment
function getMessagesInSegment(uuids) {
  return uuids
    .map(uuid => uuidToEntry[uuid])
    .filter(entry => entry && entry.type === 'assistant' && entry.message && entry.message.usage);
}

// Helper: sum tokens
function sumTokens(entries) {
  let input = 0;
  let cacheCreation = 0;
  let cacheRead = 0;
  let output = 0;

  for (const entry of entries) {
    if (entry.message && entry.message.usage) {
      const usage = entry.message.usage;
      input += usage.input_tokens || 0;
      cacheCreation += usage.cache_creation_input_tokens || 0;
      cacheRead += usage.cache_read_input_tokens || 0;
      output += usage.output_tokens || 0;
    }
  }

  return {
    input,
    cacheCreation,
    cacheRead,
    output,
    total: input + cacheCreation + cacheRead + output
  };
}

// Helper: count tools used
function countTools(entries) {
  const tools = {};
  for (const entry of entries) {
    if (entry.message && entry.message.content) {
      for (const content of entry.message.content) {
        if (content.type === 'tool_use') {
          const toolName = content.name;
          tools[toolName] = (tools[toolName] || 0) + 1;
        }
      }
    }
  }
  return tools;
}

// Helper: count tool errors
function countErrors(entries) {
  let errors = 0;
  for (const entry of entries) {
    if (entry.message && entry.message.content) {
      for (const content of entry.message.content) {
        if (content.type === 'tool_use') {
          // Find matching tool result
          const toolUseId = content.id;
          // Look through transcript for the matching user message
          for (const otherEntry of transcript) {
            if (otherEntry.type === 'user' && otherEntry.message && otherEntry.message.content) {
              for (const resultContent of otherEntry.message.content) {
                if (resultContent.tool_use_id === toolUseId) {
                  if (resultContent.is_error || otherEntry.toolUseResult?.interrupted) {
                    errors++;
                  }
                }
              }
            }
          }
        }
      }
    }
  }
  return errors;
}

// Helper: count user interactions
function countUserInteractions(entries) {
  let count = 0;
  for (const entry of entries) {
    if (entry.message && entry.message.content) {
      for (const content of entry.message.content) {
        if (content.type === 'tool_use' && content.name === 'AskUserQuestion') {
          count++;
        }
      }
    }
  }
  return count;
}

// Build segments
const runStartTs = new Date(runStartEvent.timestamp).getTime();
const runEndTs = new Date(runEndEvent.timestamp).getTime();

// Pre-run: from first message to runStart.lastUuid (exclusive)
const preRunChain = getParentChain(runStartEvent.lastUuid);
const preRunUuids = preRunChain.filter(uuid => uuid !== runStartEvent.lastUuid);
const preRunMessages = getMessagesInSegment(preRunUuids);

// Steps
const stepsData = [];
for (const step of steps) {
  const stepChain = getChainBetween(step.endUuid, step.startUuid);
  const stepMessages = getMessagesInSegment(stepChain);
  stepsData.push({
    ...step,
    messages: stepMessages,
    chain: stepChain
  });
}

// Interstitial
const interstitialData = [];
for (let i = 0; i < steps.length - 1; i++) {
  const betweenChain = getChainBetween(steps[i + 1].startUuid, steps[i].endUuid);
  const betweenMessages = getMessagesInSegment(betweenChain);
  if (betweenChain.length > 0) {
    interstitialData.push({
      afterStep: steps[i].stepName,
      beforeStep: steps[i + 1].stepName,
      messages: betweenMessages,
      chain: betweenChain
    });
  }
}

// Post-run: from last stepEnd.lastUuid to runEnd.lastUuid (exclusive)
const postRunChain = getChainBetween(runEndEvent.lastUuid, steps[steps.length - 1].endUuid);
const postRunMessages = getMessagesInSegment(postRunChain);

// Compute tokens for each segment
const preRunTokens = sumTokens(preRunMessages);
const postRunTokens = sumTokens(postRunMessages);

const stepsTokens = stepsData.map(s => ({
  ...s,
  tokens: sumTokens(s.messages)
}));

const interstitialTokens = interstitialData.map(i => ({
  ...i,
  tokens: sumTokens(i.messages)
}));

// Compute tools for each segment
const preRunTools = countTools(preRunMessages);
const postRunTools = countTools(postRunMessages);

const stepsToolsAndErrors = stepsTokens.map(s => ({
  ...s,
  tools: countTools(s.messages),
  errors: countErrors(s.messages),
  userInteractions: countUserInteractions(s.messages)
}));

const interstitialToolsAndErrors = interstitialTokens.map(i => ({
  ...i,
  tools: countTools(i.messages),
  userInteractions: countUserInteractions(i.messages)
}));

// Compute anomaly flags
const medianCacheCreation = (() => {
  const values = stepsToolsAndErrors.map(s => s.tokens.cacheCreation).sort((a, b) => a - b);
  const mid = Math.floor(values.length / 2);
  return values.length % 2 ? values[mid] : (values[mid - 1] + values[mid]) / 2;
})();

const stepFlags = stepsToolsAndErrors.map(s => {
  const flags = [];
  if (s.tokens.cacheCreation > medianCacheCreation * 2) {
    flags.push('HIGH_TOKEN_STEP');
  }
  if (s.endTs - s.startTs > 30000) {
    flags.push('SLOW_STEP');
  }
  if (s.errors > 0) {
    flags.push('TOOL_ERROR');
  }
  return flags;
});

// Global error/interrupted flags
let hasToolError = false;
let hasInterrupted = false;
for (const entry of transcript) {
  if (entry.type === 'user' && entry.message && entry.message.content) {
    for (const content of entry.message.content) {
      if (content.is_error) hasToolError = true;
    }
  }
  if (entry.toolUseResult?.interrupted) {
    hasInterrupted = true;
  }
}

const runFlags = [];
if (hasToolError) runFlags.push('TOOL_ERROR');
if (hasInterrupted) runFlags.push('INTERRUPTED');

// Compute totals
const totalTokens = {
  input: preRunTokens.input + postRunTokens.input + stepsTokens.reduce((s, st) => s + st.tokens.input, 0) + interstitialTokens.reduce((s, it) => s + it.tokens.input, 0),
  cacheCreation: preRunTokens.cacheCreation + postRunTokens.cacheCreation + stepsTokens.reduce((s, st) => s + st.tokens.cacheCreation, 0) + interstitialTokens.reduce((s, it) => s + it.tokens.cacheCreation, 0),
  cacheRead: preRunTokens.cacheRead + postRunTokens.cacheRead + stepsTokens.reduce((s, st) => s + st.tokens.cacheRead, 0) + interstitialTokens.reduce((s, it) => s + it.tokens.cacheRead, 0),
  output: preRunTokens.output + postRunTokens.output + stepsTokens.reduce((s, st) => s + st.tokens.output, 0) + interstitialTokens.reduce((s, it) => s + it.tokens.output, 0)
};
totalTokens.total = totalTokens.input + totalTokens.cacheCreation + totalTokens.cacheRead + totalTokens.output;

const totalTools = {};
const mergeTools = (src, dst) => {
  for (const [name, count] of Object.entries(src)) {
    dst[name] = (dst[name] || 0) + count;
  }
};
mergeTools(preRunTools, totalTools);
mergeTools(postRunTools, totalTools);
for (const s of stepsToolsAndErrors) {
  mergeTools(s.tools, totalTools);
}
for (const i of interstitialToolsAndErrors) {
  mergeTools(i.tools, totalTools);
}

const totalErrors = stepsToolsAndErrors.reduce((s, st) => s + st.errors, 0);
const totalUserInteractions = stepsToolsAndErrors.reduce((s, st) => s + st.userInteractions, 0) + interstitialToolsAndErrors.reduce((s, it) => s + it.userInteractions, 0);

// Build output
const output = {
  run: {
    runId: runStartEvent.runId,
    skillId: runStartEvent.skillId,
    status: runEndEvent.status,
    startTime: runStartEvent.timestamp,
    endTime: runEndEvent.timestamp,
    durationMs: runEndTs - runStartTs
  },
  session: {
    sessionId,
    model,
    version,
    entrypoint,
    gitBranch,
    cwd
  },
  preRun: {
    tokens: preRunTokens,
    tools: preRunTools
  },
  steps: stepsToolsAndErrors.map((s, i) => ({
    stepName: s.stepName,
    startTime: new Date(s.startTs).toISOString(),
    endTime: new Date(s.endTs).toISOString(),
    durationMs: s.endTs - s.startTs,
    tokens: s.tokens,
    tools: s.tools,
    userInteractions: s.userInteractions,
    errors: s.errors,
    flags: stepFlags[i]
  })),
  interstitial: interstitialToolsAndErrors.map(i => ({
    afterStep: i.afterStep,
    beforeStep: i.beforeStep,
    tokens: i.tokens,
    tools: i.tools,
    userInteractions: i.userInteractions
  })),
  postRun: {
    tokens: postRunTokens,
    tools: postRunTools
  },
  totals: {
    tokens: totalTokens,
    tools: totalTools,
    userInteractions: totalUserInteractions,
    errors: totalErrors
  },
  flags: runFlags
};

// Output
console.log(JSON.stringify(output, null, 2));

// Human-readable summary to stderr
const summary = [
  `\n=== Run Summary ===`,
  `Skill: ${output.run.skillId}`,
  `Duration: ${(output.run.durationMs / 1000).toFixed(2)}s`,
  `Status: ${output.run.status}`,
  `\nSteps:`,
  ...output.steps.map(s => `  ${s.stepName}: ${(s.durationMs / 1000).toFixed(2)}s (tokens: ${s.tokens.total}, cache: ${s.tokens.cacheCreation})`),
  `\nTotal tokens:`,
  `  Input: ${output.totals.tokens.input}`,
  `  Cache creation: ${output.totals.tokens.cacheCreation}`,
  `  Cache read: ${output.totals.tokens.cacheRead}`,
  `  Output: ${output.totals.tokens.output}`,
  `  Total: ${output.totals.tokens.total}`,
  `\nTools used: ${Object.entries(output.totals.tools).map(([k, v]) => `${k}(${v})`).join(', ')}`,
  ''
];

console.error(summary.join('\n'));
