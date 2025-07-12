/**
 * @module startupPhase12
 * @description Declarative configuration for Phase 12 (HUE 9000 Operational)
 * of the HUE 9000 startup sequence. (Formerly P11)
 */
import { FINAL_BUTTON_STATES } from './config/sequences.js';

export const phase12Config = {
  phase: 12,
  name: "SYSTEM_OPERATIONAL",
  terminalMessageKey: "P12_SYSTEM_OPERATIONAL",
  duration: 0.5,
  animations: [
    {
      type: 'call',
      function: (buttonManager) => {
        // REFACTORED: Read final states from a declarative config object.
        Object.entries(FINAL_BUTTON_STATES).forEach(([groupId, value]) => {
          buttonManager.setGroupSelected(groupId, value);
        });
        // Hue Assignment defaults are now set in Phase 8.
      },
      deps: ['buttonManager'],
      position: 0
    }
  ]
};