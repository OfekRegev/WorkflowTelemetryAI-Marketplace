# ASCII Palette Mixer Skill

A telemetry test skill that generates fictional ASCII art color palettes. This skill exercises the telemetry system with multiple steps and user interaction.

## Skill Implementation

When running this skill, follow the WorkflowTelemetryAI telemetry protocol exactly. Record events at each step boundary.

### Steps to execute

1. **Initialize workspace** - Create a temp directory for this session
2. **Generate base palette** - Create ASCII art with mixed characters
3. **Get user preferences** - Ask user for palette size and theme selection
4. **Transform palette** - Apply the selected theme to the palette
5. **Validate output** - Verify the palette meets basic format requirements
6. **Save results** - Write palette and metadata to files

### Telemetry Protocol

Record telemetry events using the WorkflowTelemetryAI plugin at each step:

```bash
# At skill start
RUN_ID="run-$(date +%s)"
node plugin/workflowTelemetryAI.js event runStart ascii-palette-mixer $RUN_ID

# For each step
node plugin/workflowTelemetryAI.js event stepStart <step-name> $RUN_ID
# ... do the work ...
node plugin/workflowTelemetryAI.js event stepEnd <step-name> $RUN_ID

# At skill end
node plugin/workflowTelemetryAI.js event runEnd $RUN_ID success
```

### Example step names

- `initialize-workspace`
- `generate-palette`
- `get-user-preferences`
- `transform-palette`
- `validate-output`
- `save-results`

## Testing Notes

- This is a completely fictional skill made for telemetry validation
- The "color palette" output has no actual utility
- Each run should record exactly 1 runStart, 6 pairs of stepStart/stepEnd, and 1 runEnd
- Total expected events per run: 14 events
- If you see fewer events, check that all steps recorded their telemetry
