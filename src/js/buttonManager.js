/**
 * @module buttonManager
 * @description Manages all button components, their states, and group behaviors.
 * Leverages Button.js for individual button logic. (Project Decouple Refactor)
 */
import Button from './Button.js';
import { createAdvancedFlicker } from './animationUtils.js';
import { shuffleArray } from './utils.js';
import { serviceLocator } from './serviceLocator.js';
import * as appState from './appState.js'; // IMPORT appState directly
import { ADVANCED_FLICKER_PROFILES } from './config.js'; // Import for checking glow var names

export const ButtonStates = {
    UNLIT: 'is-unlit',
    DIMLY_LIT: 'is-dimly-lit',
    ENERGIZED_UNSELECTED: 'is-energized',
    ENERGIZED_SELECTED: 'is-energized is-selected',
    DIMLY_LIT_UNSELECTED: 'is-dimly-lit',
    DIMLY_LIT_SELECTED: 'is-dimly-lit is-selected',
    PRESSING: 'is-pressing',
    FLICKERING: 'is-flickering', // Used to disable CSS transitions during GSAP flicker
    PERMANENTLY_DISABLED: 'is-permanently-disabled'
};

export class ButtonManager {
    constructor() {
        this.gsap = null;
        this.config = null;
        this.aam = null; 
        this.audioManager = null; 

        this._buttons = new Map();
        this._buttonGroups = new Map();
        this._eventListeners = {};

        this.mainPowerOffButtonInstance = null;
        this.debug = false;
        this.debugResistive = true;
    }

    init() {
        this.gsap = serviceLocator.get('gsap');
        this.config = serviceLocator.get('config');
        this.aam = serviceLocator.get('ambientAnimationManager');
        this.audioManager = serviceLocator.get('audioManager'); 

        appState.subscribe('resistiveShutdownStageChanged', this.handleResistiveShutdownStageChange.bind(this));
        appState.subscribe('mainPowerOffButtonDisabledChanged', this.handleMainPowerOffButtonDisabledChange.bind(this));

        if (this.debug) console.log('[ButtonManager INIT]');
    }

    on(eventName, callback) {
        if (typeof callback !== 'function') return;
        if (!this._eventListeners[eventName]) this._eventListeners[eventName] = [];
        this._eventListeners[eventName].push(callback);
    }

    emit(eventName, data) {
        if (this._eventListeners[eventName]) {
            this._eventListeners[eventName].forEach(cb => cb(data));
        }
    }

    discoverButtons(buttonElements) {
        if (this.debug) console.log(`[ButtonManager] Discovering ${buttonElements?.length} buttons.`);
        if (buttonElements && buttonElements.length > 0) {
            buttonElements.forEach(element => this.addButton(element));
        }
        this.setInitialDimStates();
    }

    addButton(element, explicitGroupId = null) {
        if (!element || this._buttons.has(element)) return;

        const buttonConfig = this._generateButtonConfig(element, explicitGroupId);
        const buttonInstance = new Button(element, buttonConfig, this.gsap, appState, this.config);
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
        }
    }

    _generateButtonConfig(element, explicitGroupId = null) {
        const type = element.classList.contains('button-unit--toggle') ? 'toggle' :
                     element.classList.contains('button-unit--action') ? 'action' :
                     element.classList.contains('button-unit--radio') ? 'radio' : 'default';
        let groupId = explicitGroupId || element.closest('[data-group-id]')?.dataset.groupId || null;
        const value = element.dataset.toggleValue || element.dataset.value || null;
        const isSelectedByDefault = element.classList.contains('is-selected');
        return { type, groupId, value, isSelectedByDefault };
    }

    getAllButtonInstances() {
        return Array.from(this._buttons.values());
    }
    
    getButtonsByGroupIds(groupIds = []) {
        const buttons = [];
        this._buttons.forEach(button => {
            if (groupIds.includes(button.getGroupId())) {
                buttons.push(button.element);
            }
        });
        return buttons;
    }

    getButtonInstance(element) {
        return this._buttons.get(element);
    }

    getButtonByAriaLabel(label) {
        for (const button of this._buttons.values()) {
            if (button.element.ariaLabel === label) {
                return button;
            }
        }
        return null;
    }

    setInitialDimStates() {
        this._buttons.forEach(button => {
            if (button.isSelected()) button.setSelected(false, { skipAnimation: true });
            button.setState(ButtonStates.UNLIT, { skipAnimation: true, forceState: true });
        });
    }

    handleInteraction(buttonElement) {
        const buttonInstance = this._buttons.get(buttonElement);
        if (!buttonInstance) return;

        const buttonId = buttonInstance.getIdentifier();
        const groupId = buttonInstance.getGroupId();
        const value = buttonInstance.getValue();
        const wasSelected = buttonInstance.isSelected(); 

        if (this.debugResistive) {
            console.log(`[BM handleInteraction | ${performance.now().toFixed(2)}ms] Clicked: ${buttonId}, Group: ${groupId}, Value: ${value}, WasSelected: ${wasSelected}, AppStatus: ${appState.getAppStatus()}`);
        }

        if (appState.getAppStatus() !== 'interactive' && groupId !== 'system-power') {
            if (this.debug) console.log(`[BM INTERACTION | ${performance.now().toFixed(2)}ms] Blocked, app not interactive for ${buttonId}`);
            return;
        }

        if (groupId === 'system-power' && value === 'off') {
            buttonInstance.setPressedVisuals(true); 
            appState.emit('buttonInteracted', { button: buttonInstance }); 
            if (this.debugResistive) console.log(`[BM handleInteraction | ${performance.now().toFixed(2)}ms] Intercepted "off" button press. Emitting event only.`);
            return; 
        }

        if ((buttonInstance.config.type === 'toggle' || buttonInstance.config.type === 'radio') && buttonInstance.isSelected()) {
            buttonInstance.setPressedVisuals(true); 
            if (this.debugResistive) console.log(`[BM handleInteraction | ${performance.now().toFixed(2)}ms] Blocked deselection for already-selected button: ${buttonId}`);
            return; 
        }
        
        this.emit('beforeButtonTransition', buttonInstance);
        buttonInstance.handleInteraction(); 

        if (groupId && (buttonInstance.config.type === 'toggle' || buttonInstance.config.type === 'radio')) {
            if (buttonInstance.isSelected()) {
                this._buttonGroups.get(groupId).forEach(member => {
                    if (member !== buttonInstance && member.isSelected()) {
                        this.emit('beforeButtonTransition', member);
                        member.setSelected(false, { phaseContext: `GroupAutoDeselect_${member.getIdentifier()}` });
                        this.emit('afterButtonTransition', member);
                    }
                });
            }
        }
        appState.emit('buttonInteracted', { button: buttonInstance });
        this.emit('afterButtonTransition', buttonInstance);

        // REMOVED audio playing logic from here to centralize it in main.js
        // The old logic that played 'auxModeChange' or 'buttonPress' is gone.
    }

    setGroupSelected(groupId, selectedValue) {
        const group = this._buttonGroups.get(groupId);
        if (!group) return;

        group.forEach(button => {
            const shouldBeSelected = button.config.value === selectedValue;
            if (button.isSelected() !== shouldBeSelected) {
                this.emit('beforeButtonTransition', button);
                button.setSelected(shouldBeSelected, { skipAnimation: true, forceState: true });
                button.playStateTransitionEcho();
                this.emit('afterButtonTransition', button);
            }
        });
    }

    playFlickerToState(buttonElement, targetState, options) {
        const buttonInstance = this._buttons.get(buttonElement);
        if (!buttonInstance) return { timeline: null, completionPromise: Promise.resolve() };

        this.emit('beforeButtonTransition', buttonInstance);
        const { profileName, phaseContext = "UnknownPhase", isButtonSelectedOverride = null, onFlickerComplete, tempGlowColor, tempTintColorClass } = options;
        
        const buttonId = buttonInstance.getIdentifier();
        console.log(`[BM_PFLICK_ENTRY | ${performance.now().toFixed(2)}ms] For: ${buttonId}, Target: '${targetState}', Profile: '${profileName}', PhaseCtx: ${phaseContext}`);

        const isP7DimlyLitFlicker = phaseContext.includes('PhaseRunner_P7_buttonFlickerToDimlyLit');

        if (isP7DimlyLitFlicker && buttonId.includes('Assign')) { 
             console.log(`[BM_FLICK_START P7_VISUALS | ${performance.now().toFixed(2)}ms] Button: ${buttonId}. Target: '${targetState}'. Profile: '${profileName}'.`);
        }

        let baseStateToSet = ButtonStates.UNLIT;
        if (profileName.toLowerCase().includes('fromdimlylit')) baseStateToSet = ButtonStates.DIMLY_LIT;
        else if (profileName.toLowerCase().includes('resist')) baseStateToSet = buttonInstance.isSelected() ? ButtonStates.ENERGIZED_SELECTED : ButtonStates.ENERGIZED_UNSELECTED;

        console.log(`[BM_PFLICK_BASE_SET | ${performance.now().toFixed(2)}ms] Button: ${buttonId}. Base state being set before flicker: '${baseStateToSet}'. Profile: ${profileName}`);
        
        if (!profileName.toLowerCase().includes('resist')) {
            buttonInstance.setState(baseStateToSet, { skipAnimation: true, forceState: true, phaseContext: `${phaseContext}_BaseSet` });
            
            // **** NEW DEBUG: Check state AFTER _BaseSet, BEFORE flicker starts ****
            this.gsap.delayedCall(0.001, () => { // Tiny delay for CSS to apply
                const lightTarget = buttonElement.querySelector('.light');
                if (lightTarget) {
                    const baseSetLightOpacity = getComputedStyle(lightTarget).opacity;
                    const baseSetLightDisplay = getComputedStyle(lightTarget).display;
                    const baseSetLightVisibility = getComputedStyle(lightTarget).visibility;
                    
                    let glowVarName = '--btn-dimly-lit-glow-opacity'; // Default or fallback
                    const flickerProfile = ADVANCED_FLICKER_PROFILES[profileName];
                    if (flickerProfile && flickerProfile.glow && flickerProfile.glow.opacityVar) {
                        glowVarName = flickerProfile.glow.opacityVar;
                    } else if (flickerProfile && flickerProfile.glow && flickerProfile.glow.animatedProperties && flickerProfile.glow.animatedProperties.opacity) {
                        glowVarName = flickerProfile.glow.animatedProperties.opacity;
                    }
                    const baseSetButtonGlowOpacity = getComputedStyle(buttonElement).getPropertyValue(glowVarName).trim();

                    console.log(`[BM_PFLICK_POST_BASESET_INSPECT | ${performance.now().toFixed(2)}ms] ${buttonId}: After _BaseSet ('${baseStateToSet}'). Light Opacity=${baseSetLightOpacity}, Display=${baseSetLightDisplay}, Visibility=${baseSetLightVisibility}, Button Glow Opacity Var ('${glowVarName}')='${baseSetButtonGlowOpacity}'`);
                } else {
                    console.log(`[BM_PFLICK_POST_BASESET_INSPECT | ${performance.now().toFixed(2)}ms] ${buttonId}: After _BaseSet ('${baseStateToSet}'). No .light element found for inspection.`);
                }
            });
            // **** END NEW DEBUG ****
        }


        const impliesSelection = targetState.includes('is-selected');
        if (buttonInstance.isSelected() !== impliesSelection && !profileName.toLowerCase().includes('resist')) {
            buttonInstance.setSelected(impliesSelection, { skipAnimation: true, forceState: true, phaseContext: `${phaseContext}_SelectSet` });
        }

        if (tempGlowColor) buttonElement.style.setProperty('--btn-glow-color', tempGlowColor);
        if (tempTintColorClass) buttonElement.classList.add(tempTintColorClass);

        buttonInstance._isUndergoingManagedFlicker = true;
        console.log(`[BM_PFLICK_FLAG_SET | ${performance.now().toFixed(2)}ms] Set _isUndergoingManagedFlicker=true for '${buttonId}'`);
        
        buttonElement.classList.add(ButtonStates.FLICKERING);
        console.log(`[BM_PFLICK_ADD_CLASS | ${performance.now().toFixed(2)}ms] Added '${ButtonStates.FLICKERING}' to ${buttonId}`);

        const flickerOptions = {
            ...options,
            gsapInstance: this.gsap, 
            overrideGlowParams: { isButtonSelected: typeof isButtonSelectedOverride === 'boolean' ? isButtonSelectedOverride : impliesSelection },
            onTimelineComplete: () => { 
                buttonInstance._isUndergoingManagedFlicker = false; 
                console.log(`[BM_PFLICK_FLAG_CLEAR | ${performance.now().toFixed(2)}ms] Set _isUndergoingManagedFlicker=false for '${buttonInstance.getIdentifier()}' (in onTimelineComplete)`);
                
                buttonElement.classList.remove(ButtonStates.FLICKERING);
                console.log(`[BM_PFLICK_REMOVE_CLASS | ${performance.now().toFixed(2)}ms] Removed '${ButtonStates.FLICKERING}' from ${buttonInstance.getIdentifier()}`);

                if (isP7DimlyLitFlicker && buttonInstance.getIdentifier().includes('Assign')) {
                    // ... P7 specific logging ...
                }
                console.log(`[BM_PFLICK_ONCOMPLETE_PRE_SETSTATE | ${performance.now().toFixed(2)}ms] Button: ${buttonInstance.getIdentifier()}. Flicker timeline done. About to set final state: '${targetState}'.`);

                if (tempGlowColor) buttonElement.style.removeProperty('--btn-glow-color');
                if (tempTintColorClass) buttonElement.classList.remove(tempTintColorClass);
                
                buttonInstance.setState(targetState, { 
                    skipAnimation: true, 
                    forceState: true, 
                    phaseContext: `${phaseContext}_FinalSet`,
                    isFlickerCompletion: true 
                });
                console.log(`[BM_PFLICK_SETSTATE_DONE | ${performance.now().toFixed(2)}ms] Final setState for '${buttonInstance.getIdentifier()}' (after flicker) DONE.`);

                if (isP7DimlyLitFlicker && buttonInstance.getIdentifier().includes('Assign')) {
                    // ... P7 specific logging ...
                }

                if (targetState !== ButtonStates.PERMANENTLY_DISABLED) {
                    const currentPhaseNum = appState.getCurrentStartupPhaseNumber ? appState.getCurrentStartupPhaseNumber() : -1;
                    const isP7HueButtonDimlyLitFlickerContext = (phaseContext.includes('PhaseRunner_P7_buttonFlickerToDimlyLit') && 
                                                 buttonInstance.getGroupId().match(/^(env|lcd|logo|btn)$/));

                    if (!isP7HueButtonDimlyLitFlickerContext) { 
                        buttonInstance.playStateTransitionEcho();
                    } else {
                        console.log(`[BM P7_VISUALS_ECHO_SKIP | ${performance.now().toFixed(2)}ms] Button: ${buttonInstance.getIdentifier()}. Skipping echo in P7 for DimlyLit flicker.`);
                    }
                }
                this.emit('afterButtonTransition', buttonInstance);
                if (onFlickerComplete) onFlickerComplete();
            }
        };
        
        return createAdvancedFlicker(buttonElement, profileName, flickerOptions);
    }

    setPressedVisuals(buttonElement, isPressed) {
        const buttonInstance = this._buttons.get(buttonElement);
        if (buttonInstance) buttonInstance.setPressedVisuals(isPressed);
    }

    setGroupDisabled(groupId, isDisabled) {
        const group = this._buttonGroups.get(groupId);
        if (!group) return;
        group.forEach(button => button.setPermanentlyDisabled(isDisabled));
    }

    handleResistiveShutdownStageChange({ newStage }) {
        if (!this.mainPowerOffButtonInstance) return;
        if (newStage === 0) {
            if (this.mainPowerOffButtonInstance.isPermanentlyDisabled()) {
                this.mainPowerOffButtonInstance.setPermanentlyDisabled(false);
            }
            this.setGroupSelected('system-power', 'on');
            return;
        }

        const stageKey = `STAGE_${newStage}`;
        const stageParams = this.config.RESISTIVE_SHUTDOWN_PARAMS[stageKey];
        if (!stageParams || !stageParams.BUTTON_FLASH_PROFILE_NAME) return;

        let targetState = newStage === this.config.RESISTIVE_SHUTDOWN_PARAMS.MAX_STAGE
            ? ButtonStates.PERMANENTLY_DISABLED
            : ButtonStates.ENERGIZED_UNSELECTED;

        this.playFlickerToState(this.mainPowerOffButtonInstance.element, targetState, {
            profileName: stageParams.BUTTON_FLASH_PROFILE_NAME,
            tempGlowColor: stageParams.BUTTON_FLASH_GLOW_COLOR,
        });
    }

    handleMainPowerOffButtonDisabledChange({ isDisabled }) {
        if (this.mainPowerOffButtonInstance) {
            this.mainPowerOffButtonInstance.setPermanentlyDisabled(isDisabled);
        }
    }
}