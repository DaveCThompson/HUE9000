/**
 * @module AppInitializer
 * @description Centralized class for bootstrapping the entire HUE 9000 application.
 * This module is the single source of truth for application startup, responsible for
 * service registration, manager instantiation, and handling different startup paths.
 */
import { gsap } from "gsap";

// Core Modules & Services
import { appState } from './state/index.js';
import * as config from './config/index.js';
import { serviceLocator } from './serviceLocator.js';
import { desktopPhaseConfigs } from './startupMachine.js';
import { MOBILE_BREAKPOINT } from './config/index.js';
import actionHandlerInstance from './state/actionHandler.js';


// Manager Classes
import { DOMManager } from './DOMManager.js';
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
import { AudioManager } from './AudioManager.js';

export class AppInitializer {
    constructor() {
        this.domManager = null;
        this.audioManager = null;
    }

    async run(isSkippingStartup) {
        if (window.HUE9000_INITIALIZED) return;
        window.HUE9000_INITIALIZED = true;

        this._registerCoreServices();
        this.domManager = new DOMManager();
        this.domManager.init();
        this.audioManager = serviceLocator.get('audioManager');

        const isMobile = window.matchMedia(MOBILE_BREAKPOINT).matches;
        document.body.classList.toggle('is-mobile-viewport', isMobile);
        console.log(`[AppInitializer] Viewport detected as: ${isMobile ? 'Mobile' : 'Desktop'}`);

        await this._instantiateManagers(isMobile);
        this._initializeManagers();
        this._setupGlobalEventListeners();

        if (isSkippingStartup) {
            console.warn('%c[DEV] Bypassing startup sequence and jumping to interactive state.', 'color: #ff8c00; font-weight: bold;');
            const startupManager = serviceLocator.get('startupSequenceManager');
            startupManager.jumpToState('COMPLETE', { isMobile });
        } else {
            const startupManager = serviceLocator.get('startupSequenceManager');
            startupManager.start(false);
        }

        console.log('[AppInitializer] HUE 9000 Initialization Complete.');
    }

    _registerCoreServices() {
        serviceLocator.register('gsap', gsap);
        serviceLocator.register('config', { ...config, desktopPhaseConfigs });
        serviceLocator.register('hapticFeedbackManager', hapticFeedbackManager);
        serviceLocator.register('actionHandler', actionHandlerInstance);
    }

    async _instantiateManagers(isMobile) {
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

        if (isMobile) {
            await this._instantiateMobileManagers();
        } else {
            await this._instantiateDesktopManagers();
        }      
        
        const musicController = new MusicController(serviceLocator.get('audioManager'));
        serviceLocator.register('musicController', musicController);
    }

    async _instantiateMobileManagers() {
        const { default: terminalManagerInstance } = await import('./terminalManager.js');
        const { SidePanelManager } = await import('./sidePanelManager.js');
        const { MobileTerminalManager } = await import('./MobileTerminalManager.js');
        serviceLocator.register('terminalManager', terminalManagerInstance);
        serviceLocator.register('sidePanelManager', new SidePanelManager());
        serviceLocator.register('mobileTerminalManager', new MobileTerminalManager());
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
        const managers = [
            'startupSequenceManager', 'phaseRunner', 'themeManager', 'lcdUpdater',
            'dynamicStyleManager', 'dialManager', 'lensManager', 'ambientAnimationManager',
            'moodMatrixManager', 'intensityDisplayManager', 'disruptionManager',
            'terminalManager', 'sidePanelManager', 'buttonManager',
            'resistiveShutdownController', 'mobileTerminalManager'
        ];
        managers.forEach(name => {
            const manager = serviceLocator.get(name, true);
            if (manager && typeof manager.init === 'function') manager.init();
        });

        this.audioManager.postInitSubscribe();
        
        const buttonManager = serviceLocator.get('buttonManager', true);
        if (buttonManager) {
            this._createGridButtons(buttonManager, this.domManager);
            buttonManager.discoverButtons(this.domManager.allButtons);
        }

        const actionHandler = serviceLocator.get('actionHandler');
        actionHandler.init();
        
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

    _setupGlobalEventListeners() {
        appState.subscribe('audioMuteChanged', ({ isMuted }) => {
            this.audioManager.toggleMute(isMuted);
            const desktopMuteBtn = document.getElementById('audio-mute-toggle');
            if (desktopMuteBtn) desktopMuteBtn.querySelector('.material-symbols-outlined').textContent = isMuted ? 'volume_off' : 'volume_up';
            const mobileMuteBtn = document.getElementById('mobile-audio-btn');
            if (mobileMuteBtn) mobileMuteBtn.querySelector('.material-symbols-outlined').textContent = isMuted ? 'volume_off' : 'volume_up';
        });
    }
}