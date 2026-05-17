# ASCII Palette Mixer Skill - Implementation Guide

This is a test skill for validating WorkflowTelemetryAI telemetry collection. Execute it by following the steps below exactly, recording telemetry events at each step boundary.

## Skill Execution

Follow these 6 steps in order. At each step, record telemetry using the WorkflowTelemetryAI plugin.

### Setup

Generate a unique run ID and create a workspace:

```bash
RUN_ID="run-$(date +%s)"
mkdir -p "/tmp/ascii-palette-mixer-$RUN_ID"
```

Record skill start:
```bash
node plugin/workflowTelemetryAI.js event runStart ascii-palette-mixer "$RUN_ID"
```

### Step 1: Initialize workspace

Record step start:
```bash
node plugin/workflowTelemetryAI.js event stepStart initialize-workspace "$RUN_ID"
```

Execute the step:
1. Create metadata file with workspace information
2. Output confirmation message
3. Wait 1 second

Record step end:
```bash
node plugin/workflowTelemetryAI.js event stepEnd initialize-workspace "$RUN_ID"
```

### Step 2: Generate base palette

Record step start:
```bash
node plugin/workflowTelemetryAI.js event stepStart generate-palette "$RUN_ID"
```

Execute the step:
1. Create a palette.txt file with ASCII characters:
   - Various box drawing characters (╔, ═, ╗, ║, etc.)
   - Filled circles and blocks (●, █, ▓, ▒, ░)
   - ANSI color code examples
2. Output confirmation
3. Wait 1 second

Record step end:
```bash
node plugin/workflowTelemetryAI.js event stepEnd generate-palette "$RUN_ID"
```

### Step 3: Get user preferences

Record step start:
```bash
node plugin/workflowTelemetryAI.js event stepStart get-user-preferences "$RUN_ID"
```

Execute the step:
1. Prompt user to select palette size:
   - 1) Small (8x8)
   - 2) Medium (16x16)
   - 3) Large (32x32)
   - Default: 2 (Medium)
2. Prompt user to select theme:
   - 1) Retro
   - 2) Neon
   - 3) Matrix
   - 4) Vintage
   - Default: 1 (Retro)
3. Confirm selections

Record step end:
```bash
node plugin/workflowTelemetryAI.js event stepEnd get-user-preferences "$RUN_ID"
```

### Step 4: Transform palette

Record step start:
```bash
node plugin/workflowTelemetryAI.js event stepStart transform-palette "$RUN_ID"
```

Execute the step:
1. Based on theme selection, apply transformation:
   - Retro: Add CRT scanlines effect description
   - Neon: Add bright color emphasis
   - Matrix: Add green-on-black color codes
   - Vintage: Add sepia tone descriptions
2. Output transformation applied message
3. Wait 1 second

Record step end:
```bash
node plugin/workflowTelemetryAI.js event stepEnd transform-palette "$RUN_ID"
```

### Step 5: Validate output

Record step start:
```bash
node plugin/workflowTelemetryAI.js event stepStart validate-output "$RUN_ID"
```

Execute the step:
1. Check the palette.txt file exists
2. Count lines in the file
3. If more than 5 lines, output "validation passed"
4. If 5 or fewer, output "validation warning"

Record step end:
```bash
node plugin/workflowTelemetryAI.js event stepEnd validate-output "$RUN_ID"
```

### Step 6: Save results

Record step start:
```bash
node plugin/workflowTelemetryAI.js event stepStart save-results "$RUN_ID"
```

Execute the step:
1. Create metadata.json with:
   - skill name
   - run_id
   - timestamp
   - selected preferences
   - file paths
   - validation status
2. Output confirmation with file locations
3. Wait 1 second

Record step end:
```bash
node plugin/workflowTelemetryAI.js event stepEnd save-results "$RUN_ID"
```

### Cleanup

Record skill end (success):
```bash
node plugin/workflowTelemetryAI.js event runEnd "$RUN_ID" success
```

Output completion message with palette location.

## Expected Telemetry Output

Each complete run should produce these events in order:
1. runStart event
2. stepStart: initialize-workspace
3. stepEnd: initialize-workspace
4. stepStart: generate-palette
5. stepEnd: generate-palette
6. stepStart: get-user-preferences
7. stepEnd: get-user-preferences
8. stepStart: transform-palette
9. stepEnd: transform-palette
10. stepStart: validate-output
11. stepEnd: validate-output
12. stepStart: save-results
13. stepEnd: save-results
14. runEnd event (success)

**Total: 14 events per run**

## Notes for Testing

- This is a completely fictional skill made for telemetry validation
- The "palette" has no actual utility
- User prompts should accept input but have sensible defaults
- All steps must record their telemetry events
- If any step is missing events, the telemetry count will be incorrect
