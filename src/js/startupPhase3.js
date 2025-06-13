/**
 * @module startupPhase3
 * @description Declarative configuration for Phase 3 (Main Power Online)
 * of the HUE 9000 startup sequence.
 */
export const phase3Config = {
  phase: 3,
  name: "MAIN_POWER_ONLINE",
  terminalMessageKey: "P3_MAIN_POWER_ONLINE", // Terminal message requested at T=0.
  duration: 3.5, // Phase duration.
  animations: [
    {
      type: 'tween',
      target: 'dimmingFactors',
      vars: {
        value: 0.325, 
        duration: 1.0,
        ease: 'power1.inOut'
      },
      position: 0 // Dimming factor animation starts at T=0.
    },
    {
      type: 'flicker',
      target: 'Main Power On', 
      state: 'is-energized is-selected',
      profile: 'buttonFlickerFromDimlyLitToFullyLitSelectedFast', // Fast flicker profile.
      position: 0.1 // "ON" button visual flicker to energized/selected starts at T=0.1s.
    },
    {
      type: 'flicker',
      target: 'Main Power Off', 
      state: 'is-energized',
      profile: 'buttonFlickerFromDimlyLitToFullyLitUnselectedFast', // Fast flicker profile.
      position: 0.1 // "OFF" button visual flicker to energized starts at T=0.1s.
    },
    {
      type: 'audio',
      soundKey: 'buttonEnergize', 
      // Sound plays at T=0.15s, timed for its impact to align with the peak
      // of the "Fast" button flicker animation (which starts at T=0.1s).
      position: 0.15 
    }
  ]
};