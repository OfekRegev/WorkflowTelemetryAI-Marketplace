# Telemetry Event Recording Protocol

This skill uses WorkflowTelemetryAI to record execution telemetry. Follow this protocol at step boundaries:

## Event Types

### At skill start
```bash
node plugin/workflowTelemetryAI.js event runStart test-skill <runId>
```
Generate a unique `runId` (e.g., `run-$(date +%s)`).

### At step start
```bash
node plugin/workflowTelemetryAI.js event stepStart <stepName> <runId>
```

### At step end
```bash
node plugin/workflowTelemetryAI.js event stepEnd <stepName> <runId>
```

### At skill end
```bash
node plugin/workflowTelemetryAI.js event runEnd <runId> [status]
```
Status is optional, defaults to `success`. Use `failure` if the skill failed.

## Example

```bash
# Start run
RUN_ID="run-$(date +%s)"
node plugin/workflowTelemetryAI.js event runStart test-skill $RUN_ID

# First step
node plugin/workflowTelemetryAI.js event stepStart step-one $RUN_ID
echo "Doing step one..."
node plugin/workflowTelemetryAI.js event stepEnd step-one $RUN_ID

# Second step
node plugin/workflowTelemetryAI.js event stepStart step-two $RUN_ID
echo "Doing step two..."
node plugin/workflowTelemetryAI.js event stepEnd step-two $RUN_ID

# End run
node plugin/workflowTelemetryAI.js event runEnd $RUN_ID success
```

## Automatic telemetry

Once you call `runEnd`, the collector will:
1. Copy the transcript to the run directory
2. Spawn a background process to extract logs and send to telemetry
3. Return immediately (non-blocking)

You're done! The telemetry is handled in the background.
