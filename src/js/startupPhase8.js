/**
 * @module startupPhase8
 * @description Declarative configuration for Phase 8 (Initializing Hue Correction Systems)
 * of the HUE 9000 startup sequence.
 */
export const phase8Config = {
  phase: 8,
  name: "HUE_CORRECTION_SYSTEMS",
  terminalMessageKey: "P8_HUE_CORRECTION_SYSTEMS",
  duration: 3.5, // Can likely be reduced now
  animations: [
    {
      type: 'tween',
      target: 'dimmingFactors',
      vars: {
        value: 0.075,
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
      type: 'flicker',
      target: 'buttonGroup',
      groups: ['env', 'lcd', 'logo', 'btn'], // Hue Assignment buttons
      state: 'is-dimly-lit',
      profile: 'buttonFlickerToDimlyLit', // Approx 0.79s to completion now
      stagger: 0.025,
      // Target completion for this large group slightly later, e.g., 0.90s
      // New position: 0.90 - 0.79 = 0.11s
      position: 0.11,
      deps: ['buttonManager'],
      applyFinalState: ([buttonManager], animConfig) => {
        const buttons = buttonManager.getButtonsByGroupIds(animConfig.groups);
        buttons.forEach(el => {
            const instance = buttonManager.getButtonInstance(el);
            if(instance) {
                buttonManager.setButtonState(instance, animConfig.state, { skipAnimation: true, skipEcho: true });
            }
        });
      }
    },
    {
      type: 'audio',
      soundKey: 'itemAppear',
      forceRestart: true,
      position: 0.90, // Sound at target completion time
      deps: [],
      applyFinalState: () => {}
    }
  ]
};