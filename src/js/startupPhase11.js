/**
 * @module startupPhase11
 * @description Declarative configuration for Phase 11 (Engaging Ambient Theme)
 * of the HUE 9000 startup sequence. (Formerly P10)
 */
export const phase11Config = {
  phase: 11,
  name: "ENGAGING_AMBIENT_THEME", 
  duration: 1.5,
  animations: [
    {
      type: 'call',
      function: (lcdUpdater, dom) => {
        const lcds = [dom.lcdA, dom.lcdB, dom.terminalContainer];
        lcds.forEach(lcd => {
          if (lcd) {
            lcdUpdater.setLcdState(lcd, 'active', { phaseContext: 'P11_ThemeTransition' });
          }
        });
      },
      deps: ['lcdUpdater', 'domElements'],
      position: 0.5
    },
    {
      type: 'call',
      function: (dom, config, appState) => {
        document.querySelectorAll(config.selectorsForDimExitAnimation).forEach(el => {
          el.classList.add('animate-on-dim-exit');
        });
        dom.body.classList.add('is-transitioning-from-dim');
        appState.setTheme('dark');
      },
      deps: ['domElements', 'config', 'appState'],
      position: 0.5
    },
    {
      type: 'flicker',
      target: 'buttonGroup',
      groups: ['skill-scan-group', 'fit-eval-group'],
      state: 'is-energized', 
      profile: 'buttonFlickerFromDimlyLitToFullyLitUnselected', 
      stagger: 0.03, 
      position: 0.6
    },
    {
      type: 'audio',
      soundKey: 'themeEngage', 
      position: 0.6 
    }
  ]
};