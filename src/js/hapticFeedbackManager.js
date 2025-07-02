/**
 * @file hapticFeedbackManager.js
 * @description Manages haptic feedback for UI interactions on supported devices.
 * Respects a global appState setting for user preference.
 */
import * as appState from './appState.js';

class HapticFeedbackManager {
    constructor() {
        // Check for Vibration API support once at instantiation.
        this.isSupported = 'vibrate' in navigator;
    }

    /**
     * Internal helper to check if haptics can be triggered.
     * @returns {boolean}
     */
    _canTrigger() {
        return this.isSupported && appState.getIsHapticsEnabled();
    }

    /**
     * Triggers a short, crisp vibration, like a standard button click.
     */
    triggerClick() {
        if (this._canTrigger()) {
            navigator.vibrate(10); // A very short, sharp pulse
        }
    }

    /**
     * Triggers a slightly more noticeable vibration for a state change (e.g., toggle on).
     */
    triggerToggleOn() {
        if (this._canTrigger()) {
            navigator.vibrate(20); // A soft but distinct pulse
        }
    }
    
    /**
     * Triggers a single soft pulse, good for toggling off or minor actions.
     */
    triggerToggleOff() {
        if (this._canTrigger()) {
            navigator.vibrate(15);
        }
    }

    /**
     * Triggers a very subtle vibration for scrubbing or moving over a snap point.
     */
    triggerSliderScrub() {
        if (this._canTrigger()) {
            navigator.vibrate(5); // Barely perceptible, like a tiny notch
        }
    }
}

export const hapticFeedbackManager = new HapticFeedbackManager();