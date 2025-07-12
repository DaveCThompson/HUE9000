/**
 * @module startupPhase1
 * @description Declarative configuration for Phase 1 (Initializing Emergency Subsystems)
 * of the HUE 9000 startup sequence.
 */
export const phase1Config = {
  phase: 1,
  name: "EMERGENCY_SUBSYSTEMS",
  // Phase duration. Accommodates concurrent visual starts and a specifically timed sound.
  duration: 3.5, 

  // The text flicker is handled by TerminalManager, triggered by this message key.
  terminalMessageKey: "P1_EMERGENCY_SUBSYSTEMS",

  animations: [
    {
      type: 'lcdPowerOn',
      target: 'terminalContainer',
      state: 'dimly-lit',
      profile: 'terminalScreenFlickerToDimlyLit',
      position: 0,
      deps: ['lcdUpdater', 'domElements'],
      applyFinalState: ([lcdUpdater, dom], animConfig) => {
        const el = dom[animConfig.target];
        if (el) lcdUpdater.setLcdState(el, animConfig.state);
      }
    },
    {
      type: 'audio',
      soundKey: 'terminalBoot',
      position: 1.075,
      deps: [],
      applyFinalState: () => {} // No-op for transient sound effects
    },
    {
      type: 'tween',
      target: 'dimmingFactors',
      vars: {
        value: 0.35, // Target L-reduction for P1
        duration: 1.0, // Duration of this specific tween
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
      type: 'tween',
      target: 'body',
      vars: {
        opacity: 1,
        duration: 0.3, // Duration of body fade-in
        ease: 'power1.inOut'
      },
      position: 0,
      deps: ['domElements'],
      applyFinalState: ([dom], animConfig) => {
        dom.body.style.opacity = animConfig.vars.opacity;
      }
    },
    {
      type: 'call',
      function: (disruptionManager) => {
        disruptionManager.triggerDisruption();
      },
      deps: ['disruptionManager'],
      position: 1.2,
      applyFinalState: () => {} // No-op for transient visual effects
    }
  ]
};