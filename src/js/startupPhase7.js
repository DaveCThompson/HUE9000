/**
 * @module startupPhase7
 * @description Declarative configuration for Phase 7 (Initializing Mood and Intensity Controls)
 * of the HUE 9000 startup sequence.
 */

export const phase7Config = {
  phase: 7,
  name: "MOOD_INTENSITY_CONTROLS",
  terminalMessageKey: "P7_MOOD_INTENSITY_CONTROLS", 
  duration: 3.5, 
  animations: [
    {
      type: 'tween',
      target: 'dimmingFactors',
      vars: {
        value: 0.225, 
        duration: 1.0,
        ease: 'power1.inOut'
      },
      position: 0,
      deps: ['proxies', 'domElements'],
      applyFinalState: ([proxies, dom], animConfig) => {
        proxies.LReductionProxy.value = animConfig.vars.value;
        dom.root.style.setProperty('--startup-L-reduction-factor', proxies.LReductionProxy.value.toFixed(3));
      }
    },
    {
      type: 'call', // Dial activation visual (if any immediate effect)
      function: (dialManager) => {
        if (dialManager && typeof dialManager.setDialsActiveState === 'function') {
          dialManager.setDialsActiveState(true); 
        }
      },
      deps: ['dialManager'],
      position: 0.1, // Early dial activation
      applyFinalState: (deps, animConfig) => animConfig.function(...deps)
    },
    {
      type: 'lcdPowerOn', // Visual for LCDs
      target: ['lcdA', 'lcdB'], 
      state: 'dimly-lit',
      profile: 'lcdScreenFlickerToDimlyLit', // Approx 0.83s duration
      stagger: 0.00, 
      position: 0.2, // Start LCD visuals slightly after dial activation call
      deps: ['lcdUpdater', 'domElements'],
      applyFinalState: ([lcdUpdater, dom], animConfig) => {
        animConfig.target.forEach(targetId => {
            const el = dom[targetId];
            if (el) lcdUpdater.setLcdState(el, animConfig.state);
        });
      }
    },
    { 
      type: 'audio', // Sound for LCDs powering on
      soundKey: 'lcdPowerOn', 
      forceRestart: true,
      position: 0.24, // Sound concurrent with LCD visual start
      deps: [],
      applyFinalState: () => {}
    },
    {
      type: 'audio', // The "item appeared" sound, consistent with other phases.
      soundKey: 'itemAppear',
      forceRestart: true,
      // Timed to play upon completion of the LCD flicker (0.2s start + ~0.83s duration = ~1.03s)
      position: 0.5,
      deps: [],
      applyFinalState: () => {}
    }
  ]
};