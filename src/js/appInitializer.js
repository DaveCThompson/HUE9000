/**
 * @module AppInitializer
 * @description Centralized class for bootstrapping the entire HUE 9000 application.
 * This module is the single source of truth for application startup, responsible for
 * service registration, manager instantiation, and handling different startup paths.
 */
import { gsap } from "gsap";

// Core Modules & Services
import * as appState from './appState.js';
import * as config from './config/index.js';
import { serviceLocator } from './serviceLocator.js';
import { desktopPhaseConfigs } from './startupMachine.js';
import { HUE_ASSIGNMENT_ROW_HUES, MOBILE_BREAKPOINT, LENS_STARTUP_TARGET_POWER, DEFAULT_ASSIGNMENT_SELECTIONS } from './config/index.js';
import { ButtonStates } from './buttonManager.js';

// Manager Classes
import { DOMManager } from './DOMManager.js';
// AudioManager is now instantiated in main.js
import { DialManager } from './dialManager.js';
import { LensManager } from './lensManager.js';
import { ThemeManager } from './ThemeManager.js';
import { LcdUpdater } from './LcdUpdater.js';
import { DynamicStyleManager } from './DynamicStyleManager.js';
import { PhaseRunner } from './PhaseRunner.js';
import AmbientAnimationManager from './AmbientAnimationManager.js';
import { StartupSequenceManager } from './startupSequenceManager.js';
import { MoodMatrixManager } from './MoodMatrixManager.js';
import { IntensityDisplayManager } from './IntensityDisplayManager.js';
import { MusicController } from './MusicController.js';
import disruptionManagerInstance from './DisruptionManager.js';
import { MobileColorSlider } from "./MobileColorSlider.js";
import { hapticFeedbackManager } from "./hapticFeedbackManager.js";
import { ScanOrchestrator } from "./ScanOrchestrator.js";
import { EventBinder } from './EventBinder.js';

export class AppInitializer {
    constructor() {
        this.domManager = null;
        this.audioManager = null;
    }

    async run(isSkippingStartup) {
        if (window.HUE9000_INITIALIZED) return;
        window.HUE9000_INITIALIZED = true;

        // --- 1. Core Service & Manager Registration ---
        this._registerCoreServices();
        this.domManager = new DOMManager();
        this.domManager.init(); // Registers 'domElements'
        // Retrieve the pre-registered AudioManager
        this.audioManager = serviceLocator.get('audioManager');

        // --- 2. Viewport Detection ---
        const isMobile = window.matchMedia(MOBILE_BREAKPOINT).matches;
        document.body.classList.toggle('is-mobile-viewport', isMobile);
        console.log(`[AppInitializer] Viewport detected as: ${isMobile ? 'Mobile' : 'Desktop'}`);

        // --- 3. Instantiate and Register All Managers ---
        await this._instantiateManagers(isMobile);

        // --- 4. Initialize All Managers (and now EventBinder) ---
        this._initializeManagers();

        // --- 5. Setup Global Event Listeners (App State subscribers) ---
        this._setupGlobalEventListeners();

        // --- 6. Start Application ---
        if (isSkippingStartup) {
            console.warn('%c[DEV] Bypassing startup sequence and jumping to interactive state.', 'color: #ff8c00; font-weight: bold;');
            this._setToInteractiveState();
        } else {
            const startupManager = serviceLocator.get('startupSequenceManager');
            startupManager.start(false); // Auto-play the sequence
        }

        console.log('[AppInitializer] HUE 9000 Initialization Complete.');
    }

    _registerCoreServices() {
        serviceLocator.register('gsap', gsap);
        serviceLocator.register('config', { ...config, desktopPhaseConfigs });
        serviceLocator.register('hapticFeedbackManager', hapticFeedbackManager);
    }

    async _instantiateManagers(isMobile) {
        // Always-on managers
        serviceLocator.register('themeManager', new ThemeManager());
        serviceLocator.register('lcdUpdater', new LcdUpdater());
        serviceLocator.register('dynamicStyleManager', new DynamicStyleManager());
        serviceLocator.register('dialManager', new DialManager());
        serviceLocator.register('lensManager', new LensManager());
        serviceLocator.register('ambientAnimationManager', new AmbientAnimationManager());
        serviceLocator.register('phaseRunner', new PhaseRunner());
        serviceLocator.register('startupSequenceManager', new StartupSequenceManager());
        serviceLocator.register('disruptionManager', disruptionManagerInstance);
        serviceLocator.register('moodMatrixManager', new MoodMatrixManager());
        serviceLocator.register('intensityDisplayManager', new IntensityDisplayManager());
        serviceLocator.register('scanOrchestrator', new ScanOrchestrator());
        serviceLocator.register('eventBinder', new EventBinder());

        // Conditional managers
        if (isMobile) {
            await this._instantiateMobileManagers();
        } else {
            await this._instantiateDesktopManagers();
        }
        
        // Music controller depends on audioManager being registered
        const musicController = new MusicController(this.audioManager, appState, config);
        serviceLocator.register('musicController', musicController);
    }

    async _instantiateMobileManagers() {
        const { default: terminalManagerInstance } = await import('./terminalManager.js');
        const { SidePanelManager } = await import('./sidePanelManager.js');
        const { MobileTerminalManager } = await import('./MobileTerminalManager.js');

        serviceLocator.register('terminalManager', terminalManagerInstance);
        serviceLocator.register('sidePanelManager', new SidePanelManager());
        serviceLocator.register('mobileTerminalManager', new MobileTerminalManager());

        // Mobile-specific initializations can go here
        new MobileColorSlider().init();
    }

    async _instantiateDesktopManagers() {
        const { default: terminalManagerInstance } = await import('./terminalManager.js');
        const { SidePanelManager } = await import('./sidePanelManager.js');
        const { ButtonManager } = await import('./buttonManager.js');
        const { default: resistiveShutdownControllerInstance } = await import('./resistiveShutdownController.js');

        serviceLocator.register('terminalManager', terminalManagerInstance);
        serviceLocator.register('sidePanelManager', new SidePanelManager());
        serviceLocator.register('buttonManager', new ButtonManager());
        serviceLocator.register('resistiveShutdownController', resistiveShutdownControllerInstance);
    }

    _initializeManagers() {
        // Initialize all registered managers that have an `init` method
        const managers = [
            'startupSequenceManager', 'phaseRunner', 'themeManager', 'lcdUpdater',
            'dynamicStyleManager', 'dialManager', 'lensManager', 'ambientAnimationManager',
            'moodMatrixManager', 'intensityDisplayManager', 'disruptionManager',
            'terminalManager', 'sidePanelManager', 'buttonManager',
            'resistiveShutdownController', 'mobileTerminalManager'
        ];

        managers.forEach(name => {
            const manager = serviceLocator.get(name, true);
            if (manager && typeof manager.init === 'function') {
                manager.init();
            }
        });

        // Some managers have post-init steps
        this.audioManager.postInitSubscribe();
        
        const buttonManager = serviceLocator.get('buttonManager', true);
        if (buttonManager) {
            this._createGridButtons(buttonManager, this.domManager);
            buttonManager.discoverButtons(this.domManager.allButtons);
        }

        // The EventBinder must be initialized AFTER all other managers
        // that it depends on have been initialized.
        const eventBinder = serviceLocator.get('eventBinder');
        eventBinder.init();
    }

    _createGridButtons(buttonManager, domManager) {
        domManager.hueAssignmentColumns.forEach(columnEl => {
            const groupId = columnEl.dataset.assignmentTarget;
            const labelEl = columnEl.querySelector('.control-group-label.label-top');
            columnEl.innerHTML = '';
            if (labelEl) columnEl.appendChild(labelEl);

            for (let i = 0; i < 12; i++) {
                const button = document.createElement('div');
                button.className = 'button-unit button-unit--toggle button-unit--s';
                button.dataset.toggleValue = i.toString();
                button.setAttribute('role', 'radio');
                button.setAttribute('aria-label', `Assign ${groupId.toUpperCase()} to Hue from Row ${i + 1}`);
                button.innerHTML = `<div class="light-container" aria-hidden="true"><div class="light"></div></div><div class="button-bg-frame"></div>`;
                columnEl.appendChild(button);
                buttonManager.addButton(button, groupId);
            }
        });
    }

    /**
     * Sets up global appState subscribers that orchestrate interactions between managers.
     * This method is for app-level logic, not direct DOM event binding.
     */
    _setupGlobalEventListeners() {
        appState.subscribe('audioMuteChanged', ({ isMuted }) => {
            this.audioManager.toggleMute(isMuted);
            const desktopMuteBtn = document.getElementById('audio-mute-toggle');
            if (desktopMuteBtn) desktopMuteBtn.querySelector('.material-symbols-outlined').textContent = isMuted ? 'volume_off' : 'volume_up';
            const mobileMuteBtn = document.getElementById('mobile-audio-btn');
            if (mobileMuteBtn) mobileMuteBtn.querySelector('.material-symbols-outlined').textContent = isMuted ? 'volume_off' : 'volume_up';
        });

        // NEW: Handler for the specific mobile light toggle action.
        appState.subscribe('mobileLightToggleRequested', () => {
            const currentTheme = appState.getCurrentTheme();
            // This toggle should only ever switch between 'light' and 'dark'.
            const nextTheme = (currentTheme === 'light') ? 'dark' : 'light';
            const stateText = (nextTheme === 'light') ? 'HIGH' : 'LOW';
            const soundToPlay = (nextTheme === 'light') ? 'auxModeHigh' : 'auxModeLow';

            // --- ADDED: Icon toggle logic ---
            const mobileLightBtn = document.getElementById('mobile-light-btn');
            if (mobileLightBtn) {
                const icon = mobileLightBtn.querySelector('.material-symbols-outlined');
                if (icon) {
                    // Use font-variation-settings to toggle the fill state. 'FILL' 1 is filled, 0 is outline.
                    icon.style.fontVariationSettings = (nextTheme === 'light') ? "'FILL' 1" : "'FILL' 0";
                }
            }
            // --- END: Icon toggle logic ---

            appState.setTheme(nextTheme);
            const soundId = this.audioManager.play(soundToPlay, true);
            
            if (soundToPlay === 'auxModeLow' && soundId !== null) {
                setTimeout(() => this.audioManager.fadeOut('auxModeLow', 1.5, soundId), 1000);
            }

            appState.emit('requestTerminalMessage', {
                type: 'interaction',
                source: 'aux_light',
                coalesce: true,
                coalesceId: 'aux_light',
                data: { state: stateText }
            });
        });

        appState.subscribe('buttonInteracted', ({ button }) => {
            const resistiveShutdownController = serviceLocator.get('resistiveShutdownController', true);
            // This check now handles both null and mobile scenarios gracefully
            if (!resistiveShutdownController && !button) return;

            const groupId = button.getGroupId();
            const value = button.getValue();
            const ariaLabel = button.getElement().getAttribute('aria-label');

            if (groupId === 'system-power') {
                if (resistiveShutdownController) {
                    if (value === 'off') resistiveShutdownController.handlePowerOffClick();
                    else if (value === 'on' && appState.getResistiveShutdownStage() > 0) appState.setResistiveShutdownStage(0);
                }
            } else if (groupId === 'light') {
                // REVERTED & MODIFIED: Desktop logic is now direct setting, not cycling.
                let stateTextForTerminal = 'OFF';
                let soundToPlay = 'buttonPress';
                let soundId = null;

                if (button.isSelected()) {
                    if (ariaLabel.includes('Low')) {
                        appState.setTheme('dark');
                        soundToPlay = 'auxModeLow';
                        stateTextForTerminal = 'LOW';
                    } else if (ariaLabel.includes('High')) {
                        appState.setTheme('light');
                        soundToPlay = 'auxModeHigh';
                        stateTextForTerminal = 'HIGH';
                    }
                } else {
                    // This block executes if a button was just turned off, meaning both are now off.
                    appState.setTheme('dim');
                }
                
                soundId = this.audioManager.play(soundToPlay, true);
                if (soundToPlay === 'auxModeLow' && soundId !== null) {
                    setTimeout(() => this.audioManager.fadeOut('auxModeLow', 1.5, soundId), 1000);
                }

                appState.emit('requestTerminalMessage', { type: 'interaction', source: 'aux_light', coalesce: true, coalesceId: 'aux_light', data: { state: stateTextForTerminal } });
            } else if (['env', 'lcd', 'logo', 'btn'].includes(groupId)) {
                this.audioManager.play('buttonPress', true);
                const hue = HUE_ASSIGNMENT_ROW_HUES[parseInt(value, 10)];
                appState.setTargetColorProperties(groupId, hue);
                if (appState.getResistiveShutdownStage() > 0) return;
                appState.emit('requestTerminalMessage', { type: 'interaction', source: 'hue_assign', coalesce: true, coalesceId: `hue_assign_${groupId}`, data: { target: groupId.toUpperCase(), hue: hue } });
            } else if (button.config.type === 'action') {
                this.audioManager.play('buttonPress', true);
                const actionMap = { 'Scan A': 'BTN1_SCAN', 'Scan B': 'BTN2_SCAN', 'Eval X': 'BTN3_SCAN', 'Eval Y': 'BTN4_SCAN' };
                if (actionMap[ariaLabel]) {
                    appState.emit('requestTerminalMessage', { type: 'scan', messageKey: actionMap[ariaLabel], interrupt: true });
                }
            }
        });
    }

    _setToInteractiveState() {
        // REFACTORED: The `jumpToState` method instantly applies the final state of all startup
        // phases by synchronously executing the `applyFinalState` functions from the sequence
        // configuration. This bypasses all animations for rapid development.
        const startupManager = serviceLocator.get('startupSequenceManager');
        const isMobile = window.matchMedia(MOBILE_BREAKPOINT).matches;
        startupManager.jumpToState('COMPLETE', { isMobile });
    }
}