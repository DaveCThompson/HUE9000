/**
 * @module startupPhase7
 * @description Declarative configuration for Phase 7 (Initializing Hue Correction Systems)
 * of the HUE 9000 startup sequence.
 */
export const phase7Config = {
  phase: 7,
  name: "HUE_CORRECTION_SYSTEMS",
  terminalMessageKey: "P7_HUE_CORRECTION_SYSTEMS", // Terminal message requested at T=0.
  duration: 3.5, // Phase duration.
  animations: [
    {
      type: 'tween',
      target: 'dimmingFactors',
      vars: {
        value: 0.075, 
        duration: 1.0,
        ease: 'power1.inOut'
      },
      position: 0 // Dimming factor animation starts at T=0.
    },
    {
      type: 'flicker',
      target: 'buttonGroup',
      groups: ['env', 'lcd', 'logo', 'btn'], // Hue Assignment buttons
      state: 'is-dimly-lit',
      profile: 'buttonFlickerToDimlyLit',
      stagger: 0.008, 
      position: 0.1 // Visual flicker for Hue Assignment buttons to dimly-lit starts at T=0.1s.
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