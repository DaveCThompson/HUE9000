/**
 * @module Button
 * @description Represents a single UI button component, managing its state,
 * appearance (CSS classes, ARIA attributes), and specific animations.
 */
import { ButtonStates }  from './buttonManager.js';
import { appState } from './state/index.js';
import { IDLE_LIGHT_DRIFT_PARAMS, STATE_TRANSITION_ECHO_PARAMS } from './config/index.js';

class Button {
    constructor(domElement, config, gsapInstance) {
        this.element = domElement;
        this.config = config;
        this.gsap = gsapInstance;
        
        if (!this.gsap) throw new Error(`[Button CONSTRUCTOR ${this.getIdentifier()}] GSAP instance is not available.`);

        this.cssIdleDriftClassName = 'css-idle-drifting';
        this.idleDriftEaseInTween = null;
        this.currentClasses = new Set();
        this.currentFlickerAnim = null;
        this._pressTimeoutId = null;
        this._isSelected = config.isSelectedByDefault || false;
        this._isPermanentlyDisabled = false;
        this._isUndergoingManagedFlicker = false;
        this._isResonating = false;
        this.stateTransitionEchoTween = null;

        this._updateAriaAttributes();
    }

    getIdentifier() {
        return this.element.ariaLabel || this.element.id || this.config.value || `UnnamedButton_${this.config.groupId}_${this.config.type}`;
    }

    _setSelectionStateInternal(selected) {
        if (this._isSelected !== selected) {
            this._isSelected = selected;
        }
    }

    setState(newStateClassesStr, options = {}) {
        const { isFlickerCompletion = false, internalFlickerCall = false, forceState = false } = options;
        if (this._isUndergoingManagedFlicker && !isFlickerCompletion && !internalFlickerCall) {
            // This is a warning for developers that a state is being set mid-animation
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
        const newClassesArray = newStateClassesStr ? newStateClassesStr.split(' ').filter(c => c) : [];
        const newClassesSet = new Set(newClassesArray);
        const allPossibleStateClasses = Object.values(ButtonStates).flatMap(s => s.split(' ')).filter(c => c && c !== 'is-selected' && c !== ButtonStates.PERMANENTLY_DISABLED);
        [...new Set(allPossibleStateClasses)].forEach(cls => this.element.classList.remove(cls));
        newClassesSet.forEach(cls => { if (cls !== 'is-selected' && cls !== ButtonStates.PERMANENTLY_DISABLED) this.element.classList.add(cls); });
        this.element.classList.toggle('is-selected', this._isSelected);
        this.element.classList.toggle(ButtonStates.PERMANENTLY_DISABLED, this._isPermanentlyDisabled);
        this.currentClasses.clear();
        this.element.classList.forEach(cls => this.currentClasses.add(cls));
        this._updateAriaAttributes();
    }

    _updateAriaAttributes() {
        if (this.config.type === 'toggle') this.element.setAttribute('aria-pressed', this._isSelected.toString());
        else if (this.config.type === 'radio') this.element.setAttribute('aria-checked', this._isSelected.toString());
        this.element.setAttribute('aria-disabled', this._isPermanentlyDisabled.toString());
        const isVisuallyInteractive = Array.from(this.element.classList).some(cls => cls.startsWith('is-energized') || cls.startsWith('is-dimly-lit'));
        this.element.setAttribute('tabindex', (isVisuallyInteractive && !this._isPermanentlyDisabled) ? '0' : '-1');
    }

    getElement() { return this.element; }
    getGroupId() { return this.config.groupId; }
    getValue() { return this.config.value; }
    getCurrentClasses() { return new Set(this.element.classList); }
    isSelected() { return this._isSelected; }
    isPermanentlyDisabled() { return this._isPermanentlyDisabled; }

    setSelected(selected, options = {}) {
        const { skipAnimation = false, phaseContext = 'ButtonSetSelected' } = options;
        if (this._isPermanentlyDisabled) return;
        if (this._isSelected === selected) return;
        this._isSelected = selected;
        let baseStateClass = ButtonStates.ENERGIZED_UNSELECTED;
        if (this.element.classList.contains(ButtonStates.DIMLY_LIT.split(' ')[0])) baseStateClass = ButtonStates.DIMLY_LIT_UNSELECTED;
        const targetStateClasses = this._isSelected ? ButtonStates.ENERGIZED_SELECTED : baseStateClass;
        this.setState(targetStateClasses, { skipAnimation, phaseContext, forceState: true });
    }

    handleInteraction() {
        if (this._isPermanentlyDisabled) return;
        if (this.config.type === 'toggle') {
            this.setSelected(!this._isSelected, { phaseContext: `ToggleInteract_${this.getIdentifier()}` });
        } else if (this.config.type === 'radio' && !this._isSelected) {
            this.setSelected(true, { phaseContext: `RadioInteract_${this.getIdentifier()}` });
        }
    }

    setPressedVisuals(isPressed) {
        if (this._isPermanentlyDisabled) return;
        if (this._pressTimeoutId) clearTimeout(this._pressTimeoutId);
        this.element.classList.toggle(ButtonStates.PRESSING, isPressed);
        if (isPressed) {
            const durationMs = 120;
            this._pressTimeoutId = setTimeout(() => this.element.classList.remove(ButtonStates.PRESSING), durationMs + 50);
        }
    }

    setPermanentlyDisabled(isDisabled) {
        if (this._isPermanentlyDisabled === isDisabled) return;
        this._isPermanentlyDisabled = isDisabled;
        if (isDisabled) {
            this._isSelected = false;
            this.setState(ButtonStates.PERMANENTLY_DISABLED, { forceState: true });
        } else {
            this.setState(ButtonStates.ENERGIZED_UNSELECTED, { forceState: true });
        }
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
        if (this.idleDriftEaseInTween) this.idleDriftEaseInTween.kill();
        const lights = Array.from(this.element.querySelectorAll('.light'));
        if (lights.length === 0) return;
        if (isActive) {
            if (this.element.classList.contains(this.cssIdleDriftClassName)) return;
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
                value: targetVariation, duration: 2.0, delay: this.gsap.utils.random(0, 1.5), ease: 'sine.inOut',
                onUpdate: () => lights.forEach(l => l.style.setProperty('--light-idle-variation', variationProxy.value.toFixed(3)))
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
        if (this.stateTransitionEchoTween && this.stateTransitionEchoTween.isActive()) {
            this.stateTransitionEchoTween.kill();
        }
        const lights = Array.from(this.element.querySelectorAll('.light'));
        if (!lights.length) return;
        const E_PARAMS = STATE_TRANSITION_ECHO_PARAMS;
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
                opacity: targetPulseOpacity, duration: pulsePeriod / 2, yoyo: true, repeat: 1, ease: "sine.out"
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