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
    constructor() {
        this.gsap = null;
        // this.appState = null; // REMOVED
        this.config = null;
        this.aam = null; // AmbientAnimationManager
        this.audioManager = null; // Added for easier access

        this._buttons = new Map();
        this._buttonGroups = new Map();
        this._eventListeners = {};

        this.mainPowerOffButtonInstance = null;
        this.debug = false;
        this.debugResistive = true;
    }

    init() {
        this.gsap = serviceLocator.get('gsap');
        // this.appState = serviceLocator.get('appState'); // REMOVED
        this.config = serviceLocator.get('config');
        this.aam = serviceLocator.get('ambientAnimationManager');
        this.audioManager = serviceLocator.get('audioManager'); // Get AudioManager instance

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
        // Pass the imported appState module to the Button constructor
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
        const wasSelected = buttonInstance.isSelected(); // Capture state BEFORE interaction

        if (this.debugResistive) {
            console.log(`[BM handleInteraction] Clicked: ${buttonId}, Group: ${groupId}, Value: ${value}, WasSelected: ${wasSelected}, AppStatus: ${appState.getAppStatus()}`);
        }

        if (appState.getAppStatus() !== 'interactive' && groupId !== 'system-power') {
            if (this.debug) console.log(`[BM INTERACTION] Blocked, app not interactive for ${buttonId}`);
            return;
        }

        if (groupId === 'system-power' && value === 'off') {
            buttonInstance.setPressedVisuals(true); 
            appState.emit('buttonInteracted', { button: buttonInstance }); 
            if (this.debugResistive) console.log(`[BM handleInteraction] Intercepted "off" button press. Emitting event only.`);
            return; 
        }

        if ((buttonInstance.config.type === 'toggle' || buttonInstance.config.type === 'radio') && buttonInstance.isSelected()) {
            buttonInstance.setPressedVisuals(true); 
            if (this.debugResistive) console.log(`[BM handleInteraction] Blocked deselection for already-selected button: ${buttonId}`);
            return; 
        }
        
        this.emit('beforeButtonTransition', buttonInstance);
        buttonInstance.handleInteraction(); // This internally updates buttonInstance.isSelected()

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

        // Play auxModeChange sound if an AUX button's selection state changed to selected
        if (groupId === 'light' && appState.getAppStatus() === 'interactive') {
            if (buttonInstance.isSelected() && !wasSelected) { // Check if it *became* selected
                if (this.audioManager) {
                    this.audioManager.play('auxModeChange', true); // forceRestart
                    if (this.debug) console.log(`[BM handleInteraction] Played 'auxModeChange' for ${buttonId}`);
                }
            }
        } else if (appState.getAppStatus() === 'interactive' && buttonInstance.config.type !== 'radio' && buttonInstance.config.type !== 'toggle') {
            // Play generic button press for action buttons if app is interactive
            // This avoids playing it for radio/toggle buttons that have specific sounds (like auxModeChange)
            // or for buttons during startup.
            if (this.audioManager) {
                 this.audioManager.play('buttonPress', true); // forceRestart
                 if (this.debug) console.log(`[BM handleInteraction] Played 'buttonPress' for action button ${buttonId}`);
            }
        }

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
        const isP7DimlyLitFlicker = phaseContext.includes('PhaseRunner_P7_buttonFlickerToDimlyLit');

        if (isP7DimlyLitFlicker && buttonId.includes('Assign')) { 
             console.log(`[BM_FLICK_START P7_VISUALS] Button: ${buttonId}. Target: '${targetState}'. Profile: '${profileName}'. AppTime: ${performance.now().toFixed(2)}`);
        }


        if (this.debug) {
            console.log(`[BM playFlickerToState] For: ${buttonInstance.getIdentifier()}, Target State: '${targetState}', Profile: '${profileName}'`);
        }

        let baseStateToSet = ButtonStates.UNLIT;
        if (profileName.toLowerCase().includes('fromdimlylit')) baseStateToSet = ButtonStates.DIMLY_LIT;
        else if (profileName.toLowerCase().includes('resist')) baseStateToSet = buttonInstance.isSelected() ? ButtonStates.ENERGIZED_SELECTED : ButtonStates.ENERGIZED_UNSELECTED;

        if (!profileName.toLowerCase().includes('resist')) {
            buttonInstance.setState(baseStateToSet, { skipAnimation: true, forceState: true, phaseContext: `${phaseContext}_BaseSet` });
        }

        const impliesSelection = targetState.includes('is-selected');
        if (buttonInstance.isSelected() !== impliesSelection && !profileName.toLowerCase().includes('resist')) {
            buttonInstance.setSelected(impliesSelection, { skipAnimation: true, forceState: true, phaseContext: `${phaseContext}_SelectSet` });
        }

        if (tempGlowColor) buttonElement.style.setProperty('--btn-glow-color', tempGlowColor);
        if (tempTintColorClass) buttonElement.classList.add(tempTintColorClass);

        const flickerOptions = {
            ...options,
            overrideGlowParams: { isButtonSelected: typeof isButtonSelectedOverride === 'boolean' ? isButtonSelectedOverride : impliesSelection },
            onTimelineComplete: () => {
                if (isP7DimlyLitFlicker && buttonInstance.getIdentifier().includes('Assign')) {
                    const glowVarName = '--btn-dimly-lit-glow-opacity'; 
                    const glowOpacity = buttonElement.style.getPropertyValue(glowVarName);
                    const lightOpacities = Array.from(buttonElement.querySelectorAll('.light')).map(l => l.style.opacity || getComputedStyle(l).opacity).join(', ');
                    console.log(`[BM_FLICK_COMPLETE P7_VISUALS] Button: ${buttonInstance.getIdentifier()}. Flicker timeline done. BEFORE final setState. GlowVar(${glowVarName}): '${glowOpacity}'. LightOpacities: [${lightOpacities}]. AppTime: ${performance.now().toFixed(2)}`);
                }

                if (this.debug) {
                    console.log(`[BM onFlickerComplete] For: ${buttonInstance.getIdentifier()}. Applying final state: '${targetState}'`);
                }
                if (tempGlowColor) buttonElement.style.removeProperty('--btn-glow-color');
                if (tempTintColorClass) buttonElement.classList.remove(tempTintColorClass);
                buttonInstance.setState(targetState, { skipAnimation: true, forceState: true, phaseContext: `${phaseContext}_FinalSet` });

                if (isP7DimlyLitFlicker && buttonInstance.getIdentifier().includes('Assign')) {
                    const glowOpacityAfter = getComputedStyle(buttonElement).getPropertyValue('--btn-dimly-lit-glow-opacity');
                    const glowSizeAfter = getComputedStyle(buttonElement).getPropertyValue('--btn-dimly-lit-glow-size');
                    const glowColorAfter = getComputedStyle(buttonElement).getPropertyValue('--btn-dimly-lit-glow-color');
                    const lightOpacitiesAfter = Array.from(buttonElement.querySelectorAll('.light')).map(l => l.style.opacity || getComputedStyle(l).opacity).join(', ');
                    const finalClasses = Array.from(buttonElement.classList).join(' ');
                    console.log(`[BM_FLICK_SETSTATE_DONE P7_VISUALS] Button: ${buttonInstance.getIdentifier()}. Final setState done. Computed GlowOpacity: '${glowOpacityAfter}', Size: '${glowSizeAfter}', Color: '${glowColorAfter}'. LightOpacities: [${lightOpacitiesAfter}]. Classes: '${finalClasses}'. AppTime: ${performance.now().toFixed(2)}`);
                }

                if (targetState !== ButtonStates.PERMANENTLY_DISABLED) {
                    const currentPhaseNum = appState.getCurrentStartupPhaseNumber ? appState.getCurrentStartupPhaseNumber() : -1;
                    const isP7HueButtonDimlyLitFlickerContext = (phaseContext.includes('PhaseRunner_P7_buttonFlickerToDimlyLit') && 
                                                 buttonInstance.getGroupId().match(/^(env|lcd|logo|btn)$/));

                    if (!isP7HueButtonDimlyLitFlickerContext) { 
                        buttonInstance.playStateTransitionEcho();
                    } else {
                        console.log(`[BM P7_VISUALS_ECHO_SKIP] Button: ${buttonInstance.getIdentifier()}. Skipping echo in P7 for DimlyLit flicker.`);
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