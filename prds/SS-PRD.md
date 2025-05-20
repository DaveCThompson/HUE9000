HUE 9000: Startup Sequence Refactor (SSR-V1.0) - PRD (Updated)
1. Introduction & Goals
Project: Startup Sequence Refactor (SSR-V1.0) for HUE 9000.
Goal: To create a highly reliable, visually consistent, and maintainable startup sequence. This refactor ensures all visual effects and state changes within each phase are fully executed, regardless of playback mode (automatic "Play All" or manual "Next Phase").
Key Problems Addressed:
Visual discrepancies and incomplete animations between manual stepping and automatic playback.
Manual stepping mechanism (tweenFromTo) prematurely ending phases with dynamic content.
Perceived "rushed" start in automatic playback for initial phases.
Monolithic startupSequenceManager.js file.
2. User Stories / Functional Requirements
SSR-F1 (Consistent Playback): Startup phase visual outcomes and durations are identical between "Play All" and "Next Phase" modes.
SSR-F2 (Reliable Stepping): "Next Phase" reliably advances one full phase at a time, with all phase-internal animations and logic completing.
SSR-F3 (Clear Phase Completion): Each phase explicitly signals its own completion to the stepping mechanism.
SSR-F4 (Smooth Auto-Play Start): Initial phases of automatic playback have sufficient time for visual effects to be clearly perceptible.
SSR-F5 (Maintainable Code): Startup sequence logic is modularized for improved readability and maintainability.
SSR-F6 (Phase Consolidation): Startup phases are consolidated for a streamlined narrative flow (P0+P1 -> startupPhase0; P6+P7 -> startupPhase5).
3. Non-Functional Requirements
SSR-NF1 (Performance): Maintain or improve existing performance.
SSR-NF2 (GSAP Adherence): Primarily leverage GSAP, adhering to best practices.
SSR-NF3 (Debuggability): Existing debug panel remains fully operational and accurate.
4. Revised Startup Phases (SSR-V1.0)
startupPhase0 (Formerly P0 + P1): System Boot & Body Fade-In.
Initial reset, body opacity animation, dim attenuation fade-out, initial terminal message with flicker.
startupPhase1 (Formerly P2): Main Power Online.
MAIN PWR buttons flicker to energized (dim theme style), terminal update.
startupPhase2 (Formerly P3): Optical Core Online.
Lens activates and ramps to initial power, terminal update.
startupPhase3 (Formerly P4): Subsystem Priming.
Secondary buttons (SCAN, HUE ASSN, FIT EVAL, AUX) and Dials/LCDs flicker to dimly-lit/active-dim, terminal update.
startupPhase4 (Formerly P5): Auxiliary Systems Online.
AUX LIGHT buttons flicker to energized (dim theme style), terminal update.
startupPhase5 (Formerly P6 + P7): Full System Activation & Ready.
Global theme transitions to theme-dark. SCAN, HUE ASSN, FIT EVAL buttons flicker to final energized states. System becomes interactive. Terminal updates. P6-specific cleanup occurs.
5. Out of Scope
Changes to visual design of effects (unless fixing timing/completion).
New interactive UI elements.
Fundamental theming system changes.
HUE 9000: SSR-V1.0 - Architectural Specification (Updated)
1. Core Architecture: GSAP Master Timeline with Phase-Signaled Stepping
masterGsapTimeline: A single GSAP master timeline in startupSequenceManager.js orchestrates the sequence for "Play All." It contains labels marking the start of each revised phase (startupPhase0 to startupPhase5).
Phase Modules (Individual Files): Logic for each phase resides in its own JS file (e.g., startupPhase0.js, startupPhase1.js, etc., all within src/js/).
Each module exports createPhaseTimeline(dependencies), returning a self-contained GSAP timeline for that phase.
startupSequenceManager.js (Refactored Orchestrator):
Initializes phase modules.
Builds masterGsapTimeline by adding timelines from phase modules.
Manages isStepThroughMode, currentPhaseDebugIndex.
Implements start(), playNextPhase(), resetSequence().
Handles _notifyPhaseChange.
Provides _handleStepComplete(phaseName) helper for stepping logic, called by phase onComplete handlers.
Stepping Mechanism ("Play-and-Self-Pause" for all phases):
playNextPhase(): Identifies next phase label, calls masterGsapTimeline.play(label).
Each Phase Timeline's onComplete:
Performs its phase-specific cleanup (e.g., _performP6Cleanup within startupPhase5's logic).
If isStepThroughMode and this phase was the one being stepped through: calls dependencies.handleStepComplete(phaseName) (passed from startupSequenceManager).
If not isStepThroughMode (auto-play): calls dependencies.notifyPhaseChange(phaseName, 'completed').
Dependency Injection: startupSequenceManager.js passes a dependencies object to each createPhaseTimeline function. This object includes:
gsap, appStateService, managerInstances, domElementsRegistry, configModule.
phaseName (string, e.g., "startupPhase0").
Control functions/state accessors for stepping:
isStepThroughMode: Getter function () => isStepThroughMode.
masterGsapTimeline: The master timeline instance (for pausing).
phaseOrder: Array of phase names.
getCurrentPhaseDebugIndex: Getter function () => currentPhaseDebugIndex.
handleStepComplete: Function _handleStepComplete.
notifyPhaseChange: Function _notifyPhaseChange.
Specific cleanup functions if needed (e.g., performP6Cleanup for startupPhase5).
2. Directory Structure:
All JavaScript files, including new phase modules, will reside in src/js/.
3. Key Architectural Decisions:
Modular Phases: Each phase is a self-contained unit, improving organization.
Phase-Signaled Stepping: Each phase's onComplete drives the stepping logic, ensuring full execution.
Single masterGsapTimeline for Auto-Play: Clear sequential playback.
Centralized Stepping Helpers: _handleStepComplete in startupSequenceManager.js centralizes common stepping actions.
HUE 9000: SSR-V1.0 - Development Plan & File Generation
This plan outlines the creation/modification of key files.
Phase 1: Configuration Update
Modify config.js to add AUTO_PLAY_START_DELAY.
Phase 2: Create Phase Modules (Examples: startupPhase0.js, startupPhase5.js)
These files will contain the GSAP timeline logic for their respective phases.
They will follow the createPhaseTimeline(dependencies) pattern.
Their onComplete handlers will manage phase-specific cleanup and then call the appropriate functions from dependencies for stepping or auto-play notification.
Phase 3: Refactor startupSequenceManager.js
Remove old GsapPhaseX_... functions.
Import new phase modules.
Implement _handleStepComplete(phaseName).
Update buildMasterTimeline to use new phase modules.
Update playNextPhase for the "Play-and-Self-Pause" mechanism.
Update start to use AUTO_PLAY_START_DELAY.
Update phaseOrder and phaseDescriptions.
Define and manage _performP6Cleanup (now relevant to startupPhase5).
Phase 4: Testing and Refinement (Iterative)
Thoroughly test manual stepping and auto-play.
Adjust AUTO_PLAY_START_DELAY and animation profiles as needed.
Verify all console logs and debug panel interactions.