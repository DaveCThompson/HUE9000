/**
 * @module startupPhase8
 * @description Declarative configuration for Phase 8 (Initializing External Lighting Controls)
 * of the HUE 9000 startup sequence.
 */
export const phase8Config = {
  phase: 8,
  name: "EXTERNAL_LIGHTING_CONTROLS",
  terminalMessageKey: "P8_EXTERNAL_LIGHTING_CONTROLS",
  duration: 3.5, // Can likely be reduced now
  animations: [
    {
      type: 'tween',
      target: 'dimmingFactors',
      vars: {
        value: 0.00,
        duration: 1.0,
        ease: 'power1.inOut'
      },
      position: 0
    },
    {
      type: 'flicker',
      target: 'buttonGroup',
      groups: ['light'], // Aux Light buttons
      state: 'is-dimly-lit',
      profile: 'buttonFlickerToDimlyLit', // Approx 0.79s to completion now
      stagger: 0.03,
      position: 0.01 // Target completion at 0.80s (0.80 - 0.79 = 0.01)
    },
    {
      type: 'audio',
      soundKey: 'itemAppear',
      forceRestart: true,
      position: 0.80 // Sound at target completion time
    }
  ]
};