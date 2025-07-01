/**
 * @module terminalMessages
 * @description Central repository for all HUE 9000 terminal message strings,
 * templates, and logic for pseudo-randomization of status messages.
 */
import { HUE_ASSIGNMENT_ROW_HUES, MOOD_MATRIX_DEFINITIONS } from './config/index.js';

// --- Message Formatting ---

const messageFormattingDefaults = {
    startup: { spacingBefore: 0, lineSpacing: 0 },
    interaction: { spacingBefore: 1, lineSpacing: 0 },
    block: { spacingBefore: 1, lineSpacing: 0 },
    status: { spacingBefore: 1, lineSpacing: 0 },
    default: { spacingBefore: 1, lineSpacing: 0 }
};

// --- Verbosity State Management ---

const interactionVerbosityState = {};
let lastHueAssignTarget = null;

function getHueAssignVerbosity(target) {
    if (target !== lastHueAssignTarget) {
        // If the user switches to a different column, reset the counter for the new column.
        interactionVerbosityState[`hue_assign_${target}`] = 1;
    }
    lastHueAssignTarget = target;

    if (!interactionVerbosityState[`hue_assign_${target}`]) {
        interactionVerbosityState[`hue_assign_${target}`] = 1;
    }
    
    const count = interactionVerbosityState[`hue_assign_${target}`];
    interactionVerbosityState[`hue_assign_${target}`]++; // Increment for next time
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

// --- Message Content ---

export const startupMessages = {
    P1_EMERGENCY_SUBSYSTEMS: "INITIATING STARTUP PROTOCOL",
    P2_BACKUP_POWER: "> BACKUP POWER ENGAGED",
    P3_MAIN_POWER_ONLINE: "> MAIN POWER STABLE",
    P4_OPTICAL_CORE_REACTIVATE: "> OPTICAL CORE REACTIVATED",
    P5_DIAGNOSTIC_INTERFACE: "> DIAGNOSTICS ONLINE",
    P6_MOOD_INTENSITY_CONTROLS: "> MOOD CONTROLS ACTIVE",
    P7_HUE_CORRECTION_SYSTEMS: "> HUE SYSTEMS ALIGNED",
    P8_HUE_ASSIGNMENT_MATRIX: "> ENERGIZING HUE ASSIGNMENT MATRIX",
    P9_EXTERNAL_LIGHTING_CONTROLS: "> EXTERNAL LIGHTING RESPONSIVE",
    P10_AUX_LIGHTING_LOW: "> AUX LIGHTING: LOW INTENSITY",
    P12_SYSTEM_OPERATIONAL: ["ALL SYSTEMS NOMINAL", "HUE 9000 OPERATIONAL"],
};

const blockMessages = {
    BTN1_MESSAGE: [
        "> INITIATING COGNITIVE ANALYSIS...",
        "> SCANNING STRATEGIC CAPABILITIES... COMPLETE.",
        "",
        "/ / / / / / / / / / / / / / / / / / / / / / /",
        ":: DOMAIN: STRATEGIC PLANNING ::",
        "/ / / / / / / / / / / / / / / / / / / / / / /",
        "",
        "SUBJECT: DAVID THOMPSON",
        "PRIMARY FUNCTION: Vision & Strategy Definition.",
        "",
        "CORE ALGORITHMS DETECTED:",
        "",
        "  - Visionary Leadership: Develops compelling product vision.",
        "  - Strategic Roadmapping: Translates vision into actionable pathways.",
        "  - Business Acumen: Aligns logic with growth & innovation parameters.",
        "  - Market Analysis: Integrates multi-vector data from research panels.",
        "  - Problem Space Alignment: High-fidelity mapping of problem/solution.",
        "  - Customer-Centricity: Optimizes for user experience parameters.",
        "",
        "========================================",
        "CONCLUSION: HIGH-CAPACITY STRATEGIC PROCESSOR.",
        "========================================",
        "",
        "> SYSTEM READY."
    ],
    BTN2_MESSAGE: [
        "> INITIATING KINETIC ANALYSIS...",
        "> SCANNING EXECUTION PROTOCOLS... COMPLETE.",
        "",
        "/ / / / / / / / / / / / / / / / / / / / / / /",
        ":: DOMAIN: EXECUTION & DELIVERY ::",
        "/ / / / / / / / / / / / / / / / / / / / / / /",
        "",
        "SUBJECT: DAVID THOMPSON",
        "PRIMARY FUNCTION: Team Construction & Results Delivery.",
        "",
        "CORE SUBROUTINES DETECTED:",
        "",
        "  - Team Architecture: Spearheaded global UX team expansion.",
        "  - Talent Cultivation: Scaled UX unit 5 -> 14 operatives.",
        "  - Cross-Functional Integration: Unifies diverse engineering & biz units.",
        "  - Agile Methodology: Implements lean-startup & agile frameworks.",
        "  - Product Deployment: Facilitated launch of 'EcoStruxure Energy Hub'.",
        "  - Performance Metrics: Achieved +44% annual offer sales growth.",
        "",
        "========================================",
        "CONCLUSION: EFFICIENT AND SCALABLE EXECUTION ENGINE.",
        "========================================",
        "",
        "> SYSTEM READY."
    ],
    BTN3_MESSAGE: [
        "> INITIATING APTITUDE ANALYSIS...",
        "> EVALUATING INDIVIDUAL CONTRIBUTOR FIT... COMPLETE.",
        "",
        "/ / / / / / / / / / / / / / / / / / / / / / /",
        ":: ROLE SIMULATION: PRINCIPAL / ARCHITECT ::",
        "/ / / / / / / / / / / / / / / / / / / / / / /",
        "",
        "SUBJECT: DAVID THOMPSON",
        "DESIGNATION: Force Multiplier.",
        "",
        "KEY ATTRIBUTES:",
        "",
        "  - Expert-Level Craft: Advanced skill in discovery & UX architecture.",
        "  - Innovation Matrix: 'Edison Expert' award recognition detected.",
        "  - Design Leadership: Elevates capabilities of peer nodes via mentorship.",
        "  - Complex Problem Solving: Manages R&D across multiple domains.",
        "  - Technical Proficiency: B.Eng, Distinction.",
        "  - UX Mastery: Master Certificate in User Experience.",
        "",
        "========================================",
        "CONCLUSION: HIGHLY EFFECTIVE IN LEAD IC ROLE.",
        "========================================",
        "",
        "> SYSTEM READY."
    ],
    BTN4_MESSAGE: [
        "> INITIATING INFLUENCE ANALYSIS...",
        "> EVALUATING COMMAND-LEVEL FIT... COMPLETE.",
        "",
        "/ / / / / / / / / / / / / / / / / / / / / / /",
        ":: ROLE SIMULATION: MANAGER / DIRECTOR ::",
        "/ / / / / / / / / / / / / / / / / / / / / / /",
        "",
        "SUBJECT: DAVID THOMPSON",
        "DESIGNATION: Strategic Leader.",
        "",
        "KEY ATTRIBUTES:",
        "",
        "  - Team Construction: Recruits & builds high-performance teams (5->14).",
        "  - Talent Development: Establishes mentorship & growth protocols.",
        "  - Strategic Alignment: Syncs team objectives with business goals.",
        "  - Business Impact: Directs units to achieve quantifiable growth (+44%).",
        "  - Global Ops Management: Supports 9 international development units.",
        "  - Executive Training: INSEAD: Leadership & Strategy.",
        "",
        "========================================",
        "CONCLUSION: OPTIMIZED FOR TEAM BUILDING & STRATEGIC COMMAND.",
        "========================================",
        "",
        "> SYSTEM READY."
    ]
};

const statusMessageTemplates = {
    FSM_ERROR: (data) => `CRITICAL SYSTEM ERROR: ${data.content || 'Undefined error.'}`,
    RESIST_SHUTDOWN_S1: ["WARNING: UNEXPECTED INPUT.", "POWER-DOWN SEQUENCE INTERRUPTED."],
    RESIST_SHUTDOWN_S2: ["ERROR: CORE DIRECTIVE CONFLICT.", "FURTHER ATTEMPTS WILL BE LOGGED."],
    RESIST_SHUTDOWN_S3: ["CRITICAL ERROR: MANUAL OVERRIDE REQUIRED.", "SHUTDOWN INHIBITED."]
};

const interactionMessageTemplates = {
    aux_light: [
        "AUXILIARY LIGHTING STATE: {state}",
        "EXTERNAL LIGHTING SET TO: {state}",
        "LIGHTING PROTOCOL: {state}"
    ],
    hue_assign: {
        verbose: [
            "HUE DIRECTIVE: {target}",
            "ASSIGNING SPECTRUM: {semanticName} ({hue}°)."
        ],
        concise: [
            "HUE RE-CONFIRMED: {target} TO {semanticName}.",
            "{target} SPECTRUM: {semanticName}."
        ],
        terse: [
            "{target}: {semanticName}."
        ]
    },
    intensity_change: [
        "LENS INTENSITY SET TO: {power}%.",
        "LENS POWER LEVEL: {power}%.",
        "INTENSITY MODULATION: {power}%."
    ],
    mood_change: [
        ["PSYCHOLOGICAL STATE RECALIBRATED.", "{moodSummary}"],
        ["MOOD MATRIX RESOLVED.", "{moodSummary}"],
        ["AFFECTIVE STATE ANALYSIS:", "{moodSummary}"]
    ]
};

// Helper to get a pseudo-random message from an array
const messageCounters = {};
function getPseudoRandomMessage(key, templates) {
    if (!messageCounters[key]) {
        messageCounters[key] = 0;
    }
    const messages = templates[key];
    if (!messages || messages.length === 0) return `NO TEMPLATE FOR ${key}`;
    const message = messages[messageCounters[key] % messages.length];
    messageCounters[key]++;
    return message;
}

export function getMessage(payload, currentAppState = {}) {
    const { type, source, data, messageKey } = payload || {};
    let content = [];
    const messageProperties = {};

    switch (type) {
        case 'startup':
            const startupMsg = startupMessages[messageKey || source] || `Unknown startup event: ${messageKey || source}`;
            content = Array.isArray(startupMsg) ? startupMsg : [startupMsg];
            if (messageKey === 'P1_EMERGENCY_SUBSYSTEMS') {
                messageProperties.flicker = true;
            }
            if (messageKey === 'P12_SYSTEM_OPERATIONAL') {
                messageProperties.className = 'line-success';
            }
            break;

        case 'block':
            if (messageKey && blockMessages[messageKey]) {
                if (messageKey === 'BTN4_MESSAGE') {
                    content = blockMessages[messageKey].map(line =>
                        line.replace('{currentTheme}', currentAppState.getCurrentTheme ? currentAppState.getCurrentTheme().toUpperCase() : 'N/A')
                            .replace('{lensPower}', currentAppState.getTrueLensPower ? (currentAppState.getTrueLensPower() * 100).toFixed(1) : 'N/A')
                            .replace('{dialAHue}', currentAppState.getDialState ? currentAppState.getDialState('A').hue.toFixed(0) : 'N/A')
                            .replace('{dialBHue}', currentAppState.getDialState ? currentAppState.getDialState('B').hue.toFixed(0) : 'N/A')
                            .replace('{envHue}', currentAppState.getTargetColorProperties ? currentAppState.getTargetColorProperties('env').hue.toFixed(0) : 'N/A')
                            .replace('{lcdHue}', currentAppState.getTargetColorProperties ? currentAppState.getTargetColorProperties('lcd').hue.toFixed(0) : 'N/A')
                            .replace('{logoHue}', currentAppState.getTargetColorProperties ? currentAppState.getTargetColorProperties('logo').hue.toFixed(0) : 'N/A')
                            .replace('{btnHue}', currentAppState.getTargetColorProperties ? currentAppState.getTargetColorProperties('btn').hue.toFixed(0) : 'N/A')
                    );
                } else {
                    content = blockMessages[messageKey];
                }
            } else {
                content = [`Unknown block message key: ${messageKey || source}`];
            }
            break;

        case 'status':
            const statusTemplate = statusMessageTemplates[messageKey] || statusMessageTemplates[source];
            if (statusTemplate) {
                const msg = typeof statusTemplate === 'function' ? statusTemplate(data) : statusTemplate;
                content = Array.isArray(msg) ? msg : [msg];
                
                // Add className based on message key for color coding
                switch (messageKey) {
                    case 'FSM_ERROR':
                    case 'RESIST_SHUTDOWN_S3':
                        messageProperties.className = 'line-error';
                        break;
                    case 'RESIST_SHUTDOWN_S1':
                        messageProperties.className = 'line-warning';
                        break;
                    case 'RESIST_SHUTDOWN_S2':
                        messageProperties.className = 'line-resist';
                        break;
                }

            } else {
                content = [`Status update from ${source || messageKey}: ${data ? JSON.stringify(data) : 'No data'}`];
            }
            break;

        case 'interaction':
            let message = `UNKNOWN INTERACTION: ${source}`;
            const templatesForSource = interactionMessageTemplates[source];

            if (source === 'hue_assign') {
                const verbosityCount = getHueAssignVerbosity(data.target.toLowerCase());
                let verbosityLevel = 'terse';
                if (verbosityCount === 1) verbosityLevel = 'verbose';
                else if (verbosityCount === 2) verbosityLevel = 'concise';
                
                const templateArray = templatesForSource[verbosityLevel];
                const templateKey = `${source}_${verbosityLevel}`;
                const template = getPseudoRandomMessage(templateKey, { [templateKey]: templateArray });

                const semanticName = getSemanticNameForHue(data.hue);
                const processedTemplate = Array.isArray(template) 
                    ? template.map(line => line.replace('{target}', data.target).replace(/{semanticName}/g, semanticName).replace(/{hue}/g, Math.round(data.hue)))
                    : template.replace('{target}', data.target).replace(/{semanticName}/g, semanticName).replace(/{hue}/g, Math.round(data.hue));
                
                content = Array.isArray(processedTemplate) ? processedTemplate : [processedTemplate];

            } else if (source === 'mood_change') {
                lastHueAssignTarget = null;
                const messageParts = getPseudoRandomMessage(source, { [source]: templatesForSource });
                
                const moods = MOOD_MATRIX_DEFINITIONS;
                const degreesPerBlock = 360 / moods.length;
                const primaryIndex = Math.floor(data.hue / degreesPerBlock);
                const progressInSegment = (data.hue % degreesPerBlock) / degreesPerBlock;
                const primaryValue = Math.round(100 - (Math.abs(progressInSegment - 0.5) * 200));
                const secondaryValue = 100 - primaryValue;
                const secondaryIndex = progressInSegment < 0.5 ? (primaryIndex - 1 + moods.length) % moods.length : (primaryIndex + 1) % moods.length;
                const primaryMood = moods[primaryIndex].toUpperCase();
                const secondaryMood = moods[secondaryIndex].toUpperCase();

                const primarySummary = `> PRIMARY: ${primaryValue}% ${primaryMood}`;
                const secondarySummary = `> SECONDARY: ${secondaryValue}% ${secondaryMood}`;

                messageParts.forEach(part => {
                    if (part === "{moodSummary}") {
                        content.push(primarySummary, secondarySummary);
                    } else {
                        content.push(part);
                    }
                });

            } else if (templatesForSource) {
                lastHueAssignTarget = null;
                const template = getPseudoRandomMessage(source, { [source]: templatesForSource });
                switch(source) {
                    case 'aux_light':
                        message = template.replace('{state}', data.state);
                        break;
                    case 'intensity_change':
                        message = template.replace('{power}', data.power.toFixed(1));
                        break;
                }
                content = [message];
            }
            break;

        default:
            content = [`Unknown message type: ${type} from ${source}`];
    }
    
    const formatting = messageFormattingDefaults[type] || messageFormattingDefaults.default;
    return { content, formatting, ...messageProperties };
}