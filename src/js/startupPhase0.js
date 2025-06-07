/**
 * @module startupPhase0
 * @description Declarative configuration for Phase 0 (System Idle / Baseline Setup)
 * of the HUE 9000 startup sequence.
 */
export const phase0Config = {
  phase: 0,
  name: "IDLE_BASELINE",
  duration: 0.5, // Minimum duration for auto-play pause
  animations: [
    // No visual animations in this phase.
    // The initial state is set by startupSequenceManager._resetVisualsAndState()
  ]
};