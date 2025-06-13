/**
 * @module startupPhase1
 * @description Declarative configuration for Phase 1 (Initializing Emergency Subsystems)
 * of the HUE 9000 startup sequence.
 */
export const phase1Config = {
  phase: 1,
  name: "EMERGENCY_SUBSYSTEMS",
  // Phase duration. Accommodates concurrent visual starts and a specifically timed sound.
  duration: 3.5, 

  specialTerminalFlicker: true, // Visuals for terminal (container & text flicker) start at T=0 of the phase.
  message: ["INITIATING STARTUP PROTOCOL"],

  animations: [
    {
      type: 'audio',
      soundKey: 'terminalBoot',
      // Sound plays at T=1.075s, timed to synchronize its impact with the terminal's visual appearance.
      position: 1.075 
    },
    {
      type: 'tween',
      target: 'dimmingFactors',
      vars: {
        value: 0.35, // Target L-reduction for P1
        duration: 1.0, // Duration of this specific tween
        ease: 'power1.inOut'
      },
      position: 0 // Dimming factor animation starts at T=0, concurrently with terminal visual flicker.
    },
    {
      type: 'tween',
      target: 'body',
      vars: {
        opacity: 1,
        duration: 0.3, // Duration of body fade-in
        ease: 'power1.inOut'
      },
      position: 0 // Body fade-in starts at T=0, concurrently with terminal visual flicker.
    }
  ]
};