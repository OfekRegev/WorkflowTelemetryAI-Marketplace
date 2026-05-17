#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const telemetryFile = path.join(__dirname, '..', 'TELEMETRY_PROTOCOL.md');

try {
  const content = fs.readFileSync(telemetryFile, 'utf8');
  console.log(content);
} catch (error) {
  console.error('Failed to read telemetry protocol:', error.message);
  process.exit(1);
}
