/**
 * @module DynamicStyleManager
 * @description Manages dynamic CSS custom properties for hue assignments and the UI accent color.
 */
import { serviceLocator } from './serviceLocator.js';
import { appState } from './state/index.js';
import logoSvgUrl from '../assets/svgs/logo.svg?raw';
import { DEFAULT_DIAL_A_HUE } from './config/index.js';

export class DynamicStyleManager {
  constructor() {
    this.root = document.documentElement;
    this.dom = {};
  }

  init() {
    this.dom = serviceLocator.get('domElements');
    appState.subscribe('targetColorChanged', (payload) => this.handleTargetColorChange(payload));
    appState.subscribe('dialUpdated', (payload) => this.handleDialAUpdateForUIAccent(payload));
    this.injectLogoSVG();
  }

  updateDynamicCSSVar(targetKey, hueValue, isColorless) {
    if (!this.root) return;
    const normalizedHue = hueValue === null ? 0 : ((Number(hueValue) % 360) + 360) % 360;
    const baseChromas = { env: 0.039, logo: 0.099, 'ui-accent': 0.20, btn: 0.15, lcd: 0.08 };
    const intendedActiveChroma = parseFloat(getComputedStyle(this.root).getPropertyValue(`--dynamic-${targetKey}-chroma-base`).trim()) || baseChromas[targetKey] || 0.1;
    const chromaToSet = isColorless ? 0 : intendedActiveChroma;
    this.root.style.setProperty(`--dynamic-${targetKey}-hue`, normalizedHue.toFixed(1));
    this.root.style.setProperty(`--dynamic-${targetKey}-chroma`, chromaToSet.toFixed(4));
  }

  injectLogoSVG() {
    const logoContainers = document.querySelectorAll('#logo-container, #mobile-logo-container');
    if (logoContainers.length === 0) return;
    if (typeof logoSvgUrl !== 'string' || !logoSvgUrl.trim().startsWith('<svg')) {
        logoContainers.forEach(container => {
            container.innerHTML = `<div style="border:1px dashed grey;display:flex;align-items:center;justify-content:center;color:grey;font-size:0.8em;text-align:center;width:100%;height:100%;">Logo Asset Error</div>`;
        });
        return;
    }
    logoContainers.forEach(container => {
        if (container.querySelector('svg.logo-svg')) return;
        container.innerHTML = logoSvgUrl;
        const svgElement = container.querySelector('svg');
        if (svgElement) {
            svgElement.setAttribute('width', '100%');
            svgElement.setAttribute('height', '100%');
        }
    });
    this.applyInitialDynamicCSSVars();
  }

  applyInitialDynamicCSSVars() {
    ['env', 'lcd', 'logo', 'btn'].forEach(key => {
      const props = appState.getTargetColorProperties(key);
      if (props) this.updateDynamicCSSVar(key, props.hue, props.isColorless);
    });
    const dialAState = appState.getDialState('A');
    const initialDialAHue = dialAState ? dialAState.hue : DEFAULT_DIAL_A_HUE;
    this.updateDynamicCSSVar('ui-accent', initialDialAHue, false);
  }

  handleTargetColorChange(payload) {
    if (!payload || !payload.targetKey) return;
    if (payload.targetKey === 'all') {
      ['env', 'lcd', 'logo', 'btn'].forEach(key => {
        this.updateDynamicCSSVar(key, payload.hue, payload.isColorless);
      });
    } else {
      this.updateDynamicCSSVar(payload.targetKey, payload.hue, payload.isColorless);
    }
  }

  handleDialAUpdateForUIAccent(payload) {
    if (payload && payload.id === 'A' && payload.state) {
      this.updateDynamicCSSVar('ui-accent', payload.state.hue, false);
    }
  }
}