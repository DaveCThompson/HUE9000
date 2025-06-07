/**
 * @module startupPhase6
 * @description Declarative configuration for Phase 6 (Initializing Mood and Intensity Controls)
 * of the HUE 9000 startup sequence.
 */
export const phase6Config = {
  phase: 6,
  name: "MOOD_INTENSITY_CONTROLS",
  terminalMessageKey: "P6_MOOD_INTENSITY_CONTROLS",
  duration: 1.5,
  animations: [
    {
      type: 'tween',
      target: 'dimmingFactors',
      vars: {
        value: 0.225,
        duration: 1.0,
        ease: 'power1.inOut'
      },
      position: 0
    },
    {
      type: 'call',
      function: (dialManager) => dialManager.setDialsActiveState(true),
      deps: ['dialManager'],
      position: 0.1
    },
    {
      type: 'tween',
      target: ['dialA', 'dialB'],
      vars: {
        opacity: 1,
        duration: 0.5,
        ease: 'power1.out',
        stagger: 0.05
      },
      position: 0.1
    },
    {
      type: 'flicker',
      target: ['lcdA', 'lcdB'],
      state: 'dimly-lit',
      profile: 'lcdScreenFlickerToDimlyLit',
      stagger: 0.05,
      position: 0.2
    },
    {
      type: 'flicker',
      target: 'terminalContainer',
      state: 'dimly-lit',
      profile: 'terminalScreenFlickerToDimlyLit',
      position: 0.2
    }
  ]
};