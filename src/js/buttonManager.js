/**
 * @module buttonManager (REFACTOR-V2.3 - Ambient Animations Update)
 * @description Manages all button components, their states, and group behaviors.
 * Leverages Button.js for individual button logic.
 */
import Button from './Button.js';
import { createAdvancedFlicker } from './animationUtils.js';
import { shuffleArray } from './utils.js';
import { gsap } from "gsap";
import * as appState from './appState.js'; // For resistive shutdown stage check
import * as config from './config.js'; // For RESISTIVE_SHUTDOWN_PARAMS

export const ButtonStates = {
    UNLIT: 'is-unlit',
    DIMLY_LIT: 'is-dimly-lit',
    ENERGIZED_UNSELECTED: 'is-energized',
    ENERGIZED_SELECTED: 'is-energized is-selected',
    DIMLY_LIT_UNSELECTED: 'is-dimly-lit',
    DIMLY_LIT_SELECTED: 'is-dimly-lit is-selected',
    PRESSING: 'is-pressing',
    FLICKERING: 'is-flickering',
    PERMANENTLY_DISABLED: 'is-permanently-disabled' 
};

export class ButtonManager {
    constructor(gsapInstance, appStateService, configModule) {
        this.gsap = gsapInstance;
        this.appState = appStateService; // appStateService is the appState module itself
        this.config = configModule; // Stored for passing to Button instances
        this.uiUpdater = null; // To be set via setter if needed by Button
        this._buttons = new Map();
        this._buttonGroups = new Map();
        this.debug = false; 
        this.debugResistive = true; 

        this._eventListeners = {};
        this.aam = null; 
        this.mainPowerOffButtonInstance = null;

        this.appState.subscribe('resistiveShutdownStageChanged', this.handleResistiveShutdownStageChange.bind(this));
        this.appState.subscribe('mainPowerOffButtonDisabledChanged', this.handleMainPowerOffButtonDisabledChange.bind(this));
    }

    setAAM(aamInstance) {
        this.aam = aamInstance;
    }

    setUiUpdater(uiUpdaterInstance) { 
        this.uiUpdater = uiUpdaterInstance;
    }

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
        const buttonInstance = new Button(element, buttonConfig, this.gsap, this.appState, this.config, this.uiUpdater);

        this._buttons.set(element, buttonInstance);

        const finalGroupId = buttonInstance.getGroupId();
        if (finalGroupId) {
            if (!this._buttonGroups.has(finalGroupId)) {
                this._buttonGroups.set(finalGroupId, new Set());
            }
            this._buttonGroups.get(finalGroupId).add(buttonInstance);
        }

        if (finalGroupId === 'system-power' && buttonConfig.value === 'off') {
            this.mainPowerOffButtonInstance = buttonInstance;
            if (this.debugResistive) console.log('[BM addButton] MAIN PWR OFF button instance stored.');
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
        return Array.from(this._buttons.values());
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
        
        if (buttonInstance === this.mainPowerOffButtonInstance && this.appState.getIsMainPowerOffButtonDisabled()) {
            if (this.debugResistive) console.log(`[BM INTERACTION] MAIN PWR OFF button is disabled by resistive shutdown. Interaction blocked.`);
            return;
        }

        if (this.appState.getAppStatus() !== 'interactive') {
            if (this.debug) console.log(`[BM INTERACTION] Blocked, app not interactive for ${buttonId}`);
            return;
        }
        
        const currentShutdownStage = this.appState.getResistiveShutdownStage();
        if (currentShutdownStage > 0 && buttonInstance.getGroupId() !== 'system-power') {
            if (this.debugResistive) console.log(`[BM INTERACTION] Interaction with ${buttonId} blocked during resistive shutdown sequence.`);
            return;
        }

        this.emit('beforeButtonTransition', buttonInstance); 
        buttonInstance.handleInteraction(eventType); 
        const groupId = buttonInstance.getGroupId();

        if (groupId && (buttonInstance.config.type === 'toggle' || buttonInstance.config.type === 'radio')) {
            if (buttonInstance.isSelected()) {
                this._buttonGroups.get(groupId).forEach(member => {
                    if (member !== buttonInstance && member.isSelected()) {
                        if (this.debug) console.log(`[BM INTERACTION] Deselecting other member ${member.getIdentifier()} in group ${groupId}`);
                        this.emit('beforeButtonTransition', member); 
                        member.setSelected(false, { themeContext: this.appState.getCurrentTheme(), phaseContext: `GroupAutoDeselect_${member.getIdentifier()}` });
                        this.emit('afterButtonTransition', member); 
                    }
                });
            }
        }
        this.appState.emit('buttonInteracted', { buttonIdentifier: buttonId, newState: buttonInstance.getCurrentStateClasses() });
        this.emit('afterButtonTransition', buttonInstance); 
    }

    setGroupSelected(groupId, selectedButtonValueOrElement) {
        const group = this._buttonGroups.get(groupId);
        if (!group) {
            console.warn(`[BM setGroupSelected] Group not found: ${groupId}`);
            return;
        }
        if (this.debug) console.log(`[BM setGroupSelected] Group: ${groupId}, Target: ${typeof selectedButtonValueOrElement === 'string' ? selectedButtonValueOrElement : selectedButtonValueOrElement?.ariaLabel}`);

        group.forEach(buttonInstance => {
            let shouldBeSelected = false;
            if (typeof selectedButtonValueOrElement === 'string') {
                shouldBeSelected = buttonInstance.config.value === selectedButtonValueOrElement;
            } else if (selectedButtonValueOrElement) { 
                shouldBeSelected = buttonInstance.element === selectedButtonValueOrElement;
            }

            if (buttonInstance.isSelected() !== shouldBeSelected) {
                this.emit('beforeButtonTransition', buttonInstance);
                buttonInstance.setSelected(shouldBeSelected, { skipAnimation: true, themeContext: this.appState.getCurrentTheme(), phaseContext: `setGroupSelected_${groupId}_${buttonInstance.getIdentifier()}`, forceState: true });
                buttonInstance.playStateTransitionEcho(); 
                this.emit('afterButtonTransition', buttonInstance);
            } else if (selectedButtonValueOrElement && ( (shouldBeSelected && !buttonInstance.element.classList.contains('is-selected')) ||
                       (!shouldBeSelected && buttonInstance.element.classList.contains('is-selected')) ) ) {
                this.emit('beforeButtonTransition', buttonInstance);
                buttonInstance.setSelected(shouldBeSelected, { skipAnimation: true, themeContext: this.appState.getCurrentTheme(), phaseContext: `setGroupSelected_DOM_Sync_${groupId}_${buttonInstance.getIdentifier()}`, forceState: true });
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

        const { profileName, phaseContext = "UnknownPhase", isButtonSelectedOverride = null, onFlickerComplete, tempGlowColor, tempTintColorClass } = options;
        const buttonId = buttonInstance.getIdentifier();
        let expectedBaseStartState = ButtonStates.UNLIT;

        if (profileName.toLowerCase().includes('fromdimlylit')) expectedBaseStartState = ButtonStates.DIMLY_LIT;
        else if (profileName.toLowerCase().includes('resist')) { 
            expectedBaseStartState = buttonInstance.isSelected() ? ButtonStates.ENERGIZED_SELECTED : ButtonStates.ENERGIZED_UNSELECTED;
        }

        let baseStateToSet = expectedBaseStartState;
        if (expectedBaseStartState === ButtonStates.DIMLY_LIT) baseStateToSet = ButtonStates.DIMLY_LIT_UNSELECTED;
        else if (expectedBaseStartState === ButtonStates.ENERGIZED_UNSELECTED) baseStateToSet = ButtonStates.ENERGIZED_UNSELECTED;
        else if (expectedBaseStartState === ButtonStates.ENERGIZED_SELECTED) baseStateToSet = ButtonStates.ENERGIZED_SELECTED;

        if (baseStateToSet === ButtonStates.DIMLY_LIT_UNSELECTED || baseStateToSet === ButtonStates.UNLIT) {
            if (buttonInstance.isSelected()) {
                 buttonInstance.setSelected(false, { skipAnimation: true, phaseContext: `PreFlickerTempUnselect_${phaseContext}_${buttonId}`, forceState: true });
            }
        }
        if (!profileName.toLowerCase().includes('resist')) {
            buttonInstance.setState(baseStateToSet, { skipAnimation: true, phaseContext: `PreFlickerForceBaseState_${phaseContext}_${buttonId}`, forceState: true });
        }

        const impliesSelectionInTargetState = targetState.includes('is-selected');
        let isSelectedForGlowAnimation = impliesSelectionInTargetState;
        if (buttonInstance.isSelected() !== impliesSelectionInTargetState && !profileName.toLowerCase().includes('resist')) {
            buttonInstance.setSelected(impliesSelectionInTargetState, { skipAnimation: true, phaseContext: `PreFlickerSetFinalSelected_${phaseContext}_${buttonId}`, forceState: true });
        }
        if (typeof isButtonSelectedOverride === 'boolean') isSelectedForGlowAnimation = isButtonSelectedOverride;

        // Temporarily set glow color and tint class for resistive shutdown flashes
        if (tempGlowColor) {
            buttonElement.style.setProperty('--btn-glow-color', tempGlowColor);
        }
        if (tempTintColorClass) {
            buttonElement.classList.add(tempTintColorClass);
        }

        const flickerOptions = {
            ...options,
            overrideGlowParams: { ...(options.overrideGlowParams || {}), isButtonSelected: isSelectedForGlowAnimation },
            onTimelineComplete: () => {
                if (tempGlowColor) buttonElement.style.removeProperty('--btn-glow-color');
                if (tempTintColorClass) buttonElement.classList.remove(tempTintColorClass);

                if (targetState === ButtonStates.PERMANENTLY_DISABLED) {
                    buttonInstance.setState(ButtonStates.PERMANENTLY_DISABLED, {
                        skipAnimation: true, themeContext: this.appState.getCurrentTheme(),
                        phaseContext: `FlickerEnd_Disabled_${phaseContext}_${buttonId}`, forceState: true
                    });
                } else {
                    buttonInstance.setState(targetState, {
                        skipAnimation: true, themeContext: this.appState.getCurrentTheme(),
                        phaseContext: `FlickerEnd_${phaseContext}_${buttonId}`, forceState: true
                    });
                }
                if (targetState !== ButtonStates.PERMANENTLY_DISABLED) { 
                    buttonInstance.playStateTransitionEcho();
                }
                this.emit('afterButtonTransition', buttonInstance);
                if (onFlickerComplete) onFlickerComplete(); 
                if (options.onComplete && options.onComplete !== onFlickerComplete) options.onComplete(); 
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

    setGroupDisabled(groupId, isDisabled) {
        const group = this._buttonGroups.get(groupId);
        if (!group) {
            if (this.debugResistive) console.warn(`[BM setGroupDisabled] Group not found: ${groupId}`);
            return;
        }
        if (this.debugResistive) console.log(`[BM setGroupDisabled] Setting group '${groupId}' disabled state to: ${isDisabled}`);
        group.forEach(buttonInstance => {
            buttonInstance.setPermanentlyDisabled(isDisabled);
        });
    }

    handleResistiveShutdownStageChange({ oldStage, newStage }) {
        if (!this.mainPowerOffButtonInstance) {
            if (this.debugResistive) console.warn('[BM handleResistiveShutdownStageChange] Main Power OFF button instance not found.');
            return;
        }
        if (newStage === 0) { 
            if (this.debugResistive) console.log('[BM handleResistiveShutdownStageChange] Resistive shutdown reset to stage 0.');
            if (this.mainPowerOffButtonInstance.isPermanentlyDisabled()) {
                 this.mainPowerOffButtonInstance.setPermanentlyDisabled(false);
            }
            const onButton = Array.from(this._buttonGroups.get('system-power') || []).find(b => b.getValue() === 'on');
            if (onButton) {
                this.setGroupSelected('system-power', 'on');
            }
            return;
        }

        const stageKey = `STAGE_${newStage}`;
        const stageParams = this.config.RESISTIVE_SHUTDOWN_PARAMS[stageKey];

        if (stageParams && stageParams.BUTTON_FLASH_PROFILE_NAME) {
            if (this.debugResistive) console.log(`[BM handleResistiveShutdownStageChange] Stage ${newStage}: Triggering flicker profile '${stageParams.BUTTON_FLASH_PROFILE_NAME}' for MAIN PWR OFF.`);

            let targetStateAfterFlicker = ButtonStates.ENERGIZED_UNSELECTED; 
            if (newStage === this.config.RESISTIVE_SHUTDOWN_PARAMS.MAX_STAGE) {
                targetStateAfterFlicker = ButtonStates.PERMANENTLY_DISABLED;
            }
            
            let tintClass = null;
            if (newStage === 1) tintClass = 'is-flashing-tint-yellow';
            if (newStage === 2) tintClass = 'is-flashing-tint-orange';

            this.playFlickerToState(
                this.mainPowerOffButtonInstance.element,
                targetStateAfterFlicker,
                {
                    profileName: stageParams.BUTTON_FLASH_PROFILE_NAME,
                    phaseContext: `ResistiveShutdown_S${newStage}_OFF_Button`,
                    tempGlowColor: stageParams.BUTTON_FLASH_GLOW_COLOR,
                    tempTintColorClass: tintClass,
                    onFlickerComplete: () => {
                        if (this.debugResistive) console.log(`[BM handleResistiveShutdownStageChange] Flicker for Stage ${newStage} complete. OFF button state: ${this.mainPowerOffButtonInstance.getCurrentStateClasses()}`);
                    }
                }
            );
        }
    }

    handleMainPowerOffButtonDisabledChange({ isDisabled }) {
        if (!this.mainPowerOffButtonInstance) {
            if (this.debugResistive) console.warn('[BM handleMainPowerOffButtonDisabledChange] Main Power OFF button instance not found.');
            return;
        }
        if (this.debugResistive) console.log(`[BM handleMainPowerOffButtonDisabledChange] MAIN PWR OFF button disabled state in appState changed to: ${isDisabled}. Button internal disabled: ${this.mainPowerOffButtonInstance.isPermanentlyDisabled()}`);
        
        if (this.mainPowerOffButtonInstance.isPermanentlyDisabled() !== isDisabled) {
            this.mainPowerOffButtonInstance.setPermanentlyDisabled(isDisabled);
        }
    }
}