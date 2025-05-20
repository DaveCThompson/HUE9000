/**
 * @module main (REFACTOR-V2.2 -> V2.3 update)
 * @description Main entry point for the HUE 9000 interface. Initializes modules,
 * orchestrates application startup via StartupSequenceManager, and handles global event listeners.
 */
import { gsap } from "gsap"; // Import gsap
import { TextPlugin } from "gsap/TextPlugin"; // Import TextPlugin

import * as configModule from './config.js'; 
import { debounce } from './utils.js';
import * as appState from './appState.js'; 

// Import Managers
import buttonManager from './buttonManager.js';
import * as dialManager from './dialManager.js';
import * as gridManager from './gridManager.js';
import * as toggleManager from './toggleManager.js';
import * as uiUpdater from './uiUpdater.js'; 
import * as lensManager from './lensManager.js';
import * as startupSequenceManager from './startupSequenceManager.js';
import * as debugManager from './debugManager.js';
import terminalManager from './terminalManager.js'; 

// Register GSAP plugins
gsap.registerPlugin(TextPlugin);
console.log("[Main] GSAP and TextPlugin imported and registered via ES Modules.");


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
    debugManager,
    terminalManager 
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
        terminalLcdContentElement: domElements.terminalContent 
    }, configModule, gsap); // Pass gsap to uiUpdater

    const allButtonDOMElements = Array.from(document.querySelectorAll('.button-unit'));
    managers.buttonManager.init(allButtonDOMElements, gsap); // Pass gsap to buttonManager

    const hueAssignmentColumns = document.querySelectorAll('.hue-assignment-block .hue-assignment-column[data-assignment-target]');
    managers.gridManager.init(Array.from(hueAssignmentColumns), managers.buttonManager); 

    const staticToggleButtons = Array.from(document.querySelectorAll('.top-toggle-bar .button-unit--toggle'));
    managers.toggleManager.init(staticToggleButtons, managers.buttonManager); 

    if (domElements.dialContainers) {
        managers.dialManager.init(
            Array.from(domElements.dialContainers),
            appState,      
            configModule,  
            gsap          
        );
    }

    if (domElements.root && domElements.colorLensGradientElement) {
        managers.lensManager.init(domElements.root, domElements.colorLensGradientElement, configModule, gsap); // Pass gsap to lensManager
    } else {
        console.error("[Main AppInit] Critical elements for Lens Manager not found.");
    }

    if (domElements.terminalContainer && domElements.terminalContent) {
        managers.terminalManager.init(
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
                    console.log(`[Main BTN Click] Interaction blocked for ${btnEl.ariaLabel}, app not interactive.`);
                    return;
                }
                const messageKey = btnMessageMap[btnEl.ariaLabel];
                if (messageKey) {
                    console.log(`[Main BTN Click] Emitting terminal message for ${btnEl.ariaLabel}, Key: ${messageKey}`);
                    appState.emit('requestTerminalMessage', {
                        type: 'block',
                        source: btnEl.ariaLabel || 'UnknownScanButton',
                        messageKey: messageKey
                    });
                }
            });
        }
    });


    managers.startupSequenceManager.init({
        gsap: gsap, 
        appState: appState,
        managers: { 
            buttonManager: managers.buttonManager,
            lensManager: managers.lensManager,
            dialManager: managers.dialManager,
            uiUpdater: managers.uiUpdater,
            terminalManager: managers.terminalManager, 
            debugManager: managers.debugManager 
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
            lcdA: domElements.lcdA,
            lcdB: domElements.lcdB,
            terminalContainer: domElements.terminalContainer, 
            terminalContent: domElements.terminalContent     
        },
        configModule: configModule 
    });

    const debugManagerHandles = managers.debugManager.init({
        startupSequenceManager: managers.startupSequenceManager,
        domElements: { 
            debugStatusDiv: domElements.debugStatusDiv,
            debugPhaseInfoDiv: domElements.debugPhaseInfoDiv,
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
        managers.dialManager.resizeAllCanvases(false); 
    }, configModule.DEBOUNCE_DELAY); 
    window.addEventListener('resize', debouncedResizeHandler);

    console.log("[Main AppInit] Application initialization sequence complete.");
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}