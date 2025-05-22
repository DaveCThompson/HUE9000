/**
 * @module main (REFACTOR-V2.2 -> V2.3 update -> XState Refactor)
 * @description Main entry point for the HUE 9000 interface. Initializes modules,
 * orchestrates application startup via StartupSequenceManager, and handles global event listeners.
 */
import { gsap } from "gsap"; // Import gsap
import { TextPlugin } from "gsap/TextPlugin"; // Import TextPlugin

import * as configModule from './config.js';
import { debounce } from './utils.js';
import * as appState from './appState.js';

// Import Managers
import { ButtonManager, ButtonStates } from './buttonManager.js'; // Import ButtonManager class and ButtonStates
import * as dialManager from './dialManager.js';
import * as gridManager from './gridManager.js';
import * as toggleManager from './toggleManager.js';
import * as uiUpdater from './uiUpdater.js';
import * as lensManager from './lensManager.js';
import * as startupSequenceManager from './startupSequenceManager.js';
import * as debugManager from './debugManager.js';
import terminalManagerInstance from './terminalManager.js'; // Import the instance

// Register GSAP plugins
gsap.registerPlugin(TextPlugin);
// console.log("[Main] GSAP and TextPlugin imported and registered via ES Modules.");


// console.log("[Main] HUE 9000 Interface: main.js (XState Refactor) loaded.");

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
    scanButton2Element: null,
    scanButton3Element: null,
    scanButton4Element: null,
    debugStatusDiv: null,
    debugPhaseInfoDiv: null,
    nextPhaseButton: null,
    playAllButton: null,
    resetButton: null,
    lcdA: null,
    lcdB: null,
    terminalContainer: null,
    terminalContent: null,
    // initialCssAttenuationValue: '0.3', // REMOVED
    elementsAnimatedOnDimExit: []
};

// --- Manager Instances ---
const managerInstances = { // Store instances here
    buttonManager: null, // Will be new ButtonManager(...)
    dialManager,
    gridManager,
    toggleManager,
    uiUpdater,
    lensManager,
    startupSequenceManager,
    debugManager,
    terminalManager: terminalManagerInstance // Use the imported instance
};

function initializeApp() {
    // console.log("[Main AppInit] Initializing application...");

    domElements.body = document.body;
    domElements.root = document.documentElement;
    domElements.logoContainer = document.getElementById('logo-container');
    domElements.mainPwrOnButton = document.querySelector('.on-off-group-container .button-unit[data-toggle-value="on"]');
    domElements.mainPwrOffButton = document.querySelector('.on-off-group-container .button-unit[data-toggle-value="off"]');
    domElements.auxLightLowButton = document.querySelector('.light-mode-group-container .button-unit[data-toggle-value="off"]');
    domElements.auxLightHighButton = document.querySelector('.light-mode-group-container .button-unit[data-toggle-value="on"]');
    domElements.dialContainers = document.querySelectorAll('.dial-canvas-container');
    domElements.colorLensGradientElement = document.getElementById('color-lens-gradient');

    const scanButtonBlockLeft = document.querySelector('.scan-button-block.joined-block-pair__item--left');
    const scanButtonBlockRight = document.querySelector('.scan-button-block.joined-block-pair__item--right');
    if (scanButtonBlockLeft) {
        domElements.scanButton1Element = scanButtonBlockLeft.children[0];
        domElements.scanButton2Element = scanButtonBlockLeft.children[1];
    }
    if (scanButtonBlockRight) {
        domElements.scanButton3Element = scanButtonBlockRight.children[0];
        domElements.scanButton4Element = scanButtonBlockRight.children[1];
    }
    window.scanButton1ElementForDebug = domElements.scanButton1Element;

    domElements.debugStatusDiv = document.getElementById('debug-phase-status');
    domElements.debugPhaseInfoDiv = document.getElementById('debug-phase-info');
    domElements.nextPhaseButton = document.getElementById('btn-next-phase');
    domElements.playAllButton = document.getElementById('btn-play-all');
    domElements.resetButton = document.getElementById('btn-reset-startup-debug');

    domElements.lcdA = document.getElementById('hue-lcd-A');
    domElements.lcdB = document.getElementById('hue-lcd-B');
    domElements.terminalContainer = document.querySelector('.control-block.terminal-block .actual-lcd-screen-element');
    domElements.terminalContent = document.getElementById('terminal-lcd-content');

    // REMOVED: Reading initialCssAttenuationValue
    // try {
    //     domElements.initialCssAttenuationValue = getComputedStyle(domElements.root).getPropertyValue('--global-dim-attenuation').trim() || '0.3';
    // } catch (e) {
    //     console.warn("[Main AppInit] Could not read --global-dim-attenuation from CSS. Using default.", e);
    //     domElements.initialCssAttenuationValue = '0.3';
    // }

    appState.setAppStatus('loading');

    managerInstances.buttonManager = new ButtonManager(gsap, appState, configModule, managerInstances.uiUpdater);

    managerInstances.uiUpdater.init({
        root: domElements.root,
        body: domElements.body,
        logoContainer: domElements.logoContainer,
        lcdA: domElements.lcdA,
        lcdB: domElements.lcdB,
        terminalLcdContentElement: domElements.terminalContent
    }, configModule, gsap);

    const allButtonDOMElements = Array.from(document.querySelectorAll('.button-unit'));
    managerInstances.buttonManager.init(allButtonDOMElements, gsap);

    const hueAssignmentColumns = document.querySelectorAll('.hue-assignment-block .hue-assignment-column[data-assignment-target]');
    managerInstances.gridManager.init(Array.from(hueAssignmentColumns), managerInstances.buttonManager);

    const staticToggleButtons = Array.from(document.querySelectorAll('.top-toggle-bar .button-unit--toggle'));
    managerInstances.toggleManager.init(staticToggleButtons, managerInstances.buttonManager);

    if (domElements.dialContainers) {
        managerInstances.dialManager.init(
            Array.from(domElements.dialContainers),
            appState,
            configModule,
            gsap
        );
    }

    if (domElements.root && domElements.colorLensGradientElement) {
        managerInstances.lensManager.init(domElements.root, domElements.colorLensGradientElement, configModule, gsap);
    } else {
        console.error("[Main AppInit] Critical elements for Lens Manager not found.");
    }

    if (domElements.terminalContainer && domElements.terminalContent) {
        managerInstances.terminalManager.init(
            domElements.terminalContainer,
            domElements.terminalContent,
            appState,
            configModule,
            gsap
        );
    } else {
        console.error("[Main AppInit] Critical elements for Terminal Manager not found. Container:", domElements.terminalContainer, "Content:", domElements.terminalContent);
    }

    const btnMessageMap = {
        [domElements.scanButton1Element?.ariaLabel]: 'BTN1_MESSAGE',
        [domElements.scanButton2Element?.ariaLabel]: 'BTN2_MESSAGE',
        [domElements.scanButton3Element?.ariaLabel]: 'BTN3_MESSAGE',
        [domElements.scanButton4Element?.ariaLabel]: 'BTN4_MESSAGE',
    };

    [
        domElements.scanButton1Element,
        domElements.scanButton2Element,
        domElements.scanButton3Element,
        domElements.scanButton4Element
    ].forEach(btnEl => {
        if (btnEl) {
            btnEl.addEventListener('click', () => {
                if (appState.getAppStatus() !== 'interactive') {
                    return;
                }
                const messageKey = btnMessageMap[btnEl.ariaLabel];
                if (messageKey) {
                    appState.emit('requestTerminalMessage', {
                        type: 'block',
                        source: btnEl.ariaLabel || 'UnknownScanButton',
                        messageKey: messageKey
                    });
                }
            });
        }
    });

    managerInstances.startupSequenceManager.init({
        gsap: gsap,
        appState: appState,
        managers: managerInstances,
        domElements: domElements,
        configModule: configModule
    });

    managerInstances.debugManager.init({ // No longer returns dimAttenuationProxy
        startupSequenceManager: managerInstances.startupSequenceManager,
        domElements: {
            debugStatusDiv: domElements.debugStatusDiv,
            debugPhaseInfoDiv: domElements.debugPhaseInfoDiv,
            nextPhaseButton: domElements.nextPhaseButton,
            playAllButton: domElements.playAllButton,
            resetButton: domElements.resetButton
        },
        appState: appState
        // REMOVED: initialAttenuationValue: domElements.initialCssAttenuationValue
    });

    const initialStepThroughMode = true;
    managerInstances.startupSequenceManager.start(initialStepThroughMode); // No longer passes proxy

    const debouncedResizeHandler = debounce(() => {
        managerInstances.dialManager.resizeAllCanvases(false);
    }, configModule.DEBOUNCE_DELAY);
    window.addEventListener('resize', debouncedResizeHandler);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}