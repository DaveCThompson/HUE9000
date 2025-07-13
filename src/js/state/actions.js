/**
 * @module state/actions
 * @description Defines all possible user intents (Actions) as constants and provides
 * "action creator" functions. This avoids magic strings and ensures consistency.
 */

// --- Action Type Constants ---
export const SET_THEME = 'SET_THEME';
export const CYCLE_THEME = 'CYCLE_THEME';
export const SET_HUE_ASSIGNMENT = 'SET_HUE_ASSIGNMENT';
export const DIAL_INTERACTION_COMPLETE = 'DIAL_INTERACTION_COMPLETE';
export const REQUEST_SCAN = 'REQUEST_SCAN';
export const REQUEST_SHUTDOWN = 'REQUEST_SHUTDOWN';
export const RESET_SHUTDOWN = 'RESET_SHUTDOWN';
export const RESET_SEQUENCE = 'RESET_SEQUENCE';
export const TOGGLE_AUDIO_MUTE = 'TOGGLE_AUDIO_MUTE';

// --- Action Creator Functions ---

/**
 * Creates an action to set a specific theme.
 * @param {'dim' | 'dark' | 'light'} theme - The target theme.
 * @returns {{type: string, payload: {theme: string}}}
 */
export const setTheme = (theme) => ({
    type: SET_THEME,
    payload: { theme }
});

/**
 * Creates an action to cycle to the next logical theme (for mobile light toggle).
 * @returns {{type: string}}
 */
export const cycleTheme = () => ({
    type: CYCLE_THEME
});

/**
 * Creates an action to assign a hue to a specific UI target.
 * @param {string} targetKey - The key for the target (e.g., 'env', 'logo', 'all').
 * @param {number} hue - The hue value to assign.
 * @returns {{type: string, payload: {targetKey: string, hue: number}}}
 */
export const setHueAssignment = (targetKey, hue) => ({
    type: SET_HUE_ASSIGNMENT,
    payload: { targetKey, hue }
});

/**
 * Creates an action to signal the completion of a dial interaction,
 * used to trigger side effects like terminal messages.
 * @param {'A' | 'B'} dialId - The ID of the dial.
 * @param {number} finalHue - The final hue value of the dial.
 * @returns {{type: string, payload: {dialId: string, finalHue: number}}}
 */
export const dialInteractionComplete = (dialId, finalHue) => ({
    type: DIAL_INTERACTION_COMPLETE,
    payload: { dialId, finalHue }
});

/**
 * Creates an action to request a terminal scan sequence.
 * @param {string} messageKey - The key for the scan sequence message (e.g., 'BTN1_SCAN').
 * @returns {{type: string, payload: {messageKey: string}}}
 */
export const requestScan = (messageKey) => ({
    type: REQUEST_SCAN,
    payload: { messageKey }
});

/**
 * Creates an action to signal a user request to initiate or advance the shutdown sequence.
 * @returns {{type: string}}
 */
export const requestShutdown = () => ({
    type: REQUEST_SHUTDOWN
});

/**
 * Creates an action to reset the shutdown sequence.
 * @returns {{type: string}}
 */
export const resetShutdown = () => ({
    type: RESET_SHUTDOWN
});

/**
 * Creates an action to reset the entire application startup sequence.
 * @returns {{type: string}}
 */
export const resetSequence = () => ({
    type: RESET_SEQUENCE
});

/**
 * Creates an action to toggle the global audio mute state.
 * @returns {{type: string}}
 */
export const toggleAudioMute = () => ({
    type: TOGGLE_AUDIO_MUTE
});