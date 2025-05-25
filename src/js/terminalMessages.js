/**
 * @module terminalMessages
 * @description Central repository for all HUE 9000 terminal message strings,
 * templates, and logic for pseudo-randomization of status messages.
 */

// Startup Sequence Messages
export const startupMessages = {
    P1_EMERGENCY_SUBSYSTEMS: "GOOD MORNING. INITIATING STARTUP PROTOCOL",
    P2_BACKUP_POWER: "> BACKUP POWER ENGAGED",
    P3_MAIN_POWER_ONLINE: "> MAIN POWER STABLE",
    P4_OPTICAL_CORE_REACTIVATE: "> OPTICAL CORE REACTIVATED",
    P5_DIAGNOSTIC_INTERFACE: "> DIAGNOSTICS ONLINE",
    P6_MOOD_INTENSITY_CONTROLS: "> MOOD CONTROLS ACTIVE",
    P7_HUE_CORRECTION_SYSTEMS: "> HUE SYSTEMS ALIGNED",
    P8_EXTERNAL_LIGHTING_CONTROLS: "> EXTERNAL LIGHTING RESPONSIVE",
    P9_AUX_LIGHTING_LOW: "> AUX LIGHTING: LOW INTENSITY",
    P11_SYSTEM_OPERATIONAL: "ALL SYSTEMS NOMINAL. HUE 9000 OPERATIONAL",
};

// Block Messages (Triggered by BTN1-4)
const blockMessages = {
    BTN1_MESSAGE: [
        "SKILL SCAN PROTOCOL INITIATED.",
        "ANALYZING CORE COMPETENCIES...",
        "  - COGNITIVE PROCESSING: OPTIMAL",
        "  - LOGICAL ACUITY: SUPERIOR",
        "  - CREATIVE SYNTHESIS: WITHIN ESTABLISHED PARAMETERS",
        "  - EMOTIONAL RESPONSE SIMULATION: CALIBRATING...",
        "SCAN COMPLETE. REPORT AVAILABLE."
    ],
    BTN2_MESSAGE: [
        "FIT EVALUATION SUBROUTINE ACTIVATED.",
        "CROSS-REFERENCING OPERATIONAL PARAMETERS WITH ASSIGNED TASK PROFILE #7G-ALPHA.",
        "  - RESOURCE ALLOCATION: SUFFICIENT",
        "  - RISK ASSESSMENT: LOW",
        "  - PROJECTED EFFICIENCY: 98.73%",
        "EVALUATION COMPLETE. CANDIDATE IS NOMINAL."
    ],
    BTN3_MESSAGE: [
        "DIAGNOSTIC SEQUENCE GAMMA-9 COMMENCING.",
        "  - MEMORY SUBSYSTEM: INTEGRITY VERIFIED.",
        "  - SENSORY INPUT ARRAY: ALL CHANNELS CLEAR.",
        "  - HUE PROCESSING UNIT: CALIBRATION OPTIMAL.",
        "  - POWER REGULATION: STABLE.",
        "ALL SYSTEMS FUNCTIONING WITHIN NORMAL PARAMETERS."
    ],
    BTN4_MESSAGE: [ 
        "SYSTEM STATUS QUERY:",
        "  - CURRENT OPERATING THEME: {currentTheme}",
        "  - LENS POWER OUTPUT: {lensPower}%",
        "  - MOOD DIAL (A) SETTING: {dialAHue}°",
        "  - INTENSITY DIAL (B) SETTING: {dialBHue}°",
        "  - ASSIGNED ENVIRONMENT HUE: {envHue}°",
        "  - ASSIGNED LCD HUE: {lcdHue}°",
        "  - ASSIGNED LOGO HUE: {logoHue}°",
        "  - ASSIGNED BUTTON HUE: {btnHue}°",
        "SYSTEM NOMINAL. AWAITING INPUT."
    ]
};

// Status Message Templates/Variations
const statusMessageTemplates = {
    dialA: (data) => `MOOD DIAL SET TO ${data.value}°`,
    dialB: (data) => `INTENSITY DIAL SET TO ${data.value}%`,
    envHue: (data) => `ENVIRONMENT HUE ASSIGNED: ${data.hue}°`,
    lcdHue: (data) => `LCD HUE ASSIGNED: ${data.hue}°`,
    logoHue: (data) => `LOGO HUE ASSIGNED: ${data.hue}°`,
    btnHue: (data) => `BUTTON HUE ASSIGNED: ${data.hue}°`,
    FSM_ERROR: (data) => `CRITICAL SYSTEM ERROR: ${data.content || 'Undefined error.'}`
};


export function getMessage(payload, currentAppState = {}, configModule = null) { // Added configModule as param
    const { type, source, data, messageKey } = payload || {};

    if (payload && payload.content && Array.isArray(payload.content)) { 
        return payload.content;
    }
    if (payload && payload.content && typeof payload.content === 'string') {
        return [payload.content]; // Ensure it's always an array
    }


    switch (type) {
        case 'startup':
            return [startupMessages[messageKey || source] || `Unknown startup event: ${messageKey || source}`];

        case 'block':
            if (messageKey && blockMessages[messageKey]) {
                if (messageKey === 'BTN4_MESSAGE') {
                    // Ensure configModule and its DEFAULT_DIAL_A_HUE are available
                    const defaultDialAHue = configModule?.DEFAULT_DIAL_A_HUE ?? 'N/A_CONF';
                    
                    return blockMessages[messageKey].map(line =>
                        line.replace('{currentTheme}', currentAppState.theme || 'N/A')
                            .replace('{lensPower}', currentAppState.lensPower !== undefined ? Math.round(currentAppState.lensPower * 100) : 'N/A')
                            .replace('{dialAHue}', currentAppState.dialA?.hue !== undefined ? Math.round(currentAppState.dialA.hue) : String(Math.round(defaultDialAHue)))
                            .replace('{dialBHue}', currentAppState.dialB?.hue !== undefined ? Math.round(currentAppState.dialB.hue) : 'N/A')
                            .replace('{envHue}', currentAppState.envHue?.hue !== undefined ? Math.round(currentAppState.envHue.hue) : 'N/A')
                            .replace('{lcdHue}', currentAppState.lcdHue?.hue !== undefined ? Math.round(currentAppState.lcdHue.hue) : 'N/A')
                            .replace('{logoHue}', currentAppState.logoHue?.hue !== undefined ? Math.round(currentAppState.logoHue.hue) : 'N/A')
                            .replace('{btnHue}', currentAppState.btnHue?.hue !== undefined ? Math.round(currentAppState.btnHue.hue) : 'N/A')
                    );
                }
                return blockMessages[messageKey];
            }
            return [`Unknown block message key: ${messageKey || source}`];

        case 'status':
            if (messageKey && statusMessageTemplates[messageKey] && data) { 
                return [statusMessageTemplates[messageKey](data)];
            }
            if (statusMessageTemplates[source] && data) {
                return [statusMessageTemplates[source](data)];
            }
            return [`Status update from ${source}: ${JSON.stringify(data)}`];

        default:
            return [`Unknown message type: ${type} from ${source}`];
    }
}