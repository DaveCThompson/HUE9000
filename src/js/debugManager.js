/**
 * @module debugManager
 * @description Manages UI elements and logic for debugging the application,
 * particularly the startup sequence. (Project Decouple Refactor)
 */
import { serviceLocator } from './serviceLocator.js';

let startupManager = null;
let dom = {};

function updatePhaseDisplay(phaseInfo) {
    if (!dom.statusDiv || !dom.phaseInfoDiv) return;
    dom.statusDiv.textContent = `Phase: ${phaseInfo.currentPhaseName} (${phaseInfo.status})`;
    dom.phaseInfoDiv.textContent = `Next: ${phaseInfo.nextPhaseName || 'None'}`;
}

function handleNextPhaseClick() {
    if (startupManager) startupManager.playNextPhase();
}

function handlePlayAllClick() {
    if (startupManager) startupManager.playAllRemaining();
}

function handleResetSequenceClick() {
    if (startupManager) startupManager.resetSequence();
}

function handleStartupPhaseChanged(phaseInfo) {
    updatePhaseDisplay(phaseInfo);
}

export function setNextPhaseButtonEnabled(isEnabled) {
    if (dom.nextPhaseButton) {
        dom.nextPhaseButton.disabled = !isEnabled;
    }
}

export function init(config) {
    startupManager = serviceLocator.get('startupSequenceManager');
    const appState = serviceLocator.get('appState');

    dom = {
        statusDiv: config.debugStatusDiv,
        phaseInfoDiv: config.debugPhaseInfo,
        nextPhaseButton: config.nextPhaseButton,
        playAllButton: config.playAllButton,
        resetButton: config.resetButton
    };

    if (dom.nextPhaseButton) dom.nextPhaseButton.addEventListener('click', handleNextPhaseClick);
    if (dom.playAllButton) dom.playAllButton.addEventListener('click', handlePlayAllClick);
    if (dom.resetButton) dom.resetButton.addEventListener('click', handleResetSequenceClick);

    appState.subscribe('startup:phaseChanged', handleStartupPhaseChanged);

    // Set initial display
    updatePhaseDisplay({
        currentPhaseName: 'Idle',
        status: 'ready',
        nextPhaseName: 'IDLE_BASELINE'
    });
    setNextPhaseButtonEnabled(true);
}