/**
 * @module AmbientAnimationManager
 * @description Manages continuous ambient animations for UI elements,
 * particularly buttons (Harmonic Resonance, Idle Light Drift) and now V2 Displays.
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
        this.gsap = serviceLocator.get('gsap');
        this.appState = serviceLocator.get('appState');
        this.buttonManager = serviceLocator.get('buttonManager');
        this.configModule = serviceLocator.get('config');

        if (!this.configModule.HARMONIC_RESONANCE_PARAMS) {
            console.error('[AAM INIT] HARMONIC_RESONANCE_PARAMS not found in config. Disabling.');
            this.enableHarmonicResonance = false;
        } else {
            this.enableHarmonicResonance = this.configModule.HARMONIC_RESONANCE_PARAMS.ENABLED;
        }

        this.appState.subscribe('appStatusChanged', (status) => this._handleAppStatusChange(status));
        
        // Subscribe to the global pulse to apply its own effects
        this.appState.subscribe('ambientPulse', ({ progress }) => this._handleAmbientPulse({ progress }));

        if (this.buttonManager && typeof this.buttonManager.on === 'function') {
            this.buttonManager.on('beforeButtonTransition', (button) => this._handleBeforeButtonTransition(button));
            this.buttonManager.on('afterButtonTransition', (button) => this._handleAfterButtonTransition(button));
        } else {
            console.error('[AAM INIT] ButtonManager not available or not an event emitter.');
        }

        this.resonanceTicker = this.gsap.ticker;
        this._handleAppStatusChange(this.appState.getAppStatus());
    }

    /**
     * The master clock. Calculates the global pulse progress and emits it.
     */
    _updateResonance() {
        if (!this.isActive || !this.enableHarmonicResonance) return;

        const R_PARAMS = this.configModule.HARMONIC_RESONANCE_PARAMS;
        const time = this.gsap.ticker.time;
        const progress = (Math.sin((time * Math.PI * 2) / R_PARAMS.PERIOD) + 1) / 2;

        // Emit the global pulse progress for all subscribers
        this.appState.emit('ambientPulse', { progress });
    }

    /**
     * Handles the global pulse to apply resonance to buttons and LCDs.
     * @param {object} payload
     * @param {number} payload.progress - The pulse progress from 0 to 1.
     */
    _handleAmbientPulse({ progress }) {
        if (!this.isActive || !this.configModule || !this.enableHarmonicResonance || !this.gsap.utils) return;

        const R_PARAMS = this.configModule.HARMONIC_RESONANCE_PARAMS;
        const glowOpacity = this.gsap.utils.interpolate(R_PARAMS.GLOW_OPACITY_RANGE[0], R_PARAMS.GLOW_OPACITY_RANGE[1], progress);
        const glowScale = this.gsap.utils.interpolate(R_PARAMS.GLOW_SCALE_RANGE[0], R_PARAMS.GLOW_SCALE_RANGE[1], progress);

        // Set the global CSS variables that the new CSS will consume
        const rootStyle = document.documentElement.style;
        rootStyle.setProperty('--harmonic-resonance-glow-opacity', glowOpacity.toFixed(3));
        rootStyle.setProperty('--harmonic-resonance-glow-scale', glowScale.toFixed(3));
    }


    _handleAppStatusChange(newStatus) {
        const previouslyActive = this.isActive;
        this.isActive = (newStatus === 'interactive');

        if (this.isActive && !previouslyActive) {
            if (this.enableHarmonicResonance) this.resonanceTicker.add(this._updateResonance);
        } else if (!this.isActive && previouslyActive) {
            if (this.enableHarmonicResonance) {
                this.resonanceTicker.remove(this._updateResonance);
                const rootStyle = document.documentElement.style;
                rootStyle.removeProperty('--harmonic-resonance-glow-opacity');
                rootStyle.removeProperty('--harmonic-resonance-glow-scale');
            }
        }

        const buttons = this.buttonManager.getAllButtonInstances();
        for (const button of buttons) {
            if (this.isActive) {
                this._applyAmbientAnimation(button);
            } else {
                if (typeof button.stopHarmonicResonance === 'function') button.stopHarmonicResonance();
                if (typeof button.setCssIdleLightDriftActive === 'function') button.setCssIdleLightDriftActive(false);
            }
        }
    }

    _handleBeforeButtonTransition(buttonInstance) {
        if (!this.isActive) return;
        if (typeof buttonInstance.stopHarmonicResonance === 'function') buttonInstance.stopHarmonicResonance();
        if (typeof buttonInstance.setCssIdleLightDriftActive === 'function') buttonInstance.setCssIdleLightDriftActive(false);
    }

    _handleAfterButtonTransition(buttonInstance) {
        if (!this.isActive) return;
        this._applyAmbientAnimation(buttonInstance);
    }

    _applyAmbientAnimation(buttonInstance) {
        if (!this.isActive || !this.configModule) return;
        
        if (typeof buttonInstance.stopHarmonicResonance !== 'function' || typeof buttonInstance.setCssIdleLightDriftActive !== 'function') {
            return;
        }

        buttonInstance.stopHarmonicResonance();
        buttonInstance.setCssIdleLightDriftActive(false);

        const R_PARAMS = this.configModule.HARMONIC_RESONANCE_PARAMS;
        const isSelected = buttonInstance.isSelected();
        const isEnergized = buttonInstance.getCurrentClasses().has(R_PARAMS.ELIGIBILITY_CLASS);

        if (isEnergized) {
            if (isSelected) {
                if (this.enableHarmonicResonance) {
                    buttonInstance.startHarmonicResonance();
                }
            } else {
                buttonInstance.setCssIdleLightDriftActive(true);
            }
        }
    }

    destroy() {
        if (this.resonanceTicker) {
            this.resonanceTicker.remove(this._updateResonance);
        }
        const rootStyle = document.documentElement.style;
        rootStyle.removeProperty('--harmonic-resonance-glow-opacity');
        rootStyle.removeProperty('--harmonic-resonance-glow-scale');
    }
}

export default AmbientAnimationManager;