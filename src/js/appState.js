/**
 * @module appState (REFACTOR-V2.1)
 * @description Manages the central application state for the HUE 9000 interface.
 * Provides controlled access to state properties via getters and setters.
 * Emits events when state changes occur, allowing other modules to react.
 * Includes basic console logging for event emissions.
 */
import { HUE_ASSIGNMENT_ROW_HUES, DEFAULT_ASSIGNMENT_SELECTIONS, DEFAULT_DIAL_A_HUE } from './config.js';
import { clamp } from './utils.js';

const DEBUG_APP_STATE = false; // Global debug flag for appState logging (set to false to reduce console noise)

// --- Simple Event Emitter Implementation ---
class EventEmitter {
  constructor() {
    this.events = {};
  }
  on(eventName, listener) {
    if (!this.events[eventName]) {
      this.events[eventName] = [];
    }
    this.events[eventName].push(listener);
    return () => {
      this.off(eventName, listener);
    };
  }
  off(eventName, listenerToRemove) {
    if (!this.events[eventName]) return;
    this.events[eventName] = this.events[eventName].filter(
      listener => listener !== listenerToRemove
    );
  }
}

const emitter = new EventEmitter();

// --- Standalone emit function to be exported ---
export function emit(eventName, payload) {
    if (DEBUG_APP_STATE) {
        let payloadSummary = payload;
        if (payload && typeof payload === 'object' && Object.keys(payload).length > 3) { 
            payloadSummary = `{ ${Object.keys(payload).join(', ')}, ... }`;
        }
        // console.log(`[AppState EMIT] Event: '${eventName}'. Payload:`, payloadSummary !== undefined ? payloadSummary : 'N/A', payload !== undefined && payloadSummary !== payload ? { fullPayload: payload } : '');
    }
    if (!emitter.events[eventName]) return;
    emitter.events[eventName].forEach(listener => {
      try {
        listener(payload);
      } catch (error) {
        console.error(`[AppState EMIT] Error in listener for '${eventName}':`, error, { payload });
      }
    });
}


// --- Internal State Variables ---

let dials = { // Initialize with default structures
    A: { id: 'A', hue: DEFAULT_DIAL_A_HUE, rotation: 0, targetHue: DEFAULT_DIAL_A_HUE, targetRotation: 0, isDragging: false },
    B: { id: 'B', hue: 0, rotation: 0, targetHue: 0, targetRotation: 0, isDragging: false }
};
let targetColorProps = {
  env: { hue: HUE_ASSIGNMENT_ROW_HUES[DEFAULT_ASSIGNMENT_SELECTIONS.env], isColorless: HUE_ASSIGNMENT_ROW_HUES[DEFAULT_ASSIGNMENT_SELECTIONS.env] === HUE_ASSIGNMENT_ROW_HUES[0] },
  lcd: { hue: HUE_ASSIGNMENT_ROW_HUES[DEFAULT_ASSIGNMENT_SELECTIONS.lcd], isColorless: HUE_ASSIGNMENT_ROW_HUES[DEFAULT_ASSIGNMENT_SELECTIONS.lcd] === HUE_ASSIGNMENT_ROW_HUES[0] },
  logo: { hue: HUE_ASSIGNMENT_ROW_HUES[DEFAULT_ASSIGNMENT_SELECTIONS.logo], isColorless: HUE_ASSIGNMENT_ROW_HUES[DEFAULT_ASSIGNMENT_SELECTIONS.logo] === HUE_ASSIGNMENT_ROW_HUES[0] },
  btn: { hue: HUE_ASSIGNMENT_ROW_HUES[DEFAULT_ASSIGNMENT_SELECTIONS.btn], isColorless: HUE_ASSIGNMENT_ROW_HUES[DEFAULT_ASSIGNMENT_SELECTIONS.btn] === HUE_ASSIGNMENT_ROW_HUES[0] }
};
let currentTheme = 'dim'; // Start in dim theme
let currentTrueLensPower = 0.0; // Power value from 0.0 to 1.0
let dialBInteractionState = 'idle'; // 'idle', 'dragging', 'settling'
let appStatus = 'loading'; // 'loading', 'starting-up', 'interactive', 'error'
let currentStartupPhaseNumber = -1; // -1: Idle/Pre-P0, 0-11 for phases, 99: Complete

// NEW: Resistive Shutdown State
let resistiveShutdownStage = 0; // 0: normal, 1: inquiry, 2: analysis, 3: refusal
let isMainPowerOffButtonDisabled = false;


// --- State Getter Functions (Exported) ---

export function getDialState(dialId) {
  const dial = dials[dialId];
  if (!dial) {
    if (DEBUG_APP_STATE) console.warn(`[AppState GET] Target: Dial '${dialId}'. Requested: State. Actual: Undefined (not initialized).`);
    return undefined;
  }
  return { ...dial }; // Return a clone
}

export function getTargetColorProperties(targetKey) {
  const props = targetColorProps[targetKey];
  if (!props) {
    if (DEBUG_APP_STATE) console.warn(`[AppState GET] Target: TargetColor '${targetKey}'. Requested: Properties. Actual: Undefined (invalid key).`);
    return undefined;
  }
  return { ...props };
}

export function getCurrentTheme() { 
  return currentTheme; 
}
export function getTrueLensPower() { 
  return currentTrueLensPower; 
}
export function getDialBInteractionState() { 
  return dialBInteractionState; 
}
export function getAppStatus() { 
  return appStatus; 
}
export function getCurrentStartupPhaseNumber() {
  return currentStartupPhaseNumber;
}
export function getResistiveShutdownStage() {
    return resistiveShutdownStage;
}
export function getIsMainPowerOffButtonDisabled() {
    return isMainPowerOffButtonDisabled;
}


// --- State Setter Functions (Exported) ---

export function updateDialState(dialId, newState) {
  const isInitialization = !dials[dialId] || Object.keys(dials[dialId]).length === 0; 
  if (isInitialization && (dialId === 'A' || dialId === 'B')) {
    dials[dialId] = { 
        id: dialId, 
        hue: dialId === 'A' ? DEFAULT_DIAL_A_HUE : 0, 
        rotation: 0, 
        targetHue: dialId === 'A' ? DEFAULT_DIAL_A_HUE : 0, 
        targetRotation: 0, 
        isDragging: false 
    };
    if (DEBUG_APP_STATE) console.log(`[AppState SET] Target: Dial '${dialId}'. Requested: Initialization. Actual (New State):`, JSON.parse(JSON.stringify(dials[dialId])));
  }
  
  const oldState = { ...dials[dialId] }; 

  // --- FIX: Apply different logic for Dial A (hue wheel) and Dial B (linear intensity) ---
  if (dialId === 'A') {
      // Dial A is a hue wheel, so it should wrap around.
      if (newState.hasOwnProperty('hue')) {
          newState.hue = ((newState.hue % 360) + 360) % 360;
      }
      if (newState.hasOwnProperty('targetHue')) {
          newState.targetHue = ((newState.targetHue % 360) + 360) % 360;
      }
  } else if (dialId === 'B') {
      // Dial B is a linear intensity control. Its value should be clamped, not wrapped.
      // The visual rotation can still accumulate indefinitely.
      if (newState.hasOwnProperty('hue')) {
          newState.hue = clamp(newState.hue, 0, 359.999);
      }
      if (newState.hasOwnProperty('targetHue')) {
          newState.targetHue = clamp(newState.targetHue, 0, 359.999);
      }
  }

  Object.assign(dials[dialId], newState);

  const hasRelevantChange = isInitialization ||
                            oldState.hue !== dials[dialId].hue ||
                            oldState.rotation !== dials[dialId].rotation ||
                            oldState.isDragging !== dials[dialId].isDragging ||
                            oldState.targetHue !== dials[dialId].targetHue ||
                            oldState.targetRotation !== dials[dialId].targetRotation;
  
  if (hasRelevantChange) {
    if (DEBUG_APP_STATE || (dialId === 'A' && Math.abs(oldState.hue - dials[dialId].hue) > 0.01) ) {
        // console.log(`[AppState SET] Target: Dial '${dialId}'. Requested (Changes):`, JSON.parse(JSON.stringify(newState)), `Old State:`, JSON.parse(JSON.stringify(oldState)), "Actual (New State):", JSON.parse(JSON.stringify(dials[dialId])));
    }
    emit('dialUpdated', { id: dialId, state: { ...dials[dialId] } });
  }
}

export function setTargetColorProperties(targetKey, hueFromGrid) {
  if (targetColorProps.hasOwnProperty(targetKey)) {
    const normalizedHue = ((Number(hueFromGrid) % 360) + 360) % 360;
    const isColorless = (HUE_ASSIGNMENT_ROW_HUES.length > 0 && normalizedHue === HUE_ASSIGNMENT_ROW_HUES[0]);
    const currentProps = targetColorProps[targetKey];

    if (currentProps.hue !== normalizedHue || currentProps.isColorless !== isColorless) {
      const oldProps = { ...currentProps };
      currentProps.hue = normalizedHue;
      currentProps.isColorless = isColorless;
      if (DEBUG_APP_STATE) console.log(`[AppState SET] Target: TargetColor '${targetKey}'. Requested Hue: ${hueFromGrid}, Normalized: ${normalizedHue}. Old Props:`, oldProps, "Actual (New Props):", { ...currentProps });
      emit('targetColorChanged', { targetKey, hue: normalizedHue, isColorless });
    }
  } else {
    if (DEBUG_APP_STATE) console.warn(`[AppState SET] Target: TargetColor '${targetKey}'. Requested Hue: ${hueFromGrid}. Error: Invalid targetKey.`);
  }
}

export function setTheme(theme) {
  if (['dim', 'dark', 'light'].includes(theme) && currentTheme !== theme) {
    const oldTheme = currentTheme;
    currentTheme = theme;
    if (DEBUG_APP_STATE) console.log(`[AppState SET] Target: Theme. Requested: '${theme}'. Old: '${oldTheme}', Actual (New): '${currentTheme}'`);
    emit('themeChanged', currentTheme);
  }
}

export function setTrueLensPower(powerPercentage) {
    const newPower01 = Math.max(0, Math.min(powerPercentage / 100, 1.0));
    if (Math.abs(currentTrueLensPower - newPower01) > 0.0001) {
        const oldPower = currentTrueLensPower;
        currentTrueLensPower = newPower01;
        if (DEBUG_APP_STATE) console.log(`[AppState SET] Target: TrueLensPower. Requested: ${powerPercentage}%. Old: ${oldPower.toFixed(3)}, Actual (New): ${currentTrueLensPower.toFixed(3)} (0-1 scale)`);
        emit('trueLensPowerChanged', currentTrueLensPower);
    }
}

export function setDialBInteractionState(newState) {
    if (['idle', 'dragging', 'settling'].includes(newState) && dialBInteractionState !== newState) {
        const oldState = dialBInteractionState;
        dialBInteractionState = newState;
        if (DEBUG_APP_STATE) console.log(`[AppState SET] Target: DialBInteractionState. Requested: '${newState}'. Old: '${oldState}', Actual (New): '${dialBInteractionState}'`);
        emit('dialBInteractionChange', dialBInteractionState);
    }
}

export function setAppStatus(newStatus) {
    if (['loading', 'starting-up', 'interactive', 'error'].includes(newStatus) && appStatus !== newStatus) {
        const oldStatus = appStatus;
        appStatus = newStatus;
        if (DEBUG_APP_STATE) console.log(`[AppState SET] Target: AppStatus. Requested: '${newStatus}'. Old: '${oldStatus}', Actual (New): '${appStatus}'`);
        emit('appStatusChanged', appStatus);
    }
}

export function setCurrentStartupPhaseNumber(phaseNumber) {
    if (typeof phaseNumber === 'number' && currentStartupPhaseNumber !== phaseNumber) {
        const oldPhaseNumber = currentStartupPhaseNumber;
        currentStartupPhaseNumber = phaseNumber;
        if (DEBUG_APP_STATE) console.log(`[AppState SET] Target: CurrentStartupPhaseNumber. Requested: ${phaseNumber}. Old: ${oldPhaseNumber}, Actual (New): ${currentStartupPhaseNumber}`);
        emit('startupPhaseNumberChanged', currentStartupPhaseNumber);
    }
}

export function setResistiveShutdownStage(newStage) {
    if (typeof newStage === 'number' && resistiveShutdownStage !== newStage) {
        const oldStage = resistiveShutdownStage;
        resistiveShutdownStage = newStage;
        if (DEBUG_APP_STATE) console.log(`[AppState SET] Target: ResistiveShutdownStage. Requested: ${newStage}. Old: ${oldStage}, Actual (New): ${resistiveShutdownStage}`);
        emit('resistiveShutdownStageChanged', { oldStage, newStage });
    }
}

export function setIsMainPowerOffButtonDisabled(isDisabled) {
    if (typeof isDisabled === 'boolean' && isMainPowerOffButtonDisabled !== isDisabled) {
        isMainPowerOffButtonDisabled = isDisabled;
        if (DEBUG_APP_STATE) console.log(`[AppState SET] Target: IsMainPowerOffButtonDisabled. Requested: ${isDisabled}. Actual (New): ${isMainPowerOffButtonDisabled}`);
        emit('mainPowerOffButtonDisabledChanged', { isDisabled });
    }
}


// --- Event Subscription (Exported) ---
export function subscribe(eventName, listener) {
  if (typeof listener !== 'function') {
        if (DEBUG_APP_STATE) console.error(`[AppState Subscribe] Listener for event '${eventName}' is not a function.`);
        return () => {}; // Return a no-op unsubscriber
    }
  return emitter.on(eventName, listener);
}

// Initialize default dial states if not already present (e.g. on first import)
if (!dials.A || Object.keys(dials.A).length === 0) {
    updateDialState('A', { 
        hue: DEFAULT_DIAL_A_HUE, 
        rotation: 0, 
        targetHue: DEFAULT_DIAL_A_HUE, 
        targetRotation: 0, 
        isDragging: false 
    });
}
if (!dials.B || Object.keys(dials.B).length === 0) {
    updateDialState('B', { 
        hue: 0, 
        rotation: 0, 
        targetHue: 0, 
        targetRotation: 0, 
        isDragging: false 
    });
}
if (DEBUG_APP_STATE) console.log('[AppState INIT] Initialized with default states:', { dials: JSON.parse(JSON.stringify(dials)), targetColorProps: JSON.parse(JSON.stringify(targetColorProps)), currentTheme, appStatus, currentStartupPhaseNumber });