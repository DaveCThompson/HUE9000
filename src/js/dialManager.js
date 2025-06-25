/**
 * @module dialManager
 * @description Manages rotary dial controls: initialization, SVG injection, and global operations.
 * Delegates individual dial logic to DialController instances.
 */
import { DialController } from './DialController.js';
import { serviceLocator } from './serviceLocator.js';
import * as appState from './appState.js'; // IMPORT appState directly
import dialSvgRawString from '../assets/svgs/dial.svg?raw'; // NEW: Vite ?raw import for SVG string


export class DialManager {
  constructor() {
    this.dialInstances = {};
    this.gsap = null;
    this.dom = {};
    this.audioManager = null;
    this.debug = false;
  }

  init() {
    this.gsap = serviceLocator.get('gsap');
    this.dom = serviceLocator.get('domElements');
    this.audioManager = serviceLocator.get('audioManager');

    // if (this.debug) console.log('[DialManager INIT]');

    // SVG injection is now synchronous with ?raw import
    this.injectDialSVGs(); 
    
    const dialContainers = [this.dom.dialA, this.dom.dialB];
    dialContainers.forEach(container => {
        if (!container) return;
        const dialId = container.dataset.dialId;
        if (dialId) {
            if (this.dialInstances[dialId]) this.dialInstances[dialId].destroy();
            // Pass imported appState to DialController constructor, removing config
            this.dialInstances[dialId] = new DialController(container, dialId, appState, this.gsap, this.audioManager);
        }
    });
  }

  injectDialSVGs() {
    const dialContainers = [this.dom.dialA, this.dom.dialB];

    if (typeof dialSvgRawString === 'string' && dialSvgRawString.trim().startsWith('<svg')) {
        dialContainers.forEach(container => {
            if (container) {
                container.innerHTML = dialSvgRawString;
                const svgElement = container.querySelector('svg');
                if (svgElement) {
                    // FIX: Programmatically set viewBox and get the face rect
                    svgElement.setAttribute('viewBox', '0 0 200 200');
                    const faceRect = svgElement.querySelector('.dial-face');
                    if (faceRect) {
                        // FIX: Force the background rect to fill the new square viewBox
                        faceRect.setAttribute('width', '200');
                        faceRect.setAttribute('height', '200');
                    }
                }
            }
        });
        // if (this.debug) console.log('[DialManager] SVG dials injected successfully via ?raw import.');
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
    // The new rendering logic is independent of canvas size, but we might still need to
    // trigger a redraw if external factors (like theme) change.
    requestAnimationFrame(() => {
        Object.values(this.dialInstances).forEach(dial => {
            if (dial && typeof dial.forceRedraw === 'function') {
                dial.forceRedraw();
            }
        });
    });
  }
}