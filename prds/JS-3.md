# PRD: Centralized Event Binding
**Version:** 1.0
**Status:** Proposed
**Author:** HUE 9000 AI

## 1. Introduction & Overview

This document specifies a refactoring effort to centralize the application's DOM event listener bindings. Currently, `addEventListener` calls are scattered across various manager modules, making it difficult to get a holistic view of user interaction pathways. This initiative will create a single, dedicated module responsible for wiring up all static UI controls to their corresponding application logic, improving code organization and maintainability.

This PRD covers the following initiative:
1.  **Consolidate and Centralize Event Listener Binding** (`EventBinder.js`)

---

## 2. Problem Statement

*   **Scattered Logic:** Event listeners are currently bound in multiple files, including `main.js` (desktop buttons), `MobileTerminalManager.js` (mobile terminal buttons), `sidePanelManager.js` (panel toggles), and `DialController.js` (dial drag events). To understand how a simple button click is handled, a developer might need to search through several different modules.
*   **Tight Coupling:** Managers are often tightly coupled to the specific DOM structure (IDs and classes) of the elements that control them. For example, `sidePanelManager` knows about `info-toggle-desktop`.
*   **Inconsistent Approach:** The method for handling interactions varies. Some listeners call a manager method directly, while others emit a global `appState` event. Centralizing the binding process provides an opportunity to standardize this approach.

---

## 3. Goals & Objectives

*   **Single Source of Truth:** Create one module that is the definitive source for how user interactions on static elements are connected to the application's logic.
*   **Improve Code Navigation:** Drastically simplify the process of debugging user interactions by providing a clear starting point for tracing event flow.
*   **Decouple View from Controllers:** Reduce the direct dependency of manager classes on specific DOM element IDs and selectors.
*   **Standardize Interaction Handling:** Encourage a consistent pattern for dispatching actions from UI events.

---

## 4. Requirements

### Requirement 1: Create a Centralized Event Binder Module

*   **User Story:** As a developer, I want all static DOM event listeners to be defined in one place, so I can quickly find and understand how UI events are wired to manager methods or application state changes.
*   **Functional Requirements:**
    *   A new module, `src/js/EventBinder.js`, shall be be created.
    *   This module will have an `init()` method that is called once during application startup.
    *   The `init()` method will query the DOM for all static interactive elements (e.g., all buttons in the main interface, panel toggles, mobile controls).
    *   It will be responsible for attaching all `addEventListener` calls for these elements.
    *   All corresponding `addEventListener` calls must be **removed** from their current locations (`main.js`, `sidePanelManager.js`, `MobileTerminalManager.js`, etc.).
    *   The logic inside the event listeners will remain largely the same: they will either call a method on a retrieved service (e.g., `serviceLocator.get('sidePanelManager').toggle()`) or emit an `appState` event (e.g., `appState.setIsAudioMuted(...)`).
    *   **Note:** Dynamically created listeners or listeners on the `window` object (like those in `DialController.js` for `mousemove` and `mouseup` during a drag) are exempt from this centralization, as their lifecycle is tied to a specific component interaction, not the static page load.
*   **Non-Functional Requirements:**
    *   The refactoring must not introduce any new dependencies into the manager classes.
    *   The overall event handling performance must not be degraded.

---

## 5. File Manifest

### Files to be Modified
*   `src/js/main.js`: The `setupEventListeners` and `setupMobileEventListeners` functions will be removed, along with their calls. The body click listener for desktop buttons will also be removed.
*   `src/js/MobileTerminalManager.js`: The `_setupEventListeners` method and its call will be removed.
*   `src/js/sidePanelManager.js`: The `_setupPanelToggles` and `_setupCoreControls` methods will be removed, as their only purpose was to bind events.

### Files to be Created
*   `src/js/EventBinder.js`: This new file will contain all the event binding logic removed from the other files.

### Files for Context (Read-Only)
*   `index.html`: To identify all the selectors and IDs for the elements that need event listeners.
*   `src/js/appState.js`: To see which events are emitted by the listeners.
*   `src/js/buttonManager.js`: The new binder will need to call `buttonManager.handleInteraction()`.
*   `src/js/startupSequenceManager.js`: The new binder will need to call `startupSequenceManager.resetSequence()`.

---

## 6. Development Plan

This refactoring involves a "move and delete" pattern. For each group of event listeners, we will move the binding logic to the new module and then delete the old code.

1.  **Task 1 (Create `EventBinder.js`):**
    *   Create the file `src/js/EventBinder.js`.
    *   Define an `EventBinder` class with a constructor that gets necessary services (`serviceLocator`, `appState`) and an `init()` method.
    *   In the application's main initialization sequence (ideally the new `AppInitializer`), instantiate and call `eventBinder.init()` after all managers have been registered.

2.  **Task 2 (Migrate Desktop Button Listeners):**
    *   **From `main.js`:** Locate the `document.body.addEventListener('click', ...)` that handles all `.button-unit` clicks.
    *   **To `EventBinder.js`:** Re-implement this exact logic within the `init()` method. The listener will get the `buttonManager` from the `serviceLocator` and call `buttonManager.handleInteraction()`.
    *   **Delete:** Remove the listener from `main.js`.

3.  **Task 3 (Migrate Side Panel Listeners):**
    *   **From `sidePanelManager.js`:** Locate the `_setupPanelToggles` and `_setupCoreControls` methods. These contain listeners for `#info-toggle-desktop`, `#info-panel-close-btn`, `#seq-reset`, and `#audio-mute-toggle`.
    *   **To `EventBinder.js`:** In `init()`, query for these same elements by ID and attach new listeners.
        *   The info/close listeners will call `serviceLocator.get('sidePanelManager').toggle()` or `.close()`.
        *   The reset listener will call `serviceLocator.get('startupSequenceManager').resetSequence()`.
        *   The mute listener will emit an `appState` event: `appState.setIsAudioMuted(!appState.getIsAudioMuted())`.
    *   **Delete:** Remove the listener-attaching code from `sidePanelManager.js`. The `_setupPanelToggles` and `_setupCoreControls` methods can be completely removed if they have no other responsibilities.

4.  **Task 4 (Migrate Mobile Control Listeners):**
    *   **From `main.js` (`setupMobileEventListeners`):** This function currently binds listeners for mobile reset, audio, info, light, and the haptics toggle.
    *   **To `EventBinder.js`:** Re-implement these bindings inside a mobile-only block (`if (isMobile)`). The listeners will use the `createMobileInteraction` utility and delegate to `appState` or manager methods as they do now.
    *   **Delete:** Remove the `setupMobileEventListeners` function and its call from `main.js`.

5.  **Task 5 (Migrate Mobile Terminal Listeners):**
    *   **From `MobileTerminalManager.js`:** Locate the `_setupEventListeners` method, which binds listeners for the terminal toggle, close, and action buttons.
    *   **To `EventBinder.js`:** Re-implement these bindings inside the mobile-only block.
    *   **Delete:** Remove the `_setupEventListeners` method and its call from `MobileTerminalManager.js`.

### Verification & Testing Strategy

Since this refactoring touches a wide range of UI interactions, thorough testing is critical.

1.  **Desktop Interaction Test:**
    *   Click every button on the main interface (Power, Scan, Eval, Hue Assign, Aux Light) and verify the correct action occurs.
    *   Click the "INFO", "RST", and "AUD" buttons in the compact side panel and verify they work.
    *   Open the info panel and click the close button.
    *   Turn both dials.

2.  **Mobile Interaction Test:**
    *   Tap every button in the mobile controls overlay (Reset, Info, Audio, Light, Terminal Toggle) and verify functionality.
    *   Interact with the mobile color slider.
    *   Open the mobile terminal, and tap all four action buttons ("SCAN A", etc.) to ensure the scan sequences start correctly.
    *   Close the mobile terminal with its close button.

3.  **Console Verification:** Throughout testing, monitor the developer console for any new errors, particularly "cannot read properties of null (reading 'addEventListener')" or "service not found".