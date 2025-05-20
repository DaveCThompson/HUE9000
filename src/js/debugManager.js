/**
 * @module debugManager
 * @description Manages UI elements and logic for debugging the application,
 * particularly the startup sequence.
 */

let startupManager = null;
let dom = { // Store references obtained during init
    statusDiv: null,
    phaseInfoDiv: null,
    nextPhaseButton: null,
    playAllButton: null,
    resetButton: null
};
let appState = null; // Optional, if direct appState interaction is needed

const dimAttenuationProxy = { value: 0.3 }; 
let initialCssAttenuationValue = '0.3'; 

/**
 * Updates the debug panel's phase status display.
 * @param {object} phaseInfo - Information about the current/next phase.
 */
function updatePhaseDisplay(phaseInfo) {
    const currentStatusDiv = document.getElementById('debug-phase-status');
    const currentPhaseInfoDiv = document.getElementById('debug-phase-info');

    if (!currentStatusDiv || !currentPhaseInfoDiv) {
        console.error("[DebugManager updatePhaseDisplay] Critical: DOM elements for status/phaseInfo not found at render time!");
        return;
    }

    let statusText = "";
    let infoText = "";
    
    if (!phaseInfo || typeof phaseInfo.status !== 'string' || typeof phaseInfo.currentPhaseName !== 'string') {
        console.warn("[DebugManager updatePhaseDisplay] Received incomplete or malformed phaseInfo:", phaseInfo);
        statusText = currentStatusDiv.textContent; 
        infoText = currentPhaseInfoDiv.textContent; 
    } else if (phaseInfo.currentPhaseName === 'Idle' || phaseInfo.status === 'ready') {
        statusText = "Phase: Idle";
        infoText = `Next: ${phaseInfo.nextPhaseDescription || phaseInfo.nextPhaseName || 'Initial Step'}`;
    } else if (phaseInfo.currentPhaseName === 'sequence_complete') {
        statusText = "Phase: All Complete";
        infoText = "Sequence finished. Reset to start again.";
    } else if (phaseInfo.status === 'completed') {
        statusText = `Done: ${phaseInfo.description || phaseInfo.currentPhaseName}`;
        infoText = `Next: ${phaseInfo.nextPhaseDescription || phaseInfo.nextPhaseName || 'N/A'}`;
    } else if (phaseInfo.status === 'starting') {
        statusText = `Running: ${phaseInfo.description || phaseInfo.currentPhaseName}`;
        infoText = `Awaiting completion... (Next: ${phaseInfo.nextPhaseDescription || phaseInfo.nextPhaseName || 'N/A'})`;
    } else {
        statusText = `Phase: Error (${phaseInfo.currentPhaseName || 'N/A'})`;
        infoText = `Status: ${phaseInfo.status || 'N/A'}`;
    }
    
    const oldStatusDOMText = currentStatusDiv.textContent;
    currentStatusDiv.textContent = statusText; 

    if (oldStatusDOMText !== statusText) {
        // console.log(`[DebugManager updatePhaseDisplay] Status Update: Target="${statusText}", OldDOM="${oldStatusDOMText}", NewDOMReadback="${currentStatusDiv.textContent}"`);
    } else if (statusText !== currentStatusDiv.textContent) {
        // console.warn(`[DebugManager updatePhaseDisplay] Status Mismatch: Target="${statusText}", OldDOM="${oldStatusDOMText}", NewDOMReadback="${currentStatusDiv.textContent}" (Assignment might have failed or was reverted)`);
    }

    const oldInfoDOMText = currentPhaseInfoDiv.textContent;
    currentPhaseInfoDiv.textContent = infoText; 

    if (oldInfoDOMText !== infoText) {
        // console.log(`[DebugManager updatePhaseDisplay] Info Update: Target="${infoText}", OldDOM="${oldInfoDOMText}", NewDOMReadback="${currentPhaseInfoDiv.textContent}"`);
    } else if (infoText !== currentPhaseInfoDiv.textContent) {
        // console.warn(`[DebugManager updatePhaseDisplay] Info Mismatch: Target="${infoText}", OldDOM="${oldInfoDOMText}", NewDOMReadback="${currentPhaseInfoDiv.textContent}" (Assignment might have failed or was reverted)`);
    }
}


function handleNextPhaseClick() {
    if (startupManager) {
        startupManager.playNextPhase();
    }
}

function handlePlayAllClick() {
    if (startupManager) {
        // When playing all, dimAttenuationProxy should be reset to its initial value for P1
        dimAttenuationProxy.value = parseFloat(initialCssAttenuationValue); 
        startupManager.start(false, dimAttenuationProxy);
    }
}

function handleResetSequenceClick() {
    if (startupManager) {
        dimAttenuationProxy.value = parseFloat(initialCssAttenuationValue);
        startupManager.resetSequence(dimAttenuationProxy);
    }
}

function handleStartupPhaseChanged(phaseInfo) {
    // console.log("[DebugManager handleStartupPhaseChanged] Received phaseInfo:", JSON.parse(JSON.stringify(phaseInfo))); 
    updatePhaseDisplay(phaseInfo);
}

export function setNextPhaseButtonEnabled(isEnabled) {
    if (dom.nextPhaseButton) {
        dom.nextPhaseButton.disabled = !isEnabled;
        // console.log(`[DebugManager setNextPhaseButtonEnabled] Next Phase button ${isEnabled ? 'enabled' : 'disabled'}.`);
    }
}

export function init(config) {
    console.log("[DebugManager INIT] Initializing...");
    if (!config.startupSequenceManager) throw new Error("StartupSequenceManager not provided to DebugManager.");
    if (!config.domElements) throw new Error("DOM elements for debug controls not provided to DebugManager.");
    
    startupManager = config.startupSequenceManager;
    appState = config.appState; 

    dom.statusDiv = config.domElements.debugStatusDiv;
    dom.phaseInfoDiv = config.domElements.debugPhaseInfoDiv;
    dom.nextPhaseButton = config.domElements.nextPhaseButton;
    dom.playAllButton = config.domElements.playAllButton;
    dom.resetButton = config.domElements.resetButton;

    if (!dom.statusDiv) console.error("[DebugManager INIT] config.domElements.debugStatusDiv is null!");
    if (!dom.phaseInfoDiv) console.error("[DebugManager INIT] config.domElements.debugPhaseInfoDiv is null!");
    
    initialCssAttenuationValue = config.initialAttenuationValue || '0.3';
    dimAttenuationProxy.value = parseFloat(initialCssAttenuationValue); 

    if (!dom.statusDiv || !dom.phaseInfoDiv || !dom.nextPhaseButton || !dom.playAllButton || !dom.resetButton) {
        console.warn("[DebugManager INIT] One or more core debug DOM elements are missing. Debug panel may be non-functional.");
    }

    if (dom.nextPhaseButton) {
        dom.nextPhaseButton.addEventListener('click', handleNextPhaseClick);
        setNextPhaseButtonEnabled(true); // Initially enabled
    }
    if (dom.playAllButton) dom.playAllButton.addEventListener('click', handlePlayAllClick);
    if (dom.resetButton) dom.resetButton.addEventListener('click', handleResetSequenceClick);

    if (appState && typeof appState.subscribe === 'function') {
        // console.log("[DebugManager INIT] Subscribing to 'startup:phaseChanged'.");
        appState.subscribe('startup:phaseChanged', handleStartupPhaseChanged);
    } else {
        console.warn("[DebugManager INIT] appState or its subscribe method not available. Phase updates won't be received.");
    }
    
    const initialPhaseInfo = startupManager.getCurrentPhaseInfo ? startupManager.getCurrentPhaseInfo() : { currentPhaseName: 'Idle', status: 'ready', nextPhaseName: 'P0_Baseline', description: 'Idle', nextPhaseDescription: 'P0: Baseline Setup' };
    
    updatePhaseDisplay(initialPhaseInfo);

    console.log("[DebugManager INIT] Initialization complete.");
    return { dimAttenuationProxy }; 
}