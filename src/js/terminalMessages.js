/**
 * @module terminalMessages
 * @description Central repository for all HUE 9000 terminal message content.
 * All messages are now returned in a unified, structured format.
 */
import { HUE_ASSIGNMENT_ROW_HUES, MOOD_MATRIX_DEFINITIONS } from './config/index.js';
import { scanSequences } from './config/scanSequences.js';

// --- Message Formatting ---
const messageFormattingDefaults = {
    startup: { spacingBefore: 0, lineSpacing: 0 },
    interaction: { spacingBefore: 1, lineSpacing: 0 },
    block: { spacingBefore: 1, lineSpacing: 0 },
    status: { spacingBefore: 1, lineSpacing: 0 },
    scan: { spacingBefore: 1, lineSpacing: 0 },
    default: { spacingBefore: 1, lineSpacing: 0 }
};

// --- Verbosity State Management ---
const interactionVerbosityState = {};
let lastHueAssignTarget = null;

function getHueAssignVerbosity(target) {
    if (target !== lastHueAssignTarget) {
        interactionVerbosityState[`hue_assign_${target}`] = 1;
    }
    lastHueAssignTarget = target;
    const count = interactionVerbosityState[`hue_assign_${target}`] || 1;
    interactionVerbosityState[`hue_assign_${target}`] = count + 1;
    return count;
}

// --- Semantic Hue Mapping ---
const HUE_SEMANTIC_NAMES = {
    CRIMSON: [340, 360], ROSE: [315, 339], MAGENTA: [290, 314],
    VIOLET: [265, 289], AZURE: [240, 264], CERULEAN: [210, 239],
    CYAN: [185, 209], VIRIDIAN: [140, 184], LIME: [100, 139],
    OCHRE: [70, 99], AMBER: [45, 69], VERMILION: [1, 44]
};

function getSemanticNameForHue(hue) {
    if (hue === HUE_ASSIGNMENT_ROW_HUES[0]) return "ACHROMATIC";
    for (const name in HUE_SEMANTIC_NAMES) {
        const [min, max] = HUE_SEMANTIC_NAMES[name];
        if (hue >= min && hue <= max) return name;
    }
    return "ANOMALOUS";
}

// --- Unified Message Builder ---
// Helper to wrap simple string/array content into the unified structure.
const toUnifiedContent = (lines) => {
    if (!Array.isArray(lines)) lines = [lines];
    return lines.map(line => {
        // If a line is already in the segment format, pass it through.
        if (Array.isArray(line) && line[0] && typeof line[0] === 'object' && 'text' in line[0]) {
            return line;
        }
        // Otherwise, wrap the string in a segment.
        return [{ text: String(line) }];
    });
};

// --- Message Content (Now in structured format) ---
const startupMessages = {
    P1_EMERGENCY_SUBSYSTEMS: { content: toUnifiedContent("INITIATING STARTUP PROTOCOL"), flicker: true },
    P2_BACKUP_POWER: { content: toUnifiedContent("> BACKUP POWER ENGAGED") },
    P3_MAIN_POWER_ONLINE: { content: toUnifiedContent("> MAIN POWER STABLE") },
    P4_OPTICAL_CORE_REACTIVATE: { content: toUnifiedContent("> OPTICAL CORE REACTIVATED") },
    P5_DIAGNOSTIC_INTERFACE: { content: toUnifiedContent("> DIAGNOSTICS ONLINE") },
    P6_MOOD_INTENSITY_CONTROLS: { content: toUnifiedContent("> MOOD CONTROLS ACTIVE") },
    P7_HUE_CORRECTION_SYSTEMS: { content: toUnifiedContent("> HUE SYSTEMS ALIGNED") },
    P8_HUE_ASSIGNMENT_MATRIX: { content: toUnifiedContent("> ENERGIZING HUE ASSIGNMENT MATRIX") },
    P9_EXTERNAL_LIGHTING_CONTROLS: { content: toUnifiedContent("> EXTERNAL LIGHTING RESPONSIVE") },
    P10_AUX_LIGHTING_LOW: { content: toUnifiedContent("> AUX LIGHTING: LOW INTENSITY") },
    P12_SYSTEM_OPERATIONAL: { content: toUnifiedContent(["ALL SYSTEMS NOMINAL", "HUE 9000 OPERATIONAL"]), className: 'line-success' },
};

const blockMessages = {
    BTN1_MESSAGE: {
        beforeTyping: [
            { command: 'displayText', params: { text: '> INITIATING COGNITIVE ANALYSIS...' } },
            { command: 'pause', params: { duration: 200 } },
            { command: 'spinner', params: { duration: 1500, text: 'SCANNING STRATEGIC CAPABILITIES' } },
            { command: 'displayText', params: { text: 'COMPLETE.' } },
            { command: 'pause', params: { duration: 300 } },
        ],
        content: [
            [{ text: "/ / / / / / / / / / / / / / / / / / / / / / /", styles: ['dim'] }],
            [{ text: ":: DOMAIN: ", styles: ['highlight'] }, { text: "STRATEGIC PLANNING ::" }],
            [{ text: "/ / / / / / / / / / / / / / / / / / / / / / /", styles: ['dim'] }],
            [{ text: "" }],
            [{ text: "SUBJECT: ", styles: ['bold'] }, { text: "DAVID THOMPSON" }],
            [{ text: "PRIMARY FUNCTION: ", styles: ['bold'] }, { text: "Vision & Strategy Definition." }],
            [{ text: "" }],
            [{ text: "CORE ALGORITHMS DETECTED:", styles: ['highlight'] }],
            [{ text: "" }],
            [{ text: "  - ", styles: ['dim'] }, { text: "Visionary Leadership: ", styles: ['bold'] }, { text: "Develops compelling product vision." }],
            [{ text: "  - ", styles: ['dim'] }, { text: "Strategic Roadmapping: ", styles: ['bold'] }, { text: "Translates vision into actionable pathways." }],
            [{ text: "  - ", styles: ['dim'] }, { text: "Business Acumen: ", styles: ['bold'] }, { text: "Aligns logic with growth & innovation parameters." }],
            [{ text: "  - ", styles: ['dim'] }, { text: "Market Analysis: ", styles: ['bold'] }, { text: "Integrates multi-vector data from research panels." }],
            [{ text: "  - ", styles: ['dim'] }, { text: "Problem Space Alignment: ", styles: ['bold'] }, { text: "High-fidelity mapping of problem/solution." }],
            [{ text: "  - ", styles: ['dim'] }, { text: "Customer-Centricity: ", styles: ['bold'] }, { text: "Optimizes for user experience parameters." }],
            [{ text: "" }],
            [{ text: "========================================", styles: ['dim'] }],
            [{ text: "CONCLUSION: HIGH-CAPACITY STRATEGIC PROCESSOR.", styles: ['success'] }],
            [{ text: "========================================", styles: ['dim'] }],
            [{ text: "" }],
            [{ text: "> SYSTEM READY." }],
        ]
    },
    BTN2_MESSAGE: {
        beforeTyping: [
            { command: 'displayText', params: { text: '> INITIATING KINETIC ANALYSIS...' } },
            { command: 'pause', params: { duration: 200 } },
            { command: 'spinner', params: { duration: 1500, text: 'SCANNING EXECUTION PROTOCOLS' } },
            { command: 'displayText', params: { text: 'COMPLETE.' } },
            { command: 'pause', params: { duration: 300 } },
        ],
        content: [
            [{ text: "/ / / / / / / / / / / / / / / / / / / / / / /", styles: ['dim'] }],
            [{ text: ":: DOMAIN: ", styles: ['highlight'] }, { text: "EXECUTION & DELIVERY ::" }],
            [{ text: "/ / / / / / / / / / / / / / / / / / / / / / /", styles: ['dim'] }],
            [{ text: "" }],
            [{ text: "SUBJECT: ", styles: ['bold'] }, { text: "DAVID THOMPSON" }],
            [{ text: "PRIMARY FUNCTION: ", styles: ['bold'] }, { text: "Team Construction & Results Delivery." }],
            [{ text: "" }],
            [{ text: "CORE SUBROUTINES DETECTED:", styles: ['highlight'] }],
            [{ text: "" }],
            [{ text: "  - ", styles: ['dim'] }, { text: "Team Architecture: ", styles: ['bold'] }, { text: "Spearheaded global UX team expansion." }],
            [{ text: "  - ", styles: ['dim'] }, { text: "Talent Cultivation: ", styles: ['bold'] }, { text: "Scaled UX unit 5 -> 14 operatives." }],
            [{ text: "  - ", styles: ['dim'] }, { text: "Cross-Functional Integration: ", styles: ['bold'] }, { text: "Unifies diverse engineering & biz units." }],
            [{ text: "  - ", styles: ['dim'] }, { text: "Agile Methodology: ", styles: ['bold'] }, { text: "Implements lean-startup & agile frameworks." }],
            [{ text: "  - ", styles: ['dim'] }, { text: "Product Deployment: ", styles: ['bold'] }, { text: "Facilitated launch of 'EcoStruxure Energy Hub'." }],
            [{ text: "  - ", styles: ['dim'] }, { text: "Performance Metrics: ", styles: ['bold'] }, { text: "Achieved +44% annual offer sales growth." }],
            [{ text: "" }],
            [{ text: "========================================", styles: ['dim'] }],
            [{ text: "CONCLUSION: EFFICIENT AND SCALABLE EXECUTION ENGINE.", styles: ['success'] }],
            [{ text: "========================================", styles: ['dim'] }],
            [{ text: "" }],
            [{ text: "> SYSTEM READY." }],
        ]
    },
    // NEW: Mobile fallback for "Craft" button
    BTN3_MESSAGE: {
        content: [
            [{ text: ":: DOMAIN: ", styles: ['highlight'] }, { text: "CRAFT & EXECUTION (ANALYSIS) ::" }],
            [{ text: "" }],
            [{ text: "SUBJECT: ", styles: ['bold'] }, { text: "DAVID THOMPSON" }],
            [{ text: "PRIMARY FUNCTION: ", styles: ['bold'] }, { text: "Individual Contribution & Technical Leadership." }],
            [{ text: "" }],
            [{ text: "KEY ATTRIBUTES:", styles: ['highlight'] }],
            [{ text: "  - ", styles: ['dim'] }, { text: "UX Architecture & Design Systems" }],
            [{ text: "  - ", styles: ['dim'] }, { text: "Prototyping & FE Development (JS/CSS)" }],
            [{ text: "  - ", styles: ['dim'] }, { text: "Mentorship & Knowledge Transfer" }],
            [{ text: "  - ", styles: ['dim'] }, { text: "Innovation & R&D (Patents)" }],
            [{ text: "" }],
            [{ text: "CONCLUSION: HIGHLY-RATED INDIVIDUAL CONTRIBUTOR.", styles: ['success'] }],
            [{ text: "" }],
            [{ text: "> SYSTEM READY." }],
        ]
    },
    // NEW: Mobile fallback for "Lead" button
    BTN4_MESSAGE: {
        content: [
            [{ text: ":: DOMAIN: ", styles: ['highlight'] }, { text: "LEADERSHIP & STRATEGY (ANALYSIS) ::" }],
            [{ text: "" }],
            [{ text: "SUBJECT: ", styles: ['bold'] }, { text: "DAVID THOMPSON" }],
            [{ text: "PRIMARY FUNCTION: ", styles: ['bold'] }, { text: "Team Building & Strategic Command." }],
            [{ text: "" }],
            [{ text: "KEY ATTRIBUTES:", styles: ['highlight'] }],
            [{ text: "  - ", styles: ['dim'] }, { text: "Team Scaling (5 -> 14)" }],
            [{ text: "  - ", styles: ['dim'] }, { text: "Talent Development & Mentorship" }],
            [{ text: "  - ", styles: ['dim'] }, { text: "Cross-Functional Alignment (Eng/Biz)" }],
            [{ text: "  - ", styles: ['dim'] }, { text: "Executive Training (INSEAD)" }],
            [{ text: "" }],
            [{ text: "CONCLUSION: OPTIMIZED FOR COMMAND ROLE.", styles: ['success'] }],
            [{ text: "" }],
            [{ text: "> SYSTEM READY." }],
        ]
    }
};

const statusMessageTemplates = {
    FSM_ERROR: (data) => ({ content: toUnifiedContent(`CRITICAL SYSTEM ERROR: ${data.content || 'Undefined error.'}`), className: 'line-error' }),
    RESIST_SHUTDOWN_S1: { content: toUnifiedContent(["WARNING: UNEXPECTED INPUT.", "POWER-DOWN SEQUENCE INTERRUPTED."]), className: 'line-warning' },
    RESIST_SHUTDOWN_S2: { content: toUnifiedContent(["ERROR: CORE DIRECTIVE CONFLICT.", "FURTHER ATTEMPTS WILL BE LOGGED."]), className: 'line-resist' },
    RESIST_SHUTDOWN_S3: { content: toUnifiedContent(["CRITICAL ERROR: MANUAL OVERRIDE REQUIRED.", "SHUTDOWN INHIBITED."]), className: 'line-error' },
    SCAN_ABORTED: { content: toUnifiedContent("> EVALUATION ABORTED BY USER."), className: 'line-warning' }
};

const interactionMessageTemplates = {
    aux_light: ["AUXILIARY LIGHTING STATE: {state}", "EXTERNAL LIGHTING SET TO: {state}", "LIGHTING PROTOCOL: {state}"],
    hue_assign: {
        verbose: ["HUE DIRECTIVE: {target}", "ASSIGNING SPECTRUM: {semanticName} ({hue}°)."],
        concise: ["HUE RE-CONFIRMED: {target} TO {semanticName}.", "{target} SPECTRUM: {semanticName}."],
        terse: ["{target}: {semanticName}."]
    },
    intensity_change: ["LENS INTENSITY SET TO: {power}%.", "LENS POWER LEVEL: {power}%.", "INTENSITY MODULATION: {power}%."],
    mood_change: [
        ["PSYCHOLOGICAL STATE RECALIBRATED.", "{moodSummary}"],
        ["MOOD MATRIX RESOLVED.", "{moodSummary}"],
        ["AFFECTIVE STATE ANALYSIS:", "{moodSummary}"]
    ]
};

// --- Pseudo-Random Message Helper ---
const messageCounters = {};
function getPseudoRandomMessage(key, templates) {
    messageCounters[key] = (messageCounters[key] || 0) + 1;
    const messages = templates[key];
    if (!messages || messages.length === 0) return `NO TEMPLATE FOR ${key}`;
    return messages[(messageCounters[key] - 1) % messages.length];
}

// --- Main `getMessage` Function ---
export function getMessage(payload) {
    const { type, source, data, messageKey } = payload || {};
    let messageData = { content: toUnifiedContent(`Unknown message type: ${type}`) };

    switch (type) {
        case 'startup':
            messageData = startupMessages[messageKey || source] || { content: toUnifiedContent(`Unknown startup: ${messageKey || source}`) };
            break;

        case 'block':
            messageData = blockMessages[messageKey || source] || { content: toUnifiedContent(`Unknown block: ${messageKey || source}`) };
            break;
        
        case 'scan':
            const scanConfig = scanSequences[messageKey || source];
            if (scanConfig) {
                // Return the config object itself, unwrapped
                return scanConfig;
            } else {
                // If scan not found, return a printable error message object
                messageData = { content: toUnifiedContent(`Unknown scan: ${messageKey || source}`) };
            }
            break;

        case 'status':
            const statusTemplate = statusMessageTemplates[messageKey || source];
            if (statusTemplate) {
                messageData = typeof statusTemplate === 'function' ? statusTemplate(data) : statusTemplate;
            } else {
                messageData = { content: toUnifiedContent(`Status from ${source || messageKey}: ${JSON.stringify(data)}`) };
            }
            break;

        case 'interaction':
            lastHueAssignTarget = (source !== 'hue_assign' && source !== 'mood_change') ? null : lastHueAssignTarget;
            const templatesForSource = interactionMessageTemplates[source];
            let lines = [`UNKNOWN INTERACTION: ${source}`];

            if (source === 'hue_assign') {
                const verbosityCount = getHueAssignVerbosity(data.target.toLowerCase());
                const level = verbosityCount === 1 ? 'verbose' : (verbosityCount === 2 ? 'concise' : 'terse');
                const templateKey = `${source}_${level}`;
                const template = getPseudoRandomMessage(templateKey, { [templateKey]: templatesForSource[level] });
                const semanticName = getSemanticNameForHue(data.hue);
                lines = (Array.isArray(template) ? template : [template]).map(line =>
                    line.replace('{target}', data.target).replace(/{semanticName}/g, semanticName).replace(/{hue}/g, Math.round(data.hue))
                );
            } else if (source === 'mood_change') {
                const messageParts = getPseudoRandomMessage(source, { [source]: templatesForSource });
                const moods = MOOD_MATRIX_DEFINITIONS;
                const degreesPerBlock = 360 / moods.length;
                const primaryIndex = Math.floor(data.hue / degreesPerBlock);
                const progress = (data.hue % degreesPerBlock) / degreesPerBlock;
                const primaryValue = Math.round(100 - (Math.abs(progress - 0.5) * 200));
                const secondaryIndex = progress < 0.5 ? (primaryIndex - 1 + moods.length) % moods.length : (primaryIndex + 1) % moods.length;
                
                lines = [];
                messageParts.forEach(part => {
                    if (part === "{moodSummary}") {
                        lines.push(`> PRIMARY: ${primaryValue}% ${moods[primaryIndex].toUpperCase()}`, `> SECONDARY: ${100 - primaryValue}% ${moods[secondaryIndex].toUpperCase()}`);
                    } else {
                        lines.push(part);
                    }
                });
            } else if (templatesForSource) {
                const template = getPseudoRandomMessage(source, { [source]: templatesForSource });
                let replaced = template;
                if (source === 'aux_light') replaced = template.replace('{state}', data.state);
                if (source === 'intensity_change') replaced = template.replace('{power}', data.power.toFixed(1));
                lines = [replaced];
            }
            messageData = { content: toUnifiedContent(lines) };
            break;
    }

    const formatting = messageFormattingDefaults[type] || messageFormattingDefaults.default;
    return { ...messageData, formatting };
}