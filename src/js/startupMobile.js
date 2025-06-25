/**
 * @module startupMobile
 * @description Declarative configuration for the unique, consolidated mobile startup sequence.
 */
import { selectorsForDimExitAnimation } from './config/index.js';
import { serviceLocator } from './serviceLocator.js';

export const mobileStartupPhase = {
  phase: 0,
  name: "MOBILE_SYSTEM_START",
  duration: 4.0, 
  animations: [
    { type: 'tween', target: 'dimmingFactors', vars: { value: 0.0, duration: 2.5, ease: 'power2.inOut' }, position: 0 },
    { type: 'lensEnergize', targetPower: 35, durationMs: 2000, position: 0.2 },
    { type: 'audio', soundKey: 'lensStartup', position: 0.2 },
    { type: 'lcdPowerOn', target: ['lcdA', 'lcdB'], state: 'dimly-lit', profile: 'lcdScreenFlickerToDimlyLit', stagger: 0.15, position: 0.5 },
    { type: 'audio', soundKey: 'lcdPowerOn', forceRestart: true, position: 0.5 },
    // Initiate a controlled theme transition.
    {
      type: 'call',
      function: (dom, appState) => {
        document.querySelectorAll(selectorsForDimExitAnimation).forEach(el => el.classList.add('animate-on-dim-exit'));
        dom.body.classList.add('is-transitioning-from-dim');
        appState.setTheme('dark');
        serviceLocator.get('audioManager').play('themeEngage');
      },
      deps: ['domElements', 'appState'],
      position: 1.8 
    },
    // IMPROVEMENT: Set the final, correct state for the LCDs, including ambient resonance.
    {
        type: 'call',
        function: (lcdUpdater, dom) => {
            [dom.lcdA, dom.lcdB].forEach(lcd => {
                if (lcd) {
                    lcdUpdater.setLcdState(lcd, 'active');
                    // This is the crucial step to make the LCDs feel "alive" post-startup.
                    lcd.classList.add('is-resonating'); 
                }
            });
        },
        deps: ['lcdUpdater', 'domElements'],
        position: 1.8
    }
  ]
};