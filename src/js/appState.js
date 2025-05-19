/**
 * @module appState (REFACTOR-V2.1)
 * @description Manages the central application state for the HUE 9000 interface.
 * Provides controlled access to state properties via getters and setters.
 * Emits events when state changes occur, allowing other modules to react.
 * Includes basic console logging for event emissions.
 */
import { HUE_ASSIGNMENT_ROW_HUES, DEFAULT_ASSIGNMENT_SELECTIONS, DEFAULT_DIAL_A_HUE } from './config.js';

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
  // Removed emit from here, will be a standalone exported function
  // emit(eventName, payload) { ... }
}

const emitter = new EventEmitter();

// --- Standalone emit function to be exported ---
export function emit(eventName, payload) {
    // ADDED: Console log for event emission
    console.log(`[AppState Event] Emitting: '${eventName}'`, payload !== undefined ? { payload } : '');
    if (!emitter.events[eventName]) return;
    emitter.events[eventName].forEach(listener => {
      try {
        listener(payload);
      } catch (error) {
        console.error(`[AppState Event] Error in listener for '${eventName}':`, error, { payload });
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
let terminalLcdMessage = "INITIALIZING...";


// --- State Getter Functions (Exported) ---

export function getDialState(dialId) {
  const dial = dials[dialId];
  if (!dial) {
    // ADDED: Log if dial state is requested before full initialization
    console.warn(`[AppState GET] Dial state requested for uninitialized dialId: '${dialId}'`);
    return undefined;
  }
  return { ...dial }; // Return a clone
}

export function getTargetColorProperties(targetKey) {
  const props = targetColorProps[targetKey];
  if (!props) return undefined;
  return { ...props };
}

export function getCurrentTheme() { return currentTheme; }
export function getTrueLensPower() { return currentTrueLensPower; }
export function getDialBInteractionState() { return dialBInteractionState; }
export function getAppStatus() { return appStatus; }
export function getTerminalLcdMessage() { return terminalLcdMessage; }

// --- State Setter Functions (Exported) ---

export function updateDialState(dialId, newState) {
  const isInitialization = !dials[dialId] || Object.keys(dials[dialId]).length === 0; // Check if it's truly uninitialized
  if (isInitialization && (dialId === 'A' || dialId === 'B')) {
    // Ensure a base structure if initializing, using defaults
    dials[dialId] = { 
        id: dialId, 
        hue: dialId === 'A' ? DEFAULT_DIAL_A_HUE : 0, 
        rotation: 0, 
        targetHue: dialId === 'A' ? DEFAULT_DIAL_A_HUE : 0, 
        targetRotation: 0, 
        isDragging: false 
    };
    console.log(`[AppState SET] Initialized dial '${dialId}' state:`, { ...dials[dialId] });
  }
  
  const oldState = { ...dials[dialId] }; // Clone before update

  Object.assign(dials[dialId], newState);

  const hasRelevantChange = isInitialization ||
                            oldState.hue !== dials[dialId].hue ||
                            oldState.rotation !== dials[dialId].rotation ||
                            oldState.isDragging !== dials[dialId].isDragging ||
                            oldState.targetHue !== dials[dialId].targetHue ||
                            oldState.targetRotation !== dials[dialId].targetRotation;
  
  if (hasRelevantChange) {
    // ADDED: Log dial state update
    console.log(`[AppState SET] Dial '${dialId}' state updated. Old:`, oldState, "New:", { ...dials[dialId] });
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
      // ADDED: Log target color change
      console.log(`[AppState SET] TargetColor '${targetKey}' updated. Old:`, oldProps, "New:", { ...currentProps });
      emit('targetColorChanged', { targetKey, hue: normalizedHue, isColorless });
    }
  } else {
    console.warn(`[AppState SET] Invalid targetKey '${targetKey}' for setTargetColorProperties.`);
  }
}

export function setTheme(theme) {
  // REVISED: Valid themes are now 'dim', 'dark', 'light'
  if (['dim', 'dark', 'light'].includes(theme) && currentTheme !== theme) {
    const oldTheme = currentTheme;
    currentTheme = theme;
    // ADDED: Log theme change
    console.log(`[AppState SET] Theme changed. Old: ${oldTheme}, New: ${currentTheme}`);
    emit('themeChanged', currentTheme);
  }
}

export function setTrueLensPower(powerPercentage) {
    const newPower01 = Math.max(0, Math.min(powerPercentage / 100, 1.0));
    if (Math.abs(currentTrueLensPower - newPower01) > 0.0001) {
        const oldPower = currentTrueLensPower;
        currentTrueLensPower = newPower01;
        // ADDED: Log lens power change
        console.log(`[AppState SET] TrueLensPower changed. Old: ${oldPower.toFixed(3)}, New: ${currentTrueLensPower.toFixed(3)}`);
        emit('trueLensPowerChanged', currentTrueLensPower);
    }
}

export function setDialBInteractionState(newState) {
    if (['idle', 'dragging', 'settling'].includes(newState) && dialBInteractionState !== newState) {
        const oldState = dialBInteractionState;
        dialBInteractionState = newState;
        // ADDED: Log Dial B interaction state change
        console.log(`[AppState SET] DialBInteractionState changed. Old: ${oldState}, New: ${dialBInteractionState}`);
        emit('dialBInteractionChange', dialBInteractionState);
    }
}

export function setAppStatus(newStatus) {
    if (['loading', 'starting-up', 'interactive', 'error'].includes(newStatus) && appStatus !== newStatus) {
        const oldStatus = appStatus;
        appStatus = newStatus;
        // ADDED: Log app status change
        console.log(`[AppState SET] AppStatus changed. Old: ${oldStatus}, New: ${appStatus}`);
        emit('appStatusChanged', appStatus);
    }
}

export function setTerminalLcdMessage(message) {
    if (terminalLcdMessage !== message) {
        const oldMessage = terminalLcdMessage;
        terminalLcdMessage = message;
        // ADDED: Log terminal message change
        // console.log(`[AppState SET] TerminalMessage changed. Old: "${oldMessage}", New: "${terminalLcdMessage}"`); // Can be verbose
        emit('terminalMessageChanged', terminalLcdMessage);
    }
}

// --- Event Subscription (Exported) ---
export function subscribe(eventName, listener) {
  if (typeof listener !== 'function') {
        console.error(`[AppState Subscribe] Listener for event '${eventName}' is not a function.`);
        return () => {};
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
console.log('[AppState] Initialized with default states:', { dials, targetColorProps, currentTheme, appStatus });