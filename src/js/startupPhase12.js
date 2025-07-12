/**
 * @module startupPhase12
 * @description Declarative configuration for Phase 12 (Engaging Ambient Theme)
 * of the HUE 9000 startup sequence.
 */
import * as appState from './appState.js';

export const phase12Config = {
  phase: 12,
  name: "ENGAGING_AMBIENT_THEME", 
  duration: 1.5,
  animations: [
    {
      type: 'call',
      function: (lcdUpdater, dom) => {
        const lcds = [dom.lcdA, dom.lcdB, dom.terminalContainer];
        lcds.forEach(lcd => {
          if (lcd) {
            lcdUpdater.setLcdState(lcd, 'active', { phaseContext: 'P12_ThemeTransition' });
          }
        });
      },
      deps: ['lcdUpdater', 'domElements'],
      position: 0.5,
      applyFinalState: (deps, animConfig) => animConfig.function(...deps)
    },
    {
      type: 'call',
      function: (dom, config) => {
        document.querySelectorAll(config.selectorsForDimExitAnimation).forEach(el => {
          el.classList.add('animate-on-dim-exit');
        });
        dom.body.classList.add('is-transitioning-from-dim');
        appState.setTheme('dark');
      },
      deps: ['domElements', 'config'],
      position: 0.5,
      applyFinalState: (deps) => {
          // In skip mode, we just set the theme directly without transition classes.
          appState.setTheme('dark');
      }
    },
    {
      type: 'audio',
      soundKey: 'themeEngage', 
      position: 0.6,
      deps: [],
      applyFinalState: () => {}
    }
  ]
};