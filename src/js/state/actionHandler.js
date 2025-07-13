/**
 * @module state/actionHandler
 * @description The central "Action Handler" or "Reducer" for the application.
 * It listens for dispatched actions and is the ONLY module authorized to mutate
 * state or trigger side effects like terminal messages and sounds.
 */
import { serviceLocator } from '../serviceLocator.js';
import * as appState from './appState.js'; // CORRECT: Import from sibling
import * as actions from './actions.js';   // CORRECT: Import from sibling
import { HUE_ASSIGNMENT_ROW_HUES, RESISTIVE_SHUTDOWN_PARAMS } from '../config/index.js';

class ActionHandler {
    constructor() {
        this.audioManager = null;
        this.startupManager = null;
        // REMOVED: No longer need a direct reference to resistiveShutdownController
        
        this.lastInteractionMessageTimes = {};
        this.MESSAGE_COALESCE_WINDOW_MS = 1000;
    }

    init() {
        this.audioManager = serviceLocator.get('audioManager');
        this.startupManager = serviceLocator.get('startupSequenceManager');
        appState.subscribe('actionDispatched', (action) => this.handleAction(action));
    }

    handleAction(action) {
        if (!action || !action.type) {
            console.warn('[ActionHandler] Received an invalid action:', action);
            return;
        }

        switch (action.type) {
            case actions.SET_THEME:
                this._handleSetTheme(action.payload.theme);
                break;
            case actions.CYCLE_THEME:
                this._handleCycleTheme();
                break;
            case actions.SET_HUE_ASSIGNMENT:
                this._handleSetHueAssignment(action.payload.targetKey, action.payload.hue);
                break;
            case actions.DIAL_INTERACTION_COMPLETE:
                this._handleDialInteractionComplete(action.payload.dialId, action.payload.finalHue);
                break;
            case actions.REQUEST_SCAN:
                this.audioManager.play('buttonPress', true);
                appState.emit('requestTerminalMessage', {
                    type: 'scan',
                    messageKey: action.payload.messageKey,
                    interrupt: true
                });
                break;
            case actions.REQUEST_SHUTDOWN:
                this._handleRequestShutdown();
                break;
            case actions.RESET_SHUTDOWN:
                if (appState.getResistiveShutdownStage() > 0) {
                    appState.setResistiveShutdownStage(0);
                }
                break;
            case actions.RESET_SEQUENCE:
                this.startupManager.resetSequence();
                break;
            case actions.TOGGLE_AUDIO_MUTE:
                appState.setIsAudioMuted(!appState.getIsAudioMuted());
                break;
        }
    }

    _handleSetTheme(theme) {
        const currentTheme = appState.getCurrentTheme();
        if (currentTheme === theme) return;
        let soundToPlay = 'buttonPress';
        let stateText = 'OFF';
        if (theme === 'light') {
            soundToPlay = 'auxModeHigh';
            stateText = 'HIGH';
        } else if (theme === 'dark') {
            soundToPlay = 'auxModeLow';
            stateText = 'LOW';
        }
        appState.setTheme(theme);
        const soundId = this.audioManager.play(soundToPlay, true);
        if (soundToPlay === 'auxModeLow' && soundId !== null) {
            setTimeout(() => this.audioManager.fadeOut('auxModeLow', 1.5, soundId), 1000);
        }
        this._emitCoalescedInteractionMessage('aux_light', {
            type: 'interaction',
            source: 'aux_light',
            data: { state: stateText }
        });
    }

    _handleCycleTheme() {
        const currentTheme = appState.getCurrentTheme();
        const nextTheme = (currentTheme === 'light') ? 'dark' : 'light';
        this._handleSetTheme(nextTheme);
        const mobileLightBtn = document.getElementById('mobile-light-btn');
        if (mobileLightBtn) {
            const icon = mobileLightBtn.querySelector('.material-symbols-outlined');
            if (icon) icon.style.fontVariationSettings = (nextTheme === 'light') ? "'FILL' 1" : "'FILL' 0";
        }
    }

    _handleSetHueAssignment(targetKey, hue) {
        this.audioManager.play('buttonPress', true);
        if (targetKey === 'all') {
            ['env', 'logo', 'lcd', 'btn'].forEach(key => appState.setTargetColorProperties(key, hue));
        } else {
            appState.setTargetColorProperties(targetKey, hue);
        }
        if (appState.getResistiveShutdownStage() > 0) return;
        this._emitCoalescedInteractionMessage(`hue_assign_${targetKey}`, {
            type: 'interaction',
            source: 'hue_assign',
            data: { target: targetKey.toUpperCase(), hue: hue }
        });
    }

    _handleDialInteractionComplete(dialId, finalHue) {
        if (dialId === 'A') {
            this._emitCoalescedInteractionMessage('mood_dial_interaction', {
                type: 'interaction', source: 'mood_change', data: { hue: finalHue }
            });
        } else if (dialId === 'B') {
            const powerPercentage = (finalHue / 359.999) * 100;
            this._emitCoalescedInteractionMessage('intensity_dial_interaction', {
                type: 'interaction', source: 'intensity_change', data: { power: powerPercentage }
            });
        }
    }

    _handleRequestShutdown() {
        if (appState.getIsMainPowerOffButtonDisabled()) {
            this.audioManager.play('powerDown', true);
            return;
        }

        const currentStage = appState.getResistiveShutdownStage();
        if (currentStage === 0) this.audioManager.play('powerOff1', true, 0.33);
        else if (currentStage === 1) this.audioManager.play('powerOff2', true, 0.66);
        else if (currentStage === 2) this.audioManager.play('powerOff3', true, 1.00);
        
        if (currentStage < RESISTIVE_SHUTDOWN_PARAMS.MAX_STAGE) {
            appState.setResistiveShutdownStage(currentStage + 1);
        }
    }

    _emitCoalescedInteractionMessage(interactionId, messagePayload) {
        const now = Date.now();
        const lastTime = this.lastInteractionMessageTimes[interactionId] || 0;
        if (now - lastTime > this.MESSAGE_COALESCE_WINDOW_MS) {
            appState.emit('requestTerminalMessage', {
                ...messagePayload,
                coalesce: true,
                coalesceId: interactionId
            });
            this.lastInteractionMessageTimes[interactionId] = now;
        }
    }
}

const actionHandlerInstance = new ActionHandler();
export default actionHandlerInstance;