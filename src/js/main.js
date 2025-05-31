/**
 * @module main (REFACTOR-V2.3 - Ambient Animations Update & All Import Fixes)
 * @description Entry point for the HUE 9000 application.
 * Initializes all core modules, managers, and sets up the UI.
 */
import { gsap } from "gsap";
import { Draggable } from "gsap/Draggable";
import { InertiaPlugin } from "gsap/InertiaPlugin";
import { TextPlugin } from "gsap/TextPlugin"; // ADDED: Import TextPlugin

// Core Modules
import * as appState from './appState.js';
import * as configModule from './config.js';

// UI Component Managers & Other Modules (Corrected Imports)
import { ButtonManager } from './buttonManager.js'; 
import * as dialManager from './dialManager.js';
import * as gridManager from './gridManager.js';
import * as toggleManager from './toggleManager.js';
import * as lensManager from './lensManager.js';
import terminalManagerInstance from './terminalManager.js'; // Import the instance
import * as debugManager from './debugManager.js';
import * as startupSequenceManager from './startupSequenceManager.js';
import * as uiUpdater from './uiUpdater.js';
import AmbientAnimationManager from './AmbientAnimationManager.js'; 
import MoodMatrixDisplayManager from './moodMatrixDisplayManager.js'; // NEW: Import MoodMatrixDisplayManager

// DOM Element References
const domElements = {
    // Body & Core Structure
    root: document.documentElement,
    body: document.body,
    appWrapper: document.querySelector('.app-wrapper'),

    // Panels
    leftPanel: document.querySelector('.left-panel'),
    centerPanel: document.querySelector('.center-panel'),
    rightPanel: document.querySelector('.right-panel'),

    // Buttons (Collected by type/group)
    allButtons: Array.from(document.querySelectorAll('.button-unit')),
    mainPowerToggleButtons: Array.from(document.querySelectorAll('[data-group-id="system-power"] .button-unit--toggle')),
    mainPwrOnButton: document.querySelector('[data-group-id="system-power"] .button-unit--toggle[data-toggle-value="on"]'),
    mainPwrOffButton: document.querySelector('[data-group-id="system-power"] .button-unit--toggle[data-toggle-value="off"]'), 
    auxLightToggleButtons: Array.from(document.querySelectorAll('[data-group-id="light"] .button-unit--toggle')),
    auxLightLowButton: document.querySelector('[data-group-id="light"] .button-unit--toggle[data-toggle-value="off"]'),
    auxLightHighButton: document.querySelector('[data-group-id="light"] .button-unit--toggle[data-toggle-value="on"]'),
    scanButton1Element: document.querySelector('[data-group-id="skill-scan-group"] .button-unit--action[aria-label="Scan Button 1"]'),
    scanButton2Element: document.querySelector('[data-group-id="skill-scan-group"] .button-unit--action[aria-label="Scan Button 2"]'),
    scanButton3Element: document.querySelector('[data-group-id="fit-eval-group"] .button-unit--action[aria-label="Scan Button 3"]'),
    scanButton4Element: document.querySelector('[data-group-id="fit-eval-group"] .button-unit--action[aria-label="Scan Button 4"]'),
    hueAssignmentRadioButtons: Array.from(document.querySelectorAll('.hue-assignment-column .button-unit--radio')),

    // Dials & Associated LCDs
    dialA: document.getElementById('dial-canvas-container-A'),
    dialB: document.getElementById('dial-canvas-container-B'),
    lcdA: document.getElementById('hue-lcd-A'), // This will be the container for MoodMatrix
    lcdB: document.getElementById('hue-lcd-B'),

    // Terminal
    terminalContainer: document.querySelector('.terminal-block .actual-lcd-screen-element'),
    terminalLcdContentElement: document.getElementById('terminal-lcd-content'),

    // Lens & Logo
    lensContainer: document.getElementById('lens-container'),
    colorLens: document.getElementById('color-lens'),
    colorLensGradient: document.getElementById('color-lens-gradient'),
    lensOuterGlow: document.getElementById('outer-glow'),
    lensSuperGlow: document.getElementById('lens-super-glow'),
    logoContainer: document.getElementById('logo-container'),

    // Color Chips & Grill
    colorChipsContainer: document.querySelector('.color-chips-column'),
    colorChips: Array.from(document.querySelectorAll('.color-chip')),
    grillPlaceholder: document.querySelector('.grill-placeholder'),

    // Debug Controls
    debugControls: document.getElementById('debug-controls'),
    btnNextPhase: document.getElementById('btn-next-phase'),
    btnPlayAll: document.getElementById('btn-play-all'),
    btnResetStartup: document.getElementById('btn-reset-startup-debug'),
    debugPhaseStatus: document.getElementById('debug-phase-status'),
    debugPhaseInfo: document.getElementById('debug-phase-info'),

    elementsAnimatedOnDimExit: []
    // moodMatrixDisplay: document.getElementById('mood-matrix-display'), // Not needed if lcdA is the container
};

gsap.registerPlugin(Draggable, InertiaPlugin, TextPlugin);

function initializeApp() {
    console.log('[Main INIT] HUE 9000 REFACTOR-V2.3 Initializing...');
    appState.setAppStatus('loading');

    const buttonManagerInstance = new ButtonManager(gsap, appState, configModule);
    const ambientAnimationManagerInstance = new AmbientAnimationManager(gsap, appState, buttonManagerInstance, configModule);
    const moodMatrixDisplayManagerInstance = new MoodMatrixDisplayManager(domElements.lcdA, gsap, appState, configModule); // NEW

    uiUpdater.init(domElements, configModule, gsap); 
    dialManager.init([domElements.dialA, domElements.dialB], appState, configModule, gsap);
    const hueAssignmentColumnElements = Array.from(document.querySelectorAll('.hue-assignment-column[data-assignment-target]'));
    gridManager.init(hueAssignmentColumnElements, buttonManagerInstance);
    lensManager.init(domElements.root, domElements.colorLensGradient, configModule, gsap);
    
    terminalManagerInstance.init(domElements.terminalContainer, domElements.terminalLcdContentElement, appState, configModule, gsap);

    buttonManagerInstance.setUiUpdater(uiUpdater);
    buttonManagerInstance.setAAM(ambientAnimationManagerInstance);
    buttonManagerInstance.init(domElements.allButtons);

    toggleManager.init(
        [...domElements.mainPowerToggleButtons, ...domElements.auxLightToggleButtons],
        buttonManagerInstance
    );

    ambientAnimationManagerInstance.init();
    // MoodMatrixDisplayManager is already initialized above

    const managerReferencesForStartup = {
        buttonManager: buttonManagerInstance,
        dialManager: dialManager,
        gridManager: gridManager,
        toggleManager: toggleManager,
        lensManager: lensManager,
        terminalManager: terminalManagerInstance, 
        uiUpdater: uiUpdater,
        debugManager: debugManager,
        ambientAnimationManager: ambientAnimationManagerInstance,
        moodMatrixDisplayManager: moodMatrixDisplayManagerInstance // NEW: Add to startup dependencies if needed by phases
    };

    startupSequenceManager.init({
        gsap,
        appState,
        configModule,
        domElements,
        managers: managerReferencesForStartup
    });

    const debugDomElementsForManager = {
        nextPhaseButton: domElements.btnNextPhase,
        playAllButton: domElements.btnPlayAll,
        resetButton: domElements.btnResetStartup,
        debugStatusDiv: domElements.debugPhaseStatus,
        debugPhaseInfoDiv: domElements.debugPhaseInfo
    };
    debugManager.init({
        startupSequenceManager: startupSequenceManager,
        appState: appState,
        domElements: debugDomElementsForManager
    });

    startupSequenceManager.start(true);
    console.log('[Main INIT] HUE 9000 Initialization Complete.');
}

document.addEventListener('DOMContentLoaded', initializeApp);