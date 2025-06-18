/**
 * @module startupPhase2
 * @description Declarative configuration for Phase 2 (Activating Backup Power Systems)
 * of the HUE 9000 startup sequence.
 */
export const phase2Config = {
  phase: 2,
  name: "BACKUP_POWER",
  terminalMessageKey: "P2_BACKUP_POWER",
  duration: 3.5, // Can likely be reduced now
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
      type: 'flicker',
      target: 'buttonGroup',
      groups: ['system-power'], // Main Power On/Off
      state: 'is-dimly-lit',
      profile: 'buttonFlickerToDimlyLit', // Approx 0.79s to completion now
      stagger: 0.05,
      position: 0.01 // Target completion at 0.80s (0.80 - 0.79 = 0.01)
    },
    {
      type: 'audio',
      soundKey: 'itemAppear',
      forceRestart: true,
      position: 0.80 // Sound at target completion time
    }
  ]
};