/**
 * @module startupPhase10
 * @description Declarative configuration for Phase 10 (Engaging Ambient Theme)
 * of the HUE 9000 startup sequence.
 */
export const phase10Config = {
  phase: 10,
  name: "THEME_TRANSITION",
  duration: 1.5,
  animations: [
    {
      type: 'call',
      function: (lcdUpdater, dom) => {
        const lcds = [dom.lcdA, dom.lcdB, dom.terminalContainer];
        lcds.forEach(lcd => {
          if (lcd) {
            lcdUpdater.setLcdState(lcd, 'active', { phaseContext: 'P10_ThemeTransition' });
          }
        });
      },
      deps: ['lcdUpdater', 'domElements'],
      position: 0
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
      position: 0.05 // Slightly delay theme change to ensure LCD state is set first
    },
    {
      type: 'audio',
      soundKey: 'lightsOn',
      position: 0.1 // Play sound concurrently with theme change
    },
    {
      type: 'flicker',
      target: 'buttonGroup',
      groups: ['env', 'lcd', 'logo', 'btn', 'skill-scan-group', 'fit-eval-group'],
      state: 'is-energized', // This will be split into selected/unselected by buttonManager
      profile: 'buttonFlickerFromDimlyLitToFullyLit', // A generic key, buttonManager will pick correct profile
      stagger: 0.03,
      position: 0.1
    }
  ]
};