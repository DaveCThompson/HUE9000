/**
 * @module Button
 * @description Represents a single UI button component, managing its state,
 * appearance (CSS classes, ARIA attributes), and specific animations.
 * (Project Decouple Refactor)
 */
import { ButtonStates }  from './buttonManager.js';

class Button {
    constructor(domElement, config, gsapInstance, appStateService, configModule) {
        this.element = domElement;
        this.config = config; // { type, groupId, value, isSelectedByDefault }
        this.gsap = gsapInstance;
        this.appState = appStateService;
        this.configModule = configModule;

        this.debugAmbient = false;
        this.debugResistive = true;
        this.cssIdleDriftClassName = 'css-idle-drifting';

        if (!this.gsap) throw new Error(`[Button CONSTRUCTOR ${this.getIdentifier()}] GSAP instance is not available.`);
        if (!this.configModule) console.warn(`[Button CONSTRUCTOR ${this.getIdentifier()}] configModule not available at construction.`);

        this.currentClasses = new Set();
        this.currentFlickerAnim = null;
        this._pressTimeoutId = null;
        this._isSelected = config.isSelectedByDefault || false;
        this._isPermanentlyDisabled = false;

        this._isResonating = false;
        this.stateTransitionEchoTween = null;

        this._updateAriaAttributes();
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
            if (this._isPermanentlyDisabled) targetManagedClasses.add(ButtonStates.PERMANENTLY_DISABLED); else targetManagedClasses.delete(ButtonStates.PERMANENTLY_DISABLED);

            if (currentManagedClassesOnElement.size !== targetManagedClasses.size) stateChanged = true;
            else {
                for (const cls of targetManagedClasses) {
                    if (!currentManagedClassesOnElement.has(cls)) { stateChanged = true; break; }
                }
            }
        }

        if (this.debugResistive && this.getIdentifier().includes("MAIN PWR OFF") && newStateClassesStr === ButtonStates.PERMANENTLY_DISABLED) {
            console.log(`[Button ${buttonId} setState - ${effectivePhaseContext}] Setting to PERMANENTLY_DISABLED. stateChanged: ${stateChanged}, forceState: ${forceState}`);
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
            if (this.debugResistive) console.log(`[Button ${buttonId} setSelected] Allowing deselect for permanently disabled OFF button during reset.`);
        } else if (this._isPermanentlyDisabled) {
            if (this.debugResistive) console.log(`[Button ${buttonId} setSelected] Blocked: Button is permanently disabled.`);
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
            if (this.debugResistive) console.log(`[Button ${buttonId} handleInteraction] Blocked: Button is permanently disabled.`);
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
        if (this.debugResistive) console.log(`[Button ${buttonId} setPermanentlyDisabled] Set to: ${isDisabled}`);

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
        if (!this.configModule) return;
        if (this.element.classList.contains('is-resonating')) return;
        this._isResonating = true;
        this.element.classList.add('is-resonating');
    }

    stopHarmonicResonance() {
        if (!this.configModule) return;
        if (!this.element.classList.contains('is-resonating')) return;
        this._isResonating = false;
        this.element.classList.remove('is-resonating');
    }

    setCssIdleLightDriftActive(isActive) {
        if (!this.configModule || !this.configModule.IDLE_LIGHT_DRIFT_PARAMS) return;

        const D_PARAMS = this.configModule.IDLE_LIGHT_DRIFT_PARAMS;
        const lights = Array.from(this.element.querySelectorAll('.light'));

        if (isActive) {
            if (this.element.classList.contains(this.cssIdleDriftClassName)) return;
            this.element.classList.add(this.cssIdleDriftClassName);

            lights.forEach((light, index) => {
                const randomDuration = this.gsap.utils.random(D_PARAMS.PERIOD_MIN, D_PARAMS.PERIOD_MAX);
                const randomDelay = this.gsap.utils.random(0, D_PARAMS.PERIOD_MAX / 4) + (index * D_PARAMS.STAGGER_PER_LIGHT);
                const baseOpacity = D_PARAMS.BASE_LIGHT_OPACITY_UNSELECTED_ENERGIZED;
                const variation = baseOpacity * D_PARAMS.OPACITY_VARIATION_FACTOR;
                const opacityStart = Math.max(0, Math.min(1, baseOpacity - variation));
                const opacityEnd = Math.max(0, Math.min(1, baseOpacity + variation));

                light.style.setProperty('--light-idle-duration', `${randomDuration.toFixed(3)}s`);
                light.style.setProperty('--light-idle-delay', `${randomDelay.toFixed(3)}s`);
                light.style.setProperty('--light-idle-opacity-start', opacityStart.toFixed(3));
                light.style.setProperty('--light-idle-opacity-end', opacityEnd.toFixed(3));
            });
        } else {
            if (!this.element.classList.contains(this.cssIdleDriftClassName)) return;
            this.element.classList.remove(this.cssIdleDriftClassName);
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
        if (this.currentFlickerAnim && this.currentFlickerAnim.isActive()) this.currentFlickerAnim.kill();
        if (this._pressTimeoutId) clearTimeout(this._pressTimeoutId);
        this.stopHarmonicResonance();
        this.setCssIdleLightDriftActive(false);
        if (this.stateTransitionEchoTween && this.stateTransitionEchoTween.isActive()) this.stateTransitionEchoTween.kill();
    }
}

export default Button;