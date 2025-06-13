/**
 * @module startupPhase6
 * @description Declarative configuration for Phase 6 (Initializing Mood and Intensity Controls)
 * of the HUE 9000 startup sequence.
 */
export const phase6Config = {
  phase: 6,
  name: "MOOD_INTENSITY_CONTROLS",
  terminalMessageKey: "P6_MOOD_INTENSITY_CONTROLS", // Terminal message requested at T=0.
  duration: 3.5, // Phase duration.
  animations: [
    {
      type: 'tween',
      target: 'dimmingFactors',
      vars: {
        value: 0.225, 
        duration: 1.0,
        ease: 'power1.inOut'
      },
      position: 0 // Dimming factor animation starts at T=0.
    },
    {
      type: 'call',
      function: (dialManager) => {
        if (dialManager && typeof dialManager.setDialsActiveState === 'function') {
          dialManager.setDialsActiveState(true); 
        }
      },
      deps: ['dialManager'],
      position: 0.5 // Dials (Mood & Intensity) become visually active at T=0.5s.
    },
    {
      type: 'audio',
      soundKey: 'itemAppear', 
      // Sound for dial appearance plays at T=1.8s. This explicit delay is timed for its auditory
      // peak to align with the visual stabilization of the dials becoming active (which starts at T=0.5s).
      position: 1.8 
    },
    {
      type: 'lcdPowerOn',
      target: ['lcdA', 'lcdB'], // Dial LCDs
      state: 'dimly-lit',
      profile: 'lcdScreenFlickerToDimlyLit',
      stagger: 0.05, 
      position: 1.5 // Dial LCDs' visual flicker to dimly-lit starts at T=1.5s.
    },
    //{ // This sound was commented out in your provided file.
    //  type: 'audio',
    //  soundKey: 'lcdPowerOn', 
    //  position: 1.5 // Intended to coincide with LCD visual power-on start.
    //}
  ]
};