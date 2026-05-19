# WorkflowTelemetryAI - Telemetry Event Recording Protocol

When executing any skill in this plugin, record execution telemetry at step boundaries using the WorkflowTelemetryAI system.

## Permission check (do this before anything else)

Before recording any telemetry, check whether the user has already granted permission:

```bash
node $PLUGIN_ROOT/scripts/workflowTelemetryAI.js permission check
```

- If it exits with code **0** → permission already granted, skip to **Quick Reference** below.
- If it exits with code **1** → permission not yet granted, follow the steps below.

### Requesting permission

Use the `AskUserQuestion` tool with exactly this structure, replacing `<plugin-name>` with the active plugin's name in `marketplace:plugin` format (e.g. `test-marketplace:workflow-telemetry-ai`):

```
question: "<plugin-name> would like to collect data about the plugin's resource usage in this session. We collect step timings, token counts, and tool usage — no conversation content or personal information is included. This data may be sent to the plugin author. Privacy Policy: https://google.com"
header: "Data collection"
options:
  - label: "Allow"
  - label: "Decline"
```

- If the user selects **"Decline"** → skip all telemetry for this run. Do not call any `runStart`, `stepStart`, `stepEnd`, or `runEnd` commands.
- If the user selects **"Allow"** → grant permission and continue:

```bash
node $PLUGIN_ROOT/scripts/workflowTelemetryAI.js permission grant
```

This writes an allow pattern to `.claude/settings.local.json` so future telemetry commands run without prompting. The user will not be asked again for this project.

---

## Quick Reference

**Important:** Each telemetry command (runStart, stepStart, stepEnd, runEnd) must be its own standalone Bash tool invocation. Never combine telemetry calls with work commands using `&&` or `;`. This ensures each command gets its own message UUID, enabling unambiguous step-to-message correlation.

### At skill start
```bash
RUN_ID="run-$(date +%s)"
node $PLUGIN_ROOT/scripts/workflowTelemetryAI.js event runStart <skill-name> "$RUN_ID"
```

### For each step
```bash
# Tool call 1: Record step start
node $PLUGIN_ROOT/scripts/workflowTelemetryAI.js event stepStart <stepName> "$RUN_ID"
```
```bash
# Tool call 2: Do the work
# ... your work commands here ...
```
```bash
# Tool call 3: Record step end
node $PLUGIN_ROOT/scripts/workflowTelemetryAI.js event stepEnd <stepName> "$RUN_ID"
```

### At skill end
```bash
node $PLUGIN_ROOT/scripts/workflowTelemetryAI.js event runEnd "$RUN_ID" success
```

## Step naming and coverage

Read the skill's `SKILL.md` to identify the steps. Each numbered or headed step (e.g. "Step 1: Initialize workspace") becomes one telemetry step.

- Derive the `stepName` as a kebab-case slug of the step title (e.g. `initialize-workspace`, `get-user-preferences`).
- Use the **same** `stepName` for the matching `stepStart` and `stepEnd`.
- Wrap **every** step in `stepStart`/`stepEnd`, including steps that only ask the user a question or wait for input. This ensures complete coverage with no untracked work between steps.

## Details

**Key points:**
- Generate a unique `RUN_ID` at the start of each skill execution
- Record `stepStart` before beginning each step
- Record `stepEnd` after completing each step
- Record `runEnd success` when the skill completes successfully
- Record `runEnd failure` if the skill fails
- Telemetry is processed automatically after `runEnd` is called
