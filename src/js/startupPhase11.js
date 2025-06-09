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
    }
    // REMOVED: The call to resizeAllCanvases was ineffective and is now handled
    // by a direct event subscription in DialController for greater robustness.
  ]
};