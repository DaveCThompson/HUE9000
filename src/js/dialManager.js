/**
 * @module dialManager
 * @description Manages rotary dial controls: initialization and global operations.
 * Delegates individual dial logic, interaction, and rendering to Dial component instances.
 * (Project Decouple Refactor)
 */
import Dial from './Dial.js';
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

  init() {
    this.appState = serviceLocator.get('appState');
    this.config = serviceLocator.get('config');
    this.gsap = serviceLocator.get('gsap');
    this.dom = serviceLocator.get('domElements');

    if (this.debug) console.log('[DialManager INIT]');

    const dialContainers = [this.dom.dialA, this.dom.dialB];
    dialContainers.forEach(container => {
      if (!container) return;
      const dialId = container.dataset.dialId;
      if (dialId) {
        if (this.dialInstances[dialId]) this.dialInstances[dialId].destroy();
        this.dialInstances[dialId] = new Dial(container, dialId, this.appState, this.config, this.gsap);
      }
    });
  }

  setDialsActiveState(isActive) {
    Object.values(this.dialInstances).forEach(dial => dial.setActiveDimState(isActive));
  }

  resizeAllCanvases(forceDraw = false) {
    Object.values(this.dialInstances).forEach(dial => dial.resizeCanvas(forceDraw));
  }
}