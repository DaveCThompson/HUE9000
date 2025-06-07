/**
 * @module startupPhase5
 * @description Declarative configuration for Phase 5 (Initializing Diagnostic Control Interface)
 * of the HUE 9000 startup sequence.
 */
export const phase5Config = {
  phase: 5,
  name: "DIAGNOSTIC_INTERFACE",
  terminalMessageKey: "P5_DIAGNOSTIC_INTERFACE",
  duration: 1.2,
  animations: [
    {
      type: 'tween',
      target: ['dialA', 'dialB'],
      vars: {
        autoAlpha: 0,
        duration: 1.2, // Must last the entire duration of the phase
        overwrite: true // Forcefully override any other JS trying to make these visible
      },
      position: 0
    },
    {
      type: 'tween',
      target: 'dimmingFactors',
      vars: {
        value: 0.275,
        duration: 1.0,
        ease: 'power1.inOut'
      },
      position: 0
    },
    {
      type: 'flicker',
      target: 'buttonGroup',
      groups: ['skill-scan-group', 'fit-eval-group'],
      state: 'is-dimly-lit',
      profile: 'buttonFlickerToDimlyLit',
      stagger: 0.04,
      position: 0.1
    }
  ]
};