/**
 * @module startupMobile
 * @description Declarative configuration for the unique, consolidated mobile startup sequence.
 */
import { selectorsForDimExitAnimation, LENS_STARTUP_TARGET_POWER } from './config/index.js';
import { serviceLocator } from './serviceLocator.js';
import * as appState from './appState.js';

export const mobileStartupPhase = {
  phase: 0,
  name: "MOBILE_SYSTEM_START",
  duration: 4.0, 
  animations: [
    { 
        type: 'tween', 
        target: 'dimmingFactors', 
        vars: { value: 0.0, duration: 2.5, ease: 'power2.inOut' }, 
        position: 0,
        deps: ['proxies', 'domElements'],
        applyFinalState: ([proxies, dom], animConfig) => {
            proxies.LReductionProxy.value = animConfig.vars.value;
            dom.root.style.setProperty('--startup-L-reduction-factor', proxies.LReductionProxy.value.toFixed(3));
        }
    },
    { 
        type: 'lensEnergize', 
        targetPower: 35, 
        durationMs: 2000, 
        position: 0.2,
        deps: ['lensManager'],
        applyFinalState: ([lensManager], animConfig) => {
            const power = animConfig.targetPower || LENS_STARTUP_TARGET_POWER;
            appState.setTrueLensPower(power);
            lensManager.directUpdateLensVisuals(power / 100);
        }
    },
    { 
        type: 'audio', 
        soundKey: 'lensStartup', 
        position: 0.2,
        deps: [],
        applyFinalState: () => {}
    },
    { 
        type: 'lcdPowerOn', 
        target: ['lcdA', 'lcdB'], 
        state: 'dimly-lit', 
        profile: 'lcdScreenFlickerToDimlyLit', 
        stagger: 0.15, 
        position: 0.5,
        deps: ['lcdUpdater', 'domElements'],
        applyFinalState: ([lcdUpdater, dom], animConfig) => {
            animConfig.target.forEach(targetId => {
                const el = dom[targetId];
                if (el) lcdUpdater.setLcdState(el, animConfig.state);
            });
        }
    },
    { 
        type: 'audio', 
        soundKey: 'lcdPowerOn', 
        forceRestart: true, 
        position: 0.5,
        deps: [],
        applyFinalState: () => {}
    },
    {
      type: 'call',
      function: (dom) => {
        document.querySelectorAll(selectorsForDimExitAnimation).forEach(el => el.classList.add('animate-on-dim-exit'));
        dom.body.classList.add('is-transitioning-from-dim');
        appState.setTheme('dark');
        serviceLocator.get('audioManager').play('themeEngage');
      },
      deps: ['domElements'],
      position: 1.8,
      applyFinalState: () => {
        appState.setTheme('dark');
      }
    },
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
        position: 1.8,
        applyFinalState: (deps, animConfig) => animConfig.function(...deps)
    }
  ]
};