/**
 * @module startupPhase6
 * @description Declarative configuration for Phase 6 (Energizing Diagnostic Interface)
 * of the HUE 9000 startup sequence.
 */
export const phase6Config = {
  phase: 6,
  name: "ENERGIZE_DIAGNOSTIC_INTERFACE",
  terminalMessageKey: "P6_ENERGIZE_DIAGNOSTIC_INTERFACE",
  duration: 2.0, // Snappy duration for rhythm
  animations: [
    {
      type: 'flicker',
      target: 'buttonGroup',
      groups: ['skill-scan-group', 'fit-eval-group'],
      state: 'is-energized',
      profile: 'buttonFlickerFromDimlyLitToFullyLitUnselected',
      stagger: 0.03,
      position: 0.1,
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
      soundKey: 'buttonEnergize',
      forceRestart: true,
      position: 0.15,
      deps: [],
      applyFinalState: () => {}
    }
  ]
};