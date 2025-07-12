/**
 * @module startupPhase3
 * @description Declarative configuration for Phase 3 (Main Power Online)
 * of the HUE 9000 startup sequence.
 */
import { estimateFlickerDuration } from './config/index.js';

const TARGET_EVENT_TIME_P3 = 0.7; 
const FLICKER_SELECTED_FAST_DURATION_P3 = estimateFlickerDuration('buttonFlickerFromDimlyLitToFullyLitSelectedFast'); // Approx 0.81s
const FLICKER_UNSELECTED_FAST_DURATION_P3 = estimateFlickerDuration('buttonFlickerFromDimlyLitToFullyLitUnselectedFast'); // Approx 0.81s

export const phase3Config = {
  phase: 3,
  name: "MAIN_POWER_ONLINE",
  terminalMessageKey: "P3_MAIN_POWER_ONLINE", 
  duration: 3.5, 
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
      type: 'flicker',
      target: 'Main Power On', 
      state: 'is-energized is-selected',
      profile: 'buttonFlickerFromDimlyLitToFullyLitSelectedFast',
      position: TARGET_EVENT_TIME_P3 - FLICKER_SELECTED_FAST_DURATION_P3,
      deps: ['buttonManager'],
      applyFinalState: ([buttonManager], animConfig) => {
        const instance = buttonManager.getButtonByAriaLabel(animConfig.target);
        if(instance) {
            buttonManager.setButtonState(instance, animConfig.state, { skipAnimation: true, skipEcho: true });
        }
      }
    },
    {
      type: 'flicker',
      target: 'Main Power Off', 
      state: 'is-energized',
      profile: 'buttonFlickerFromDimlyLitToFullyLitUnselectedFast',
      position: TARGET_EVENT_TIME_P3 - FLICKER_UNSELECTED_FAST_DURATION_P3,
      deps: ['buttonManager'],
      applyFinalState: ([buttonManager], animConfig) => {
        const instance = buttonManager.getButtonByAriaLabel(animConfig.target);
        if(instance) {
            buttonManager.setButtonState(instance, animConfig.state, { skipAnimation: true, skipEcho: true });
        }
      }
    },
    {
      type: 'audio',
      soundKey: 'buttonEnergize', 
      position: TARGET_EVENT_TIME_P3,
      deps: [],
      applyFinalState: () => {}
    }
  ]
};