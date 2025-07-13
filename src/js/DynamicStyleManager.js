/**
 * @module DynamicStyleManager
 * @description Manages dynamic CSS custom properties for hue assignments and the UI accent color.
 * Also handles injecting the logo SVG.
 * Replaces the dynamic styling portion of the old uiUpdater.js.
 */
import { serviceLocator } from './serviceLocator.js';
import * as appState from './appState.js'; // IMPORT appState directly
import logoSvgUrl from '../assets/svgs/logo.svg?raw'; // NEW: Vite ?raw import for SVG string
import { DEFAULT_DIAL_A_HUE } from './config/index.js';

export class DynamicStyleManager {
  constructor() {
    this.root = document.documentElement;
    this.dom = {};
    this.debug = false;
  }

  /**
   * Initializes the DynamicStyleManager.
   */
  init() {
    this.dom = serviceLocator.get('domElements');

    appState.subscribe('targetColorChanged', (payload) => this.handleTargetColorChange(payload));
    appState.subscribe('dialUpdated', (payload) => this.handleDialAUpdateForUIAccent(payload));

    this.injectLogoSVG();
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
  }

  /**
   * Injects the logo SVG into all designated containers.
   * Uses Vite's ?raw import to get SVG as a string.
   */
  injectLogoSVG() {
    // FIX: Select ALL logo containers, both desktop and mobile.
    const logoContainers = document.querySelectorAll('#logo-container, #mobile-logo-container');
    
    if (logoContainers.length === 0) {
      console.warn("[DynamicStyleManager] No logo containers found for injection.");
      return;
    }
    
    if (typeof logoSvgUrl !== 'string' || !logoSvgUrl.trim().startsWith('<svg')) {
        console.error('[DynamicStyleManager] CRITICAL FAILURE: `logoSvgUrl` is not a valid SVG string. Check import or build config.');
        logoContainers.forEach(container => {
            container.innerHTML = `<div style="border:1px dashed grey;display:flex;align-items:center;justify-content:center;color:grey;font-size:0.8em;text-align:center;width:100%;height:100%;">Logo Asset Error</div>`;
        });
        return;
    }
    
    logoContainers.forEach(container => {
        if (container.querySelector('svg.logo-svg')) {
            return; // Already injected, skip.
        }
        
        container.innerHTML = logoSvgUrl;
        const svgElement = container.querySelector('svg');

        if (svgElement) {
            svgElement.setAttribute('width', '100%');
            svgElement.setAttribute('height', '100%');
        }
    });
    
    this.applyInitialDynamicCSSVars();
  }

  /**
   * Applies all initial dynamic CSS variables based on the current appState.
   */
  applyInitialDynamicCSSVars() {
    ['env', 'lcd', 'logo', 'btn'].forEach(key => {
      const props = appState.getTargetColorProperties(key);
      if (props) {
        this.updateDynamicCSSVar(key, props.hue, props.isColorless);
      }
    });

    const dialAState = appState.getDialState('A');
    const initialDialAHue = dialAState ? dialAState.hue : DEFAULT_DIAL_A_HUE;
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