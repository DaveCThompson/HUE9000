/**
 * @module startupPhase10
 * @description Declarative configuration for Phase 10 (Engaging Ambient Theme)
 * of the HUE 9000 startup sequence.
 */
export const phase10Config = {
  phase: 10,
  name: "ENGAGING_AMBIENT_THEME", 
  // terminalMessageKey: "P10_ENGAGING_AMBIENT_THEME", // No terminal message specified for this phase.
  duration: 1.5, // Phase duration.
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
      position: 0.5 // LCD state cleanup call at T=0.5s. Note: was T=0 in original map, you set to 0.5.
    },
    {
      type: 'call',
      function: (dom, config, appState) => {
        document.querySelectorAll(config.selectorsForDimExitAnimation).forEach(el => {
          el.classList.add('animate-on-dim-exit');
        });
        dom.body.classList.add('is-transitioning-from-dim');
        appState.setTheme('dark'); // CSS theme transition (1.0s duration) begins.
      },
      deps: ['domElements', 'config', 'appState'],
      position: 0.5 // Theme change call at T=0.5s.
    },
    {
      type: 'flicker', // Energizing remaining buttons.
      target: 'buttonGroup',
      groups: ['env', 'lcd', 'logo', 'btn', 'skill-scan-group', 'fit-eval-group'],
      state: 'is-energized', 
      profile: 'buttonFlickerFromDimlyLitToFullyLit', 
      stagger: 0.03, 
      position: 0.6 // Visual flicker for button energizing starts at T=0.6s.
    },
    {
      type: 'audio',
      soundKey: 'themeEngage', 
      // Sound plays at T=0.6s, coinciding with the start of final button energizing
      // and shortly after the theme transition begins.
      position: 0.6 
    }
  ]
};