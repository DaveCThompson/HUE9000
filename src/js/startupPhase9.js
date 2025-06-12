/**
 * @module startupPhase9
 * @description Declarative configuration for Phase 9 (Activating Auxiliary Lighting: Low Intensity)
 * of the HUE 9000 startup sequence.
 */
export const phase9Config = {
  phase: 9,
  name: "AUX_LIGHTING_LOW",
  terminalMessageKey: "P9_AUX_LIGHTING_LOW",
  duration: 1.0,
  animations: [
    {
      type: 'flicker',
      target: 'Auxiliary Light Low', // Use aria-label for targeting
      state: 'is-energized is-selected',
      profile: 'buttonFlickerFromDimlyLitToFullyLitSelected',
      position: 0.1
    },
    {
      type: 'flicker',
      target: 'Auxiliary Light High', // Use aria-label for targeting
      state: 'is-energized',
      profile: 'buttonFlickerFromDimlyLitToFullyLitUnselected',
      position: 0.1
    }
    // FIX: Removed bigOn sound as requested
    // {
    //   type: 'audio',
    //   soundKey: 'bigOn',
    //   position: 0.15 // Manually offset sound to sync with visual peak
    // }
  ]
};