/**
 * @module main
 * @description Entry point for the HUE 9000 application.
 * Initializes all managers, registers them with the service locator,
 * and sets up top-level application logic and event listeners.
 * (Project Decouple Refactor)
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

// Manager Classes
import { ButtonManager } from './buttonManager.js';
import { DialManager } from './dialManager.js';
import { LensManager } from './lensManager.js';
import { ThemeManager } from './ThemeManager.js';
import { LcdUpdater } from './LcdUpdater.js';
import { DynamicStyleManager } from './DynamicStyleManager.js';
import { PhaseRunner } from './PhaseRunner.js';
import AmbientAnimationManager from './AmbientAnimationManager.js';
import MoodMatrixDisplayManager from './moodMatrixDisplayManager.js';
import resistiveShutdownControllerInstance from './resistiveShutdownController.js';
import terminalManagerInstance from './terminalManager.js';
import { StartupSequenceManager } from './startupSequenceManager.js';
import * as debugManager from './debugManager.js';

// Register GSAP and its plugins
gsap.registerPlugin(Draggable, InertiaPlugin, TextPlugin);

// --- DOM Element Collection ---
const domElements = {
    root: document.documentElement,
    body: document.body,
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
    // Buttons for startup sequence
    mainPowerOnBtn: document.getElementById('main-power-on-btn'),
    auxLightLowBtn: document.getElementById('aux-light-low-btn'),
    // Debug controls
    debugControls: document.getElementById('debug-controls'),
    btnNextPhase: document.getElementById('btn-next-phase'),
    btnPlayAll: document.getElementById('btn-play-all'),
    btnResetStartup: document.getElementById('btn-reset-startup-debug'),
    debugPhaseStatus: document.getElementById('debug-phase-status'),
    debugPhaseInfo: document.getElementById('debug-phase-info'),
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
    // Listener for all button interactions
    appState.subscribe('buttonInteracted', ({ button }) => {
        const groupId = button.getGroupId();
        const value = button.getValue();

        // --- Logic from old toggleManager ---
        if (groupId === 'light') {
            const newTheme = value === 'on' ? 'light' : 'dark';
            if (appState.getCurrentTheme() !== newTheme) {
                appState.setTheme(newTheme);
            }
        } else if (groupId === 'system-power') {
            if (value === 'off') {
                resistiveShutdownControllerInstance.handlePowerOffClick();
            } else if (value === 'on' && appState.getResistiveShutdownStage() > 0) {
                appState.setResistiveShutdownStage(0);
            }
        }
        // --- Logic from old gridManager ---
        else if (['env', 'lcd', 'logo', 'btn'].includes(groupId)) {
            const hue = config.HUE_ASSIGNMENT_ROW_HUES[parseInt(value, 10)];
            appState.setTargetColorProperties(groupId, hue);
        }
        // --- Logic for action buttons ---
        else if (groupId === 'skill-scan-group' || groupId === 'fit-eval-group') {
            const messageKeyMap = {
                'Scan Button 1': 'BTN1_MESSAGE',
                'Scan Button 2': 'BTN2_MESSAGE',
                'Scan Button 3': 'BTN3_MESSAGE',
                'Scan Button 4': 'BTN4_MESSAGE',
            };
            const messageKey = messageKeyMap[button.getElement().ariaLabel];
            if (messageKey) {
                appState.emit('requestTerminalMessage', { type: 'block', messageKey });
            }
        }
    });

    // Listener for all physical button clicks to delegate to buttonManager
    document.body.addEventListener('click', (event) => {
        const buttonElement = event.target.closest('.button-unit');
        if (buttonElement) {
            serviceLocator.get('buttonManager').handleInteraction(buttonElement);
        }
    });
}

/**
 * Main application initialization function.
 */
function initializeApp() {
    // Use a global guard to prevent re-initialization from HMR or other sources
    if (window.HUE9000_INITIALIZED) {
        return;
    }
    window.HUE9000_INITIALIZED = true;

    console.log('[Main INIT] HUE 9000 Project Decouple Initializing...');
    appState.setAppStatus('loading');

    // --- Instantiate all managers ---
    const themeManager = new ThemeManager();
    const lcdUpdater = new LcdUpdater();
    const dynamicStyleManager = new DynamicStyleManager();
    const buttonManager = new ButtonManager();
    const dialManager = new DialManager();
    const lensManager = new LensManager();
    const ambientAnimationManager = new AmbientAnimationManager();
    const moodMatrixDisplayManager = new MoodMatrixDisplayManager(domElements.lcdA);
    const phaseRunner = new PhaseRunner();
    const startupSequenceManager = new StartupSequenceManager();

    // --- Register all services and managers ---
    serviceLocator.register('gsap', gsap);
    serviceLocator.register('appState', appState);
    // Augment the imported config with phaseConfigs before registering
    serviceLocator.register('config', { ...config, phaseConfigs });
    serviceLocator.register('domElements', domElements);
    serviceLocator.register('themeManager', themeManager);
    serviceLocator.register('lcdUpdater', lcdUpdater);
    serviceLocator.register('dynamicStyleManager', dynamicStyleManager);
    serviceLocator.register('buttonManager', buttonManager);
    serviceLocator.register('dialManager', dialManager);
    serviceLocator.register('lensManager', lensManager);
    serviceLocator.register('ambientAnimationManager', ambientAnimationManager);
    serviceLocator.register('moodMatrixDisplayManager', moodMatrixDisplayManager);
    serviceLocator.register('terminalManager', terminalManagerInstance);
    serviceLocator.register('resistiveShutdownController', resistiveShutdownControllerInstance);
    serviceLocator.register('phaseRunner', phaseRunner);
    serviceLocator.register('startupSequenceManager', startupSequenceManager);
    serviceLocator.register('debugManager', debugManager);

    // --- Initialize managers (they will get dependencies from the locator) ---
    // Initialize StartupSequenceManager first so it can register its proxies before PhaseRunner needs them.
    startupSequenceManager.init();

    const managersToInit = [
        themeManager, lcdUpdater, dynamicStyleManager, buttonManager, dialManager,
        lensManager, ambientAnimationManager, moodMatrixDisplayManager,
        terminalManagerInstance, resistiveShutdownControllerInstance, phaseRunner
    ];
    managersToInit.forEach(manager => manager.init());

    debugManager.init({
        debugStatusDiv: domElements.debugPhaseStatus,
        debugPhaseInfo: domElements.debugPhaseInfo,
        nextPhaseButton: domElements.btnNextPhase,
        playAllButton: domElements.btnPlayAll,
        resetButton: domElements.btnResetStartup,
    });

    // --- Dynamic UI Generation & Event Listener Setup ---
    createGridButtons(buttonManager);
    buttonManager.discoverButtons(domElements.allButtons);
    setupEventListeners();

    // --- Start the application ---
    startupSequenceManager.start(true); // Start in step-through mode
    console.log('[Main INIT] HUE 9000 Initialization Complete.');
}

// --- App Entry Point ---
document.addEventListener('DOMContentLoaded', initializeApp);