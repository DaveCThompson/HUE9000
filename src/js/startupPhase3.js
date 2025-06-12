/**
 * @module startupPhase3
 * @description Declarative configuration for Phase 3 (Main Power Online)
 * of the HUE 9000 startup sequence.
 */
export const phase3Config = {
  phase: 3,
  name: "MAIN_POWER_ONLINE",
  terminalMessageKey: "P3_MAIN_POWER_ONLINE",
  duration: 3.2,
  animations: [
    {
      type: 'tween',
      target: 'dimmingFactors',
      vars: {
        value: 0.325,
        duration: 1.0,
        ease: 'power1.inOut'
      },
      position: 0
    },
    {
      type: 'flicker',
      target: 'Main Power On', // Use aria-label for targeting
      state: 'is-energized is-selected',
      profile: 'buttonFlickerFromDimlyLitToFullyLitSelectedFast',
      position: 0.1
    },
    {
      type: 'flicker',
      target: 'Main Power Off', // Use aria-label for targeting
      state: 'is-energized',
      profile: 'buttonFlickerFromDimlyLitToFullyLitUnselectedFast',
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