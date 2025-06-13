/**
 * @module startupPhase9
 * @description Declarative configuration for Phase 9 (Activating Auxiliary Lighting: Low Intensity)
 * of the HUE 9000 startup sequence.
 */
export const phase9Config = {
  phase: 9,
  name: "AUX_LIGHTING_LOW",
  terminalMessageKey: "P9_AUX_LIGHTING_LOW", // Terminal message requested at T=0.
  duration: 3.5, // Phase duration.
  animations: [
    {
      type: 'flicker',
      target: 'Auxiliary Light Low', 
      state: 'is-energized is-selected',
      profile: 'buttonFlickerFromDimlyLitToFullyLitSelected', // Regular speed flicker.
      position: 0.1 // "LOW" button visual flicker to energized/selected starts at T=0.1s.
    },
    {
      type: 'flicker',
      target: 'Auxiliary Light High', 
      state: 'is-energized',
      profile: 'buttonFlickerFromDimlyLitToFullyLitUnselected', // Regular speed flicker.
      position: 0.1 // "HIGH" button visual flicker to energized starts at T=0.1s.
    },
    {
      type: 'audio',
      soundKey: 'buttonEnergize', 
      // Sound plays at T=0.25s, timed for its impact to align with the peak
      // of the regular button flicker animation (which starts at T=0.1s).
      position: 0.25 
    }
  ]
};