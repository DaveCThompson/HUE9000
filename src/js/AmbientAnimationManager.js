/**
 * @module AmbientAnimationManager
 * @description Manages continuous ambient animations for UI elements,
 * particularly buttons (Harmonic Resonance, Idle Light Drift).
 * Works in conjunction with ButtonManager and appState.
 */
import { ButtonStates } from './buttonManager.js'; // For checking button states

class AmbientAnimationManager {
    constructor(gsap, appState, buttonManager, configModule) {
        this.gsap = gsap;
        this.appState = appState;
        this.buttonManager = buttonManager;
        this.configModule = configModule;

        this.isActive = false;
        this.globalResonanceParams = { progress: 0 }; // 0 to 1
        this.resonanceTicker = null;

        this.debug = false; // MODIFIED: Default to false for less verbose logging

        this._updateResonance = this._updateResonance.bind(this); // Bind this context
    }

    init() {
        if (this.debug) console.log('[AAM INIT] Initializing AmbientAnimationManager.');

        this.appState.subscribe('appStatusChanged', this._handleAppStatusChange.bind(this));

        if (this.buttonManager && typeof this.buttonManager.on === 'function') {
            this.buttonManager.on('beforeButtonTransition', this._handleBeforeButtonTransition.bind(this));
            this.buttonManager.on('afterButtonTransition', this._handleAfterButtonTransition.bind(this));
            if (this.debug) console.log('[AAM INIT] Subscribed to ButtonManager events.');
        } else {
            console.error('[AAM INIT] ButtonManager not available or not an event emitter.');
        }

        this.resonanceTicker = this.gsap.ticker;
        this._handleAppStatusChange(this.appState.getAppStatus()); // Initial check
        if (this.debug) console.log(`[AAM INIT] Initialization complete. Initial isActive: ${this.isActive}`);
    }

    _updateResonance() {
        if (!this.isActive || !this.configModule) {
            return;
        }

        const R_PARAMS = this.configModule.HARMONIC_RESONANCE_PARAMS;
        const time = this.gsap.ticker.time;
        this.globalResonanceParams.progress = (Math.sin((time * Math.PI * 2) / R_PARAMS.PERIOD) + 1) / 2;
        // MODIFIED: Removed per-tick logging for resonance progress
        // if (this.debug) console.log(`[AAM _updateResonance] Global progress: ${this.globalResonanceParams.progress.toFixed(3)}`);


        const buttons = this.buttonManager.getAllButtonInstances();
        // let resonatingButtonFound = false; // MODIFIED: Removed as per-button logging is removed
        for (const button of buttons) {
            if (button._isResonating) { 
                // MODIFIED: Removed per-button, per-tick logging
                // if (this.debug && !resonatingButtonFound) console.log(`[AAM _updateResonance] Updating resonance for button: ${button.getIdentifier()}`);
                button.updateHarmonicResonanceVisuals(this.globalResonanceParams.progress);
                // resonatingButtonFound = true;
            }
        }
        // MODIFIED: Removed logging for no resonating buttons found
        // if (this.debug && !resonatingButtonFound) console.log('[AAM _updateResonance] No resonating buttons found to update.');
    }

    _handleAppStatusChange(newStatus) {
        if (this.debug) console.log(`[AAM _handleAppStatusChange] Received new app status: ${newStatus}. Current AAM.isActive: ${this.isActive}`);
        const previouslyActive = this.isActive;
        this.isActive = (newStatus === 'interactive');

        if (this.isActive) {
            if (!previouslyActive) { 
                this.resonanceTicker.add(this._updateResonance);
                if (this.debug) console.log('[AAM _handleAppStatusChange] Resonance ticker ADDED.');
            }
            const buttons = this.buttonManager.getAllButtonInstances();
            if (this.debug) console.log(`[AAM _handleAppStatusChange] App became interactive. Applying ambient animations to ${buttons.length} buttons.`);
            for (const button of buttons) {
                this._applyAmbientAnimation(button);
            }
        } else { 
            if (previouslyActive) { 
                this.resonanceTicker.remove(this._updateResonance);
                if (this.debug) console.log('[AAM _handleAppStatusChange] Resonance ticker REMOVED.');
            }
            const buttons = this.buttonManager.getAllButtonInstances();
            if (this.debug && buttons.length > 0) console.log(`[AAM _handleAppStatusChange] App no longer interactive. Stopping ambient animations for ${buttons.length} buttons.`);
            for (const button of buttons) {
                button.stopHarmonicResonance();
                button.stopIdleLightDrift();
            }
        }
    }

    _handleBeforeButtonTransition(buttonInstance) {
        if (!this.isActive) return;
        if (this.debug) console.log(`[AAM _handleBeforeButtonTransition] Button: ${buttonInstance.getIdentifier()}. Stopping its ambient animations.`);
        buttonInstance.stopHarmonicResonance();
        buttonInstance.stopIdleLightDrift();
    }

    _handleAfterButtonTransition(buttonInstance) {
        if (!this.isActive) return;
        if (this.debug) console.log(`[AAM _handleAfterButtonTransition] Button: ${buttonInstance.getIdentifier()}. Re-applying ambient animation.`);
        this._applyAmbientAnimation(buttonInstance);
    }

    _applyAmbientAnimation(buttonInstance) {
        if (!this.isActive || !this.configModule) {
            if (this.debug) console.log(`[AAM _applyAmbientAnimation] Skipped for ${buttonInstance.getIdentifier()}. AAM active: ${this.isActive}, Config: !!${this.configModule}`);
            return;
        }

        buttonInstance.stopHarmonicResonance(); // Ensure clean state
        buttonInstance.stopIdleLightDrift();   // Ensure clean state

        const R_PARAMS = this.configModule.HARMONIC_RESONANCE_PARAMS;
        const D_PARAMS = this.configModule.IDLE_LIGHT_DRIFT_PARAMS;

        const currentClasses = buttonInstance.getCurrentClasses(); 
        const isSelected = buttonInstance.isSelected(); 

        const rEligibilityClass = R_PARAMS && R_PARAMS.ELIGIBILITY_CLASS;
        const dEligibilityClass = D_PARAMS && D_PARAMS.ELIGIBILITY_CLASS;
        
        const isEnergized = (rEligibilityClass && currentClasses.has(rEligibilityClass)) || 
                            (dEligibilityClass && currentClasses.has(dEligibilityClass));

        if (this.debug) console.log(`[AAM _applyAmbientAnimation] Button: ${buttonInstance.getIdentifier()}, isSelected: ${isSelected}, isEnergized (based on class '${rEligibilityClass || dEligibilityClass}'): ${isEnergized}, Current DOM Classes: '${Array.from(currentClasses).join(' ')}'`);

        if (isEnergized) {
            if (isSelected) {
                if (this.debug) console.log(`[AAM _applyAmbientAnimation] Starting HARMONIC RESONANCE for selected button: ${buttonInstance.getIdentifier()}`);
                buttonInstance.startHarmonicResonance();
                if (this.resonanceTicker && this.resonanceTicker.started) { 
                     buttonInstance.updateHarmonicResonanceVisuals(this.globalResonanceParams.progress);
                }
            } else { 
                if (this.debug) console.log(`[AAM _applyAmbientAnimation] Starting IDLE LIGHT DRIFT for unselected, energized button: ${buttonInstance.getIdentifier()}`);
                buttonInstance.startIdleLightDrift();
            }
        } else {
            if (this.debug) console.log(`[AAM _applyAmbientAnimation] Button ${buttonInstance.getIdentifier()} is NOT eligible for ambient animation (not energized).`);
        }
    }

    destroy() {
        if (this.debug) console.log('[AAM DESTROY] Destroying AmbientAnimationManager.');
        if (this.resonanceTicker) {
            this.resonanceTicker.remove(this._updateResonance);
        }
    }
}

export default AmbientAnimationManager;