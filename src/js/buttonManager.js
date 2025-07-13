/**
 * @module buttonManager
 * @description Manages all button components, their states, and group behaviors.
 */
import Button from './Button.js';
import { createAdvancedFlicker } from './animationUtils.js';
import { serviceLocator } from './serviceLocator.js';
import { appState, actions } from './state/index.js'
import { EventEmitter } from './EventEmitter.js';
import { ADVANCED_FLICKER_PROFILES, HUE_ASSIGNMENT_ROW_HUES } from './config/index.js';

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

export class ButtonManager extends EventEmitter {
    constructor() {
        super();
        this.gsap = null;
        this.aam = null; 
        this.audioManager = null; 
        this._buttons = new Map();
        this._buttonGroups = new Map();
        this.mainPowerOffButtonInstance = null;
    }

    init() {
        this.gsap = serviceLocator.get('gsap');
        this.aam = serviceLocator.get('ambientAnimationManager');
        this.audioManager = serviceLocator.get('audioManager'); 
        appState.subscribe('resistiveShutdownStageChanged', this.handleResistiveShutdownStageChange.bind(this));
        appState.subscribe('mainPowerOffButtonDisabledChanged', this.handleMainPowerOffButtonDisabledChange.bind(this));
    }

    discoverButtons(buttonElements) {
        if (buttonElements && buttonElements.length > 0) {
            buttonElements.forEach(element => this.addButton(element));
        }
        this.setInitialDimStates();
    }

    addButton(element, explicitGroupId = null) {
        if (!element || this._buttons.has(element)) return;
        const buttonConfig = this._generateButtonConfig(element, explicitGroupId);
        const buttonInstance = new Button(element, buttonConfig, this.gsap);
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

    getAllButtonInstances() { return Array.from(this._buttons.values()); }
    getButtonsByGroupIds(groupIds = []) {
        const buttons = [];
        this._buttons.forEach(button => {
            if (groupIds.includes(button.getGroupId())) buttons.push(button.element);
        });
        return buttons;
    }
    getButtonInstance(element) { return this._buttons.get(element); }
    getButtonByAriaLabel(label) {
        for (const button of this._buttons.values()) {
            if (button.element.ariaLabel === label) return button;
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

        if (appState.getAppStatus() !== 'interactive' && buttonInstance.getGroupId() !== 'system-power') return;
        if (buttonInstance.isPermanentlyDisabled()) {
            appState.dispatch(actions.requestShutdown());
            return;
        }
        
        buttonInstance.setPressedVisuals(true);
        if ((buttonInstance.config.type === 'toggle' || buttonInstance.config.type === 'radio') && buttonInstance.isSelected()) {
            return; 
        }
        
        this.emit('beforeButtonTransition', buttonInstance);
        buttonInstance.handleInteraction();

        // Dispatch action based on the interaction
        this._dispatchActionForButton(buttonInstance);
        
        if (buttonInstance.getGroupId() && (buttonInstance.config.type === 'toggle' || buttonInstance.config.type === 'radio')) {
            if (buttonInstance.isSelected()) {
                this._buttonGroups.get(buttonInstance.getGroupId()).forEach(member => {
                    if (member !== buttonInstance && member.isSelected()) {
                        this.emit('beforeButtonTransition', member);
                        member.setSelected(false, { phaseContext: `GroupAutoDeselect_${member.getIdentifier()}` });
                        this.emit('afterButtonTransition', member);
                    }
                });
            }
        }
        
        this.emit('afterButtonTransition', buttonInstance);
    }

    _dispatchActionForButton(button) {
        const groupId = button.getGroupId();
        const value = button.getValue();
        const ariaLabel = button.getElement().getAttribute('aria-label');

        switch (groupId) {
            case 'system-power':
                if (value === 'off') appState.dispatch(actions.requestShutdown());
                else if (value === 'on') appState.dispatch(actions.resetShutdown());
                break;
            
            case 'light':
                const theme = button.isSelected() ? (ariaLabel.includes('High') ? 'light' : 'dark') : 'dim';
                appState.dispatch(actions.setTheme(theme));
                break;
            
            case 'env':
            case 'lcd':
            case 'logo':
            case 'btn':
                const hue = HUE_ASSIGNMENT_ROW_HUES[parseInt(value, 10)];
                appState.dispatch(actions.setHueAssignment(groupId, hue));
                break;

            case 'skill-scan-group':
            case 'fit-eval-group':
                const actionMap = { 'Scan A': 'BTN1_SCAN', 'Scan B': 'BTN2_SCAN', 'Eval X': 'BTN3_SCAN', 'Eval Y': 'BTN4_SCAN' };
                if (actionMap[ariaLabel]) {
                    appState.dispatch(actions.requestScan(actionMap[ariaLabel]));
                }
                break;
        }
    }

    setGroupSelected(groupId, selectedValue, options = {}) {
        const group = this._buttonGroups.get(groupId);
        if (!group) return [];
        group.forEach(button => {
            const shouldBeSelected = button.config.value === selectedValue;
            const targetState = shouldBeSelected 
                ? ButtonStates.ENERGIZED_SELECTED 
                : ButtonStates.ENERGIZED_UNSELECTED;
            this.setButtonState(button, targetState, { ...options, force: true });
        });
        return Array.from(group);
    }

    setButtonState(buttonOrElement, targetState, options = {}) {
        const buttonInstance = (buttonOrElement instanceof Button) ? buttonOrElement : this.getButtonInstance(buttonOrElement);
        if (!buttonInstance) return { timeline: null, completionPromise: Promise.resolve() };
        const { skipAnimation = false, profileName = 'buttonFlickerFromDimlyLitToFullyLitUnselected', phaseContext = "UnknownPhase", onComplete } = options;
        this.emit('beforeButtonTransition', buttonInstance);
        const impliesSelection = targetState.includes('is-selected');
        buttonInstance._setSelectionStateInternal(impliesSelection);
        const handleCompletion = () => {
            if (targetState !== ButtonStates.PERMANENTLY_DISABLED) buttonInstance.playStateTransitionEcho();
            this.emit('afterButtonTransition', buttonInstance);
            if (onComplete) onComplete();
        };
        if (skipAnimation) {
            buttonInstance.setState(targetState, { forceState: true, phaseContext: `${phaseContext}_Skipped` });
            handleCompletion();
            return { timeline: this.gsap.timeline(), completionPromise: Promise.resolve() };
        } else {
            const flickerOptions = { ...options, onFlickerComplete: handleCompletion };
            return this._playFlickerToState(buttonInstance, targetState, flickerOptions);
        }
    }

    _playFlickerToState(buttonInstance, targetState, options) {
        const { profileName, onFlickerComplete, tempGlowColor, tempTintColorClass, isButtonSelectedOverride, phaseContext } = options;
        const buttonElement = buttonInstance.getElement();
        const impliesSelection = targetState.includes('is-selected');
        if (tempGlowColor) buttonElement.style.setProperty('--btn-glow-color', tempGlowColor);
        if (tempTintColorClass) buttonElement.classList.add(tempTintColorClass);
        buttonInstance._isUndergoingManagedFlicker = true;
        buttonElement.classList.add(ButtonStates.FLICKERING);
        const flickerOptions = {
            ...options,
            gsapInstance: this.gsap, 
            overrideGlowParams: { isButtonSelected: typeof isButtonSelectedOverride === 'boolean' ? isButtonSelectedOverride : impliesSelection },
            onTimelineComplete: () => { 
                buttonInstance._isUndergoingManagedFlicker = false; 
                buttonElement.classList.remove(ButtonStates.FLICKERING);
                if (tempGlowColor) buttonElement.style.removeProperty('--btn-glow-color');
                if (tempTintColorClass) buttonElement.classList.remove(tempTintColorClass);
                buttonInstance.setState(targetState, { skipAnimation: true, forceState: true, phaseContext: `${phaseContext}_FinalSet`, isFlickerCompletion: true });
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
    }
    handleMainPowerOffButtonDisabledChange({ isDisabled }) {
        if (this.mainPowerOffButtonInstance) {
            this.mainPowerOffButtonInstance.setPermanentlyDisabled(isDisabled);
        }
    }
}