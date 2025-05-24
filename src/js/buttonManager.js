/**
 * @module buttonManager (REFACTOR-V2.3 - Ambient Animations Update)
 * @description Manages all button components, their states, and group behaviors.
 * Leverages Button.js for individual button logic.
 */
import Button from './Button.js';
import { createAdvancedFlicker } from './animationUtils.js';
import { shuffleArray } from './utils.js';
import { gsap } from "gsap";

export const ButtonStates = {
    UNLIT: 'is-unlit',
    DIMLY_LIT: 'is-dimly-lit',
    ENERGIZED_UNSELECTED: 'is-energized',
    ENERGIZED_SELECTED: 'is-energized is-selected',
    DIMLY_LIT_UNSELECTED: 'is-dimly-lit',
    DIMLY_LIT_SELECTED: 'is-dimly-lit is-selected',
    PRESSING: 'is-pressing',
    FLICKERING: 'is-flickering'
};

export class ButtonManager {
    constructor(gsapInstance, appState, configModule) {
        this.gsap = gsapInstance;
        this.appState = appState;
        this.config = configModule; // Stored for passing to Button instances
        this.uiUpdater = null; // To be set via setter if needed by Button
        this._buttons = new Map();
        this._buttonGroups = new Map();
        this.debug = false; // console.log for key events

        // Event Emitter
        this._eventListeners = {};
        this.aam = null; // Reference to AmbientAnimationManager
    }

    setAAM(aamInstance) {
        this.aam = aamInstance;
    }

    setUiUpdater(uiUpdaterInstance) { // If Button needs it
        this.uiUpdater = uiUpdaterInstance;
    }

    // Basic Event Emitter Implementation
    on(eventName, callback) {
        if (typeof callback !== 'function') {
            console.error(`[ButtonManager] Invalid callback for event "${eventName}"`);
            return;
        }
        if (!this._eventListeners[eventName]) {
            this._eventListeners[eventName] = [];
        }
        this._eventListeners[eventName].push(callback);
    }

    emit(eventName, data) {
        if (this.debug) console.log(`[ButtonManager EMIT] Event: '${eventName}', Data:`, data);
        if (this._eventListeners[eventName]) {
            this._eventListeners[eventName].forEach(cb => {
                try {
                    cb(data);
                } catch (error) {
                    console.error(`[ButtonManager] Error in listener for event "${eventName}":`, error, { data });
                }
            });
        }
    }

    init(buttonElements) {
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
        // Pass configModule to Button constructor
        const buttonInstance = new Button(element, buttonConfig, this.gsap, this.appState, this.config, this.uiUpdater);
        // buttonInstance.setConfigModule(this.config); // Already passed in constructor

        this._buttons.set(element, buttonInstance);

        const finalGroupId = buttonInstance.getGroupId();
        if (finalGroupId) {
            if (!this._buttonGroups.has(finalGroupId)) {
                this._buttonGroups.set(finalGroupId, new Set());
            }
            this._buttonGroups.get(finalGroupId).add(buttonInstance);
        }
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
                    groupId = radioGroupContainer.dataset.assignmentTarget || radioGroupContainer.id || `radio-group-${[...this._buttonGroups.keys()].length}`;
                }
            }
        }
        const value = element.dataset.toggleValue || element.dataset.value || null;
        const isSelectedByDefault = element.classList.contains('is-selected');
        return { type, groupId, value, isSelectedByDefault };
    }

    getAllButtonInstances() {
        return this._buttons.values();
    }

    getButtonInstance(element) {
        return this._buttons.get(element);
    }

    setInitialDimStates() {
        if (this.debug) console.log('[BM setInitialDimStates] Setting initial states for all buttons to UNLIT.');
        this._buttons.forEach(buttonInstance => {
            const buttonId = buttonInstance.getIdentifier();
            if (buttonInstance.isSelected()) {
                buttonInstance.setSelected(false, { skipAnimation: true, phaseContext: `P0_ForceUnselect_${buttonId}` });
            }
            buttonInstance.setState(ButtonStates.UNLIT, { skipAnimation: true, themeContext: 'theme-dim', phaseContext: `P0_InitialUnlit_BM_${buttonId}`, forceState: true });
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

        this.emit('beforeButtonTransition', buttonInstance); // Emit before potential state change

        buttonInstance.handleInteraction(eventType); // This might change selection state

        const groupId = buttonInstance.getGroupId();
        if (groupId && (buttonInstance.config.type === 'toggle' || buttonInstance.config.type === 'radio')) {
            if (buttonInstance.isSelected()) {
                this._buttonGroups.get(groupId).forEach(member => {
                    if (member !== buttonInstance && member.isSelected()) {
                        if (this.debug) console.log(`[BM INTERACTION] Deselecting other member ${member.getIdentifier()} in group ${groupId}`);
                        this.emit('beforeButtonTransition', member); // Emit for the implicitly changed button
                        member.setSelected(false, { themeContext: this.appState.getCurrentTheme(), phaseContext: `GroupAutoDeselect_${member.getIdentifier()}` });
                        this.emit('afterButtonTransition', member); // Emit for the implicitly changed button
                    }
                });
            }
        }
        this.appState.emit('buttonInteracted', { buttonIdentifier: buttonId, newState: buttonInstance.getCurrentStateClasses() });
        this.emit('afterButtonTransition', buttonInstance); // Emit after potential state change
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
            } else {
                shouldBeSelected = buttonInstance.element === selectedButtonValueOrElement;
            }

            if (buttonInstance.isSelected() !== shouldBeSelected) {
                this.emit('beforeButtonTransition', buttonInstance);
                buttonInstance.setSelected(shouldBeSelected, { skipAnimation: true, themeContext: this.appState.getCurrentTheme(), phaseContext: `setGroupSelected_${groupId}_${buttonInstance.getIdentifier()}`, forceState: true });
                buttonInstance.playStateTransitionEcho(); // Play echo for programmatic changes too
                this.emit('afterButtonTransition', buttonInstance);
            } else if (shouldBeSelected && !buttonInstance.element.classList.contains('is-selected') ||
                       !shouldBeSelected && buttonInstance.element.classList.contains('is-selected')) {
                // If internal _isSelected matches, but DOM doesn't, still need to update visuals
                this.emit('beforeButtonTransition', buttonInstance);
                buttonInstance.setSelected(shouldBeSelected, { skipAnimation: true, themeContext: this.appState.getCurrentTheme(), phaseContext: `setGroupSelected_DOM_Sync_${groupId}_${buttonInstance.getIdentifier()}`, forceState: true });
                // No echo here as it's likely a sync, not a user/system driven change that needs emphasis
                this.emit('afterButtonTransition', buttonInstance);
            }
        });
    }

    playFlickerToState(buttonElement, targetState, options) {
        const buttonInstance = this._buttons.get(buttonElement);
        if (!buttonInstance) {
            console.warn(`[BM playFlickerToState - ${options.phaseContext}] Button instance NOT FOUND for element:`, buttonElement);
            return { timeline: null, completionPromise: Promise.resolve() };
        }

        this.emit('beforeButtonTransition', buttonInstance);

        const { profileName, phaseContext = "UnknownPhase", isButtonSelectedOverride = null } = options;
        const buttonId = buttonInstance.getIdentifier();
        let expectedBaseStartState = ButtonStates.UNLIT;
        if (profileName.toLowerCase().includes('fromdimlylit')) expectedBaseStartState = ButtonStates.DIMLY_LIT;

        let baseStateToSet = expectedBaseStartState;
        if (expectedBaseStartState === ButtonStates.DIMLY_LIT) baseStateToSet = ButtonStates.DIMLY_LIT_UNSELECTED;
        else if (expectedBaseStartState === ButtonStates.ENERGIZED_UNSELECTED) baseStateToSet = ButtonStates.ENERGIZED_UNSELECTED;

        if (baseStateToSet === ButtonStates.DIMLY_LIT_UNSELECTED || baseStateToSet === ButtonStates.UNLIT) {
            if (buttonInstance.isSelected()) {
                 buttonInstance.setSelected(false, { skipAnimation: true, phaseContext: `PreFlickerTempUnselect_${phaseContext}_${buttonId}`, forceState: true });
            }
        }
        buttonInstance.setState(baseStateToSet, { skipAnimation: true, phaseContext: `PreFlickerForceBaseState_${phaseContext}_${buttonId}`, forceState: true });

        const impliesSelectionInTargetState = targetState.includes('is-selected');
        let isSelectedForGlowAnimation = impliesSelectionInTargetState;
        if (buttonInstance.isSelected() !== impliesSelectionInTargetState) {
            buttonInstance.setSelected(impliesSelectionInTargetState, { skipAnimation: true, phaseContext: `PreFlickerSetFinalSelected_${phaseContext}_${buttonId}`, forceState: true });
        }
        if (typeof isButtonSelectedOverride === 'boolean') isSelectedForGlowAnimation = isButtonSelectedOverride;

        const flickerOptions = {
            ...options,
            overrideGlowParams: { ...(options.overrideGlowParams || {}), isButtonSelected: isSelectedForGlowAnimation },
            onTimelineComplete: () => {
                buttonInstance.setState(targetState, {
                    skipAnimation: true, themeContext: this.appState.getCurrentTheme(),
                    phaseContext: `FlickerEnd_${phaseContext}_${buttonId}`, forceState: true
                });
                buttonInstance.playStateTransitionEcho(); // Play echo after flicker
                this.emit('afterButtonTransition', buttonInstance); // Emit after echo starts (or immediately after setState)
                if (options.onComplete) options.onComplete();
            }
        };
        delete flickerOptions.onComplete;

        const { timeline, completionPromise } = createAdvancedFlicker(buttonElement, profileName, flickerOptions);
        return { timeline, completionPromise };
    }

    flickerDimlyLitToEnergizedStartup(options) {
        const { profileNameUnselected, profileNameSelected, stagger, phaseContext } = options;
        const buttonsToEnergize = [];
        this._buttons.forEach(buttonInstance => {
            const currentClasses = buttonInstance.getCurrentClasses();
            const isDimlyLit = currentClasses.has(ButtonStates.DIMLY_LIT.split(' ')[0]);
            if (isDimlyLit) {
                // Simplified: assuming all relevant buttons are processed.
                // Original had specificGroups logic, can be re-added if needed.
                buttonsToEnergize.push(buttonInstance);
            }
        });

        if (this.debug) console.log(`[BM flickerDimlyLitToEnergizedStartup - ${phaseContext}] Total buttons to energize: ${buttonsToEnergize.length}`);
        if (buttonsToEnergize.length === 0) return { masterTimeline: null, masterCompletionPromise: Promise.resolve() };

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

            if (this.config.DEFAULT_ASSIGNMENT_SELECTIONS.hasOwnProperty(groupId)) {
                if (this.config.DEFAULT_ASSIGNMENT_SELECTIONS[groupId].toString() === buttonValue) {
                    targetState = ButtonStates.ENERGIZED_SELECTED;
                    effectiveProfileName = profileNameSelected;
                    isSelectedForFinalState = true;
                }
            }
            // Note: beforeButtonTransition and afterButtonTransition are handled *inside* playFlickerToState
            const { timeline: flickerTl, completionPromise } = this.playFlickerToState(
                buttonInstance.element, targetState, {
                    profileName: effectiveProfileName,
                    phaseContext: `${phaseContext}_${buttonId}`,
                    isButtonSelectedOverride: isSelectedForFinalState
                }
            );
            if (flickerTl) masterFlickerTl.add(flickerTl, stagger * index);
            allCompletionPromises.push(completionPromise);
        });

        const masterCompletionPromise = Promise.all(allCompletionPromises);
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
                    this.emit('beforeButtonTransition', buttonInstance);
                    const impliesSelection = targetState.includes('is-selected');
                    if (buttonInstance.isSelected() !== impliesSelection) {
                        buttonInstance.setSelected(impliesSelection, { skipAnimation: true, phaseContext: `BatchSetSelected_${phaseContext}_${buttonId}`, forceState: true });
                    }
                    buttonInstance.setState(targetState, {
                        themeContext: this.appState.getCurrentTheme(),
                        phaseContext: `${phaseContext}_${buttonId}`, forceState: true
                    });
                    buttonInstance.playStateTransitionEcho();
                    this.emit('afterButtonTransition', buttonInstance);
                }, null, index * staggerTime);
            }
        });
        return { timeline: tl, completionPromise: Promise.resolve() };
    }

    setPressedVisuals(buttonElement, isPressed) {
        const buttonInstance = this._buttons.get(buttonElement);
        if (buttonInstance) buttonInstance.setPressedVisuals(isPressed);
    }
}