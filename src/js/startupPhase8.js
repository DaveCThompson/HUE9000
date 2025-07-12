/**
 * @module startupPhase8
 * @description Declarative configuration for Phase 8 (Energizing Hue Assignment Matrix)
 * of the HUE 9000 startup sequence.
 */
export const phase8Config = {
  phase: 8,
  name: "HUE_ASSIGNMENT_MATRIX",
  terminalMessageKey: "P8_HUE_ASSIGNMENT_MATRIX",
  duration: 3.5,
  animations: [
    {
      type: 'tween',
      target: 'dimmingFactors',
      vars: {
        value: 0.05,
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
      groups: ['env', 'lcd', 'logo', 'btn'],
      state: 'is-energized',
      profile: 'buttonFlickerFromDimlyLitToFullyLitUnselected',
      stagger: 0.00,
      position: 0.1,
      deps: ['buttonManager'],
      applyFinalState: ([buttonManager], animConfig) => {
        const buttons = buttonManager.getButtonsByGroupIds(animConfig.groups);
        buttons.forEach(el => {
            buttonManager.setButtonState(el, animConfig.state, { skipAnimation: true, skipEcho: true });
        });
      }
    },
    {
      type: 'call',
      function: (buttonManager, config) => {
        Object.keys(config.DEFAULT_ASSIGNMENT_SELECTIONS).forEach(targetKey => {
          buttonManager.setGroupSelected(targetKey, config.DEFAULT_ASSIGNMENT_SELECTIONS[targetKey].toString());
        });
      },
      deps: ['buttonManager', 'config'],
      position: 1.2,
      applyFinalState: ([buttonManager, config]) => {
          Object.keys(config.DEFAULT_ASSIGNMENT_SELECTIONS).forEach(targetKey => {
            buttonManager.setGroupSelected(targetKey, config.DEFAULT_ASSIGNMENT_SELECTIONS[targetKey].toString(), { skipAnimation: true, skipEcho: true });
        });
      }
    },
    {
      type: 'audio',
      soundKey: 'buttonEnergize',
      forceRestart: true,
      position: 0.15,
      deps: [],
      applyFinalState: () => {}
    }
  ]
};