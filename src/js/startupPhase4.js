/**
 * @module startupPhase4
 * @description Declarative configuration for Phase 4 (Reactivating Optical Core)
 * of the HUE 9000 startup sequence.
 */
import { LENS_STARTUP_TARGET_POWER } from './config/index.js';
import { appState } from './state/index.js'

export const phase4Config = {
  phase: 4,
  name: "OPTICAL_CORE_REACTIVATE",
  terminalMessageKey: "P4_OPTICAL_CORE_REACTIVATE", // Terminal message requested at T=0.
  duration: 3.5, // Phase duration.
  animations: [
    {
      type: 'tween',
      target: 'dimmingFactors',
      vars: {
        value: 0.325, 
        duration: 1.0,
        ease: 'power1.inOut'
      },
      position: 0,
      deps: ['proxies', 'domElements'],
      applyFinalState: ([proxies, dom], animConfig) => {
        proxies.LReductionProxy.value = animConfig.vars.value;
        dom.root.style.setProperty('--startup-L-reduction-factor', proxies.LReductionProxy.value.toFixed(3));
      }
    },
    {
      type: 'lensEnergize',
      // Lens energize visual sequence (ramp over config.LENS_STARTUP_RAMP_DURATION_MS) starts at T=0.1s.
      position: 0.1,
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
      // Sound plays at T=0.1s, coinciding with the start of the lens energize sequence.
      position: 0.1,
      deps: [],
      applyFinalState: () => {}
    }
  ]
};