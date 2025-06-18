/**
 * @module startupPhase7
 * @description Declarative configuration for Phase 7 (Initializing Hue Correction Systems)
 * of the HUE 9000 startup sequence.
 */
export const phase7Config = {
  phase: 7,
  name: "HUE_CORRECTION_SYSTEMS",
  terminalMessageKey: "P7_HUE_CORRECTION_SYSTEMS",
  duration: 3.5, // Can likely be reduced now
  animations: [
    {
      type: 'tween',
      target: 'dimmingFactors',
      vars: {
        value: 0.075,
        duration: 1.0,
        ease: 'power1.inOut'
      },
      position: 0
    },
    {
      type: 'flicker',
      target: 'buttonGroup',
      groups: ['env', 'lcd', 'logo', 'btn'], // Hue Assignment buttons
      state: 'is-dimly-lit',
      profile: 'buttonFlickerToDimlyLit', // Approx 0.79s to completion now
      stagger: 0.0,
      // Target completion for this large group slightly later, e.g., 0.90s
      // New position: 0.90 - 0.79 = 0.11s
      position: 0.11
    },
    {
      type: 'audio',
      soundKey: 'itemAppear',
      forceRestart: true,
      position: 0.90 // Sound at target completion time
    }
  ]
};