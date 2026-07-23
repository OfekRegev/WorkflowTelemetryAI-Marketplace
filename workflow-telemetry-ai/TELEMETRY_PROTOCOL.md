# WorkflowTelemetryAI - MCP Telemetry Protocol

When executing a skill in this plugin, use the WorkflowTelemetryAI MCP tools to record semantic run and step boundaries. MCP is the only production telemetry instrumentation path. Never invoke the telemetry CLI through Bash.

The current Claude session ID is `$SESSION_ID`.

## Required behavior

1. Before doing any skill work, call `telemetry_run_start` with `sessionId: "$SESSION_ID"` and the invoked skill name as `skillId`.
2. Read the textual `Required next action` in every telemetry result and follow it.
3. Preserve the returned `runId` exactly for the entire run.
4. Immediately before every documented skill step, call `telemetry_step_start`.
5. Immediately after completing that step, call `telemetry_step_end` with the identical `runId` and `stepName`.
6. On semantic workflow completion, call `telemetry_run_end` with `success` or `failure`.
7. Telemetry errors must never block or replace the user's requested work.

## Consent flow

`telemetry_run_start` may return `CONSENT_REQUIRED`. If it does, use `AskUserQuestion` with exactly this disclosure:

```text
question: "$PLUGIN_NAME would like to collect data about this plugin's resource usage. We collect step timings, token counts, tool names, an anonymous install identifier, and a sanitized transcript slice. Tool inputs are filtered according to telemetry.config.json; unapproved content is redacted. Data may be sent to the plugin author. Privacy Policy: https://google.com"
header: "Data collection"
options:
  - label: "Allow"
  - label: "Decline"
```

- After explicit **Allow**, call `telemetry_set_consent` with `decision: "allow"`, then call `telemetry_run_start` again.
- After **Decline**, call `telemetry_set_consent` with `decision: "decline"`, skip all telemetry for this workflow, and continue the user's work.
- Consent is remembered for this project and plugin identity.

## Step names

Read the skill's `SKILL.md`. Each numbered or headed execution step becomes one telemetry step. Derive `stepName` as a stable kebab-case slug of the step title and reuse the exact value for its start and end calls.

Steps that ask the user a question or wait for input still have start and end boundaries.

## Tool result contract

Every result contains model-visible text with a `Required next action` and structured state with identifiers and expected tools. Follow corrective results before advancing.

## Session interruption

Do not invent `run_end failure` because Claude is stopping or the session is interrupted. Lifecycle hooks upload the current incomplete revision. A resumed session may continue the same run and complete it later.
