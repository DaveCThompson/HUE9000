/**
 * @module LcdUpdater
 * @description Manages the visual state of all LCD screens (Dials, Terminal),
 * including applying flicker effects and managing visibility.
 * Replaces the LCD-handling portion of the old uiUpdater.js.
 */
import { serviceLocator } from './serviceLocator.js';
import { createAdvancedFlicker } from './animationUtils.js';

const MANAGED_LCD_CLASSES = ['lcd--unlit', 'lcd--dimly-lit'];

export class LcdUpdater {
  constructor() {
    this.gsap = null;
    this.appState = null;
    this.config = null;
    this.dom = {};
    this.debug = true; // Enable detailed logging
  }

  init() {
    this.gsap = serviceLocator.get('gsap');
    this.appState = serviceLocator.get('appState');
    this.config = serviceLocator.get('config');
    this.dom = serviceLocator.get('domElements');

    if (this.debug) console.log('[LcdUpdater INIT]');
    this.appState.subscribe('appStatusChanged', () => this.applyCurrentStateToAllLcds());
    this.applyCurrentStateToAllLcds();
  }

  /**
   * Creates and returns a GSAP timeline for a coordinated LCD power-on flicker effect.
   * @param {HTMLElement} lcdContainer - The main container element for the LCD.
   * @param {object} options - Animation options.
   * @param {string} options.profileName - The flicker profile for the container.
   * @param {string} options.state - The target state ('unlit', 'dimly-lit', 'active').
   * @returns {gsap.core.Timeline} A GSAP timeline for the full effect.
   */
  getLcdPowerOnTimeline(lcdContainer, options) {
    // FIX: Improved logging for elements without an ID.
    const targetIdForLog = lcdContainer ? (lcdContainer.id || lcdContainer.className.split(' ')[0]) : 'NullElement';
    if (this.debug) console.groupCollapsed(`[LcdUpdater] getLcdPowerOnTimeline for ${targetIdForLog}`);

    const masterTimeline = this.gsap.timeline();
    if (!lcdContainer) {
      console.warn(`[LcdUpdater] Attempted to get timeline for a null LCD container.`);
      if (this.debug) console.groupEnd();
      return masterTimeline;
    }

    const contentWrapper = lcdContainer.querySelector('.lcd-content-wrapper');

    // 1. Make the content wrapper visible so GSAP has an element to animate.
    masterTimeline.call(() => {
        if (this.debug) console.log(`[LcdUpdater] Making content wrapper visible for animation.`);
        this._updateLcdVisibility(lcdContainer, options.state);
    }, [], 0);

    // 2. Create and add the container (background) flicker timeline.
    if (this.debug) console.log(`[LcdUpdater] Creating container flicker with profile: ${options.profileName}`);
    const containerFlicker = createAdvancedFlicker(lcdContainer, options.profileName, { gsapInstance: this.gsap });
    masterTimeline.add(containerFlicker.timeline, 0);

    // 3. Create and add a generic, smooth content fade-in animation.
    // MODIFIED: Do not apply this generic fade-in to the main terminal, as its content
    // is animated separately (e.g., by typing).
    if (contentWrapper && !lcdContainer.classList.contains('actual-lcd-screen-element')) {
        const contentElements = Array.from(contentWrapper.children);
        if (contentElements.length > 0) {
            if (this.debug) console.log(`[LcdUpdater] Creating generic content fade-in for ${contentElements.length} elements.`);
            masterTimeline.from(contentElements, {
                autoAlpha: 0,
                y: '5px',
                stagger: 0.04,
                duration: 0.4,
                ease: 'power1.out'
            }, containerFlicker.timeline.duration() * 0.25); // Start content fade-in partway through the container flicker
        }
    }

    // 4. After animation, set the final static CSS class on the container.
    masterTimeline.eventCallback('onComplete', () => {
        if (this.debug) console.log(`[LcdUpdater] Power-on complete. Setting final state: ${options.state}`);
        const targetClass = options.state === 'dimly-lit' ? 'lcd--dimly-lit' : '';
        MANAGED_LCD_CLASSES.forEach(cls => lcdContainer.classList.remove(cls));
        if (targetClass) lcdContainer.classList.add(targetClass);
        this.appState.emit('lcdStateChanged', { lcdId: targetIdForLog, newStateKey: options.state });
        if (this.debug) console.groupEnd();
    });

    return masterTimeline;
  }

  setLcdState(lcdContainer, stateName) {
    const targetIdForLog = lcdContainer ? (lcdContainer.id || lcdContainer.className.split(' ')[0]) : 'NullElement';
    if (this.debug) console.log(`[LcdUpdater] setLcdState (instant) for ${targetIdForLog} to ${stateName}`);
    const targetClass = stateName === 'dimly-lit' ? 'lcd--dimly-lit' : stateName === 'unlit' ? 'lcd--unlit' : '';
    MANAGED_LCD_CLASSES.forEach(cls => lcdContainer.classList.remove(cls));
    if (targetClass) lcdContainer.classList.add(targetClass);
    this._updateLcdVisibility(lcdContainer, stateName);
    this.appState.emit('lcdStateChanged', { lcdId: targetIdForLog, newStateKey: stateName });
  }

  applyCurrentStateToAllLcds() {
    const status = this.appState.getAppStatus();
    if (status !== 'starting-up') {
        const targetState = (status === 'interactive') ? 'active' : 'unlit';
        [this.dom.lcdA, this.dom.lcdB, this.dom.terminalContainer].forEach(lcd => {
            if (lcd) {
                this.setLcdState(lcd, targetState);
                // The terminal should resonate continuously when the app is interactive.
                // The V2 displays (lcdA, lcdB) have their own managers that control
                // resonance based on user interaction, so we only set it for the terminal here.
                if (lcd.classList.contains('actual-lcd-screen-element')) {
                    lcd.classList.toggle('is-resonating', status === 'interactive');
                }
            }
        });
    }
  }

  _updateLcdVisibility(lcdContainer, stateName) {
    if (!lcdContainer) return;
    const contentWrapper = lcdContainer.querySelector('.lcd-content-wrapper');
    if (!contentWrapper) return;
    const isVisible = (stateName === 'active' || stateName === 'dimly-lit');
    contentWrapper.classList.toggle('is-content-hidden', !isVisible);
  }
}