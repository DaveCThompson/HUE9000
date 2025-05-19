/**
 * @module Button
 * @description Represents a single UI button component, managing its state,
 * appearance (CSS classes, ARIA attributes), and specific animations.
 */
import gsap from 'gsap';
import { ButtonStates }  from './buttonManager.js'; // Will be exported from buttonManager

class Button {
    /**
     * @param {HTMLElement} domElement - The HTMLElement for this button.
     * @param {object} config - Configuration object for the button.
     * @param {string} config.type - Type of button ('action', 'toggle', 'radio').
     * @param {string} config.groupId - The group ID this button belongs to.
     * @param {string} [config.value] - The value of the button, used for selection in groups.
     */
    constructor(domElement, config) {
        this.element = domElement;
        this.type = config.type;
        this.groupId = config.groupId;
        this.value = config.value;
        this.gsap = gsap;

        this.currentClasses = new Set();
        this.currentFlickerAnim = null;
        this._pressTimeoutId = null; // For managing press effect timeout

        // console.log(`[Button Component CONSTRUCTOR] Created: ${this.getIdentifier()}, Group: ${this.groupId}, Type: ${this.type}, Value: ${this.value}`);
    }

    getIdentifier() {
        return this.element.ariaLabel || this.element.id || this.value || 'UnnamedButton';
    }

    setState(newStateClassesStr, options = {}) {
        const { skipAria = false, internalFlickerCall = false, forceState = false, phaseContext } = options;

        const buttonIdForLogEarly = this.getIdentifier();
        // const currentDOMClassesForRawLog = Array.from(this.element.classList);
        // const oldInternalClassesForRawLog = Array.from(this.currentClasses);
        // console.log(`[Button setState RAW ENTRY] Btn: ${buttonIdForLogEarly}, NewStateStr: "${newStateClassesStr}", Opts: ${JSON.stringify(options)}, DOM Before: [${currentDOMClassesForRawLog.join(' ')}], Internal Before: [${oldInternalClassesForRawLog.join(' ')}]`);

        const effectivePhaseContext = phaseContext || document.getElementById('debug-phase-status')?.textContent || 'UnknownPhase_ButtonSetState';
        const newClassesSet = new Set(newStateClassesStr ? newStateClassesStr.split(' ').filter(c => c) : []);

        let stateChanged = forceState;
        if (!stateChanged) {
            if (this.currentClasses.size !== newClassesSet.size) {
                stateChanged = true;
            } else {
                for (const cls of newClassesSet) {
                    if (!this.currentClasses.has(cls)) {
                        stateChanged = true;
                        break;
                    }
                }
            }
        }

        if (!stateChanged && !forceState) {
            if (!skipAria) this._updateAriaAttributes();
            return;
        }

        console.log(`[Button setState | ${effectivePhaseContext}] Btn: ${this.getIdentifier()}, Group: ${this.groupId}, OldInternalClasses: [${Array.from(this.currentClasses).join(' ')}], NewInternalClasses: [${Array.from(newClassesSet).join(' ')}], Opts: ${JSON.stringify(options)}`);

        if (!internalFlickerCall && this.currentFlickerAnim && this.currentFlickerAnim.isActive()) {
            this.currentFlickerAnim.kill();
            this.currentFlickerAnim = null;
        }
        if (!internalFlickerCall) this.element.classList.remove('is-flickering');

        const managedStateClasses = [
            ...ButtonStates.UNLIT.split(' '),
            ...ButtonStates.DIMLY_LIT.split(' '),
            ...ButtonStates.ENERGIZED_UNSELECTED.split(' '),
            'is-selected'
        ].filter(c => c);
        
        managedStateClasses.forEach(s => this.element.classList.remove(s));
        newClassesSet.forEach(cls => this.element.classList.add(cls));
        this.currentClasses = newClassesSet;

        if (this.currentClasses.has(ButtonStates.DIMLY_LIT) && effectivePhaseContext.includes("P4")) {
            console.log(`[Button setState DEBUG P4 | ${effectivePhaseContext}] Btn: ${this.getIdentifier()} (Group: ${this.groupId}) CONFIRMED SET TO DIMLY-LIT. Current classes: [${Array.from(this.currentClasses).join(' ')}]`);
        }

        if (!skipAria) this._updateAriaAttributes();
    }

    _updateAriaAttributes(isSelectedOverride = null, isRadioGroupContext = false) {
        let isEffectivelySelected;
        if (isSelectedOverride !== null) {
            isEffectivelySelected = isSelectedOverride;
        } else {
            isEffectivelySelected = this.currentClasses.has('is-selected') ||
                                    (this.currentClasses.has(ButtonStates.DIMLY_LIT) && !this.currentClasses.has('is-energized'));
        }

        if (this.type === 'toggle') {
            this.element.setAttribute('aria-pressed', isEffectivelySelected.toString());
        } else if (this.type === 'radio') {
            this.element.setAttribute('aria-checked', isEffectivelySelected.toString());
        }

        const isInteractive = this.currentClasses.has('is-energized') || this.currentClasses.has(ButtonStates.DIMLY_LIT);
        
        if (isRadioGroupContext || this.type === 'radio') {
            this.element.setAttribute('tabindex', isEffectivelySelected ? '0' : '-1');
        } else if (this.type === 'toggle' && this.groupId) {
            this.element.setAttribute('tabindex', isEffectivelySelected ? '0' : '-1');
        } else {
            this.element.setAttribute('tabindex', isInteractive ? '0' : '-1');
        }
    }

    getElement() { return this.element; }
    getGroupId() { return this.groupId; }
    getValue() { return this.value; }
    getCurrentClasses() { return new Set(this.currentClasses); }

    /**
     * Manages the GSAP flicker animation for this button.
     * @param {string} targetStateClassesStr - The final state classes after flickering.
     * @param {object} flickerParams - Parameters for the flicker effect.
     * @param {number} flickerParams.onOpacity - Opacity when light is on.
     * @param {number} flickerParams.offOpacity - Opacity when light is off.
     * @param {number} flickerParams.stepDuration - Duration of each on/off step.
     * @param {number} flickerParams.steps - Number of on/off cycles (steps-1 repeats).
     * @param {boolean} [flickerParams.internalFlickerOnly=false] - If true, setState is not called at the start.
     * @param {string} [flickerParams.phaseContext='UnknownPhase_Flicker'] - Logging context.
     * @returns {gsap.core.Timeline} The GSAP timeline for the flicker animation.
     */
    playFlickerToState(targetStateClassesStr, flickerParams) {
        const {
            onOpacity, offOpacity, stepDuration, steps,
            internalFlickerOnly = false,
            phaseContext = 'UnknownPhase_Flicker'
        } = flickerParams;

        const buttonIdForLog = this.getIdentifier();
        // console.log(`[Button playFlickerToState | ${phaseContext}] Btn: ${buttonIdForLog}, TargetState: "${targetStateClassesStr}"`);

        if (this.currentFlickerAnim && this.currentFlickerAnim.isActive()) {
            this.currentFlickerAnim.kill();
        }

        if (!internalFlickerOnly) {
            this.setState(targetStateClassesStr, { skipAria: true, internalFlickerCall: true, forceState: true, phaseContext: `PreFlicker_${phaseContext}` });
        }
        this.element.classList.add('is-flickering');
        let lights = Array.from(this.element.querySelectorAll('.light')).filter(l => l.offsetParent !== null);
        let targetsForGsap = lights.length > 0 ? lights : (this.element.offsetParent !== null ? [this.element] : []);

        const flickerTimeline = this.gsap.timeline({
            onComplete: () => {
                // console.log(`[Button Flicker Tween Complete | ${phaseContext}] Btn: ${buttonIdForLog}`);
                this.element.classList.remove('is-flickering');
                this.gsap.set(targetsForGsap, { clearProps: "opacity,autoAlpha" });
                this.setState(targetStateClassesStr, { skipAria: false, forceState: true, phaseContext: `FlickerComplete_${phaseContext}` });
                this.currentFlickerAnim = null;
            }
        });

        if (targetsForGsap.length > 0) {
            this.gsap.killTweensOf(targetsForGsap);

            let setVars = {};
            let fromVars = {};
            let toVars = {};

            if (offOpacity === 0) { // Use autoAlpha for true visibility toggling
                setVars = { clearProps: "autoAlpha", autoAlpha: 0, immediateRender: true };
                fromVars = { autoAlpha: 0 };
                toVars = { autoAlpha: onOpacity };
            } else {
                setVars = { clearProps: "opacity", opacity: offOpacity, immediateRender: true };
                fromVars = { opacity: offOpacity };
                toVars = { opacity: onOpacity };
            }
            this.gsap.set(targetsForGsap, setVars);

            flickerTimeline.fromTo(
                targetsForGsap,
                fromVars,
                { ...toVars, duration: stepDuration, repeat: steps - 1, yoyo: true, ease: "steps(1)" }
            );
        } else {
            // console.warn(`[Button playFlickerToState | ${phaseContext}] No visible targets for flicker on ${buttonIdForLog}`);
            flickerTimeline.to({}, { duration: 0.01 }); // Ensure timeline has some duration
        }
        
        this.currentFlickerAnim = flickerTimeline;
        return flickerTimeline;
    }

    /**
     * Sets the visual state for when the button is pressed.
     * @param {boolean} isPressed - True if the button is being pressed, false otherwise.
     */
    setPressedVisuals(isPressed) {
        if (this._pressTimeoutId && this.element.classList.contains('is-pressing') && !isPressed) {
            clearTimeout(this._pressTimeoutId);
            this._pressTimeoutId = null;
        }

        if (isPressed) {
            this.element.classList.add('is-pressing');
            const pressAnimationDurationString = getComputedStyle(this.element).getPropertyValue('--button-unit-pressed-effect-duration-css').trim() || '0.12s';
            const pressAnimationDurationMs = parseFloat(pressAnimationDurationString) * (pressAnimationDurationString.endsWith('ms') ? 1 : 1000);
            
            const animationEndHandler = () => {
                this.element.classList.remove('is-pressing');
                this.element.removeEventListener('animationend', animationEndHandler);
                if (this._pressTimeoutId) {
                    clearTimeout(this._pressTimeoutId);
                    this._pressTimeoutId = null;
                }
            };
            this.element.addEventListener('animationend', animationEndHandler);
            
            this._pressTimeoutId = setTimeout(() => {
                this.element.classList.remove('is-pressing');
                this.element.removeEventListener('animationend', animationEndHandler);
                this._pressTimeoutId = null;
            }, pressAnimationDurationMs + 50); // Safety timeout
        } else {
            this.element.classList.remove('is-pressing');
        }
    }

    destroy() {
        // console.log(`[Button Component DESTROY] Destroying: ${this.getIdentifier()}`);
        if (this.currentFlickerAnim && this.currentFlickerAnim.isActive()) {
            this.currentFlickerAnim.kill();
        }
        if (this._pressTimeoutId) {
            clearTimeout(this._pressTimeoutId);
        }
        // Remove any event listeners this component might have added to its element
        // (e.g., the animationend listener in setPressedVisuals if it wasn't cleaned up)
        // For now, setPressedVisuals cleans up its own listener.
    }
}

export default Button;