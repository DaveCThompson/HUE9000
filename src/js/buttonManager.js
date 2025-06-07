/**
 * @module buttonManager
 * @description Manages all button components, their states, and group behaviors.
 * Leverages Button.js for individual button logic. (Project Decouple Refactor)
 */
import Button from './Button.js';
import { createAdvancedFlicker } from './animationUtils.js';
import { shuffleArray } from './utils.js';
import { serviceLocator } from './serviceLocator.js';

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
        this.appState = null;
        this.config = null;
        this.aam = null; // AmbientAnimationManager

        this._buttons = new Map();
        this._buttonGroups = new Map();
        this._eventListeners = {};

        this.mainPowerOffButtonInstance = null;
        this.debug = false;
        this.debugResistive = true;
    }

    init() {
        this.gsap = serviceLocator.get('gsap');
        this.appState = serviceLocator.get('appState');
        this.config = serviceLocator.get('config');
        this.aam = serviceLocator.get('ambientAnimationManager');

        this.appState.subscribe('resistiveShutdownStageChanged', this.handleResistiveShutdownStageChange.bind(this));
        this.appState.subscribe('mainPowerOffButtonDisabledChanged', this.handleMainPowerOffButtonDisabledChange.bind(this));

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
        const buttonInstance = new Button(element, buttonConfig, this.gsap, this.appState, this.config);
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

    /**
     * Finds a button instance by its aria-label.
     * @param {string} label The aria-label to search for.
     * @returns {Button|null} The button instance or null if not found.
     */
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

        // --- REVISED LOGIC START ---
        const buttonId = buttonInstance.getIdentifier();
        const groupId = buttonInstance.getGroupId();
        const value = buttonInstance.getValue();

        if (this.debugResistive) {
            console.log(`[BM handleInteraction] Clicked: ${buttonId}, Group: ${groupId}, Value: ${value}, IsSelected: ${buttonInstance.isSelected()}, AppStatus: ${this.appState.getAppStatus()}`);
        }

        if (this.appState.getAppStatus() !== 'interactive' && groupId !== 'system-power') {
            if (this.debug) console.log(`[BM INTERACTION] Blocked, app not interactive for ${buttonId}`);
            return;
        }

        // FIX FOR ISSUE #1: "Off" Button should not change state, only give feedback.
        if (groupId === 'system-power' && value === 'off') {
            buttonInstance.setPressedVisuals(true); // Give press feedback
            this.appState.emit('buttonInteracted', { button: buttonInstance }); // Let controller handle it
            if (this.debugResistive) console.log(`[BM handleInteraction] Intercepted "off" button press. Emitting event only.`);
            return; // Stop further processing
        }

        // FIX FOR ISSUES #2 & #3: Prevent deselection of already-selected buttons.
        if ((buttonInstance.config.type === 'toggle' || buttonInstance.config.type === 'radio') && buttonInstance.isSelected()) {
            buttonInstance.setPressedVisuals(true); // Still give press feedback
            if (this.debugResistive) console.log(`[BM handleInteraction] Blocked deselection for already-selected button: ${buttonId}`);
            return; // Stop further processing
        }
        // --- REVISED LOGIC END ---

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
        this.appState.emit('buttonInteracted', { button: buttonInstance });
        this.emit('afterButtonTransition', buttonInstance);
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

        if (this.debug) {
            console.log(`[BM playFlickerToState] For: ${buttonInstance.getIdentifier()}, Target State: '${targetState}', Profile: '${profileName}'`);
        }

        let baseStateToSet = ButtonStates.UNLIT;
        if (profileName.toLowerCase().includes('fromdimlylit')) baseStateToSet = ButtonStates.DIMLY_LIT;
        else if (profileName.toLowerCase().includes('resist')) baseStateToSet = buttonInstance.isSelected() ? ButtonStates.ENERGIZED_SELECTED : ButtonStates.ENERGIZED_UNSELECTED;

        if (!profileName.toLowerCase().includes('resist')) {
            buttonInstance.setState(baseStateToSet, { skipAnimation: true, forceState: true });
        }

        const impliesSelection = targetState.includes('is-selected');
        if (buttonInstance.isSelected() !== impliesSelection && !profileName.toLowerCase().includes('resist')) {
            buttonInstance.setSelected(impliesSelection, { skipAnimation: true, forceState: true });
        }

        if (tempGlowColor) buttonElement.style.setProperty('--btn-glow-color', tempGlowColor);
        if (tempTintColorClass) buttonElement.classList.add(tempTintColorClass);

        const flickerOptions = {
            ...options,
            overrideGlowParams: { isButtonSelected: typeof isButtonSelectedOverride === 'boolean' ? isButtonSelectedOverride : impliesSelection },
            onTimelineComplete: () => {
                if (this.debug) {
                    console.log(`[BM onFlickerComplete] For: ${buttonInstance.getIdentifier()}. Applying final state: '${targetState}'`);
                }
                if (tempGlowColor) buttonElement.style.removeProperty('--btn-glow-color');
                if (tempTintColorClass) buttonElement.classList.remove(tempTintColorClass);
                buttonInstance.setState(targetState, { skipAnimation: true, forceState: true });
                if (targetState !== ButtonStates.PERMANENTLY_DISABLED) buttonInstance.playStateTransitionEcho();
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