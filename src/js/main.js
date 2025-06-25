/**
 * @module main
 * @description Entry point for the HUE 9000 application. Orchestrates the preloader
 * and the initialization of all application managers.
 */
import { gsap } from "gsap";
import { Draggable } from "gsap/Draggable";
import { InertiaPlugin } from "gsap/InertiaPlugin";
import { TextPlugin } from "gsap/TextPlugin";

// Core Modules & Services
import * as appState from './appState.js';
import * as config from './config/index.js';
import { serviceLocator } from './serviceLocator.js';
import { desktopPhaseConfigs } from './startupMachine.js';
import { runPreloader } from './preloader.js';
import { debounce } from './utils.js';
import { HUE_ASSIGNMENT_ROW_HUES, TERMINAL_INTERACTION_DEBOUNCE_MS, MOBILE_BREAKPOINT } from './config/index.js';

// Always-on Manager Classes
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
import { AudioManager } from './AudioManager.js';

// Register GSAP and its plugins
gsap.registerPlugin(Draggable, InertiaPlugin, TextPlugin);

// --- DOM Element Collection ---
const domElements = {};

// --- Music Controller Class ---
class MusicController {
    constructor(audioManager, appState, config) {
        this.audioManager = audioManager;
        this.appState = appState;
        this.config = config;
        this.lastResistiveStage = 0;

        this.appState.subscribe('themeChanged', this.handleThemeChange.bind(this));
        this.appState.subscribe('resistiveShutdownStageChanged', this.handleResistiveShutdownStageChange.bind(this));
        
        // Initial music set based on the starting theme
        this.handleThemeChange(this.appState.getCurrentTheme());
    }

    handleThemeChange(newTheme) {
        // Don't change music if we are in resistive shutdown mode
        if (this.appState.getResistiveShutdownStage() > 0) {
            return;
        }

        // console.log(`[MusicController] Theme changed to ${newTheme}. Setting music.`);
        switch(newTheme) {
            case 'light':
                this.audioManager.playMusic('bgLight');
                break;
            case 'dark':
            case 'dim':
            default:
                this.audioManager.playMusic('bgDim');
                break;
        }
    }

    handleResistiveShutdownStageChange({ newStage }) {
        if (newStage > 0 && this.lastResistiveStage === 0) {
            // Transitioning INTO resistive mode
            // console.log('[MusicController] Resistive shutdown started. Setting music.');
            this.audioManager.playMusic('bgResistive');
        } else if (newStage === 0 && this.lastResistiveStage > 0) {
            // Transitioning OUT OF resistive mode (reset)
            // console.log('[MusicController] Resistive shutdown ended. Reverting to theme music.');
            const currentTheme = this.appState.getCurrentTheme();
            this.handleThemeChange(currentTheme);
        }
        this.lastResistiveStage = newStage;
    }
}


function collectDomElements() {
    domElements.root = document.documentElement;
    domElements.body = document.body;
    domElements.appWrapper = document.querySelector('.app-wrapper');
    
    domElements.preloaderRoot = document.getElementById('datastream-preloader');
    domElements.streamFonts = document.getElementById('stream-fonts');
    domElements.streamGraphics = document.getElementById('stream-graphics');
    domElements.streamAudio = document.getElementById('stream-audio');
    domElements.overallProgressPercentage = document.getElementById('overall-progress-percentage');
    domElements.overallProgressBar = document.getElementById('overall-progress-bar');
    domElements.engageButtonContainer = document.getElementById('engage-button-container');
    domElements.preloaderEngageBtn = document.getElementById('preloader-engage-btn');
    domElements.criticalErrorMessageElement = document.getElementById('critical-error-message');

    domElements.controlDeck = document.getElementById('control-deck');
    domElements.deckToggle = document.getElementById('deck-toggle');
    domElements.allButtons = Array.from(document.querySelectorAll('.button-unit'));
    domElements.dialA = document.getElementById('dial-canvas-container-A');
    domElements.dialB = document.getElementById('dial-canvas-container-B');
    domElements.lcdA = document.getElementById('hue-lcd-A');
    domElements.lcdB = document.getElementById('hue-lcd-B');
    domElements.terminalContainer = document.querySelector('.terminal-block .actual-lcd-screen-element');
    domElements.terminalLcdContentElement = document.getElementById('terminal-lcd-content');
    domElements.colorLensGradient = document.getElementById('color-lens-gradient');
    domElements.lensSuperGlow = document.getElementById('lens-super-glow');
    domElements.logoContainer = document.getElementById('logo-container');
    domElements.hueAssignmentColumns = Array.from(document.querySelectorAll('.hue-assignment-column[data-assignment-target]'));
}

function createGridButtons(buttonManager) {
    domElements.hueAssignmentColumns.forEach(columnEl => {
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

function setupEventListeners() {
    const audioManager = serviceLocator.get('audioManager');

    const debouncedSendMoodMessage = debounce((hue) => {
        appState.emit('requestTerminalMessage', {
            type: 'interaction',
            source: 'mood_change',
            coalesce: true,
            coalesceId: 'mood_change',
            data: { hue }
        });
    }, TERMINAL_INTERACTION_DEBOUNCE_MS);

    const debouncedSendIntensityMessage = debounce((power) => {
        appState.emit('requestTerminalMessage', {
            type: 'interaction',
            source: 'intensity_change',
            coalesce: true,
            coalesceId: 'intensity_change',
            data: { power }
        });
    }, TERMINAL_INTERACTION_DEBOUNCE_MS);

    // Listen for Dial A (Mood) updates
    appState.subscribe('dialUpdated', ({ id, state }) => {
        // GUARD: Only send terminal messages for interactions when the app is fully interactive.
        if (appState.getAppStatus() !== 'interactive') return;
        // GUARD: Terminal does not exist on mobile.
        if (!serviceLocator.get('terminalManager', true)) return; // Use safe get

        if (id === 'A' && !state.isDragging) {
            debouncedSendMoodMessage(state.hue);
        }
    });

    // Listen for Dial B (Intensity) interaction state changes
    appState.subscribe('dialBInteractionChange', (interactionState) => {
        // GUARD: Only send terminal messages for interactions when the app is fully interactive.
        if (appState.getAppStatus() !== 'interactive') return;
        // GUARD: Terminal does not exist on mobile.
        if (!serviceLocator.get('terminalManager', true)) return; // Use safe get

        if (interactionState === 'idle') {
            const powerPercent = appState.getTrueLensPower() * 100;
            debouncedSendIntensityMessage(powerPercent);
        }
    });

    appState.subscribe('buttonInteracted', ({ button }) => {
        // This event only fires on desktop because ButtonManager is desktop-only.
        const resistiveShutdownController = serviceLocator.get('resistiveShutdownController', true);
        if (!resistiveShutdownController) return;

        const groupId = button.getGroupId();
        const value = button.getValue();
        const ariaLabel = button.getElement().getAttribute('aria-label');

        if (groupId === 'system-power') {
            if (value === 'off') resistiveShutdownController.handlePowerOffClick();
            else if (value === 'on' && appState.getResistiveShutdownStage() > 0) appState.setResistiveShutdownStage(0);
        } 
        else if (groupId === 'light') {
            let stateTextForTerminal = 'OFF';
            if (button.isSelected()) {
                if (ariaLabel.includes('Low')) {
                    appState.setTheme('dark');
                    const soundId = audioManager.play('auxModeLow', true);
                    if (soundId !== null) {
                        setTimeout(() => audioManager.fadeOut('auxModeLow', 1.5, soundId), 1000);
                    }
                    stateTextForTerminal = 'LOW';
                } else if (ariaLabel.includes('High')) {
                    appState.setTheme('light');
                    audioManager.play('auxModeHigh', true);
                    stateTextForTerminal = 'HIGH';
                }
            } else {
                const group = serviceLocator.get('buttonManager')._buttonGroups.get('light');
                const anySelected = group ? Array.from(group).some(btn => btn.isSelected()) : false;
                if (!anySelected) appState.setTheme('dim');
                audioManager.play('buttonPress', true);
            }
            
            appState.emit('requestTerminalMessage', {
                type: 'interaction', source: 'aux_light', coalesce: true, coalesceId: 'aux_light', data: { state: stateTextForTerminal }
            });
        } 
        else if (['env', 'lcd', 'logo', 'btn'].includes(groupId)) {
            audioManager.play('buttonPress', true);
            const hue = HUE_ASSIGNMENT_ROW_HUES[parseInt(value, 10)];
            appState.setTargetColorProperties(groupId, hue);
            appState.emit('requestTerminalMessage', {
                type: 'interaction', source: 'hue_assign', coalesce: true, coalesceId: `hue_assign_${groupId}`, data: { target: groupId.toUpperCase(), hue: hue }
            });
        } 
        else if (button.config.type === 'action') {
            audioManager.play('buttonPress', true);
            if (ariaLabel === 'Scan Button 1') appState.emit('requestTerminalMessage', { type: 'block', messageKey: 'BTN1_MESSAGE', interrupt: true });
            else if (ariaLabel === 'Scan Button 2') appState.emit('requestTerminalMessage', { type: 'block', messageKey: 'BTN2_MESSAGE', interrupt: true });
            else if (ariaLabel === 'Scan Button 3') appState.emit('requestTerminalMessage', { type: 'block', messageKey: 'BTN3_MESSAGE', interrupt: true });
            else if (ariaLabel === 'Scan Button 4') appState.emit('requestTerminalMessage', { type: 'block', messageKey: 'BTN4_MESSAGE', interrupt: true });
        }
    });

    document.body.addEventListener('click', (event) => {
        const buttonElement = event.target.closest('.button-unit:not(#preloader-engage-btn)'); 
        const buttonManager = serviceLocator.get('buttonManager', true); // Use safe get
        if (buttonElement && buttonManager) {
             buttonManager.handleInteraction(buttonElement);
        }
    });
}

async function initializeApp() {
    if (window.HUE9000_INITIALIZED) return;
    window.HUE9000_INITIALIZED = true;

    // --- Determine Viewport ---
    const isMobile = window.matchMedia(MOBILE_BREAKPOINT).matches;
    document.body.classList.toggle('is-mobile-viewport', isMobile);
    console.log(`[Main INIT] Viewport detected as: ${isMobile ? 'Mobile' : 'Desktop'}`);

    // --- Always-on Managers (Core visual/audio components) ---
    const audioManager = serviceLocator.get('audioManager');
    const themeManager = new ThemeManager();
    const lcdUpdater = new LcdUpdater();
    const dynamicStyleManager = new DynamicStyleManager();
    const dialManager = new DialManager();
    const lensManager = new LensManager();
    const ambientAnimationManager = new AmbientAnimationManager();
    const phaseRunner = new PhaseRunner();
    const startupSequenceManager = new StartupSequenceManager();
    const moodMatrixManager = new MoodMatrixManager();
    const intensityDisplayManager = new IntensityDisplayManager();
    
    // Register always-on services
    serviceLocator.register('themeManager', themeManager);
    serviceLocator.register('lcdUpdater', lcdUpdater);
    serviceLocator.register('dynamicStyleManager', dynamicStyleManager);
    serviceLocator.register('dialManager', dialManager);
    serviceLocator.register('lensManager', lensManager);
    serviceLocator.register('ambientAnimationManager', ambientAnimationManager);
    serviceLocator.register('phaseRunner', phaseRunner);
    serviceLocator.register('startupSequenceManager', startupSequenceManager);
    serviceLocator.register('moodMatrixManager', moodMatrixManager);
    serviceLocator.register('intensityDisplayManager', intensityDisplayManager);

    // --- Conditional Desktop-Only Managers ---
    if (!isMobile) {
        console.log('[Main INIT] Initializing Desktop-only managers...');
        // Use dynamic import() for code splitting and performance.
        const { default: terminalManagerInstance } = await import('./terminalManager.js');
        const { SidePanelManager } = await import('./sidePanelManager.js');
        const { ButtonManager } = await import('./buttonManager.js');
        const { default: resistiveShutdownControllerInstance } = await import('./resistiveShutdownController.js');

        const sidePanelManager = new SidePanelManager();
        const buttonManager = new ButtonManager();
        
        serviceLocator.register('terminalManager', terminalManagerInstance);
        serviceLocator.register('sidePanelManager', sidePanelManager);
        serviceLocator.register('buttonManager', buttonManager);
        serviceLocator.register('resistiveShutdownController', resistiveShutdownControllerInstance);

        // Initialize them after registering
        terminalManagerInstance.init();
        sidePanelManager.init();
        buttonManager.init();
        resistiveShutdownControllerInstance.init();
        
        // Create and discover buttons only on desktop
        createGridButtons(buttonManager);
        buttonManager.discoverButtons(domElements.allButtons);
    }

    // --- Initialize remaining managers and setup ---
    appState.setAppStatus('loading'); 
    audioManager.postInitSubscribe();
    startupSequenceManager.init();
    phaseRunner.init();
    [ themeManager, lcdUpdater, dynamicStyleManager, dialManager, lensManager, ambientAnimationManager, moodMatrixManager, intensityDisplayManager ].forEach(manager => {
        if (typeof manager.init === 'function') manager.init();
    });

    setupEventListeners();
    new MusicController(audioManager, appState, config);

    startupSequenceManager.start(true); 
    console.log('[Main INIT] HUE 9000 Initialization Complete.');
}

function setupResizeListener() {
    let wasMobile = window.matchMedia(MOBILE_BREAKPOINT).matches;
    
    const handleResize = debounce(() => {
        const isNowMobile = window.matchMedia(MOBILE_BREAKPOINT).matches;
        if (isNowMobile !== wasMobile) {
            console.log(`[Resize Handler] Viewport changed across breakpoint. Reloading...`);
            document.body.classList.add('is-reloading');
            setTimeout(() => {
                location.reload();
            }, 300); // Wait for fade-out
        }
    }, 250);

    window.addEventListener('resize', handleResize);
}

document.addEventListener('DOMContentLoaded', () => {
    collectDomElements();
    setupResizeListener();

    serviceLocator.register('gsap', gsap);
    serviceLocator.register('config', { ...config, desktopPhaseConfigs });
    
    // Modify serviceLocator.get to allow for safe checks
    const originalGet = serviceLocator.get.bind(serviceLocator);
    serviceLocator.get = (name, safe = false) => {
        try {
            return originalGet(name);
        } catch (e) {
            if (safe) return null;
            throw e;
        }
    };
    
    let domElementsService;
    try {
        domElementsService = serviceLocator.get('domElements');
    } catch (e) {
        // Service not found, so register it
    }
    if (!domElementsService) {
        serviceLocator.register('domElements', domElements);
    }

    const audioManager = new AudioManager();
    serviceLocator.register('audioManager', audioManager);
    audioManager.init(); 

    const preloaderDomForRun = {
        body: domElements.body,
        preloaderRoot: domElements.preloaderRoot,
        streamFonts: domElements.streamFonts,
        streamGraphics: domElements.streamGraphics,
        streamAudio: domElements.streamAudio,
        overallProgressPercentage: domElements.overallProgressPercentage,
        overallProgressBar: domElements.overallProgressBar,
        engageButton: domElements.preloaderEngageBtn, 
        engageButtonContainer: domElements.engageButtonContainer,
        criticalErrorMessageElement: domElements.criticalErrorMessageElement
    };

    runPreloader(preloaderDomForRun, gsap).then(initializeApp).catch(err => {
        console.error("Initialization failed after preloader:", err);
    });
});