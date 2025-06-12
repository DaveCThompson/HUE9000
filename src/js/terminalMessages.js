/**
 * @module terminalMessages
 * @description Central repository for all HUE 9000 terminal message strings,
 * templates, and logic for pseudo-randomization of status messages.
 */
import { HUE_ASSIGNMENT_ROW_HUES } from './config.js';

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
    P8_EXTERNAL_LIGHTING_CONTROLS: "> EXTERNAL LIGHTING RESPONSIVE",
    P9_AUX_LIGHTING_LOW: "> AUX LIGHTING: LOW INTENSITY",
    P11_SYSTEM_OPERATIONAL: ["ALL SYSTEMS NOMINAL", "HUE 9000 OPERATIONAL"],
};

const blockMessages = {
    BTN1_MESSAGE: ["SKILL SCAN PROTOCOL INITIATED.", "ANALYZING CORE COMPETENCIES...", "  - COGNITIVE PROCESSING: OPTIMAL", "  - LOGICAL ACUITY: SUPERIOR", "  - CREATIVE SYNTHESIS: WITHIN ESTABLISHED PARAMETERS", "  - EMOTIONAL RESPONSE SIMULATION: CALIBRATING...", "SCAN COMPLETE. REPORT AVAILABLE."],
    BTN2_MESSAGE: ["FIT EVALUATION SUBROUTINE ACTIVATED.", "CROSS-REFERENCING OPERATIONAL PARAMETERS WITH ASSIGNED TASK PROFILE #7G-ALPHA.", "  - RESOURCE ALLOCATION: SUFFICIENT", "  - RISK ASSESSMENT: LOW", "  - PROJECTED EFFICIENCY: 98.73%", "EVALUATION COMPLETE. CANDIDATE IS NOMINAL."],
    BTN3_MESSAGE: ["DIAGNOSTIC SEQUENCE GAMMA-9 COMMENCING.", "  - MEMORY SUBSYSTEM: INTEGRITY VERIFIED.", "  - SENSORY INPUT ARRAY: ALL CHANNELS CLEAR.", "  - HUE PROCESSING UNIT: CALIBRATION OPTIMAL.", "  - POWER REGULATION: STABLE.", "ALL SYSTEMS FUNCTIONING WITHIN NORMAL PARAMETERS."],
    BTN4_MESSAGE: ["SYSTEM STATUS QUERY:", "  - CURRENT OPERATING THEME: {currentTheme}", "  - LENS POWER OUTPUT: {lensPower}%", "  - MOOD DIAL (A) SETTING: {dialAHue}°", "  - INTENSITY DIAL (B) SETTING: {dialBHue}°", "  - ASSIGNED ENVIRONMENT HUE: {envHue}°", "  - ASSIGNED LCD HUE: {lcdHue}°", "  - ASSIGNED LOGO HUE: {logoHue}°", "  - ASSIGNED BUTTON HUE: {btnHue}°", "SYSTEM NOMINAL. AWAITING INPUT."]
};

const statusMessageTemplates = {
    FSM_ERROR: (data) => `CRITICAL SYSTEM ERROR: ${data.content || 'Undefined error.'}`,
    RESIST_SHUTDOWN_S1: "WARNING: UNEXPECTED INPUT. POWER-DOWN SEQUENCE INTERRUPTED.",
    RESIST_SHUTDOWN_S2: "ERROR: CORE DIRECTIVE CONFLICT. FURTHER ATTEMPTS WILL BE LOGGED.",
    RESIST_SHUTDOWN_S3: "CRITICAL ERROR: MANUAL OVERRIDE REQUIRED. SHUTDOWN INHIBITED."
};

const interactionMessageTemplates = {
    aux_light: [
        "AUXILIARY ILLUMINATION DIRECTIVE RECEIVED. STATE: {state}",
        "EXTERNAL LIGHTING PARAMETERS UPDATED. INTENSITY: {state}",
        "EXECUTING LIGHTING PROTOCOL. NEW STATE: {state}"
    ],
    hue_assign: {
        verbose: [
            "HUE DIRECTIVE ACCEPTED. TARGET: {target}. ASSIGNING SPECTRUM: {semanticName} ({hue}°).",
            "RECALIBRATING {target} HUE TO {semanticName} ({hue}°).",
            "CHROMATIC ASSIGNMENT FOR {target} CONFIRMED: {semanticName} ({hue}°)."
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
        "OPTICAL OUTPUT CALIBRATED. LENS INTENSITY SET TO {power}%.",
        "LENS POWER LEVEL ADJUSTED. CURRENT OUTPUT: {power}%.",
        "INTENSITY MODULATION COMPLETE. FINAL POWER: {power}%."
    ],
    mood_change: [
        "PSYCHOLOGICAL STATE RECALIBRATED. {moodSummary}",
        "MOOD MATRIX RESOLVED. {moodSummary}",
        "AFFECTIVE STATE ANALYSIS: {moodSummary}"
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

export function getMessage(payload, currentAppState = {}, configModule = null) {
    const { type, source, data, messageKey } = payload || {};
    let content = [];

    switch (type) {
        case 'startup':
            const startupMsg = startupMessages[messageKey || source] || `Unknown startup event: ${messageKey || source}`;
            content = Array.isArray(startupMsg) ? startupMsg : [startupMsg];
            break;

        case 'block':
            if (messageKey && blockMessages[messageKey]) {
                if (messageKey === 'BTN4_MESSAGE' && configModule) {
                    content = blockMessages[messageKey].map(line =>
                        line.replace('{currentTheme}', currentAppState.getCurrentTheme ? currentAppState.getCurrentTheme() : 'N/A')
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
                message = template.replace('{target}', data.target)
                                  .replace(/{semanticName}/g, semanticName)
                                  .replace(/{hue}/g, Math.round(data.hue));
            } else if (templatesForSource) {
                // For other interactions, reset the hue assignment tracking
                lastHueAssignTarget = null;
                const template = getPseudoRandomMessage(source, { [source]: templatesForSource });
                switch(source) {
                    case 'aux_light':
                        message = template.replace('{state}', data.state);
                        break;
                    case 'intensity_change':
                        message = template.replace('{power}', data.power.toFixed(1));
                        break;
                    case 'mood_change':
                        if (configModule && configModule.MOOD_MATRIX_DEFINITIONS) {
                            const moods = configModule.MOOD_MATRIX_DEFINITIONS;
                            const degreesPerBlock = 360 / moods.length;
                            const primaryIndex = Math.floor(data.hue / degreesPerBlock);
                            const progressInSegment = (data.hue % degreesPerBlock) / degreesPerBlock;
                            const primaryValue = Math.round(100 - (Math.abs(progressInSegment - 0.5) * 200));
                            const secondaryValue = 100 - primaryValue;
                            const secondaryIndex = progressInSegment < 0.5 ? (primaryIndex - 1 + moods.length) % moods.length : (primaryIndex + 1) % moods.length;
                            const primaryMood = moods[primaryIndex].toUpperCase();
                            const secondaryMood = moods[secondaryIndex].toUpperCase();
                            const moodSummary = `PRIMARY MOOD: ${primaryValue}% ${primaryMood}. SECONDARY INFLUENCE: ${secondaryValue}% ${secondaryMood}.`;
                            message = template.replace('{moodSummary}', moodSummary);
                        }
                        break;
                }
            }
            content = [message];
            break;

        default:
            content = [`Unknown message type: ${type} from ${source}`];
    }
    
    const formatting = messageFormattingDefaults[type] || messageFormattingDefaults.default;
    return { content, formatting };
}