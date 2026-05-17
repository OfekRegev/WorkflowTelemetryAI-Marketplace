#!/bin/bash

# ASCII Palette Mixer Skill - Telemetry Test Skill
# This is a completely made-up skill for testing the WorkflowTelemetryAI telemetry system

set -e

# Initialize
RUN_ID="run-$(date +%s)"
WORK_DIR="/tmp/ascii-palette-mixer-$RUN_ID"
mkdir -p "$WORK_DIR"

echo "🎨 ASCII Palette Mixer - Telemetry Test Skill"
echo "Run ID: $RUN_ID"
echo ""

# Start telemetry
node plugin/workflowTelemetryAI.js event runStart ascii-palette-mixer "$RUN_ID"

# Step 1: Initialize workspace
echo "Step 1/6: Initialize workspace..."
node plugin/workflowTelemetryAI.js event stepStart initialize-workspace "$RUN_ID"
sleep 1
echo "✓ Created workspace at $WORK_DIR"
echo "{\"workspace\": \"$WORK_DIR\", \"created_at\": \"$(date)\"}" > "$WORK_DIR/metadata.json"
node plugin/workflowTelemetryAI.js event stepEnd initialize-workspace "$RUN_ID"
echo ""

# Step 2: Generate base palette
echo "Step 2/6: Generate base palette..."
node plugin/workflowTelemetryAI.js event stepStart generate-palette "$RUN_ID"
sleep 1
cat > "$WORK_DIR/palette.txt" << 'EOF'
╔════════════════════════════════════╗
║   ASCII PALETTE MIXER v1.0         ║
║   (Completely Fictional)           ║
╚════════════════════════════════════╝

Base Characters:
■ ▓ ▒ ░ ┃ ┫ ┪ ┬ ┭ ┮ ┯
● ◉ ◎ ◌ ◍ ◎ ◐ ◑ ◒ ◓
█ ▓ ▒ ░ ▀ ▄ ▌ ▐

ANSI Color Codes (Simulated):
[31m RED    [0m [32m GREEN  [0m [34m BLUE   [0m
[33m YELLOW [0m [35m MAGENT [0m [36m CYAN   [0m
[37m WHITE  [0m [90m GRAY   [0m [1m BRIGHT [0m
EOF
echo "✓ Generated base palette template"
node plugin/workflowTelemetryAI.js event stepEnd generate-palette "$RUN_ID"
echo ""

# Step 3: Get user preferences
echo "Step 3/6: Get user preferences..."
node plugin/workflowTelemetryAI.js event stepStart get-user-preferences "$RUN_ID"
echo "Select palette size:"
echo "  1) Small (8x8)"
echo "  2) Medium (16x16)"
echo "  3) Large (32x32)"
read -p "Enter your choice (1-3): " size_choice
size_choice=${size_choice:-2}

echo ""
echo "Select theme:"
echo "  1) Retro"
echo "  2) Neon"
echo "  3) Matrix"
echo "  4) Vintage"
read -p "Enter your choice (1-4): " theme_choice
theme_choice=${theme_choice:-1}

echo "✓ Preferences recorded: size=$size_choice, theme=$theme_choice"
node plugin/workflowTelemetryAI.js event stepEnd get-user-preferences "$RUN_ID"
echo ""

# Step 4: Transform palette
echo "Step 4/6: Transform palette..."
node plugin/workflowTelemetryAI.js event stepStart transform-palette "$RUN_ID"
sleep 1

case $theme_choice in
  1)
    THEME="retro"
    echo "Applying retro theme (CRT scanlines effect)..."
    ;;
  2)
    THEME="neon"
    echo "Applying neon theme (bright colors)..."
    ;;
  3)
    THEME="matrix"
    echo "Applying matrix theme (green on black)..."
    ;;
  *)
    THEME="vintage"
    echo "Applying vintage theme (sepia tones)..."
    ;;
esac

echo "✓ Applied $THEME theme transformation"
node plugin/workflowTelemetryAI.js event stepEnd transform-palette "$RUN_ID"
echo ""

# Step 5: Validate output
echo "Step 5/6: Validate output..."
node plugin/workflowTelemetryAI.js event stepStart validate-output "$RUN_ID"
sleep 1

LINES=$(wc -l < "$WORK_DIR/palette.txt")
if [ "$LINES" -gt 5 ]; then
  echo "✓ Palette validation passed: $LINES lines found"
else
  echo "⚠ Palette validation warning: only $LINES lines"
fi
node plugin/workflowTelemetryAI.js event stepEnd validate-output "$RUN_ID"
echo ""

# Step 6: Save results
echo "Step 6/6: Save results..."
node plugin/workflowTelemetryAI.js event stepStart save-results "$RUN_ID"
sleep 1

cat > "$WORK_DIR/metadata.json" << EOF
{
  "skill": "ascii-palette-mixer",
  "run_id": "$RUN_ID",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "size_choice": $size_choice,
  "theme": "$THEME",
  "palette_file": "$WORK_DIR/palette.txt",
  "validation_status": "passed"
}
EOF

echo "✓ Results saved to $WORK_DIR"
echo "  - palette.txt"
echo "  - metadata.json"
node plugin/workflowTelemetryAI.js event stepEnd save-results "$RUN_ID"
echo ""

# End telemetry
node plugin/workflowTelemetryAI.js event runEnd "$RUN_ID" success

echo "✅ ASCII Palette Mixer completed successfully!"
echo "Palette saved at: $WORK_DIR"
