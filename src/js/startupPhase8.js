/**
 * @module startupPhase8
 * @description Declarative configuration for Phase 8 (Initializing External Lighting Controls)
 * of the HUE 9000 startup sequence.
 */
export const phase8Config = {
  phase: 8,
  name: "EXTERNAL_LIGHTING_CONTROLS",
  terminalMessageKey: "P8_EXTERNAL_LIGHTING_CONTROLS", // Terminal message requested at T=0.
  duration: 3.5, // Phase duration.
  animations: [
    {
      type: 'tween',
      target: 'dimmingFactors',
      vars: {
        value: 0.00, // Final L-reduction.
        duration: 1.0,
        ease: 'power1.inOut'
      },
      position: 0 // Dimming factor animation starts at T=0.
    },
    {
      type: 'flicker',
      target: 'buttonGroup',
      groups: ['light'], // Aux Light buttons
      state: 'is-dimly-lit',
      profile: 'buttonFlickerToDimlyLit',
      stagger: 0.03, 
      position: 0.1 // Visual flicker for Aux Light buttons to dimly-lit starts at T=0.1s.
    },
    {
      type: 'audio',
      soundKey: 'itemAppear', 
      // Sound for button appearance plays at T=1.3s. This explicit delay is timed
      // for its auditory peak to align with the visual stabilization of the flicker effect.
      position: 1.3 
    }
  ]
};