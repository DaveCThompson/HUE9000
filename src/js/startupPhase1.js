/**
 * @module startupPhase1
 * @description Declarative configuration for Phase 1 (Initializing Emergency Subsystems)
 * of the HUE 9000 startup sequence.
 */
export const phase1Config = {
  phase: 1,
  name: "EMERGENCY_SUBSYSTEMS",
  terminalMessageKey: "P1_EMERGENCY_SUBSYSTEMS",
  duration: 1.2,
  animations: [
    {
      type: 'tween',
      target: 'dimmingFactors',
      vars: {
        value: 0.39,
        duration: 1.0,
        ease: 'power1.inOut'
      },
      position: 0
    },
    {
      // This tween is to ensure the body fades in when in auto-play mode,
      // where it starts at opacity 0.
      type: 'tween',
      target: 'body',
      vars: {
        opacity: 1,
        duration: 0.3,
        ease: 'power1.inOut'
      },
      position: 0
    },
    {
      // This flicker provides the necessary duration/complexity to prevent
      // the phase timeline from completing too early and hanging the FSM.
      type: 'flicker',
      target: 'terminalLcdContentElement',
      state: 'dimly-lit', // Not used by text flicker, but for consistency
      profile: 'textFlickerToDimlyLit',
      position: 0.1
    }
  ]
};