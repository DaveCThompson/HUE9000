/**
 * @module resistiveShutdownController
 * @description Orchestrates the resistive shutdown sequence by reacting to appState changes.
 * (Project Decouple Refactor)
 */
import { serviceLocator } from './serviceLocator.js';
import * as appState from './appState.js'; // IMPORT appState directly
import { clamp } from './utils.js';

class ResistiveShutdownController {
    constructor() {
        // this.appState = null; // REMOVED
        this.config = null;
        this.buttonManager = null;
        this.debug = true;
    }

    init() {
        // this.appState = serviceLocator.get('appState'); // REMOVED
        this.config = serviceLocator.get('config');
        this.buttonManager = serviceLocator.get('buttonManager');

        appState.subscribe('resistiveShutdownStageChanged', (payload) => this.handleStageChange(payload));
        if (this.debug) console.log('[RSC INIT]');
    }

    /**
     * This method is called from the main.js event listener when the power off button is clicked.
     */
    handlePowerOffClick() {
        if (appState.getIsMainPowerOffButtonDisabled()) {
            if (this.debug) console.log(`[RSC] MAIN PWR OFF is disabled. Interaction blocked.`);
            return;
        }
        const currentStage = appState.getResistiveShutdownStage();
        if (currentStage < this.config.RESISTIVE_SHUTDOWN_PARAMS.MAX_STAGE) {
            const newStage = currentStage + 1;
            if (this.debug) console.log(`[RSC] Advancing resistive shutdown to stage ${newStage}.`);
            appState.setResistiveShutdownStage(newStage);
        }
    }

    handleStageChange({ newStage }) {
        if (this.debug) console.log(`[RSC] Stage changed to ${newStage}`);

        if (newStage === 0) {
            if (appState.getIsMainPowerOffButtonDisabled()) {
                appState.setIsMainPowerOffButtonDisabled(false);
            }
            return;
        }

        const stageKey = `STAGE_${newStage}`;
        const stageParams = this.config.RESISTIVE_SHUTDOWN_PARAMS[stageKey];
        if (!stageParams) return;

        if (stageParams.TERMINAL_MESSAGE_KEY) {
            appState.emit('requestTerminalMessage', {
                type: 'status',
                messageKey: stageParams.TERMINAL_MESSAGE_KEY,
            });
        }

        this._updateLensAndDialTargets(stageParams);
        this._updateHueAssignmentButtons(stageParams);

        if (newStage === this.config.RESISTIVE_SHUTDOWN_PARAMS.MAX_STAGE) {
            appState.setIsMainPowerOffButtonDisabled(true);
        }
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
        const dialBRotation = dialBHue * (this.config.DIAL_B_VISUAL_ROTATION_PER_HUE_DEGREE_CONFIG || 1);

        appState.updateDialState('B', {
            hue: dialBHue,
            targetHue: dialBHue,
            rotation: dialBRotation,
            targetRotation: dialBRotation,
        });

        if (this.debug) {
            console.log(`[RSC _updateLensAndDialTargets] Synced state. New Lens Power: ${targetPower.toFixed(3)}. New Dial B Hue: ${dialBHue.toFixed(2)}`);
        }
    }

    _updateHueAssignmentButtons(stageParams) {
        if (!stageParams.HUE_ASSIGN_TARGET_HUE) return;

        const targetHue = stageParams.HUE_ASSIGN_TARGET_HUE;
        let closestIndex = -1;
        let smallestDiff = 360;

        this.config.HUE_ASSIGNMENT_ROW_HUES.forEach((hue, index) => {
            const diff = Math.abs(hue - targetHue);
            if (diff < smallestDiff) {
                smallestDiff = diff;
                closestIndex = index;
            }
        });

        if (closestIndex !== -1) {
            ['btn', 'logo', 'lcd', 'env'].forEach(groupId => {
                appState.setTargetColorProperties(groupId, this.config.HUE_ASSIGNMENT_ROW_HUES[closestIndex]);
                this.buttonManager.setGroupSelected(groupId, closestIndex.toString());
            });
        }
    }
}

const resistiveShutdownControllerInstance = new ResistiveShutdownController();
export default resistiveShutdownControllerInstance;