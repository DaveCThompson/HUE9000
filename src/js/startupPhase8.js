/**
 * @module startupPhase8
 * @description Declarative configuration for Phase 8 (Initializing External Lighting Controls)
 * of the HUE 9000 startup sequence.
 */
export const phase8Config = {
  phase: 8,
  name: "EXTERNAL_LIGHTING_CONTROLS",
  terminalMessageKey: "P8_EXTERNAL_LIGHTING_CONTROLS",
  duration: 1.2,
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
      groups: ['light'],
      state: 'is-dimly-lit',
      profile: 'buttonFlickerToDimlyLit',
      stagger: 0.03,
      position: 0.1
    },
    {
      type: 'audio',
      soundKey: 'flickerToDim',
      position: 1.2 // This sound is fast, so a small offset is fine
    }
  ]
};