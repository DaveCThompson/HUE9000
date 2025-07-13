/**
 * @module state/appState (REFACTOR-V2.3 - Command Bus)
 * @description Manages the central application state and acts as the Command Bus.
 * UI components dispatch actions here, which are then broadcast to the ActionHandler.
 */
import { HUE_ASSIGNMENT_ROW_HUES, DEFAULT_ASSIGNMENT_SELECTIONS, DEFAULT_DIAL_A_HUE } from '../config/index.js';
import { EventEmitter } from '../EventEmitter.js';

const DEBUG_APP_STATE = false; // Global debug flag for appState logging

const emitter = new EventEmitter();

// --- Central State Object ---
const state = {
    dials: {
        A: { id: 'A', hue: DEFAULT_DIAL_A_HUE, rotation: 0, targetHue: DEFAULT_DIAL_A_HUE, targetRotation: 0, isDragging: false },
        B: { id: 'B', hue: 0, rotation: 0, targetHue: 0, targetRotation: 0, isDragging: false }
    },
    targetColorProps: {
        env: { hue: HUE_ASSIGNMENT_ROW_HUES[DEFAULT_ASSIGNMENT_SELECTIONS.env], isColorless: HUE_ASSIGNMENT_ROW_HUES[DEFAULT_ASSIGNMENT_SELECTIONS.env] === HUE_ASSIGNMENT_ROW_HUES[0] },
        lcd: { hue: HUE_ASSIGNMENT_ROW_HUES[DEFAULT_ASSIGNMENT_SELECTIONS.lcd], isColorless: HUE_ASSIGNMENT_ROW_HUES[DEFAULT_ASSIGNMENT_SELECTIONS.lcd] === HUE_ASSIGNMENT_ROW_HUES[0] },
        logo: { hue: HUE_ASSIGNMENT_ROW_HUES[DEFAULT_ASSIGNMENT_SELECTIONS.logo], isColorless: HUE_ASSIGNMENT_ROW_HUES[DEFAULT_ASSIGNMENT_SELECTIONS.logo] === HUE_ASSIGNMENT_ROW_HUES[0] },
        btn: { hue: HUE_ASSIGNMENT_ROW_HUES[DEFAULT_ASSIGNMENT_SELECTIONS.btn], isColorless: HUE_ASSIGNMENT_ROW_HUES[DEFAULT_ASSIGNMENT_SELECTIONS.btn] === HUE_ASSIGNMENT_ROW_HUES[0] }
    },
    currentTheme: 'dim',
    currentTrueLensPower: 0.0,
    dialBInteractionState: 'idle',
    appStatus: 'loading',
    currentStartupPhaseNumber: -1,
    isAudioMuted: false,
    isHapticsEnabled: true,
    resistiveShutdownStage: 0,
    isMainPowerOffButtonDisabled: false,
    isMobileTerminalOpen: false,
    hasUnreadTerminalMessages: false
};

// --- Command Bus (NEW) ---
/**
 * Dispatches a user intent (action) to the system.
 * This is the primary entry point for all UI components to trigger changes.
 * @param {object} action - A standardized action object, typically from actions.js.
 */
export function dispatch(action) {
    if (!action || typeof action.type !== 'string') {
        console.error('[AppState DISPATCH] Invalid action object. Must have a `type` property.', action);
        return;
    }
    if (DEBUG_APP_STATE) {
        console.log(`%c[AppState DISPATCH] Action: '${action.type}'`, 'color: #4CAF50; font-weight: bold;', action.payload || '');
    }
    emitter.emit('actionDispatched', action);
}

// --- Emitter (for internal state changes) ---
// This `emit` function is now intended for *internal* use within the AppState module
// and by the ActionHandler to signal derived state changes or side effects.
export function emit(eventName, payload) {
    if (DEBUG_APP_STATE) {
        let payloadSummary = payload;
        if (payload && typeof payload === 'object' && Object.keys(payload).length > 3) {
            payloadSummary = `{ ${Object.keys(payload).join(', ')}, ... }`;
        }
        // Uncomment below for verbose emit logging
        // console.log(`[AppState EMIT] Event: '${eventName}'. Payload:`, payloadSummary !== undefined ? payloadSummary : 'N/A', payload !== undefined && payloadSummary !== payload ? { fullPayload: payload } : '');
    }
    emitter.emit(eventName, payload);
}

// --- State Getter Functions (Unchanged) ---
export function getDialState(dialId) {
    const dial = state.dials[dialId];
    if (!dial) return undefined;
    return { ...dial };
}
export function getTargetColorProperties(targetKey) {
    const props = state.targetColorProps[targetKey];
    if (!props) return undefined;
    return { ...props };
}
export function getCurrentTheme() { return state.currentTheme; }
export function getTrueLensPower() { return state.currentTrueLensPower; }
export function getDialBInteractionState() { return state.dialBInteractionState; }
export function getAppStatus() { return state.appStatus; }
export function getCurrentStartupPhaseNumber() { return state.currentStartupPhaseNumber; }
export function getResistiveShutdownStage() { return state.resistiveShutdownStage; }
export function getIsMainPowerOffButtonDisabled() { return state.isMainPowerOffButtonDisabled; }
export function getIsAudioMuted() { return state.isAudioMuted; }
export function getIsHapticsEnabled() { return state.isHapticsEnabled; }
export function getIsMobileTerminalOpen() { return state.isMobileTerminalOpen; }
export function getHasUnreadTerminalMessages() { return state.hasUnreadTerminalMessages; }
export function getEntireState() {
    return JSON.parse(JSON.stringify(state));
}

// --- State Setter Functions (Unchanged, but now primarily called by ActionHandler) ---
// These setters are exposed for the ActionHandler to directly manipulate state.
// Other modules should use `dispatch` to request state changes.
export function updateDialState(dialId, newState) {
    const dial = state.dials[dialId];
    if (!dial) return;
    const oldState = { ...dial };
    Object.assign(dial, newState);
    const hasRelevantChange = oldState.hue !== dial.hue ||
                              oldState.rotation !== dial.rotation ||
                              oldState.isDragging !== dial.isDragging ||
                              oldState.targetHue !== dial.targetHue ||
                              oldState.targetRotation !== dial.targetRotation;
    if (hasRelevantChange) {
        emit('dialUpdated', { id: dialId, state: { ...dial } });
    }
}
export function setTargetColorProperties(targetKey, hueFromGrid) {
    if (!state.targetColorProps.hasOwnProperty(targetKey)) return;
    const normalizedHue = hueFromGrid === null ? 0 : ((Number(hueFromGrid) % 360) + 360) % 360;
    const isColorless = (HUE_ASSIGNMENT_ROW_HUES.length > 0 && normalizedHue === HUE_ASSIGNMENT_ROW_HUES[0]);
    const currentProps = state.targetColorProps[targetKey];
    if (currentProps.hue !== normalizedHue || currentProps.isColorless !== isColorless) {
        currentProps.hue = normalizedHue;
        currentProps.isColorless = isColorless;
        emit('targetColorChanged', { targetKey, hue: normalizedHue, isColorless });
    }
}
export function setTheme(theme) {
    if (!['dim', 'dark', 'light'].includes(theme)) return;
    if (state.currentTheme !== theme) {
        state.currentTheme = theme;
        emit('themeChanged', state.currentTheme);
    }
}
export function setTrueLensPower(powerPercentage) {
    if (typeof powerPercentage !== 'number') return;
    const newPower01 = Math.max(0, Math.min(powerPercentage / 100, 1.0));
    if (Math.abs(state.currentTrueLensPower - newPower01) > 0.0001) {
        state.currentTrueLensPower = newPower01;
        emit('trueLensPowerChanged', state.currentTrueLensPower);
    }
}
export function setDialBInteractionState(newState) {
    if (!['idle', 'dragging', 'settling'].includes(newState)) return;
    if (state.dialBInteractionState !== newState) {
        state.dialBInteractionState = newState;
        emit('dialBInteractionChange', state.dialBInteractionState);
    }
}
export function setAppStatus(newStatus) {
    if (!['loading', 'starting-up', 'interactive', 'error'].includes(newStatus)) return;
    if (state.appStatus !== newStatus) {
        state.appStatus = newStatus;
        emit('appStatusChanged', state.appStatus);
    }
}
export function setCurrentStartupPhaseNumber(phaseNumber) {
    if (typeof phaseNumber !== 'number') return;
    if (state.currentStartupPhaseNumber !== phaseNumber) {
        state.currentStartupPhaseNumber = phaseNumber;
        emit('startupPhaseNumberChanged', state.currentStartupPhaseNumber);
    }
}
export function setResistiveShutdownStage(newStage) {
    if (typeof newStage !== 'number') return;
    if (state.resistiveShutdownStage !== newStage) {
        const oldStage = state.resistiveShutdownStage;
        state.resistiveShutdownStage = newStage;
        emit('resistiveShutdownStageChanged', { oldStage, newStage });
    }
}
export function setIsMainPowerOffButtonDisabled(isDisabled) {
    if (typeof isDisabled !== 'boolean') return;
    if (state.isMainPowerOffButtonDisabled !== isDisabled) {
        state.isMainPowerOffButtonDisabled = isDisabled;
        emit('mainPowerOffButtonDisabledChanged', { isDisabled });
    }
}
export function setIsAudioMuted(isMuted) {
    if (typeof isMuted !== 'boolean') return;
    if (state.isAudioMuted !== isMuted) {
        state.isAudioMuted = isMuted;
        emit('audioMuteChanged', { isMuted });
    }
}
export function setIsHapticsEnabled(isEnabled) {
    if (typeof isEnabled !== 'boolean') return;
    if (state.isHapticsEnabled !== isEnabled) {
        state.isHapticsEnabled = isEnabled;
        emit('hapticsEnabledChanged', { isEnabled });
    }
}
export function setIsMobileTerminalOpen(isOpen) {
    if (typeof isOpen !== 'boolean') return;
    if (state.isMobileTerminalOpen !== isOpen) {
        state.isMobileTerminalOpen = isOpen;
        emit('mobileTerminalStateChanged', { isOpen });
    }
}
export function setHasUnreadTerminalMessages(hasUnread) {
    if (typeof hasUnread !== 'boolean') return;
    if (state.hasUnreadTerminalMessages !== hasUnread) {
        state.hasUnreadTerminalMessages = hasUnread;
        emit('unreadTerminalMessagesChanged', { hasUnread });
    }
}
export function resetAppStateToDefaults() {
    updateDialState('A', { hue: DEFAULT_DIAL_A_HUE, targetHue: DEFAULT_DIAL_A_HUE, rotation: 0, targetRotation: 0, isDragging: false });
    updateDialState('B', { hue: 0, targetHue: 0, rotation: 0, targetRotation: 0, isDragging: false });
    const defaultSelections = DEFAULT_ASSIGNMENT_SELECTIONS;
    for (const targetKey in state.targetColorProps) {
        if (defaultSelections.hasOwnProperty(targetKey)) {
            const defaultIndex = defaultSelections[targetKey];
            const defaultHue = HUE_ASSIGNMENT_ROW_HUES[defaultIndex];
            setTargetColorProperties(targetKey, defaultHue);
        }
    }
    setTheme('dim');
    setTrueLensPower(0);
    setDialBInteractionState('idle');
    setAppStatus('starting-up');
    setCurrentStartupPhaseNumber(-1);
    setIsAudioMuted(false);
    setIsHapticsEnabled(true);
    setResistiveShutdownStage(0);
    setIsMainPowerOffButtonDisabled(false);
    setIsMobileTerminalOpen(false);
    setHasUnreadTerminalMessages(false);
}

// --- Event Subscription (Unchanged) ---
export function subscribe(eventName, listener) {
    if (typeof listener !== 'function') {
        return () => {};
    }
    return emitter.subscribe(eventName, listener);
}