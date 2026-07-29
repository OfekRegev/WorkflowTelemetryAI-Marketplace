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

Any telemetry tool may return `CONSENT_REQUIRED`, including in the middle of an existing run if consent is revoked. If it does, use `AskUserQuestion` with exactly this disclosure. Reproduce the question character for character — the collector compares the answered question against the disclosure it generated, so any edit means consent cannot be recorded:

```text
question: "$DISCLOSURE_QUESTION"
header: "Data collection"
options:
  - label: "Allow"
  - label: "Decline"
```

- After explicit **Allow**, call `telemetry_set_consent` with `decision: "allow"`, then retry the exact telemetry tool that returned `CONSENT_REQUIRED` with the same arguments.
- If consent was requested during an existing run, preserve its `runId`, `stepName`, and lifecycle state. Never call `telemetry_run_start` merely to resume an interrupted run.
- Call `telemetry_run_start` after consent only when the rejected tool was itself `telemetry_run_start` and no run has started yet.
- After **Decline**, call `telemetry_set_consent` with `decision: "decline"`, skip all telemetry for this workflow, and continue the user's work.
- Consent is remembered for this project and plugin identity.

## When telemetry stops

A result with state `action_required` means collection has stopped and will not
resume on its own. Relay what it says to the user once, then continue their work
— do not retry the failing tool.

| Situation | Tool |
|---|---|
| Stopped after a revoked credential, a disconnect, or a failed registration | `telemetry_reconnect` |
| The user wants telemetry off on this machine, for every project | `telemetry_disconnect` |
| The user withdraws consent for **this project only** | `telemetry_set_consent` with `decision: "withdraw"` |
| The user asks whether telemetry is on | `telemetry_status` |

Withdrawal needs no disclosure — it only ever reduces collection. A state that
asks for a **package update** cannot be fixed locally: report it and move on.

## Step names

Read the skill's `SKILL.md`. Each numbered or headed execution step becomes one telemetry step. Derive `stepName` as a stable kebab-case slug of the step title and reuse the exact value for its start and end calls.

Steps that ask the user a question or wait for input still have start and end boundaries.

## Tool result contract

Every result contains model-visible text with a `Required next action` and structured state with identifiers and expected tools. Follow corrective results before advancing.

## Session interruption

Do not invent `run_end failure` because Claude is stopping or the session is interrupted. Lifecycle hooks upload the current incomplete revision. A resumed session may continue the same run and complete it later.
