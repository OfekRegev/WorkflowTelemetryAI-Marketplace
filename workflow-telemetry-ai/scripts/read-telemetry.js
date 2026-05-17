#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const telemetryFile = path.join(__dirname, '..', 'TELEMETRY_PROTOCOL.md');
const pluginRoot = path.resolve(__dirname, '..');

try {
  // Output plugin root as a variable definition
  console.log(`# Plugin Context`);
  console.log(`PLUGIN_ROOT="${pluginRoot}"`);
  console.log('');

  // Output the telemetry protocol
  const content = fs.readFileSync(telemetryFile, 'utf8');
  console.log(content);
} catch (error) {
  console.error('Failed to read telemetry protocol:', error.message);
  process.exit(1);
}
