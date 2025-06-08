/**
 * @module startupPhase1
 * @description Declarative configuration for Phase 1 (Initializing Emergency Subsystems)
 * of the HUE 9000 startup sequence.
 */
export const phase1Config = {
  phase: 1,
  name: "EMERGENCY_SUBSYSTEMS",
  terminalMessageKey: "P1_EMERGENCY_SUBSYSTEMS", // This key now triggers the composed animation in PhaseRunner
  duration: 2.0, // Increased duration to accommodate the full animation
  animations: [
    {
      type: 'tween',
      target: 'dimmingFactors',
      vars: {
        value: 0.35,
        duration: 1.0,
        ease: 'power1.inOut'
      },
      position: 0
    },
    {
      type: 'tween',
      target: 'body',
      vars: {
        opacity: 1,
        duration: 0.3,
        ease: 'power1.inOut'
      },
      position: 0
    }
    // The complex flicker+typing animation is now handled by PhaseRunner
    // when it sees the terminalMessageKey for this phase.
  ]
};