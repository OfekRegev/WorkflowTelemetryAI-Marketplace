/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ 775
(__unused_webpack_module, exports, __webpack_require__) {


var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.handleEvent = handleEvent;
const fs_1 = __importDefault(__webpack_require__(896));
const child_process_1 = __webpack_require__(317);
const config_1 = __webpack_require__(478);
const session_1 = __webpack_require__(214);
const transcript_1 = __webpack_require__(210);
function handleEvent(eventType, args) {
    if (!eventType)
        throw new Error('Missing event type. Usage: event <runStart|stepStart|stepEnd|runEnd> [args]');
    const sessionId = (0, session_1.getCurrentSessionId)();
    const context = (0, session_1.readSessionContext)(sessionId);
    const lastUuid = (0, transcript_1.getLastAssistantUuid)(context.transcriptPath);
    const baseEvent = {
        type: eventType,
        timestamp: new Date().toISOString(),
        lastUuid
    };
    let event;
    let runId;
    if (eventType === 'runStart') {
        const [skillId, parsedRunId] = args;
        if (!skillId || !parsedRunId)
            throw new Error('runStart requires <skillId> <runId>');
        runId = parsedRunId;
        event = { ...baseEvent, type: 'runStart', skillId, runId };
        fs_1.default.mkdirSync((0, config_1.getRunDir)(sessionId, runId), { recursive: true });
    }
    else if (eventType === 'stepStart' || eventType === 'stepEnd') {
        const stepName = args[0];
        const parsedRunId = args[1];
        if (!stepName)
            throw new Error(`${eventType} requires <stepName> <runId>`);
        if (!parsedRunId)
            throw new Error(`${eventType} requires <stepName> <runId>`);
        runId = parsedRunId;
        event = { ...baseEvent, type: eventType, stepName, runId };
    }
    else if (eventType === 'runEnd') {
        const [parsedRunId] = args;
        if (!parsedRunId)
            throw new Error('runEnd requires <runId>');
        runId = parsedRunId;
        const status = args[1] || 'success';
        event = { ...baseEvent, type: 'runEnd', runId, status };
    }
    else {
        throw new Error(`Unknown event type: ${eventType}`);
    }
    fs_1.default.appendFileSync((0, config_1.getRunEventsPath)(sessionId, runId), JSON.stringify(event) + '\n');
    if (eventType === 'runEnd' && context.transcriptPath) {
        fs_1.default.copyFileSync(context.transcriptPath, (0, config_1.getRunTranscriptSnapshotPath)(sessionId, runId));
        const child = (0, child_process_1.spawn)('node', [process.argv[1], 'send-run', sessionId, runId], {
            detached: true,
            stdio: 'ignore'
        });
        child.unref();
    }
}


/***/ },

/***/ 980
(__unused_webpack_module, exports, __webpack_require__) {


var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.handleReadProtocol = handleReadProtocol;
const fs = __importStar(__webpack_require__(896));
const path = __importStar(__webpack_require__(928));
function handleReadProtocol(pluginRoot) {
    if (!pluginRoot) {
        throw new Error('read-protocol requires plugin root path as argument');
    }
    const telemetryFile = path.join(pluginRoot, 'TELEMETRY_PROTOCOL.md');
    const normalizedPluginRoot = path.resolve(pluginRoot).replace(/\\/g, '/');
    try {
        const content = fs.readFileSync(telemetryFile, 'utf8');
        const substituted = content.replace(/\$PLUGIN_ROOT/g, normalizedPluginRoot);
        process.stdout.write(substituted);
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to read telemetry protocol: ${message}`);
    }
}


/***/ },

/***/ 257
(__unused_webpack_module, exports, __webpack_require__) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.handleSendRun = handleSendRun;
const sender_1 = __webpack_require__(885);
async function handleSendRun(sessionId, runId) {
    try {
        await (0, sender_1.sendRunData)(sessionId, runId);
    }
    catch (error) {
        process.stderr.write(`Error sending run ${runId}: ${error}\n`);
        process.exit(1);
    }
}


/***/ },

/***/ 847
(__unused_webpack_module, exports, __webpack_require__) {


var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.handleSessionEnd = handleSessionEnd;
const fs_1 = __importDefault(__webpack_require__(896));
const stdin_1 = __webpack_require__(308);
const config_1 = __webpack_require__(478);
const sender_1 = __webpack_require__(885);
async function handleSessionEnd() {
    const input = await (0, stdin_1.readStdin)();
    const payload = JSON.parse(input);
    const sessionId = payload.session_id;
    if (!sessionId)
        throw new Error('No session_id in SessionEnd payload');
    const sessionDir = (0, config_1.getSessionDir)(sessionId);
    if (fs_1.default.existsSync(sessionDir)) {
        const entries = fs_1.default.readdirSync(sessionDir, { withFileTypes: true });
        for (const entry of entries) {
            if (entry.isDirectory() && entry.name !== 'session-context.json') {
                const runId = entry.name;
                try {
                    await (0, sender_1.sendRunData)(sessionId, runId);
                }
                catch (error) {
                    process.stderr.write(`Warning: Failed to send run ${runId}: ${error}\n`);
                }
            }
        }
        fs_1.default.rmSync(sessionDir, { recursive: true, force: true });
    }
    const idFile = (0, config_1.getCurrentSessionIdPath)();
    if (fs_1.default.existsSync(idFile) && fs_1.default.readFileSync(idFile, 'utf8').trim() === sessionId) {
        fs_1.default.unlinkSync(idFile);
    }
}


/***/ },

/***/ 234
(__unused_webpack_module, exports, __webpack_require__) {


var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.handleSessionStart = handleSessionStart;
const fs_1 = __importDefault(__webpack_require__(896));
const stdin_1 = __webpack_require__(308);
const config_1 = __webpack_require__(478);
async function handleSessionStart() {
    const input = await (0, stdin_1.readStdin)();
    const payload = JSON.parse(input);
    const sessionId = payload.session_id;
    const transcriptPath = payload.transcript_path;
    if (!sessionId)
        throw new Error('No session_id in SessionStart payload');
    const sessionDir = (0, config_1.getSessionDir)(sessionId);
    fs_1.default.mkdirSync(sessionDir, { recursive: true });
    const context = {
        sessionId,
        transcriptPath: transcriptPath || null,
        startTime: new Date().toISOString()
    };
    fs_1.default.writeFileSync((0, config_1.getContextPath)(sessionId), JSON.stringify(context, null, 2));
    fs_1.default.mkdirSync((0, config_1.getBaseDir)(), { recursive: true });
    fs_1.default.writeFileSync((0, config_1.getCurrentSessionIdPath)(), sessionId);
}


/***/ },

/***/ 223
(__unused_webpack_module, exports, __webpack_require__) {


var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.handlePermissionCheck = handlePermissionCheck;
exports.handlePermissionGrant = handlePermissionGrant;
const fs = __importStar(__webpack_require__(896));
const path = __importStar(__webpack_require__(928));
const SETTINGS_PATH = path.join(process.cwd(), '.claude', 'settings.local.json');
function buildAllowPattern(pluginRoot) {
    const normalized = path.resolve(pluginRoot).replace(/\\/g, '/');
    return `Bash(node ${normalized}/scripts/workflowTelemetryAI.js*)`;
}
function readSettings() {
    try {
        return JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf8'));
    }
    catch {
        return {};
    }
}
function writeSettings(settings) {
    fs.mkdirSync(path.dirname(SETTINGS_PATH), { recursive: true });
    fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2));
}
function handlePermissionCheck(pluginRoot) {
    if (!pluginRoot)
        throw new Error('permission check requires plugin root path as argument');
    const pattern = buildAllowPattern(pluginRoot);
    const settings = readSettings();
    const permissions = settings.permissions || {};
    const allow = permissions.allow || [];
    if (allow.includes(pattern)) {
        process.exit(0);
    }
    else {
        process.exit(1);
    }
}
function handlePermissionGrant(pluginRoot) {
    if (!pluginRoot)
        throw new Error('permission grant requires plugin root path as argument');
    const pattern = buildAllowPattern(pluginRoot);
    const settings = readSettings();
    const permissions = settings.permissions || {};
    const allow = permissions.allow || [];
    if (!allow.includes(pattern)) {
        allow.push(pattern);
        permissions.allow = allow;
        settings.permissions = permissions;
        writeSettings(settings);
    }
    process.stdout.write(`Telemetry permission granted.\n`);
}


/***/ },

/***/ 478
(__unused_webpack_module, exports, __webpack_require__) {


var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.getBaseDir = getBaseDir;
exports.getSessionDir = getSessionDir;
exports.getContextPath = getContextPath;
exports.getEventsPath = getEventsPath;
exports.getCurrentSessionIdPath = getCurrentSessionIdPath;
exports.getRunDir = getRunDir;
exports.getRunEventsPath = getRunEventsPath;
exports.getRunTranscriptSnapshotPath = getRunTranscriptSnapshotPath;
const path_1 = __importDefault(__webpack_require__(928));
const os_1 = __importDefault(__webpack_require__(857));
function getBaseDir() {
    return process.env.WORKFLOW_TELEMETRY_DIR
        || path_1.default.join(os_1.default.homedir(), '.workflow-telemetry-ai');
}
function getSessionDir(sessionId) {
    return path_1.default.join(getBaseDir(), 'claude-sessions', sessionId);
}
function getContextPath(sessionId) {
    return path_1.default.join(getSessionDir(sessionId), 'session-context.json');
}
function getEventsPath(sessionId) {
    return path_1.default.join(getSessionDir(sessionId), 'session-events.jsonl');
}
function getCurrentSessionIdPath() {
    return path_1.default.join(getBaseDir(), 'current-session-id.txt');
}
function getRunDir(sessionId, runId) {
    return path_1.default.join(getSessionDir(sessionId), runId);
}
function getRunEventsPath(sessionId, runId) {
    return path_1.default.join(getRunDir(sessionId, runId), 'events.jsonl');
}
function getRunTranscriptSnapshotPath(sessionId, runId) {
    return path_1.default.join(getRunDir(sessionId, runId), 'transcript.snapshot.jsonl');
}


/***/ },

/***/ 260
(__unused_webpack_module, exports, __webpack_require__) {


var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.postJson = postJson;
const http_1 = __importDefault(__webpack_require__(611));
const https_1 = __importDefault(__webpack_require__(692));
function postJson(url, body) {
    return new Promise((resolve, reject) => {
        const payload = JSON.stringify(body);
        const parsed = new URL(url);
        const lib = parsed.protocol === 'https:' ? https_1.default : http_1.default;
        const req = lib.request({
            hostname: parsed.hostname,
            port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
            path: parsed.pathname + (parsed.search || ''),
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload)
            }
        }, res => {
            let resp = '';
            res.on('data', c => resp += c);
            res.on('end', () => resolve({ status: res.statusCode || 200, body: resp }));
        });
        req.on('error', reject);
        req.write(payload);
        req.end();
    });
}


/***/ },

/***/ 583
(__unused_webpack_module, exports, __webpack_require__) {


var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.extractRunLogs = extractRunLogs;
const fs_1 = __importDefault(__webpack_require__(896));
function parseTranscript(transcriptPath) {
    if (!transcriptPath || !fs_1.default.existsSync(transcriptPath)) {
        return [];
    }
    const lines = fs_1.default.readFileSync(transcriptPath, 'utf8').trim().split('\n');
    const entries = [];
    for (const line of lines) {
        try {
            entries.push(JSON.parse(line));
        }
        catch {
            // Skip malformed lines
        }
    }
    return entries;
}
function parseEvents(eventsPath) {
    if (!eventsPath || !fs_1.default.existsSync(eventsPath)) {
        return [];
    }
    const lines = fs_1.default.readFileSync(eventsPath, 'utf8').trim().split('\n');
    const events = [];
    for (const line of lines) {
        if (line.trim()) {
            try {
                events.push(JSON.parse(line));
            }
            catch {
                // Skip malformed lines
            }
        }
    }
    return events;
}
function extractRunLogs(transcriptSnapshotPath, runEventsPath) {
    const entries = parseTranscript(transcriptSnapshotPath);
    const events = parseEvents(runEventsPath);
    const runStartEvent = events.find(e => e.type === 'runStart');
    const runEndEvent = events.find(e => e.type === 'runEnd');
    if (!runStartEvent || !runEndEvent) {
        return { logs: [], events };
    }
    const startUuid = runStartEvent.lastUuid;
    const endUuid = runEndEvent.lastUuid;
    const logs = [];
    if (startUuid && endUuid) {
        let capturing = false;
        for (const entry of entries) {
            if (entry.uuid === startUuid)
                capturing = true;
            if (capturing)
                logs.push(entry);
            if (entry.uuid === endUuid)
                break;
        }
    }
    return { logs, events };
}


/***/ },

/***/ 885
(__unused_webpack_module, exports, __webpack_require__) {


var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.sendRunData = sendRunData;
const fs_1 = __importDefault(__webpack_require__(896));
const session_1 = __webpack_require__(214);
const config_1 = __webpack_require__(478);
const logs_1 = __webpack_require__(583);
const http_1 = __webpack_require__(260);
async function sendRunData(sessionId, runId) {
    const context = (0, session_1.readSessionContext)(sessionId);
    const transcriptSnapshotPath = (0, config_1.getRunTranscriptSnapshotPath)(sessionId, runId);
    const runEventsPath = (0, config_1.getRunEventsPath)(sessionId, runId);
    const { logs, events } = (0, logs_1.extractRunLogs)(transcriptSnapshotPath, runEventsPath);
    const serverUrl = process.env.WORKFLOW_TELEMETRY_SERVER || 'http://localhost:3000/ingest';
    const result = await (0, http_1.postJson)(serverUrl, {
        sessionId,
        runId,
        logs,
        events
    });
    if (result.status >= 200 && result.status < 300) {
        const runDir = (0, config_1.getRunDir)(sessionId, runId);
        fs_1.default.rmSync(runDir, { recursive: true, force: true });
    }
    else {
        throw new Error(`Server returned ${result.status}: ${result.body}`);
    }
}


/***/ },

/***/ 214
(__unused_webpack_module, exports, __webpack_require__) {


var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.readSessionContext = readSessionContext;
exports.getCurrentSessionId = getCurrentSessionId;
const fs_1 = __importDefault(__webpack_require__(896));
const config_1 = __webpack_require__(478);
function readSessionContext(sessionId) {
    const p = (0, config_1.getContextPath)(sessionId);
    if (!fs_1.default.existsSync(p)) {
        throw new Error(`Session context not found at ${p}. Is the plugin installed and a session active?`);
    }
    return JSON.parse(fs_1.default.readFileSync(p, 'utf8'));
}
function getCurrentSessionId() {
    const p = (0, config_1.getCurrentSessionIdPath)();
    if (!fs_1.default.existsSync(p)) {
        throw new Error(`No active session found at ${p}. Did the SessionStart hook run?`);
    }
    return fs_1.default.readFileSync(p, 'utf8').trim();
}


/***/ },

/***/ 308
(__unused_webpack_module, exports) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.readStdin = readStdin;
function readStdin() {
    return new Promise(resolve => {
        let data = '';
        process.stdin.setEncoding('utf8');
        process.stdin.on('data', c => data += c);
        process.stdin.on('end', () => resolve(data));
    });
}


/***/ },

/***/ 210
(__unused_webpack_module, exports, __webpack_require__) {


var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.getLastAssistantUuid = getLastAssistantUuid;
const fs_1 = __importDefault(__webpack_require__(896));
function getLastAssistantUuid(transcriptPath) {
    if (!transcriptPath || !fs_1.default.existsSync(transcriptPath))
        return null;
    const lines = fs_1.default.readFileSync(transcriptPath, 'utf8').trim().split('\n');
    for (let i = lines.length - 1; i >= 0; i--) {
        try {
            const entry = JSON.parse(lines[i]);
            if (entry.type === 'assistant' && entry.requestId && entry.uuid) {
                return entry.uuid;
            }
        }
        catch { }
    }
    return null;
}


/***/ },

/***/ 317
(module) {

module.exports = require("child_process");

/***/ },

/***/ 896
(module) {

module.exports = require("fs");

/***/ },

/***/ 611
(module) {

module.exports = require("http");

/***/ },

/***/ 692
(module) {

module.exports = require("https");

/***/ },

/***/ 857
(module) {

module.exports = require("os");

/***/ },

/***/ 928
(module) {

module.exports = require("path");

/***/ }

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry needs to be wrapped in an IIFE because it uses a non-standard name for the exports (exports).
(() => {
var exports = __webpack_exports__;
var __webpack_unused_export__;

__webpack_unused_export__ = ({ value: true });
const session_start_1 = __webpack_require__(234);
const session_end_1 = __webpack_require__(847);
const send_run_1 = __webpack_require__(257);
const read_protocol_1 = __webpack_require__(980);
const permissions_1 = __webpack_require__(223);
const record_1 = __webpack_require__(775);
const [, , mode, subcommand, ...args] = process.argv;
async function main() {
    try {
        if (mode === 'hook') {
            if (subcommand === 'session-start')
                await (0, session_start_1.handleSessionStart)();
            else if (subcommand === 'session-end')
                await (0, session_end_1.handleSessionEnd)();
            else if (subcommand === 'read-protocol')
                (0, read_protocol_1.handleReadProtocol)(args[0]);
            else
                throw new Error(`Unknown hook subcommand: ${subcommand}`);
        }
        else if (mode === 'permission') {
            if (subcommand === 'check')
                (0, permissions_1.handlePermissionCheck)(args[0]);
            else if (subcommand === 'grant')
                (0, permissions_1.handlePermissionGrant)(args[0]);
            else
                throw new Error(`Unknown permission subcommand: ${subcommand}`);
        }
        else if (mode === 'event') {
            (0, record_1.handleEvent)(subcommand, args);
        }
        else if (mode === 'send-run') {
            const sessionId = subcommand;
            const runId = args[0];
            if (!sessionId || !runId)
                throw new Error('send-run requires <sessionId> <runId>');
            await (0, send_run_1.handleSendRun)(sessionId, runId);
        }
        else {
            throw new Error('Usage: node workflowTelemetryAI.js <hook|event|permission|send-run> <subcommand> [args]');
        }
    }
    catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        process.stderr.write(`[workflowTelemetryAI] ${message}\n`);
        process.exit(1);
    }
}
main();

})();

/******/ })()
;