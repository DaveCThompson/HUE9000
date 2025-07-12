/**
 * @module startupPhase11
 * @description Declarative configuration for Phase 11 (Activating Auxiliary Lighting: Low Intensity)
 * of the HUE 9000 startup sequence.
 */
export const phase11Config = {
  phase: 11,
  name: "AUX_LIGHTING_LOW",
  terminalMessageKey: "P11_AUX_LIGHTING_LOW", 
  duration: 2.5, 
  animations: [
    {
      type: 'flicker',
      target: 'Auxiliary Light Low', 
      state: 'is-energized is-selected',
      profile: 'buttonFlickerFromDimlyLitToFullyLitSelected',
      position: 0.15,
      deps: ['buttonManager'],
      applyFinalState: ([buttonManager], animConfig) => {
        const instance = buttonManager.getButtonByAriaLabel(animConfig.target);
        if(instance) {
            buttonManager.setButtonState(instance, animConfig.state, { skipAnimation: true, skipEcho: true });
        }
      }
    },
    {
      type: 'flicker',
      target: 'Auxiliary Light High', 
      state: 'is-energized',
      profile: 'buttonFlickerFromDimlyLitToFullyLitUnselected',
      position: 0.15,
      deps: ['buttonManager'],
      applyFinalState: ([buttonManager], animConfig) => {
        const instance = buttonManager.getButtonByAriaLabel(animConfig.target);
        if(instance) {
            buttonManager.setButtonState(instance, animConfig.state, { skipAnimation: true, skipEcho: true });
        }
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