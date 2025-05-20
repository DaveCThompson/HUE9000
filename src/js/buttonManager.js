/**
 * @module buttonManager (REFACTOR-V2.3 - Componentized)
 * @description Centralized authority for managing button logical states (CSS classes),
 * ARIA attributes, and complex animations like flickering.
 * Delegates element-specific logic to Button component instances.
 * Relies on CSS themes and variables for visual appearance of states.
 */
// GSAP instance will be passed to methods or stored if init receives it
import { shuffleArray } from './utils.js';
import { DEFAULT_ASSIGNMENT_SELECTIONS, ADVANCED_FLICKER_PROFILES } from './config.js';
import Button from './Button.js'; 

export const ButtonStates = {
    UNLIT: 'is-unlit',
    DIMLY_LIT: 'is-dimly-lit',
    ENERGIZED_UNSELECTED: 'is-energized',
    ENERGIZED_SELECTED: 'is-energized is-selected',
};

class ButtonManager {
    constructor() {
        this._buttons = new Map(); 
        this.gsap = null; // To store the GSAP instance from init
    }

    init(buttonElements, gsapInstance) { // Accept gsapInstance
        console.log(`[ButtonManager INIT] Initializing with ${buttonElements?.length || 0} elements.`);
        if (!gsapInstance) {
            console.error("[ButtonManager INIT] CRITICAL: GSAP instance not provided.");
            // Fallback to window.gsap if not passed, though direct pass is preferred
            this.gsap = window.gsap; 
            if (!this.gsap) throw new Error("GSAP instance not available in ButtonManager");
        } else {
            this.gsap = gsapInstance;
        }

        if (!buttonElements || buttonElements.length === 0) return;
        buttonElements.forEach(element => this.addButton(element));
    }

    addButton(element, explicitGroupId = null) {
        if (!element || typeof element.classList === 'undefined' || this._buttons.has(element)) return;

        let type = 'action';
        if (element.classList.contains('button-unit--toggle')) type = 'toggle';
        if (element.getAttribute('role') === 'radio') type = 'radio';

        const buttonTextContent = element.querySelector('.button-text')?.textContent.trim();
        if (buttonTextContent && ['BTN 1', 'BTN 2', 'BTN 3', 'BTN 4'].includes(buttonTextContent)) {
            if (!element.classList.contains('button-unit--action')) {
                element.classList.add('button-unit--action');
            }
            type = 'action'; 
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
            groupId = `button-auto-group-${element.ariaLabel || element.textContent.trim().replace(/\s+/g, '-') || Math.random().toString(36).substr(2, 5)}`;
        }


        const value = element.dataset.toggleValue || element.dataset.rowIndex;
        const buttonConfig = { 
            type, 
            groupId, 
            value,
            gsapInstance: this.gsap // Pass the stored GSAP instance
        };

        const buttonInstance = new Button(element, buttonConfig);
        this._buttons.set(element, buttonInstance);
        // Initial state during addButton should ensure it's clean before P0 reset might happen
        this.gsap.set(element, { clearProps: "all" });
        const classesToRemoveOnInit = ['is-energized', 'is-selected', 'is-dimly-lit', 'is-flickering'];
        classesToRemoveOnInit.forEach(cls => element.classList.remove(cls));
        element.classList.add(ButtonStates.UNLIT); // Directly add is-unlit
        buttonInstance.setState(ButtonStates.UNLIT, { forceState: true, phaseContext: "ButtonManager_AddButton_Init" });
    }

    setInitialDimStates() {
        this._buttons.forEach((buttonInstance, element) => {
            // Clear all GSAP inline styles first
            this.gsap.set(element, { clearProps: "all" });
            
            // Explicitly remove all known state classes
            const classesToRemove = ['is-energized', 'is-selected', 'is-dimly-lit', 'is-flickering', ButtonStates.UNLIT];
            classesToRemove.forEach(cls => element.classList.remove(cls));
            
            // Clear GSAP props from lights as well
            const lights = Array.from(element.querySelectorAll('.light'));
            if (lights.length > 0) this.gsap.set(lights, { clearProps: "all" });
            
            // Set to UNLIT. forceState true will ensure internal currentClasses are also reset.
            buttonInstance.setState(ButtonStates.UNLIT, { skipAria: true, forceState: true, phaseContext: "P0_Reset_InitialDim" });
            // console.log(`[ButtonManager setInitialDimStates] Button: ${buttonInstance.getIdentifier()}, Classes after UNLIT set: '${element.className}'`);
        });
    }

    smoothTransitionButtonsToState(buttonsToTransition, targetStateClass, options = {}) {
        const { stagger = 0.02, phaseContext = "UnknownPhase_SmoothTransition" } = options;
        const tl = this.gsap.timeline();

        if (!buttonsToTransition || buttonsToTransition.length === 0) {
            return tl.to({}, {duration: 0.01});
        }

        buttonsToTransition.forEach((element, index) => {
            const buttonInstance = this._buttons.get(element);
            if (buttonInstance) {
                const currentInstanceClasses = buttonInstance.getCurrentClasses();
                const isAlreadyEnergized = currentInstanceClasses.has('is-energized');
                const isTargetEnergized = targetStateClass.includes('is-energized');
                const primaryTargetState = targetStateClass.split(' ')[0];

                if (!currentInstanceClasses.has(primaryTargetState) && (!isAlreadyEnergized || isTargetEnergized)) {
                    tl.call(() => {
                        buttonInstance.setState(targetStateClass, { phaseContext: `${phaseContext}_SetState` });
                    }, null, index * stagger);
                }
            } else {
                console.warn(`[ButtonManager smoothTransitionButtonsToState | ${phaseContext}] Button element not managed:`, element);
            }
        });
        if (tl.duration() === 0) tl.to({}, {duration: 0.01});
        return tl;
    }

    setState(buttonElement, newStateClassesStr, options = {}) {
        const buttonInstance = this._buttons.get(buttonElement);
        if (buttonInstance) {
            buttonInstance.setState(newStateClassesStr, options);
        } else {
            console.warn(`[ButtonManager setState] Button element not managed:`, buttonElement);
        }
    }

    setPressedVisuals(buttonElement, isPressed) {
        const buttonInstance = this._buttons.get(buttonElement);
        if (buttonInstance) {
            buttonInstance.setPressedVisuals(isPressed);
        } else {
             console.warn(`[ButtonManager setPressedVisuals] Button element not managed:`, buttonElement);
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

        const effectivePhaseContext = document.getElementById('debug-phase-status')?.textContent || 'SetGroupSelected_Manual';
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
                    } else { 
                        targetStateClasses = isSelected ? ButtonStates.DIMLY_LIT : ButtonStates.UNLIT;
                    }
                } else { 
                    targetStateClasses = isSelected ? ButtonStates.ENERGIZED_SELECTED : ButtonStates.ENERGIZED_UNSELECTED;
                }
                buttonInstance.setState(targetStateClasses, { skipAria: true, phaseContext: `${effectivePhaseContext}_SetStateForGroup` });
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

        if (!selectedElement) {
            return;
        }

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
            console.warn(`[ButtonManager playFlickerToState] Button element not managed:`, buttonElement);
            const dummyTl = this.gsap.timeline();
            if (typeof flickerOptions.onCompleteAll === 'function') this.gsap.delayedCall(0, flickerOptions.onCompleteAll);
            return dummyTl.to({}, {duration: 0.01});
        }

        const { profileName = 'buttonP6EnergizeFlicker', phaseContext, onCompleteAll, isButtonSelectedOverride } = flickerOptions;
        
        const masterFlickerTl = this.gsap.timeline(); // Create a new timeline to return

        masterFlickerTl.call(() => {
            if (buttonInstance.currentFlickerAnim && buttonInstance.currentFlickerAnim.isActive()) {
                buttonInstance.currentFlickerAnim.kill(); // Kill previous flicker on this specific button instance
            }
            buttonElement.classList.add('is-flickering');
            buttonInstance.setState(targetStateClassesStr, { 
                skipAria: true, 
                phaseContext: `PreFlicker_${phaseContext}`, 
                forceState: true,
                internalFlickerCall: true // Prevent setState from clearing GSAP props during flicker setup
            });
        });
        
        const isSelectedForGlow = isButtonSelectedOverride !== null 
            ? isButtonSelectedOverride 
            : targetStateClassesStr.includes('is-selected');

        const advancedFlickerOptionsForUtility = {
            overrideGlowParams: { 
                isButtonSelected: isSelectedForGlow, 
            },
            lightTargetSelector: '.light', 
            onComplete: () => {
                buttonElement.classList.remove('is-flickering');
                // GSAP clearProps for lights/element should ideally be part of createAdvancedFlicker's cleanup
                // or done carefully here if createAdvancedFlicker doesn't fully clean up CSS vars.
                // For now, let createAdvancedFlicker handle its own animation properties.
                buttonInstance.setState(targetStateClassesStr, { 
                    skipAria: false, 
                    forceState: true, 
                    phaseContext: `FlickerComplete_${phaseContext}` 
                });
                buttonInstance.currentFlickerAnim = null;
                if (onCompleteAll) { 
                    onCompleteAll();
                }
            },
        };
        
        const actualFlickerSubTimeline = Button.createAdvancedFlicker( // Assuming createAdvancedFlicker is static or accessible
            buttonElement, 
            profileName,
            advancedFlickerOptionsForUtility,
            this.gsap // Pass GSAP instance to createAdvancedFlicker if it's not importing it directly
        );
        
        masterFlickerTl.add(actualFlickerSubTimeline);
        
        buttonInstance.currentFlickerAnim = masterFlickerTl; // Store the master timeline
        return masterFlickerTl;
    }

    flickerDimlyLitToEnergizedStartup(options = {}) {
        const {
            profileName = 'buttonP6EnergizeFlicker', 
            stagger = 0.02,
            phaseContext = "UnknownPhase_EnergizeDimlyLit",
            specificGroups = null,
            targetThemeContext = null 
        } = options;

        const effectiveTheme = targetThemeContext || (document.body.classList.contains('theme-dark') ? 'theme-dark' : (document.body.classList.contains('theme-light') ? 'theme-light' : 'theme-dim'));
        // console.log(`[ButtonManager flickerDimlyLitToEnergizedStartup | ${phaseContext}] Called. Profile: ${profileName}, Theme: ${effectiveTheme}, Groups: ${specificGroups ? specificGroups.join(',') : 'ALL'}`);


        const masterTl = this.gsap.timeline();
        const buttonsToEnergize = [];

        this._buttons.forEach((buttonInstance, btnElement) => {
            const currentInstanceClasses = buttonInstance.getCurrentClasses();
            const hasDimlyLit = currentInstanceClasses.has(ButtonStates.DIMLY_LIT);
            const groupMatches = (specificGroups === null || specificGroups.includes(buttonInstance.getGroupId()));

            if (hasDimlyLit && groupMatches) {
                buttonsToEnergize.push(btnElement);
            }
        });
        
        // console.log(`[ButtonManager flickerDimlyLitToEnergizedStartup | ${phaseContext}] Total buttons found with 'is-dimly-lit' in specified groups: ${buttonsToEnergize.length}`);

        if (buttonsToEnergize.length === 0) {
            return masterTl.to({}, { duration: 0.01 });
        }

        shuffleArray(buttonsToEnergize);

        buttonsToEnergize.forEach((btnElement, index) => {
            const buttonInstance = this._buttons.get(btnElement);
            if (!buttonInstance) return;

            let targetEnergizedStateClasses = ButtonStates.ENERGIZED_UNSELECTED;
            let isSelectedForGlow = false;

            if (effectiveTheme === 'theme-dark' || effectiveTheme === 'theme-light') {
                if (buttonInstance.getGroupId() === 'light') { 
                    isSelectedForGlow = (buttonInstance.getValue() === 'off'); 
                    targetEnergizedStateClasses = isSelectedForGlow ? ButtonStates.ENERGIZED_SELECTED : ButtonStates.ENERGIZED_UNSELECTED;
                } else if (['env', 'lcd', 'logo', 'btn'].includes(buttonInstance.getGroupId())) { 
                    isSelectedForGlow = (DEFAULT_ASSIGNMENT_SELECTIONS[buttonInstance.getGroupId()] !== undefined &&
                        buttonInstance.getValue() === String(DEFAULT_ASSIGNMENT_SELECTIONS[buttonInstance.getGroupId()]));
                    targetEnergizedStateClasses = isSelectedForGlow ? ButtonStates.ENERGIZED_SELECTED : ButtonStates.ENERGIZED_UNSELECTED;
                } else { 
                    isSelectedForGlow = false;
                    targetEnergizedStateClasses = ButtonStates.ENERGIZED_UNSELECTED;
                }
            }
            
            const flickerSubTimeline = this.playFlickerToState(btnElement, targetEnergizedStateClasses, {
                profileName: profileName,
                phaseContext: `${phaseContext}_${buttonInstance.getIdentifier()}`,
                isButtonSelectedOverride: isSelectedForGlow 
            });
            masterTl.add(flickerSubTimeline, index * stagger);
        });
        return masterTl;
    }
}

const buttonManager = new ButtonManager();
export default buttonManager;