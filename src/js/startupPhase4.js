/**
 * @module startupPhase4
 * @description Declarative configuration for Phase 4 (Reactivating Optical Core)
 * of the HUE 9000 startup sequence.
 */
export const phase4Config = {
  phase: 4,
  name: "OPTICAL_CORE_REACTIVATE",
  terminalMessageKey: "P4_OPTICAL_CORE_REACTIVATE", // Terminal message requested at T=0.
  duration: 4.5, // Phase duration.
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
      type: 'lensEnergize',
      // Lens energize visual sequence (ramp over config.LENS_STARTUP_RAMP_DURATION) starts at T=0.1s.
      position: 0.1 
    },
    {
      type: 'audio',
      soundKey: 'lensStartup',
      // Sound plays at T=0.1s, coinciding with the start of the lens energize sequence.
      position: 0.1 
    }
  ]
};