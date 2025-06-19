/**
 * @module startupPhase10
 * @description Declarative configuration for Phase 10 (Activating Auxiliary Lighting: Low Intensity)
 * of the HUE 9000 startup sequence. (Formerly P9)
 */
export const phase10Config = {
  phase: 10,
  name: "AUX_LIGHTING_LOW",
  terminalMessageKey: "P10_AUX_LIGHTING_LOW", 
  duration: 1.5, 
  animations: [
    {
      type: 'flicker',
      target: 'Auxiliary Light Low', 
      state: 'is-energized is-selected',
      profile: 'buttonFlickerFromDimlyLitToFullyLitSelected',
      position: 0.15
    },
    {
      type: 'flicker',
      target: 'Auxiliary Light High', 
      state: 'is-energized',
      profile: 'buttonFlickerFromDimlyLitToFullyLitUnselected',
      position: 0.15
    },
    {
      type: 'audio',
      soundKey: 'buttonEnergize',
      forceRestart: true,
      position: 0.15
    }
  ]
};