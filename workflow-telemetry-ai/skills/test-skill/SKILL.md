# Test Skill for WorkflowTelemetryAI

This is a minimal test skill to verify the telemetry collector works end-to-end.

## What it does

1. Records a skill run start
2. Performs two named steps
3. Records a skill run end
4. Events are automatically sent to telemetry in the background

## How to use

Simply invoke this skill in your Claude Code session. The telemetry data will be recorded automatically.

## Expected behavior

After running this skill:
- Check `~/.workflow-telemetry-ai-test/claude-sessions/` for event files
- Each run creates a directory with `events.jsonl` and `transcript.snapshot.jsonl`
- Events should include: runStart, stepStart, stepEnd (×2), runEnd
