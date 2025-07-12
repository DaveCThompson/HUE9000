/**
 * @module AmbientAnimationManager
 * @description Manages continuous ambient animations for UI elements,
 * particularly buttons (Harmonic Resonance, Idle Light Drift) and now V2 Displays.
 * Works in conjunction with ButtonManager and appState.
 */
import { serviceLocator } from './serviceLocator.js';
import * as appState from './appState.js'; // IMPORT appState directly
import { HARMONIC_RESONANCE_PARAMS } from './config/index.js';

class AmbientAnimationManager {
    constructor() {
        this.gsap = null;
        this.buttonManager = null; // Initialize to null

        this.isActive = false;
        this.globalResonanceParams = { progress: 0 };
        this.resonanceTicker = null;

        this.debug = false;
        this.enableHarmonicResonance = true;

        this._updateResonance = this._updateResonance.bind(this);
    }

    init() {
        this.gsap = serviceLocator.get('gsap');

        // Use safe get for buttonManager as it's optional (desktop-only)
        this.buttonManager = serviceLocator.get('buttonManager', true);

        if (!HARMONIC_RESONANCE_PARAMS) {
            console.error('[AAM INIT] HARMONIC_RESONANCE_PARAMS not found in config. Disabling.');
            this.enableHarmonicResonance = false;
        } else {
            this.enableHarmonicResonance = HARMONIC_RESONANCE_PARAMS.ENABLED;
        }

        appState.subscribe('appStatusChanged', (status) => this._handleAppStatusChange(status));
        appState.subscribe('ambientPulse', ({ progress }) => this._handleAmbientPulse({ progress }));

        if (this.buttonManager && typeof this.buttonManager.subscribe === 'function') {
            this.buttonManager.subscribe('beforeButtonTransition', (buttonInstance) => this._handleBeforeButtonTransition(buttonInstance));
            this.buttonManager.subscribe('afterButtonTransition', (buttonInstance) => this._handleAfterButtonTransition(buttonInstance));
        }

        this.resonanceTicker = this.gsap.ticker;
        this._handleAppStatusChange(appState.getAppStatus());
    }

    _updateResonance() {
        if (!this.isActive || !this.enableHarmonicResonance) return;

        const R_PARAMS = HARMONIC_RESONANCE_PARAMS;
        const time = this.gsap.ticker.time;
        const progress = (Math.sin((time * Math.PI * 2) / R_PARAMS.PERIOD) + 1) / 2;

        appState.emit('ambientPulse', { progress });
    }

    _handleAmbientPulse({ progress }) {
        if (!this.isActive || !this.enableHarmonicResonance || !this.gsap.utils) return;

        const R_PARAMS = HARMONIC_RESONANCE_PARAMS;
        const glowOpacity = this.gsap.utils.interpolate(R_PARAMS.GLOW_OPACITY_RANGE[0], R_PARAMS.GLOW_OPACITY_RANGE[1], progress);
        const glowScale = this.gsap.utils.interpolate(R_PARAMS.GLOW_SCALE_RANGE[0], R_PARAMS.GLOW_SCALE_RANGE[1], progress);

        const rootStyle = document.documentElement.style;
        rootStyle.setProperty('--harmonic-resonance-glow-opacity', glowOpacity.toFixed(3));
        rootStyle.setProperty('--harmonic-resonance-glow-scale', glowScale.toFixed(3));
    }


    _handleAppStatusChange(newStatus) {
        const previouslyActive = this.isActive;
        this.isActive = (newStatus === 'interactive');

        if (this.isActive && !previouslyActive) {
            // FIX: Removed the delayedCall. The reaction to becoming interactive should be
            // immediate to ensure animations are applied to the now-settled state.
            if (this.enableHarmonicResonance) this.resonanceTicker.add(this._updateResonance);

            if (this.buttonManager) {
                const buttons = this.buttonManager.getAllButtonInstances();
                for (const button of buttons) {
                    this._applyAmbientAnimation(button);
                }
            }

        } else if (!this.isActive && previouslyActive) {
            if (this.enableHarmonicResonance) {
                this.resonanceTicker.remove(this._updateResonance);
                const rootStyle = document.documentElement.style;
                rootStyle.removeProperty('--harmonic-resonance-glow-opacity');
                rootStyle.removeProperty('--harmonic-resonance-glow-scale');
            }
            if (this.buttonManager) {
                const buttons = this.buttonManager.getAllButtonInstances();
                for (const button of buttons) {
                    if (typeof button.stopHarmonicResonance === 'function') button.stopHarmonicResonance();
                    if (typeof button.setCssIdleLightDriftActive === 'function') button.setCssIdleLightDriftActive(false);
                }
            }
        }
    }

    _handleBeforeButtonTransition(buttonInstance) {
        if (!this.isActive) return;
        if (typeof buttonInstance.stopHarmonicResonance === 'function') buttonInstance.stopHarmonicResonance();
        // FIX: Corrected typo from `button` to `buttonInstance`
        if (typeof buttonInstance.setCssIdleLightDriftActive === 'function') buttonInstance.setCssIdleLightDriftActive(false);
    }

    _handleAfterButtonTransition(buttonInstance) {
        if (!this.isActive) return;
        
        const buttonId = buttonInstance.getIdentifier();
        const isP7HueButton = buttonId.includes('Assign') && appState.getCurrentStartupPhaseNumber() === 7; 
        if (isP7HueButton) {
            // console.log(`[AAM_AFTER_TRANS P7_VISUALS] Button: ${buttonId}. isActive: ${this.isActive}. AppTime: ${performance.now().toFixed(2)}`);
        }
        this._applyAmbientAnimation(buttonInstance);
    }

    _applyAmbientAnimation(buttonInstance) {
        if (!this.isActive) return;
        
        if (typeof buttonInstance.stopHarmonicResonance !== 'function' || typeof buttonInstance.setCssIdleLightDriftActive !== 'function') {
            return;
        }

        buttonInstance.stopHarmonicResonance();
        buttonInstance.setCssIdleLightDriftActive(false);

        const R_PARAMS = HARMONIC_RESONANCE_PARAMS;
        const isSelected = buttonInstance.isSelected();
        const currentClasses = buttonInstance.getCurrentClasses();
        const isEnergized = currentClasses.has(R_PARAMS.ELIGIBILITY_CLASS);
        const buttonId = buttonInstance.getIdentifier();

        const isP7HueButton = buttonId.includes('Assign') && appState.getCurrentStartupPhaseNumber() === 7;
        if (isP7HueButton) {
            if (isEnergized && this.isActive) {
                //  console.warn(`[AAM_APPLY_EFFECT P7_VISUALS_WARN] Button: ${buttonId}. AAM IS APPLYING EFFECT (Resonance/Drift) during P7. This might be UNINTENDED.`);
            }
        }

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