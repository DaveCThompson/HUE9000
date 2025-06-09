/**
 * @module startupPhase11
 * @description Declarative configuration for Phase 11 (HUE 9000 Operational)
 * of the HUE 9000 startup sequence.
 */
export const phase11Config = {
  phase: 11,
  name: "SYSTEM_OPERATIONAL",
  terminalMessageKey: "P11_SYSTEM_OPERATIONAL",
  duration: 0.5,
  animations: [
    {
      type: 'call',
      function: (buttonManager, config) => {
        buttonManager.setGroupSelected('system-power', 'on');
        buttonManager.setGroupSelected('light', 'off');
        Object.keys(config.DEFAULT_ASSIGNMENT_SELECTIONS).forEach(targetKey => {
          buttonManager.setGroupSelected(targetKey, config.DEFAULT_ASSIGNMENT_SELECTIONS[targetKey].toString());
        });
      },
      deps: ['buttonManager', 'config'],
      position: 0
    },
    // RESTORED FIX: The call to resizeAllCanvases was mistakenly removed.
    // This is the most robust place to call it, ensuring the dials are redrawn
    // with the final theme's CSS variables after all transitions are complete.
    {
      type: 'call',
      function: (dialManager) => dialManager.resizeAllCanvases(true),
      deps: ['dialManager'],
      position: 0.1
    }
  ]
};