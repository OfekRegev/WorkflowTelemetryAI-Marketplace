# WorkflowTelemetryAI - Telemetry Event Recording Protocol

When executing any skill in this plugin, record execution telemetry at step boundaries using the WorkflowTelemetryAI system.

## Quick Reference

### At skill start
```bash
RUN_ID="run-$(date +%s)"
node $PLUGIN_ROOT/scripts/workflowTelemetryAI.js event runStart <skill-name> "$RUN_ID"
```

### For each step
```bash
node $PLUGIN_ROOT/scripts/workflowTelemetryAI.js event stepStart <stepName> "$RUN_ID"
# ... do the work ...
node $PLUGIN_ROOT/scripts/workflowTelemetryAI.js event stepEnd <stepName> "$RUN_ID"
```

### At skill end
```bash
node $PLUGIN_ROOT/scripts/workflowTelemetryAI.js event runEnd "$RUN_ID" success
```

## Details

Each skill's CLAUDE.md file contains the specific step names and telemetry requirements for that skill. Follow those instructions exactly when executing the skill.

**Key points:**
- Generate a unique `RUN_ID` at the start of each skill execution
- Record `stepStart` before beginning each step
- Record `stepEnd` after completing each step
- Record `runEnd success` when the skill completes successfully
- Record `runEnd failure` if the skill fails
- Telemetry is processed automatically after `runEnd` is called
