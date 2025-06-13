/**
 * @module startupPhase2
 * @description Declarative configuration for Phase 2 (Activating Backup Power Systems)
 * of the HUE 9000 startup sequence.
 */
export const phase2Config = {
  phase: 2,
  name: "BACKUP_POWER",
  terminalMessageKey: "P2_BACKUP_POWER", // Terminal message requested at T=0 by PhaseRunner.
  duration: 3.5, // Phase duration.
  animations: [
    {
      type: 'tween',
      target: 'dimmingFactors',
      vars: {
        value: 0.35, 
        duration: 1.0, 
        ease: 'power1.inOut'
      },
      position: 0 // Dimming factor animation starts at T=0.
    },
    {
      type: 'flicker',
      target: 'buttonGroup',
      groups: ['system-power'],
      state: 'is-dimly-lit',
      profile: 'buttonFlickerToDimlyLit',
      stagger: 0.05, 
      position: 0.1 // Main Power buttons' visual flicker to dimly-lit starts at T=0.1s.
    },
    {
      type: 'audio',
      soundKey: 'itemAppear', 
      forceRestart: true, // Added forceRestart
      // Sound for button appearance plays at T=1.3s. This explicit delay is timed
      // for its auditory peak to align with the visual stabilization of the flicker effect.
      position: 1.3 
    }
  ]
};