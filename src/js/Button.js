/**
 * @module Button
 * @description Represents a single UI button component, managing its state,
 * appearance (CSS classes, ARIA attributes), and specific animations.
 */
// GSAP is accessed via this.gsap, which is populated from config.gsapInstance or window.gsap
import { ButtonStates }  from './buttonManager.js'; 
import { createAdvancedFlicker } from './animationUtils.js'; 

class Button {
    /**
     * @param {HTMLElement} domElement - The HTMLElement for this button.
     * @param {object} config - Configuration object for the button.
     * @param {string} config.type - Type of button ('action', 'toggle', 'radio').
     * @param {string} config.groupId - The group ID this button belongs to.
     * @param {string} [config.value] - The value of the button, used for selection in groups.
     * @param {object} [config.gsapInstance] - Passed GSAP instance.
     */
    constructor(domElement, config) {
        this.element = domElement;
        this.type = config.type;
        this.groupId = config.groupId;
        this.value = config.value;
        
        if (config.gsapInstance) {
            this.gsap = config.gsapInstance;
        } else {
            console.warn(`[Button CONSTRUCTOR] GSAP instance not passed for ${this.getIdentifier()}, falling back to window.gsap. This might cause issues if window.gsap is not correctly populated.`);
            this.gsap = window.gsap;
        }
        if (!this.gsap) {
            throw new Error(`[Button CONSTRUCTOR] GSAP instance is not available for ${this.getIdentifier()}.`);
        }


        this.currentClasses = new Set();
        this.currentFlickerAnim = null;
        this._pressTimeoutId = null; 

        // console.log(`[Button CONSTRUCTOR] Created: ${this.getIdentifier()}. Group: ${this.groupId}, Type: ${this.type}, Value: ${this.value}`);
    }

    getIdentifier() {
        return this.element.ariaLabel || this.element.id || this.value || `UnnamedButton_${this.groupId}_${this.type}`;
    }

    setState(newStateClassesStr, options = {}) {
        const { skipAria = false, internalFlickerCall = false, forceState = false, phaseContext } = options;
        const effectivePhaseContext = phaseContext || document.getElementById('debug-phase-status')?.textContent || 'UnknownPhase_ButtonSetState';
        
        // console.log(`[Button setState | ${effectivePhaseContext}] ID: ${this.getIdentifier()}, Current Classes Before: '${Array.from(this.currentClasses).join(' ')}', Requested: '${newStateClassesStr}', Element Classes Before: '${this.element.className}'`);

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
            // console.log(`[Button setState | ${effectivePhaseContext}] ID: ${this.getIdentifier()}, No change needed. Current Classes After: '${Array.from(this.currentClasses).join(' ')}', Element Classes After: '${this.element.className}'`);
            return;
        }
        
        // const oldInternalClassesForLog = Array.from(this.currentClasses).join(' ');

        if (!internalFlickerCall && this.currentFlickerAnim && this.currentFlickerAnim.isActive()) {
            // console.log(`[Button setState | ${effectivePhaseContext}] ID: ${this.getIdentifier()}, Killing active flicker animation.`);
            this.currentFlickerAnim.kill(); 
            this.currentFlickerAnim = null;
        }
        
        if (!internalFlickerCall) { // Only clear props if not an internal call from flicker setup
            // console.log(`[Button setState | ${effectivePhaseContext}] ID: ${this.getIdentifier()}, Not internal flicker call, clearing props.`);
            this.element.classList.remove('is-flickering');
            const lights = Array.from(this.element.querySelectorAll('.light'));
            if (lights.length > 0) {
                this.gsap.set(lights, { clearProps: "all" }); 
            }
            this.gsap.set(this.element, { clearProps: "css" }); 
        }


        const managedStateClasses = [
            ...ButtonStates.UNLIT.split(' ').filter(c => c),
            ...ButtonStates.DIMLY_LIT.split(' ').filter(c => c),
            ...ButtonStates.ENERGIZED_UNSELECTED.split(' ').filter(c => c), 
            'is-selected' // This is a modifier, not a base state like the others
        ].filter(c => c);
        
        managedStateClasses.forEach(s => {
            if (!newClassesSet.has(s)) { // Only remove if not part of the new state
                this.element.classList.remove(s);
            }
        });
        newClassesSet.forEach(cls => this.element.classList.add(cls));
        this.currentClasses = newClassesSet;

        if (!skipAria) this._updateAriaAttributes();
        // console.log(`[Button setState | ${effectivePhaseContext}] ID: ${this.getIdentifier()}, Current Classes After: '${Array.from(this.currentClasses).join(' ')}', Element Classes After: '${this.element.className}'`);
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

    // Static method to access createAdvancedFlicker, or ensure buttonManager passes GSAP to it
    static createAdvancedFlicker(target, profileName, options, gsapInstance) {
        // This is a bit of a workaround if createAdvancedFlicker doesn't have GSAP internally
        // Ideally, animationUtils.js imports GSAP itself.
        // For now, assuming createAdvancedFlicker can access GSAP or is passed it.
        return createAdvancedFlicker(target, profileName, options);
    }


    playFlickerToState(targetStateClassesStr, flickerProfileName, advancedFlickerOptions = {}) {
        const {
            phaseContext = 'UnknownPhase_Flicker',
            isButtonSelectedOverride = null, 
            onCompleteAll 
        } = advancedFlickerOptions;

        // This method now expects to be called from buttonManager, which creates the master timeline
        // The actual flicker logic is now more directly handled by buttonManager's playFlickerToState
        // This method in Button.js might become a simpler wrapper or be refactored if
        // buttonManager orchestrates the timeline creation more directly.
        // For now, let's assume buttonManager's playFlickerToState correctly sets up the timeline
        // and this method is mostly for compatibility or future direct calls.

        // The core logic of creating the flicker timeline is now in buttonManager's playFlickerToState
        // This method might just return the timeline created by the manager or be deprecated.
        // For this iteration, we assume buttonManager.playFlickerToState is the primary caller
        // and it handles the timeline construction.

        // If this method were to be self-contained for creating a flicker:
        const tl = this.gsap.timeline();
        tl.call(() => {
            if (this.currentFlickerAnim && this.currentFlickerAnim.isActive()) {
                this.currentFlickerAnim.kill();
            }
            this.element.classList.add('is-flickering');
            this.setState(targetStateClassesStr, { 
                skipAria: true, 
                phaseContext: `PreFlicker_${phaseContext}`, 
                forceState: true,
                internalFlickerCall: true
            });
        });

        const isSelectedForGlow = isButtonSelectedOverride !== null 
            ? isButtonSelectedOverride 
            : targetStateClassesStr.includes('is-selected');

        const flickerOptionsForUtility = {
            overrideGlowParams: { isButtonSelected: isSelectedForGlow },
            lightTargetSelector: '.light',
            onComplete: () => {
                this.element.classList.remove('is-flickering');
                this.setState(targetStateClassesStr, { 
                    skipAria: false, 
                    forceState: true, 
                    phaseContext: `FlickerComplete_${phaseContext}` 
                });
                this.currentFlickerAnim = null;
                if (onCompleteAll) onCompleteAll();
            },
        };

        const actualFlickerSubTimeline = createAdvancedFlicker(
            this.element, 
            flickerProfileName,
            flickerOptionsForUtility
        );
        tl.add(actualFlickerSubTimeline);
        this.currentFlickerAnim = tl;
        return tl;
    }

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
            }, pressAnimationDurationMs + 50); 
        } else {
            this.element.classList.remove('is-pressing');
        }
    }

    destroy() {
        if (this.currentFlickerAnim && this.currentFlickerAnim.isActive()) {
            this.currentFlickerAnim.kill();
        }
        if (this._pressTimeoutId) {
            clearTimeout(this._pressTimeoutId);
        }
    }
}

export default Button;