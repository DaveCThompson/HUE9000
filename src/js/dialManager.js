/**
 * @module dialManager
 * @description Manages rotary dial controls: initialization, SVG injection, and global operations.
 * Delegates individual dial logic to DialController instances.
 */
import { DialController } from './DialController.js';
import { serviceLocator } from './serviceLocator.js';
import dialSvgRawString from '../assets/svgs/dial.svg?raw';

export class DialManager {
  constructor() {
    this.dialInstances = {};
    this.gsap = null;
    this.dom = {};
    this.audioManager = null;
    this.hapticManager = null;
  }

  init() {
    this.gsap = serviceLocator.get('gsap');
    this.dom = serviceLocator.get('domElements');
    this.audioManager = serviceLocator.get('audioManager');
    this.hapticManager = serviceLocator.get('hapticFeedbackManager');

    this.injectDialSVGs(); 
    
    const dialContainers = [this.dom.dialA, this.dom.dialB];
    dialContainers.forEach(container => {
        if (!container) return;
        const dialId = container.dataset.dialId;
        if (dialId) {
            if (this.dialInstances[dialId]) this.dialInstances[dialId].destroy();
            // MODIFIED: Remove appState from constructor call; DialController now imports it directly.
            this.dialInstances[dialId] = new DialController(container, dialId, this.gsap, this.audioManager, this.hapticManager);
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
                    svgElement.setAttribute('viewBox', '0 0 200 200');
                    const faceRect = svgElement.querySelector('.dial-face');
                    if (faceRect) {
                        faceRect.setAttribute('width', '200');
                        faceRect.setAttribute('height', '200');
                    }
                }
            }
        });
    } else {
        console.error('[DialManager] Could not inject dial SVG: dialSvgRawString is not a valid SVG string.');
        dialContainers.forEach(container => {
            if (container) container.innerHTML = `<p style="color: grey; font-size: 0.8em; text-align: center;">Dial Error</p>`;
        });
    }
  }

  setDialsActiveState(isActive) {}

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