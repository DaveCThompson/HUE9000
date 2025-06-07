/**
 * @module DynamicStyleManager
 * @description Manages dynamic CSS custom properties for hue assignments and the UI accent color.
 * Also handles injecting the logo SVG.
 * Replaces the dynamic styling portion of the old uiUpdater.js.
 */
import { serviceLocator } from './serviceLocator.js';

export class DynamicStyleManager {
  constructor() {
    this.root = document.documentElement;
    this.appState = null;
    this.config = null;
    this.dom = {};
    this.debug = false;
  }

  /**
   * Initializes the DynamicStyleManager.
   */
  init() {
    this.appState = serviceLocator.get('appState');
    this.config = serviceLocator.get('config');
    this.dom = serviceLocator.get('domElements');

    if (this.debug) console.log('[DynamicStyleManager INIT]');

    this.appState.subscribe('targetColorChanged', (payload) => this.handleTargetColorChange(payload));
    this.appState.subscribe('dialUpdated', (payload) => this.handleDialAUpdateForUIAccent(payload));

    this.injectLogoSVG();
    this.applyInitialDynamicCSSVars();
  }

  /**
   * Updates a CSS variable for a specific target.
   * @param {string} targetKey - The key for the target (e.g., 'env', 'logo', 'btn', 'ui-accent').
   * @param {number} hueValue - The hue value to set.
   * @param {boolean} isColorless - Whether the hue represents a colorless state.
   */
  updateDynamicCSSVar(targetKey, hueValue, isColorless) {
    if (!this.root) return;

    const normalizedHue = ((Number(hueValue) % 360) + 360) % 360;
    const baseChromas = { env: 0.039, logo: 0.099, 'ui-accent': 0.20, btn: 0.15, lcd: 0.08 };
    const intendedActiveChroma = parseFloat(getComputedStyle(this.root).getPropertyValue(`--dynamic-${targetKey}-chroma-base`).trim()) || baseChromas[targetKey] || 0.1;
    const chromaToSet = isColorless ? 0 : intendedActiveChroma;

    this.root.style.setProperty(`--dynamic-${targetKey}-hue`, normalizedHue.toFixed(1));
    this.root.style.setProperty(`--dynamic-${targetKey}-chroma`, chromaToSet.toFixed(4));

    if (this.debug) console.log(`[DynamicStyleManager] Set CSS vars for '${targetKey}': Hue=${normalizedHue.toFixed(1)}, Chroma=${chromaToSet.toFixed(4)}`);
  }

  /**
   * Fetches and injects the logo SVG into its container.
   */
  injectLogoSVG() {
    const logoContainer = this.dom.logoContainer;
    if (!logoContainer) {
      console.error("[DynamicStyleManager] logoContainer element not found for SVG injection.");
      return;
    }
    if (logoContainer.querySelector('svg.logo-svg')) {
      return; // Already injected
    }

    fetch('./logo.svg')
      .then(response => {
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        return response.text();
      })
      .then(svgData => {
        if (!svgData || !svgData.trim().startsWith('<svg')) throw new Error("Invalid SVG data.");
        logoContainer.innerHTML = svgData;
        this.applyInitialDynamicCSSVars(); // Re-apply vars to the new SVG
      })
      .catch(error => {
        console.error('[DynamicStyleManager] Error fetching/injecting SVG logo:', error);
        logoContainer.innerHTML = `<p style="color: #ccc; font-size: 0.8em;">Logo Load Error</p>`;
      });
  }

  /**
   * Applies all initial dynamic CSS variables based on the current appState.
   */
  applyInitialDynamicCSSVars() {
    ['env', 'lcd', 'logo', 'btn'].forEach(key => {
      const props = this.appState.getTargetColorProperties(key);
      if (props) {
        this.updateDynamicCSSVar(key, props.hue, props.isColorless);
      }
    });

    const dialAState = this.appState.getDialState('A');
    const initialDialAHue = dialAState ? dialAState.hue : this.config.DEFAULT_DIAL_A_HUE;
    this.updateDynamicCSSVar('ui-accent', initialDialAHue, false);
  }

  /**
   * Listener for appState's targetColorChanged event.
   * @param {object} payload - The event payload.
   */
  handleTargetColorChange(payload) {
    if (!payload || !payload.targetKey) return;
    this.updateDynamicCSSVar(payload.targetKey, payload.hue, payload.isColorless);
  }

  /**
   * Listener for appState's dialUpdated event to update the UI accent color.
   * @param {object} payload - The event payload.
   */
  handleDialAUpdateForUIAccent(payload) {
    if (payload && payload.id === 'A' && payload.state) {
      this.updateDynamicCSSVar('ui-accent', payload.state.hue, false);
    }
  }
}