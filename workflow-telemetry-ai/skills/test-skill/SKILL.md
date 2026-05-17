# ASCII Palette Mixer Skill

Generate a fictional ASCII art color palette based on user preferences. This skill demonstrates a multi-step workflow with user input, file operations, and validation.

## What it does

Collects user preferences and generates a unique ASCII art palette file with metadata. The output is purely fictional with no real utility — it's a made-up tool for fun.

## How to execute

### Step 1: Initialize workspace

Create a temporary working directory for this session:

```bash
WORK_DIR="/tmp/ascii-palette-mixer-$(date +%s)"
mkdir -p "$WORK_DIR"
echo "Initialized workspace at $WORK_DIR"
```

### Step 2: Generate base palette

Create a palette.txt file with ASCII art characters and color codes:

```bash
cat > "$WORK_DIR/palette.txt" << 'EOF'
╔════════════════════════════════════╗
║   ASCII PALETTE MIXER v1.0         ║
║   Completely Fictional Tool        ║
╚════════════════════════════════════╝

Available Characters:
■ ▓ ▒ ░ ┃ ┫ ┪ ┬ ┭ ┮ ┯
● ◉ ◎ ◌ ◍ ◐ ◑ ◒ ◓
█ ▓ ▒ ░ ▀ ▄ ▌ ▐

ANSI Color References:
[31m RED    [0m [32m GREEN  [0m [34m BLUE   [0m
[33m YELLOW [0m [35m MAGENTA[0m [36m CYAN   [0m
[37m WHITE  [0m [90m GRAY   [0m [1m BRIGHT [0m
EOF
echo "Generated base palette template"
```

### Step 3: Get user preferences

Ask the user for two choices:

**Palette size:**
```
Select palette size:
  1) Small (8x8)
  2) Medium (16x16)
  3) Large (32x32)
```
Accept input, default to 2 (Medium) if empty.

**Theme:**
```
Select theme:
  1) Retro (CRT scanlines)
  2) Neon (bright colors)
  3) Matrix (green on black)
  4) Vintage (sepia tones)
```
Accept input, default to 1 (Retro) if empty.

Store both selections for later use.

### Step 4: Transform palette

Based on the theme selected, describe the transformation and append to palette.txt:

```bash
case $theme_choice in
  1)
    echo -e "\n[RETRO THEME APPLIED]" >> "$WORK_DIR/palette.txt"
    echo "CRT Scanlines effect enabled" >> "$WORK_DIR/palette.txt"
    ;;
  2)
    echo -e "\n[NEON THEME APPLIED]" >> "$WORK_DIR/palette.txt"
    echo "Bright colors emphasized" >> "$WORK_DIR/palette.txt"
    ;;
  3)
    echo -e "\n[MATRIX THEME APPLIED]" >> "$WORK_DIR/palette.txt"
    echo "Green on black terminal codes" >> "$WORK_DIR/palette.txt"
    ;;
  *)
    echo -e "\n[VINTAGE THEME APPLIED]" >> "$WORK_DIR/palette.txt"
    echo "Sepia tone color palette" >> "$WORK_DIR/palette.txt"
    ;;
esac
```

### Step 5: Validate output

Check that the palette file is valid:

```bash
LINE_COUNT=$(wc -l < "$WORK_DIR/palette.txt")
if [ "$LINE_COUNT" -gt 5 ]; then
  echo "✓ Validation passed: palette contains $LINE_COUNT lines"
  VALIDATION_STATUS="passed"
else
  echo "⚠ Validation warning: palette only has $LINE_COUNT lines"
  VALIDATION_STATUS="warning"
fi
```

Output the validation result. Both "passed" and "warning" are acceptable outcomes.

### Step 6: Save results

Create a metadata.json file with the palette information:

```bash
cat > "$WORK_DIR/metadata.json" << EOF
{
  "skill": "ascii-palette-mixer",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "palette_size": "$size_choice",
  "theme": "$THEME",
  "validation_status": "$VALIDATION_STATUS",
  "output_files": [
    "$WORK_DIR/palette.txt",
    "$WORK_DIR/metadata.json"
  ]
}
EOF
echo "✓ Results saved to $WORK_DIR"
```

Output the workspace location so the user can access the generated files.

## Expected output

After completion:
- A palette.txt file with ASCII characters and the applied theme
- A metadata.json file with run information and validation status
- Console output showing each step's progress
