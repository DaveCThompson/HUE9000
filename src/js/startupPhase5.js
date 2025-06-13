/**
 * @module startupPhase5
 * @description Declarative configuration for Phase 5 (Initializing Diagnostic Control Interface)
 * of the HUE 9000 startup sequence.
 */
export const phase5Config = {
  phase: 5,
  name: "DIAGNOSTIC_INTERFACE",
  terminalMessageKey: "P5_DIAGNOSTIC_INTERFACE", // Terminal message requested at T=0.
  duration: 3.5, // Phase duration.
  animations: [
    {
      type: 'tween',
      target: 'dimmingFactors',
      vars: {
        value: 0.275, 
        duration: 1.0,
        ease: 'power1.inOut'
      },
      position: 0 // Dimming factor animation starts at T=0.
    },
    {
      type: 'flicker',
      target: 'buttonGroup',
      groups: ['skill-scan-group', 'fit-eval-group'], // BTN1-4
      state: 'is-dimly-lit',
      profile: 'buttonFlickerToDimlyLit',
      stagger: 0.04, 
      position: 0.1, // Visual flicker for BTN1-4 to dimly-lit starts at T=0.1s.
    },
    {
      type: 'audio',
      soundKey: 'itemAppear', 
      forceRestart: true, // Added forceRestart
      // Sound for button appearance plays at T=1.3s. This explicit delay is timed
      // for its auditory peak to align with the visual stabilization of the flicker effect.
      position: 1.3 
    }
  ]
};