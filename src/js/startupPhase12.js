/**
 * @module startupPhase12
 * @description Declarative configuration for Phase 12 (HUE 9000 Operational)
 * of the HUE 9000 startup sequence. (Formerly P11)
 */
export const phase12Config = {
  phase: 12,
  name: "SYSTEM_OPERATIONAL",
  terminalMessageKey: "P12_SYSTEM_OPERATIONAL",
  duration: 0.5,
  animations: [
    {
      type: 'call',
      function: (buttonManager) => {
        buttonManager.setGroupSelected('system-power', 'on');
        buttonManager.setGroupSelected('light', 'off');
        // Hue Assignment defaults are now set in Phase 8.
      },
      deps: ['buttonManager'],
      position: 0
    }
  ]
};