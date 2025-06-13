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
import * as config from './config.js';
import { serviceLocator } from './serviceLocator.js';
import { phaseConfigs } from './startupMachine.js';
import { runPreloader } from './preloader.js';

// Manager Classes
import { ButtonManager } from './buttonManager.js';
import { DialManager } from './dialManager.js';
import { LensManager } from './lensManager.js';
import { ThemeManager } from './ThemeManager.js';
import { LcdUpdater } from './LcdUpdater.js';
import { DynamicStyleManager } from './DynamicStyleManager.js';
import { PhaseRunner } from './PhaseRunner.js';
import AmbientAnimationManager from './AmbientAnimationManager.js';
import resistiveShutdownControllerInstance from './resistiveShutdownController.js';
import terminalManagerInstance from './terminalManager.js';
import { StartupSequenceManager } from './startupSequenceManager.js';
import { MoodMatrixManager } from './MoodMatrixManager.js';
import { IntensityDisplayManager } from './IntensityDisplayManager.js';
import { AudioManager } from './AudioManager.js';
import { SidePanelManager } from './sidePanelManager.js';

// Register GSAP and its plugins
gsap.registerPlugin(Draggable, InertiaPlugin, TextPlugin);

// --- DOM Element Collection ---
const domElements = {};

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

    appState.subscribe('buttonInteracted', ({ button }) => {
        const groupId = button.getGroupId();
        const value = button.getValue();
        const ariaLabel = button.getElement().getAttribute('aria-label');

        if (groupId === 'system-power' && value === 'off') {
            audioManager.play('powerOff', true); 
        } else if (groupId === 'light' && button.isSelected()) {
            audioManager.play('themeEngage', true); 
        } else if (button.config.type === 'action' || ['env', 'lcd', 'logo', 'btn'].includes(groupId)) {
            audioManager.play('buttonPress', true);
        } else if (groupId === 'light' && !button.isSelected()){ // For aux light turning off
             audioManager.play('buttonPress', true); // Or a specific "aux light off" sound if desired
        }
        // Note: 'auxModeChange' was previously tied to buttonEnergize. If a distinct sound for aux light *selection*
        // is still desired separate from generic buttonPress, it needs to be specifically called.
        // The current logic plays 'themeEngage' for aux light ON, and 'buttonPress' for aux light OFF.
        // If 'auxModeChange' is for the *act* of changing the aux light mode (either to low or high if selected),
        // that logic would need to be re-evaluated here or in ButtonManager.
        // For now, ButtonManager handles playing 'auxModeChange' if a button in group 'light' *becomes* selected.

        if (groupId === 'light') {
            appState.setTheme(value === 'on' ? 'light' : 'dark');
        } else if (groupId === 'system-power') {
            if (value === 'off') resistiveShutdownControllerInstance.handlePowerOffClick();
            else if (value === 'on' && appState.getResistiveShutdownStage() > 0) appState.setResistiveShutdownStage(0);
        } else if (['env', 'lcd', 'logo', 'btn'].includes(groupId)) {
            const hue = config.HUE_ASSIGNMENT_ROW_HUES[parseInt(value, 10)];
            appState.setTargetColorProperties(groupId, hue);
        } 
        else if (ariaLabel === 'Scan Button 1') {
            appState.emit('requestTerminalMessage', { type: 'block', messageKey: 'BTN1_MESSAGE' });
        } else if (ariaLabel === 'Scan Button 2') {
            appState.emit('requestTerminalMessage', { type: 'block', messageKey: 'BTN2_MESSAGE' });
        } else if (ariaLabel === 'Scan Button 3') {
            appState.emit('requestTerminalMessage', { type: 'block', messageKey: 'BTN3_MESSAGE' });
        } else if (ariaLabel === 'Scan Button 4') {
            appState.emit('requestTerminalMessage', { type: 'block', messageKey: 'BTN4_MESSAGE' });
        }
    });

    document.body.addEventListener('click', (event) => {
        const buttonElement = event.target.closest('.button-unit:not(#preloader-engage-btn)'); 
        if (buttonElement && serviceLocator.get('buttonManager')) {
             serviceLocator.get('buttonManager').handleInteraction(buttonElement);
        }
    });
}

function initializeApp() {
    if (window.HUE9000_INITIALIZED) return;
    window.HUE9000_INITIALIZED = true;

    console.log('[Main INIT] HUE 9000 Project Decouple Initializing...');
    
    const audioManager = serviceLocator.get('audioManager'); 
    const themeManager = new ThemeManager();
    const lcdUpdater = new LcdUpdater();
    const dynamicStyleManager = new DynamicStyleManager();
    const buttonManager = new ButtonManager();
    const dialManager = new DialManager();
    const lensManager = new LensManager();
    const ambientAnimationManager = new AmbientAnimationManager();
    const phaseRunner = new PhaseRunner();
    const startupSequenceManager = new StartupSequenceManager();
    const moodMatrixManager = new MoodMatrixManager();
    const intensityDisplayManager = new IntensityDisplayManager();
    const sidePanelManager = new SidePanelManager();

    serviceLocator.register('themeManager', themeManager);
    serviceLocator.register('lcdUpdater', lcdUpdater);
    serviceLocator.register('dynamicStyleManager', dynamicStyleManager);
    serviceLocator.register('buttonManager', buttonManager);
    serviceLocator.register('dialManager', dialManager);
    serviceLocator.register('lensManager', lensManager);
    serviceLocator.register('ambientAnimationManager', ambientAnimationManager);
    serviceLocator.register('phaseRunner', phaseRunner);
    serviceLocator.register('startupSequenceManager', startupSequenceManager);
    serviceLocator.register('moodMatrixManager', moodMatrixManager);
    serviceLocator.register('intensityDisplayManager', intensityDisplayManager);
    serviceLocator.register('sidePanelManager', sidePanelManager);
    serviceLocator.register('resistiveShutdownController', resistiveShutdownControllerInstance);
    serviceLocator.register('terminalManager', terminalManagerInstance);

    appState.setAppStatus('loading'); 
    
    audioManager.postInitSubscribe();
    
    startupSequenceManager.init();
    phaseRunner.init(); 
    const otherManagers = [
        themeManager, lcdUpdater, dynamicStyleManager, buttonManager,
        dialManager, lensManager, ambientAnimationManager, moodMatrixManager,
        intensityDisplayManager, sidePanelManager, resistiveShutdownControllerInstance,
        terminalManagerInstance
    ];
    otherManagers.forEach(manager => {
        if (typeof manager.init === 'function') manager.init();
    });

    createGridButtons(buttonManager);
    buttonManager.discoverButtons(domElements.allButtons);
    setupEventListeners();

    if (audioManager) {
        audioManager.play('backgroundMusic');
    }

    startupSequenceManager.start(true); 
    console.log('[Main INIT] HUE 9000 Initialization Complete.');
}

document.addEventListener('DOMContentLoaded', () => {
    collectDomElements();

    serviceLocator.register('gsap', gsap);
    serviceLocator.register('config', { ...config, phaseConfigs });
    
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

    runPreloader(preloaderDomForRun, gsap).then(initializeApp);
});