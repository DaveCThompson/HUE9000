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
    // REMOVED: The tween that made the dials appear too brightly and out of sync
    // with the global startup opacity has been removed. Their visibility is now
    // correctly handled by the main startup dimming factors.
    {
      // This single declarative action triggers the coordinated animation
      // in LcdUpdater.js for both the container flicker and content fade-in.
      type: 'lcdPowerOn',
      target: ['lcdA', 'lcdB'],
      state: 'dimly-lit',
      profile: 'lcdScreenFlickerToDimlyLit', // Profile for the containers
      stagger: 0.05,
      position: 0.2
    }
  ]
};