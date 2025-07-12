# PRD: Declarative Logic & State Decoupling
**Version:** 1.0
**Status:** Proposed
**Author:** HUE 9000 AI

## 1. Introduction & Overview

This document outlines a refactoring initiative focused on improving the design of two key application features: the interactive scan sequence and the development-only "skip startup" function. The goal is to evolve these features from an imperative style (code that describes *how* to do something) to a declarative style (code that describes *what* the end result should be). This will significantly improve their maintainability, testability, and clarity.

This PRD covers the following initiatives:
1.  **Decouple UI Logic from the Scan State Machine** (`scanFSM.js`)
2.  **Make the "Skip Startup" Feature More Declarative**

---

## 2. Problem Statement

*   **Tightly Coupled State Machine:** The state machine for the scan sequence, defined in `scanFSM.js`, is currently responsible for both state management *and* presentation logic. Its action blocks contain direct DOM manipulations and GSAP animation calls. This tight coupling makes the core state logic difficult to unit test without a DOM environment and violates the single responsibility principle. If the visuals of the scan sequence were to change, the state machine itself would need to be modified.

*   **Brittle "Skip Startup" Script:** The `skipToInteractiveState` function in `startupSequenceManager.js` is a long, imperative script that manually sets dozens of state and style properties to their final values. This script is a "shadow" implementation of the final phase of the normal startup sequence. If the final state of the normal sequence is ever modified, a developer must remember to find and manually update this separate script, creating a high risk of divergence and bugs.

---

## 3. Goals & Objectives

*   **Improve Testability:** Refactor the scan FSM to be a "pure" state machine that can be fully unit-tested without a browser environment.
*   **Single Source of Truth:** Establish a single, declarative source of truth for the application's final interactive state, used by both the normal startup sequence and the development skip.
*   **Decouple Logic from View:** Separate state management logic from presentation logic, allowing UI changes to be made without affecting the core state machine.
*   **Enhance Maintainability:** Reduce code duplication and make the intent of the code more explicit and easier to understand.

---

## 4. Requirements

### Requirement 1: Decouple UI Logic from the Scan State Machine

*   **User Story:** As a developer, I want the scan sequence's state machine to only manage state, so that I can unit test its logic independently and modify the scan's visuals without touching the FSM.
*   **Functional Requirements:**
    *   All direct DOM manipulation (e.g., `classList.add`, `appendChild`) and GSAP calls within `scanFSM.js` must be removed.
    *   The FSM's `entry` and `actions` blocks should only be used to update its own `context` via `assign`. For example, instead of adding a class, it would `assign({ activeJobIndex: 1 })`.
    *   The `ScanOrchestrator` must be updated to subscribe to the FSM's state changes.
    *   The `ScanOrchestrator` will be responsible for translating context changes from the FSM into the appropriate DOM and GSAP updates. For example, when it sees `activeJobIndex` has changed, it will trigger the UI animations for that job.
    *   The user-facing behavior of the scan sequence must remain identical.
*   **Non-Functional Requirements:**
    *   The refactored FSM should be testable with a simple testing library (e.g., Vitest, Jest) by sending events and asserting the resulting state and context, without needing JSDOM.

### Requirement 2: Make the "Skip Startup" Feature More Declarative

*   **User Story:** As a developer, I want the definition of the application's "final state" to exist in a single configuration object, so that when I change a final value, it is automatically reflected in both the normal startup and the dev skip, preventing them from diverging.
*   **Functional Requirements:**
    *   A new configuration object, `FINAL_APP_STATE`, shall be defined, likely in `src/js/config/sequences.js`.
    *   This object will declaratively describe the final state of the application (e.g., `{ theme: 'dark', lensPower: 25, buttonSelections: { 'system-power': 'on', ... } }`).
    *   The `skipToInteractiveState` function in `startupSequenceManager.js` must be refactored. It will no longer contain hardcoded values but will instead read from the `FINAL_APP_STATE` object and apply those values using the appropriate manager/setter functions.
    *   The final phase of the normal startup sequence (`phase12Config.js`) must also be updated. Its `call` function will read from the same `FINAL_APP_STATE` object to apply the final button states, ensuring consistency.
*   **Non-Functional Requirements:**
    *   The code in `skipToInteractiveState` should be significantly shorter and more readable.
    *   The risk of the normal startup and dev skip producing different final states should be eliminated.

---

## 5. File Manifest

### Files to be Modified
*   `src/js/config/sequences.js`: Will be updated to include the new `FINAL_APP_STATE` configuration object.
*   `src/js/ScanOrchestrator.js`: Will be updated to subscribe to FSM context changes and handle the UI rendering logic that was previously in the FSM.
*   `src/js/scanFSM.js`: Will be heavily refactored to remove all direct UI manipulation, becoming a "pure" state machine.
*   `src/js/startupPhase12.js`: The `call` function will be updated to use the new declarative config object.
*   `src/js/startupSequenceManager.js`: The `skipToInteractiveState` function will be refactored to use the new declarative config object.

### Files for Context (Read-Only)
*   `src/js/appState.js`: To understand what state variables need to be included in the `FINAL_APP_STATE` config.
*   `src/js/buttonManager.js`: To understand how button groups are selected, for inclusion in the `FINAL_APP_STATE` config.
*   `src/js/scanRenderers.js`: To understand the rendering functions that the `ScanOrchestrator` will be calling.

---

## 6. Development Plan

### Phase A: Decoupling the Scan FSM

1.  **Task A.1 (Refactor `scanFSM.js`):**
    *   Go through each `entry` and `actions` block in the machine definition.
    *   Identify every line that manipulates the DOM or calls GSAP.
    *   Replace these lines with `assign` actions that update the FSM's `context`. For example, instead of animating the progress bar, `assign({ progress: 25 })`.
    *   The FSM's context should now hold all necessary information about the current state of the scan (e.g., `activeJobIndex`, `progress`, `conclusionState`).

2.  **Task A.2 (Update `ScanOrchestrator.js`):**
    *   In the `subscribe` callback for the FSM actor, add logic to inspect the `snapshot.context`.
    *   Compare the new context with the previous context to identify what has changed (e.g., `if (newContext.activeJobIndex !== oldContext.activeJobIndex)`).
    *   Based on these changes, trigger the appropriate UI animations and DOM manipulations that were previously in the FSM. This is where the GSAP and `classList` calls will now live.
    *   Store the previous snapshot's context to enable this comparison on the next update.

3.  **Task A.3 (Testing):**
    *   Manually test all four scan sequences on both desktop and mobile to ensure they function identically to the pre-refactor version.
    *   (Optional but recommended) Write a simple unit test for `scanFSM.js` that sends a `START` event, then a series of `onDone` events from mock renderers, and asserts that the FSM's context and state transition correctly, all without a DOM.

### Phase B: Declarative "Skip Startup"

1.  **Task B.1 (Create `FINAL_APP_STATE` Config):**
    *   In `src/js/config/sequences.js`, define and export a new constant `FINAL_APP_STATE`.
    *   Populate this object with all the values that define the final interactive state: theme, lens power, default button selections for all groups, etc.

2.  **Task B.2 (Refactor `startupSequenceManager.js`):**
    *   Modify the `skipToInteractiveState` function.
    *   Remove all hardcoded values (e.g., `appState.setTheme('dark')`).
    *   Replace them with calls that use the new config object (e.g., `appState.setTheme(FINAL_APP_STATE.theme)`).
    *   The function should now be a simple "runner" that iterates through the config and applies it.

3.  **Task B.3 (Update `startupPhase12.js`):**
    *   Modify the `call` function within the phase 12 configuration.
    *   Instead of hardcoding the `setGroupSelected` values, have it reference `FINAL_APP_STATE.buttonSelections` to set the final button states. This ensures both paths use the same source of truth.

4.  **Task B.4 (Verification):**
    *   Run the application with `DEV_SKIP_STARTUP = true` and verify the final state is correct.
    *   Run the application with `DEV_SKIP_STARTUP = false` and let the full sequence complete. Verify the final state is identical.
    *   Change a value in `FINAL_APP_STATE` (e.g., change the default selected `env` button). Verify that both the skipped and full startup sequences reflect this change correctly.