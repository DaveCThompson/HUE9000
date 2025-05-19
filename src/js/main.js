/**
 * @module main (REFACTOR-V2.2 -> V2.3 update)
 * @description Main entry point for the HUE 9000 interface. Initializes modules,
 * orchestrates application startup via StartupSequenceManager, and handles global event listeners.
 */
import gsap from 'gsap';
import * as configModule from './config.js';
import { debounce } from './utils.js';
import * as appState from './appState.js'; // Import all appState exports

// Import Managers
import buttonManager from './buttonManager.js';
import * as dialManager from './dialManager.js';
import * as gridManager from './gridManager.js';
import * as toggleManager from './toggleManager.js';
import *   as uiUpdater from './uiUpdater.js'; // Corrected import to use 'as uiUpdater'
import * as lensManager from './lensManager.js';
import * as startupSequenceManager from './startupSequenceManager.js';
import * as debugManager from './debugManager.js';

console.log("[Main] HUE 9000 Interface: main.js (REFACTOR-V2.3) loaded.");

// --- DOM Element References (collected in initializeApp) ---
let domElements = {
    body: null,
    root: null,
    logoContainer: null,
    mainPwrOnButton: null,
    mainPwrOffButton: null,
    auxLightLowButton: null,
    auxLightHighButton: null,
    dialContainers: null,
    colorLensGradientElement: null,
    scanButton1Element: null,
    debugStatusDiv: null,
    debugPhaseInfoDiv: null,
    debugAttenuationDiv: null,
    nextPhaseButton: null,
    playAllButton: null,
    resetButton: null,
    lcdA: null,
    lcdB: null,
    terminalLcdContent: null,
    initialCssAttenuationValue: '0.3'
};

// --- Manager Instances ---
const managers = {
    buttonManager, 
    dialManager,
    gridManager,
    toggleManager,
    uiUpdater,
    lensManager,
    startupSequenceManager,
    debugManager
};

function initializeApp() {
    console.log("[Main AppInit] Initializing application...");

    domElements.body = document.body;
    domElements.root = document.documentElement;
    domElements.logoContainer = document.getElementById('logo-container');
    domElements.mainPwrOnButton = document.querySelector('.on-off-group-container .button-unit[data-toggle-value="on"]');
    domElements.mainPwrOffButton = document.querySelector('.on-off-group-container .button-unit[data-toggle-value="off"]');
    domElements.auxLightLowButton = document.querySelector('.light-mode-group-container .button-unit[data-toggle-value="off"]');
    domElements.auxLightHighButton = document.querySelector('.light-mode-group-container .button-unit[data-toggle-value="on"]');
    domElements.dialContainers = document.querySelectorAll('.dial-canvas-container');
    domElements.colorLensGradientElement = document.getElementById('color-lens-gradient');
    domElements.scanButton1Element = document.querySelector('.scan-button-block .button-unit[aria-label="Scan Button 1"]');
    window.scanButton1ElementForDebug = domElements.scanButton1Element; 

    domElements.debugStatusDiv = document.getElementById('debug-phase-status');
    domElements.debugPhaseInfoDiv = document.getElementById('debug-phase-info');
    domElements.debugAttenuationDiv = document.getElementById('debug-attenuation-value');
    domElements.nextPhaseButton = document.getElementById('btn-next-phase');
    domElements.playAllButton = document.getElementById('btn-play-all');
    domElements.resetButton = document.getElementById('btn-reset-startup-debug');

    domElements.lcdA = document.getElementById('hue-lcd-A');
    domElements.lcdB = document.getElementById('hue-lcd-B');
    domElements.terminalLcdContent = document.getElementById('terminal-lcd-content');
    
    try {
        domElements.initialCssAttenuationValue = getComputedStyle(domElements.root).getPropertyValue('--global-dim-attenuation').trim() || '0.3';
    } catch (e) {
        console.warn("[Main AppInit] Could not read --global-dim-attenuation from CSS. Using default.", e);
        domElements.initialCssAttenuationValue = '0.3';
    }

    appState.setAppStatus('loading');

    managers.uiUpdater.init({
        root: domElements.root,
        body: domElements.body,
        logoContainer: domElements.logoContainer,
        lcdA: domElements.lcdA,
        lcdB: domElements.lcdB,
        terminalLcdContent: domElements.terminalLcdContent
    });

    const allButtonDOMElements = Array.from(document.querySelectorAll('.button-unit'));
    managers.buttonManager.init(allButtonDOMElements);

    const hueAssignmentColumns = document.querySelectorAll('.hue-assignment-block .hue-assignment-column[data-assignment-target]');
    managers.gridManager.init(Array.from(hueAssignmentColumns), managers.buttonManager);

    const staticToggleButtons = Array.from(document.querySelectorAll('.top-toggle-bar .button-unit--toggle'));
    managers.toggleManager.init(staticToggleButtons, managers.buttonManager);

    // Dial Manager now requires appState, configModule, and gsap for its Dial components
    if (domElements.dialContainers) {
        managers.dialManager.init(
            Array.from(domElements.dialContainers),
            appState,      // Pass appState service
            configModule,  // Pass config service
            gsap           // Pass GSAP instance
        );
    }


    if (domElements.root && domElements.colorLensGradientElement) {
        managers.lensManager.init(domElements.root, domElements.colorLensGradientElement);
    } else {
        console.error("[Main AppInit] Critical elements for Lens Manager not found.");
    }

    managers.startupSequenceManager.init({
        gsap: gsap,
        appState: appState,
        managers: { 
            buttonManager: managers.buttonManager,
            lensManager: managers.lensManager,
            dialManager: managers.dialManager,
            uiUpdater: managers.uiUpdater,
            debugManager: managers.debugManager // Pass debugManager if direct calls are needed
        },
        domElements: { 
            body: domElements.body,
            root: domElements.root,
            logoContainer: domElements.logoContainer,
            mainPwrOnButton: domElements.mainPwrOnButton,
            mainPwrOffButton: domElements.mainPwrOffButton,
            auxLightLowButton: domElements.auxLightLowButton,
            auxLightHighButton: domElements.auxLightHighButton,
            initialCssAttenuationValue: domElements.initialCssAttenuationValue,
            // --- ADDED LCD REFERENCES ---
            lcdA: domElements.lcdA,
            lcdB: domElements.lcdB,
            terminalLcdContent: domElements.terminalLcdContent
            // --- END ADDED LCD REFERENCES ---
        },
        configModule: configModule
    });

    const debugManagerHandles = managers.debugManager.init({
        startupSequenceManager: managers.startupSequenceManager,
        domElements: { 
            debugStatusDiv: domElements.debugStatusDiv,
            debugPhaseInfoDiv: domElements.debugPhaseInfoDiv,
            debugAttenuationDiv: domElements.debugAttenuationDiv,
            nextPhaseButton: domElements.nextPhaseButton,
            playAllButton: domElements.playAllButton,
            resetButton: domElements.resetButton
        },
        appState: appState, 
        initialAttenuationValue: domElements.initialCssAttenuationValue
    });

    const initialStepThroughMode = true; 
    managers.startupSequenceManager.start(initialStepThroughMode, debugManagerHandles.dimAttenuationProxy);

    const debouncedResizeHandler = debounce(() => {
        // Now dialManager.resizeAllCanvases delegates to Dial instances, which handle their own drawing.
        // No need to check appStatus here as Dial components might draw differently based on it.
        managers.dialManager.resizeAllCanvases(false); // Pass false, Dial components decide if forceDraw is needed
    }, configModule.DEBOUNCE_DELAY);
    window.addEventListener('resize', debouncedResizeHandler);

    console.log("[Main AppInit] Application initialization sequence complete.");
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}