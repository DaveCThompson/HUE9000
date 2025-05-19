/**
 * @module buttonManager (REFACTOR-V2.3 - Componentized)
 * @description Centralized authority for managing button logical states (CSS classes),
 * ARIA attributes, and complex animations like flickering.
 * Delegates element-specific logic to Button component instances.
 * Relies on CSS themes and variables for visual appearance of states.
 */
import gsap from 'gsap';
import { shuffleArray } from './utils.js';
import { DEFAULT_ASSIGNMENT_SELECTIONS } from './config.js';
import Button from './Button.js'; // Corrected casing: Button.js

export const ButtonStates = {
    UNLIT: 'is-unlit',
    DIMLY_LIT: 'is-dimly-lit',
    ENERGIZED_UNSELECTED: 'is-energized',
    ENERGIZED_SELECTED: 'is-energized is-selected',
};

// Flicker profiles define the visual characteristics of flicker animations.
// These are resolved by buttonManager and specific parameters are passed to Button.playFlickerToState.
const flickerProfiles = {
    defaultStartup: { // For general startup flickers, slightly more energetic
        onOpacity: 0.9, offOpacity: 0.1, stepDuration: 0.08, steps: 9,
    },
    energizeFlicker: { // Used for SCAN/HUE ASSN buttons in P6
        onOpacity: 1.0, offOpacity: 0.1, stepDuration: 0.05, steps: 9,
    },
    intenseStartupFlicker: { // Used for MAIN PWR (P2) and AUX (P5)
        onOpacity: 1.0, offOpacity: 0.0, stepDuration: 0.045, steps: 15,
    }
    // Removed p2DebugFlicker as it's covered by intenseStartupFlicker or can be added if a distinct profile is needed.
};

class ButtonManager {
    constructor() {
        this._buttons = new Map(); // Stores <HTMLElement, ButtonComponentInstance>
        // _pressTimeoutId is now managed by individual Button instances.
    }

    init(buttonElements) {
        if (!buttonElements || buttonElements.length === 0) return;
        buttonElements.forEach(element => this.addButton(element));
    }

    addButton(element, explicitGroupId = null) {
        if (!element || typeof element.classList === 'undefined' || this._buttons.has(element)) return;

        let type = 'action';
        if (element.classList.contains('button-unit--toggle')) type = 'toggle';
        if (element.getAttribute('role') === 'radio') type = 'radio';

        // Add 'button-unit--action' class to BTN1-4 if not already present
        const buttonTextContent = element.querySelector('.button-text')?.textContent.trim();
        if (buttonTextContent && ['BTN 1', 'BTN 2', 'BTN 3', 'BTN 4'].includes(buttonTextContent)) {
            if (!element.classList.contains('button-unit--action')) {
                element.classList.add('button-unit--action');
            }
            type = 'action'; // Ensure type is action for these
        }


        let groupId = explicitGroupId;
        if (!groupId) {
            groupId = element.dataset.groupId;
            if (!groupId) {
                const groupContainer = element.closest('[data-group-id]');
                if (groupContainer) groupId = groupContainer.dataset.groupId;
                else {
                    const hueAssignColumn = element.closest('.hue-assignment-column');
                    if (hueAssignColumn && hueAssignColumn.dataset.assignmentTarget) {
                        groupId = hueAssignColumn.dataset.assignmentTarget;
                    } else {
                        const scanBlockParent = element.closest('.scan-button-block');
                        if (scanBlockParent) {
                            const descriptorLabel = scanBlockParent.querySelector('.block-label-bottom--descriptor');
                            if (descriptorLabel?.textContent.toLowerCase().includes('skill scan')) groupId = 'skill-scan-group';
                            else if (descriptorLabel?.textContent.toLowerCase().includes('fit eval')) groupId = 'fit-eval-group';
                            else groupId = `scan-button-${element.textContent.trim() || Math.random().toString(36).substr(2, 5)}`;
                        }
                    }
                }
            }
        }
        if (!groupId) {
            groupId = `button-${Math.random().toString(36).substr(2, 5)}`;
        }

        const value = element.dataset.toggleValue || element.dataset.rowIndex;
        const buttonConfig = { type, groupId, value };

        const buttonInstance = new Button(element, buttonConfig);
        this._buttons.set(element, buttonInstance);
        buttonInstance.setState(ButtonStates.UNLIT, { forceState: true, phaseContext: "ButtonInit" });
    }

    setInitialDimStates() {
        this._buttons.forEach((buttonInstance, element) => {
            gsap.set(element, { clearProps: "opacity" });
            const lights = Array.from(element.querySelectorAll('.light'));
            if (lights.length > 0) gsap.set(lights, { clearProps: "opacity,autoAlpha" });
            buttonInstance.setState(ButtonStates.UNLIT, { skipAria: true, forceState: true, phaseContext: "P0_Reset" });
        });
    }

    smoothTransitionButtonsToState(buttonsToTransition, targetStateClass, options = {}) {
        const { stagger = 0.02, phaseContext = "UnknownPhase_SmoothTransition" } = options;
        const tl = gsap.timeline();

        if (!buttonsToTransition || buttonsToTransition.length === 0) {
            return tl.to({}, {duration: 0.01});
        }

        buttonsToTransition.forEach((element, index) => {
            const buttonInstance = this._buttons.get(element);
            if (buttonInstance) {
                const currentInstanceClasses = buttonInstance.getCurrentClasses();
                const isAlreadyEnergized = currentInstanceClasses.has('is-energized');
                const isTargetEnergized = targetStateClass.includes('is-energized');
                if (!currentInstanceClasses.has(targetStateClass.split(' ')[0]) && (!isAlreadyEnergized || isTargetEnergized)) {
                    tl.call(() => {
                        buttonInstance.setState(targetStateClass, { phaseContext });
                    }, null, index * stagger);
                }
            }
        });
        if (tl.duration() === 0) tl.to({}, {duration: 0.01});
        return tl;
    }

    setState(buttonElement, newStateClassesStr, options = {}) {
        const buttonInstance = this._buttons.get(buttonElement);
        if (buttonInstance) {
            buttonInstance.setState(newStateClassesStr, options);
        }
    }

    setPressedVisuals(buttonElement, isPressed) {
        const buttonInstance = this._buttons.get(buttonElement);
        if (buttonInstance) {
            buttonInstance.setPressedVisuals(isPressed);
        }
    }

    setGroupSelected(groupId, selectedButtonValueOrElement) {
        let selectedElement = null;
        if (typeof selectedButtonValueOrElement === 'string' || typeof selectedButtonValueOrElement === 'number') {
            const valueToMatch = String(selectedButtonValueOrElement);
            for (const [element, buttonInstance] of this._buttons.entries()) {
                if (buttonInstance.getGroupId() === groupId && buttonInstance.getValue() === valueToMatch) {
                    selectedElement = element;
                    break;
                }
            }
        } else if (selectedButtonValueOrElement instanceof HTMLElement && this._buttons.has(selectedButtonValueOrElement)) {
            selectedElement = selectedButtonValueOrElement;
        }

        if (!selectedElement) {
            console.warn(`[ButtonManager setGroupSelected] Could not find button for group '${groupId}' with value/element:`, selectedButtonValueOrElement);
            return;
        }

        const effectivePhaseContext = document.getElementById('debug-phase-status')?.textContent || 'SetGroupSelected';
        const currentBodyThemeClass = Array.from(document.body.classList).find(cls => cls.startsWith('theme-')) || 'theme-dim';
        let isRadioGroup = false;

        this._buttons.forEach((buttonInstance, element) => {
            if (buttonInstance.getGroupId() === groupId) {
                if (buttonInstance.type === 'radio') isRadioGroup = true;
                const isSelected = (element === selectedElement);
                let targetStateClasses;

                if (currentBodyThemeClass === 'theme-dim') {
                    if (groupId === 'system-power' || groupId === 'light') {
                        targetStateClasses = isSelected ? ButtonStates.ENERGIZED_SELECTED : ButtonStates.ENERGIZED_UNSELECTED;
                    } else { // Hue assignment grid buttons in dim mode
                        targetStateClasses = isSelected ? ButtonStates.DIMLY_LIT : ButtonStates.UNLIT;
                    }
                } else { // theme-dark or theme-light (non-dim modes)
                    targetStateClasses = isSelected ? ButtonStates.ENERGIZED_SELECTED : ButtonStates.ENERGIZED_UNSELECTED;
                }
                buttonInstance.setState(targetStateClasses, { skipAria: true, phaseContext: effectivePhaseContext });
            }
        });

        this._buttons.forEach((buttonInstance, element) => {
            if (buttonInstance.getGroupId() === groupId) {
                buttonInstance._updateAriaAttributes((element === selectedElement), isRadioGroup);
            }
        });
    }

    confirmGroupSelected(groupId, selectedButtonValueOrElement) {
        let selectedElement = null;
        if (typeof selectedButtonValueOrElement === 'string' || typeof selectedButtonValueOrElement === 'number') {
            const valueToMatch = String(selectedButtonValueOrElement);
            for (const [element, buttonInstance] of this._buttons.entries()) {
                if (buttonInstance.getGroupId() === groupId && buttonInstance.getValue() === valueToMatch) {
                    selectedElement = element;
                    break;
                }
            }
        } else if (selectedButtonValueOrElement instanceof HTMLElement && this._buttons.has(selectedButtonValueOrElement)) {
            selectedElement = selectedButtonValueOrElement;
        }

        if (!selectedElement) return;

        let isRadioGroup = false;
        this._buttons.forEach((buttonInstance, element) => {
            if (buttonInstance.getGroupId() === groupId) {
                if (buttonInstance.type === 'radio') isRadioGroup = true;
                buttonInstance._updateAriaAttributes((element === selectedElement), isRadioGroup);
            }
        });
    }

    playFlickerToState(buttonElement, targetStateClassesStr, flickerOptions = {}) {
        const buttonInstance = this._buttons.get(buttonElement);
        if (!buttonInstance) {
            const dummyTl = gsap.timeline();
            if (typeof flickerOptions.onCompleteAll === 'function') gsap.delayedCall(0, flickerOptions.onCompleteAll);
            return dummyTl.to({}, {duration: 0.01});
        }

        const { profile = 'defaultStartup', internalFlickerOnly = false, phaseContext, onCompleteAll } = flickerOptions;
        const selectedProfile = flickerProfiles[profile] || flickerProfiles.defaultStartup;

        const flickerParams = {
            ...selectedProfile, // Spread onOpacity, offOpacity, stepDuration, steps
            internalFlickerOnly,
            phaseContext: phaseContext || 'UnknownPhase_Flicker',
        };
        
        const flickerTimeline = buttonInstance.playFlickerToState(targetStateClassesStr, flickerParams);

        if (onCompleteAll && typeof onCompleteAll === 'function') {
            flickerTimeline.call(onCompleteAll, [], ">=0"); 
        }
        return flickerTimeline;
    }

    flickerDimlyLitToEnergizedStartup(options = {}) {
        const {
            profile = 'energizeFlicker',
            stagger = 0.02,
            phaseContext = "UnknownPhase_EnergizeDimlyLit",
            specificGroups = null,
            targetThemeContext = null // New parameter
        } = options;

        const effectiveTheme = targetThemeContext || (document.body.classList.contains('theme-dark') ? 'theme-dark' : (document.body.classList.contains('theme-light') ? 'theme-light' : 'theme-dim'));
        console.log(`[BM flickerDimlyLitToEnergizedStartup | ${phaseContext}] Called. Options:`, JSON.stringify(options), `Effective Theme for Target State: ${effectiveTheme}`);


        const masterTl = gsap.timeline();
        const buttonsToEnergize = [];

        this._buttons.forEach((buttonInstance, btnElement) => {
            const currentInstanceClasses = buttonInstance.getCurrentClasses();
            const hasDimlyLit = currentInstanceClasses.has(ButtonStates.DIMLY_LIT);
            const groupMatches = (specificGroups === null || specificGroups.includes(buttonInstance.getGroupId()));

            if (hasDimlyLit && groupMatches) {
                console.log(`[BM flickerDimlyLitToEnergizedStartup | ${phaseContext}] Identified for energizing: ${buttonInstance.getIdentifier()} (Group: ${buttonInstance.getGroupId()}), Current classes: [${Array.from(currentInstanceClasses).join(' ')}]`);
                buttonsToEnergize.push(btnElement);
            }
        });
        
        console.log(`[BM flickerDimlyLitToEnergizedStartup | ${phaseContext}] Total buttons to energize: ${buttonsToEnergize.length}`);

        if (buttonsToEnergize.length === 0) {
            return masterTl.to({}, { duration: 0.01 });
        }

        shuffleArray(buttonsToEnergize);

        buttonsToEnergize.forEach((btnElement, index) => {
            const buttonInstance = this._buttons.get(btnElement);
            if (!buttonInstance) return;

            let targetEnergizedStateClasses = ButtonStates.ENERGIZED_UNSELECTED;
            // Determine target state (selected or unselected) based on group and default selections,
            // CONSIDERING the targetThemeContext for how "selected" should look.
            // In P6, the target theme is 'dark'.
            if (effectiveTheme === 'theme-dark' || effectiveTheme === 'theme-light') {
                if (buttonInstance.getGroupId() === 'light') { // AUX Light
                    // Default is LOW (off) selected in dark theme
                    targetEnergizedStateClasses = (buttonInstance.getValue() === 'off') ? ButtonStates.ENERGIZED_SELECTED : ButtonStates.ENERGIZED_UNSELECTED;
                } else if (['env', 'lcd', 'logo', 'btn'].includes(buttonInstance.getGroupId())) { // Hue Assignment Buttons
                    if (DEFAULT_ASSIGNMENT_SELECTIONS[buttonInstance.getGroupId()] !== undefined &&
                        buttonInstance.getValue() === String(DEFAULT_ASSIGNMENT_SELECTIONS[buttonInstance.getGroupId()])) {
                        targetEnergizedStateClasses = ButtonStates.ENERGIZED_SELECTED;
                    } else {
                        targetEnergizedStateClasses = ButtonStates.ENERGIZED_UNSELECTED;
                    }
                } else if (buttonInstance.getGroupId() === 'skill-scan-group' || buttonInstance.getGroupId() === 'fit-eval-group') { // SCAN/FIT EVAL buttons
                    targetEnergizedStateClasses = ButtonStates.ENERGIZED_UNSELECTED; // Always start unselected
                }
            } else { // theme-dim context (should not happen for P6 target, but for completeness)
                 if (buttonInstance.getGroupId() === 'system-power' || buttonInstance.getGroupId() === 'light') {
                    targetEnergizedStateClasses = (DEFAULT_ASSIGNMENT_SELECTIONS[buttonInstance.getGroupId()] !== undefined &&
                        buttonInstance.getValue() === String(DEFAULT_ASSIGNMENT_SELECTIONS[buttonInstance.getGroupId()])) ||
                        (buttonInstance.getGroupId() === 'system-power' && buttonInstance.getValue() === 'on') ||
                        (buttonInstance.getGroupId() === 'light' && buttonInstance.getValue() === 'off') // Assuming LOW is default selected in dim
                        ? ButtonStates.ENERGIZED_SELECTED : ButtonStates.ENERGIZED_UNSELECTED;
                } else {
                    // This case should ideally not be hit if we are energizing from dimly-lit
                    // as dimly-lit itself is a form of "selected" for hue-assn in dim mode.
                    // But if it were, it would go to unselected energized.
                    targetEnergizedStateClasses = ButtonStates.ENERGIZED_UNSELECTED;
                }
            }
            // console.log(`[BM flickerDimlyLitToEnergizedStartup | ${phaseContext}] Button: ${buttonInstance.getIdentifier()}, Target State: ${targetEnergizedStateClasses}`);

            const flickerSubTimeline = this.playFlickerToState(btnElement, targetEnergizedStateClasses, {
                profile: profile,
                phaseContext: `${phaseContext}_${buttonInstance.getGroupId()}_${buttonInstance.getValue() || 'action'}`,
                internalFlickerOnly: false // Apply final state classes
            });
            masterTl.add(flickerSubTimeline, index * stagger);
        });
        return masterTl;
    }
}

const buttonManager = new ButtonManager();
export default buttonManager;