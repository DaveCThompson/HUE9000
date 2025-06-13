/**
 * @module startupPhase11
 * @description Declarative configuration for Phase 11 (HUE 9000 Operational)
 * of the HUE 9000 startup sequence.
 */
export const phase11Config = {
  phase: 11,
  name: "SYSTEM_OPERATIONAL",
  terminalMessageKey: "P11_SYSTEM_OPERATIONAL", // Terminal message requested at T=0.
  duration: 0.5, // Phase duration (short, for finalization).
  animations: [
    // FSM entry action `_performThemeTransitionCleanup` runs before these animations.
    {
      type: 'call',
      function: (buttonManager, config) => {
        buttonManager.setGroupSelected('system-power', 'on');
        buttonManager.setGroupSelected('light', 'off');
        Object.keys(config.DEFAULT_ASSIGNMENT_SELECTIONS).forEach(targetKey => {
          buttonManager.setGroupSelected(targetKey, config.DEFAULT_ASSIGNMENT_SELECTIONS[targetKey].toString());
        });
        // appState.setAppStatus('interactive') is handled by the FSM 'COMPLETE' state's entry action.
      },
      deps: ['buttonManager', 'config'],
      position: 0 // Button state confirmation call at T=0.
    }
    // Dial resize is handled by DialController's subscription to theme/appStatus changes.
  ]
};