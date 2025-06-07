/**
 * @module AmbientAnimationManager
 * @description Manages continuous ambient animations for UI elements,
 * particularly buttons (Harmonic Resonance, Idle Light Drift).
 * Works in conjunction with ButtonManager and appState.
 */
import { serviceLocator } from './serviceLocator.js';

class AmbientAnimationManager {
    constructor() {
        this.gsap = null;
        this.appState = null;
        this.buttonManager = null;
        this.configModule = null;

        this.isActive = false;
        this.globalResonanceParams = { progress: 0 };
        this.resonanceTicker = null;

        this.debug = false;
        this.enableHarmonicResonance = true;

        this._updateResonance = this._updateResonance.bind(this);
    }

    init() {
        // CORRECTED: Get all dependencies from the service locator
        this.gsap = serviceLocator.get('gsap');
        this.appState = serviceLocator.get('appState');
        this.buttonManager = serviceLocator.get('buttonManager');
        this.configModule = serviceLocator.get('config');

        if (this.debug) console.log('[AAM INIT] Initializing AmbientAnimationManager.');

        this.appState.subscribe('appStatusChanged', (status) => this._handleAppStatusChange(status));

        if (this.buttonManager && typeof this.buttonManager.on === 'function') {
            this.buttonManager.on('beforeButtonTransition', (button) => this._handleBeforeButtonTransition(button));
            this.buttonManager.on('afterButtonTransition', (button) => this._handleAfterButtonTransition(button));
            if (this.debug) console.log('[AAM INIT] Subscribed to ButtonManager events.');
        } else {
            console.error('[AAM INIT] ButtonManager not available or not an event emitter.');
        }

        this.resonanceTicker = this.gsap.ticker;
        this._handleAppStatusChange(this.appState.getAppStatus());
    }

    _updateResonance() {
        if (!this.isActive || !this.configModule || !this.enableHarmonicResonance) return;

        const R_PARAMS = this.configModule.HARMONIC_RESONANCE_PARAMS;
        const time = this.gsap.ticker.time;
        this.globalResonanceParams.progress = (Math.sin((time * Math.PI * 2) / R_PARAMS.PERIOD) + 1) / 2;
        const dipAmount = this.globalResonanceParams.progress * R_PARAMS.LIGHT_OPACITY_DIP_FACTOR;
        const targetOpacityForResonance = R_PARAMS.BASE_LIGHT_OPACITY_SELECTED * (1 - dipAmount);
        document.documentElement.style.setProperty('--harmonic-resonance-opacity-target', targetOpacityForResonance.toFixed(3));
    }

    _handleAppStatusChange(newStatus) {
        const previouslyActive = this.isActive;
        this.isActive = (newStatus === 'interactive');

        if (this.isActive && !previouslyActive && this.enableHarmonicResonance) {
            this.resonanceTicker.add(this._updateResonance);
        } else if (!this.isActive && previouslyActive && this.enableHarmonicResonance) {
            this.resonanceTicker.remove(this._updateResonance);
            document.documentElement.style.removeProperty('--harmonic-resonance-opacity-target');
        }

        const buttons = this.buttonManager.getAllButtonInstances();
        for (const button of buttons) {
            if (this.isActive) {
                this._applyAmbientAnimation(button);
            } else {
                button.stopHarmonicResonance();
                button.setCssIdleLightDriftActive(false);
            }
        }
    }

    _handleBeforeButtonTransition(buttonInstance) {
        if (!this.isActive) return;
        buttonInstance.stopHarmonicResonance();
        buttonInstance.setCssIdleLightDriftActive(false);
    }

    _handleAfterButtonTransition(buttonInstance) {
        if (!this.isActive) return;
        this._applyAmbientAnimation(buttonInstance);
    }

    _applyAmbientAnimation(buttonInstance) {
        if (!this.isActive || !this.configModule) return;

        buttonInstance.stopHarmonicResonance();
        buttonInstance.setCssIdleLightDriftActive(false);

        const R_PARAMS = this.configModule.HARMONIC_RESONANCE_PARAMS;
        const D_PARAMS = this.configModule.IDLE_LIGHT_DRIFT_PARAMS;
        const isSelected = buttonInstance.isSelected();
        const isEnergized = buttonInstance.getCurrentClasses().has(R_PARAMS.ELIGIBILITY_CLASS);

        if (isEnergized) {
            if (isSelected) {
                if (this.enableHarmonicResonance) buttonInstance.startHarmonicResonance();
            } else {
                buttonInstance.setCssIdleLightDriftActive(true);
            }
        }
    }

    destroy() {
        if (this.resonanceTicker) {
            this.resonanceTicker.remove(this._updateResonance);
        }
        document.documentElement.style.removeProperty('--harmonic-resonance-opacity-target');
    }
}

export default AmbientAnimationManager;