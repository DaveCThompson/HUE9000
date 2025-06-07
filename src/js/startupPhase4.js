/**
 * @module startupPhase4
 * @description Declarative configuration for Phase 4 (Reactivating Optical Core)
 * of the HUE 9000 startup sequence.
 */
export const phase4Config = {
  phase: 4,
  name: "OPTICAL_CORE_REACTIVATE",
  terminalMessageKey: "P4_OPTICAL_CORE_REACTIVATE",
  duration: 1.7,
  animations: [
    {
      type: 'tween',
      target: 'dimmingFactors',
      vars: {
        value: 0.325, // No change from P3
        duration: 1.0,
        ease: 'power1.inOut'
      },
      position: 0
    },
    {
      type: 'lensEnergize',
      // targetPower and durationMs are read from config inside lensManager
      position: 0.1
    }
  ]
};