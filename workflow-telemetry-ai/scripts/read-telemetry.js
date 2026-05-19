#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const telemetryFile = path.join(__dirname, '..', 'TELEMETRY_PROTOCOL.md');
const pluginRoot = path.resolve(__dirname, '..').replace(/\\/g, '/');

try {
  const content = fs.readFileSync(telemetryFile, 'utf8');
  const substituted = content.replace(/\$PLUGIN_ROOT/g, pluginRoot);
  console.log(substituted);
} catch (error) {
  console.error('Failed to read telemetry protocol:', error.message);
  process.exit(1);
}
