/**
 * @module startupPhase6
 * @description Declarative configuration for Phase 6 (Initializing Mood and Intensity Controls)
 * of the HUE 9000 startup sequence.
 */

export const phase6Config = {
  phase: 6,
  name: "MOOD_INTENSITY_CONTROLS",
  terminalMessageKey: "P6_MOOD_INTENSITY_CONTROLS", 
  duration: 3.5, 
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
      type: 'call', // Dial activation visual (if any immediate effect)
      function: (dialManager) => {
        if (dialManager && typeof dialManager.setDialsActiveState === 'function') {
          dialManager.setDialsActiveState(true); 
        }
      },
      deps: ['dialManager'],
      position: 0.1 // Early dial activation
    },
    {
      type: 'lcdPowerOn', // Visual for LCDs
      target: ['lcdA', 'lcdB'], 
      state: 'dimly-lit',
      profile: 'lcdScreenFlickerToDimlyLit', // Takes ~1.35s
      stagger: 0.05, 
      position: 0.2 // Start LCD visuals slightly after dial activation call
    },
    { 
      type: 'audio', // Sound for LCDs
      soundKey: 'lcdPowerOn', 
      forceRestart: true,
      position: 0.2 // Sound concurrent with LCD visual start
    }
    // The original 'itemAppear' at 1.8s is removed. If a sound for the earlier
    // 'dialManager.setDialsActiveState(true)' at 0.1s is desired, it would be 'itemAppear' at 0.1s.
    // For now, focusing on LCDs having their own dedicated sound.
  ]
};