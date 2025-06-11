/**
 * @module startupPhase7
 * @description Declarative configuration for Phase 7 (Initializing Hue Correction Systems)
 * of the HUE 9000 startup sequence.
 */
export const phase7Config = {
  phase: 7,
  name: "HUE_CORRECTION_SYSTEMS",
  terminalMessageKey: "P7_HUE_CORRECTION_SYSTEMS",
  duration: 1.2,
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
      groups: ['env', 'lcd', 'logo', 'btn'],
      state: 'is-dimly-lit',
      profile: 'buttonFlickerToDimlyLit',
      stagger: 0.008,
      position: 0.1
    },
    {
      type: 'audio',
      soundKey: 'flickerToDim',
      position: 0.1
    }
  ]
};