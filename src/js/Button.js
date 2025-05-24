/**
 * @module Button
 * @description Represents a single UI button component, managing its state,
 * appearance (CSS classes, ARIA attributes), and specific animations.
 * (REFACTOR-V2.3 - Ambient Animations Update)
 */
import { ButtonStates }  from './buttonManager.js';

class Button {
    constructor(domElement, config, gsapInstance, appStateService, configModule, uiUpdaterService) {
        this.element = domElement;
        this.config = config; // { type, groupId, value, isSelectedByDefault }
        this.gsap = gsapInstance;
        this.appState = appStateService;
        this.configModule = configModule; // Passed by ButtonManager
        this.uiUpdater = uiUpdaterService;
        this.debugAmbient = false; 

        if (!this.gsap) {
            throw new Error(`[Button CONSTRUCTOR ${this.getIdentifier()}] GSAP instance is not available.`);
        }
        if (!this.configModule) {
        }

        this.currentClasses = new Set();
        this.currentFlickerAnim = null;
        this._pressTimeoutId = null;
        this._isSelected = config.isSelectedByDefault || false;

        this._isResonating = false; // Internal flag, primarily for consistency if JS logic was still used
        this.idleLightDriftTweens = [];
        this.stateTransitionEchoTween = null;

        this._updateAriaAttributes();
    }

    setConfigModule(configModuleInstance) {
        this.configModule = configModuleInstance;
    }

    getIdentifier() {
        return this.element.ariaLabel || this.element.id || this.config.value || `UnnamedButton_${this.config.groupId}_${this.config.type}`;
    }

    setState(newStateClassesStr, options = {}) {
        const { skipAria = false, internalFlickerCall = false, forceState = false, phaseContext } = options;
        const effectivePhaseContext = phaseContext || 'UnknownPhase_ButtonSetState';
        const buttonId = this.getIdentifier();

        const newClassesArray = newStateClassesStr ? newStateClassesStr.split(' ').filter(c => c) : [];
        const newClassesSet = new Set(newClassesArray);
        let stateChanged = forceState;

        if (!stateChanged) {
            const currentManagedClassesOnElement = new Set();
            Object.values(ButtonStates).flatMap(s => s.split(' ')).forEach(cls => {
                if (this.element.classList.contains(cls)) currentManagedClassesOnElement.add(cls);
            });
            const targetManagedClasses = new Set(newClassesArray);
            if (this._isSelected) targetManagedClasses.add('is-selected'); else targetManagedClasses.delete('is-selected');

            if (currentManagedClassesOnElement.size !== targetManagedClasses.size) stateChanged = true;
            else {
                for (const cls of targetManagedClasses) {
                    if (!currentManagedClassesOnElement.has(cls)) { stateChanged = true; break; }
                }
            }
        }

        if (!stateChanged && !forceState) {
            if (!skipAria) this._updateAriaAttributes();
            return;
        }

        if (!internalFlickerCall && this.currentFlickerAnim && this.currentFlickerAnim.isActive()) {
            this.currentFlickerAnim.kill(); this.currentFlickerAnim = null;
        }

        if (!internalFlickerCall) {
            this.element.classList.remove(ButtonStates.FLICKERING);
            const lights = Array.from(this.element.querySelectorAll('.light'));
            if (lights.length > 0) this.gsap.set(lights, { clearProps: "all" });
            this.gsap.set(this.element, { clearProps: "css" }); 
        }

        const allPossibleStateClasses = Object.values(ButtonStates).flatMap(s => s.split(' ')).filter(c => c && c !== 'is-selected');
        [...new Set(allPossibleStateClasses)].forEach(cls => {
            if (this.element.classList.contains(cls)) this.element.classList.remove(cls);
        });
        newClassesSet.forEach(cls => { if (cls !== 'is-selected') this.element.classList.add(cls); });

        if (this._isSelected) this.element.classList.add('is-selected');
        else this.element.classList.remove('is-selected');

        this.currentClasses.clear();
        this.element.classList.forEach(cls => this.currentClasses.add(cls));
        if (!skipAria) this._updateAriaAttributes();
    }

    _updateAriaAttributes() {
        const isEffectivelySelected = this._isSelected;
        if (this.config.type === 'toggle') this.element.setAttribute('aria-pressed', isEffectivelySelected.toString());
        else if (this.config.type === 'radio') this.element.setAttribute('aria-checked', isEffectivelySelected.toString());

        const isVisuallyInteractive = Array.from(this.element.classList).some(cls =>
            cls === ButtonStates.ENERGIZED_UNSELECTED.split(' ')[0] ||
            cls === ButtonStates.DIMLY_LIT.split(' ')[0]
        );
        this.element.setAttribute('tabindex', isVisuallyInteractive ? '0' : '-1');
    }

    getElement() { return this.element; }
    getGroupId() { return this.config.groupId; }
    getValue() { return this.config.value; }
    getCurrentClasses() { return new Set(this.element.classList); }
    getCurrentStateClasses() { return Array.from(this.element.classList).join(' '); }
    isSelected() { return this._isSelected; }

    setSelected(selected, options = {}) {
        const { skipAnimation = false, themeContext = 'theme-dark', phaseContext = 'ButtonSetSelected' } = options;
        const buttonId = this.getIdentifier();

        let domNeedsUpdateForSelectedClass = false;
        if (this._isSelected === selected) {
            if (selected && !this.element.classList.contains('is-selected')) domNeedsUpdateForSelectedClass = true;
            if (!selected && this.element.classList.contains('is-selected')) domNeedsUpdateForSelectedClass = true;
            if (!domNeedsUpdateForSelectedClass) {
                return;
            }
        } else {
            this._isSelected = selected;
        }

        let baseStateClass = ButtonStates.ENERGIZED_UNSELECTED;
        if (this.element.classList.contains(ButtonStates.DIMLY_LIT.split(' ')[0])) baseStateClass = ButtonStates.DIMLY_LIT_UNSELECTED;
        else if (this.element.classList.contains(ButtonStates.UNLIT.split(' ')[0])) baseStateClass = ButtonStates.UNLIT;
        else if (this.element.classList.contains(ButtonStates.ENERGIZED_UNSELECTED.split(' ')[0])) baseStateClass = ButtonStates.ENERGIZED_UNSELECTED;

        let targetStateClasses = baseStateClass;
        if (this._isSelected) {
            if (baseStateClass === ButtonStates.DIMLY_LIT_UNSELECTED) targetStateClasses = ButtonStates.DIMLY_LIT_SELECTED;
            else if (baseStateClass === ButtonStates.ENERGIZED_UNSELECTED) targetStateClasses = ButtonStates.ENERGIZED_SELECTED;
            else if (baseStateClass === ButtonStates.UNLIT) targetStateClasses = ButtonStates.ENERGIZED_SELECTED; 
        } else {
            if (baseStateClass === ButtonStates.DIMLY_LIT_SELECTED) targetStateClasses = ButtonStates.DIMLY_LIT_UNSELECTED;
            else if (baseStateClass === ButtonStates.ENERGIZED_SELECTED) targetStateClasses = ButtonStates.ENERGIZED_UNSELECTED;
        }
        this.setState(targetStateClasses, { skipAnimation, themeContext, phaseContext, forceState: true });
    }

    handleInteraction(eventType) {
        const buttonId = this.getIdentifier();
        if (this.config.type === 'toggle') {
            this.setSelected(!this._isSelected, { themeContext: this.appState.getCurrentTheme(), phaseContext: `ToggleInteract_${buttonId}` });
        } else if (this.config.type === 'radio') {
            if (!this._isSelected) {
                this.setSelected(true, { themeContext: this.appState.getCurrentTheme(), phaseContext: `RadioInteract_${buttonId}` });
            }
        } else if (this.config.type === 'action') {
        }
    }

    setPressedVisuals(isPressed) {
        const buttonId = this.getIdentifier();
        if (this._pressTimeoutId && this.element.classList.contains(ButtonStates.PRESSING) && !isPressed) {
            clearTimeout(this._pressTimeoutId); this._pressTimeoutId = null;
        }
        if (isPressed) {
            this.element.classList.add(ButtonStates.PRESSING);
            const pressAnimationDurationString = getComputedStyle(this.element).getPropertyValue('--button-unit-pressed-effect-duration-css').trim() || '0.12s';
            const pressAnimationDurationMs = parseFloat(pressAnimationDurationString) * (pressAnimationDurationString.endsWith('ms') ? 1 : 1000);
            this._pressTimeoutId = setTimeout(() => {
                this.element.classList.remove(ButtonStates.PRESSING); this._pressTimeoutId = null;
            }, pressAnimationDurationMs + 50);
        } else {
            this.element.classList.remove(ButtonStates.PRESSING);
        }
    }

    updateHarmonicResonanceVisuals(progress) {
        // This method is now largely obsolete for the CSS-driven Harmonic Resonance.
        // It's kept in case direct JS manipulation is needed for other effects or if the CSS approach is reverted.
        // If enableHarmonicResonance is false in AAM, or if the CSS method is active, this won't have a direct visual effect.
        if (!this.configModule || !this._isResonating) { // _isResonating is still set by start/stop
            return;
        }
        // If direct JS control was still needed:
        // const lights = Array.from(this.element.querySelectorAll('.light'));
        // if (!lights.length) return;
        // const R_PARAMS = this.configModule.HARMONIC_RESONANCE_PARAMS;
        // const dipAmount = progress * R_PARAMS.LIGHT_OPACITY_DIP_FACTOR; 
        // const targetOpacity = R_PARAMS.BASE_LIGHT_OPACITY_SELECTED * (1 - dipAmount);
        // this.gsap.to(lights, { opacity: targetOpacity, duration: R_PARAMS.TICK_UPDATE_DURATION, ease: "none" });
        if (this.debugAmbient) console.log(`[Button ${this.getIdentifier()} updateHarmonicResonanceVisuals] Called. Progress: ${progress.toFixed(3)}. (CSS method should be active)`);
    }

    startHarmonicResonance() {
        if (!this.configModule) return;
        if (this.debugAmbient) console.log(`[Button ${this.getIdentifier()}] Attempting to START Harmonic Resonance. Current _isResonating: ${this._isResonating}, Class active: ${this.element.classList.contains('is-resonating')}`);
        if (this.element.classList.contains('is-resonating')) return; 

        this._isResonating = true; // Keep internal flag for consistency
        this.element.classList.add('is-resonating'); 
        if (this.debugAmbient) console.log(`[Button ${this.getIdentifier()}] Harmonic Resonance STARTED. Added .is-resonating class.`);
    }

    stopHarmonicResonance() {
        if (!this.configModule) return;
        if (this.debugAmbient) console.log(`[Button ${this.getIdentifier()}] Attempting to STOP Harmonic Resonance. Current _isResonating: ${this._isResonating}, Class active: ${this.element.classList.contains('is-resonating')}`);
        if (!this.element.classList.contains('is-resonating')) return;

        this._isResonating = false; // Keep internal flag for consistency
        this.element.classList.remove('is-resonating');
        if (this.debugAmbient) console.log(`[Button ${this.getIdentifier()}] Harmonic Resonance STOPPED. Removed .is-resonating class.`);
        // Lights will revert to their normal opacity via CSS, no need for GSAP.set here.
    }

    startIdleLightDrift() {
        if (!this.configModule) return;
        this.stopIdleLightDrift(); 

        const lights = Array.from(this.element.querySelectorAll('.light'));
        if (!lights.length) return;

        const D_PARAMS = this.configModule.IDLE_LIGHT_DRIFT_PARAMS;
        if (this.debugAmbient) console.log(`[Button ${this.getIdentifier()}] Starting Idle Light Drift for ${lights.length} lights.`);

        lights.forEach((light, index) => {
            const baseOpacity = D_PARAMS.BASE_LIGHT_OPACITY_UNSELECTED_ENERGIZED;
            const variation = baseOpacity * D_PARAMS.OPACITY_VARIATION_FACTOR;
            const minOpacity = baseOpacity - variation;
            const maxOpacity = baseOpacity + variation;

            const tween = this.gsap.fromTo(light,
                { opacity: this.gsap.utils.random(minOpacity, maxOpacity) }, 
                {
                    opacity: this.gsap.utils.random(minOpacity, maxOpacity),
                    duration: this.gsap.utils.random(D_PARAMS.PERIOD_MIN, D_PARAMS.PERIOD_MAX) / 2, 
                    yoyo: true,
                    repeat: -1,
                    delay: this.gsap.utils.random(0, D_PARAMS.PERIOD_MAX / 4) + (index * D_PARAMS.STAGGER_PER_LIGHT), 
                    ease: "sine.inOut",
                    overwrite: "auto"
                }
            );
            this.idleLightDriftTweens.push(tween);
        });
    }

    stopIdleLightDrift() {
        if (!this.configModule) return;
        if (this.idleLightDriftTweens.length === 0) return;
        if (this.debugAmbient) console.log(`[Button ${this.getIdentifier()}] Stopping Idle Light Drift (${this.idleLightDriftTweens.length} tweens).`);
        this.idleLightDriftTweens.forEach(tween => tween.kill());
        this.idleLightDriftTweens = [];

        const lights = Array.from(this.element.querySelectorAll('.light'));
        if (lights.length > 0) {
            this.gsap.set(lights, { 
                opacity: this.configModule.IDLE_LIGHT_DRIFT_PARAMS.BASE_LIGHT_OPACITY_UNSELECTED_ENERGIZED,
            });
        }
    }

    playStateTransitionEcho() {
        if (!this.configModule) return;
        if (this.stateTransitionEchoTween && this.stateTransitionEchoTween.isActive()) {
            this.stateTransitionEchoTween.kill();
        }

        const lights = Array.from(this.element.querySelectorAll('.light'));
        if (!lights.length) return;

        const E_PARAMS = this.configModule.STATE_TRANSITION_ECHO_PARAMS;

        const tl = this.gsap.timeline({
            delay: E_PARAMS.DELAY_AFTER_TRANSITION,
            onComplete: () => { this.stateTransitionEchoTween = null; }
        });
        this.stateTransitionEchoTween = tl;

        const baseOpacity = parseFloat(getComputedStyle(lights[0]).opacity); 

        for (let i = 0; i < E_PARAMS.NUM_PULSES; i++) {
            const pulseIntensityFactor = E_PARAMS.INITIAL_LIGHT_INTENSITY_FACTOR * Math.pow(E_PARAMS.LIGHT_DECAY_FACTOR, i);
            const targetPulseOpacity = baseOpacity * (1 - pulseIntensityFactor); 
            const pulsePeriod = E_PARAMS.BASE_PULSE_PERIOD * Math.pow(E_PARAMS.PERIOD_DECAY_FACTOR, i);

            tl.to(lights, {
                opacity: targetPulseOpacity,
                duration: pulsePeriod / 2,
                yoyo: true,
                repeat: 1, 
                ease: "sine.out"
            }, i === 0 ? ">" : `-=${pulsePeriod * 0.3}`); 
        }
    }


    destroy() {
        const buttonId = this.getIdentifier();
        if (this.currentFlickerAnim && this.currentFlickerAnim.isActive()) this.currentFlickerAnim.kill();
        if (this._pressTimeoutId) clearTimeout(this._pressTimeoutId);

        this.stopHarmonicResonance();
        this.stopIdleLightDrift();
        if (this.stateTransitionEchoTween && this.stateTransitionEchoTween.isActive()) this.stateTransitionEchoTween.kill();
    }
}

export default Button;