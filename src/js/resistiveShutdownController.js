/**
 * @module resistiveShutdownController
 * @description Orchestrates the resistive shutdown sequence by reacting to appState changes.
 */
import * as appState from './appState.js';
import * as config from './config.js';
import { clamp } from './utils.js';

const DEBUG_RSC = true; // Resistive Shutdown Controller Debug

class ResistiveShutdownController {
    constructor() {
        this.unsubscribeAppState = null;
        this.buttonManager = null;
        this.originalDialAHueForSequence = undefined;
        this.originalDialBPowerForSequence = undefined;
    }

    init(buttonManagerInstance) {
        if (DEBUG_RSC) console.log('[RSC INIT] Initializing Resistive Shutdown Controller.');
        this.buttonManager = buttonManagerInstance;
        this.unsubscribeAppState = appState.subscribe('resistiveShutdownStageChanged', this.handleStageChange.bind(this));
    }

    handleStageChange({ oldStage, newStage }) {
        if (DEBUG_RSC) console.log(`[RSC handleStageChange] Stage changed from ${oldStage} to ${newStage}`);

        if (newStage === 0) { // Reset or initial state
            delete this.originalDialAHueForSequence;
            delete this.originalDialBPowerForSequence;
            if (appState.getIsMainPowerOffButtonDisabled()) {
                appState.setIsMainPowerOffButtonDisabled(false);
            }
            if (this.buttonManager) {
                this.buttonManager.setGroupDisabled('system-power', false);
            }
            if (DEBUG_RSC) console.log('[RSC] Resistive shutdown sequence reset to stage 0.');
            return;
        }

        const stageKey = `STAGE_${newStage}`;
        const stageParams = config.RESISTIVE_SHUTDOWN_PARAMS[stageKey];

        if (!stageParams) {
            console.error(`[RSC handleStageChange] No parameters found for stage: ${newStage}`);
            return;
        }

        if (stageParams.TERMINAL_MESSAGE_KEY) {
            appState.emit('requestTerminalMessage', {
                type: 'status',
                source: stageParams.TERMINAL_MESSAGE_KEY,
                messageKey: stageParams.TERMINAL_MESSAGE_KEY,
            });
            if (DEBUG_RSC) console.log(`[RSC handleStageChange] Emitted terminal message for key: ${stageParams.TERMINAL_MESSAGE_KEY}`);
        }

        this.updateLensTargets(stageParams);
        this.updateHueAssignmentButtons(stageParams);

        if (newStage === config.RESISTIVE_SHUTDOWN_PARAMS.MAX_STAGE) {
            appState.setIsMainPowerOffButtonDisabled(true);
            if (this.buttonManager) {
                this.buttonManager.setGroupDisabled('system-power', true);
            }
            if (DEBUG_RSC) console.log(`[RSC handleStageChange] Main Power buttons disabled.`);
        }
    }

    updateLensTargets(stageParams) {
        const currentDialAState = appState.getDialState('A');
        const currentDialBPower01 = appState.getTrueLensPower();

        let targetDialAHue = currentDialAState.hue;
        if (stageParams.DIAL_A_HUE_TARGET_MODE === 'absolute') {
            targetDialAHue = stageParams.DIAL_A_HUE_VALUE;
        }

        let targetDialBPower01 = currentDialBPower01;
        if (stageParams.DIAL_B_POWER_TARGET_MODE === 'increase_absolute_0_1') {
            targetDialBPower01 = currentDialBPower01 + stageParams.DIAL_B_POWER_VALUE;
        } else if (stageParams.DIAL_B_POWER_TARGET_MODE === 'absolute_100') {
            targetDialBPower01 = 1.0;
        }
        
        targetDialBPower01 = clamp(targetDialBPower01, 0, 1);

        if (DEBUG_RSC) {
            console.log(`[RSC updateLensTargets] Current Power: ${currentDialBPower01.toFixed(3)}, Target Power: ${targetDialBPower01.toFixed(3)}`);
            console.log(`[RSC updateLensTargets] Target Hue: ${targetDialAHue.toFixed(1)}`);
        }
        
        appState.updateDialState('A', {
            hue: targetDialAHue, 
            targetHue: targetDialAHue, 
        });
        appState.setTrueLensPower(targetDialBPower01 * 100); 
    }

    updateHueAssignmentButtons(stageParams) {
        if (!this.buttonManager || !stageParams.HUE_ASSIGN_TARGET_HUE) return;

        const targetHue = stageParams.HUE_ASSIGN_TARGET_HUE;
        let closestHueIndex = -1;
        let smallestDiff = 360;

        config.HUE_ASSIGNMENT_ROW_HUES.forEach((hue, index) => {
            const diff = Math.abs(hue - targetHue);
            if (diff < smallestDiff) {
                smallestDiff = diff;
                closestHueIndex = index;
            }
        });

        if (closestHueIndex !== -1) {
            const targetGroups = ['btn', 'logo', 'lcd', 'env'];
            const targetHueValue = config.HUE_ASSIGNMENT_ROW_HUES[closestHueIndex];

            targetGroups.forEach(groupId => {
                // Directly update the app state for the color property
                appState.setTargetColorProperties(groupId, targetHueValue);

                // Find and flicker the corresponding button in the grid
                const btnGroup = this.buttonManager._buttonGroups.get(groupId);
                if (btnGroup) {
                    btnGroup.forEach(buttonInstance => {
                        if (parseInt(buttonInstance.getValue(), 10) === closestHueIndex) {
                            this.buttonManager.playFlickerToState(
                                buttonInstance.getElement(),
                                'is-energized is-selected',
                                {
                                    profileName: 'buttonFlickerFromUnlitToFullyLitSelected',
                                    phaseContext: `ResistiveShutdown_HueBtn_${groupId}_S${appState.getResistiveShutdownStage()}`
                                }
                            );
                        } else if (buttonInstance.isSelected()) {
                            // Deselect any previously selected button in the group instantly
                            buttonInstance.setSelected(false, { skipAnimation: true });
                        }
                    });
                }
            });
        }
    }

    destroy() {
        if (this.unsubscribeAppState) {
            this.unsubscribeAppState();
            this.unsubscribeAppState = null;
        }
        delete this.originalDialAHueForSequence;
        delete this.originalDialBPowerForSequence;
        if (DEBUG_RSC) console.log('[RSC DESTROY] Resistive Shutdown Controller destroyed.');
    }
}

const resistiveShutdownControllerInstance = new ResistiveShutdownController();
export default resistiveShutdownControllerInstance;