/**
 * @module startupPhase9
 * @description Declarative configuration for Phase 9 (Activating Auxiliary Lighting: Low Intensity)
 * of the HUE 9000 startup sequence.
 */

export const phase9Config = {
  phase: 9,
  name: "AUX_LIGHTING_LOW",
  terminalMessageKey: "P9_AUX_LIGHTING_LOW", 
  duration: 3.5, 
  animations: [
    {
      type: 'flicker',
      target: 'Auxiliary Light Low', 
      state: 'is-energized is-selected',
      profile: 'buttonFlickerFromDimlyLitToFullyLitSelected', // Takes ~0.99s
      position: 0.15 // Start visual flicker early
    },
    {
      type: 'flicker',
      target: 'Auxiliary Light High', 
      state: 'is-energized',
      profile: 'buttonFlickerFromDimlyLitToFullyLitUnselected', // Takes ~0.99s
      position: 0.15 // Start visual flicker early (concurrent with Low)
    },
    {
      type: 'audio',
      soundKey: 'buttonEnergize', 
      position: 0.15 // Start sound concurrently with visual flickers
    }
  ]
};