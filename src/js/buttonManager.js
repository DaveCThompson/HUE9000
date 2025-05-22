/**
 * @module buttonManager (REFACTOR-V2.3)
 * @description Manages all button components, their states, and group behaviors.
 * Leverages Button.js for individual button logic.
 */
import Button from './Button.js'; // Default import for Button class
import { createAdvancedFlicker } from './animationUtils.js';
import { shuffleArray } from './utils.js';
import { gsap } from "gsap"; // Import gsap directly

// Define ButtonStates authoritatively here
export const ButtonStates = {
    // Core States
    UNLIT: 'is-unlit',
    DIMLY_LIT: 'is-dimly-lit', // Generic dimly-lit, implies unselected
    ENERGIZED_UNSELECTED: 'is-energized', // Base energized, unselected
    ENERGIZED_SELECTED: 'is-energized is-selected',

    // Dimly Lit Variants (if explicit selection state is needed while dim)
    DIMLY_LIT_UNSELECTED: 'is-dimly-lit', // Same as DIMLY_LIT for now
    DIMLY_LIT_SELECTED: 'is-dimly-lit is-selected', // If a dim button can be "selected"

    // Interaction States (transient, often combined with core states)
    PRESSING: 'is-pressing',
    FLICKERING: 'is-flickering' // Added for managing flicker visual state
};


export class ButtonManager { // Export the class
    constructor(gsapInstance, appState, configModule, uiUpdater) {
        this.gsap = gsapInstance;
        this.appState = appState;
        this.config = configModule;
        this.uiUpdater = uiUpdater;
        this._buttons = new Map();
        this._buttonGroups = new Map();
        this.debug = true; // Enable debug logging
    }

    init(buttonElements, gsapInstance) {
        this.gsap = gsapInstance || this.gsap; // Ensure GSAP is set
        if (this.debug) console.log('[ButtonManager INIT] Initializing buttons:', buttonElements?.length);
        if (buttonElements && buttonElements.length > 0) {
            buttonElements.forEach(element => {
                this.addButton(element);
            });
        }
        this.setInitialDimStates();
    }

    addButton(element, explicitGroupId = null) {
        if (!element || this._buttons.has(element)) return;

        const buttonConfig = this._generateButtonConfig(element, explicitGroupId);
        const buttonInstance = new Button(element, buttonConfig, this.gsap, this.appState, this.config, this.uiUpdater);
        this._buttons.set(element, buttonInstance);

        const finalGroupId = buttonInstance.getGroupId();
        if (finalGroupId) {
            if (!this._buttonGroups.has(finalGroupId)) {
                this._buttonGroups.set(finalGroupId, new Set());
            }
            this._buttonGroups.get(finalGroupId).add(buttonInstance);
        }
        // Log moved to Button constructor for earlier _isSelected state
        // if (this.debug) console.log(`[ButtonManager ADD] Added button: ${buttonInstance.getIdentifier()}, Group: ${finalGroupId}, Initial Selected: ${buttonInstance.isSelected()}`);
    }

    _generateButtonConfig(element, explicitGroupId = null) {
        const type = element.classList.contains('button-unit--toggle') ? 'toggle' :
                     element.classList.contains('button-unit--action') ? 'action' :
                     element.classList.contains('button-unit--radio') ? 'radio' : 'default';

        let groupId = explicitGroupId;
        if (!groupId) {
            groupId = element.closest('[data-group-id]')?.dataset.groupId || null;
            if (!groupId && type === 'radio') {
                const radioGroupContainer = element.closest('[role="radiogroup"]');
                if (radioGroupContainer) {
                    groupId = radioGroupContainer.dataset.assignmentTarget ||
                              radioGroupContainer.id ||
                              `radio-group-${[...this._buttonGroups.keys()].length}`;
                }
            }
        }
        const value = element.dataset.toggleValue || element.dataset.value || null;
        const isSelectedByDefault = element.classList.contains('is-selected');

        return { type, groupId, value, isSelectedByDefault };
    }


    getButtonInstance(element) {
        return this._buttons.get(element);
    }

    setInitialDimStates() {
        if (this.debug) console.log('[BM setInitialDimStates] Setting initial states for all buttons to UNLIT.');
        this._buttons.forEach(buttonInstance => {
            const buttonId = buttonInstance.getIdentifier();
            // console.log(`[BM setInitialDimStates] Processing: ${buttonId}, Current _isSelected before any action: ${buttonInstance.isSelected()}`);
            if (buttonInstance.isSelected()) {
                // console.log(`[BM setInitialDimStates] Button ${buttonId} is selected by default. Forcing _isSelected to false before setting UNLIT state.`);
                buttonInstance.setSelected(false, { skipAnimation: true, phaseContext: `P0_ForceUnselect_${buttonId}` });
                // console.log(`[BM setInitialDimStates] Button ${buttonId} _isSelected after force unselect: ${buttonInstance.isSelected()}`);
            }
            buttonInstance.setState(ButtonStates.UNLIT, { skipAnimation: true, themeContext: 'theme-dim', phaseContext: `P0_InitialUnlit_BM_${buttonId}`, forceState: true });
            // console.log(`[BM setInitialDimStates] Button ${buttonId} final DOM classes after UNLIT: '${buttonInstance.element.className}', final _isSelected: ${buttonInstance.isSelected()}`);
        });
    }

    handleButtonInteraction(buttonElement, eventType = 'click') {
        const buttonInstance = this._buttons.get(buttonElement);
        if (!buttonInstance) return;
        const buttonId = buttonInstance.getIdentifier();

        if (this.debug) console.log(`[BM INTERACTION] Event: ${eventType} on ${buttonId}, AppStatus: ${this.appState.getAppStatus()}`);

        if (this.appState.getAppStatus() !== 'interactive' && buttonInstance.getGroupId() !== 'system-power') {
            if (this.debug) console.log(`[BM INTERACTION] Blocked, app not interactive for ${buttonId}`);
            return;
        }

        buttonInstance.handleInteraction(eventType);

        const groupId = buttonInstance.getGroupId();
        if (groupId && (buttonInstance.config.type === 'toggle' || buttonInstance.config.type === 'radio')) {
            if (buttonInstance.isSelected()) {
                this._buttonGroups.get(groupId).forEach(member => {
                    if (member !== buttonInstance && member.isSelected()) {
                        if (this.debug) console.log(`[BM INTERACTION] Deselecting other member ${member.getIdentifier()} in group ${groupId}`);
                        member.setSelected(false, { themeContext: this.appState.getCurrentTheme(), phaseContext: `GroupAutoDeselect_${member.getIdentifier()}` });
                    }
                });
            }
        }
        this.appState.emit('buttonInteracted', { buttonIdentifier: buttonId, newState: buttonInstance.getCurrentStateClasses() });
    }

    setGroupSelected(groupId, selectedButtonValueOrElement) {
        const group = this._buttonGroups.get(groupId);
        if (!group) {
            console.warn(`[BM setGroupSelected] Group not found: ${groupId}`);
            return;
        }
        if (this.debug) console.log(`[BM setGroupSelected] Group: ${groupId}, Target: ${typeof selectedButtonValueOrElement === 'string' ? selectedButtonValueOrElement : selectedButtonValueOrElement.ariaLabel}`);

        group.forEach(buttonInstance => {
            let shouldBeSelected = false;
            if (typeof selectedButtonValueOrElement === 'string') {
                shouldBeSelected = buttonInstance.config.value === selectedButtonValueOrElement;
            } else { // Assuming it's an element
                shouldBeSelected = buttonInstance.element === selectedButtonValueOrElement;
            }
            // Use forceState: true to ensure the visual update happens even if _isSelected is already correct
            buttonInstance.setSelected(shouldBeSelected, { skipAnimation: true, themeContext: this.appState.getCurrentTheme(), phaseContext: `setGroupSelected_${groupId}_${buttonInstance.getIdentifier()}`, forceState: true });
        });
    }


    playFlickerToState(buttonElement, targetState, options) {
        const buttonInstance = this._buttons.get(buttonElement);
        if (!buttonInstance) {
            console.warn(`[BM playFlickerToState - ${options.phaseContext}] Button instance NOT FOUND for element:`, buttonElement);
            return { timeline: null, completionPromise: Promise.resolve() };
        }

        const { profileName, phaseContext = "UnknownPhase", isButtonSelectedOverride = null } = options;
        const buttonId = buttonInstance.getIdentifier();
        // console.log(`[BM playFlickerToState - ${phaseContext}] START for: ${buttonId}. TargetState: '${targetState}', Profile: '${profileName}', isSelectedOverrideOpt: ${isButtonSelectedOverride}, Current btn._isSelected: ${buttonInstance.isSelected()}`);

        // Determine expected starting base state from profile name
        let expectedBaseStartState = ButtonStates.UNLIT; // Default assumption
        if (profileName.toLowerCase().includes('fromdimlylit')) {
            expectedBaseStartState = ButtonStates.DIMLY_LIT;
        }
        // console.log(`[BM playFlickerToState - ${phaseContext}] For ${buttonId}: Profile '${profileName}' implies starting from '${expectedBaseStartState}'.`);

        // Force the button to this expected starting base state (without selection aspect)
        // This ensures the flicker animation starts from a visually consistent point.
        // The 'is-selected' class will be handled by the final setState in onTimelineComplete.
        let baseStateToSet = expectedBaseStartState;
        if (expectedBaseStartState === ButtonStates.DIMLY_LIT) baseStateToSet = ButtonStates.DIMLY_LIT_UNSELECTED; // Ensure it's unselected variant
        else if (expectedBaseStartState === ButtonStates.ENERGIZED_UNSELECTED) baseStateToSet = ButtonStates.ENERGIZED_UNSELECTED;
        // else it's UNLIT, which is fine.

        // Temporarily unselect if the base state implies it, to match visual start of flicker
        if (baseStateToSet === ButtonStates.DIMLY_LIT_UNSELECTED || baseStateToSet === ButtonStates.UNLIT) {
            if (buttonInstance.isSelected()) {
                 // console.log(`[BM playFlickerToState - ${phaseContext}] For ${buttonId}: Temporarily unselecting for flicker base state ${baseStateToSet}.`);
                 buttonInstance.setSelected(false, { skipAnimation: true, phaseContext: `PreFlickerTempUnselect_${phaseContext}_${buttonId}`, forceState: true });
            }
        }
        buttonInstance.setState(baseStateToSet, { skipAnimation: true, phaseContext: `PreFlickerForceBaseState_${phaseContext}_${buttonId}`, forceState: true });
        // console.log(`[BM playFlickerToState - ${phaseContext}] For ${buttonId}: DOM classes AFTER forcing base state '${baseStateToSet}': '${buttonInstance.element.className}'`);


        const impliesSelectionInTargetState = targetState.includes('is-selected');
        let isSelectedForGlowAnimation = impliesSelectionInTargetState;

        // Set the button's internal _isSelected state correctly *before* the flicker starts.
        // This is for the *final* state the button should be in after the flicker.
        if (buttonInstance.isSelected() !== impliesSelectionInTargetState) {
            // console.log(`[BM playFlickerToState - ${phaseContext}] Button ${buttonId} _isSelected (${buttonInstance.isSelected()}) mismatches target's implied selection (${impliesSelectionInTargetState}). Setting _isSelected to ${impliesSelectionInTargetState} for final state.`);
            buttonInstance.setSelected(impliesSelectionInTargetState, { skipAnimation: true, phaseContext: `PreFlickerSetFinalSelected_${phaseContext}_${buttonId}`, forceState: true });
        }

        // Allow explicit override for flicker's glow animation if provided
        if (typeof isButtonSelectedOverride === 'boolean') {
            isSelectedForGlowAnimation = isButtonSelectedOverride;
        }
        // console.log(`[BM playFlickerToState - ${phaseContext}] For ${buttonId}: isSelectedForGlowAnimation (to createAdvancedFlicker): ${isSelectedForGlowAnimation}. Button instance _isSelected (for final state): ${buttonInstance.isSelected()}`);

        const flickerOptions = {
            ...options,
            overrideGlowParams: { ...(options.overrideGlowParams || {}), isButtonSelected: isSelectedForGlowAnimation },
            onTimelineComplete: () => {
                // console.log(`[BM playFlickerToState - FlickerEnd_${phaseContext}] For: ${buttonId}. Button _isSelected BEFORE final setState: ${buttonInstance.isSelected()}. Target state for setState: '${targetState}'`);
                // The buttonInstance._isSelected should now be correctly set for the final state.
                // setState will use this _isSelected to correctly apply/remove 'is-selected' class.
                buttonInstance.setState(targetState, {
                    skipAnimation: true,
                    themeContext: this.appState.getCurrentTheme(),
                    phaseContext: `FlickerEnd_${phaseContext}_${buttonId}`,
                    forceState: true // Ensure DOM update
                });
                if (options.onComplete) options.onComplete();
            }
        };
        delete flickerOptions.onComplete; // Handled by internal onTimelineComplete

        const { timeline, completionPromise } = createAdvancedFlicker(buttonElement, profileName, flickerOptions);
        return { timeline, completionPromise };
    }


    flickerDimlyLitToEnergizedStartup(options) {
        const { profileNameUnselected, profileNameSelected, stagger, phaseContext, specificGroups = null, targetThemeContext } = options;

        const buttonsToEnergize = [];
        this._buttons.forEach(buttonInstance => {
            const currentClasses = buttonInstance.getCurrentClasses(); // Reads from DOM
            const isDimlyLit = currentClasses.has(ButtonStates.DIMLY_LIT.split(' ')[0]);

            if (isDimlyLit) {
                if (specificGroups && Array.isArray(specificGroups)) {
                    if (specificGroups.includes(buttonInstance.getGroupId())) {
                        buttonsToEnergize.push(buttonInstance);
                    }
                } else { // If no specificGroups, energize all dimly lit buttons
                    buttonsToEnergize.push(buttonInstance);
                }
            }
        });

        if (this.debug) console.log(`[BM flickerDimlyLitToEnergizedStartup - ${phaseContext}] Total buttons to energize from DIMLY_LIT: ${buttonsToEnergize.length}`);
        if (buttonsToEnergize.length === 0) {
            return { masterTimeline: null, masterCompletionPromise: Promise.resolve() };
        }

        shuffleArray(buttonsToEnergize);
        const masterFlickerTl = this.gsap.timeline();
        const allCompletionPromises = [];

        buttonsToEnergize.forEach((buttonInstance, index) => {
            let targetState = ButtonStates.ENERGIZED_UNSELECTED;
            let effectiveProfileName = profileNameUnselected;
            let isSelectedForFinalState = false;

            const groupId = buttonInstance.getGroupId();
            const buttonValue = buttonInstance.config.value;
            const buttonId = buttonInstance.getIdentifier();

            // Determine if this button should be selected by default in its group
            if (this.config.DEFAULT_ASSIGNMENT_SELECTIONS.hasOwnProperty(groupId)) {
                if (this.config.DEFAULT_ASSIGNMENT_SELECTIONS[groupId].toString() === buttonValue) {
                    targetState = ButtonStates.ENERGIZED_SELECTED;
                    effectiveProfileName = profileNameSelected;
                    isSelectedForFinalState = true;
                }
            } else if (buttonInstance.config.type === 'toggle' && buttonInstance.config.isSelectedByDefault) {
                // For toggle buttons not in DEFAULT_ASSIGNMENT_SELECTIONS, respect their isSelectedByDefault
                // This primarily applies to MAIN PWR and AUX LIGHT if they were handled this way.
                // However, this function is typically for SCAN, HUE ASSN, etc.
                // For this specific function, we assume non-assignment-grid toggles are handled elsewhere or
                // their default selection is managed by setGroupSelected after this.
                // So, for now, we only use DEFAULT_ASSIGNMENT_SELECTIONS for selection logic here.
            }
            // Action buttons are always unselected unless explicitly set otherwise.
            // For this startup sequence, they become ENERGIZED_UNSELECTED.

            // if (this.debug) console.log(`[BM flickerDimlyLitToEnergizedStartup - ${phaseContext}] Button: ${buttonId}, TargetState: ${targetState}, Profile: ${effectiveProfileName}, isSelectedForFinalState: ${isSelectedForFinalState}`);

            const { timeline: flickerTl, completionPromise } = this.playFlickerToState(
                buttonInstance.element,
                targetState,
                {
                    profileName: effectiveProfileName,
                    phaseContext: `${phaseContext}_${buttonId}`,
                    isButtonSelectedOverride: isSelectedForFinalState // Hint for flicker animation glow
                }
            );

            if (flickerTl) {
                masterFlickerTl.add(flickerTl, stagger * index);
            }
            allCompletionPromises.push(completionPromise);
        });

        const masterCompletionPromise = Promise.all(allCompletionPromises).then(() => {
            if (this.debug) console.log(`[BM flickerDimlyLitToEnergizedStartup - ${phaseContext}] All ${buttonsToEnergize.length} button flickers completed.`);
        }).catch(error => {
            console.error(`[BM flickerDimlyLitToEnergizedStartup - ${phaseContext}] Error during grouped flicker completion: ${error}`, error);
        });

        return { masterTimeline: masterFlickerTl, masterCompletionPromise };
    }

    setButtonsToState(buttonElements, targetState, options = {}) {
        const { staggerTime = 0.05, phaseContext = "BatchSetState" } = options;
        const tl = this.gsap.timeline();

        buttonElements.forEach((element, index) => {
            const buttonInstance = this._buttons.get(element);
            if (buttonInstance) {
                const buttonId = buttonInstance.getIdentifier();
                tl.call(() => {
                    // console.log(`[BM setButtonsToState - ${phaseContext}] Button: ${buttonId}, TargetState: ${targetState}`);
                    const impliesSelection = targetState.includes('is-selected');
                    if (buttonInstance.isSelected() !== impliesSelection) {
                        buttonInstance.setSelected(impliesSelection, { skipAnimation: true, phaseContext: `BatchSetSelected_${phaseContext}_${buttonId}`, forceState: true });
                    }
                    buttonInstance.setState(targetState, {
                        themeContext: this.appState.getCurrentTheme(),
                        phaseContext: `${phaseContext}_${buttonId}`,
                        forceState: true
                    });
                }, null, index * staggerTime);
            }
        });
        return { timeline: tl, completionPromise: Promise.resolve() }; // This is a synchronous setup of a GSAP timeline
    }

    setPressedVisuals(buttonElement, isPressed) {
        const buttonInstance = this._buttons.get(buttonElement);
        if (buttonInstance) {
            buttonInstance.setPressedVisuals(isPressed);
        }
    }
}