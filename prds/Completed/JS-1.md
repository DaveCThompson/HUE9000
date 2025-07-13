# PRD: Core Architecture Refactoring
**Version:** 1.0
**Status:** Proposed
**Author:** HUE 9000 AI

## 1. Introduction & Overview

This document outlines a series of foundational refactoring tasks aimed at improving the core architecture of the HUE 9000 application. The proposed changes will enhance maintainability, testability, and clarity by centralizing application bootstrapping, atomicizing state management, and making service access more robust. This effort focuses on improving the developer experience and code quality without altering any user-facing functionality.

This PRD covers the following initiatives:
1.  **Centralize Application Bootstrapping Logic** (`AppInitializer.js`)
2.  **Refactor `appState.js` to Use a Single State Object**
3.  **Enhance `serviceLocator.js` with Native "Safe Get"**

---

## 2. Problem Statement

The current application architecture, while functional, exhibits several technical debt patterns that hinder long-term maintenance and scalability:

*   **Scattered Initialization:** The application's startup logic is spread across `main.js` and `startupSequenceManager.js`. Key decisions like viewport detection, conditional manager instantiation, and service registration are intertwined, making the boot sequence difficult to trace and debug.
*   **Disparate State:** `appState.js` manages state through numerous top-level `let` variables. This makes the overall state shape implicit and difficult to snapshot or reason about as a whole.
*   **Brittle Service Access:** The need for "safe" access to optional services (like `buttonManager` on mobile) is handled by patching the `serviceLocator`'s `get` method in `main.js`. This is an impure side effect and makes the `serviceLocator`'s behavior dependent on its consumer's implementation.

---

## 3. Goals & Objectives

*   **Improve Maintainability:** Centralize related logic to make the codebase easier to understand, modify, and extend.
*   **Increase Testability:** Structure modules like `appState` and `serviceLocator` to be more easily unit-tested in isolation.
*   **Enhance Readability:** Establish a clear, linear, and predictable application startup flow.
*   **Reduce Coupling:** Decouple managers and services from the specifics of the initialization process and from each other.

---

## 4. Requirements

### Requirement 1: Centralize Application Bootstrapping

*   **User Story:** As a developer, I want the entire application initialization sequence to be encapsulated in a single module, so I can easily understand and debug how the application starts, what managers are loaded, and in what order.
*   **Functional Requirements:**
    *   A new module, `src/js/AppInitializer.js`, shall be created.
    *   This module shall contain the logic currently inside the `initializeApp` function from `main.js`.
    *   It will be responsible for detecting the viewport (mobile/desktop).
    *   It will be responsible for instantiating all required managers based on the viewport.
    *   It will be responsible for registering all services with the `serviceLocator`.
    *   The `DEV_SKIP_STARTUP` logic and the call to `startupManager.skipToInteractiveState()` will be moved into this module.
    *   The `DOMContentLoaded` listener in `main.js` will be simplified to only instantiate and run the `AppInitializer`.
*   **Non-Functional Requirements:**
    *   The change must not introduce any perceivable delay in application startup time.
    *   The final application state must be identical to the current implementation, whether the startup sequence is run or skipped.

### Requirement 2: Refactor `appState.js` to Use a Single State Object

*   **User Story:** As a developer, I want the application's entire state to be contained within a single object, so I can easily inspect, snapshot, and reason about the complete state at any point in time.
*   **Functional Requirements:**
    *   All top-level `let` variables in `appState.js` (e.g., `dials`, `currentTheme`, `appStatus`) shall be moved into a single, non-exported `state` object.
    *   All exported getter functions shall be updated to return data from this `state` object (e.g., `getAppStatus()` will return `state.appStatus`).
    *   All exported setter functions shall be updated to modify properties of this `state` object.
    *   The `resetAppStateToDefaults` function will reset the properties of this `state` object.
    *   No change shall be made to the public API (exported function names and their signatures).
*   **Non-Functional Requirements:**
    *   A new getter, `getEntireState()`, should be added (for debugging purposes) that returns a deep clone of the entire `state` object.

### Requirement 3: Enhance `serviceLocator.js` with Native "Safe Get"

*   **User Story:** As a developer, I want to be able to request an optional service from the `serviceLocator` without causing a critical error if it doesn't exist, so I can write cleaner code for viewport-specific managers.
*   **Functional Requirements:**
    *   The `serviceLocator.get` method shall be updated to accept an optional second parameter, a boolean `safe`.
    *   If `safe` is `false` or omitted (default behavior), the method must throw an error if the service is not found.
    *   If `safe` is `true`, the method must return `null` if the service is not found, and must not throw an error.
    *   The patch in `main.js` that currently modifies `serviceLocator.get` must be removed.
    *   All existing calls to the patched `serviceLocator.get(name, true)` must be updated to use the new native `safe` parameter.
*   **Non-Functional Requirements:**
    *   The change should improve code clarity by making the "safe" retrieval an explicit feature of the module's API.

---

## 5. File Manifest

### Files to be Modified
*   `src/js/appState.js`: Will be refactored to use a single internal `state` object.
*   `src/js/main.js`: Will be simplified significantly. The `initializeApp` and related functions will be removed, and the `DOMContentLoaded` listener will call the new `AppInitializer`. The `serviceLocator` patch will be removed.
*   `src/js/serviceLocator.js`: The `get` method will be updated to natively support the `safe` parameter.
*   `src/js/startupSequenceManager.js`: Calls to `serviceLocator.get` will be updated to use the new `safe` parameter.

### Files to be Created
*   `src/js/AppInitializer.js`: This new file will encapsulate the application's entire bootstrapping and initialization sequence.

### Files for Context (Read-Only)
*   `index.html`: To understand the DOM structure the initializers depend on.
*   All manager files in `src/js/` (e.g., `DOMManager.js`, `AudioManager.js`, etc.): To ensure the new `AppInitializer` instantiates and registers them correctly.

---

## 6. Development Plan

The implementation will proceed in the following order to ensure dependencies are handled correctly.

### Phase A: `serviceLocator` and `appState` Refactoring

1.  **Task A.1 (Modify `serviceLocator.js`):**
    *   Update the `get(name)` method to `get(name, safe = false)`.
    *   Implement the conditional logic: if `safe` is true and the service doesn't exist, return `null`. Otherwise, retain the original error-throwing behavior.

2.  **Task A.2 (Modify `main.js`):**
    *   Remove the entire block of code that patches `serviceLocator.get`.
    *   Find all instances of `serviceLocator.get('someManager', true)` and verify they work with the new native implementation.

3.  **Task A.3 (Modify `appState.js`):**
    *   Create the top-level `const state = { ... }` object.
    *   Move all existing `let` state variables into this object as properties.
    *   Refactor every getter and setter to reference `state.propertyName` instead of the top-level variable.
    *   Add the new `getEntireState()` debug helper.
    *   Thoroughly test that the application still functions, as this module is critical.

### Phase B: `AppInitializer` Implementation

1.  **Task B.1 (Create `AppInitializer.js`):**
    *   Create the new file `src/js/AppInitializer.js`.
    *   Define an `AppInitializer` class with a constructor and a `run()` method.

2.  **Task B.2 (Migrate Logic from `main.js`):**
    *   Move the `DEV_SKIP_STARTUP` constant and the entire `initializeApp` function from `main.js` into the `AppInitializer` class. The `run` method will be the new entry point.
    *   Move the `setupEventListeners` and `setupMobileEventListeners` functions into the `AppInitializer` as private methods (`_setupEventListeners`, etc.).

3.  **Task B.3 (Refactor `main.js` Entry Point):**
    *   Simplify the `DOMContentLoaded` listener in `main.js`. It should now only:
        1.  Initialize `DOMManager`.
        2.  Initialize `AudioManager`.
        3.  Register core services (`gsap`, `config`, etc.).
        4.  Instantiate `const appInitializer = new AppInitializer()`.
        5.  Call `appInitializer.run()`.
    *   The preloader logic remains in `main.js` as it gates the initialization process.

### Verification & Testing Strategy

1.  **Full Startup (Desktop):** Run the application with `DEV_SKIP_STARTUP = false`. Verify the entire startup sequence completes and the application becomes interactive. Check the console for errors.
2.  **Full Startup (Mobile):** Repeat the test in a mobile viewport. Verify the mobile-specific startup sequence runs correctly.
3.  **Skip Startup (Desktop & Mobile):** Run the application with `DEV_SKIP_STARTUP = true` in both viewports. Verify the application loads directly into the final interactive state without errors.
4.  **Component Interaction:** After both normal and skipped startups, test key interactions:
    *   Turn dials A and B.
    *   Click all buttons (power, aux light, scan, hue assignment).
    *   Open and use the mobile terminal and its controls.
    *   Toggle the info panel.
5.  **State Inspection:** (Optional) Use the new `appState.getEntireState()` in the console to snapshot and verify the state object's structure and values during interaction.