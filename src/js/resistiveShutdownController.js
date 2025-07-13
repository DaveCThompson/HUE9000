/**
 * @module resistiveShutdownController
 * @description Orchestrates the resistive shutdown sequence by reacting to appState changes.
 * This module is now purely reactive to state changes managed by ActionHandler.
 */
import { serviceLocator } from './serviceLocator.js';
import { appState } from './state/index.js';
import { clamp } from './utils.js';
import { RESISTIVE_SHUTDOWN_PARAMS, DIAL_B_VISUAL_ROTATION_PER_HUE_DEGREE_CONFIG, HUE_ASSIGNMENT_ROW_HUES } from './config/index.js';
import { ButtonStates } from './buttonManager.js';

class ResistiveShutdownController {
    constructor() {
        this.buttonManager = null;
        this.audioManager = null;
        this.isTransitioning = false;
    }

    init() {
        this.buttonManager = serviceLocator.get('buttonManager');
        this.audioManager = serviceLocator.get('audioManager');

        appState.subscribe('resistiveShutdownStageChanged', (payload) => this.handleStageChange(payload));
    }

    // REMOVED: handlePowerOffClick() has been removed. Its logic (advancing state, playing sound)
    // is now centralized in ActionHandler.js. This class is now purely for orchestrating
    // the visual response to a state change.

    handleStageChange({ newStage }) {
        if (newStage === 0) {
            if (appState.getIsMainPowerOffButtonDisabled()) {
                appState.setIsMainPowerOffButtonDisabled(false);
            }
            return;
        }
        
        this.isTransitioning = true;

        const stageKey = `STAGE_${newStage}`;
        const stageParams = RESISTIVE_SHUTDOWN_PARAMS[stageKey];
        if (!stageParams) {
            this.isTransitioning = false;
            return;
        }

        if (stageParams.TERMINAL_MESSAGE_KEY) {
            appState.emit('requestTerminalMessage', {
                type: 'status',
                messageKey: stageParams.TERMINAL_MESSAGE_KEY,
            });
        }

        let flickerPromise = Promise.resolve();

        if (stageParams.BUTTON_FLASH_PROFILE_NAME) {
            const targetState = newStage === RESISTIVE_SHUTDOWN_PARAMS.MAX_STAGE
                ? ButtonStates.PERMANENTLY_DISABLED
                : ButtonStates.ENERGIZED_UNSELECTED;

            const flickerResult = this.buttonManager.setButtonState(this.buttonManager.mainPowerOffButtonInstance, targetState, {
                skipAnimation: false,
                profileName: stageParams.BUTTON_FLASH_PROFILE_NAME,
                tempGlowColor: stageParams.BUTTON_FLASH_GLOW_COLOR,
                tempTintColorClass: stageParams.BUTTON_TINT_CLASS,
                isButtonSelectedOverride: true
            });
            flickerPromise = flickerResult.completionPromise;
        }

        this._updateLensAndDialTargets(stageParams);
        this._updateHueAssignmentButtons(stageParams);

        flickerPromise.then(() => {
            if (newStage === RESISTIVE_SHUTDOWN_PARAMS.MAX_STAGE) {
                appState.setIsMainPowerOffButtonDisabled(true);
            }
            this.isTransitioning = false;
        });
    }

    _updateLensAndDialTargets(stageParams) {
        const currentDialA = appState.getDialState('A');
        const currentPower = appState.getTrueLensPower();
        let targetHue = currentDialA.hue;
        let targetPower = currentPower;

        if (stageParams.DIAL_A_HUE_TARGET_MODE === 'absolute') {
            targetHue = stageParams.DIAL_A_HUE_VALUE;
        }
        if (stageParams.DIAL_B_POWER_TARGET_MODE === 'increase_absolute_0_1') {
            targetPower += stageParams.DIAL_B_POWER_VALUE;
        } else if (stageParams.DIAL_B_POWER_TARGET_MODE === 'absolute_100') {
            targetPower = 1.0;
        }
        targetPower = clamp(targetPower, 0, 1);

        appState.updateDialState('A', { hue: targetHue, targetHue: targetHue });
        appState.setTrueLensPower(targetPower * 100);

        const dialBHue = targetPower * 359.999;
        const dialBRotation = dialBHue * (DIAL_B_VISUAL_ROTATION_PER_HUE_DEGREE_CONFIG || 1);
        appState.updateDialState('B', {
            hue: dialBHue, targetHue: dialBHue,
            rotation: dialBRotation, targetRotation: dialBRotation,
        });
    }

    _updateHueAssignmentButtons(stageParams) {
        if (!stageParams.HUE_ASSIGN_TARGET_HUE) return;
        const targetHue = stageParams.HUE_ASSIGN_TARGET_HUE;
        let closestIndex = -1;
        let smallestDiff = 360;
        HUE_ASSIGNMENT_ROW_HUES.forEach((hue, index) => {
            if (hue === null) return;
            const diff = Math.abs(hue - targetHue);
            if (diff < smallestDiff) {
                smallestDiff = diff;
                closestIndex = index;
            }
        });
        if (closestIndex !== -1) {
            ['btn', 'logo', 'lcd', 'env'].forEach(groupId => {
                appState.setTargetColorProperties(groupId, HUE_ASSIGNMENT_ROW_HUES[closestIndex]);
                this.buttonManager.setGroupSelected(groupId, closestIndex.toString(), { skipAnimation: true });
            });
        }
    }
}

const resistiveShutdownControllerInstance = new ResistiveShutdownController();
export default resistiveShutdownControllerInstance;