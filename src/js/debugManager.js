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

// REMOVED: let localDimAttenuationProxy = null;
// REMOVED: let initialCssAttenuationValue = '0.3';

/**
 * Updates the debug panel's phase status display.
 * @param {object} phaseInfo - Information about the current/next phase.
 * Expected structure: { currentPhaseName, status, description, nextPhaseName, nextPhaseDescription }
 */
function updatePhaseDisplay(phaseInfo) {
    const currentStatusDiv = dom.statusDiv; // Use cached DOM element
    const currentPhaseInfoDiv = dom.phaseInfoDiv; // Use cached DOM element

    if (!currentStatusDiv || !currentPhaseInfoDiv) {
        // console.error("[DebugManager updatePhaseDisplay] Critical: DOM elements for status/phaseInfo not found (likely called before init or elements removed).");
        return;
    }

    let statusText = "Phase: Unknown";
    let infoText = "Details unavailable.";

    if (phaseInfo) {
        const currentDesc = phaseInfo.description || phaseInfo.currentPhaseName || "N/A";
        const nextDesc = phaseInfo.nextPhaseDescription || phaseInfo.nextPhaseName || "N/A";

        if (phaseInfo.currentPhaseName === 'Idle' || (phaseInfo.status === 'ready' && phaseInfo.currentPhaseName === 'Idle')) {
            statusText = "Phase: Idle";
            infoText = `Next: ${nextDesc}`;
        } else if (phaseInfo.currentPhaseName === 'sequence_complete' || (phaseInfo.status === 'completed' && phaseInfo.currentPhaseName === 'sequence_complete')) {
            statusText = "Phase: All Complete";
            infoText = "Sequence finished. Reset to start again.";
        } else if (phaseInfo.currentPhaseName === 'ERROR') {
            statusText = `Phase: ERROR (${currentDesc})`;
            infoText = `Error occurred. Check console. Reset to try again.`;
        } else if (phaseInfo.status === 'paused' || (phaseInfo.status === 'completed' && phaseInfo.currentPhaseName !== 'sequence_complete')) {
            // 'completed' for a phase means it's done, and we're ready for the next step (like 'paused')
            statusText = `Done: ${currentDesc}`;
            infoText = `Next: ${nextDesc}`;
        } else if (phaseInfo.status === 'starting') {
            statusText = `Running: ${currentDesc}`;
            infoText = `Awaiting completion... (Next: ${nextDesc})`;
        } else { // Fallback for other statuses or unexpected phaseInfo content
            statusText = `Phase: ${currentDesc}`;
            infoText = `Status: ${phaseInfo.status || 'N/A'}. Next: ${nextDesc}`;
        }
    }

    currentStatusDiv.textContent = statusText;
    currentPhaseInfoDiv.textContent = infoText;
}


function handleNextPhaseClick() {
    if (startupManager) {
        // console.log("[DebugManager] Next Phase button clicked.");
        startupManager.playNextPhase();
    }
}

function handlePlayAllClick() {
    if (startupManager) {
        // console.log("[DebugManager] Play All button clicked.");
        startupManager.start(false); // Pass false for stepMode, no proxy needed
    } else {
        console.warn("[DebugManager handlePlayAllClick] StartupManager not available.");
    }
}

function handleResetSequenceClick() {
    if (startupManager) {
        // console.log("[DebugManager] Reset Sequence button clicked.");
        startupManager.resetSequence(); // No proxy needed
    } else {
        console.warn("[DebugManager handleResetSequenceClick] StartupManager not available.");
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
    // console.log("[DebugManager INIT] Initializing...");
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

    // REMOVED: initialCssAttenuationValue related logic
    // REMOVED: localDimAttenuationProxy creation/storage

    if (!dom.statusDiv || !dom.phaseInfoDiv || !dom.nextPhaseButton || !dom.playAllButton || !dom.resetButton) {
        console.warn("[DebugManager INIT] One or more core debug DOM elements are missing. Debug panel may be non-functional.");
    }

    if (dom.nextPhaseButton) {
        dom.nextPhaseButton.removeEventListener('click', handleNextPhaseClick); // Remove old if any
        dom.nextPhaseButton.addEventListener('click', handleNextPhaseClick);
        setNextPhaseButtonEnabled(true); // Initially enabled
    }
    if (dom.playAllButton) {
        dom.playAllButton.removeEventListener('click', handlePlayAllClick);
        dom.playAllButton.addEventListener('click', handlePlayAllClick);
    }
    if (dom.resetButton) {
        dom.resetButton.removeEventListener('click', handleResetSequenceClick);
        dom.resetButton.addEventListener('click', handleResetSequenceClick);
    }

    if (appState && typeof appState.subscribe === 'function') {
        // console.log("[DebugManager INIT] Subscribing to 'startup:phaseChanged'.");
        if (typeof window.debugManagerPhaseUnsubscriber === 'function') {
            window.debugManagerPhaseUnsubscriber();
        }
        window.debugManagerPhaseUnsubscriber = appState.subscribe('startup:phaseChanged', handleStartupPhaseChanged);
    } else {
        console.warn("[DebugManager INIT] appState or its subscribe method not available. Phase updates won't be received.");
    }

    const initialPhaseInfo = startupManager.getCurrentPhaseInfo ? startupManager.getCurrentPhaseInfo() : { currentPhaseName: 'Idle', status: 'ready', nextPhaseName: 'startupPhase0', description: 'Idle', nextPhaseDescription: 'P0: Baseline Setup' };
    updatePhaseDisplay(initialPhaseInfo);

    // console.log("[DebugManager INIT] Initialization complete.");
    // REMOVED: return { dimAttenuationProxy: localDimAttenuationProxy };
}