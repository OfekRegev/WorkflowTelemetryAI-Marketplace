# ASCII Palette Mixer Skill

A fun and completely made-up skill that generates ASCII art color palettes for retro terminal applications.

## Purpose

This skill creates fictional "color palettes" by combining ASCII characters, ANSI codes, and user preferences. It's designed purely for testing and has no real-world utility—perfect for telemetry validation.

## What it does

1. **Initialize workspace** - Creates a temporary directory for the session
2. **Generate base palette** - Creates an ASCII art template
3. **Get user preferences** - Asks for palette size and theme
4. **Transform palette** - Applies effects and transformations
5. **Validate output** - Checks the generated palette format
6. **Save results** - Writes the final palette to a file

## How to use

Simply invoke this skill in your Claude Code session:

```bash
/skill ascii-palette-mixer
```

The skill will guide you through each step and record telemetry events at every stage.

## What to expect

- You'll be prompted to choose palette dimensions (small/medium/large)
- You'll select a theme (retro/neon/matrix/vintage)
- The skill generates an ASCII palette and saves it
- Telemetry events are recorded at each step:
  - `runStart` - Skill begins
  - `stepStart/stepEnd` for each of the 6 steps
  - `runEnd success` - Skill completes

## Output

Results are saved to a temporary directory with:
- `palette.txt` - The generated ASCII palette
- `metadata.json` - Information about the generated palette

## Testing notes

This is a test skill for telemetry validation. Each run should record exactly 6 steps. Use this to verify that your telemetry collector is capturing all events correctly.
