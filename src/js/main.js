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
const domElements = {
    root: document.documentElement,
    body: document.body,
    appWrapper: document.querySelector('.app-wrapper'),
    // Preloader elements
    preloader: document.getElementById('preloader'),
    bootSeqList: document.getElementById('boot-sequence-list'),
    engageButtonContainer: document.getElementById('engage-button-container'),
    engageButton: document.getElementById('engage-button'),
    progressBar: document.getElementById('progress-bar'),
    // Side Panel elements
    controlDeck: document.getElementById('control-deck'),
    deckToggle: document.getElementById('deck-toggle'),
    // Main UI elements
    allButtons: Array.from(document.querySelectorAll('.button-unit')),
    dialA: document.getElementById('dial-canvas-container-A'),
    dialB: document.getElementById('dial-canvas-container-B'),
    lcdA: document.getElementById('hue-lcd-A'),
    lcdB: document.getElementById('hue-lcd-B'),
    terminalContainer: document.querySelector('.terminal-block .actual-lcd-screen-element'),
    terminalLcdContentElement: document.getElementById('terminal-lcd-content'),
    colorLensGradient: document.getElementById('color-lens-gradient'),
    lensSuperGlow: document.getElementById('lens-super-glow'),
    logoContainer: document.getElementById('logo-container'),
    hueAssignmentColumns: Array.from(document.querySelectorAll('.hue-assignment-column[data-assignment-target]')),
};

/**
 * Creates the buttons for the Hue Assignment Grid.
 * @param {ButtonManager} buttonManager - The button manager instance.
 */
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

/**
 * Sets up top-level event listeners for application side-effects.
 */
function setupEventListeners() {
    const audioManager = serviceLocator.get('audioManager');

    appState.subscribe('buttonInteracted', ({ button }) => {
        const groupId = button.getGroupId();
        const value = button.getValue();
        const ariaLabel = button.getElement().getAttribute('aria-label');

        if (groupId === 'system-power' && value === 'off') audioManager.play('powerOff');
        else if (groupId === 'light' && button.isSelected()) audioManager.play('bigOn');
        else audioManager.play('buttonPress');

        if (groupId === 'light') {
            appState.setTheme(value === 'on' ? 'light' : 'dark');
        } else if (groupId === 'system-power') {
            if (value === 'off') resistiveShutdownControllerInstance.handlePowerOffClick();
            else if (value === 'on' && appState.getResistiveShutdownStage() > 0) appState.setResistiveShutdownStage(0);
        } else if (['env', 'lcd', 'logo', 'btn'].includes(groupId)) {
            const hue = config.HUE_ASSIGNMENT_ROW_HUES[parseInt(value, 10)];
            appState.setTargetColorProperties(groupId, hue);
        } 
        // FIX: Added logic to handle action button presses and trigger terminal messages.
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
        const buttonElement = event.target.closest('.button-unit');
        if (buttonElement) serviceLocator.get('buttonManager').handleInteraction(buttonElement);
    });
}

/**
 * Main application initialization function. Called after the preloader is complete.
 */
function initializeApp() {
    if (window.HUE9000_INITIALIZED) return;
    window.HUE9000_INITIALIZED = true;

    console.log('[Main INIT] HUE 9000 Project Decouple Initializing...');
    
    // --- Register Core Services FIRST ---
    serviceLocator.register('appState', appState);
    serviceLocator.register('domElements', domElements);

    // --- Instantiate all managers ---
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

    // --- Register all manager instances ---
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


    // --- Initialize managers IN DEPENDENCY ORDER ---
    appState.setAppStatus('loading');
    
    // Call the new subscription method now that appState is registered.
    audioManager.postInitSubscribe();
    
    // StartupSequenceManager must be initialized first to register the proxies.
    startupSequenceManager.init();
    // PhaseRunner depends on the proxies, so it's initialized next.
    phaseRunner.init();
    // The rest of the managers can be initialized.
    const otherManagers = [
        themeManager, lcdUpdater, dynamicStyleManager, buttonManager,
        dialManager, lensManager, ambientAnimationManager, moodMatrixManager,
        intensityDisplayManager, sidePanelManager, resistiveShutdownControllerInstance,
        terminalManagerInstance
    ];
    otherManagers.forEach(manager => {
        if (typeof manager.init === 'function') manager.init();
    });

    // --- Dynamic UI Generation & Event Listener Setup ---
    createGridButtons(buttonManager);
    buttonManager.discoverButtons(domElements.allButtons);
    setupEventListeners();

    // --- Start the application ---
    startupSequenceManager.start(true); // Start in step-through mode (autoplay off)
    console.log('[Main INIT] HUE 9000 Initialization Complete.');
}

// --- App Entry Point ---
document.addEventListener('DOMContentLoaded', () => {
    // 1. Register services that are needed *before* the preloader runs.
    serviceLocator.register('gsap', gsap);
    serviceLocator.register('config', { ...config, phaseConfigs });

    // 2. Instantiate and register the ONE TRUE AudioManager.
    const audioManager = new AudioManager();
    serviceLocator.register('audioManager', audioManager);

    // 3. Initialize the AudioManager *before* the preloader runs.
    // This only does setup and does NOT subscribe to events yet.
    audioManager.init();

    // 4. Run the preloader.
    runPreloader(domElements, gsap).then(initializeApp);
});