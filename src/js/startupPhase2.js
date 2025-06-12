/**
 * @module startupPhase2
 * @description Declarative configuration for Phase 2 (Activating Backup Power Systems)
 * of the HUE 9000 startup sequence.
 */
export const phase2Config = {
  phase: 2,
  name: "BACKUP_POWER",
  terminalMessageKey: "P2_BACKUP_POWER",
  duration: 2.2,
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
      groups: ['system-power'],
      state: 'is-dimly-lit',
      profile: 'buttonFlickerToDimlyLit',
      stagger: 0.05,
      position: 0.1
    },
    {
      type: 'audio',
      soundKey: 'flickerToDim',
      position: 1.2 // Manually offset sound to sync with visual peak
    }
  ]
};