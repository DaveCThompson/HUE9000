/**
 * @module LcdUpdater
 * @description Manages the visual state of all LCD screens (Dials, Terminal),
 * including applying flicker effects and managing visibility.
 * Replaces the LCD-handling portion of the old uiUpdater.js.
 */
import { serviceLocator } from './serviceLocator.js';
import { createAdvancedFlicker } from './animationUtils.js';

const MANAGED_LCD_CLASSES = ['lcd--unlit', 'js-active-dim-lcd', 'lcd--dimly-lit'];

export class LcdUpdater {
  constructor() {
    this.gsap = null;
    this.appState = null;
    this.config = null;
    this.dom = {}; // To be populated with DOM elements from service locator
    this.debug = false;
  }

  /**
   * Initializes the LcdUpdater.
   */
  init() {
    this.gsap = serviceLocator.get('gsap');
    this.appState = serviceLocator.get('appState');
    this.config = serviceLocator.get('config');
    this.dom = serviceLocator.get('domElements');

    if (this.debug) console.log('[LcdUpdater INIT]');

    // Subscribe to events that affect all LCDs' general state
    this.appState.subscribe('appStatusChanged', () => this.applyCurrentStateToAllLcds());
    // REMOVED: No longer reacting to phase changes, as it causes race conditions with PhaseRunner.
    // this.appState.subscribe('startupPhaseNumberChanged', () => this.applyCurrentStateToAllLcds());

    // Subscribe to specific data changes for individual LCDs
    this.appState.subscribe('trueLensPowerChanged', (newPower) => this.updateLcdBContent(newPower));

    this.applyCurrentStateToAllLcds();
  }

  /**
   * Sets the visual state of a given LCD container.
   * @param {HTMLElement} lcdContainer - The main container element for the LCD.
   * @param {string} stateName - The target state ('unlit', 'dimly-lit', 'active').
   * @param {object} [options={}] - Animation options.
   * @param {boolean} [options.useFlicker=false] - Whether to use a flicker effect.
   * @param {string} [options.flickerProfileName] - The flicker profile to use from config.
   * @param {string} [options.phaseContext=''] - A string for logging context.
   * @returns {{timeline: object, completionPromise: Promise}} GSAP timeline and a completion promise.
   */
  setLcdState(lcdContainer, stateName, options = {}) {
    const { useFlicker = false, flickerProfileName, phaseContext = 'UnknownPhase' } = options;
    const targetIdForLog = lcdContainer ? (lcdContainer.id || 'UnknownLCD') : 'NullElement';

    if (this.debug) console.log(`[LcdUpdater setLcdState - ${targetIdForLog} - ${phaseContext}] Called. Target: '${stateName}', Flicker: ${useFlicker}`);

    if (!lcdContainer) {
      console.warn(`[LcdUpdater] Attempted to set state on a null LCD container.`);
      return { timeline: this.gsap.timeline(), completionPromise: Promise.resolve() };
    }

    // Determine the correct class to apply from the state name
    const targetClass = stateName === 'dimly-lit' ? 'lcd--dimly-lit' :
                        stateName === 'unlit' ? 'lcd--unlit' : '';

    // Clear existing state classes
    MANAGED_LCD_CLASSES.forEach(cls => lcdContainer.classList.remove(cls));
    if (targetClass) {
      lcdContainer.classList.add(targetClass);
    }

    // Emit an event so other components (like MoodMatrixDisplayManager) can react to the state change
    this.appState.emit('lcdStateChanged', { lcdId: lcdContainer.id, newStateKey: stateName, context: phaseContext });

    if (useFlicker && flickerProfileName) {
      lcdContainer.classList.add('is-flickering');
      const flickerResult = createAdvancedFlicker(lcdContainer, flickerProfileName, {
        gsapInstance: this.gsap,
        onTimelineComplete: () => {
          lcdContainer.classList.remove('is-flickering');
          this._updateLcdVisibility(lcdContainer, stateName); // Final visibility update
          if (this.debug) console.log(`[LcdUpdater] Flicker complete for ${targetIdForLog}. Final state: ${stateName}`);
        }
      });
      return flickerResult;
    } else {
      this._updateLcdVisibility(lcdContainer, stateName);
      const tl = this.gsap.timeline();
      tl.to({}, { duration: 0.001 }); // Return a minimal timeline
      return { timeline: tl, completionPromise: Promise.resolve() };
    }
  }

  /**
   * Applies the correct visual state to all registered LCDs based on the current app status.
   * This method should NOT be used for managing state during the startup sequence, as that
   * is handled procedurally by the PhaseRunner.
   */
  applyCurrentStateToAllLcds() {
    const status = this.appState.getAppStatus();
    if (this.debug) console.log(`[LcdUpdater applyCurrentStateToAllLcds] AppStatus: ${status}`);

    // Only apply state if the app is NOT in the middle of the startup sequence.
    // This prevents race conditions with the PhaseRunner's animations.
    if (status !== 'starting-up') {
        const targetState = (status === 'interactive') ? 'active' : 'unlit';
        const lcds = [this.dom.lcdA, this.dom.lcdB, this.dom.terminalContainer];
        lcds.forEach(lcd => {
            if (lcd && !lcd.classList.contains('is-flickering')) {
                this.setLcdState(lcd, targetState, { phaseContext: `ApplyAll_S:${status}` });
            }
        });
    }
  }

  /**
   * Updates the text content of the Dial B LCD.
   * @param {number} newPower01 - The new lens power on a 0-1 scale.
   */
  updateLcdBContent(newPower01) {
    if (this.dom.lcdB) {
      const valueSpan = this.dom.lcdB.querySelector('.lcd-value');
      if (valueSpan) {
        const textContent = `${Math.round(newPower01 * 100)}%`;
        if (valueSpan.textContent !== textContent) {
          valueSpan.textContent = textContent;
        }
      }
    }
  }

  /**
   * Internal helper to set the final visibility of an LCD and its contents.
   * @param {HTMLElement} lcdContainer - The LCD container element.
   * @param {string} stateName - The target state name.
   */
  _updateLcdVisibility(lcdContainer, stateName) {
    const isVisible = (stateName === 'active' || stateName === 'dimly-lit');
    this.gsap.set(lcdContainer, { autoAlpha: 1 }); // The container itself is always visible, its class handles the look.

    // Handle specific content visibility
    if (lcdContainer === this.dom.lcdB) {
      const valueSpan = lcdContainer.querySelector('.lcd-value');
      if (valueSpan) this.gsap.set(valueSpan, { opacity: isVisible ? 1 : 0 });
    } else if (lcdContainer === this.dom.terminalContainer) {
      // Terminal content visibility is managed by terminalManager to prevent text from disappearing.
      // This ensures the background/glow can be controlled here without affecting typed lines.
    }
  }
}