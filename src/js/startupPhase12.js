/**
 * @module startupPhase12
 * @description Declarative configuration for Phase 12 (HUE 9000 Operational)
 * of the HUE 9000 startup sequence. (Formerly P11)
 */
import { FINAL_BUTTON_STATES } from './config/index.js';
import { ButtonStates } from './buttonManager.js';

export const phase12Config = {
  phase: 12,
  name: "SYSTEM_OPERATIONAL",
  terminalMessageKey: "P12_SYSTEM_OPERATIONAL",
  duration: 0.5,
  animations: [
    {
      type: 'call',
      function: (buttonManager) => {
        Object.entries(FINAL_BUTTON_STATES).forEach(([groupId, value]) => {
          buttonManager.setGroupSelected(groupId, value);
        });
      },
      deps: ['buttonManager'],
      position: 0,
      applyFinalState: ([buttonManager]) => {
        Object.entries(FINAL_BUTTON_STATES).forEach(([groupId, value]) => {
            // Use the public API to set the final selected state for the group.
            buttonManager.setGroupSelected(groupId, value, { skipAnimation: true, skipEcho: true });
        });
      }
    }
  ]
};