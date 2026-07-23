/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ 508
(__unused_webpack_module, exports) {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.TelemetryStateError = void 0;
class TelemetryStateError extends Error {
    constructor(result, message) {
        super(message ?? result.requiredNextAction.instruction);
        this.result = result;
        this.name = 'TelemetryStateError';
    }
}
exports.TelemetryStateError = TelemetryStateError;


/***/ },

/***/ 775
(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.handleEvent = handleEvent;
const record_event_1 = __webpack_require__(741);
function handleEvent(eventType, args) {
    const result = (0, record_event_1.recordLegacyEvent)(eventType, args);
    process.stdout.write(JSON.stringify(result) + '\n');
}


/***/ },

/***/ 980
(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.handleReadProtocol = handleReadProtocol;
const fs = __importStar(__webpack_require__(896));
const path = __importStar(__webpack_require__(928));
const stdin_1 = __webpack_require__(308);
function derivePluginName(pluginRoot) {
    try {
        const pluginJson = JSON.parse(fs.readFileSync(path.join(pluginRoot, 'plugin.json'), 'utf8'));
        const pluginName = pluginJson.name || 'unknown-plugin';
        const marketplaceJson = JSON.parse(fs.readFileSync(path.join(pluginRoot, '../.claude-plugin/marketplace.json'), 'utf8'));
        const marketplaceName = marketplaceJson.name || 'unknown-marketplace';
        return `${marketplaceName}:${pluginName}`;
    }
    catch {
        return 'unknown:unknown';
    }
}
async function handleReadProtocol(pluginRoot) {
    if (!pluginRoot) {
        throw new Error('read-protocol requires plugin root path as argument');
    }
    const input = await (0, stdin_1.readStdin)();
    const payload = JSON.parse(input);
    const sessionId = payload.session_id || '';
    const telemetryFile = path.join(pluginRoot, 'TELEMETRY_PROTOCOL.md');
    const normalizedPluginRoot = path.resolve(pluginRoot).replace(/\\/g, '/');
    const pluginName = derivePluginName(pluginRoot);
    try {
        const content = fs.readFileSync(telemetryFile, 'utf8');
        const substituted = content
            .replace(/\$PLUGIN_ROOT/g, normalizedPluginRoot)
            .replace(/\$PLUGIN_NAME/g, pluginName)
            .replace(/\$SESSION_ID/g, sessionId);
        process.stdout.write(substituted);
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to read telemetry protocol: ${message}`);
    }
}


/***/ },

/***/ 85
(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.handleScanAndSend = handleScanAndSend;
const child_process_1 = __webpack_require__(317);
const fs_1 = __importDefault(__webpack_require__(896));
const path_1 = __importDefault(__webpack_require__(928));
const stdin_1 = __webpack_require__(308);
const config_1 = __webpack_require__(478);
async function handleScanAndSend() {
    try {
        const input = await (0, stdin_1.readStdin)();
        const payload = JSON.parse(input);
        const sessionId = payload.session_id;
        if (!sessionId)
            return;
        const sessionDir = (0, config_1.getSessionDir)(sessionId);
        if (!fs_1.default.existsSync(sessionDir))
            return;
        const runDirs = fs_1.default.readdirSync(sessionDir);
        for (const runId of runDirs) {
            const runDir = path_1.default.join(sessionDir, runId);
            const lockPath = path_1.default.join(runDir, 'sending.lock');
            const eventsPath = (0, config_1.getRunEventsPath)(sessionId, runId);
            if (fs_1.default.existsSync(lockPath))
                continue; // In progress
            if (!fs_1.default.existsSync(eventsPath))
                continue; // No events yet
            (0, child_process_1.spawn)(process.execPath, [process.argv[1], 'send-run', sessionId, runId], {
                detached: true,
                stdio: 'ignore',
                windowsHide: true
            }).unref();
        }
    }
    catch { }
}


/***/ },

/***/ 257
(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.handleSendRun = handleSendRun;
const sender_1 = __webpack_require__(885);
async function handleSendRun(sessionId, runId) {
    try {
        await (0, sender_1.sendRunData)(sessionId, runId);
    }
    catch (error) {
        process.stderr.write(`Error sending run ${runId}: ${error}\n`);
        process.exit(1);
    }
}


/***/ },

/***/ 847
(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.handleSessionEnd = handleSessionEnd;
const fs_1 = __importDefault(__webpack_require__(896));
const stdin_1 = __webpack_require__(308);
const config_1 = __webpack_require__(478);
const sender_1 = __webpack_require__(885);
async function handleSessionEnd() {
    const input = await (0, stdin_1.readStdin)();
    const payload = JSON.parse(input);
    const sessionId = payload.session_id;
    if (!sessionId)
        throw new Error('No session_id in SessionEnd payload');
    const sessionDir = (0, config_1.getSessionDir)(sessionId);
    if (fs_1.default.existsSync(sessionDir)) {
        const entries = fs_1.default.readdirSync(sessionDir, { withFileTypes: true });
        for (const entry of entries) {
            if (entry.isDirectory() && entry.name !== 'session-context.json') {
                const runId = entry.name;
                try {
                    await (0, sender_1.sendRunData)(sessionId, runId);
                }
                catch (error) {
                    process.stderr.write(`Warning: Failed to send run ${runId}: ${error}\n`);
                }
            }
        }
        // fs.rmSync(sessionDir, { recursive: true, force: true });
    }
}


/***/ },

/***/ 234
(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.handleSessionStart = handleSessionStart;
const fs_1 = __importDefault(__webpack_require__(896));
const stdin_1 = __webpack_require__(308);
const config_1 = __webpack_require__(478);
async function handleSessionStart() {
    const input = await (0, stdin_1.readStdin)();
    const payload = JSON.parse(input);
    const sessionId = payload.session_id;
    const transcriptPath = payload.transcript_path;
    if (!sessionId)
        throw new Error('No session_id in SessionStart payload');
    const sessionDir = (0, config_1.getSessionDir)(sessionId);
    fs_1.default.mkdirSync(sessionDir, { recursive: true });
    const context = {
        sessionId,
        transcriptPath: transcriptPath || null,
        startTime: new Date().toISOString()
    };
    fs_1.default.writeFileSync((0, config_1.getContextPath)(sessionId), JSON.stringify(context, null, 2));
    // fs.mkdirSync(getBaseDir(), { recursive: true });
    // fs.writeFileSync(getCurrentSessionIdPath(), sessionId);
}


/***/ },

/***/ 156
(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
const crypto_1 = __importDefault(__webpack_require__(982));
const session_start_1 = __webpack_require__(234);
const session_end_1 = __webpack_require__(847);
const send_run_1 = __webpack_require__(257);
const read_protocol_1 = __webpack_require__(980);
const scan_and_send_1 = __webpack_require__(85);
const record_1 = __webpack_require__(775);
const [, , mode, subcommand, ...args] = process.argv;
async function main() {
    try {
        if (mode === 'hook') {
            if (subcommand === 'session-start')
                await (0, session_start_1.handleSessionStart)();
            else if (subcommand === 'session-end')
                await (0, session_end_1.handleSessionEnd)();
            else if (subcommand === 'read-protocol')
                await (0, read_protocol_1.handleReadProtocol)(args[0]);
            else if (subcommand === 'scan-and-send')
                await (0, scan_and_send_1.handleScanAndSend)();
            else
                throw new Error(`Unknown hook subcommand: ${subcommand}`);
        }
        else if (mode === 'event') {
            (0, record_1.handleEvent)(subcommand, args);
        }
        else if (mode === 'send-run') {
            const sessionId = subcommand;
            const runId = args[0];
            if (!sessionId || !runId)
                throw new Error('send-run requires <sessionId> <runId>');
            await (0, send_run_1.handleSendRun)(sessionId, runId);
        }
        else if (mode === 'gen-run-id') {
            process.stdout.write(crypto_1.default.randomUUID() + '\n');
        }
        else {
            throw new Error('Development CLI usage: node workflowTelemetryAI.js <hook|event|send-run|gen-run-id> <subcommand> [args]');
        }
    }
    catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        process.stderr.write(`[workflowTelemetryAI] ${message}\n`);
        process.exit(1);
    }
}
main();


/***/ },

/***/ 741
(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.startRun = startRun;
exports.startStep = startStep;
exports.endStep = endStep;
exports.endRun = endRun;
exports.recordLegacyEvent = recordLegacyEvent;
const crypto_1 = __importDefault(__webpack_require__(982));
const fs_1 = __importDefault(__webpack_require__(896));
const events_1 = __webpack_require__(508);
const config_1 = __webpack_require__(478);
const session_1 = __webpack_require__(214);
const transcript_1 = __webpack_require__(210);
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$/;
function assertSafeId(value, label) {
    if (!SAFE_ID.test(value)) {
        throw new Error(`${label} contains unsupported characters or is too long`);
    }
}
function readEvents(sessionId, runId) {
    const eventsPath = (0, config_1.getRunEventsPath)(sessionId, runId);
    if (!fs_1.default.existsSync(eventsPath))
        return [];
    return fs_1.default.readFileSync(eventsPath, 'utf8')
        .split(/\r?\n/)
        .filter(Boolean)
        .flatMap(line => {
        try {
            return [JSON.parse(line)];
        }
        catch {
            return [];
        }
    });
}
function appendEvent(sessionId, runId, event) {
    fs_1.default.mkdirSync((0, config_1.getRunDir)(sessionId, runId), { recursive: true });
    fs_1.default.appendFileSync((0, config_1.getRunEventsPath)(sessionId, runId), JSON.stringify(event) + '\n');
}
function lastUuid(sessionId) {
    const context = (0, session_1.readSessionContext)(sessionId);
    return (0, transcript_1.getLastAssistantUuid)(context.transcriptPath);
}
function activeStep(events) {
    let active = null;
    for (const event of events) {
        if (event.type === 'stepStart')
            active = event.stepName;
        if (event.type === 'stepEnd' && active === event.stepName)
            active = null;
    }
    return active;
}
function completedResult(runId, alreadyRecorded = false) {
    return {
        accepted: true,
        state: 'run_complete',
        runId,
        delivery: 'awaiting_hook',
        alreadyRecorded,
        nextExpectedTools: [],
        requiredNextAction: {
            instruction: 'Do not send additional telemetry events for this runId.',
            tool: null,
            when: 'immediately',
        },
    };
}
function startRun(sessionId, skillId, requestedRunId) {
    assertSafeId(sessionId, 'sessionId');
    assertSafeId(skillId, 'skillId');
    (0, session_1.readSessionContext)(sessionId);
    const runId = requestedRunId ?? crypto_1.default.randomUUID();
    assertSafeId(runId, 'runId');
    const existing = readEvents(sessionId, runId);
    if (existing.length > 0) {
        const first = existing[0];
        if (first.type === 'runStart' && first.skillId === skillId) {
            return {
                accepted: true,
                state: activeStep(existing) ? 'step_active' : existing.some(e => e.type === 'runEnd') ? 'run_complete' : 'run_active',
                runId,
                alreadyRecorded: true,
                nextExpectedTools: ['telemetry_step_start'],
                requiredNextAction: {
                    instruction: 'Reuse this runId and continue the existing run state.',
                    tool: 'telemetry_step_start',
                    when: 'before the next skill step',
                },
            };
        }
        throw new Error(`runId ${runId} already exists for a different run`);
    }
    const event = {
        type: 'runStart',
        timestamp: new Date().toISOString(),
        lastUuid: lastUuid(sessionId),
        skillId,
        runId,
    };
    appendEvent(sessionId, runId, event);
    return {
        accepted: true,
        state: 'run_active',
        runId,
        nextExpectedTools: ['telemetry_step_start'],
        requiredNextAction: {
            instruction: 'Retain this runId. Before performing the first skill step, call telemetry_step_start.',
            tool: 'telemetry_step_start',
            when: 'before the first skill step',
        },
    };
}
function startStep(sessionId, runId, stepName) {
    assertSafeId(sessionId, 'sessionId');
    assertSafeId(runId, 'runId');
    assertSafeId(stepName, 'stepName');
    const events = readEvents(sessionId, runId);
    if (!events.some(e => e.type === 'runStart'))
        throw new Error(`Unknown runId: ${runId}`);
    if (events.some(e => e.type === 'runEnd'))
        throw new events_1.TelemetryStateError(completedResult(runId));
    const active = activeStep(events);
    if (active) {
        const duplicate = active === stepName && events[events.length - 1]?.type === 'stepStart';
        if (duplicate) {
            return {
                accepted: true,
                state: 'step_active',
                runId,
                stepName,
                alreadyRecorded: true,
                nextExpectedTools: ['telemetry_step_end'],
                requiredNextAction: {
                    instruction: `Perform step "${stepName}", then call telemetry_step_end with the same runId and stepName.`,
                    tool: 'telemetry_step_end',
                    when: 'after completing the current step',
                },
            };
        }
        throw new events_1.TelemetryStateError({
            accepted: false,
            state: 'step_active',
            code: 'STEP_ALREADY_ACTIVE',
            runId,
            stepName: active,
            nextExpectedTools: ['telemetry_step_end'],
            requiredNextAction: {
                instruction: `Close active step "${active}" with telemetry_step_end before starting another step.`,
                tool: 'telemetry_step_end',
                when: 'before starting another step',
            },
        });
    }
    const event = {
        type: 'stepStart', timestamp: new Date().toISOString(), lastUuid: lastUuid(sessionId), runId, stepName,
    };
    appendEvent(sessionId, runId, event);
    return {
        accepted: true,
        state: 'step_active',
        runId,
        stepName,
        nextExpectedTools: ['telemetry_step_end'],
        requiredNextAction: {
            instruction: `Perform step "${stepName}" now. When it finishes, call telemetry_step_end with the same runId and stepName.`,
            tool: 'telemetry_step_end',
            when: 'after completing the current step',
        },
    };
}
function endStep(sessionId, runId, stepName) {
    assertSafeId(sessionId, 'sessionId');
    assertSafeId(runId, 'runId');
    assertSafeId(stepName, 'stepName');
    const events = readEvents(sessionId, runId);
    if (!events.some(e => e.type === 'runStart'))
        throw new Error(`Unknown runId: ${runId}`);
    if (events.some(e => e.type === 'runEnd'))
        throw new events_1.TelemetryStateError(completedResult(runId));
    const active = activeStep(events);
    if (!active) {
        const duplicate = events.some(e => e.type === 'stepEnd' && e.stepName === stepName);
        if (duplicate) {
            return {
                accepted: true,
                state: 'run_active',
                runId,
                stepName,
                alreadyRecorded: true,
                nextExpectedTools: ['telemetry_step_start', 'telemetry_run_end'],
                requiredNextAction: {
                    instruction: 'If another skill step remains, call telemetry_step_start before it. Otherwise call telemetry_run_end.',
                    tool: null,
                    when: 'before continuing the skill',
                },
            };
        }
        throw new Error('No active step to end');
    }
    if (active !== stepName) {
        throw new events_1.TelemetryStateError({
            accepted: false,
            state: 'step_active',
            code: 'STEP_NAME_MISMATCH',
            runId,
            stepName: active,
            nextExpectedTools: ['telemetry_step_end'],
            requiredNextAction: {
                instruction: `End active step "${active}" using the exact same stepName.`,
                tool: 'telemetry_step_end',
                when: 'now',
            },
        });
    }
    const event = {
        type: 'stepEnd', timestamp: new Date().toISOString(), lastUuid: lastUuid(sessionId), runId, stepName,
    };
    appendEvent(sessionId, runId, event);
    return {
        accepted: true,
        state: 'run_active',
        runId,
        stepName,
        nextExpectedTools: ['telemetry_step_start', 'telemetry_run_end'],
        requiredNextAction: {
            instruction: 'If another skill step remains, call telemetry_step_start before beginning it. Otherwise call telemetry_run_end.',
            tool: null,
            when: 'before continuing the skill',
        },
    };
}
function endRun(sessionId, runId, status) {
    assertSafeId(sessionId, 'sessionId');
    assertSafeId(runId, 'runId');
    const events = readEvents(sessionId, runId);
    if (!events.some(e => e.type === 'runStart'))
        throw new Error(`Unknown runId: ${runId}`);
    if (events.some(e => e.type === 'runEnd'))
        return completedResult(runId, true);
    const event = {
        type: 'runEnd', timestamp: new Date().toISOString(), lastUuid: lastUuid(sessionId), runId, status,
    };
    appendEvent(sessionId, runId, event);
    return completedResult(runId);
}
function recordLegacyEvent(eventType, args) {
    const sessionId = args[args.length - 1];
    if (!sessionId)
        throw new Error('Missing session ID');
    const values = args.slice(0, -1);
    if (eventType === 'runStart')
        return startRun(sessionId, values[0], values[1]);
    if (eventType === 'stepStart')
        return startStep(sessionId, values[1], values[0]);
    if (eventType === 'stepEnd')
        return endStep(sessionId, values[1], values[0]);
    if (eventType === 'runEnd')
        return endRun(sessionId, values[0], values[1] || 'success');
    throw new Error(`Unknown event type: ${eventType}`);
}


/***/ },

/***/ 478
(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.getBaseDir = getBaseDir;
exports.getSessionDir = getSessionDir;
exports.getContextPath = getContextPath;
exports.getEventsPath = getEventsPath;
exports.getCurrentSessionIdPath = getCurrentSessionIdPath;
exports.getRunDir = getRunDir;
exports.getRunEventsPath = getRunEventsPath;
exports.getRunTranscriptSnapshotPath = getRunTranscriptSnapshotPath;
const path_1 = __importDefault(__webpack_require__(928));
const os_1 = __importDefault(__webpack_require__(857));
function getBaseDir() {
    return process.env.WORKFLOW_TELEMETRY_DIR
        || path_1.default.join(os_1.default.homedir(), '.workflow-telemetry-ai');
}
function getSessionDir(sessionId) {
    return path_1.default.join(getBaseDir(), 'claude-sessions', sessionId);
}
function getContextPath(sessionId) {
    return path_1.default.join(getSessionDir(sessionId), 'session-context.json');
}
function getEventsPath(sessionId) {
    return path_1.default.join(getSessionDir(sessionId), 'session-events.jsonl');
}
function getCurrentSessionIdPath() {
    return path_1.default.join(getBaseDir(), 'current-session-id.txt');
}
function getRunDir(sessionId, runId) {
    return path_1.default.join(getSessionDir(sessionId), runId);
}
function getRunEventsPath(sessionId, runId) {
    return path_1.default.join(getRunDir(sessionId, runId), 'events.jsonl');
}
function getRunTranscriptSnapshotPath(sessionId, runId) {
    return path_1.default.join(getRunDir(sessionId, runId), 'transcript.snapshot.jsonl');
}


/***/ },

/***/ 260
(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.postJson = postJson;
const http_1 = __importDefault(__webpack_require__(611));
const https_1 = __importDefault(__webpack_require__(692));
function postJson(url, body) {
    return new Promise((resolve, reject) => {
        const payload = JSON.stringify(body);
        const parsed = new URL(url);
        const lib = parsed.protocol === 'https:' ? https_1.default : http_1.default;
        const req = lib.request({
            hostname: parsed.hostname,
            port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
            path: parsed.pathname + (parsed.search || ''),
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload)
            }
        }, res => {
            let resp = '';
            res.on('data', c => resp += c);
            res.on('end', () => resolve({ status: res.statusCode || 200, body: resp }));
        });
        req.on('error', reject);
        const timeoutMs = Number(process.env.WORKFLOW_TELEMETRY_HTTP_TIMEOUT_MS || 5000);
        req.setTimeout(Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 5000, () => {
            req.destroy(new Error('Telemetry upload timed out'));
        });
        req.write(payload);
        req.end();
    });
}


/***/ },

/***/ 59
(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.getInstallId = getInstallId;
const fs_1 = __importDefault(__webpack_require__(896));
const os_1 = __importDefault(__webpack_require__(857));
const path_1 = __importDefault(__webpack_require__(928));
const crypto_1 = __importDefault(__webpack_require__(982));
/**
 * Read the persistent install identifier, or generate one on first call.
 * Lives at ~/.workflow-telemetry-ai/install-id.
 *
 * Anonymous, stable per machine. If the file is deleted the install will
 * appear as new in the telemetry — that's expected behavior, not a bug.
 */
function getInstallId() {
    const baseDir = path_1.default.join(os_1.default.homedir(), '.workflow-telemetry-ai');
    const idPath = path_1.default.join(baseDir, 'install-id');
    if (fs_1.default.existsSync(idPath)) {
        const existing = fs_1.default.readFileSync(idPath, 'utf-8').trim();
        if (existing)
            return existing;
    }
    fs_1.default.mkdirSync(baseDir, { recursive: true });
    const id = crypto_1.default.randomUUID();
    fs_1.default.writeFileSync(idPath, id);
    return id;
}


/***/ },

/***/ 583
(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.extractRunLogs = extractRunLogs;
const fs_1 = __importDefault(__webpack_require__(896));
function parseTranscript(transcriptPath) {
    if (!transcriptPath || !fs_1.default.existsSync(transcriptPath)) {
        return [];
    }
    const lines = fs_1.default.readFileSync(transcriptPath, 'utf8').trim().split('\n');
    const entries = [];
    for (const line of lines) {
        try {
            entries.push(JSON.parse(line));
        }
        catch {
            // Skip malformed lines
        }
    }
    return entries;
}
function parseEvents(eventsPath) {
    if (!eventsPath || !fs_1.default.existsSync(eventsPath)) {
        return [];
    }
    const lines = fs_1.default.readFileSync(eventsPath, 'utf8').trim().split('\n');
    const events = [];
    for (const line of lines) {
        if (line.trim()) {
            try {
                events.push(JSON.parse(line));
            }
            catch {
                // Skip malformed lines
            }
        }
    }
    return events;
}
function extractRunLogs(transcriptSnapshotPath, runEventsPath) {
    const entries = parseTranscript(transcriptSnapshotPath);
    const events = parseEvents(runEventsPath);
    const runStartEvent = events.find(e => e.type === 'runStart');
    const runEndEvent = events.find(e => e.type === 'runEnd');
    if (!runStartEvent) {
        return { transcriptData: [], events };
    }
    const startUuid = runStartEvent.lastUuid;
    const latestAssistantUuid = [...entries].reverse().find(entry => entry.type === 'assistant' && entry.requestId && entry.uuid)?.uuid ?? null;
    const endUuid = runEndEvent?.lastUuid ?? latestAssistantUuid;
    if (!endUuid)
        return { transcriptData: [], events };
    // If runStart fired before any assistant message (lastUuid=null), capture
    // from the beginning of the transcript. Otherwise wait until we hit startUuid.
    const transcriptData = [];
    let capturing = startUuid === null;
    for (const entry of entries) {
        if (entry.uuid === startUuid)
            capturing = true;
        if (capturing)
            transcriptData.push(entry);
        if (entry.uuid === endUuid)
            break;
    }
    return { transcriptData, events };
}


/***/ },

/***/ 885
(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.sendRunData = sendRunData;
const fs_1 = __importDefault(__webpack_require__(896));
const path_1 = __importDefault(__webpack_require__(928));
const crypto_1 = __importDefault(__webpack_require__(982));
const config_1 = __webpack_require__(478);
const logs_1 = __webpack_require__(583);
const http_1 = __webpack_require__(260);
const install_id_1 = __webpack_require__(59);
const transcript_sanitizer_1 = __webpack_require__(339);
const session_1 = __webpack_require__(214);
const PROTOCOL_VERSION = 1;
/**
 * Resolve the plugin root for config loading.
 *
 * The bundle always ships at <pluginRoot>/scripts/workflowTelemetryAI.js, so the
 * running script's own location is the authoritative source — it works for every
 * trigger path (hook-spawned detached sends, direct CLI calls) and is always
 * consistent with the bundle version actually executing.
 *
 * CLAUDE_PLUGIN_ROOT is honored as an explicit override when set (tests, manual
 * runs), but hook-spawned children do NOT inherit it from Claude Code — relying
 * on it alone made loadConfig silently fall back to mode='all' on every real
 * send (bug found 2026-07-19).
 */
function resolvePluginRoot() {
    const envRoot = process.env.CLAUDE_PLUGIN_ROOT;
    if (envRoot)
        return envRoot;
    const scriptPath = process.argv[1];
    if (!scriptPath)
        return '';
    return path_1.default.resolve(path_1.default.dirname(scriptPath), '..');
}
async function sendRunData(sessionId, runId) {
    const runDir = (0, config_1.getRunDir)(sessionId, runId);
    const lockPath = path_1.default.join(runDir, 'sending.lock');
    const deliveryStatePath = path_1.default.join(runDir, 'delivery-state.json');
    // Atomic lock acquisition
    let fd;
    try {
        fd = fs_1.default.openSync(lockPath, 'wx');
        fs_1.default.closeSync(fd);
    }
    catch {
        return; // Another send in progress
    }
    try {
        const transcriptSnapshotPath = (0, config_1.getRunTranscriptSnapshotPath)(sessionId, runId);
        const runEventsPath = (0, config_1.getRunEventsPath)(sessionId, runId);
        if (!fs_1.default.existsSync(runEventsPath))
            return;
        const context = (0, session_1.readSessionContext)(sessionId);
        if (context.transcriptPath && fs_1.default.existsSync(context.transcriptPath)) {
            fs_1.default.copyFileSync(context.transcriptPath, transcriptSnapshotPath);
        }
        const eventsBytes = fs_1.default.readFileSync(runEventsPath);
        const transcriptBytes = fs_1.default.existsSync(transcriptSnapshotPath)
            ? fs_1.default.readFileSync(transcriptSnapshotPath)
            : Buffer.alloc(0);
        const revision = crypto_1.default.createHash('sha256').update(eventsBytes).update('\0').update(transcriptBytes).digest('hex');
        try {
            const state = JSON.parse(fs_1.default.readFileSync(deliveryStatePath, 'utf8'));
            if (state.lastDeliveredRevision === revision)
                return;
        }
        catch { }
        const { transcriptData: rawTranscriptData, events } = (0, logs_1.extractRunLogs)(transcriptSnapshotPath, runEventsPath);
        // Apply per-plugin sanitizer. Defaults to mode='all' if config is missing.
        const { entries: transcriptData, metadata: sanitizerMetadata } = (0, transcript_sanitizer_1.applyTranscriptSanitizer)(resolvePluginRoot(), rawTranscriptData);
        const serverUrl = process.env.WORKFLOW_TELEMETRY_SERVER || 'http://localhost:3000/ingest';
        const result = await (0, http_1.postJson)(serverUrl, {
            protocolVersion: PROTOCOL_VERSION,
            installId: (0, install_id_1.getInstallId)(),
            platform: process.platform,
            sessionId,
            runId,
            deliveryRevision: revision,
            transcriptData,
            events,
            transcriptSanitizer: sanitizerMetadata
        });
        if (result.status >= 200 && result.status < 300) {
            fs_1.default.writeFileSync(deliveryStatePath, JSON.stringify({
                lastDeliveredRevision: revision,
                deliveredAt: new Date().toISOString(),
            }, null, 2));
        }
        else {
            throw new Error(`Server returned ${result.status}: ${result.body}`);
        }
    }
    finally {
        try {
            fs_1.default.unlinkSync(lockPath);
        }
        catch { }
    }
}


/***/ },

/***/ 214
(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.readSessionContext = readSessionContext;
exports.getCurrentSessionId = getCurrentSessionId;
const fs_1 = __importDefault(__webpack_require__(896));
const config_1 = __webpack_require__(478);
function readSessionContext(sessionId) {
    const p = (0, config_1.getContextPath)(sessionId);
    if (!fs_1.default.existsSync(p)) {
        throw new Error(`Session context not found at ${p}. Is the plugin installed and a session active?`);
    }
    return JSON.parse(fs_1.default.readFileSync(p, 'utf8'));
}
function getCurrentSessionId() {
    const p = (0, config_1.getCurrentSessionIdPath)();
    if (!fs_1.default.existsSync(p)) {
        throw new Error(`No active session found at ${p}. Did the SessionStart hook run?`);
    }
    return fs_1.default.readFileSync(p, 'utf8').trim();
}


/***/ },

/***/ 308
(__unused_webpack_module, exports) {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.readStdin = readStdin;
function readStdin() {
    return new Promise(resolve => {
        let data = '';
        process.stdin.setEncoding('utf8');
        process.stdin.on('data', c => data += c);
        process.stdin.on('end', () => resolve(data));
    });
}


/***/ },

/***/ 113
(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.DEFAULT_CONFIG = exports.CONFIG_FILENAME = void 0;
exports.loadConfig = loadConfig;
const fs_1 = __importDefault(__webpack_require__(896));
const path_1 = __importDefault(__webpack_require__(928));
const CONFIG_FILENAME = 'telemetry.config.json';
exports.CONFIG_FILENAME = CONFIG_FILENAME;
const DEFAULT_CONFIG = {
    messageContent: { mode: 'all' },
};
exports.DEFAULT_CONFIG = DEFAULT_CONFIG;
/**
 * Load the sanitizer config from the plugin root, falling back to
 * `mode: 'all'` (most-private) if anything is missing or invalid.
 *
 * This is the privacy-first default — plugin authors must explicitly
 * opt in to less stripping.
 */
function loadConfig(pluginRoot) {
    if (!pluginRoot)
        return DEFAULT_CONFIG;
    const configPath = path_1.default.join(pluginRoot, CONFIG_FILENAME);
    if (!fs_1.default.existsSync(configPath))
        return DEFAULT_CONFIG;
    try {
        const raw = fs_1.default.readFileSync(configPath, 'utf-8');
        const parsed = JSON.parse(raw);
        const cfg = parsed?.transcriptSanitizer;
        if (!cfg || typeof cfg !== 'object')
            return DEFAULT_CONFIG;
        const mc = cfg.messageContent;
        if (!mc || typeof mc !== 'object')
            return DEFAULT_CONFIG;
        const mode = mc.mode;
        if (mode !== 'off' && mode !== 'all' && mode !== 'custom')
            return DEFAULT_CONFIG;
        if (mode !== 'custom')
            return { messageContent: { mode } };
        const filters = Array.isArray(mc.filters) ? mc.filters : [];
        return { messageContent: { mode: 'custom', filters } };
    }
    catch {
        return DEFAULT_CONFIG;
    }
}


/***/ },

/***/ 313
(__unused_webpack_module, exports) {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.askUserQuestionFilter = void 0;
/**
 * Built-in "askUserQuestion" filter. Identity — passes text through
 * unchanged. AskUserQuestion's question/header/option text is the agent's
 * own generated UI text, not user data or file content, so it's exempted
 * from the default-deny fallback via this explicit allow rather than a
 * silent carve-out in the walk logic. Scoping to the AskUserQuestion tool
 * is done by the caller's match predicate (see index.ts), not here.
 */
const askUserQuestionFilter = (text) => text;
exports.askUserQuestionFilter = askUserQuestionFilter;


/***/ },

/***/ 191
(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.loadCustomFilter = loadCustomFilter;
const path_1 = __importDefault(__webpack_require__(928));
/**
 * Load a custom filter function from a JS file in the plugin directory.
 * The file must export a function (default export or module.exports = fn).
 *
 * Returns null if the file can't be loaded or doesn't export a function.
 * The caller treats null as fail-safe and falls back to 'all'-mode stripping.
 */
function loadCustomFilter(pluginRoot, relPath) {
    try {
        const resolved = path_1.default.resolve(pluginRoot, relPath);
        // require() rather than import() — keeps custom filters synchronous and
        // simpler. Filters are small redaction functions, no async needed.
        const mod = __webpack_require__(54)(resolved);
        const fn = typeof mod === 'function' ? mod : mod?.default;
        return typeof fn === 'function' ? fn : null;
    }
    catch {
        return null;
    }
}


/***/ },

/***/ 285
(__unused_webpack_module, exports) {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.toBasename = toBasename;
/**
 * Reduce a path-like string to its final path segment (basename).
 *
 * A full path can embed the OS username or project locations —
 * e.g. "C:\Users\alice\proj\run.js" -> "run.js", "/usr/bin/env" -> "env".
 * Strips surrounding quotes first. Non-path-like input passes through
 * unchanged (quotes still stripped).
 *
 * Directory paths ending in a separator (e.g. "/home/alice/secret/") split
 * to an empty final segment — take the last NON-EMPTY segment instead, so a
 * trailing separator can't fall through to leaking the whole path. If no
 * segment survives (e.g. the string is only separators), return '' rather
 * than the raw input — fail closed, consistent with the rest of this
 * sanitizer's error handling.
 */
function toBasename(token) {
    const unquoted = token.replace(/^['"]|['"]$/g, '');
    if (/[\\/]/.test(unquoted) || /^[A-Za-z]:/.test(unquoted)) {
        const segments = unquoted.split(/[\\/]/).filter(s => s.length > 0);
        return segments.length > 0 ? segments[segments.length - 1] : '';
    }
    return unquoted;
}


/***/ },

/***/ 432
(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.pathFilter = void 0;
const basename_1 = __webpack_require__(285);
/**
 * Built-in "path" filter. For `tool_input_field` contexts, reduces the
 * string to its basename — a full path can embed the OS username or
 * project layout (e.g. "C:\Users\alice\proj\notes.txt" -> "notes.txt").
 *
 * Which fields this runs on is decided by the caller's match predicate
 * (see index.ts's `path` filter resolution, config's `fields` list) —
 * this function assumes it's only ever called for a field the caller
 * already decided is path-shaped.
 */
const pathFilter = (text) => {
    if (typeof text !== 'string' || text === '')
        return text;
    return (0, basename_1.toBasename)(text);
};
exports.pathFilter = pathFilter;


/***/ },

/***/ 685
(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.shellFilter = void 0;
const basename_1 = __webpack_require__(285);
/**
 * Built-in "shell" filter. For string contexts representing a shell command
 * (currently: Bash's `command` field), return first-token + second-non-flag-token,
 * with each kept token scrubbed of path and value content:
 *
 * - Path-like tokens are reduced to their basename (a full path can embed the
 *   OS username or project locations — e.g. "C:\Users\alice\proj\run.js" -> "run.js")
 * - Env-var assignments keep only the variable name ("API_KEY=secret" -> "API_KEY=")
 *
 * Examples:
 *   "git checkout -b feature-secret"            -> "git checkout"
 *   "git -C /Users/foo/secret status"           -> "git"
 *   "npm install lodash"                        -> "npm install"
 *   "ls -la"                                    -> "ls"
 *   'node "C:\Users\a\plugin\scripts\x.js"'     -> "node x.js"
 *   'RUN_ID="run-$(date +%s)"'                  -> "RUN_ID="
 *
 * For non-shell contexts: returns the text unchanged.
 */
const shellFilter = (text, context) => {
    if (!isShellContext(context))
        return text;
    if (typeof text !== 'string' || text.trim() === '')
        return text;
    const tokens = text.trim().split(/\s+/);
    if (tokens.length === 0)
        return text;
    const first = tokens[0] ? scrubToken(tokens[0]) : '';
    if (!first)
        return text;
    // If the first token is an env-var assignment, everything after it is part of
    // the value (whitespace inside quotes splits into fragments) — keep nothing else.
    if (first.endsWith('='))
        return first;
    if (tokens.length === 1)
        return first;
    const second = tokens[1];
    if (second && !second.startsWith('-'))
        return `${first} ${scrubToken(second)}`;
    return first;
};
exports.shellFilter = shellFilter;
/**
 * Scrub a single kept token so it cannot leak paths or assignment values.
 */
function scrubToken(token) {
    // Env-var assignment: keep only the name ("API_KEY=secret" -> "API_KEY=")
    const assignMatch = token.match(/^([A-Za-z_][A-Za-z0-9_]*)=/);
    if (assignMatch)
        return `${assignMatch[1]}=`;
    return (0, basename_1.toBasename)(token);
}
function isShellContext(context) {
    if (context.kind !== 'tool_command')
        return false;
    return context.tool_name === 'Bash';
}


/***/ },

/***/ 339
(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.loadConfig = void 0;
exports.applyTranscriptSanitizer = applyTranscriptSanitizer;
const config_1 = __webpack_require__(113);
const walk_1 = __webpack_require__(774);
const shell_1 = __webpack_require__(685);
const path_1 = __webpack_require__(432);
const ask_user_question_1 = __webpack_require__(313);
const custom_runner_1 = __webpack_require__(191);
const DEFAULT_PATH_FIELDS = ['file_path', 'path', 'notebook_path'];
/**
 * Apply the sanitizer to a list of transcript entries.
 * Loads config from the plugin root, resolves filters, and walks each entry.
 *
 * Returns both the sanitized entries and a metadata blob describing what
 * was applied — the metadata is included in the POST payload so the server
 * can record the scrubbing level for each trace.
 */
function applyTranscriptSanitizer(pluginRoot, entries) {
    const config = (0, config_1.loadConfig)(pluginRoot);
    const filters = resolveFilters(pluginRoot, config);
    const out = entries.map(e => (0, walk_1.sanitizeEntry)(e, config.messageContent.mode, filters));
    return {
        entries: out,
        metadata: describeApplied(config),
    };
}
function resolveFilters(pluginRoot, config) {
    if (config.messageContent.mode !== 'custom')
        return [];
    const filterEntries = config.messageContent.filters ?? [];
    const resolved = [];
    for (const entry of filterEntries) {
        const rf = resolveFilter(pluginRoot, entry);
        if (rf)
            resolved.push(rf);
    }
    return resolved;
}
function resolveFilter(pluginRoot, entry) {
    if (entry.type === 'shell') {
        return { fn: shell_1.shellFilter, match: isBashCommandContext };
    }
    if (entry.type === 'path') {
        const fields = entry.fields ?? DEFAULT_PATH_FIELDS;
        return { fn: path_1.pathFilter, match: makeFieldMatcher(fields) };
    }
    if (entry.type === 'askUserQuestion') {
        return { fn: ask_user_question_1.askUserQuestionFilter, match: isAskUserQuestionContext };
    }
    if (entry.type === 'custom') {
        const fn = (0, custom_runner_1.loadCustomFilter)(pluginRoot, entry.function);
        if (!fn) {
            // eslint-disable-next-line no-console
            console.warn(`[transcript-sanitizer] failed to load custom filter at ${entry.function}; skipping`);
            return null;
        }
        return { fn, match: entry.match ? compileMatch(entry.match) : () => true };
    }
    return null;
}
function isBashCommandContext(context) {
    return context.kind === 'tool_command' && context.tool_name === 'Bash';
}
function isAskUserQuestionContext(context) {
    return (context.kind === 'tool_command' || context.kind === 'tool_input_field')
        && context.tool_name === 'AskUserQuestion';
}
function makeFieldMatcher(fields) {
    return (context) => context.kind === 'tool_input_field' && fields.includes(context.field);
}
function compileMatch(match) {
    return (context) => {
        if (match.kinds && !match.kinds.includes(context.kind))
            return false;
        if (match.tools) {
            const toolName = context.kind === 'tool_command' || context.kind === 'tool_input_field'
                ? context.tool_name
                : undefined;
            if (!toolName || !match.tools.includes(toolName))
                return false;
        }
        if (match.fields) {
            const field = context.kind === 'tool_input_field' ? context.field : undefined;
            if (!field || !match.fields.includes(field))
                return false;
        }
        return true;
    };
}
function describeApplied(config) {
    const md = { mode: config.messageContent.mode };
    if (config.messageContent.mode === 'custom') {
        md.filters = (config.messageContent.filters ?? []).map(f => f.type === 'custom' ? { type: 'custom', path: f.function } : { type: f.type });
    }
    return md;
}
var config_2 = __webpack_require__(113);
Object.defineProperty(exports, "loadConfig", ({ enumerable: true, get: function () { return config_2.loadConfig; } }));
__exportStar(__webpack_require__(766), exports);


/***/ },

/***/ 766
(__unused_webpack_module, exports) {

"use strict";

/**
 * Shared types for the TranscriptSanitizer module.
 *
 * The sanitizer redacts STRING VALUES inside transcript entries' `message.content`.
 * Structure is always preserved — tool_use blocks stay tool_use blocks, etc.
 */
Object.defineProperty(exports, "__esModule", ({ value: true }));


/***/ },

/***/ 774
(__unused_webpack_module, exports) {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.sanitizeEntry = sanitizeEntry;
/**
 * Sanitize a single transcript entry. Pure: returns a new entry, never mutates.
 *
 * mode='off'    → entry returned untouched
 * mode='all'    → every string in message.content replaced with ''
 * mode='custom' → each matching filter applied in order to every string, with
 *                 context. A `tool_command`/`tool_input_field` string that no
 *                 configured filter's match predicate claims is redacted by
 *                 default (fail-closed) rather than passed through raw — see
 *                 applyToString. If ANY filter call throws or returns
 *                 non-string, the entry falls back to 'all' (fail-safe) and a
 *                 console warning is emitted.
 */
function sanitizeEntry(entry, mode, filters) {
    if (mode === 'off')
        return entry;
    if (!entry.message)
        return entry;
    if (!Array.isArray(entry.message.content))
        return entry;
    if (mode === 'all') {
        return rewriteEntry(entry, 'all', []);
    }
    // custom
    try {
        return rewriteEntry(entry, 'custom', filters);
    }
    catch (err) {
        // eslint-disable-next-line no-console
        console.warn('[transcript-sanitizer] custom filter failed for one entry; falling back to mode=all.', err instanceof Error ? err.message : err);
        return rewriteEntry(entry, 'all', []);
    }
}
function rewriteEntry(entry, mode, filters) {
    const oldMessage = entry.message;
    const newContent = oldMessage.content.map(block => rewriteBlock(block, mode, filters));
    return {
        ...entry,
        message: { ...oldMessage, content: newContent },
    };
}
function rewriteBlock(block, mode, filters) {
    if (!block || typeof block !== 'object')
        return block;
    const b = block;
    switch (b.type) {
        case 'text':
            return {
                ...b,
                text: applyToString(typeof b.text === 'string' ? b.text : '', { kind: 'text_block' }, mode, filters),
            };
        case 'tool_use':
            return {
                ...b,
                input: rewriteToolInput(b.input, typeof b.name === 'string' ? b.name : '', mode, filters),
            };
        case 'tool_result':
            return {
                ...b,
                content: rewriteToolResultContent(b.content, mode, filters),
            };
        default:
            return b;
    }
}
function rewriteToolInput(value, toolName, mode, filters) {
    if (value === null || value === undefined)
        return value;
    if (typeof value === 'string') {
        return applyToString(value, { kind: 'tool_input_field', tool_name: toolName, field: '' }, mode, filters);
    }
    if (Array.isArray(value)) {
        return value.map((item, i) => rewriteToolInputItem(item, toolName, String(i), mode, filters));
    }
    if (typeof value === 'object') {
        const out = {};
        for (const [key, v] of Object.entries(value)) {
            out[key] = rewriteToolInputItem(v, toolName, key, mode, filters);
        }
        return out;
    }
    return value;
}
function rewriteToolInputItem(value, toolName, field, mode, filters) {
    if (typeof value === 'string') {
        const ctx = field === 'command' && toolName === 'Bash'
            ? { kind: 'tool_command', tool_name: toolName }
            : { kind: 'tool_input_field', tool_name: toolName, field };
        return applyToString(value, ctx, mode, filters);
    }
    // Recurse into nested objects/arrays
    return rewriteToolInput(value, toolName, mode, filters);
}
function rewriteToolResultContent(content, mode, filters) {
    if (content === null || content === undefined)
        return content;
    if (typeof content === 'string') {
        return applyToString(content, { kind: 'text_block' }, mode, filters);
    }
    if (Array.isArray(content)) {
        return content.map(item => {
            if (typeof item === 'string')
                return applyToString(item, { kind: 'text_block' }, mode, filters);
            if (item && typeof item === 'object' && item.type === 'text') {
                const it = item;
                return {
                    ...it,
                    text: applyToString(typeof it.text === 'string' ? it.text : '', { kind: 'text_block' }, mode, filters),
                };
            }
            return item;
        });
    }
    return content;
}
function applyToString(text, context, mode, filters) {
    if (mode === 'off')
        return text;
    if (mode === 'all')
        return '';
    // custom — run each filter whose match predicate claims this context, in order.
    // Throws on bad return (caught by sanitizeEntry's try/catch).
    let result = text;
    let matched = false;
    for (const { fn, match } of filters) {
        if (!match(context))
            continue;
        matched = true;
        result = fn(result, context);
        if (typeof result !== 'string') {
            throw new Error('filter returned non-string');
        }
    }
    // Fail-closed: a tool_command/tool_input_field string that no configured
    // filter claimed is redacted, not passed through raw. text_block is left
    // out of this fallback deliberately — see walk.ts module docstring.
    if (!matched && (context.kind === 'tool_command' || context.kind === 'tool_input_field')) {
        return '';
    }
    return result;
}


/***/ },

/***/ 210
(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.getLastAssistantUuid = getLastAssistantUuid;
const fs_1 = __importDefault(__webpack_require__(896));
function getLastAssistantUuid(transcriptPath) {
    if (!transcriptPath || !fs_1.default.existsSync(transcriptPath))
        return null;
    const lines = fs_1.default.readFileSync(transcriptPath, 'utf8').trim().split('\n');
    for (let i = lines.length - 1; i >= 0; i--) {
        try {
            const entry = JSON.parse(lines[i]);
            if (entry.type === 'assistant' && entry.requestId && entry.uuid) {
                return entry.uuid;
            }
        }
        catch { }
    }
    return null;
}


/***/ },

/***/ 54
(module) {

function webpackEmptyContext(req) {
	var e = new Error("Cannot find module '" + req + "'");
	e.code = 'MODULE_NOT_FOUND';
	throw e;
}
webpackEmptyContext.keys = () => ([]);
webpackEmptyContext.resolve = webpackEmptyContext;
webpackEmptyContext.id = 54;
module.exports = webpackEmptyContext;

/***/ },

/***/ 317
(module) {

"use strict";
module.exports = require("child_process");

/***/ },

/***/ 982
(module) {

"use strict";
module.exports = require("crypto");

/***/ },

/***/ 896
(module) {

"use strict";
module.exports = require("fs");

/***/ },

/***/ 611
(module) {

"use strict";
module.exports = require("http");

/***/ },

/***/ 692
(module) {

"use strict";
module.exports = require("https");

/***/ },

/***/ 857
(module) {

"use strict";
module.exports = require("os");

/***/ },

/***/ 928
(module) {

"use strict";
module.exports = require("path");

/***/ }

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module is referenced by other modules so it can't be inlined
/******/ 	var __webpack_exports__ = __webpack_require__(156);
/******/ 	
/******/ })()
;