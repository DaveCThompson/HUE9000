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
import { debounce } from './utils.js';
import { HUE_ASSIGNMENT_ROW_HUES, TERMINAL_INTERACTION_DEBOUNCE_MS, MOBILE_BREAKPOINT, LENS_STARTUP_TARGET_POWER, DEFAULT_ASSIGNMENT_SELECTIONS } from './config/index.js';
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
import { createMobileInteraction } from "./mobileInteraction.js";
import { ScanOrchestrator } from "./ScanOrchestrator.js";

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

        // --- 4. Initialize All Managers ---
        this._initializeManagers();

        // --- 5. Setup Event Listeners ---
        this._setupGlobalEventListeners();
        if (isMobile) {
            this._setupMobileEventListeners();
        }

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

    _setupGlobalEventListeners() {
        const debouncedSendMoodMessage = debounce((hue) => {
            appState.emit('requestTerminalMessage', { type: 'interaction', source: 'mood_change', coalesce: true, coalesceId: 'mood_change', data: { hue } });
        }, TERMINAL_INTERACTION_DEBOUNCE_MS);

        const debouncedSendIntensityMessage = debounce((power) => {
            appState.emit('requestTerminalMessage', { type: 'interaction', source: 'intensity_change', coalesce: true, coalesceId: 'intensity_change', data: { power } });
        }, TERMINAL_INTERACTION_DEBOUNCE_MS);

        appState.subscribe('audioMuteChanged', ({ isMuted }) => {
            this.audioManager.toggleMute(isMuted);
            const desktopMuteBtn = document.getElementById('audio-mute-toggle');
            if (desktopMuteBtn) desktopMuteBtn.querySelector('.material-symbols-outlined').textContent = isMuted ? 'volume_off' : 'volume_up';
            const mobileMuteBtn = document.getElementById('mobile-audio-btn');
            if (mobileMuteBtn) mobileMuteBtn.querySelector('.material-symbols-outlined').textContent = isMuted ? 'volume_off' : 'volume_up';
        });

        appState.subscribe('dialUpdated', ({ id, state }) => {
            if (appState.getAppStatus() !== 'interactive' || appState.getResistiveShutdownStage() > 0 || !serviceLocator.get('terminalManager', true)) return;
            if (id === 'A' && !state.isDragging) debouncedSendMoodMessage(state.hue);
        });

        appState.subscribe('dialBInteractionChange', (interactionState) => {
            if (appState.getAppStatus() !== 'interactive' || appState.getResistiveShutdownStage() > 0 || !serviceLocator.get('terminalManager', true)) return;
            if (interactionState === 'idle') debouncedSendIntensityMessage(appState.getTrueLensPower() * 100);
        });

        appState.subscribe('buttonInteracted', ({ button }) => {
            const resistiveShutdownController = serviceLocator.get('resistiveShutdownController', true);
            if (!resistiveShutdownController) return;

            const groupId = button.getGroupId();
            const value = button.getValue();
            const ariaLabel = button.getElement().getAttribute('aria-label');

            if (groupId === 'system-power') {
                if (value === 'off') resistiveShutdownController.handlePowerOffClick();
                else if (value === 'on' && appState.getResistiveShutdownStage() > 0) appState.setResistiveShutdownStage(0);
            } else if (groupId === 'light') {
                let stateTextForTerminal = 'OFF';
                if (button.isSelected()) {
                    if (ariaLabel.includes('Low')) {
                        appState.setTheme('dark');
                        const soundId = this.audioManager.play('auxModeLow', true);
                        if (soundId !== null) setTimeout(() => this.audioManager.fadeOut('auxModeLow', 1.5, soundId), 1000);
                        stateTextForTerminal = 'LOW';
                    } else if (ariaLabel.includes('High')) {
                        appState.setTheme('light');
                        this.audioManager.play('auxModeHigh', true);
                        stateTextForTerminal = 'HIGH';
                    }
                } else {
                    appState.setTheme('dim');
                    this.audioManager.play('buttonPress', true);
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

        document.body.addEventListener('click', (event) => {
            const buttonElement = event.target.closest('.button-unit:not(#preloader-engage-btn)');
            const buttonManager = serviceLocator.get('buttonManager', true);
            if (buttonElement && buttonManager) {
                buttonManager.handleInteraction(buttonElement);
            }
        });
    }

    _setupMobileEventListeners() {
        const startupManager = serviceLocator.get('startupSequenceManager');
        const sidePanelManager = serviceLocator.get('sidePanelManager');

        createMobileInteraction(document.getElementById('mobile-reset-btn'), { onClick: () => startupManager.resetSequence() });
        createMobileInteraction(document.getElementById('mobile-audio-btn'), { onClick: () => appState.setIsAudioMuted(!appState.getIsAudioMuted()), hapticType: 'toggleOn' });
        createMobileInteraction(document.getElementById('mobile-info-btn'), { onClick: () => sidePanelManager.toggle(), hapticType: 'toggleOn' });

        const mobileLightBtn = document.getElementById('mobile-light-btn');
        if (mobileLightBtn) {
            const updateLightButtonIcon = (theme) => {
                const icon = mobileLightBtn.querySelector('.material-symbols-outlined');
                if (!icon) return;
                const settings = { 'dim': 'lightbulb_circle', 'dark': 'lightbulb', 'light': 'lightbulb' };
                const fill = { 'dim': 0, 'dark': 0, 'light': 1 };
                icon.textContent = settings[theme];
                icon.style.fontVariationSettings = `'FILL' ${fill[theme]}`;
            };
            createMobileInteraction(mobileLightBtn, {
                onClick: () => {
                    const currentTheme = appState.getCurrentTheme();
                    if (currentTheme === 'light') {
                        appState.setTheme('dark');
                        const soundId = this.audioManager.play('auxModeLow', true);
                        if (soundId !== null) setTimeout(() => this.audioManager.fadeOut('auxModeLow', 1.5, soundId), 1000);
                    } else {
                        appState.setTheme('light');
                        this.audioManager.play('auxModeHigh', true);
                    }
                },
                hapticType: 'toggleOn'
            });
            appState.subscribe('themeChanged', updateLightButtonIcon);
            updateLightButtonIcon(appState.getCurrentTheme());
        }

        const hapticsToggle = document.getElementById('haptics-toggle');
        if (hapticsToggle) {
            hapticsToggle.addEventListener('change', (event) => appState.setIsHapticsEnabled(event.target.checked));
            hapticsToggle.checked = appState.getIsHapticsEnabled();
        }

        new MobileColorSlider().init();
    }

    _setToInteractiveState() {
        const dom = serviceLocator.get('domElements');
        const gsap = serviceLocator.get('gsap');
        const lcdUpdater = serviceLocator.get('lcdUpdater');
        const buttonManager = serviceLocator.get('buttonManager', true);
        const lensManager = serviceLocator.get('lensManager');
        const dialManager = serviceLocator.get('dialManager');
        const isMobile = window.matchMedia(MOBILE_BREAKPOINT).matches;

        dom.body.classList.remove('pre-boot', 'is-starting-up', 'post-preload-hiding', 'is-transitioning-from-dim');
        document.querySelectorAll('.animate-on-dim-exit').forEach(el => el.classList.remove('animate-on-dim-exit'));
        gsap.set(dom.body, { opacity: 1 });
        dom.root.style.setProperty('--startup-L-reduction-factor', '0');
        dom.root.style.setProperty('--startup-opacity-factor', '1');
        dom.root.style.setProperty('--startup-opacity-factor-boosted', '1');

        appState.resetAppStateToDefaults();
        appState.setTheme('dark');
        appState.setTrueLensPower(LENS_STARTUP_TARGET_POWER);

        lensManager.directUpdateLensVisuals(LENS_STARTUP_TARGET_POWER / 100);
        dialManager.resizeAllCanvases(true);

        [dom.terminalContainer, dom.lcdA, dom.lcdB].forEach(lcd => {
            if (lcd) lcdUpdater.setLcdState(lcd, 'active');
        });

        if (buttonManager && !isMobile) {
            buttonManager.getAllButtonInstances().forEach(btn => btn.setState(ButtonStates.ENERGIZED_UNSELECTED, { forceState: true }));
            buttonManager.setGroupSelected('system-power', 'on');
            buttonManager.setGroupSelected('light', 'off');
            Object.keys(DEFAULT_ASSIGNMENT_SELECTIONS).forEach(targetKey => {
                buttonManager.setGroupSelected(targetKey, DEFAULT_ASSIGNMENT_SELECTIONS[targetKey].toString());
            });
        }

        if (isMobile) {
            const colorlessHue = HUE_ASSIGNMENT_ROW_HUES[0];
            appState.setTargetColorProperties('env', colorlessHue);
            appState.setTargetColorProperties('logo', colorlessHue);
            appState.setTargetColorProperties('lcd', colorlessHue);
            appState.setTargetColorProperties('btn', colorlessHue);
        }

        appState.emit('requestTerminalMessage', { type: 'startup', source: 'DEV_SKIP', messageKey: 'P12_SYSTEM_OPERATIONAL' });
        
        // FIX: Defer setting the final app status to the next tick. This ensures all synchronous
        // state and class changes above have been processed by the browser before managers
        // (like AmbientAnimationManager) react to the 'interactive' state.
        gsap.delayedCall(0, () => {
            appState.setAppStatus('interactive');
        });
    }
}