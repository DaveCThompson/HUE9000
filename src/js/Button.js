/**
 * @module Button
 * @description Represents a single UI button component, managing its state,
 * appearance (CSS classes, ARIA attributes), and specific animations.
 * (Project Decouple Refactor)
 */
import { ButtonStates }  from './buttonManager.js';
import { IDLE_LIGHT_DRIFT_PARAMS, STATE_TRANSITION_ECHO_PARAMS } from './config/index.js';

class Button {
    constructor(domElement, config, gsapInstance, appStateService) {
        this.element = domElement;
        this.config = config; // { type, groupId, value, isSelectedByDefault }
        this.gsap = gsapInstance;
        this.appState = appStateService; // Use the passed appStateService

        this.debugAmbient = false;
        this.debugResistive = false;
        this.cssIdleDriftClassName = 'css-idle-drifting';
        this.idleDriftEaseInTween = null; // To manage the ease-in tween

        if (!this.gsap) throw new Error(`[Button CONSTRUCTOR ${this.getIdentifier()}] GSAP instance is not available.`);
        if (!this.appState) console.warn(`[Button CONSTRUCTOR ${this.getIdentifier()}] appStateService not available at construction.`);


        this.currentClasses = new Set();
        this.currentFlickerAnim = null; // For internally managed flickers, if any
        this._pressTimeoutId = null;
        this._isSelected = config.isSelectedByDefault || false;
        this._isPermanentlyDisabled = false;
        this._isUndergoingManagedFlicker = false; // New flag

        this._isResonating = false;
        this.stateTransitionEchoTween = null;

        this._updateAriaAttributes();
    }

    getIdentifier() {
        return this.element.ariaLabel || this.element.id || this.config.value || `UnnamedButton_${this.config.groupId}_${this.config.type}`;
    }

    /**
     * An internal-only method for programmatically setting the selection state
     * without triggering the complex visual logic of the public setSelected method.
     * @param {boolean} selected - The desired selection state.
     */
    _setSelectionStateInternal(selected) {
        if (this._isSelected !== selected) {
            this._isSelected = selected;
        }
    }

    setState(newStateClassesStr, options = {}) {
        const { 
            skipAria = false, 
            internalFlickerCall = false, // From Button's own internal flicker logic (if any)
            forceState = false, 
            phaseContext,
            isFlickerCompletion = false // New: From ButtonManager's onFlickerComplete
        } = options;

        const effectivePhaseContext = phaseContext || 'UnknownPhase_ButtonSetState';
        const buttonId = this.getIdentifier();
        
        const currentFlickerActive = this.currentFlickerAnim ? this.currentFlickerAnim.isActive() : 'N/A_ButtonJSLocalFlicker';
        // console.log(`[BTN_SETSTATE | ${performance.now().toFixed(2)}ms] ID: ${buttonId}, NewState: '${newStateClassesStr}', Opts: ${JSON.stringify(options)}, _isUndergoingManagedFlicker: ${this._isUndergoingManagedFlicker}, CurrentInternalFlickerActive: ${currentFlickerActive}`);


        if (this._isUndergoingManagedFlicker && !isFlickerCompletion && !internalFlickerCall) {
            // console.warn(`[BTN_SETSTATE_INTERFERENCE | ${performance.now().toFixed(2)}ms] ID: ${buttonId} received setState WHILE _isUndergoingManagedFlicker. NewState: '${newStateClassesStr}'. Opts: ${JSON.stringify(options)}. Flicker might be cut short or visuals reset.`);
            // Decide if we should return, or apply a very minimal state change (e.g. only classes)
            // For now, proceeding but this log is key. The clearProps logic below will be affected.
        }
        
        // Check if this specific setState call is the one immediately following a P7 flicker to dimly-lit
        const isFinalSetAfterP7DimlyLitFlicker = effectivePhaseContext.endsWith('_FinalSet') && 
                                                 effectivePhaseContext.includes('PhaseRunner_P7_buttonFlickerToDimlyLit') &&
                                                 newStateClassesStr === ButtonStates.DIMLY_LIT;

        if (isFinalSetAfterP7DimlyLitFlicker && buttonId.includes('Assign')) { 
            // console.log(`[BTN_SETSTATE_START P7_VISUALS_FINAL_DIM] Button: ${buttonId}. NewState: '${newStateClassesStr}'. Force: ${forceState}. AppTime: ${performance.now().toFixed(2)}`);
        } else if (effectivePhaseContext.includes('PhaseRunner_P7_buttonFlickerToDimlyLit') && buttonId.includes('Assign')) { 
            //  console.log(`[BTN_SETSTATE_START P7_VISUALS_OTHER] Button: ${buttonId}. NewState: '${newStateClassesStr}'. EffectiveCtx: ${effectivePhaseContext}. AppTime: ${performance.now().toFixed(2)}`);
        }


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
            if (this._isPermanentlyDisabled) targetManagedClasses.add(ButtonStates.PERMANENTLY_DISABLED); else targetManagedClasses.delete(ButtonStates.PERMANENTLY_DISABLED);

            if (currentManagedClassesOnElement.size !== targetManagedClasses.size) stateChanged = true;
            else {
                for (const cls of targetManagedClasses) {
                    if (!currentManagedClassesOnElement.has(cls)) { stateChanged = true; break; }
                }
            }
        }

        if (this.debugResistive && this.getIdentifier().includes("MAIN PWR OFF") && newStateClassesStr === ButtonStates.PERMANENTLY_DISABLED) {
            // console.log(`[Button ${buttonId} setState - ${effectivePhaseContext}] Setting to PERMANENTLY_DISABLED. stateChanged: ${stateChanged}, forceState: ${forceState}`);
        }

        if (!stateChanged && !forceState) {
            if (!skipAria) this._updateAriaAttributes();
            return;
        }

        // This currentFlickerAnim is for Button.js's *own* flickers, not those from ButtonManager.
        if (!internalFlickerCall && this.currentFlickerAnim && this.currentFlickerAnim.isActive()) {
            // console.log(`[BTN_SETSTATE | ${performance.now().toFixed(2)}ms] ID: ${buttonId} killing its OWN internal flicker due to non-internal setState call.`);
            this.currentFlickerAnim.kill(); this.currentFlickerAnim = null;
        }

        // Revised clearProps logic - BECOMES UNCONDITIONAL for non-internal calls
        if (!internalFlickerCall) {
            this.element.classList.remove(ButtonStates.FLICKERING); // Remove if this class is managed by Button.js

            const lights = Array.from(this.element.querySelectorAll('.light'));
            if (lights.length > 0) {
                this.gsap.set(lights, { clearProps: "all" });
            }
            this.gsap.set(this.element, { clearProps: "css" }); // Clears CSS vars like --btn-glow-color
        }


        const allPossibleStateClasses = Object.values(ButtonStates).flatMap(s => s.split(' ')).filter(c => c && c !== 'is-selected' && c !== ButtonStates.PERMANENTLY_DISABLED);
        [...new Set(allPossibleStateClasses)].forEach(cls => {
            if (this.element.classList.contains(cls)) this.element.classList.remove(cls);
        });
        newClassesSet.forEach(cls => { if (cls !== 'is-selected' && cls !== ButtonStates.PERMANENTLY_DISABLED) this.element.classList.add(cls); });

        if (this._isSelected) this.element.classList.add('is-selected');
        else this.element.classList.remove('is-selected');

        if (this._isPermanentlyDisabled) this.element.classList.add(ButtonStates.PERMANENTLY_DISABLED);
        else this.element.classList.remove(ButtonStates.PERMANENTLY_DISABLED);

        this.currentClasses.clear();
        this.element.classList.forEach(cls => this.currentClasses.add(cls));
        if (!skipAria) this._updateAriaAttributes();

        if (isFinalSetAfterP7DimlyLitFlicker && buttonId.includes('Assign')) {
            const finalClasses = Array.from(this.element.classList).join(' ');
            const lights = Array.from(this.element.querySelectorAll('.light'));
            const finalLightOpacities = lights.map(l => l.style.opacity || getComputedStyle(l).opacity ).join(', ');
            // console.log(`[BTN_SETSTATE_END P7_VISUALS_FINAL_DIM] Button: ${buttonId}. FinalClasses: '${finalClasses}'. Final Light Opacities (inline||computed): [${finalLightOpacities}]. AppTime: ${performance.now().toFixed(2)}`);
        } else if (effectivePhaseContext.includes('PhaseRunner_P7_buttonFlickerToDimlyLit') && buttonId.includes('Assign')) {
             const finalClasses = Array.from(this.element.classList).join(' ');
            // console.log(`[BTN_SETSTATE_END P7_VISUALS_OTHER] Button: ${buttonId}. EffectiveCtx: ${effectivePhaseContext}. FinalClasses: '${finalClasses}'. AppTime: ${performance.now().toFixed(2)}`);
        }
    }

    _updateAriaAttributes() {
        const isEffectivelySelected = this._isSelected;
        if (this.config.type === 'toggle') this.element.setAttribute('aria-pressed', isEffectivelySelected.toString());
        else if (this.config.type === 'radio') this.element.setAttribute('aria-checked', isEffectivelySelected.toString());

        if (this._isPermanentlyDisabled) {
            this.element.setAttribute('aria-disabled', 'true');
            this.element.setAttribute('tabindex', '-1');
        } else {
            this.element.removeAttribute('aria-disabled');
            const isVisuallyInteractive = Array.from(this.element.classList).some(cls =>
                cls === ButtonStates.ENERGIZED_UNSELECTED.split(' ')[0] ||
                cls === ButtonStates.DIMLY_LIT.split(' ')[0]
            );
            this.element.setAttribute('tabindex', isVisuallyInteractive ? '0' : '-1');
        }
    }

    getElement() { return this.element; }
    getGroupId() { return this.config.groupId; }
    getValue() { return this.config.value; }
    getCurrentClasses() { return new Set(this.element.classList); }
    getCurrentStateClasses() { return Array.from(this.element.classList).join(' '); }
    isSelected() { return this._isSelected; }
    isPermanentlyDisabled() { return this._isPermanentlyDisabled; }

    setSelected(selected, options = {}) {
        const { skipAnimation = false, phaseContext = 'ButtonSetSelected' } = options;
        const buttonId = this.getIdentifier();

        if (this._isPermanentlyDisabled && selected === false && this.getIdentifier().includes("MAIN PWR OFF")) {
            // if (this.debugResistive) console.log(`[Button ${buttonId} setSelected] Allowing deselect for permanently disabled OFF button during reset.`);
        } else if (this._isPermanentlyDisabled) {
            // if (this.debugResistive) console.log(`[Button ${buttonId} setSelected] Blocked: Button is permanently disabled.`);
            return;
        }

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
        this.setState(targetStateClasses, { skipAnimation, phaseContext, forceState: true });
    }

    handleInteraction() {
        const buttonId = this.getIdentifier();
        if (this._isPermanentlyDisabled) {
            // if (this.debugResistive) console.log(`[Button ${buttonId} handleInteraction] Blocked: Button is permanently disabled.`);
            return;
        }

        if (this.config.type === 'toggle') {
            this.setSelected(!this._isSelected, { phaseContext: `ToggleInteract_${buttonId}` });
        } else if (this.config.type === 'radio') {
            if (!this._isSelected) {
                this.setSelected(true, { phaseContext: `RadioInteract_${buttonId}` });
            }
        }
    }

    setPressedVisuals(isPressed) {
        if (this._isPermanentlyDisabled) return;

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

    setPermanentlyDisabled(isDisabled) {
        const buttonId = this.getIdentifier();
        if (this._isPermanentlyDisabled === isDisabled) return;

        this._isPermanentlyDisabled = isDisabled;
        // if (this.debugResistive) console.log(`[Button ${buttonId} setPermanentlyDisabled] Set to: ${isDisabled}`);

        if (isDisabled) {
            if (this._isSelected) {
                this._isSelected = false;
            }
            this.setState(ButtonStates.PERMANENTLY_DISABLED, { phaseContext: `PermanentlyDisable_${buttonId}`, forceState: true });
        } else {
            this.setState(ButtonStates.ENERGIZED_UNSELECTED, { phaseContext: `ResetFromDisabled_${buttonId}`, forceState: true });
        }
        this._updateAriaAttributes();
    }

    startHarmonicResonance() {
        if (this.element.classList.contains('is-resonating')) return;
        this._isResonating = true;
        this.element.classList.add('is-resonating');
    }

    stopHarmonicResonance() {
        if (!this.element.classList.contains('is-resonating')) return;
        this._isResonating = false;
        this.element.classList.remove('is-resonating');
    }

    setCssIdleLightDriftActive(isActive) {
        if (this.idleDriftEaseInTween) {
            this.idleDriftEaseInTween.kill();
            this.idleDriftEaseInTween = null;
        }

        const lights = Array.from(this.element.querySelectorAll('.light'));
        if (lights.length === 0) return;

        if (isActive) {
            if (this.element.classList.contains(this.cssIdleDriftClassName)) return;

            // FIX: Use the configured base opacity directly instead of reading from the DOM.
            // This prevents race conditions during state transitions.
            const D_PARAMS = IDLE_LIGHT_DRIFT_PARAMS;
            const baseOpacity = D_PARAMS.BASE_LIGHT_OPACITY_UNSELECTED_ENERGIZED;
            const targetVariation = baseOpacity * D_PARAMS.OPACITY_VARIATION_FACTOR;
            const variationProxy = { value: 0 };

            const randomDuration = this.gsap.utils.random(D_PARAMS.PERIOD_MIN, D_PARAMS.PERIOD_MAX);
            lights.forEach(light => {
                light.style.setProperty('--light-idle-base-opacity', baseOpacity.toFixed(3));
                light.style.setProperty('--light-idle-variation', '0');
                light.style.setProperty('--light-idle-duration', `${randomDuration}s`);
                light.style.setProperty('--light-idle-delay', '0s');
            });

            this.element.classList.add(this.cssIdleDriftClassName);

            this.idleDriftEaseInTween = this.gsap.to(variationProxy, {
                value: targetVariation,
                duration: 2.0,
                delay: this.gsap.utils.random(0, 1.5),
                ease: 'sine.inOut',
                onUpdate: () => {
                    lights.forEach(light => {
                        light.style.setProperty('--light-idle-variation', variationProxy.value.toFixed(3));
                    });
                }
            });

        } else {
            if (!this.element.classList.contains(this.cssIdleDriftClassName)) return;
            this.element.classList.remove(this.cssIdleDriftClassName);
            lights.forEach(light => {
                light.style.removeProperty('--light-idle-base-opacity');
                light.style.removeProperty('--light-idle-variation');
                light.style.removeProperty('--light-idle-duration');
                light.style.removeProperty('--light-idle-delay');
            });
        }
    }

    playStateTransitionEcho() {
        const buttonId = this.getIdentifier(); // For logging

        if (this.stateTransitionEchoTween && this.stateTransitionEchoTween.isActive()) {
            const currentPhase = this.appState && this.appState.getCurrentStartupPhaseNumber ? this.appState.getCurrentStartupPhaseNumber() : -1;
            if (buttonId.includes('Assign') && currentPhase === 7) {
                // console.warn(`[BTN_ECHO_START_OVERLAP P7_VISUALS] Button: ${buttonId}. Starting echo while previous echo was active. AppTime: ${performance.now().toFixed(2)}`);
            }
            this.stateTransitionEchoTween.kill();
        }

        const currentPhase = this.appState && this.appState.getCurrentStartupPhaseNumber ? this.appState.getCurrentStartupPhaseNumber() : -1;
        if (buttonId.includes('Assign') && currentPhase === 7) {
            //  console.log(`[BTN_ECHO_START P7_VISUALS] Button: ${buttonId}. Echo requested (but will be skipped by ButtonManager). AppTime: ${performance.now().toFixed(2)}`);
        }


        const lights = Array.from(this.element.querySelectorAll('.light'));
        if (!lights.length) return;

        const E_PARAMS = STATE_TRANSITION_ECHO_PARAMS;
        const tl = this.gsap.timeline({
            delay: E_PARAMS.DELAY_AFTER_TRANSITION,
            onComplete: () => { 
                this.stateTransitionEchoTween = null; 
                const endPhase = this.appState && this.appState.getCurrentStartupPhaseNumber ? this.appState.getCurrentStartupPhaseNumber() : -1;
                if (buttonId.includes('Assign') && endPhase <= 7 && endPhase !== -1) { 
                    //  console.log(`[BTN_ECHO_END P7_VISUALS] Button: ${buttonId}. Echo (if it ran) would have ended. AppTime: ${performance.now().toFixed(2)}`);
                }
            }
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
        if (this.currentFlickerAnim && this.currentFlickerAnim.isActive()) this.currentFlickerAnim.kill();
        if (this._pressTimeoutId) clearTimeout(this._pressTimeoutId);
        if (this.idleDriftEaseInTween) this.idleDriftEaseInTween.kill();
        this.stopHarmonicResonance();
        this.setCssIdleLightDriftActive(false);
        if (this.stateTransitionEchoTween && this.stateTransitionEchoTween.isActive()) this.stateTransitionEchoTween.kill();
    }
}

export default Button;