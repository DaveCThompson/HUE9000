/**
 * @module startupPhase5
 * @description Declarative configuration for Phase 5 (Initializing Diagnostic Control Interface)
 * of the HUE 9000 startup sequence.
 */
export const phase5Config = {
  phase: 5,
  name: "DIAGNOSTIC_INTERFACE",
  terminalMessageKey: "P5_DIAGNOSTIC_INTERFACE",
  duration: 3.5, // Can likely be reduced now
  animations: [
    {
      type: 'tween',
      target: 'dimmingFactors',
      vars: {
        value: 0.275,
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
      groups: ['skill-scan-group', 'fit-eval-group'], // BTN1-4
      state: 'is-dimly-lit',
      profile: 'buttonFlickerToDimlyLit', // Approx 0.79s to completion now
      stagger: 0.00,
      position: 0.01, // Target completion at 0.80s (0.80 - 0.79 = 0.01)
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
      position: 0.80, // Sound at target completion time
      deps: [],
      applyFinalState: () => {}
    }
  ]
};