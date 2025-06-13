/**
 * @module dialManager
 * @description Manages rotary dial controls: initialization, SVG injection, and global operations.
 * Delegates individual dial logic to DialController instances.
 */
import DialController from './DialController.js';
import { serviceLocator } from './serviceLocator.js';
import * as appState from './appState.js'; // IMPORT appState directly
// import dialSvgUrl from '../assets/svgs/dial.svg'; // OLD: Direct string path
import dialSvgRawString from '../assets/svgs/dial.svg?raw'; // NEW: Vite ?raw import for SVG string


export class DialManager {
  constructor() {
    this.dialInstances = {};
    // this.appState = null; // REMOVED
    this.config = null;
    this.gsap = null;
    this.dom = {};
    this.debug = false;
  }

  async init() { // Keep async if future operations require it, though current SVG injection is sync
    // this.appState = serviceLocator.get('appState'); // REMOVED
    this.config = serviceLocator.get('config');
    this.gsap = serviceLocator.get('gsap');
    this.dom = serviceLocator.get('domElements');

    if (this.debug) console.log('[DialManager INIT]');

    // SVG injection is now synchronous with ?raw import
    this.injectDialSVGs(); 
    
    const dialContainers = [this.dom.dialA, this.dom.dialB];
    dialContainers.forEach(container => {
        if (!container) return;
        const dialId = container.dataset.dialId;
        if (dialId) {
            if (this.dialInstances[dialId]) this.dialInstances[dialId].destroy();
            // Pass imported appState to DialController constructor
            this.dialInstances[dialId] = new DialController(container, dialId, appState, this.config, this.gsap);
        }
    });
  }

  injectDialSVGs() {
    const dialContainers = [this.dom.dialA, this.dom.dialB];

    if (typeof dialSvgRawString === 'string' && dialSvgRawString.trim().startsWith('<svg')) {
        dialContainers.forEach(container => {
            if (container) {
                container.innerHTML = dialSvgRawString;
            }
        });
        if (this.debug) console.log('[DialManager] SVG dials injected successfully via ?raw import.');
    } else {
        console.error('[DialManager] Could not inject dial SVG: dialSvgRawString is not a valid SVG string.');
        dialContainers.forEach(container => {
            if (container) {
                container.innerHTML = `<p style="color: grey; font-size: 0.8em; text-align: center;">Dial Error</p>`;
            }
        });
    }
  }

  setDialsActiveState(isActive) {
    // This method is now effectively a no-op for the SVG dial, but kept for API consistency.
  }

  resizeAllCanvases(forceDraw = false) {
    requestAnimationFrame(() => {
        Object.values(this.dialInstances).forEach(dial => {
            if (dial && typeof dial.forceRedraw === 'function') {
                dial.forceRedraw();
            }
        });
    });
  }
}