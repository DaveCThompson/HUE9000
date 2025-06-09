/**
 * @module dialManager
 * @description Manages rotary dial controls: initialization, SVG injection, and global operations.
 * Delegates individual dial logic to DialController instances.
 */
import DialController from './DialController.js';
import { serviceLocator } from './serviceLocator.js';

export class DialManager {
  constructor() {
    this.dialInstances = {};
    this.appState = null;
    this.config = null;
    this.gsap = null;
    this.dom = {};
    this.debug = false;
  }

  async init() {
    this.appState = serviceLocator.get('appState');
    this.config = serviceLocator.get('config');
    this.gsap = serviceLocator.get('gsap');
    this.dom = serviceLocator.get('domElements');

    if (this.debug) console.log('[DialManager INIT]');

    try {
        await this.injectDialSVGs();
        const dialContainers = [this.dom.dialA, this.dom.dialB];
        dialContainers.forEach(container => {
            if (!container) return;
            const dialId = container.dataset.dialId;
            if (dialId) {
                if (this.dialInstances[dialId]) this.dialInstances[dialId].destroy();
                // Pass dependencies to the controller
                this.dialInstances[dialId] = new DialController(container, dialId);
            }
        });
    } catch (error) {
        console.error('[DialManager] Failed to initialize dials due to SVG injection error:', error);
    }
  }

  async injectDialSVGs() {
    try {
        const response = await fetch('./dial.svg');
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const svgData = await response.text();
        const dialContainers = [this.dom.dialA, this.dom.dialB];

        dialContainers.forEach(container => {
            if (container) {
                container.innerHTML = svgData;
            }
        });
        if (this.debug) console.log('[DialManager] SVG dials injected successfully.');

    } catch (error) {
        console.error('[DialManager] Could not fetch or inject dial.svg:', error);
        const dialContainers = [this.dom.dialA, this.dom.dialB];
        dialContainers.forEach(container => {
            if (container) {
                container.innerHTML = `<p style="color: grey; font-size: 0.8em; text-align: center;">Dial Error</p>`;
            }
        });
        // Re-throw the error to be caught by the caller in init()
        throw error;
    }
  }

  setDialsActiveState(isActive) {
    // This method is now effectively a no-op for the SVG dial, but kept for API consistency.
    // The active state is handled by the controller itself if needed.
  }

  resizeAllCanvases(forceDraw = false) {
    // FIX: Defer the redraw to the next animation frame. This is the crucial fix
    // for the style recalculation lag. It ensures that when forceRedraw() is called,
    // the browser has finished applying the new theme's styles, and getComputedStyle()
    // will return the correct, final values, preventing NaN poisoning.
    requestAnimationFrame(() => {
        Object.values(this.dialInstances).forEach(dial => {
            if (dial && typeof dial.forceRedraw === 'function') {
                dial.forceRedraw();
            }
        });
    });
  }
}