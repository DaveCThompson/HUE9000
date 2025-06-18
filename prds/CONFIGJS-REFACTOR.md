Excellent. Here is the final, highly refined PRD and Implementation Plan. It incorporates all the improvements discussed, including the new shared.js module and the semantic review of constants. It also adds a "Next Refinements & Future Interrogation" section to guide future work.

Technical PRD: Advanced Configuration Module Refactor

Author: HUE 9000 System Architect
Status: Approved for Implementation
Date: October 26, 2023
Jira Ticket: ENG-721
Version: 2.0

1. Overview & Problem Statement

The HUE 9000 project's configuration is currently centralized in a monolithic config.js file. This has led to significant maintenance overhead, frequent merge conflicts, and suboptimal code bundling. This document outlines a comprehensive plan to refactor this module into a scalable, maintainable, and robust structure that aligns with modern JavaScript best practices.

2. Goals & Objectives

Decomposition: Decompose config.js into a directory of small, feature-focused modules.

Clarity & Readability: Group constants semantically, both by file and with internal comments, to make the configuration self-documenting.

Maintainability: Drastically reduce the effort required to find, modify, and add new configuration.

Performance: Enable effective tree-shaking by refactoring consumers to use named imports, leading to smaller production bundles.

Robustness: Eliminate derived/redundant constants and introduce JSDoc type annotations to reduce runtime errors and improve developer tooling (IntelliSense).

3. Non-Goals

This is a pure refactor. No application logic or configuration values will be changed. The user-facing behavior of the application must remain identical.

4. Proposed Solution: The Granular "Barrel File" Pattern

We will implement a src/js/config/ directory containing small modules, each with a single responsibility. A central index.js barrel file will aggregate and re-export all constants, providing a single, clean import point for the rest of the application. This approach was chosen for its superior scalability, maintainability, and synergy with modern build tools.

5. Implementation Plan

This refactor will be executed incrementally through a series of smaller, targeted Pull Requests (PRs) to minimize risk and simplify code reviews.

Phase 0: Foundation & Verification Setup (PR #1)

Branch: Create a new long-lived feature branch: git checkout -b feature/config-module-refactor. All subsequent PRs will be merged into this branch before it's merged into main.

Create Directory Structure:

src/js/config/

scripts/ (if not existing)

Create Initial Files:

src/js/config/index.js (empty barrel file)

src/js/config/shared.js (for global constants)

src/js/config/audio.js (for the first migration test)

scripts/verify-config-refactor.mjs (automated verification script)

Implement Verification Script (scripts/verify-config-refactor.mjs):

This Node.js script will:

Programmatically read the exports from the original config.js.

Dynamically import from the new src/js/config/index.js.

Compare the sets of exported keys to ensure no constants were lost.

Scan the src/js/ directory for any remaining instances of config. usage, which would indicate an incomplete refactor.

This script will be run at the end of the entire process.

Migrate shared.js & audio.js:

Identify constants fitting the "shared" criteria (GSAP_TWEEN_DURATION, DEBOUNCE_DELAY, etc.) and move them to config/shared.js.

Move the AUDIO_CONFIG object to config/audio.js.

Add JSDoc type annotations to all moved constants.

Update config/index.js to export from both files: export * from './shared.js'; export * from './audio.js';.

Refactor Consumers: Update all files that use the moved constants to use named imports (e.g., import { AUDIO_CONFIG } from './config';).

PR #1 - "The Foundation": Submit this initial PR. It proves the pattern, sets up tooling, and is small enough for a quick, confident review.

Phase 1: Incremental Migration (Multiple PRs)

Create a separate PR for each of the following logical groups. Each PR will follow the pattern: Move -> Annotate -> Update Barrel -> Refactor Consumers -> Test.

PR #2: Dials & Interaction (dials.js, interaction.js)

PR #3: Lens (lens.js)

PR #4: Terminal (terminal.js)

PR #5: UI & Assets (ui.js, assets.js)

PR #6: Animations (animations.js)

PR #7: Flicker Profiles (flickerProfiles.js)

PR #8: Sequences (Largest PR) (sequences.js)

During this phase, actively apply the Semantic Constant Review principles:

Eliminate Derived Values: Remove constants like P3_LENS_RAMP_DURATION_S. Store only the source of truth (e.g., LENS_STARTUP_RAMP_DURATION_MS) and derive values in the consumer.

Improve Naming: Rename ambiguous constants for clarity (e.g., append _MS or _S to time-based values).

Group with Comments: Use clear, commented headers within the new files to organize related constants (e.g., // --- Startup Timings ---).

Phase 2: Finalization & Verification (Final PR)

Run Verification Script: Execute node scripts/verify-config-refactor.mjs to programmatically confirm that all constants have been migrated and all consumers have been updated.

Delete Old File: Once the script passes, delete the original src/js/config.js.

Full Regression Test: Perform a full functional test of the application against a formal checklist (see below).

Documentation Update: Update JAVASCRIPT_MODULE_REFERENCE.md and PROJECT_STRUCTURE.md to reflect the new, final structure.

Merge: Merge the feature/config-module-refactor branch into main.

Functional Testing Checklist (for Final Verification)

[ ] Startup Sequence: Run in both step-through and autoplay modes. All visual and audio cues must be correctly timed.

[ ] Audio System: Verify background music, button presses, dial loops, and all startup sequence sounds.

[ ] UI Interactions:

[ ] Dials A & B: Verify correct updates to Mood Matrix, Intensity Display, and Lens.

[ ] All Button Groups: Test Power, Aux Light, Hue Assignment, and Scan buttons.

[ ] Animation Systems:

[ ] Flicker Effects: Visually confirm all startup and resistive shutdown flickers are correct.

[ ] Ambient Effects: Confirm Harmonic Resonance and Idle Light Drift are active in the interactive state.

[ ] Critical Path Scenarios:

[ ] Trigger the multi-stage Resistive Shutdown sequence.

[ ] Change the global theme and verify all components adapt correctly.

6. Next Refinements & Future Interrogation

This refactor provides a strong foundation. The following areas should be investigated next to build upon this work. A separate ticket should be created for each.

Area for Interrogation	Rationale & Key Questions	Proposed Action
1. Configuration-Driven Startup Phases	The declarative startup phase files (startupPhaseX.js) still contain executable functions within call animations. This couples them tightly to manager APIs. Q: Can we make these phases pure data (JSON-like), where the PhaseRunner interprets the data and calls the correct manager methods?	Plan: Create a new ticket to refactor the PhaseRunner. The goal would be to replace type: 'call', function: (tm) => tm.reset() with a declarative equivalent like action: 'terminalManager.reset'. This would completely decouple phase definitions from implementation.
2. Environment-Specific Configuration	Currently, all configuration is hard-coded for production. We lack a system for toggling debug modes or changing API endpoints for different environments (dev, staging, prod). Q: How can we introduce environment variables (.env files) to control configuration values at build time?	Plan: Investigate using Vite's import.meta.env feature. Create a ticket to implement a system where values in config/ files can be sourced from environment variables, e.g., export const DEBUG_MODE = import.meta.env.VITE_DEBUG_MODE === 'true';.
3. Centralized Asset Manifest	Asset paths are imported directly in config/assets.js, but also referenced by key in AUDIO_CONFIG and PRELOADER_ASSETS. This is a minor duplication. Q: Can we create a single asset manifest that defines all assets, and have other config objects reference it by key?	Plan: Create a ticket to design a central assetManifest.js. AUDIO_CONFIG would then be defined as sounds: { buttonPress: { ...assetManifest.buttonPress, volume: 0.8 } }, reducing stringly-typed path duplication.
4. Feature Flagging System	As we add new experimental features, we need a clean way to toggle them on or off without commenting out code. Q: Can we build a simple, configuration-based feature flagging system?	Plan: Create a config/featureFlags.js file. export const V2_DISPLAYS_ENABLED = true;. Application code (e.g., in main.js) would then conditionally initialize managers based on these flags: if (V2_DISPLAYS_ENABLED) { intensityDisplayManager.init(); }.
5. Validating Flicker Profile Schema	The ADVANCED_FLICKER_PROFILES object is complex. A typo in a property name (finalOpacity vs finaOpacity) can lead to silent failures. Q: Can we automatically validate these profiles against a defined schema at build time?	Plan: Investigate using a schema validation library like Zod. Create a ticket to write a schema for the flicker profile object and run a validation script as part of the npm run build process to catch errors early.