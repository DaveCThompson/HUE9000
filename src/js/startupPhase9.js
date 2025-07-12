/**
 * @module startupPhase9
 * @description Declarative configuration for Phase 9 (Initializing External Lighting Controls)
 * of the HUE 9000 startup sequence. (Formerly P8)
 */
export const phase9Config = {
  phase: 9,
  name: "EXTERNAL_LIGHTING_CONTROLS",
  terminalMessageKey: "P9_EXTERNAL_LIGHTING_CONTROLS",
  duration: 3.5,
  animations: [
    {
      type: 'tween',
      target: 'dimmingFactors',
      vars: {
        value: 0.00,
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
      groups: ['light'], // Aux Light buttons
      state: 'is-dimly-lit',
      profile: 'buttonFlickerToDimlyLit',
      stagger: 0.03,
      position: 0.01,
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
      position: 0.80,
      deps: [],
      applyFinalState: () => {}
    }
  ]
};