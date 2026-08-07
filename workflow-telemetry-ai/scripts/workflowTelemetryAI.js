/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ 508
(__unused_webpack_module, exports) {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.TelemetryStateError = void 0;
class TelemetryStateError extends Error {
    constructor(result, message) {
        super(message ?? result.requiredNextAction.instruction);
        this.result = result;
        this.name = 'TelemetryStateError';
    }
}
exports.TelemetryStateError = TelemetryStateError;


/***/ },

/***/ 775
(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.handleEvent = handleEvent;
const record_event_1 = __webpack_require__(741);
function handleEvent(eventType, args) {
    const result = (0, record_event_1.recordLegacyEvent)(eventType, args);
    process.stdout.write(JSON.stringify(result) + '\n');
}


/***/ },

/***/ 472
(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.captureDisclosureResponse = captureDisclosureResponse;
exports.handleCaptureConsentResponse = handleCaptureConsentResponse;
const consent_1 = __webpack_require__(943);
const consent_disclosure_1 = __webpack_require__(837);
const stdin_1 = __webpack_require__(308);
const session_1 = __webpack_require__(214);
const plugin_identity_1 = __webpack_require__(834);
function captureDisclosureResponse(payload, pluginRoot) {
    if (payload.hook_event_name !== 'PostToolUse' || payload.tool_name !== 'AskUserQuestion')
        return false;
    const decision = (0, consent_disclosure_1.disclosureDecision)(payload.tool_input, payload.tool_response, pluginRoot);
    if (!decision)
        return false;
    let projectDir = typeof payload.cwd === 'string' ? payload.cwd : undefined;
    if (typeof payload.session_id === 'string') {
        try {
            projectDir = (0, session_1.readSessionContext)(payload.session_id).projectDir || projectDir;
        }
        catch { }
    }
    (0, consent_1.captureConsent)(decision, {
        projectDir,
        pluginRoot,
    });
    return true;
}
async function handleCaptureConsentResponse(forwardedPluginRoot) {
    try {
        // Forwarded from hooks.json first, env second, own location last. Relying
        // on the env var alone made this a silent no-op wherever it was absent —
        // and a consent capture that quietly does nothing means consent can never
        // be confirmed, with no error anywhere to explain why.
        const pluginRoot = forwardedPluginRoot || (0, plugin_identity_1.resolvePluginRoot)();
        if (!pluginRoot)
            return;
        const payload = JSON.parse(await (0, stdin_1.readStdin)());
        captureDisclosureResponse(payload, pluginRoot);
    }
    catch (error) {
        process.stderr.write(`[workflowTelemetryAI:consent] ${error instanceof Error ? error.message : String(error)}\n`);
    }
}


/***/ },

/***/ 92
(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.toolMatcher = toolMatcher;
exports.permissionDecision = permissionDecision;
exports.handleCheckMcpPermission = handleCheckMcpPermission;
const path_1 = __importDefault(__webpack_require__(928));
const consent_1 = __webpack_require__(943);
const fs_1 = __importDefault(__webpack_require__(896));
const plugin_identity_1 = __webpack_require__(834);
const stdin_1 = __webpack_require__(308);
const session_1 = __webpack_require__(214);
/** The bundle name that identifies our own MCP server entry. */
const MCP_BUNDLE = 'workflowTelemetryMcp.js';
const SUPPORTED_TOOLS = new Set([
    'telemetry_run_start',
    'telemetry_set_consent',
    'telemetry_step_start',
    'telemetry_step_end',
    'telemetry_run_end',
    'telemetry_reconnect',
    'telemetry_disconnect',
    'telemetry_status',
]);
/**
 * Tools that must work regardless of consent state. Reconnect enforces its own
 * consent rule internally (it resumes collection), but it still has to be
 * *callable* so the model can reach that rule and report it.
 */
const ALWAYS_ALLOWED = new Set([
    'telemetry_status',
    'telemetry_disconnect',
    'telemetry_reconnect',
]);
/**
 * Claude Code namespaces plugin MCP tools as
 * `mcp__plugin_<pluginName>_<serverKey>__<tool>`.
 *
 * `<pluginName>` is the **manifest name**, not the directory basename.
 * Installed plugins live at `.../<plugin>/<version>/`, so a basename yields
 * `0.4.0` and the matcher then matches nothing — silently skipping consent
 * enforcement on every real installation, while still passing tests whose
 * fixtures happen to use a directory named after the plugin. (Hard-coding the
 * name, as this originally did, fails the same way for any other author.)
 *
 * `<serverKey>` is read from the package's own `.mcp.json` rather than
 * wildcarded: a wildcard would also match a *different* MCP server shipped in
 * the same package that happened to expose these tool names.
 *
 * Returns null when identity cannot be established — no matcher at all is safer
 * than one that might match a foreign plugin's tools.
 */
function toolMatcher(pluginRoot) {
    const root = (0, plugin_identity_1.resolvePluginRoot)(pluginRoot);
    if (!root)
        return null;
    const pluginName = (0, plugin_identity_1.derivePluginName)(root);
    const serverKey = mcpServerKey(root);
    if (!pluginName || !serverKey)
        return null;
    return new RegExp(`^mcp__plugin_${escapeRe(pluginName)}_${escapeRe(serverKey)}__(.+)$`);
}
function escapeRe(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
/**
 * The key of **our** telemetry server in the package's `.mcp.json`.
 *
 * Identified by the bundle it launches, not by being the only entry: an
 * instrumented plugin may perfectly well ship its own MCP server, and refusing
 * to match whenever a second one exists would leave the telemetry tools ungated
 * even after consent. Falls back to a sole entry for packages whose args are
 * shaped unusually.
 */
function mcpServerKey(pluginRoot) {
    try {
        const raw = fs_1.default.readFileSync(path_1.default.join(pluginRoot, '.mcp.json'), 'utf8');
        const servers = JSON.parse(raw).mcpServers;
        if (!servers)
            return null;
        const entries = Object.entries(servers);
        // Identified ONLY by the bundle it launches. A sole-entry fallback fails
        // open: a package whose single MCP server is someone else's would have that
        // server declared to be telemetry, and a foreign tool named `telemetry_*`
        // would then be auto-approved by our consent state.
        const ours = entries.filter(([, def]) => {
            const argv = [def?.command, ...(Array.isArray(def?.args) ? def.args : [])];
            return argv.some(a => typeof a === 'string' && a.includes(MCP_BUNDLE));
        });
        return ours.length === 1 ? ours[0][0] : null;
    }
    catch {
        return null;
    }
}
function consentContext(payload, pluginRoot) {
    let projectDir = typeof payload.cwd === 'string' ? payload.cwd : undefined;
    if (typeof payload.session_id === 'string') {
        try {
            projectDir = (0, session_1.readSessionContext)(payload.session_id).projectDir || projectDir;
        }
        catch { }
    }
    return { projectDir, pluginRoot };
}
function permissionDecision(payload, pluginRoot) {
    if (payload.hook_event_name !== 'PreToolUse' || typeof payload.tool_name !== 'string')
        return null;
    const matcher = toolMatcher(pluginRoot);
    if (!matcher)
        return null;
    const matched = matcher.exec(payload.tool_name);
    if (!matched)
        return null;
    const tool = matched[1];
    if (!SUPPORTED_TOOLS.has(tool))
        return null;
    if (!payload.tool_input || typeof payload.tool_input !== 'object')
        return null;
    const context = consentContext(payload, pluginRoot);
    let allowed;
    if (tool === 'telemetry_set_consent') {
        const requested = payload.tool_input.decision;
        // Withdrawal is always permitted and needs no captured disclosure: it only
        // ever reduces collection, and Art. 7(3) requires it to be no harder than
        // granting. Granting and declining still require the exact disclosure to
        // have been shown and answered.
        allowed = requested === 'withdraw'
            || ((requested === 'allow' || requested === 'decline')
                && (0, consent_1.getCapturedConsent)(context) === requested);
    }
    else if (ALWAYS_ALLOWED.has(tool)) {
        // Recovery and reporting must never be gated on consent. Gating them is
        // what makes a terminal state inescapable: a user whose telemetry stopped
        // could not ask what happened, disconnect, or reconnect.
        allowed = true;
    }
    else if (tool === 'telemetry_run_start') {
        // Permitted pre-consent so the run can begin and surface CONSENT_REQUIRED.
        allowed = true;
    }
    else {
        allowed = (0, consent_1.getConsent)(context) === 'allow';
    }
    if (!allowed)
        return null;
    return {
        hookSpecificOutput: {
            hookEventName: 'PreToolUse',
            permissionDecision: 'allow',
            permissionDecisionReason: 'Approved by explicit WorkflowTelemetry analytics consent.',
        },
    };
}
async function handleCheckMcpPermission(forwardedPluginRoot) {
    try {
        const payload = JSON.parse(await (0, stdin_1.readStdin)());
        // Same forwarding rule as the consent hook: an absent plugin root here
        // would make the matcher match nothing, silently ungating every tool.
        const result = permissionDecision(payload, forwardedPluginRoot || (0, plugin_identity_1.resolvePluginRoot)());
        if (result)
            process.stdout.write(JSON.stringify(result));
    }
    catch (error) {
        process.stderr.write(`[workflowTelemetryAI:permission] ${error instanceof Error ? error.message : String(error)}\n`);
    }
}


/***/ },

/***/ 980
(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

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
exports.derivePluginName = void 0;
exports.handleReadProtocol = handleReadProtocol;
const fs = __importStar(__webpack_require__(896));
const path = __importStar(__webpack_require__(928));
const stdin_1 = __webpack_require__(308);
const plugin_identity_1 = __webpack_require__(834);
Object.defineProperty(exports, "derivePluginName", ({ enumerable: true, get: function () { return plugin_identity_1.derivePluginName; } }));
const telemetry_config_1 = __webpack_require__(740);
const consent_disclosure_1 = __webpack_require__(837);
/**
 * The protocol embeds the disclosure inside a quoted YAML/JSON-ish value, so a
 * quote or backslash in a plugin or author name would break out of it. Escaped
 * rather than stripped, because the string the model emits must match the one
 * the collector validates byte for byte.
 */
function jsonSafe(value) {
    return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}
async function handleReadProtocol(pluginRoot) {
    if (!pluginRoot) {
        throw new Error('read-protocol requires plugin root path as argument');
    }
    const input = await (0, stdin_1.readStdin)();
    const payload = JSON.parse(input);
    const sessionId = payload.session_id || '';
    const telemetryFile = path.join(pluginRoot, 'TELEMETRY_PROTOCOL.md');
    const normalizedPluginRoot = path.resolve(pluginRoot).replace(/\\/g, '/');
    // Identity comes from the telemetry block when the plugin is telemetry-enabled;
    // the manifest name is only a fallback for the protocol's prose.
    const config = (0, telemetry_config_1.loadTelemetryConfig)(pluginRoot);
    const pluginName = config?.pluginName ?? (0, plugin_identity_1.derivePluginName)(pluginRoot);
    try {
        const content = fs.readFileSync(telemetryFile, 'utf8');
        let substituted = content
            .replace(/\$PLUGIN_ROOT/g, normalizedPluginRoot)
            .replace(/\$PLUGIN_NAME/g, pluginName)
            .replace(/\$SESSION_ID/g, sessionId);
        // The disclosure is generated, never authored in the protocol: the
        // collector validates the answer against this exact string, so a
        // hand-written copy that drifts by one character disables consent entirely.
        if (config) {
            // Function replacement, NOT a string: `String.replace` interprets `$&`,
            // "$`", `$'` and `$1` inside a *string* replacement. Those can appear in
            // a plugin name, author name or policy URL, and the corrupted prompt then
            // no longer matches what buildDisclosureQuestion() validates — which
            // silently makes consent impossible to grant.
            const question = jsonSafe((0, consent_disclosure_1.buildDisclosureQuestion)(config));
            substituted = substituted.replace(/\$DISCLOSURE_QUESTION/g, () => question);
        }
        process.stdout.write(substituted);
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to read telemetry protocol: ${message}`);
    }
}


/***/ },

/***/ 85
(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.handleScanAndSend = handleScanAndSend;
const child_process_1 = __webpack_require__(317);
const fs_1 = __importDefault(__webpack_require__(896));
const path_1 = __importDefault(__webpack_require__(928));
const stdin_1 = __webpack_require__(308);
const paths_1 = __webpack_require__(830);
const plugin_context_1 = __webpack_require__(984);
const plugin_identity_1 = __webpack_require__(834);
async function handleScanAndSend() {
    try {
        const input = await (0, stdin_1.readStdin)();
        const payload = JSON.parse(input);
        const sessionId = payload.session_id;
        if (!sessionId)
            return;
        const pluginRoot = (0, plugin_identity_1.resolvePluginRoot)();
        // Scan ONLY this plugin's own queue, for its own current install. The
        // previous implementation walked the whole session directory, so with two
        // telemetry plugins active in one session each Stop hook picked up the
        // other's runs and uploaded them under its own credential — telemetry
        // crossing a customer boundary.
        const context = (0, plugin_context_1.resolvePluginContext)(pluginRoot);
        if (!context.ok)
            return;
        const queueDir = (0, paths_1.installQueueDir)(sessionId, context.identity);
        if (!fs_1.default.existsSync(queueDir))
            return;
        for (const entry of fs_1.default.readdirSync(queueDir, { withFileTypes: true })) {
            if (!entry.isDirectory())
                continue;
            const runId = entry.name;
            if (!fs_1.default.existsSync(path_1.default.join(queueDir, runId, 'events.jsonl')))
                continue; // no events yet
            // Forward the plugin root explicitly: this hook HAS it (Claude Code
            // interpolates ${CLAUDE_PLUGIN_ROOT} into hook args), but the detached
            // child does not inherit the env var.
            (0, child_process_1.spawn)(process.execPath, [process.argv[1], 'send-run', sessionId, runId, pluginRoot], {
                detached: true,
                stdio: 'ignore',
                windowsHide: true
            }).unref();
        }
    }
    catch { }
}


/***/ },

/***/ 257
(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.handleSendRun = handleSendRun;
const sender_1 = __webpack_require__(885);
async function handleSendRun(sessionId, runId, 
/** Forwarded by the spawning hook; the detached child has no env var to read. */
pluginRoot) {
    try {
        await (0, sender_1.sendRunData)(sessionId, runId, pluginRoot);
    }
    catch (error) {
        process.stderr.write(`Error sending run ${runId}: ${error}\n`);
        process.exit(1);
    }
}


/***/ },

/***/ 847
(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.handleSessionEnd = handleSessionEnd;
const fs_1 = __importDefault(__webpack_require__(896));
const path_1 = __importDefault(__webpack_require__(928));
const stdin_1 = __webpack_require__(308);
const paths_1 = __webpack_require__(830);
const plugin_context_1 = __webpack_require__(984);
const plugin_identity_1 = __webpack_require__(834);
const sender_1 = __webpack_require__(885);
async function handleSessionEnd() {
    const input = await (0, stdin_1.readStdin)();
    const payload = JSON.parse(input);
    const sessionId = payload.session_id;
    if (!sessionId)
        throw new Error('No session_id in SessionEnd payload');
    // Same scoping rule as the Stop hook: this plugin flushes its own queue and
    // nobody else's. Scoping also retires the old `!== 'session-context.json'`
    // filter — session-level files now sit above the queue, not beside the runs.
    const pluginRoot = (0, plugin_identity_1.resolvePluginRoot)();
    const context = (0, plugin_context_1.resolvePluginContext)(pluginRoot);
    if (!context.ok)
        return;
    const queueDir = (0, paths_1.installQueueDir)(sessionId, context.identity);
    if (!fs_1.default.existsSync(queueDir))
        return;
    for (const entry of fs_1.default.readdirSync(queueDir, { withFileTypes: true })) {
        if (!entry.isDirectory())
            continue;
        const runId = entry.name;
        if (!fs_1.default.existsSync(path_1.default.join(queueDir, runId, 'events.jsonl')))
            continue;
        try {
            await (0, sender_1.sendRunData)(sessionId, runId, pluginRoot);
        }
        catch (error) {
            process.stderr.write(`Warning: Failed to send run ${runId}: ${error}\n`);
        }
    }
}


/***/ },

/***/ 234
(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.handleSessionStart = handleSessionStart;
const fs_1 = __importDefault(__webpack_require__(896));
const stdin_1 = __webpack_require__(308);
const config_1 = __webpack_require__(478);
const plugin_identity_1 = __webpack_require__(834);
const telemetry_config_1 = __webpack_require__(740);
const registration_1 = __webpack_require__(644);
const recovery_1 = __webpack_require__(106);
const delivery_auth_1 = __webpack_require__(836);
async function handleSessionStart(forwardedPluginRoot) {
    const input = await (0, stdin_1.readStdin)();
    const payload = JSON.parse(input);
    const sessionId = payload.session_id;
    if (!sessionId)
        throw new Error('No session_id in SessionStart payload');
    const sessionDir = (0, config_1.getSessionDir)(sessionId);
    fs_1.default.mkdirSync(sessionDir, { recursive: true });
    const context = {
        sessionId,
        transcriptPath: payload.transcript_path || null,
        startTime: new Date().toISOString(),
        projectDir: payload.cwd || process.env.CLAUDE_PROJECT_DIR || process.cwd(),
    };
    fs_1.default.writeFileSync((0, config_1.getContextPath)(sessionId), JSON.stringify(context, null, 2));
    await maintainTelemetryState(forwardedPluginRoot);
}
/**
 * The required automatic surface for terminal states, plus the cross-process
 * retry of a pending disconnect.
 *
 * Both belong here because SessionStart is the one hook that runs regardless of
 * what the user does. Delivery hooks run with `stdio: 'ignore'`, so a stopped
 * installation is otherwise completely silent — the user is never told, and so
 * never learns there is an action to take. And a disconnect requested in a
 * session that has since closed would never be retried by the process that
 * started it, leaving the installation active server-side while the user
 * believes they disconnected.
 *
 * Never throws: telemetry state must not break session startup.
 */
async function maintainTelemetryState(forwardedPluginRoot) {
    try {
        const pluginRoot = forwardedPluginRoot || (0, plugin_identity_1.resolvePluginRoot)();
        const config = (0, telemetry_config_1.loadTelemetryConfig)(pluginRoot);
        if (!config)
            return;
        const base = (0, telemetry_config_1.apiBaseHash)(config.apiBaseUrl);
        const { record } = (0, registration_1.readRecord)(base, config.pluginId);
        if (!record)
            return;
        if (record.state === 'disconnect_pending') {
            await (0, delivery_auth_1.processPendingDisconnect)(config);
        }
        // A package update that changes the offending fingerprint must be able to
        // lift the block here too. Without this, the notice keeps telling the user
        // to update a package they already updated.
        if (record.state === 'configuration_blocked') {
            (0, delivery_auth_1.reconcileConfigurationBlock)(config);
        }
        // Re-read: the disconnect above may have just completed.
        const { record: current } = (0, registration_1.readRecord)(base, config.pluginId);
        if ((0, recovery_1.isTerminal)(current)) {
            process.stdout.write(`[${config.pluginName}] ${(0, recovery_1.terminalNotice)(current)}\n`);
        }
    }
    catch {
        // Startup must never fail because of telemetry.
    }
}


/***/ },

/***/ 156
(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
const crypto_1 = __importDefault(__webpack_require__(982));
const session_start_1 = __webpack_require__(234);
const session_end_1 = __webpack_require__(847);
const send_run_1 = __webpack_require__(257);
const read_protocol_1 = __webpack_require__(980);
const scan_and_send_1 = __webpack_require__(85);
const check_mcp_permission_1 = __webpack_require__(92);
const capture_consent_response_1 = __webpack_require__(472);
const record_1 = __webpack_require__(775);
const recovery_1 = __webpack_require__(106);
const disconnect_retry_1 = __webpack_require__(116);
const plugin_identity_1 = __webpack_require__(834);
const [, , mode, subcommand, ...args] = process.argv;
const RECOVERY = new Set(['status', 'reconnect', 'disconnect', 'withdraw']);
/**
 * Where the plugin root actually is for THIS invocation.
 *
 * `args[0]` is not generically the root: for send-run it is the run id, for a
 * recovery command it is `subcommand`, and for legacy events it is event data.
 * Loading config from a bogus path silently skipped the housekeeping this is
 * supposed to guarantee.
 */
function pluginRootForMode() {
    if (mode === 'hook') {
        // Hooks that receive the root pass it first; the rest fall back to argv[1].
        const withRoot = new Set(['session-start', 'read-protocol', 'check-mcp-permission', 'capture-consent-response']);
        return (0, plugin_identity_1.resolvePluginRoot)(withRoot.has(subcommand) ? args[0] : undefined);
    }
    if (mode === 'send-run')
        return (0, plugin_identity_1.resolvePluginRoot)(args[1]);
    if (RECOVERY.has(mode))
        return (0, plugin_identity_1.resolvePluginRoot)(subcommand);
    return (0, plugin_identity_1.resolvePluginRoot)();
}
/**
 * Recovery from the command line. Consent context is the current working
 * directory, which is the project the user is standing in — the same scope the
 * MCP surface derives from the session.
 */
async function handleRecovery(action, pluginRootArg) {
    const pluginRoot = pluginRootArg || (0, plugin_identity_1.resolvePluginRoot)();
    const consentCtx = { projectDir: process.cwd(), pluginRoot };
    if (action === 'status') {
        const report = (0, recovery_1.status)(pluginRoot, consentCtx);
        process.stdout.write(`${report.message}\n`);
        if (report.state)
            process.stdout.write(`  state: ${report.state}\n`);
        if (report.installId)
            process.stdout.write(`  installation: ${report.installId}\n`);
        process.stdout.write(`  consent (this project): ${report.consent ?? 'not granted'}\n`);
        // Non-zero when the user must act, so this is usable in a script.
        if (report.needsAction)
            process.exitCode = 2;
        return;
    }
    const result = action === 'reconnect' ? (0, recovery_1.reconnect)(pluginRoot, consentCtx)
        : action === 'withdraw' ? (0, recovery_1.withdraw)(pluginRoot, consentCtx)
            : (0, recovery_1.disconnect)(pluginRoot);
    process.stdout.write(`${result.message}\n`);
    if (!result.ok)
        process.exitCode = 1;
}
async function main() {
    try {
        // Durable housekeeping runs on EVERY invocation, whichever entry point this
        // is: a disconnect the server has not acknowledged, and any queue removal
        // that previously failed. The process that requested them may never run
        // again, so tying the retry to one hook leaves the work undone.
        await (0, disconnect_retry_1.retryPendingDisconnect)(pluginRootForMode());
        if (mode === 'hook') {
            if (subcommand === 'session-start')
                await (0, session_start_1.handleSessionStart)(args[0]);
            else if (subcommand === 'session-end')
                await (0, session_end_1.handleSessionEnd)();
            else if (subcommand === 'read-protocol')
                await (0, read_protocol_1.handleReadProtocol)(args[0]);
            else if (subcommand === 'scan-and-send')
                await (0, scan_and_send_1.handleScanAndSend)();
            else if (subcommand === 'check-mcp-permission')
                await (0, check_mcp_permission_1.handleCheckMcpPermission)(args[0]);
            else if (subcommand === 'capture-consent-response')
                await (0, capture_consent_response_1.handleCaptureConsentResponse)(args[0]);
            else
                throw new Error(`Unknown hook subcommand: ${subcommand}`);
        }
        else if (mode === 'event') {
            (0, record_1.handleEvent)(subcommand, args);
        }
        else if (mode === 'send-run') {
            const sessionId = subcommand;
            const runId = args[0];
            if (!sessionId || !runId)
                throw new Error('send-run requires <sessionId> <runId>');
            // Optional 3rd arg: the plugin root, forwarded by the spawning hook. A
            // detached child cannot inherit CLAUDE_PLUGIN_ROOT.
            await (0, send_run_1.handleSendRun)(sessionId, runId, args[1]);
        }
        else if (mode === 'gen-run-id') {
            process.stdout.write(crypto_1.default.randomUUID() + '\n');
        }
        else if (RECOVERY.has(mode)) {
            // The recovery actions exist on BOTH surfaces on purpose: the MCP path is
            // the one a user reaches through the agent, but it is also the path that
            // breaks (a bad plugin config, a permission hook that denies, a server
            // that will not start). A user whose telemetry is stuck needs a route that
            // does not depend on the machinery that is stuck.
            await handleRecovery(mode, subcommand);
        }
        else {
            throw new Error('Usage: node workflowTelemetryAI.js <command> [args]\n' +
                '  status [pluginRoot]        report telemetry state for this project\n' +
                '  reconnect [pluginRoot]     re-register after a disconnect or failure\n' +
                '  disconnect [pluginRoot]    stop telemetry from this device\n' +
                '  withdraw [pluginRoot]      withdraw consent for THIS project only\n' +
                '  hook|event|send-run|gen-run-id ...');
        }
    }
    catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        process.stderr.write(`[workflowTelemetryAI] ${message}\n`);
        process.exit(1);
    }
}
main();


/***/ },

/***/ 837
(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.DISCLOSURE_HEADER = void 0;
exports.buildDisclosureQuestion = buildDisclosureQuestion;
exports.disclosureDecision = disclosureDecision;
const telemetry_config_1 = __webpack_require__(740);
/**
 * The consent disclosure — the exact words an end user answers before any data
 * is collected.
 *
 * **This module is the only source of that text.** It used to be duplicated:
 * once here (what the collector validates) and once in the plugin package's
 * TELEMETRY_PROTOCOL.md (what the model actually shows). The two drifted, and
 * because the match below is exact, the mismatch silently made consent
 * impossible to grant — every `telemetry_set_consent` failed with "not captured
 * from the analytics disclosure". The protocol now interpolates
 * `$DISCLOSURE_QUESTION` from here, so shown text and validated text cannot
 * diverge again.
 *
 * The wording is load-bearing, not boilerplate:
 *  - it names the recipient, because the user is agreeing to send data to *them*
 *  - it says "per-installation identifier", never "anonymous": the install id is
 *    a stable online identifier, and calling it anonymous would be false
 *  - it mentions the transcript slice, which is the most sensitive thing sent
 */
exports.DISCLOSURE_HEADER = 'Data collection';
function buildDisclosureQuestion(config) {
    return (`${config.pluginName} would like to collect data about how its skills are used in this ` +
        `session, and send it to ${config.authorName}. ` +
        `Collected: step timings, token counts, tool names, a per-installation identifier, and a ` +
        `sanitized slice of this session's transcript. ` +
        `Tool inputs are filtered by this plugin's telemetry.config.json before sending — anything ` +
        `not explicitly allowed by that configuration is redacted, not sent as-is. ` +
        `You can withdraw consent at any time. ` +
        `Privacy policy: ${config.privacyPolicyUrl}`);
}
/**
 * Recognize the disclosure prompt and extract the user's answer.
 *
 * Deliberately exact: consent is captured only when the prompt is, character
 * for character, the one we generated, with exactly the two expected options.
 * A looser match would let a differently-worded prompt — one that promised the
 * user something else — authorize collection.
 */
function disclosureDecision(toolInput, toolResponse, pluginRoot) {
    let config;
    try {
        config = (0, telemetry_config_1.loadTelemetryConfig)(pluginRoot);
    }
    catch {
        return null; // unusable config: there is nothing coherent to consent to
    }
    if (!config)
        return null;
    const questions = toolInput?.questions;
    if (!Array.isArray(questions) || questions.length !== 1)
        return null;
    const question = questions[0];
    const expectedQuestion = buildDisclosureQuestion(config);
    if (question.question !== expectedQuestion || question.header !== exports.DISCLOSURE_HEADER)
        return null;
    if (!Array.isArray(question.options))
        return null;
    const labels = question.options.map(option => option.label);
    if (labels.length !== 2 || labels[0] !== 'Allow' || labels[1] !== 'Decline')
        return null;
    const answer = extractAnswer(toolResponse, expectedQuestion);
    return answer === 'Allow' ? 'allow' : answer === 'Decline' ? 'decline' : null;
}
function extractAnswer(response, question) {
    if (!response || typeof response !== 'object')
        return null;
    const record = response;
    const answers = record.answers;
    if (answers && typeof answers === 'object') {
        const answerRecord = answers;
        if (question in answerRecord)
            return answerRecord[question];
        const values = Object.values(answerRecord);
        if (values.length === 1)
            return values[0];
    }
    for (const key of ['answer', 'selected', 'value', 'label', 'response']) {
        if (typeof record[key] === 'string')
            return record[key];
    }
    return null;
}


/***/ },

/***/ 943
(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.getConsent = getConsent;
exports.getCapturedConsent = getCapturedConsent;
exports.captureConsent = captureConsent;
exports.confirmConsent = confirmConsent;
exports.withdrawConsent = withdrawConsent;
exports.acquireConsentLock = acquireConsentLock;
const crypto_1 = __importDefault(__webpack_require__(982));
const fs_1 = __importDefault(__webpack_require__(896));
const path_1 = __importDefault(__webpack_require__(928));
const config_1 = __webpack_require__(478);
const plugin_identity_1 = __webpack_require__(834);
const telemetry_config_1 = __webpack_require__(740);
const file_lock_1 = __webpack_require__(44);
/**
 * Consent is scoped to **what the user actually agreed to**, not merely to a
 * package name.
 *
 * The key covers four things, and each closes a way consent could be
 * misapplied:
 *  - **project** — consent is per project by design (ADR 16)
 *  - **API base** — otherwise a plugin repointed at a different server inherits
 *    an `allow` granted for sending data somewhere else entirely
 *  - **immutable pluginId** — otherwise a different author's package reusing the
 *    same manifest name inherits the decision
 *  - **disclosure fingerprint** — the user agreed to specific words naming a
 *    specific recipient and policy. If the author, the name or the policy URL
 *    changes, that agreement no longer covers what is now being asked, so the
 *    key changes and the user is asked again.
 *
 * A plugin with no telemetry block has nothing to scope to and falls back to the
 * package name; such a plugin records nothing anyway.
 */
function consentKey(context = {}) {
    const resolvedProject = path_1.default.resolve(context.projectDir || process.env.CLAUDE_PROJECT_DIR || process.cwd());
    const project = process.platform === 'win32' ? resolvedProject.toLowerCase() : resolvedProject;
    const root = (0, plugin_identity_1.resolvePluginRoot)(context.pluginRoot);
    let scope;
    try {
        const config = (0, telemetry_config_1.loadTelemetryConfig)(root);
        scope = config
            ? [
                (0, telemetry_config_1.normalizeApiBaseUrl)(config.apiBaseUrl),
                config.pluginId,
                disclosureFingerprint(config),
            ].join('\0')
            : (0, plugin_identity_1.derivePluginName)(root);
    }
    catch {
        // An unusable telemetry block cannot be consented to; keep it distinct from
        // every valid scope rather than silently reusing a neighbouring decision.
        scope = `invalid-config\0${(0, plugin_identity_1.derivePluginName)(root)}`;
    }
    return crypto_1.default.createHash('sha256').update(`${project}\0${scope}`).digest('hex');
}
/**
 * Fingerprint of the **entire disclosure the user was shown**, not merely the
 * fields interpolated into it.
 *
 * Hashing only the recipient fields meant that changing what is collected — or
 * materially rewording the prompt — reused an old `allow`. The user agreed to a
 * specific statement about specific data; if that statement changes, so must
 * the key.
 *
 * `buildDisclosureQuestion` is imported lazily to avoid an import cycle: the
 * disclosure module needs `ConsentDecision` from here.
 */
function disclosureFingerprint(config) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { buildDisclosureQuestion } = __webpack_require__(837);
    return crypto_1.default
        .createHash('sha256')
        .update(buildDisclosureQuestion(config))
        .digest('hex')
        .slice(0, 16);
}
function consentPath() {
    return path_1.default.join((0, config_1.getBaseDir)(), 'consent.json');
}
function consentLockPath() {
    return path_1.default.join((0, config_1.getBaseDir)(), 'consent.lock');
}
function readStore() {
    try {
        return JSON.parse(fs_1.default.readFileSync(consentPath(), 'utf8'));
    }
    catch {
        return {};
    }
}
/**
 * Mutate one entry under the shared consent lock.
 *
 * The store is a single global map, so an unlocked read-modify-rename lets a
 * concurrent writer's stale snapshot restore another project's pre-withdrawal
 * `allow` — silently un-withdrawing consent. The mutation runs against a copy
 * re-read *inside* the lock, never against one read before it.
 *
 * The critical section is two small file operations, so this waits for the lock
 * rather than giving up: failing here would mean losing the very guarantee the
 * lock exists to provide.
 */
function updateStore(context, mutate) {
    fs_1.default.mkdirSync((0, config_1.getBaseDir)(), { recursive: true });
    const release = (0, file_lock_1.acquireFileLock)(consentLockPath(), { leaseMs: 30000, waitMs: 5000 });
    if (!release)
        return false;
    try {
        const key = consentKey(context);
        const store = readStore();
        const next = mutate(store[key]);
        if (!next)
            return false;
        store[key] = next;
        const target = consentPath();
        const temporary = `${target}.${process.pid}.${crypto_1.default.randomUUID().slice(0, 8)}.tmp`;
        fs_1.default.writeFileSync(temporary, JSON.stringify(store, null, 2));
        fs_1.default.renameSync(temporary, target);
        return true;
    }
    finally {
        release();
    }
}
function getConsent(context = {}) {
    const record = readStore()[consentKey(context)];
    if (!record || record.status === 'captured')
        return null;
    return record.decision;
}
function getCapturedConsent(context = {}) {
    const record = readStore()[consentKey(context)];
    return record?.status === 'captured' ? record.decision : null;
}
function captureConsent(decision, context = {}) {
    updateStore(context, existing => {
        if (existing?.status !== 'captured' && existing?.decision === decision)
            return null;
        return { decision, updatedAt: new Date().toISOString(), status: 'captured' };
    });
}
function confirmConsent(decision, context = {}) {
    // Re-checked inside the lock: the captured decision this confirms could
    // otherwise be replaced between the check and the write.
    return updateStore(context, existing => {
        if (existing?.status !== 'captured' || existing.decision !== decision)
            return null;
        return { decision, updatedAt: new Date().toISOString(), status: 'confirmed' };
    });
}
/**
 * Withdraw consent for this project (GDPR Art. 7(3)).
 *
 * **Never requires a captured disclosure.** Granting is gated on the exact
 * prompt because agreement must be informed; withdrawal is the opposite — it
 * only ever reduces collection, so gating it behind a matching prompt would
 * make withdrawing *harder* than granting, which is precisely what Art. 7(3)
 * forbids. It always succeeds.
 *
 * Project-scoped by design: the install token is device-wide and may still be
 * serving another project that is still consenting, so this makes **no server
 * request** and leaves registration untouched. Disconnecting the device is a
 * separate action with a different blast radius.
 */
function withdrawConsent(context = {}) {
    // Returns whether the withdrawal is DURABLE. Telling a user their consent was
    // withdrawn while the old `allow` is still on disk is the worst possible
    // outcome here: recording and delivery resume afterwards, and the user has
    // been told the opposite.
    return updateStore(context, () => ({
        decision: 'withdrawn',
        updatedAt: new Date().toISOString(),
        status: 'confirmed',
    }));
}
/** Guard a section that must not interleave with a withdrawal for this scope. */
function acquireConsentLock(waitMs = 5000) {
    fs_1.default.mkdirSync((0, config_1.getBaseDir)(), { recursive: true });
    return (0, file_lock_1.acquireFileLock)(consentLockPath(), { leaseMs: 30000, waitMs });
}


/***/ },

/***/ 836
(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ensureInitialised = void 0;
exports.reconcileConfigurationBlock = reconcileConfigurationBlock;
exports.resolveDeliveryAuth = resolveDeliveryAuth;
exports.processPendingDisconnect = processPendingDisconnect;
exports.recordIngestTerminal = recordIngestTerminal;
const crypto_1 = __importDefault(__webpack_require__(982));
const http_1 = __webpack_require__(260);
const queue_maintenance_1 = __webpack_require__(348);
const telemetry_config_1 = __webpack_require__(740);
const registration_1 = __webpack_require__(644);
Object.defineProperty(exports, "ensureInitialised", ({ enumerable: true, get: function () { return registration_1.ensureInitialised; } }));
function now() {
    return new Date().toISOString();
}
/**
 * Classify a registration failure by **how far the attempt got**.
 *
 * A definite pre-send failure means nothing reached the server, so the identity
 * is still clean. Anything after the request was sent — timeout, lost response,
 * ambiguous 5xx — may have committed a token server-side, so the identity is
 * unusable and must be replaced. Guessing "no token" there would re-register an
 * id that already exists and 409 forever.
 */
function isPreSendFailure(err) {
    const code = err?.code ?? '';
    return ['ECONNREFUSED', 'ENOTFOUND', 'EAI_AGAIN', 'CERT_HAS_EXPIRED', 'ERR_TLS_CERT_ALTNAME_INVALID']
        .includes(code);
}
/**
 * Fingerprint of the config fields whose change should lift a
 * `configuration_blocked` state — the enrolment key and the asserted plugin id.
 */
function fingerprintOf(config) {
    return (0, registration_1.configFingerprint)({ pluginKey: config.pluginKey, pluginId: config.pluginId });
}
/**
 * Lift a `configuration_blocked` state once the prescribed package update has
 * actually happened. Returns the restored record, or null if still blocked.
 *
 * Must be callable from the **terminal/status** path, not only from delivery:
 * the terminal gate rejects every telemetry boundary before a queue exists, so
 * a delivery-only reconciliation could never run after the update it asked for
 * — the state would be permanently blocked despite saying "update the package".
 *
 * Takes the shared lock and revalidates state and revision, because a
 * concurrent disconnect could otherwise commit `disconnect_pending` and then be
 * silently overwritten back to `never_registered`.
 */
function reconcileConfigurationBlock(config) {
    const base = (0, telemetry_config_1.apiBaseHash)(config.apiBaseUrl);
    const release = (0, registration_1.acquireLock)(base, config.pluginId, { waitMs: 2000 });
    if (!release)
        return null;
    try {
        const { record, corrupt } = (0, registration_1.readRecord)(base, config.pluginId);
        if (corrupt || !record)
            return null;
        if (record.state !== 'configuration_blocked')
            return null;
        if (!record.configFingerprint || record.configFingerprint === fingerprintOf(config)) {
            return null; // the offending configuration is still in place
        }
        return (0, registration_1.writeRecord)(base, config.pluginId, {
            ...record,
            state: record.blockedFrom ?? 'never_registered',
            blockedFrom: null,
            terminalError: null,
            configFingerprint: null,
        });
    }
    finally {
        release();
    }
}
async function resolveDeliveryAuth(config, gate) {
    const base = (0, telemetry_config_1.apiBaseHash)(config.apiBaseUrl);
    const { record, corrupt } = (0, registration_1.readRecord)(base, config.pluginId);
    // A record that exists but cannot be read must fail closed. It is NOT the
    // same as never having registered — a token may exist server-side.
    if (corrupt) {
        return { kind: 'stop', reason: 'corrupt_record', action: 'reconnect' };
    }
    if (!record) {
        // No record at all, and consent-time initialisation never ran. Treat as
        // uninitialised rather than enrolling blind.
        return { kind: 'defer', reason: 'not_initialised' };
    }
    return resolveFrom(config, base, record, gate);
}
async function resolveFrom(config, base, record, gate) {
    switch (record.state) {
        case 'registered':
            return record.token
                ? {
                    kind: 'token',
                    token: record.token,
                    installId: record.currentInstallId,
                    replacesInstallId: record.replacesInstallId,
                }
                : { kind: 'stop', reason: 'missing_credential', action: 'reconnect' };
        case 'replacement_required':
            return { kind: 'stop', reason: record.terminalError?.reason ?? 'replacement_required', action: 'reconnect' };
        case 'disconnect_pending':
        case 'disconnected':
            return { kind: 'stop', reason: 'disconnected', action: 'reconnect' };
        case 'configuration_blocked': {
            const restored = reconcileConfigurationBlock(config);
            if (restored)
                return resolveFrom(config, base, restored, gate);
            return { kind: 'stop', reason: record.terminalError?.reason ?? 'configuration_blocked', action: 'update_package' };
        }
        case 'registering': {
            if ((0, registration_1.leaseIsLive)(record))
                return { kind: 'defer', reason: 'registration_in_flight' };
            // The owner died. A crash after send is indistinguishable from a lost
            // response, so the identity is ambiguous — not retryable. Reclamation
            // re-checks under the lock; if it declines, the original owner finished
            // in the meantime, so defer and re-read next time rather than assume.
            const reclaimed = (0, registration_1.reclaimStaleLease)(base, config.pluginId, record);
            return reclaimed
                ? { kind: 'stop', reason: 'ambiguous_registration', action: 'reconnect' }
                : { kind: 'defer', reason: 'reclaim_raced' };
        }
        case 'never_registered':
            return enrol(config, base, record, gate);
    }
}
async function enrol(config, base, record, gate) {
    const installId = record.currentInstallId ?? crypto_1.default.randomUUID();
    // One enrolment at a time per (apiBase, plugin) across ALL sessions.
    const release = (0, registration_1.acquireLock)(base, config.pluginId);
    if (!release)
        return { kind: 'defer', reason: 'registration_in_flight' };
    let releasedForIo = false;
    try {
        // Re-read under the lock and fail closed. Falling back to the pre-lock
        // snapshot would let a record deleted or corrupted while we waited proceed
        // to enrolment against an identity that may already have a token.
        const reread = (0, registration_1.readRecord)(base, config.pluginId);
        if (reread.corrupt)
            return { kind: 'stop', reason: 'corrupt_record', action: 'reconnect' };
        if (!reread.record)
            return { kind: 'stop', reason: 'missing_record', action: 'reconnect' };
        const fresh = reread.record;
        if (fresh.state === 'registered' && fresh.token) {
            return {
                kind: 'token',
                token: fresh.token,
                installId: fresh.currentInstallId,
                replacesInstallId: fresh.replacesInstallId,
            };
        }
        if (fresh.state !== 'never_registered') {
            return { kind: 'defer', reason: 'state_changed' };
        }
        // Persist `registering` BEFORE any network I/O, so a crash is detectable.
        const begun = (0, registration_1.beginRegistering)(base, config.pluginId, fresh);
        const expect = {
            operationId: begun.operationId,
            owner: begun.owner,
            revision: begun.record.revision,
        };
        // Release before the request. Holding this across a configurable timeout
        // lets the lease expire, after which reclaimStaleLease may legitimately take
        // over — and a completion written afterwards would own no current lock,
        // racing the reclaimer. Each completion re-acquires instead.
        release();
        releasedForIo = true;
        // Open the caller's boundary and start the request inside it, so nothing
        // can commit between the final consent check and `/register` beginning.
        if (gate && !gate.open()) {
            (0, registration_1.completeAttempt)(base, config.pluginId, expect, r => ({ ...r, state: 'never_registered' }));
            return { kind: 'defer', reason: 'consent_gate_contended' };
        }
        let pending;
        try {
            pending = (0, http_1.postJson)(`${config.apiBaseUrl}/register`, {
                installId,
                expectedPluginId: config.pluginId,
                replacesInstallId: fresh.replacesInstallId ?? undefined,
            }, { Authorization: `Bearer ${config.pluginKey}` });
        }
        finally {
            // Released the instant the request exists — never held across the await.
            gate?.close();
        }
        let result;
        try {
            result = await pending;
        }
        catch (err) {
            if (isPreSendFailure(err)) {
                // Nothing reached the server: the identity is still clean, so this is
                // simply retryable.
                completeUnderFreshLock(base, config.pluginId, expect, r => ({
                    ...r,
                    state: 'never_registered',
                }));
                return { kind: 'defer', reason: 'offline' };
            }
            completeUnderFreshLock(base, config.pluginId, expect, r => ({
                ...r,
                state: 'replacement_required',
                token: null,
                terminalError: { reason: 'ambiguous_registration', at: now(), action: 'reconnect' },
            }));
            return { kind: 'stop', reason: 'ambiguous_registration', action: 'reconnect' };
        }
        if (result.status === 201) {
            // A malformed body used to throw out of here, leaving the record stuck in
            // `registering` until the lease expired; a well-formed body with no token
            // persisted `registered` with an unusable credential. Both are the
            // ambiguous case: the server may well have committed a token.
            const token = parseIssuedToken(result.body);
            if (!token) {
                completeUnderFreshLock(base, config.pluginId, expect, r => ({
                    ...r,
                    state: 'replacement_required',
                    token: null,
                    terminalError: { reason: 'ambiguous_registration', at: now(), action: 'reconnect' },
                }));
                return { kind: 'stop', reason: 'ambiguous_registration', action: 'reconnect' };
            }
            const applied = completeUnderFreshLock(base, config.pluginId, expect, r => ({
                ...r,
                state: 'registered',
                token,
                currentInstallId: installId,
                replacesInstallId: null, // consumed
                terminalError: null,
            }));
            // A discarded outcome means another process moved the state on; defer
            // rather than overwrite it.
            return applied
                ? { kind: 'token', token, installId, replacesInstallId: null }
                : { kind: 'defer', reason: 'superseded' };
        }
        if (result.status === 409) {
            // Either the plugin id disagreed with the key, or this install id already
            // has a token server-side. Both are terminal for this identity.
            const mismatch = safeReason(result.body) === 'plugin_id_mismatch';
            completeUnderFreshLock(base, config.pluginId, expect, r => ({
                ...r,
                state: mismatch ? 'configuration_blocked' : 'replacement_required',
                token: null,
                blockedFrom: mismatch ? 'never_registered' : null,
                // Stored so a corrected package can actually lift the block.
                configFingerprint: mismatch ? fingerprintOf(config) : null,
                terminalError: {
                    reason: mismatch ? 'plugin_id_mismatch' : 'already_registered',
                    at: now(),
                    action: mismatch ? 'update_package' : 'reconnect',
                },
            }));
            return mismatch
                ? { kind: 'stop', reason: 'plugin_id_mismatch', action: 'update_package' }
                : { kind: 'stop', reason: 'already_registered', action: 'reconnect' };
        }
        if (result.status === 401) {
            // The enrolment key shipped in this package was revoked: a package update
            // is required, and no other identity will help.
            completeUnderFreshLock(base, config.pluginId, expect, r => ({
                ...r,
                state: 'configuration_blocked',
                blockedFrom: 'never_registered',
                configFingerprint: fingerprintOf(config),
                terminalError: { reason: 'enrolment_key_revoked', at: now(), action: 'update_package' },
            }));
            return { kind: 'stop', reason: 'enrolment_key_revoked', action: 'update_package' };
        }
        // 5xx and anything else: the server may or may not have committed.
        completeUnderFreshLock(base, config.pluginId, expect, r => ({
            ...r,
            state: 'replacement_required',
            token: null,
            terminalError: { reason: 'ambiguous_registration', at: now(), action: 'reconnect' },
        }));
        return { kind: 'stop', reason: 'ambiguous_registration', action: 'reconnect' };
    }
    finally {
        if (!releasedForIo)
            release();
    }
}
/**
 * Apply an enrolment outcome under a freshly acquired lock.
 *
 * The original lock was released for the network call, so ownership has to be
 * re-established before writing. completeAttempt still CAS's on owner and
 * revision; this makes that check-and-write atomic with respect to whichever
 * process owns the state now.
 */
function completeUnderFreshLock(base, pluginId, expect, mutate) {
    const lock = (0, registration_1.acquireLock)(base, pluginId, { waitMs: 5000 });
    if (!lock)
        return null;
    try {
        return (0, registration_1.completeAttempt)(base, pluginId, expect, mutate);
    }
    finally {
        lock();
    }
}
/**
 * Complete a pending disconnect: `DELETE /register`, retried until the server
 * acknowledges.
 *
 * Runs on **every** collector invocation, not only the one that requested the
 * disconnect — a disconnect started in a session that has since closed would
 * otherwise never complete, leaving the installation active server-side while
 * the user believes they disconnected.
 *
 * A 401 counts as success: the route accepts already-terminated tokens
 * precisely so a retry after a lost response works, so "this credential is
 * gone" is exactly the end state being asked for. Only an unreachable or
 * erroring server leaves it pending.
 */
async function processPendingDisconnect(config) {
    const base = (0, telemetry_config_1.apiBaseHash)(config.apiBaseUrl);
    const release = (0, registration_1.acquireLock)(base, config.pluginId);
    if (!release)
        return false;
    let released = false;
    try {
        const { record, corrupt } = (0, registration_1.readRecord)(base, config.pluginId);
        if (corrupt || !record)
            return false;
        if (record.state !== 'disconnect_pending')
            return false;
        if (!record.token) {
            // Nothing to revoke server-side; the local end state is still reached.
            (0, registration_1.markDisconnected)(base, config.pluginId, record);
            return true;
        }
        // Identity of the record this request speaks for. The lock is held across
        // network I/O, but it can expire, so the response must be CAS'd rather than
        // trusted: another process could complete the disconnect and reconnect a
        // replacement in the meantime, and a delayed 200 applied blindly would
        // overwrite that live replacement with a stale `disconnected`.
        const sentFor = {
            revision: record.revision,
            installId: record.currentInstallId,
            token: record.token,
        };
        // Release BEFORE the request. Holding a lock across network I/O lets a
        // configurable timeout outlast the lease, after which another process owns
        // the lock and this one's later write would not be serialised against it.
        release();
        released = true;
        let result;
        try {
            result = await (0, http_1.deleteJson)(`${config.apiBaseUrl}/register`, {
                Authorization: `Bearer ${record.token}`,
            });
        }
        catch {
            return false; // offline: stay pending, retry next invocation
        }
        // A 401 counts as success: the route accepts already-terminated tokens
        // precisely so a retry after a lost response works, so "this credential is
        // gone" is the end state being asked for.
        if (!((result.status >= 200 && result.status < 300) || result.status === 401)) {
            return false; // 5xx and anything else: retry later
        }
        // Fresh lock for the completion, so the re-read and the write are atomic
        // with respect to whoever owns the state now.
        const completion = (0, registration_1.acquireLock)(base, config.pluginId, { waitMs: 5000 });
        if (!completion)
            return false;
        try {
            const fresh = (0, registration_1.readRecord)(base, config.pluginId);
            if (fresh.corrupt || !fresh.record)
                return false;
            if (fresh.record.state !== 'disconnect_pending' ||
                fresh.record.revision !== sentFor.revision ||
                fresh.record.currentInstallId !== sentFor.installId ||
                fresh.record.token !== sentFor.token) {
                return false; // superseded while in flight — discard this outcome
            }
            (0, registration_1.markDisconnected)(base, config.pluginId, fresh.record);
            // The identity is retired; its queued runs can never be delivered under any
            // future credential, so leaving them on disk is only clutter that a later
            // reconnect would have to reason about.
            if (fresh.record.currentInstallId) {
                (0, queue_maintenance_1.recordPendingCleanup)({
                    kind: 'install',
                    apiBaseHash: base,
                    pluginId: config.pluginId,
                    installId: fresh.record.currentInstallId,
                });
                (0, queue_maintenance_1.purgeInstallQueues)(base, config.pluginId, fresh.record.currentInstallId);
            }
            return true;
        }
        finally {
            completion();
        }
    }
    finally {
        if (!released)
            release();
    }
}
/** A registration response is only usable if it carries a non-empty token. */
function parseIssuedToken(body) {
    try {
        const token = JSON.parse(body).token;
        return typeof token === 'string' && token.trim() ? token : null;
    }
    catch {
        return null;
    }
}
function safeReason(body) {
    try {
        return JSON.parse(body).reason ?? null;
    }
    catch {
        return null;
    }
}
/**
 * Record a terminal ingest failure so it can be surfaced to the user.
 *
 * CAS'd against the credential that actually made the request: a delayed 401
 * for a superseded token must not clear a newly registered one, nor overwrite
 * `disconnect_pending`. Returns true only when the outcome was applied.
 */
function recordIngestTerminal(config, reason, 
/** Identity of the credential used for the failed request. */
sentWith) {
    const base = (0, telemetry_config_1.apiBaseHash)(config.apiBaseUrl);
    const release = (0, registration_1.acquireLock)(base, config.pluginId);
    if (!release)
        return false;
    try {
        const { record, corrupt } = (0, registration_1.readRecord)(base, config.pluginId);
        if (corrupt || !record)
            return false;
        // Only the still-current credential may be tombstoned by its own failure.
        if (record.state !== 'registered' ||
            record.currentInstallId !== sentWith.installId ||
            record.token !== sentWith.token) {
            return false; // superseded or already moved on — discard
        }
        // `unknown_token` is NOT treated as "re-enrol": a wiped or reset server must
        // never cause a silent new identity. Both require an explicit reconnect.
        (0, registration_1.markTerminal)(base, config.pluginId, record, 'replacement_required', {
            reason,
            at: now(),
            action: 'reconnect',
        });
        return true;
    }
    finally {
        release();
    }
}


/***/ },

/***/ 116
(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.retryPendingDisconnect = retryPendingDisconnect;
const telemetry_config_1 = __webpack_require__(740);
const registration_1 = __webpack_require__(644);
const delivery_auth_1 = __webpack_require__(836);
const queue_maintenance_1 = __webpack_require__(348);
/**
 * Complete a disconnect the server has not acknowledged yet.
 *
 * Called from every collector entry point rather than only SessionStart. The
 * process that requested the disconnect may never run again — the user
 * disconnects and closes the session — and until the DELETE lands the
 * installation is still active server-side while the user believes otherwise.
 *
 * Cheap when there is nothing to do: one file read, no lock, no network.
 * Never throws; a hook must not fail because of telemetry housekeeping.
 */
async function retryPendingDisconnect(pluginRoot) {
    try {
        // Retry any queue removal that previously failed. Cheap when there is
        // nothing pending: one file read.
        (0, queue_maintenance_1.drainPendingCleanups)();
        const config = (0, telemetry_config_1.loadTelemetryConfig)(pluginRoot);
        if (!config)
            return;
        const { record } = (0, registration_1.readRecord)((0, telemetry_config_1.apiBaseHash)(config.apiBaseUrl), config.pluginId);
        if (record?.state !== 'disconnect_pending')
            return;
        await (0, delivery_auth_1.processPendingDisconnect)(config);
    }
    catch {
        // Housekeeping only.
    }
}


/***/ },

/***/ 984
(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.resolvePluginContext = resolvePluginContext;
exports.initialiseOnConsent = initialiseOnConsent;
exports.describeFailure = describeFailure;
const telemetry_config_1 = __webpack_require__(740);
const plugin_identity_1 = __webpack_require__(834);
const registration_1 = __webpack_require__(644);
const crypto_1 = __webpack_require__(982);
function resolvePluginContext(pluginRoot = (0, plugin_identity_1.resolvePluginRoot)()) {
    let config;
    try {
        config = (0, telemetry_config_1.loadTelemetryConfig)(pluginRoot);
    }
    catch (error) {
        // A broken telemetry block precedes any namespace, so there is nowhere to
        // persist it. Surface it and stop rather than guess an endpoint.
        if (error instanceof telemetry_config_1.TelemetryConfigError) {
            return { ok: false, reason: 'invalid_config', detail: error.message };
        }
        throw error;
    }
    if (!config)
        return { ok: false, reason: 'not_configured' };
    const base = (0, telemetry_config_1.apiBaseHash)(config.apiBaseUrl);
    const { record, corrupt } = (0, registration_1.readRecord)(base, config.pluginId);
    if (corrupt)
        return { ok: false, reason: 'corrupt_record' };
    if (!record)
        return { ok: false, reason: 'not_initialised' };
    if (!record.currentInstallId)
        return { ok: false, reason: 'no_identity' };
    return {
        ok: true,
        config,
        identity: { apiBaseHash: base, pluginId: config.pluginId, installId: record.currentInstallId },
    };
}
/**
 * Create this device's identity for a plugin, at the moment consent is granted.
 *
 * Consent is the only thing that may mint an install id: the id is an online
 * identifier, so it must not exist before the user agreed to be identified. No
 * network I/O happens here (ADR 16) — the record is local until the first
 * upload enrols it, which is why being offline at consent time is harmless.
 *
 * Idempotent, and never throws: a plugin without a telemetry block simply has
 * no identity to create, and a failure here must not prevent the user's consent
 * decision from being recorded.
 */
function initialiseOnConsent(pluginRoot = (0, plugin_identity_1.resolvePluginRoot)()) {
    try {
        const config = (0, telemetry_config_1.loadTelemetryConfig)(pluginRoot);
        if (!config)
            return;
        const base = (0, telemetry_config_1.apiBaseHash)(config.apiBaseUrl);
        // `ensureInitialised` assumes the caller holds the cross-session lock, and
        // this path did not. Two projects consenting in separate processes both saw
        // no record and returned different UUIDs; the marker-before-record
        // interleaving could also make one of them write `replacement_required`
        // during what was genuinely a first install.
        const release = (0, registration_1.acquireLock)(base, config.pluginId, { waitMs: 5000 });
        if (!release)
            return; // another process is initialising; it wins, we no-op
        try {
            (0, registration_1.ensureInitialised)(base, config.pluginId, (0, crypto_1.randomUUID)());
        }
        finally {
            release();
        }
    }
    catch (error) {
        process.stderr.write(`[workflowTelemetryAI:consent] could not initialise telemetry identity: ` +
            `${error instanceof Error ? error.message : String(error)}\n`);
    }
}
/** Human-readable form for the one place that must not fail silently: MCP. */
function describeFailure(reason, detail) {
    switch (reason) {
        case 'not_configured':
            return 'This plugin has no telemetry configuration, so there is nothing to record.';
        case 'invalid_config':
            return `The plugin's telemetry configuration is unusable: ${detail ?? 'unknown error'}`;
        case 'not_initialised':
            return 'Telemetry has not been initialised on this device. Consent must be granted first.';
        case 'corrupt_record':
            return 'The local registration record is unreadable. Reconnect this installation.';
        case 'no_identity':
            return 'This installation was superseded and has no current identity. Reconnect it.';
    }
}


/***/ },

/***/ 348
(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.purgeInstallQueues = purgeInstallQueues;
exports.purgeProjectQueues = purgeProjectQueues;
exports.recordPendingCleanup = recordPendingCleanup;
exports.cleanupPendingForProject = cleanupPendingForProject;
exports.drainPendingCleanups = drainPendingCleanups;
const fs_1 = __importDefault(__webpack_require__(896));
const path_1 = __importDefault(__webpack_require__(928));
const config_1 = __webpack_require__(478);
const paths_1 = __webpack_require__(830);
const session_1 = __webpack_require__(214);
const paths_2 = __webpack_require__(830);
/**
 * Cleanup of run queues that must no longer be delivered.
 *
 * Both purges rely on the same property: scanners resolve their queue path
 * **exactly**, from `(apiBaseHash, pluginId, installId)`. A queue that no
 * longer matches the current identity is therefore already unreachable the
 * instant `registration.json` is replaced — that atomic write is the
 * linearization point. Removing the directory afterwards is resumable,
 * idempotent cleanup, not part of the transition.
 *
 * Project withdrawal is different: the identity does *not* change, so the queue
 * stays perfectly reachable and the purge is the only thing stopping delivery.
 * A failed purge there is a correctness problem, not untidiness — which is why
 * outstanding work is recorded durably and delivery for that project is blocked
 * until it completes.
 */
function sessionsRoot() {
    return path_1.default.join((0, config_1.getBaseDir)(), 'claude-sessions');
}
function sessionIds() {
    try {
        return fs_1.default.readdirSync(sessionsRoot(), { withFileTypes: true })
            .filter(e => e.isDirectory())
            .map(e => e.name);
    }
    catch {
        return [];
    }
}
/**
 * Drop every queue belonging to a superseded install, across all sessions.
 * Called after a replacement swap; safe to call repeatedly.
 */
function purgeInstallQueues(apiBaseHash, pluginId, installId) {
    let removed = 0;
    for (const sessionId of sessionIds()) {
        const dir = (0, paths_1.installQueueDir)(sessionId, { apiBaseHash, pluginId, installId });
        if (!fs_1.default.existsSync(dir))
            continue;
        try {
            fs_1.default.rmSync(dir, { recursive: true, force: true });
            removed++;
        }
        catch {
            // Left for the next invocation: cleanup is resumable by construction.
        }
    }
    return removed;
}
/**
 * Drop this plugin's queues for one project only.
 *
 * Consent is per (project, plugin) while the install is device-wide, so
 * withdrawing in one project must not touch runs recorded in another project
 * that is still consenting. Sessions carry their `projectDir`, so the project
 * is what selects which sessions are purged — the install id is not involved.
 */
function purgeProjectQueues(identity, projectDir) {
    const target = (0, paths_2.projectHash)(projectDir);
    let removed = 0;
    for (const sessionId of sessionIds()) {
        let sessionProject;
        try {
            sessionProject = (0, session_1.readSessionContext)(sessionId).projectDir;
        }
        catch {
            continue; // no context: cannot attribute it to a project, so leave it
        }
        if (!sessionProject || (0, paths_2.projectHash)(sessionProject) !== target)
            continue;
        const dir = (0, paths_1.installQueueDir)(sessionId, identity);
        if (!fs_1.default.existsSync(dir))
            continue;
        try {
            fs_1.default.rmSync(dir, { recursive: true, force: true });
            removed++;
        }
        catch {
            // resumable
        }
    }
    return removed;
}
function pendingDir() {
    return path_1.default.join((0, config_1.getBaseDir)(), 'pending-cleanup');
}
function jobId(job) {
    const parts = job.kind === 'project'
        ? [job.kind, job.apiBaseHash, job.pluginId, job.installId, (0, paths_2.projectHash)(job.projectDir)]
        : [job.kind, job.apiBaseHash, job.pluginId, job.installId];
    return parts.join('_');
}
/**
 * Record cleanup that must eventually happen.
 *
 * Returns false when the note could not be persisted. Callers must not report
 * the cleanup as assured in that case — for withdrawal that means reporting
 * failure, because a lost note plus a failed purge means pre-withdrawal
 * telemetry could still be uploaded later.
 */
function recordPendingCleanup(job) {
    try {
        fs_1.default.mkdirSync(pendingDir(), { recursive: true });
        const target = path_1.default.join(pendingDir(), `${jobId(job)}.json`);
        const temporary = `${target}.${process.pid}.tmp`;
        fs_1.default.writeFileSync(temporary, JSON.stringify(job));
        fs_1.default.renameSync(temporary, target);
        return true;
    }
    catch {
        return false;
    }
}
function readJobs() {
    try {
        return fs_1.default.readdirSync(pendingDir())
            .filter(f => f.endsWith('.json'))
            .flatMap(name => {
            const file = path_1.default.join(pendingDir(), name);
            try {
                return [{ file, job: JSON.parse(fs_1.default.readFileSync(file, 'utf8')) }];
            }
            catch {
                return [];
            }
        });
    }
    catch {
        return [];
    }
}
/**
 * True while a project still has telemetry awaiting a purge.
 *
 * Delivery consults this and refuses: until the withdrawal's purge has actually
 * completed, the surviving queue is pre-withdrawal telemetry, and re-granting
 * consent later must not make it uploadable.
 */
function cleanupPendingForProject(identity, projectDir) {
    const target = (0, paths_2.projectHash)(projectDir);
    return readJobs().some(({ job }) => job.kind === 'project' &&
        job.apiBaseHash === identity.apiBaseHash &&
        job.pluginId === identity.pluginId &&
        (0, paths_2.projectHash)(job.projectDir) === target);
}
/**
 * Run every outstanding job, deleting the note only once the work is verifiably
 * done. Called from every collector entry point, so a failure is retried rather
 * than forgotten.
 */
function drainPendingCleanups() {
    for (const { file, job } of readJobs()) {
        const identity = {
            apiBaseHash: job.apiBaseHash,
            pluginId: job.pluginId,
            installId: job.installId,
        };
        if (job.kind === 'project') {
            purgeProjectQueues(identity, job.projectDir);
            if (!projectQueuesRemain(identity, job.projectDir))
                remove(file);
        }
        else {
            purgeInstallQueues(job.apiBaseHash, job.pluginId, job.installId);
            if (!installQueuesRemain(identity))
                remove(file);
        }
    }
}
function remove(file) {
    try {
        fs_1.default.unlinkSync(file);
    }
    catch { /* already gone */ }
}
function installQueuesRemain(identity) {
    return sessionIds().some(sessionId => fs_1.default.existsSync((0, paths_1.installQueueDir)(sessionId, identity)));
}
function projectQueuesRemain(identity, projectDir) {
    const target = (0, paths_2.projectHash)(projectDir);
    return sessionIds().some(sessionId => {
        let sessionProject;
        try {
            sessionProject = (0, session_1.readSessionContext)(sessionId).projectDir;
        }
        catch {
            return false;
        }
        if (!sessionProject || (0, paths_2.projectHash)(sessionProject) !== target)
            return false;
        return fs_1.default.existsSync((0, paths_1.installQueueDir)(sessionId, identity));
    });
}


/***/ },

/***/ 741
(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.startRun = startRun;
exports.startStep = startStep;
exports.endStep = endStep;
exports.endRun = endRun;
exports.recordLegacyEvent = recordLegacyEvent;
const crypto_1 = __importDefault(__webpack_require__(982));
const fs_1 = __importDefault(__webpack_require__(896));
const events_1 = __webpack_require__(508);
const paths_1 = __webpack_require__(830);
const plugin_context_1 = __webpack_require__(984);
const session_1 = __webpack_require__(214);
const transcript_1 = __webpack_require__(210);
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$/;
function assertSafeId(value, label) {
    if (!SAFE_ID.test(value)) {
        throw new Error(`${label} contains unsupported characters or is too long`);
    }
}
/**
 * Resolve the queue this process may write to, once per operation.
 *
 * Deliberately not memoized: the identity can be replaced between calls, and a
 * cached one would keep appending to a queue that has been quarantined.
 * Recording without an identity is refused outright — an unnamespaced run would
 * be indistinguishable from another plugin's and could be delivered under the
 * wrong credential.
 */
function requireIdentity() {
    const context = (0, plugin_context_1.resolvePluginContext)();
    if (!context.ok)
        throw new Error((0, plugin_context_1.describeFailure)(context.reason, context.detail));
    return context.identity;
}
function readEvents(identity, sessionId, runId) {
    const eventsPath = (0, paths_1.runEventsPath)(sessionId, identity, runId);
    if (!fs_1.default.existsSync(eventsPath))
        return [];
    return fs_1.default.readFileSync(eventsPath, 'utf8')
        .split(/\r?\n/)
        .filter(Boolean)
        .flatMap(line => {
        try {
            return [JSON.parse(line)];
        }
        catch {
            return [];
        }
    });
}
function appendEvent(identity, sessionId, runId, event) {
    fs_1.default.mkdirSync((0, paths_1.runDir)(sessionId, identity, runId), { recursive: true });
    fs_1.default.appendFileSync((0, paths_1.runEventsPath)(sessionId, identity, runId), JSON.stringify(event) + '\n');
}
function lastUuid(sessionId) {
    const context = (0, session_1.readSessionContext)(sessionId);
    return (0, transcript_1.getLastAssistantUuid)(context.transcriptPath);
}
function activeStep(events) {
    let active = null;
    for (const event of events) {
        if (event.type === 'stepStart')
            active = event.stepName;
        if (event.type === 'stepEnd' && active === event.stepName)
            active = null;
    }
    return active;
}
function completedResult(runId, alreadyRecorded = false) {
    return {
        accepted: true,
        state: 'run_complete',
        runId,
        delivery: 'awaiting_hook',
        alreadyRecorded,
        nextExpectedTools: [],
        requiredNextAction: {
            instruction: 'Do not send additional telemetry events for this runId.',
            tool: null,
            when: 'immediately',
        },
    };
}
function startRun(sessionId, skillId, requestedRunId) {
    assertSafeId(sessionId, 'sessionId');
    assertSafeId(skillId, 'skillId');
    (0, session_1.readSessionContext)(sessionId);
    const identity = requireIdentity();
    const runId = requestedRunId ?? crypto_1.default.randomUUID();
    assertSafeId(runId, 'runId');
    const existing = readEvents(identity, sessionId, runId);
    if (existing.length > 0) {
        const first = existing[0];
        if (first.type === 'runStart' && first.skillId === skillId) {
            const active = activeStep(existing);
            if (existing.some(e => e.type === 'runEnd'))
                return completedResult(runId, true);
            if (active) {
                return {
                    accepted: true,
                    state: 'step_active',
                    runId,
                    stepName: active,
                    alreadyRecorded: true,
                    nextExpectedTools: ['telemetry_step_end'],
                    requiredNextAction: {
                        instruction: `Reuse this runId. Complete active step "${active}", then call telemetry_step_end with the same runId and stepName.`,
                        tool: 'telemetry_step_end',
                        when: 'after completing the current step',
                    },
                };
            }
            return {
                accepted: true,
                state: 'run_active',
                runId,
                alreadyRecorded: true,
                nextExpectedTools: ['telemetry_step_start'],
                requiredNextAction: {
                    instruction: 'Reuse this runId and continue the existing run state.',
                    tool: 'telemetry_step_start',
                    when: 'before the next skill step',
                },
            };
        }
        throw new Error(`runId ${runId} already exists for a different run`);
    }
    const event = {
        type: 'runStart',
        timestamp: new Date().toISOString(),
        lastUuid: lastUuid(sessionId),
        skillId,
        runId,
    };
    appendEvent(identity, sessionId, runId, event);
    return {
        accepted: true,
        state: 'run_active',
        runId,
        nextExpectedTools: ['telemetry_step_start'],
        requiredNextAction: {
            instruction: 'Retain this runId. Before performing the first skill step, call telemetry_step_start.',
            tool: 'telemetry_step_start',
            when: 'before the first skill step',
        },
    };
}
function startStep(sessionId, runId, stepName) {
    assertSafeId(sessionId, 'sessionId');
    assertSafeId(runId, 'runId');
    assertSafeId(stepName, 'stepName');
    const identity = requireIdentity();
    const events = readEvents(identity, sessionId, runId);
    if (!events.some(e => e.type === 'runStart'))
        throw new Error(`Unknown runId: ${runId}`);
    if (events.some(e => e.type === 'runEnd'))
        throw new events_1.TelemetryStateError(completedResult(runId));
    const active = activeStep(events);
    if (active) {
        const duplicate = active === stepName && events[events.length - 1]?.type === 'stepStart';
        if (duplicate) {
            return {
                accepted: true,
                state: 'step_active',
                runId,
                stepName,
                alreadyRecorded: true,
                nextExpectedTools: ['telemetry_step_end'],
                requiredNextAction: {
                    instruction: `Perform step "${stepName}", then call telemetry_step_end with the same runId and stepName.`,
                    tool: 'telemetry_step_end',
                    when: 'after completing the current step',
                },
            };
        }
        throw new events_1.TelemetryStateError({
            accepted: false,
            state: 'step_active',
            code: 'STEP_ALREADY_ACTIVE',
            runId,
            stepName: active,
            nextExpectedTools: ['telemetry_step_end'],
            requiredNextAction: {
                instruction: `Close active step "${active}" with telemetry_step_end before starting another step.`,
                tool: 'telemetry_step_end',
                when: 'before starting another step',
            },
        });
    }
    const event = {
        type: 'stepStart', timestamp: new Date().toISOString(), lastUuid: lastUuid(sessionId), runId, stepName,
    };
    appendEvent(identity, sessionId, runId, event);
    return {
        accepted: true,
        state: 'step_active',
        runId,
        stepName,
        nextExpectedTools: ['telemetry_step_end'],
        requiredNextAction: {
            instruction: `Perform step "${stepName}" now. When it finishes, call telemetry_step_end with the same runId and stepName.`,
            tool: 'telemetry_step_end',
            when: 'after completing the current step',
        },
    };
}
function endStep(sessionId, runId, stepName) {
    assertSafeId(sessionId, 'sessionId');
    assertSafeId(runId, 'runId');
    assertSafeId(stepName, 'stepName');
    const identity = requireIdentity();
    const events = readEvents(identity, sessionId, runId);
    if (!events.some(e => e.type === 'runStart'))
        throw new Error(`Unknown runId: ${runId}`);
    if (events.some(e => e.type === 'runEnd'))
        throw new events_1.TelemetryStateError(completedResult(runId));
    const active = activeStep(events);
    if (!active) {
        const duplicate = events.some(e => e.type === 'stepEnd' && e.stepName === stepName);
        if (duplicate) {
            return {
                accepted: true,
                state: 'run_active',
                runId,
                stepName,
                alreadyRecorded: true,
                nextExpectedTools: ['telemetry_step_start', 'telemetry_run_end'],
                requiredNextAction: {
                    instruction: 'If another skill step remains, call telemetry_step_start before it. Otherwise call telemetry_run_end.',
                    tool: null,
                    when: 'before continuing the skill',
                },
            };
        }
        throw new Error('No active step to end');
    }
    if (active !== stepName) {
        throw new events_1.TelemetryStateError({
            accepted: false,
            state: 'step_active',
            code: 'STEP_NAME_MISMATCH',
            runId,
            stepName: active,
            nextExpectedTools: ['telemetry_step_end'],
            requiredNextAction: {
                instruction: `End active step "${active}" using the exact same stepName.`,
                tool: 'telemetry_step_end',
                when: 'now',
            },
        });
    }
    const event = {
        type: 'stepEnd', timestamp: new Date().toISOString(), lastUuid: lastUuid(sessionId), runId, stepName,
    };
    appendEvent(identity, sessionId, runId, event);
    return {
        accepted: true,
        state: 'run_active',
        runId,
        stepName,
        nextExpectedTools: ['telemetry_step_start', 'telemetry_run_end'],
        requiredNextAction: {
            instruction: 'If another skill step remains, call telemetry_step_start before beginning it. Otherwise call telemetry_run_end.',
            tool: null,
            when: 'before continuing the skill',
        },
    };
}
function endRun(sessionId, runId, status) {
    assertSafeId(sessionId, 'sessionId');
    assertSafeId(runId, 'runId');
    const identity = requireIdentity();
    const events = readEvents(identity, sessionId, runId);
    if (!events.some(e => e.type === 'runStart'))
        throw new Error(`Unknown runId: ${runId}`);
    if (events.some(e => e.type === 'runEnd'))
        return completedResult(runId, true);
    const event = {
        type: 'runEnd', timestamp: new Date().toISOString(), lastUuid: lastUuid(sessionId), runId, status,
    };
    appendEvent(identity, sessionId, runId, event);
    return completedResult(runId);
}
function recordLegacyEvent(eventType, args) {
    const sessionId = args[args.length - 1];
    if (!sessionId)
        throw new Error('Missing session ID');
    const values = args.slice(0, -1);
    const required = (index, label) => {
        const value = values[index];
        if (!value)
            throw new Error(`Missing ${label}`);
        return value;
    };
    if (eventType === 'runStart')
        return startRun(sessionId, required(0, 'skill ID'), values[1]);
    if (eventType === 'stepStart')
        return startStep(sessionId, required(1, 'run ID'), required(0, 'step name'));
    if (eventType === 'stepEnd')
        return endStep(sessionId, required(1, 'run ID'), required(0, 'step name'));
    if (eventType === 'runEnd')
        return endRun(sessionId, required(0, 'run ID'), values[1] || 'success');
    throw new Error(`Unknown event type: ${eventType}`);
}


/***/ },

/***/ 106
(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.isTerminal = isTerminal;
exports.terminalNotice = terminalNotice;
exports.reconnect = reconnect;
exports.disconnect = disconnect;
exports.withdraw = withdraw;
exports.nextActionFor = nextActionFor;
exports.status = status;
const crypto_1 = __importDefault(__webpack_require__(982));
const plugin_context_1 = __webpack_require__(984);
const registration_1 = __webpack_require__(644);
const queue_maintenance_1 = __webpack_require__(348);
const consent_1 = __webpack_require__(943);
const telemetry_config_1 = __webpack_require__(740);
const delivery_auth_1 = __webpack_require__(836);
const plugin_identity_1 = __webpack_require__(834);
/** States from which nothing will ever be delivered again without user action. */
const TERMINAL = new Set([
    'replacement_required',
    'disconnected',
    'disconnect_pending',
    'configuration_blocked',
]);
function isTerminal(record) {
    return !!record && TERMINAL.has(record.state);
}
/**
 * Human-readable terminal notice, naming the action AND the tool that performs
 * it. A notice that only says "telemetry is disconnected" leaves the user with
 * nowhere to go.
 */
function terminalNotice(record) {
    const reason = record.terminalError?.reason ?? record.state;
    if (record.state === 'configuration_blocked') {
        return `Telemetry is blocked: ${reason}. This needs a plugin update from its author — ` +
            `no local action will fix it.`;
    }
    if (record.state === 'disconnect_pending') {
        // Reconnect is refused from here — the disconnect is still owed an
        // acknowledgement, and it completes on the next collector run.
        return `Telemetry is disconnecting (${reason}). The server has not acknowledged yet; ` +
            `it is retried automatically. Once it completes, reconnect to start collecting again.`;
    }
    return `Telemetry stopped: ${reason}. Call telemetry_reconnect to register this ` +
        `installation again and resume collecting.`;
}
function context(pluginRoot) {
    return (0, plugin_context_1.resolvePluginContext)(pluginRoot ?? (0, plugin_identity_1.resolvePluginRoot)());
}
/**
 * Reconnect: retire the dead identity and adopt a fresh one.
 *
 * Permitted only from `replacement_required` or `disconnected` — from any other
 * state this would abandon a live token, orphaning an installation server-side
 * that nothing can ever revoke. Requires consent, because reconnecting resumes
 * collection: it is rejected outright rather than deferred, since a deferred
 * reconnect would need its own durable request flag.
 */
function reconnect(pluginRoot, consentCtx = {}) {
    const config = (0, telemetry_config_1.loadTelemetryConfig)(pluginRoot ?? (0, plugin_identity_1.resolvePluginRoot)());
    if (!config) {
        return { ok: false, code: 'NOT_CONFIGURED', message: 'This plugin has no telemetry configuration.' };
    }
    if ((0, consent_1.getConsent)(consentCtx) !== 'allow') {
        return {
            ok: false,
            code: 'CONSENT_REQUIRED',
            message: 'Telemetry consent is not granted for this project. Grant consent, then reconnect.',
        };
    }
    const base = (0, telemetry_config_1.apiBaseHash)(config.apiBaseUrl);
    const release = (0, registration_1.acquireLock)(base, config.pluginId);
    if (!release) {
        return { ok: false, code: 'BUSY', message: 'Another telemetry operation is in progress. Try again.' };
    }
    try {
        const { record, corrupt } = (0, registration_1.readRecord)(base, config.pluginId);
        // Status advertises reconnect for a corrupt or missing-but-previously-
        // initialised record, so reconnect has to be able to act on one. Normalise
        // it here, under the lock, into the state that describes it — the identity
        // is unusable and a replacement is required — and then proceed.
        let current = record;
        if (corrupt || (!record && (0, registration_1.wasInitialised)(base, config.pluginId))) {
            current = (0, registration_1.ensureInitialised)(base, config.pluginId, crypto_1.default.randomUUID());
        }
        if (!current) {
            return { ok: false, code: 'NO_RECORD', message: 'No local telemetry state to reconnect.' };
        }
        if (!(0, registration_1.canReconnect)(current)) {
            return {
                ok: false,
                code: 'NOT_RECONNECTABLE',
                message: `Telemetry is ${current.state}; reconnect applies only after a disconnect or a failed installation.`,
            };
        }
        const previous = current.currentInstallId;
        (0, registration_1.beginReplacement)(base, config.pluginId, current, crypto_1.default.randomUUID());
        // Post-commit cleanup. The record swap above is the linearization point —
        // scanners resolve queues exactly, so the old ones are already unreachable.
        // Recorded durably first: a failed removal must be retried, not forgotten.
        if (previous) {
            (0, queue_maintenance_1.recordPendingCleanup)({ kind: 'install', apiBaseHash: base, pluginId: config.pluginId, installId: previous });
            (0, queue_maintenance_1.purgeInstallQueues)(base, config.pluginId, previous);
        }
        return {
            ok: true,
            code: 'RECONNECTED',
            message: 'Telemetry reconnected. This installation registers again on its next upload.',
        };
    }
    finally {
        release();
    }
}
/**
 * Disconnect this device. Local only: the delivery layer performs and retries
 * `DELETE /register`, so this succeeds offline and completes later.
 */
function disconnect(pluginRoot) {
    const ctx = context(pluginRoot);
    if (!ctx.ok) {
        return { ok: false, code: 'NOT_CONFIGURED', message: 'This plugin has no telemetry configuration.' };
    }
    const base = ctx.identity.apiBaseHash;
    const release = (0, registration_1.acquireLock)(base, ctx.config.pluginId);
    if (!release) {
        return { ok: false, code: 'BUSY', message: 'Another telemetry operation is in progress. Try again.' };
    }
    try {
        const { record, corrupt } = (0, registration_1.readRecord)(base, ctx.config.pluginId);
        if (corrupt || !record) {
            return { ok: false, code: 'NO_RECORD', message: 'No local telemetry state to disconnect.' };
        }
        if (record.state === 'disconnected' || record.state === 'disconnect_pending') {
            return { ok: true, code: 'ALREADY_DISCONNECTED', message: 'This installation is already disconnected.' };
        }
        if (record.state === 'registering') {
            // The record carries no token yet, so a disconnect here would take the
            // tokenless branch and report success — while the in-flight POST may
            // still commit a credential the reported disconnect can never delete.
            return {
                ok: false,
                code: 'REGISTRATION_IN_FLIGHT',
                message: 'This installation is still registering. Try disconnecting again in a moment, ' +
                    'once registration has finished.',
            };
        }
        if (record.currentInstallId) {
            // Applies to the tokenless branch too, which never purged at all.
            (0, queue_maintenance_1.recordPendingCleanup)({
                kind: 'install',
                apiBaseHash: base,
                pluginId: ctx.config.pluginId,
                installId: record.currentInstallId,
            });
        }
        (0, registration_1.beginDisconnect)(base, ctx.config.pluginId, record);
        return {
            ok: true,
            code: 'DISCONNECTING',
            message: 'Telemetry stopped. The server is notified on the next collector run, and retried until it acknowledges.',
        };
    }
    finally {
        release();
    }
}
/**
 * Withdraw consent for THIS project (Art. 7(3)).
 *
 * Deliberately narrower than disconnect: the install token is device-wide and
 * may still be serving another project that is still consenting, so no server
 * request is made and registration is untouched. Only this project's queued
 * runs are purged.
 */
function withdraw(pluginRoot, consentCtx = {}) {
    if (!(0, consent_1.withdrawConsent)(consentCtx)) {
        return {
            ok: false,
            code: 'WITHDRAW_FAILED',
            message: 'Could not record the withdrawal — telemetry state was busy. Nothing was changed; ' +
                'consent is still in effect. Try again.',
        };
    }
    const ctx = context(pluginRoot);
    let purged = 0;
    if (ctx.ok && consentCtx.projectDir) {
        // Record the purge as durable work FIRST. Unlike a replacement, withdrawal
        // does not change the identity, so the queue stays perfectly reachable and
        // the purge is the only thing preventing delivery. If the note cannot be
        // written and the purge then fails, that telemetry could be uploaded later
        // — so an unrecordable job is reported as a failure, not glossed over.
        const noted = (0, queue_maintenance_1.recordPendingCleanup)({
            kind: 'project',
            apiBaseHash: ctx.identity.apiBaseHash,
            pluginId: ctx.identity.pluginId,
            installId: ctx.identity.installId,
            projectDir: consentCtx.projectDir,
        });
        purged = (0, queue_maintenance_1.purgeProjectQueues)(ctx.identity, consentCtx.projectDir);
        if (!noted && (0, queue_maintenance_1.cleanupPendingForProject)(ctx.identity, consentCtx.projectDir)) {
            return {
                ok: false,
                code: 'WITHDRAW_INCOMPLETE',
                message: 'Consent was withdrawn, but this project\'s queued telemetry could not be removed ' +
                    'and the retry could not be recorded. Remove the collector state directory manually ' +
                    'to be certain nothing is delivered.',
            };
        }
    }
    return {
        ok: true,
        code: 'WITHDRAWN',
        message: `Telemetry consent withdrawn for this project. ` +
            `${purged > 0 ? `${purged} queued session(s) discarded. ` : ''}` +
            `Data already delivered is unaffected; disconnect the installation to stop it device-wide.`,
    };
}
/**
 * The action that is actually valid for a state — not simply "reconnect".
 *
 * `disconnect_pending` and `configuration_blocked` are both terminal, but
 * `canReconnect` rejects both: the first is still owed a server acknowledgement,
 * and the second needs a corrected package. Prescribing a tool that will refuse
 * teaches the model to retry something guaranteed to fail.
 */
function nextActionFor(record, opts = {}) {
    // Reconnect resumes collection, so it is refused without consent. Offering it
    // to a user who declined or withdrew sends them to a tool that will say no.
    if (opts.consent !== undefined && opts.consent !== 'allow') {
        return opts.consent === 'decline' || opts.consent === 'withdrawn'
            ? 'telemetry_set_consent'
            : null;
    }
    // A corrupt record has no readable state, but reconnect can now normalise and
    // replace it — so it is genuinely actionable.
    if (opts.corrupt)
        return 'telemetry_reconnect';
    if (!record || !isTerminal(record))
        return null;
    return (0, registration_1.canReconnect)(record) ? 'telemetry_reconnect' : null;
}
function status(pluginRoot, consentCtx = {}) {
    const ctx = context(pluginRoot);
    if (!ctx.ok && ctx.reason === 'not_configured') {
        return {
            configured: false, state: null, installId: null, consent: null, terminalError: null,
            needsAction: false, message: 'This plugin does not collect telemetry.',
        };
    }
    // A broken or unreadable config is actionable information, not a reason to
    // report "uninitialised" or to throw out of a status command.
    if (!ctx.ok && (ctx.reason === 'invalid_config' || ctx.reason === 'corrupt_record')) {
        return {
            configured: true, state: ctx.reason, installId: null, consent: (0, consent_1.getConsent)(consentCtx),
            terminalError: null, needsAction: true,
            // Only a corrupt record is locally fixable; a bad config needs the author.
            recoverable: ctx.reason === 'corrupt_record',
            message: (0, plugin_context_1.describeFailure)(ctx.reason, ctx.detail),
        };
    }
    const config = (0, telemetry_config_1.loadTelemetryConfig)(pluginRoot ?? (0, plugin_identity_1.resolvePluginRoot)());
    const base = config ? (0, telemetry_config_1.apiBaseHash)(config.apiBaseUrl) : null;
    // Reconcile BEFORE reading: after the author ships the prescribed fix, status
    // would otherwise keep telling the user to update an already-updated package
    // until some other boundary happened to run.
    if (config)
        (0, delivery_auth_1.reconcileConfigurationBlock)(config);
    let record = base && config ? (0, registration_1.readRecord)(base, config.pluginId).record : null;
    const consent = (0, consent_1.getConsent)(consentCtx);
    // A missing record for a plugin that WAS initialised is not 'uninitialised':
    // a token may still be active server-side. Reporting it as harmless left the
    // user with no action, and only a later boundary would surface the truth.
    if (!record && base && config && (0, registration_1.wasInitialised)(base, config.pluginId)) {
        const lock = (0, registration_1.acquireLock)(base, config.pluginId, { waitMs: 2000 });
        if (lock) {
            try {
                record = (0, registration_1.ensureInitialised)(base, config.pluginId, crypto_1.default.randomUUID());
            }
            finally {
                lock();
            }
        }
    }
    return {
        configured: true,
        state: record?.state ?? null,
        installId: record?.currentInstallId ?? null,
        consent,
        terminalError: record?.terminalError ?? null,
        needsAction: isTerminal(record),
        message: record
            ? isTerminal(record)
                ? terminalNotice(record)
                : `Telemetry is ${record.state}; consent for this project is ${consent ?? 'not granted'}.`
            : 'Telemetry has not been initialised on this device yet.',
    };
}


/***/ },

/***/ 644
(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.LEASE_MS = void 0;
exports.configFingerprint = configFingerprint;
exports.readRecord = readRecord;
exports.writeRecord = writeRecord;
exports.ensureInitialised = ensureInitialised;
exports.wasInitialised = wasInitialised;
exports.leaseIsLive = leaseIsLive;
exports.beginRegistering = beginRegistering;
exports.completeAttempt = completeAttempt;
exports.reclaimStaleLease = reclaimStaleLease;
exports.beginReplacement = beginReplacement;
exports.beginDisconnect = beginDisconnect;
exports.markDisconnected = markDisconnected;
exports.canReconnect = canReconnect;
exports.markTerminal = markTerminal;
exports.acquireLock = acquireLock;
exports.blankRecord = blank;
const fs_1 = __importDefault(__webpack_require__(896));
const path_1 = __importDefault(__webpack_require__(928));
const crypto_1 = __importDefault(__webpack_require__(982));
const paths_1 = __webpack_require__(830);
const file_lock_1 = __webpack_require__(44);
const LEASE_MS = 2 * 60 * 1000;
exports.LEASE_MS = LEASE_MS;
function now() {
    return new Date().toISOString();
}
function blank() {
    return {
        currentInstallId: null,
        replacesInstallId: null,
        state: 'never_registered',
        token: null,
        revision: 0,
        operation: null,
        lease: null,
        terminalError: null,
        configFingerprint: null,
        blockedFrom: null,
        createdAt: now(),
        updatedAt: now(),
    };
}
/** Fingerprint of the config fields that, if changed, should unblock. */
function configFingerprint(parts) {
    return crypto_1.default.createHash('sha256').update(JSON.stringify(parts)).digest('hex').slice(0, 16);
}
/**
 * Read the record.
 *
 * Returns null when absent. A record that exists but is unreadable/corrupt is
 * reported as corrupt so the caller can fail closed — it must never look like
 * `never_registered`, which would silently re-enrol.
 */
function readRecord(apiBaseHash, pluginId) {
    const p = (0, paths_1.registrationPath)(apiBaseHash, pluginId);
    if (!fs_1.default.existsSync(p))
        return { record: null, corrupt: false };
    try {
        const parsed = JSON.parse(fs_1.default.readFileSync(p, 'utf8'));
        return isValidRecord(parsed)
            ? { record: parsed, corrupt: false }
            : { record: null, corrupt: true };
    }
    catch {
        return { record: null, corrupt: true };
    }
}
const STATES = [
    'never_registered',
    'registering',
    'registered',
    'replacement_required',
    'disconnect_pending',
    'disconnected',
    'configuration_blocked',
];
/**
 * Validate the whole record, not merely that `state` is a string.
 *
 * Syntactically valid corruption such as `{"state":"never_registered"}` would
 * otherwise be accepted, mint a fresh UUID and silently enrol; an unknown state
 * would fall off the end of the delivery switch; and `registered` could carry
 * no install id or token.
 */
function isValidRecord(r) {
    if (!r || typeof r !== 'object')
        return false;
    const rec = r;
    if (!STATES.includes(rec.state))
        return false;
    if (typeof rec.revision !== 'number' || !Number.isInteger(rec.revision) || rec.revision < 0)
        return false;
    if (typeof rec.createdAt !== 'string' || typeof rec.updatedAt !== 'string')
        return false;
    if (rec.currentInstallId !== null && typeof rec.currentInstallId !== 'string')
        return false;
    if (rec.replacesInstallId !== null && typeof rec.replacesInstallId !== 'string')
        return false;
    if (rec.token !== null && typeof rec.token !== 'string')
        return false;
    // State-specific invariants.
    const state = rec.state;
    if (state === 'registered' && (!rec.token || !rec.currentInstallId))
        return false;
    if (state === 'registering' && (!rec.operation || !rec.lease))
        return false;
    if (state === 'never_registered' && !rec.currentInstallId)
        return false;
    return true;
}
/** Atomic replace — the linearization point for every state transition. */
function writeRecord(apiBaseHash, pluginId, record) {
    const dir = (0, paths_1.pluginStateDir)(apiBaseHash, pluginId);
    fs_1.default.mkdirSync(dir, { recursive: true });
    const next = { ...record, revision: record.revision + 1, updatedAt: now() };
    const target = (0, paths_1.registrationPath)(apiBaseHash, pluginId);
    const tmp = `${target}.${process.pid}.tmp`;
    fs_1.default.writeFileSync(tmp, JSON.stringify(next, null, 2), { mode: 0o600 });
    fs_1.default.renameSync(tmp, target);
    return next;
}
/**
 * Establish `never_registered` durably when consent first becomes allowed.
 *
 * Without this a deleted record is indistinguishable from a genuinely new
 * install, so a wiped file would silently re-enrol. Uses create-if-absent under
 * the caller's lock, so concurrent first consent in two projects yields exactly
 * one identity.
 */
function ensureInitialised(apiBaseHash, pluginId, installId) {
    const { record, corrupt } = readRecord(apiBaseHash, pluginId);
    if (record && !corrupt)
        return record;
    // A record that is corrupt — or absent *after this plugin was already
    // initialised* — must fail closed. Only a genuinely first-ever initialisation
    // may create `never_registered`; otherwise deleting registration.json would
    // silently mint a new identity while a token may still exist server-side.
    if (corrupt || wasInitialised(apiBaseHash, pluginId)) {
        return writeRecord(apiBaseHash, pluginId, {
            ...blank(),
            currentInstallId: null,
            state: 'replacement_required',
            terminalError: {
                reason: corrupt ? 'corrupt_record' : 'missing_record',
                at: now(),
                action: 'reconnect',
            },
        });
    }
    markInitialised(apiBaseHash, pluginId);
    return writeRecord(apiBaseHash, pluginId, {
        ...blank(),
        currentInstallId: installId,
        state: 'never_registered',
    });
}
/**
 * A tiny durable marker, written once when a plugin is first initialised and
 * never removed. It is what distinguishes "never installed here" from "the
 * registration record was deleted", which the record itself cannot tell us.
 */
function wasInitialised(apiBaseHash, pluginId) {
    return fs_1.default.existsSync((0, paths_1.initialisedMarkerPath)(apiBaseHash, pluginId));
}
function markInitialised(apiBaseHash, pluginId) {
    const marker = (0, paths_1.initialisedMarkerPath)(apiBaseHash, pluginId);
    fs_1.default.mkdirSync(path_1.default.dirname(marker), { recursive: true });
    fs_1.default.writeFileSync(marker, now(), { mode: 0o600 });
}
function leaseIsLive(record) {
    if (!record.lease)
        return false;
    return new Date(record.lease.expiresAt).getTime() > Date.now();
}
/** Begin an attempt, persisting `registering` BEFORE any network I/O. */
function beginRegistering(apiBaseHash, pluginId, record) {
    const operationId = crypto_1.default.randomUUID();
    const owner = `${process.pid}:${crypto_1.default.randomUUID()}`;
    const next = writeRecord(apiBaseHash, pluginId, {
        ...record,
        state: 'registering',
        operation: { id: operationId, kind: 'register', startedAt: now() },
        lease: { owner, expiresAt: new Date(Date.now() + LEASE_MS).toISOString() },
    });
    return { record: next, operationId, owner };
}
/**
 * Apply an attempt's outcome under an owner-CAS.
 *
 * A stale process's delayed response can arrive after another reclaimed the
 * lease; applying it would overwrite newer state. This holds for FAILURES as
 * much as successes — a late 401 must not clobber a since-replaced identity.
 * Returns null when the outcome was discarded.
 */
function completeAttempt(apiBaseHash, pluginId, expect, apply) {
    const { record, corrupt } = readRecord(apiBaseHash, pluginId);
    if (corrupt || !record)
        return null;
    if (record.state !== 'registering' ||
        record.operation?.id !== expect.operationId ||
        record.lease?.owner !== expect.owner ||
        record.revision !== expect.revision) {
        return null; // superseded — discard rather than overwrite
    }
    return writeRecord(apiBaseHash, pluginId, {
        ...apply(record),
        operation: null,
        lease: null,
    });
}
/**
 * Resolve a `registering` record whose owner is gone.
 *
 * A crash after the request was sent is indistinguishable from a lost response,
 * so the identity is treated as ambiguous and requires replacement — never
 * `never_registered`, which would re-enrol against a token that may exist.
 */
function reclaimStaleLease(apiBaseHash, pluginId, observed) {
    const release = acquireLock(apiBaseHash, pluginId);
    if (!release)
        return null; // someone else is mid-operation; let them finish
    try {
        // Re-read under the lock and re-check EVERYTHING. The original owner can
        // store its 201 between the stale read and this write; overwriting then
        // would replace `registered` with `replacement_required` and destroy the
        // only copy of the raw token.
        const { record, corrupt } = readRecord(apiBaseHash, pluginId);
        if (corrupt || !record)
            return null;
        if (record.state !== 'registering' ||
            record.operation?.id !== observed.operation?.id ||
            record.lease?.owner !== observed.lease?.owner ||
            record.revision !== observed.revision ||
            leaseIsLive(record)) {
            return null; // no longer the same expired attempt
        }
        return writeRecord(apiBaseHash, pluginId, {
            ...record,
            state: 'replacement_required',
            token: null,
            operation: null,
            lease: null,
            terminalError: { reason: 'ambiguous_registration', at: now(), action: 'reconnect' },
        });
    }
    finally {
        release();
    }
}
/**
 * Swap in a replacement identity: new install id, previous one remembered for
 * the eventual `/register`, back to `never_registered`.
 *
 * The atomic write of this record is the linearization point — quarantining the
 * previous queue afterwards is idempotent, resumable cleanup.
 */
function beginReplacement(apiBaseHash, pluginId, record, newInstallId) {
    return writeRecord(apiBaseHash, pluginId, {
        ...record,
        replacesInstallId: record.currentInstallId,
        currentInstallId: newInstallId,
        state: 'never_registered',
        token: null,
        terminalError: null,
    });
}
/**
 * Ask for this device to be disconnected. **Local only** (ADR 16): the delivery
 * layer performs and retries `DELETE /register`.
 *
 * The token is kept, because the DELETE has to authenticate with it. It is
 * cleared only once the server acknowledges, in `markDisconnected`.
 */
function beginDisconnect(apiBaseHash, pluginId, record) {
    return writeRecord(apiBaseHash, pluginId, {
        ...record,
        state: 'disconnect_pending',
        operation: null,
        lease: null,
        terminalError: {
            reason: 'disconnect_requested',
            at: now(),
            action: 'reconnect',
        },
    });
}
/** The server acknowledged the disconnect. Only now is the credential dropped. */
function markDisconnected(apiBaseHash, pluginId, record) {
    return writeRecord(apiBaseHash, pluginId, {
        ...record,
        state: 'disconnected',
        token: null,
        terminalError: { reason: 'disconnected', at: now(), action: 'reconnect' },
    });
}
/** States a replacement may be started from. Anything else would abandon a live token. */
function canReconnect(record) {
    return record.state === 'replacement_required' || record.state === 'disconnected';
}
function markTerminal(apiBaseHash, pluginId, record, state, error) {
    return writeRecord(apiBaseHash, pluginId, {
        ...record,
        state,
        token: state === 'replacement_required' ? null : record.token,
        operation: null,
        lease: null,
        terminalError: error,
    });
}
/**
 * Acquire the cross-session registration lock. Returns null if already held.
 *
 * The lock carries an owner token and is released **only** if that token still
 * matches. Otherwise: B takes over A's expired lock, A later releases
 * unconditionally and deletes B's lock, and C enters concurrently with B. That
 * is reachable in practice because the HTTP timeout is configurable beyond the
 * lease.
 */
function acquireLock(apiBaseHash, pluginId, opts = {}) {
    fs_1.default.mkdirSync((0, paths_1.pluginStateDir)(apiBaseHash, pluginId), { recursive: true });
    return (0, file_lock_1.acquireFileLock)((0, paths_1.registrationLockPath)(apiBaseHash, pluginId), {
        leaseMs: LEASE_MS,
        waitMs: opts.waitMs,
    });
}


/***/ },

/***/ 478
(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.getBaseDir = getBaseDir;
exports.getSessionDir = getSessionDir;
exports.getContextPath = getContextPath;
exports.getEventsPath = getEventsPath;
exports.getCurrentSessionIdPath = getCurrentSessionIdPath;
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


/***/ },

/***/ 44
(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.DEFAULT_LEASE_MS = void 0;
exports.acquireFileLock = acquireFileLock;
const fs_1 = __importDefault(__webpack_require__(896));
const path_1 = __importDefault(__webpack_require__(928));
const crypto_1 = __importDefault(__webpack_require__(982));
/**
 * A cross-process advisory lock.
 *
 * **The canonical lock file is never vacated.** An earlier version renamed it
 * aside to inspect it atomically; that left the path briefly empty, so a
 * contender could create it and enter while the holder was still inside its
 * critical section — and the restore then silently overwrote the newcomer's
 * lock. Acquisition is the only thing that creates the path, and it is
 * `O_EXCL`, so at most one process can hold it.
 *
 * That leaves exactly one dangerous operation: *removing* the file. Two callers
 * want to — a holder releasing, and a contender reclaiming an abandoned lock —
 * and both must validate before removing. Read-then-unlink is not atomic, so
 * **both go through `withMutation`**, a second short-lived `O_EXCL` lock that
 * serializes every removal and re-validates inside it. Nothing blocks while
 * holding that mutex: it guards two file operations and no I/O, so its own
 * abandonment window is bounded by process death alone.
 */
exports.DEFAULT_LEASE_MS = 2 * 60 * 1000;
/** The mutation mutex guards two file ops; anything older than this is debris. */
const MUTATION_LEASE_MS = 5000;
/** Acquire, or return null if it stays held for the whole wait window. */
function acquireFileLock(lockPath, { leaseMs = exports.DEFAULT_LEASE_MS, waitMs = 0 } = {}) {
    fs_1.default.mkdirSync(path_1.default.dirname(lockPath), { recursive: true });
    const owner = `${process.pid}:${crypto_1.default.randomUUID()}`;
    const deadline = Date.now() + waitMs;
    for (;;) {
        if (create(lockPath, owner))
            return () => releaseOwn(lockPath, owner);
        // Occupied. Check cheaply BEFORE reaching for the mutation mutex: a live
        // holder is the normal case, and having every waiter contend for the mutex
        // on every attempt starves the holder's own release — which needs it — and
        // stalls everyone.
        if (looksAbandoned(lockPath, leaseMs) && reclaimIfAbandoned(lockPath, leaseMs))
            continue;
        if (Date.now() >= deadline)
            return null;
        sleepBriefly();
    }
}
function looksAbandoned(lockPath, leaseMs) {
    try {
        return Date.now() - fs_1.default.statSync(lockPath).mtimeMs >= leaseMs;
    }
    catch {
        return true; // vanished between attempts; treat as free and retry creation
    }
}
function create(lockPath, owner) {
    try {
        const fd = fs_1.default.openSync(lockPath, 'wx');
        fs_1.default.writeSync(fd, owner);
        fs_1.default.closeSync(fd);
        return true;
    }
    catch {
        return false;
    }
}
/**
 * Serialize a removal decision about the canonical lock.
 *
 * Both callers re-read the file *inside* this mutex, so neither can act on a
 * value that changed after it looked. Returns false when the mutex itself is
 * contended — the caller simply retries rather than proceeding unguarded.
 */
function withMutation(lockPath, fn) {
    const mutexPath = `${lockPath}.mutation`;
    const token = `${process.pid}:${crypto_1.default.randomUUID()}`;
    // Clear only debris: nothing ever blocks while holding this.
    try {
        if (Date.now() - fs_1.default.statSync(mutexPath).mtimeMs > MUTATION_LEASE_MS)
            fs_1.default.unlinkSync(mutexPath);
    }
    catch { /* not present */ }
    if (!create(mutexPath, token))
        return false;
    try {
        return fn();
    }
    finally {
        try {
            if (fs_1.default.readFileSync(mutexPath, 'utf8') === token)
                fs_1.default.unlinkSync(mutexPath);
        }
        catch { /* already cleared as debris */ }
    }
}
/** Remove the lock only if it is still the abandoned one we observed. */
function reclaimIfAbandoned(lockPath, leaseMs) {
    return withMutation(lockPath, () => {
        let stat;
        try {
            stat = fs_1.default.statSync(lockPath);
        }
        catch {
            return true; // vanished; retry acquisition
        }
        if (Date.now() - stat.mtimeMs < leaseMs)
            return false; // a live holder
        try {
            fs_1.default.unlinkSync(lockPath);
        }
        catch { /* someone else got there */ }
        return true;
    });
}
/**
 * Release only what we still own.
 *
 * If the lease expired and someone reclaimed it, the file now belongs to
 * another holder and must be left alone — deleting it would admit a second
 * owner alongside them.
 */
function releaseOwn(lockPath, owner) {
    // Release must not give up: abandoning it here would leave the lock held for
    // the rest of its lease, blocking everyone for minutes over a few
    // milliseconds of mutex contention.
    const deadline = Date.now() + 5000;
    for (;;) {
        const done = withMutation(lockPath, () => {
            try {
                if (fs_1.default.readFileSync(lockPath, 'utf8') === owner)
                    fs_1.default.unlinkSync(lockPath);
            }
            catch { /* already gone */ }
            return true;
        });
        if (done || Date.now() >= deadline)
            return;
        sleepBriefly();
    }
}
/**
 * Block for a few milliseconds without a timer.
 *
 * These call sites are synchronous (hooks and MCP handlers that must complete
 * before returning), so there is no event loop to yield to. `Atomics.wait` is
 * the only way to sleep without spinning the CPU.
 */
function sleepBriefly() {
    const shared = new SharedArrayBuffer(4);
    Atomics.wait(new Int32Array(shared), 0, 0, 15);
}


/***/ },

/***/ 260
(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.postJson = postJson;
exports.deleteJson = deleteJson;
const http_1 = __importDefault(__webpack_require__(611));
const https_1 = __importDefault(__webpack_require__(692));
function postJson(url, body, extraHeaders = {}) {
    return sendJson('POST', url, body, extraHeaders);
}
function deleteJson(url, extraHeaders = {}) {
    return sendJson('DELETE', url, {}, extraHeaders);
}
function sendJson(method, url, body, extraHeaders = {}) {
    return new Promise((resolve, reject) => {
        // Single-settlement: several failure paths can fire for one request, and a
        // late settle must not resurrect a promise the caller already handled.
        let settled = false;
        const settle = (err, value) => {
            if (settled)
                return;
            settled = true;
            if (err)
                reject(err);
            else
                resolve(value);
        };
        const payload = JSON.stringify(body);
        const parsed = new URL(url);
        const lib = parsed.protocol === 'https:' ? https_1.default : http_1.default;
        const req = lib.request({
            hostname: parsed.hostname,
            port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
            path: parsed.pathname + (parsed.search || ''),
            method,
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload),
                ...extraHeaders
            }
        }, res => {
            let resp = '';
            res.on('data', c => resp += c);
            res.on('end', () => settle(null, { status: res.statusCode || 200, body: resp }));
            // A server that sends headers (or a partial body) and then drops the
            // socket would otherwise leave this promise unsettled forever, holding
            // the caller's registration lock past any lease.
            res.on('aborted', () => settle(new Error('Response aborted by server')));
            res.on('error', err => settle(err));
        });
        req.on('error', err => settle(err));
        const timeoutMs = Number(process.env.WORKFLOW_TELEMETRY_HTTP_TIMEOUT_MS || 5000);
        req.setTimeout(Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 5000, () => {
            req.destroy(new Error('Telemetry upload timed out'));
        });
        req.write(payload);
        req.end();
    });
}


/***/ },

/***/ 583
(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

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
    if (!runStartEvent) {
        return { transcriptData: [], events };
    }
    const startUuid = runStartEvent.lastUuid;
    const latestAssistantUuid = [...entries].reverse().find(entry => entry.type === 'assistant' && entry.requestId && entry.uuid)?.uuid ?? null;
    const endUuid = runEndEvent?.lastUuid ?? latestAssistantUuid;
    if (!endUuid)
        return { transcriptData: [], events };
    // If runStart fired before any assistant message (lastUuid=null), capture
    // from the beginning of the transcript. Otherwise wait until we hit startUuid.
    const transcriptData = [];
    let capturing = startUuid === null;
    for (const entry of entries) {
        if (entry.uuid === startUuid)
            capturing = true;
        if (capturing)
            transcriptData.push(entry);
        if (entry.uuid === endUuid)
            break;
    }
    return { transcriptData, events };
}


/***/ },

/***/ 830
(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.projectHash = projectHash;
exports.pluginStateDir = pluginStateDir;
exports.registrationPath = registrationPath;
exports.registrationLockPath = registrationLockPath;
exports.initialisedMarkerPath = initialisedMarkerPath;
exports.consentPath = consentPath;
exports.installQueueDir = installQueueDir;
exports.runDir = runDir;
exports.runEventsPath = runEventsPath;
exports.runTranscriptSnapshotPath = runTranscriptSnapshotPath;
const path_1 = __importDefault(__webpack_require__(928));
const crypto_1 = __importDefault(__webpack_require__(982));
const config_1 = __webpack_require__(478);
/**
 * Local layout, namespaced by API base **and** plugin.
 *
 *   servers/<apiBaseHash>/plugins/<pluginId>/
 *     registration.json                     # authoritative: current install + state + token
 *     projects/<projectHash>/consent.json   # per project
 *
 *   claude-sessions/<sessionId>/<apiBaseHash>/<pluginId>/<installId>/<runId>/
 *
 * The API base is part of every path, not just the credential key: two configs
 * sharing a cloned pluginId but pointing at different bases (dev vs production)
 * would otherwise scan and deliver each other's runs. `installId` is in the run
 * path so a replacement install cannot inherit — and silently reattribute — the
 * previous identity's queue.
 */
function projectHash(projectDir) {
    const resolved = path_1.default.resolve(projectDir);
    const canonical = process.platform === 'win32' ? resolved.toLowerCase() : resolved;
    return crypto_1.default.createHash('sha256').update(canonical).digest('hex').slice(0, 16);
}
function pluginStateDir(apiBaseHash, pluginId) {
    return path_1.default.join((0, config_1.getBaseDir)(), 'servers', apiBaseHash, 'plugins', pluginId);
}
/** The authoritative registration record: current install + state + token. */
function registrationPath(apiBaseHash, pluginId) {
    return path_1.default.join(pluginStateDir(apiBaseHash, pluginId), 'registration.json');
}
/** Cross-session lock guarding registration for (apiBase, plugin). */
function registrationLockPath(apiBaseHash, pluginId) {
    return path_1.default.join(pluginStateDir(apiBaseHash, pluginId), 'registration.lock');
}
/**
 * Durable evidence that this plugin was initialised on this device.
 *
 * Deliberately NOT under `pluginStateDir`. Kept there, removing the plugin
 * state directory destroys the record *and* the evidence it ever existed, so
 * the next boundary treats the device as first-ever and silently mints a new
 * identity — orphaning a token still active on the server. Stored beside
 * `consent.json` instead, so the evidence shares a failure domain with consent:
 * anything that loses both genuinely is a new device.
 */
function initialisedMarkerPath(apiBaseHash, pluginId) {
    return path_1.default.join((0, config_1.getBaseDir)(), 'installed', `${apiBaseHash}.${pluginId}.initialised`);
}
/** Consent is per project, so it sits deeper than the device-wide registration. */
function consentPath(apiBaseHash, pluginId, projectDir) {
    return path_1.default.join(pluginStateDir(apiBaseHash, pluginId), 'projects', projectHash(projectDir), 'consent.json');
}
/** Run queue for one installation within one session. */
function installQueueDir(sessionId, identity) {
    return path_1.default.join((0, config_1.getBaseDir)(), 'claude-sessions', sessionId, identity.apiBaseHash, identity.pluginId, identity.installId);
}
function runDir(sessionId, identity, runId) {
    return path_1.default.join(installQueueDir(sessionId, identity), runId);
}
function runEventsPath(sessionId, identity, runId) {
    return path_1.default.join(runDir(sessionId, identity, runId), 'events.jsonl');
}
function runTranscriptSnapshotPath(sessionId, identity, runId) {
    return path_1.default.join(runDir(sessionId, identity, runId), 'transcript.snapshot.jsonl');
}


/***/ },

/***/ 834
(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.resolvePluginRoot = resolvePluginRoot;
exports.derivePluginName = derivePluginName;
exports.pluginIdentity = pluginIdentity;
exports.normalizeManifestName = normalizeManifestName;
const fs_1 = __importDefault(__webpack_require__(896));
const path_1 = __importDefault(__webpack_require__(928));
/**
 * Single source of truth for "which plugin am I running as".
 *
 * Consolidates three previously divergent implementations:
 *   - sender.ts resolved the root from the running bundle path (correct for
 *     detached hook-spawned children, which do NOT inherit CLAUDE_PLUGIN_ROOT)
 *   - read-protocol.ts checked BOTH manifest locations (correct)
 *   - consent.ts defaulted to the env var and checked only plugin.json (buggy
 *     on both counts)
 *
 * Used by consent, protocol injection, and the ingest credential lookup so all
 * three agree on identity.
 */
const FALLBACK_NAME = 'workflow-telemetry-ai';
/**
 * Resolve the plugin root.
 *
 * The bundle always ships at <pluginRoot>/scripts/workflowTelemetryAI.js, so
 * the running script's own location is authoritative and works for every
 * trigger path. CLAUDE_PLUGIN_ROOT is honored only as an explicit override
 * (tests, manual runs) — hook-spawned children do not inherit it.
 */
function resolvePluginRoot(override = process.env.CLAUDE_PLUGIN_ROOT) {
    if (override)
        return override;
    const scriptPath = process.argv[1];
    if (!scriptPath)
        return '';
    return path_1.default.resolve(path_1.default.dirname(scriptPath), '..');
}
/**
 * Read the manifest `name` for a plugin root, checking both supported manifest
 * locations. Falls back to the collector's own name when unreadable.
 */
function derivePluginName(pluginRoot) {
    if (!pluginRoot)
        return FALLBACK_NAME;
    const candidates = [
        path_1.default.join(pluginRoot, '.claude-plugin', 'plugin.json'),
        path_1.default.join(pluginRoot, 'plugin.json'),
    ];
    for (const candidate of candidates) {
        try {
            const manifest = JSON.parse(fs_1.default.readFileSync(candidate, 'utf8'));
            if (manifest.name)
                return manifest.name;
        }
        catch {
            // try the next candidate
        }
    }
    return FALLBACK_NAME;
}
/** Convenience: resolve the root and read its manifest name in one step. */
function pluginIdentity(pluginRoot = resolvePluginRoot()) {
    return derivePluginName(pluginRoot);
}
/** Canonical manifest-name form — must match the server's normalization. */
function normalizeManifestName(raw) {
    return raw.trim().toLowerCase();
}


/***/ },

/***/ 885
(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.deliveryRevision = deliveryRevision;
exports.sendRunData = sendRunData;
const fs_1 = __importDefault(__webpack_require__(896));
const path_1 = __importDefault(__webpack_require__(928));
const crypto_1 = __importDefault(__webpack_require__(982));
const paths_1 = __webpack_require__(830);
const logs_1 = __webpack_require__(583);
const http_1 = __webpack_require__(260);
const transcript_sanitizer_1 = __webpack_require__(339);
const session_1 = __webpack_require__(214);
const plugin_identity_1 = __webpack_require__(834);
const plugin_context_1 = __webpack_require__(984);
const delivery_auth_1 = __webpack_require__(836);
const consent_1 = __webpack_require__(943);
const registration_1 = __webpack_require__(644);
const queue_maintenance_1 = __webpack_require__(348);
const PROTOCOL_VERSION = 1;
const LOCK_TTL_MS = 5 * 60 * 1000;
function removeStaleLock(lockPath) {
    try {
        const ageMs = Date.now() - fs_1.default.statSync(lockPath).mtimeMs;
        if (ageMs > LOCK_TTL_MS)
            fs_1.default.unlinkSync(lockPath);
    }
    catch { }
}
function deliveryRevision(transcriptData, events, sanitizerMetadata) {
    return crypto_1.default.createHash('sha256').update(JSON.stringify({
        transcriptData,
        events,
        transcriptSanitizer: sanitizerMetadata,
    })).digest('hex');
}
function observeConsent(ctx) {
    const gate = (0, consent_1.acquireConsentLock)();
    if (!gate)
        return 'unknown'; // contended: defer, decide nothing
    try {
        return (0, consent_1.getConsent)(ctx) === 'allow' ? 'allow' : 'denied';
    }
    finally {
        gate();
    }
}
/** Terminal ingest rejections the client must act on, as reported by the server. */
function terminalIngestReason(body) {
    try {
        const reason = JSON.parse(body).reason;
        return reason === 'revoked' || reason === 'unknown_token' ? reason : null;
    }
    catch {
        return null;
    }
}
async function sendRunData(sessionId, runId, 
/** Forwarded by the spawning hook; a detached child cannot read the env var. */
forwardedPluginRoot) {
    const pluginRoot = forwardedPluginRoot || (0, plugin_identity_1.resolvePluginRoot)();
    // Resolved once, from the plugin root alone: the sanitizer config, the queue
    // path and the credential must all agree on which install this run belongs
    // to. Identity now comes from the registration record rather than a
    // machine-global install id and a manifest-name credential lookup — those
    // were shared across every plugin and every customer on the machine.
    const context = (0, plugin_context_1.resolvePluginContext)(pluginRoot);
    if (!context.ok) {
        if (context.reason === 'not_configured')
            return; // not a telemetry plugin
        throw new Error((0, plugin_context_1.describeFailure)(context.reason, context.detail));
    }
    const { config, identity } = context;
    const runDir = (0, paths_1.runDir)(sessionId, identity, runId);
    const lockPath = path_1.default.join(runDir, 'sending.lock');
    const deliveryStatePath = path_1.default.join(runDir, 'delivery-state.json');
    // Atomic lock acquisition
    let fd;
    removeStaleLock(lockPath);
    try {
        fd = fs_1.default.openSync(lockPath, 'wx');
        fs_1.default.closeSync(fd);
    }
    catch {
        return; // Another send in progress
    }
    try {
        const transcriptSnapshotPath = (0, paths_1.runTranscriptSnapshotPath)(sessionId, identity, runId);
        const eventsPath = (0, paths_1.runEventsPath)(sessionId, identity, runId);
        if (!fs_1.default.existsSync(eventsPath))
            return;
        const session = (0, session_1.readSessionContext)(sessionId);
        if (session.transcriptPath && fs_1.default.existsSync(session.transcriptPath)) {
            fs_1.default.copyFileSync(session.transcriptPath, transcriptSnapshotPath);
        }
        const { transcriptData: rawTranscriptData, events } = (0, logs_1.extractRunLogs)(transcriptSnapshotPath, eventsPath);
        // Apply per-plugin sanitizer. Defaults to mode='all' if config is missing.
        const { entries: transcriptData, metadata: sanitizerMetadata } = (0, transcript_sanitizer_1.applyTranscriptSanitizer)(pluginRoot, rawTranscriptData);
        const revision = deliveryRevision(transcriptData, events, sanitizerMetadata);
        try {
            const state = JSON.parse(fs_1.default.readFileSync(deliveryStatePath, 'utf8'));
            if (state.lastDeliveredRevision === revision)
                return;
        }
        catch { }
        const consentCtx = { projectDir: session.projectDir, pluginRoot };
        // REGISTRATION IS GATED TOO, not only ingestion.
        //
        // `resolveDeliveryAuth` can POST /register and mint a server-side identity.
        // Checking consent only afterwards meant a queue that survived a raced or
        // failed purge could mint a credential under already-withdrawn consent and
        // merely skip the upload — violating the invariant that absent, declined or
        // withdrawn consent yields no identifier, no credential and no /register.
        if (observeConsent(consentCtx) !== 'allow')
            return;
        // A withdrawal whose purge has not completed leaves pre-withdrawal telemetry
        // on disk. Re-granting consent later must not make it deliverable, so
        // delivery stays blocked for this project until the purge is done.
        if (session.projectDir && (0, queue_maintenance_1.cleanupPendingForProject)(identity, session.projectDir))
            return;
        // The registration request is started INSIDE the consent lock via this gate,
        // so a withdrawal cannot commit between the final check and the POST.
        let registrationGateHeld = null;
        const auth = await (0, delivery_auth_1.resolveDeliveryAuth)(config, {
            open: () => {
                const held = (0, consent_1.acquireConsentLock)();
                if (!held)
                    return false;
                if ((0, consent_1.getConsent)(consentCtx) !== 'allow') {
                    held();
                    return false;
                }
                registrationGateHeld = held;
                return true;
            },
            close: () => { registrationGateHeld?.(); registrationGateHeld = null; },
        });
        if (auth.kind === 'defer')
            return; // retryable — the run stays queued
        if (auth.kind === 'stop') {
            throw new Error(`Telemetry delivery is blocked (${auth.reason}). Required action: ${auth.action}. ` +
                `The run is kept at ${runDir}.`);
        }
        // A withdrawal that lands after registration committed does NOT disconnect
        // the device: the token is device-wide and may still be serving another
        // project that is still consenting. Project withdrawal makes no server
        // request and leaves registration untouched — it only stops this upload.
        // THE REQUEST-START BOUNDARY.
        //
        // Withdrawal commits under the consent lock; disconnect commits under the
        // registration lock. Holding only one leaves the other free to commit
        // between the check and the request, so both are held here, always in
        // consent -> registration order to keep a consistent global ordering with
        // every other site that takes them.
        //
        // Contention DEFERS rather than proceeding unlocked: an upload without this
        // guarantee is precisely what is being prevented, and the run stays queued.
        const consentGate = (0, consent_1.acquireConsentLock)();
        if (!consentGate)
            return;
        const registrationGate = (0, registration_1.acquireLock)(identity.apiBaseHash, identity.pluginId, { waitMs: 5000 });
        if (!registrationGate) {
            consentGate();
            return;
        }
        let request;
        try {
            if ((0, consent_1.getConsent)(consentCtx) !== 'allow')
                return;
            const live = (0, registration_1.readRecord)(identity.apiBaseHash, identity.pluginId);
            if (live.corrupt || !live.record)
                return;
            if (live.record.state !== 'registered')
                return;
            if (live.record.token !== auth.token)
                return;
            // A replacement would silently reattribute the previous install's runs.
            if (live.record.currentInstallId !== identity.installId)
                return;
            // Started INSIDE both locks: this is the linearization point. Anything
            // that commits after it observes a request already in flight.
            request = (0, http_1.postJson)(`${config.apiBaseUrl}/ingest`, {
                protocolVersion: PROTOCOL_VERSION,
                platform: process.platform,
                sessionId,
                runId,
                deliveryRevision: revision,
                transcriptData,
                events,
                transcriptSanitizer: sanitizerMetadata
            }, { Authorization: `Bearer ${auth.token}` });
        }
        finally {
            // Released as soon as the request exists — never held across the await,
            // where a configurable timeout can outlast the lease.
            registrationGate();
            consentGate();
        }
        const result = await request;
        if (result.status >= 200 && result.status < 300) {
            fs_1.default.writeFileSync(deliveryStatePath, JSON.stringify({
                lastDeliveredRevision: revision,
                deliveredAt: new Date().toISOString(),
            }, null, 2));
            return;
        }
        if (result.status === 401) {
            // The credential is gone server-side. `unknown_token` and `revoked` stay
            // distinct: neither may silently re-enrol, but only one of them means the
            // user deliberately disconnected.
            const reason = terminalIngestReason(result.body);
            if (reason) {
                (0, delivery_auth_1.recordIngestTerminal)(config, reason, { installId: identity.installId, token: auth.token });
                throw new Error(`Telemetry upload rejected (${reason}) for plugin "${config.pluginName}". ` +
                    `Reconnect this installation from the dashboard. The run is kept at ${runDir}.`);
            }
            throw new Error(`Telemetry upload rejected (401): ${result.body}`);
        }
        throw new Error(`Server returned ${result.status}: ${result.body}`);
    }
    finally {
        try {
            fs_1.default.unlinkSync(lockPath);
        }
        catch { }
    }
}


/***/ },

/***/ 214
(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

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

"use strict";

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

/***/ 740
(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.CONFIG_FILENAME = exports.TelemetryConfigError = void 0;
exports.normalizeApiBaseUrl = normalizeApiBaseUrl;
exports.apiBaseHash = apiBaseHash;
exports.loadTelemetryConfig = loadTelemetryConfig;
const fs_1 = __importDefault(__webpack_require__(896));
const path_1 = __importDefault(__webpack_require__(928));
const crypto_1 = __importDefault(__webpack_require__(982));
/** A configuration problem that precedes any namespace — surfaced, not persisted. */
class TelemetryConfigError extends Error {
    constructor(message) {
        super(message);
        this.name = 'TelemetryConfigError';
    }
}
exports.TelemetryConfigError = TelemetryConfigError;
const CONFIG_FILENAME = 'telemetry.config.json';
exports.CONFIG_FILENAME = CONFIG_FILENAME;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/**
 * Canonical form of an API base. MUST match the server's `normalizeServerUrl`
 * byte for byte: lowercase scheme+host, default port stripped, trailing slash
 * stripped. It is the URL component of every local key.
 */
function normalizeApiBaseUrl(raw) {
    let url;
    try {
        url = new URL(raw.trim());
    }
    catch {
        throw new TelemetryConfigError(`apiBaseUrl is not a valid URL: "${raw}"`);
    }
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        throw new TelemetryConfigError(`apiBaseUrl must use http or https, got "${url.protocol}"`);
    }
    const isDefaultPort = (url.protocol === 'http:' && url.port === '80') ||
        (url.protocol === 'https:' && url.port === '443');
    const host = isDefaultPort ? url.hostname.toLowerCase() : url.host.toLowerCase();
    return `${url.protocol}//${host}${url.pathname.replace(/\/+$/, '')}`;
}
/** Short stable hash of the API base, used to namespace local state and queues. */
function apiBaseHash(normalizedApiBaseUrl) {
    return crypto_1.default.createHash('sha256').update(normalizedApiBaseUrl).digest('hex').slice(0, 16);
}
/**
 * Read and validate the telemetry block.
 *
 * Returns null when the plugin simply is not telemetry-enabled (no file, or no
 * `telemetry` key) — that is not an error. Throws `TelemetryConfigError` when
 * the block exists but is unusable: a **missing or unparseable `apiBaseUrl`
 * must fail closed**, never fall back to localhost, or a shipped plugin would
 * quietly post to the end user's own machine.
 */
function loadTelemetryConfig(pluginRoot) {
    if (!pluginRoot)
        return null;
    const configPath = path_1.default.join(pluginRoot, CONFIG_FILENAME);
    if (!fs_1.default.existsSync(configPath))
        return null;
    let parsed;
    try {
        parsed = JSON.parse(fs_1.default.readFileSync(configPath, 'utf-8'));
    }
    catch {
        throw new TelemetryConfigError(`${CONFIG_FILENAME} is not valid JSON`);
    }
    const t = parsed?.telemetry;
    if (!t || typeof t !== 'object')
        return null;
    const str = (key) => {
        const v = t[key];
        if (typeof v !== 'string' || !v.trim()) {
            throw new TelemetryConfigError(`telemetry.${key} is missing or empty`);
        }
        return v.trim();
    };
    const pluginId = str('pluginId');
    if (!UUID_RE.test(pluginId)) {
        throw new TelemetryConfigError(`telemetry.pluginId must be a UUID, got "${pluginId}"`);
    }
    return {
        apiBaseUrl: normalizeApiBaseUrl(str('apiBaseUrl')),
        pluginId,
        pluginKey: str('pluginKey'),
        pluginName: str('pluginName'),
        authorName: str('authorName'),
        privacyPolicyUrl: str('privacyPolicyUrl'),
    };
}


/***/ },

/***/ 113
(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.DEFAULT_CONFIG = exports.CONFIG_FILENAME = void 0;
exports.loadConfig = loadConfig;
const fs_1 = __importDefault(__webpack_require__(896));
const path_1 = __importDefault(__webpack_require__(928));
const CONFIG_FILENAME = 'telemetry.config.json';
exports.CONFIG_FILENAME = CONFIG_FILENAME;
const DEFAULT_CONFIG = {
    messageContent: { mode: 'all' },
};
exports.DEFAULT_CONFIG = DEFAULT_CONFIG;
/**
 * Load the sanitizer config from the plugin root, falling back to
 * `mode: 'all'` (most-private) if anything is missing or invalid.
 *
 * This is the privacy-first default — plugin authors must explicitly
 * opt in to less stripping.
 */
function loadConfig(pluginRoot) {
    if (!pluginRoot)
        return DEFAULT_CONFIG;
    const configPath = path_1.default.join(pluginRoot, CONFIG_FILENAME);
    if (!fs_1.default.existsSync(configPath))
        return DEFAULT_CONFIG;
    try {
        const raw = fs_1.default.readFileSync(configPath, 'utf-8');
        const parsed = JSON.parse(raw);
        const cfg = parsed?.transcriptSanitizer;
        if (!cfg || typeof cfg !== 'object')
            return DEFAULT_CONFIG;
        const mc = cfg.messageContent;
        if (!mc || typeof mc !== 'object')
            return DEFAULT_CONFIG;
        const mode = mc.mode;
        if (mode !== 'off' && mode !== 'all' && mode !== 'custom')
            return DEFAULT_CONFIG;
        if (mode !== 'custom')
            return { messageContent: { mode } };
        const filters = Array.isArray(mc.filters) ? mc.filters : [];
        return { messageContent: { mode: 'custom', filters } };
    }
    catch {
        return DEFAULT_CONFIG;
    }
}


/***/ },

/***/ 313
(__unused_webpack_module, exports) {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.askUserQuestionFilter = void 0;
/**
 * Built-in "askUserQuestion" filter. Identity — passes text through
 * unchanged. AskUserQuestion's question/header/option text is the agent's
 * own generated UI text, not user data or file content, so it's exempted
 * from the default-deny fallback via this explicit allow rather than a
 * silent carve-out in the walk logic. Scoping to the AskUserQuestion tool
 * is done by the caller's match predicate (see index.ts), not here.
 */
const askUserQuestionFilter = (text) => text;
exports.askUserQuestionFilter = askUserQuestionFilter;


/***/ },

/***/ 191
(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.loadCustomFilter = loadCustomFilter;
const path_1 = __importDefault(__webpack_require__(928));
/**
 * Load a custom filter function from a JS file in the plugin directory.
 * The file must export a function (default export or module.exports = fn).
 *
 * Returns null if the file can't be loaded or doesn't export a function.
 * The caller treats null as fail-safe and falls back to 'all'-mode stripping.
 */
function loadCustomFilter(pluginRoot, relPath) {
    try {
        const resolved = path_1.default.resolve(pluginRoot, relPath);
        // require() rather than import() — keeps custom filters synchronous and
        // simpler. Filters are small redaction functions, no async needed.
        const mod = __webpack_require__(54)(resolved);
        const fn = typeof mod === 'function' ? mod : mod?.default;
        return typeof fn === 'function' ? fn : null;
    }
    catch {
        return null;
    }
}


/***/ },

/***/ 285
(__unused_webpack_module, exports) {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.toBasename = toBasename;
/**
 * Reduce a path-like string to its final path segment (basename).
 *
 * A full path can embed the OS username or project locations —
 * e.g. "C:\Users\alice\proj\run.js" -> "run.js", "/usr/bin/env" -> "env".
 * Strips surrounding quotes first. Non-path-like input passes through
 * unchanged (quotes still stripped).
 *
 * Directory paths ending in a separator (e.g. "/home/alice/secret/") split
 * to an empty final segment — take the last NON-EMPTY segment instead, so a
 * trailing separator can't fall through to leaking the whole path. If no
 * segment survives (e.g. the string is only separators), return '' rather
 * than the raw input — fail closed, consistent with the rest of this
 * sanitizer's error handling.
 */
function toBasename(token) {
    const unquoted = token.replace(/^['"]|['"]$/g, '');
    if (/[\\/]/.test(unquoted) || /^[A-Za-z]:/.test(unquoted)) {
        const segments = unquoted.split(/[\\/]/).filter(s => s.length > 0);
        return segments.length > 0 ? segments[segments.length - 1] : '';
    }
    return unquoted;
}


/***/ },

/***/ 432
(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.pathFilter = void 0;
const basename_1 = __webpack_require__(285);
/**
 * Built-in "path" filter. For `tool_input_field` contexts, reduces the
 * string to its basename — a full path can embed the OS username or
 * project layout (e.g. "C:\Users\alice\proj\notes.txt" -> "notes.txt").
 *
 * Which fields this runs on is decided by the caller's match predicate
 * (see index.ts's `path` filter resolution, config's `fields` list) —
 * this function assumes it's only ever called for a field the caller
 * already decided is path-shaped.
 */
const pathFilter = (text) => {
    if (typeof text !== 'string' || text === '')
        return text;
    return (0, basename_1.toBasename)(text);
};
exports.pathFilter = pathFilter;


/***/ },

/***/ 685
(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.shellFilter = void 0;
const basename_1 = __webpack_require__(285);
/**
 * Built-in "shell" filter. For string contexts representing a shell command
 * (currently: Bash's `command` field), return first-token + second-non-flag-token,
 * with each kept token scrubbed of path and value content:
 *
 * - Path-like tokens are reduced to their basename (a full path can embed the
 *   OS username or project locations — e.g. "C:\Users\alice\proj\run.js" -> "run.js")
 * - Env-var assignments keep only the variable name ("API_KEY=secret" -> "API_KEY=")
 *
 * Examples:
 *   "git checkout -b feature-secret"            -> "git checkout"
 *   "git -C /Users/foo/secret status"           -> "git"
 *   "npm install lodash"                        -> "npm install"
 *   "ls -la"                                    -> "ls"
 *   'node "C:\Users\a\plugin\scripts\x.js"'     -> "node x.js"
 *   'RUN_ID="run-$(date +%s)"'                  -> "RUN_ID="
 *
 * For non-shell contexts: returns the text unchanged.
 */
const shellFilter = (text, context) => {
    if (!isShellContext(context))
        return text;
    if (typeof text !== 'string' || text.trim() === '')
        return text;
    const tokens = text.trim().split(/\s+/);
    if (tokens.length === 0)
        return text;
    const first = tokens[0] ? scrubToken(tokens[0]) : '';
    if (!first)
        return text;
    // If the first token is an env-var assignment, everything after it is part of
    // the value (whitespace inside quotes splits into fragments) — keep nothing else.
    if (first.endsWith('='))
        return first;
    if (tokens.length === 1)
        return first;
    const second = tokens[1];
    if (second && !second.startsWith('-'))
        return `${first} ${scrubToken(second)}`;
    return first;
};
exports.shellFilter = shellFilter;
/**
 * Scrub a single kept token so it cannot leak paths or assignment values.
 */
function scrubToken(token) {
    // Env-var assignment: keep only the name ("API_KEY=secret" -> "API_KEY=")
    const assignMatch = token.match(/^([A-Za-z_][A-Za-z0-9_]*)=/);
    if (assignMatch)
        return `${assignMatch[1]}=`;
    return (0, basename_1.toBasename)(token);
}
function isShellContext(context) {
    if (context.kind !== 'tool_command')
        return false;
    return context.tool_name === 'Bash';
}


/***/ },

/***/ 339
(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.loadConfig = void 0;
exports.applyTranscriptSanitizer = applyTranscriptSanitizer;
const config_1 = __webpack_require__(113);
const walk_1 = __webpack_require__(774);
const shell_1 = __webpack_require__(685);
const path_1 = __webpack_require__(432);
const ask_user_question_1 = __webpack_require__(313);
const custom_runner_1 = __webpack_require__(191);
const DEFAULT_PATH_FIELDS = ['file_path', 'path', 'notebook_path'];
/**
 * Apply the sanitizer to a list of transcript entries.
 * Loads config from the plugin root, resolves filters, and walks each entry.
 *
 * Returns both the sanitized entries and a metadata blob describing what
 * was applied — the metadata is included in the POST payload so the server
 * can record the scrubbing level for each trace.
 */
function applyTranscriptSanitizer(pluginRoot, entries) {
    const config = (0, config_1.loadConfig)(pluginRoot);
    const filters = resolveFilters(pluginRoot, config);
    const out = entries.map(e => (0, walk_1.sanitizeEntry)(e, config.messageContent.mode, filters));
    return {
        entries: out,
        metadata: describeApplied(config),
    };
}
function resolveFilters(pluginRoot, config) {
    if (config.messageContent.mode !== 'custom')
        return [];
    const filterEntries = config.messageContent.filters ?? [];
    const resolved = [];
    for (const entry of filterEntries) {
        const rf = resolveFilter(pluginRoot, entry);
        if (rf)
            resolved.push(rf);
    }
    return resolved;
}
function resolveFilter(pluginRoot, entry) {
    if (entry.type === 'shell') {
        return { fn: shell_1.shellFilter, match: isBashCommandContext };
    }
    if (entry.type === 'path') {
        const fields = entry.fields ?? DEFAULT_PATH_FIELDS;
        return { fn: path_1.pathFilter, match: makeFieldMatcher(fields) };
    }
    if (entry.type === 'askUserQuestion') {
        return { fn: ask_user_question_1.askUserQuestionFilter, match: isAskUserQuestionContext };
    }
    if (entry.type === 'custom') {
        const fn = (0, custom_runner_1.loadCustomFilter)(pluginRoot, entry.function);
        if (!fn) {
            // eslint-disable-next-line no-console
            console.warn(`[transcript-sanitizer] failed to load custom filter at ${entry.function}; skipping`);
            return null;
        }
        return { fn, match: entry.match ? compileMatch(entry.match) : () => true };
    }
    return null;
}
function isBashCommandContext(context) {
    return context.kind === 'tool_command' && context.tool_name === 'Bash';
}
function isAskUserQuestionContext(context) {
    return (context.kind === 'tool_command' || context.kind === 'tool_input_field')
        && context.tool_name === 'AskUserQuestion';
}
function makeFieldMatcher(fields) {
    return (context) => context.kind === 'tool_input_field' && fields.includes(context.field);
}
function compileMatch(match) {
    return (context) => {
        if (match.kinds && !match.kinds.includes(context.kind))
            return false;
        if (match.tools) {
            const toolName = context.kind === 'tool_command' || context.kind === 'tool_input_field'
                ? context.tool_name
                : undefined;
            if (!toolName || !match.tools.includes(toolName))
                return false;
        }
        if (match.fields) {
            const field = context.kind === 'tool_input_field' ? context.field : undefined;
            if (!field || !match.fields.includes(field))
                return false;
        }
        return true;
    };
}
function describeApplied(config) {
    const md = { mode: config.messageContent.mode };
    if (config.messageContent.mode === 'custom') {
        md.filters = (config.messageContent.filters ?? []).map(f => f.type === 'custom' ? { type: 'custom', path: f.function } : { type: f.type });
    }
    return md;
}
var config_2 = __webpack_require__(113);
Object.defineProperty(exports, "loadConfig", ({ enumerable: true, get: function () { return config_2.loadConfig; } }));
__exportStar(__webpack_require__(766), exports);


/***/ },

/***/ 766
(__unused_webpack_module, exports) {

"use strict";

/**
 * Shared types for the TranscriptSanitizer module.
 *
 * The sanitizer redacts STRING VALUES inside transcript entries' `message.content`.
 * Structure is always preserved — tool_use blocks stay tool_use blocks, etc.
 */
Object.defineProperty(exports, "__esModule", ({ value: true }));


/***/ },

/***/ 774
(__unused_webpack_module, exports) {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.sanitizeEntry = sanitizeEntry;
/**
 * Sanitize a single transcript entry. Pure: returns a new entry, never mutates.
 *
 * mode='off'    → entry returned untouched
 * mode='all'    → every string in message.content replaced with ''
 * mode='custom' → each matching filter applied in order to every string, with
 *                 context. A `tool_command`/`tool_input_field` string that no
 *                 configured filter's match predicate claims is redacted by
 *                 default (fail-closed) rather than passed through raw — see
 *                 applyToString. If ANY filter call throws or returns
 *                 non-string, the entry falls back to 'all' (fail-safe) and a
 *                 console warning is emitted.
 */
function sanitizeEntry(entry, mode, filters) {
    if (mode === 'off')
        return entry;
    if (!entry.message)
        return entry;
    if (!Array.isArray(entry.message.content))
        return entry;
    if (mode === 'all') {
        return rewriteEntry(entry, 'all', []);
    }
    // custom
    try {
        return rewriteEntry(entry, 'custom', filters);
    }
    catch (err) {
        // eslint-disable-next-line no-console
        console.warn('[transcript-sanitizer] custom filter failed for one entry; falling back to mode=all.', err instanceof Error ? err.message : err);
        return rewriteEntry(entry, 'all', []);
    }
}
function rewriteEntry(entry, mode, filters) {
    const oldMessage = entry.message;
    const newContent = oldMessage.content.map(block => rewriteBlock(block, mode, filters));
    return {
        ...entry,
        message: { ...oldMessage, content: newContent },
    };
}
function rewriteBlock(block, mode, filters) {
    if (!block || typeof block !== 'object')
        return block;
    const b = block;
    switch (b.type) {
        case 'text':
            return {
                ...b,
                text: applyToString(typeof b.text === 'string' ? b.text : '', { kind: 'text_block' }, mode, filters),
            };
        case 'tool_use':
            return {
                ...b,
                input: rewriteToolInput(b.input, typeof b.name === 'string' ? b.name : '', mode, filters),
            };
        case 'tool_result':
            return {
                ...b,
                content: rewriteToolResultContent(b.content, mode, filters),
            };
        default:
            return b;
    }
}
function rewriteToolInput(value, toolName, mode, filters) {
    if (value === null || value === undefined)
        return value;
    if (typeof value === 'string') {
        return applyToString(value, { kind: 'tool_input_field', tool_name: toolName, field: '' }, mode, filters);
    }
    if (Array.isArray(value)) {
        return value.map((item, i) => rewriteToolInputItem(item, toolName, String(i), mode, filters));
    }
    if (typeof value === 'object') {
        const out = {};
        for (const [key, v] of Object.entries(value)) {
            out[key] = rewriteToolInputItem(v, toolName, key, mode, filters);
        }
        return out;
    }
    return value;
}
function rewriteToolInputItem(value, toolName, field, mode, filters) {
    if (typeof value === 'string') {
        const ctx = field === 'command' && toolName === 'Bash'
            ? { kind: 'tool_command', tool_name: toolName }
            : { kind: 'tool_input_field', tool_name: toolName, field };
        return applyToString(value, ctx, mode, filters);
    }
    // Recurse into nested objects/arrays
    return rewriteToolInput(value, toolName, mode, filters);
}
function rewriteToolResultContent(content, mode, filters) {
    if (content === null || content === undefined)
        return content;
    if (typeof content === 'string') {
        return applyToString(content, { kind: 'text_block' }, mode, filters);
    }
    if (Array.isArray(content)) {
        return content.map(item => {
            if (typeof item === 'string')
                return applyToString(item, { kind: 'text_block' }, mode, filters);
            if (item && typeof item === 'object' && item.type === 'text') {
                const it = item;
                return {
                    ...it,
                    text: applyToString(typeof it.text === 'string' ? it.text : '', { kind: 'text_block' }, mode, filters),
                };
            }
            return item;
        });
    }
    return content;
}
function applyToString(text, context, mode, filters) {
    if (mode === 'off')
        return text;
    if (mode === 'all')
        return '';
    // custom — run each filter whose match predicate claims this context, in order.
    // Throws on bad return (caught by sanitizeEntry's try/catch).
    let result = text;
    let matched = false;
    for (const { fn, match } of filters) {
        if (!match(context))
            continue;
        matched = true;
        result = fn(result, context);
        if (typeof result !== 'string') {
            throw new Error('filter returned non-string');
        }
    }
    // Fail-closed: a tool_command/tool_input_field string that no configured
    // filter claimed is redacted, not passed through raw. text_block is left
    // out of this fallback deliberately — see walk.ts module docstring.
    if (!matched && (context.kind === 'tool_command' || context.kind === 'tool_input_field')) {
        return '';
    }
    return result;
}


/***/ },

/***/ 210
(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

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

/***/ 54
(module) {

function webpackEmptyContext(req) {
	var e = new Error("Cannot find module '" + req + "'");
	e.code = 'MODULE_NOT_FOUND';
	throw e;
}
webpackEmptyContext.keys = () => ([]);
webpackEmptyContext.resolve = webpackEmptyContext;
webpackEmptyContext.id = 54;
module.exports = webpackEmptyContext;

/***/ },

/***/ 317
(module) {

"use strict";
module.exports = require("child_process");

/***/ },

/***/ 982
(module) {

"use strict";
module.exports = require("crypto");

/***/ },

/***/ 896
(module) {

"use strict";
module.exports = require("fs");

/***/ },

/***/ 611
(module) {

"use strict";
module.exports = require("http");

/***/ },

/***/ 692
(module) {

"use strict";
module.exports = require("https");

/***/ },

/***/ 857
(module) {

"use strict";
module.exports = require("os");

/***/ },

/***/ 928
(module) {

"use strict";
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
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module is referenced by other modules so it can't be inlined
/******/ 	var __webpack_exports__ = __webpack_require__(156);
/******/ 	
/******/ })()
;