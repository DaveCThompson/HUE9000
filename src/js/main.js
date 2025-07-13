/**
 * @module main
 * @description Entry point for the HUE 9000 application. Manages the preloader
 * and hands off control to the AppInitializer.
 */
import { gsap } from "gsap";
import { Draggable } from "gsap/Draggable";
import { InertiaPlugin } from "gsap/InertiaPlugin";
import { TextPlugin } from "gsap/TextPlugin";

import { runPreloader } from './preloader.js';
import { debounce } from './utils.js';
import { MOBILE_BREAKPOINT } from './config/index.js';
import { AppInitializer } from './appInitializer.js';
import { serviceLocator } from './serviceLocator.js';
import { AudioManager } from './AudioManager.js';

// SET TO true TO BYPASS PRELOADER AND STARTUP SEQUENCE FOR FASTER DEVELOPMENT
const DEV_SKIP_STARTUP = false;

// Register GSAP plugins
gsap.registerPlugin(Draggable, InertiaPlugin, TextPlugin);

/**
 * Sets a CSS custom property to the actual visual viewport height, robustly
 * handling mobile browser UI bars and on-screen keyboards.
 */
function initVisualViewportWatcher() {
    if (!window.visualViewport) return;
    const setViewportHeight = () => {
        document.documentElement.style.setProperty('--visual-viewport-height', `${window.visualViewport.height}px`);
    };
    setViewportHeight();
    window.visualViewport.addEventListener('resize', setViewportHeight);
}

/**
 * Sets up a resize listener to force a page reload if the viewport crosses
 * the mobile/desktop breakpoint, ensuring the correct managers are loaded.
 */
function setupResizeListener() {
    let wasMobile = window.matchMedia(MOBILE_BREAKPOINT).matches;
    const handleResize = debounce(() => {
        const isNowMobile = window.matchMedia(MOBILE_BREAKPOINT).matches;
        if (isNowMobile !== wasMobile) {
            console.log(`[Resize Handler] Viewport changed across breakpoint. Reloading...`);
            document.body.classList.add('is-reloading');
            setTimeout(() => location.reload(), 300);
        }
    }, 250);
    window.addEventListener('resize', handleResize);
}

document.addEventListener('DOMContentLoaded', () => {
    initVisualViewportWatcher();
    setupResizeListener();

    // NEW: Set dynamic copyright year
    const copyrightEl = document.getElementById('preloader-copyright');
    if (copyrightEl) {
        const currentYear = new Date().getFullYear();
        copyrightEl.textContent = `© ${currentYear} Dave Thompson Design`;
    }

    const appInitializer = new AppInitializer();

    // FIX: AudioManager must be instantiated and registered BEFORE the preloader,
    // as the preloader depends on it to track audio asset loading.
    const audioManager = new AudioManager();
    serviceLocator.register('audioManager', audioManager);
    audioManager.init();

    if (DEV_SKIP_STARTUP) {
        // Manually hide preloader elements and run the initializer in "skip" mode.
        document.getElementById('preloader-mask').style.display = 'none';
        const preloaderRoot = document.getElementById('datastream-preloader');
        if (preloaderRoot) preloaderRoot.style.display = 'none';
        
        appInitializer.run(true).catch(err => {
            console.error("DEV SKIP: Initialization failed:", err);
        });
    } else {
        // Run the normal preloader sequence, then run the initializer.
        const preloaderDom = {
            body: document.body,
            preloaderRoot: document.getElementById('datastream-preloader'),
            streamFonts: document.getElementById('stream-fonts'),
            streamGraphics: document.getElementById('stream-graphics'),
            streamAudio: document.getElementById('stream-audio'),
            overallProgressPercentage: document.getElementById('overall-progress-percentage'),
            overallProgressBar: document.getElementById('overall-progress-bar'),
            engageButton: document.getElementById('preloader-engage-btn'),
            engageButtonContainer: document.getElementById('engage-button-container'),
            criticalErrorMessageElement: document.getElementById('critical-error-message')
        };

        runPreloader(preloaderDom, gsap)
            .then(() => appInitializer.run(false))
            .catch(err => {
                console.error("Initialization failed after preloader:", err);
            });
    }
});