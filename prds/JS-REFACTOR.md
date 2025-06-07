# HUE 9000 Codebase Refactoring Initiative: "Project Decouple"

**Version:** 1.0
**Date:** October 26, 2023
**Author:** AI Assistant
**Status:** Proposed

---

## 1. Product Requirements Document (PRD)

### 1.1. Overview & Vision

The HUE 9000 project has successfully proven its core concept and visual fidelity. The next critical step is to refactor the underlying JavaScript architecture to enhance maintainability, scalability, and developer velocity. This initiative, codenamed "Project Decouple," will transition the codebase from a functional but tightly-coupled state to a robust, modular, and component-oriented architecture without altering any existing user-facing functionality or visual behavior.

### 1.2. Goals & Objectives

*   **Improve Maintainability:** Make it easier for developers to understand, modify, and debug individual parts of the system without causing unintended side effects.
*   **Increase Modularity:** Enforce a clear separation of concerns, ensuring that each module has a single, well-defined responsibility.
*   **Reduce Fragility:** Eliminate "God" modules (`main.js`, `uiUpdater.js`) to reduce tight coupling and make the system more resilient to change.
*   **Enhance Scalability:** Create an architecture that allows for the easy addition of new features, UI components, or startup phases in the future.
*   **Improve Developer Experience:** Standardize architectural patterns (e.g., class-based components, service location) and reduce boilerplate code (e.g., in startup phases).

### 1.3. Scope & Features (What We Are Changing)

This is a **purely architectural refactoring**. No new user-facing features will be added.

| Feature Area | Current State | Proposed State |
| :--- | :--- | :--- |
| **Dependency Management** | `main.js` manually injects dependencies between managers. | A central **Service Locator** will manage dependencies, decoupling modules from each other. |
| **UI Updating** | A single `uiUpdater.js` handles themes, LCDs, and dynamic CSS. | `uiUpdater.js` will be decomposed into `ThemeManager`, `LcdUpdater`, and `DynamicStyleManager`. |
| **Button Interaction Logic** | `toggleManager.js` and `gridManager.js` contain specific button logic. | This logic will be absorbed. `buttonManager` will handle group mechanics; `main.js` will handle application side-effects. |
| **Startup Sequence** | 12 separate, procedural `startupPhaseX.js` files with duplicated logic. | A single `PhaseRunner.js` will execute **declarative configuration objects** from each `startupPhaseX.js` file. |
| **Module Structure** | Mix of procedural modules and classes. | All stateful managers (`lensManager`, etc.) will be converted to **class-based components** for consistency. |

### 1.4. Out of Scope (What We Are NOT Changing)

*   **User-Facing Functionality:** All buttons, dials, and visual outputs must behave identically to the pre-refactor version.
*   **Visuals & Aesthetics:** All colors, animations, timings, and CSS styles will be preserved.
*   **HTML & CSS Structure:** No changes to the DOM structure or CSS files are planned, other than potentially removing unused classes if discovered.
*   **Core Libraries:** We will continue to use GSAP and XState as the primary animation and state machine libraries.

### 1.5. Success Metrics

*   **100% Functionality Preservation:** A post-refactor review confirms that the application's behavior is identical to the baseline.
*   **Code Quality Improvement:**
    *   The `main.js` file is significantly simplified, primarily containing initialization and registration logic.
    *   The `uiUpdater.js` module is successfully removed and replaced by smaller, focused managers.
    *   The `toggleManager.js` and `gridManager.js` modules are successfully removed.
    *   The `startupPhaseX.js` files are converted to simple configuration objects.
*   **Developer Feedback:** A qualitative assessment shows that adding a hypothetical new feature (e.g., a new button group) would be demonstrably simpler under the new architecture.

---

## 2. Architectural Plan

This plan outlines the target architecture that will be implemented during the refactoring.

### 2.1. Core Architectural Principles

*   **Component-Oriented Design:** UI elements with state and behavior (like `Button`, `Dial`) are encapsulated in their own classes.
*   **Manager as Orchestrator:** Manager modules (`buttonManager`, `dialManager`) are responsible for creating and orchestrating component instances, not for containing component-specific logic.
*   **Inversion of Control (IoC) via Service Locator:** Modules will not import each other directly. Instead, they will request dependencies from a central `serviceLocator`, which decouples them.
*   **Single Responsibility Principle (SRP):** Each module will have one, and only one, reason to change. This is the driving force behind decomposing `uiUpdater.js`.
*   **Declarative Configuration over Imperative Code:** Complex, repetitive logic (like the startup sequence) will be defined as data (configuration objects) and executed by a generic runner.

### 2.2. Target Module Structure & Data Flow



**Data Flow Example (User clicks a Hue Assignment button):**

1.  **User Interaction:** Clicks a radio button in the Hue Assignment grid.
2.  **DOM Event:** The `click` event listener (attached in `main.js`) fires.
3.  **Button Manager:** The listener calls `buttonManager.handleInteraction(event.target)`.
4.  **State Update:** `buttonManager` updates the `isSelected` state on the corresponding `Button` instance and deselects others in its group. It then emits a `buttonInteracted` event to `appState`.
5.  **Application Logic (`main.js`):** A listener in `main.js` for the `buttonInteracted` event checks if the button's `groupId` is one of the hue assignment groups.
6.  **App State Change:** If it is, `main.js` calls `appState.setTargetColorProperties()` with the new hue value.
7.  **UI Reaction (`DynamicStyleManager`):** The `DynamicStyleManager` is subscribed to `appState.targetColorChanged`. It receives the event and updates the appropriate `--dynamic-*-hue` CSS variable on the root element.
8.  **Browser Render:** The browser re-renders the UI with the new color.

### 2.3. New & Refactored Modules

*   **`serviceLocator.js` (New):** A simple object with `register(name, service)` and `get(name)` methods. It will be the single source of truth for accessing shared manager instances.
*   **`ThemeManager.js` (New):** Replaces the theme-handling part of `uiUpdater`. Subscribes to `appState.themeChanged`.
*   **`LcdUpdater.js` (New):** Replaces the LCD-handling part of `uiUpdater`. Manages LCD states and content.
*   **`DynamicStyleManager.js` (New):** Replaces the CSS variable and logo part of `uiUpdater`.
*   **`PhaseRunner.js` (New):** A generic executor for startup phase configuration objects.
*   **`buttonManager.js` (Refactored):** Enhanced to manage group selection logic internally.
*   **`lensManager.js` (Refactored):** Converted from a procedural module to a `LensManager` class.
*   **`startupPhaseX.js` (Refactored):** Converted from functions returning promises to modules exporting simple configuration objects.
*   **`main.js` (Refactored):** Simplified to be an initializer and top-level event listener. All direct inter-manager wiring is removed.

---

## 3. Development Plan

This plan breaks the refactoring into a series of sequential, verifiable sprints. Each sprint ends with a fully functional application, ensuring we can stop at any point and still have a working product.

### Sprint 0: Setup & Baseline

*   **Tasks:**
    1.  Create a new branch in the version control system (e.g., `feature/project-decouple`).
    2.  Establish a baseline by running the application and documenting/recording all key interactions and animations to serve as a "source of truth" for verification.
    3.  Ensure all development tools and dependencies are up to date.
*   **Verification:** The project runs without errors on the new branch.

### Sprint 1: Foundational Decoupling & Class Conversion

*   **Goal:** Introduce the Service Locator and convert stateful modules to classes.
*   **Tasks:**
    1.  Create `src/js/serviceLocator.js`.
    2.  Refactor `main.js`:
        *   Instantiate the `serviceLocator`.
        *   Initialize all managers and `register()` them with the locator.
        *   Remove all direct dependency passing (e.g., `buttonManager.setUiUpdater(uiUpdater)`).
    3.  Refactor dependent modules (`resistiveShutdownController`, `toggleManager`, etc.) to use `serviceLocator.get('...')` inside their `init()` methods.
    4.  Refactor `lensManager.js` into a `LensManager` class and update its instantiation in `main.js`.
*   **Verification:** The application must be fully functional. All interactions, including the startup sequence and resistive shutdown, must work identically to the baseline.

### Sprint 2: Decomposing the UI Updater

*   **Goal:** Eliminate `uiUpdater.js`.
*   **Tasks:**
    1.  Create `ThemeManager.js`, `LcdUpdater.js`, and `DynamicStyleManager.js`.
    2.  Carefully migrate logic from `uiUpdater.js` into the appropriate new manager.
    3.  Update `main.js` to initialize and register these three new managers.
    4.  Search the codebase for any remaining calls to `uiUpdater` and update them to call the correct new manager via the service locator.
    5.  Delete `uiUpdater.js`.
*   **Verification:** Theme changes (manual and startup), LCD content/state updates, and all dynamic color assignments must work identically to the baseline.

### Sprint 3: Consolidating Button Logic

*   **Goal:** Eliminate `toggleManager.js` and `gridManager.js`.
*   **Tasks:**
    1.  Refactor `buttonManager.js` to automatically handle deselection for other buttons within a `radio` or `toggle` group when one is selected.
    2.  Refactor the `gridManager.js` button creation logic into a simple utility function within `main.js`.
    3.  Move the application-specific side-effect logic (e.g., `setTheme` on Aux Light click, `setTargetColorProperties` on grid click, `setResistiveShutdownStage` on Power Off click) into event listeners within `main.js` that subscribe to `appState` events.
    4.  Delete `toggleManager.js` and `gridManager.js`.
*   **Verification:** Main Power, Aux Light, and Hue Assignment Grid buttons must be fully functional. The resistive shutdown sequence must still be triggerable.

### Sprint 4: Declarative Startup Sequence

*   **Goal:** Refactor all `startupPhaseX.js` files and introduce the `PhaseRunner`.
*   **Tasks:**
    1.  Create `PhaseRunner.js`. This will be the most complex part of the sprint. It needs to be able to parse a phase config object and build a GSAP timeline dynamically.
    2.  Update `startupMachine.js` to use a single `phaseRunnerService` for all phases.
    3.  **One by one**, convert `startupPhase0.js` through `startupPhase11.js` into declarative config objects.
    4.  After converting each phase, **thoroughly test** the startup sequence in both step-through and auto-play modes to ensure it is visually and functionally identical to the previous version.
*   **Verification:** The entire startup sequence (P0-P11) must execute perfectly and look identical to the baseline.

### Sprint 5: Final Cleanup & Documentation

*   **Goal:** Finalize the refactoring and update all documentation.
*   **Tasks:**
    1.  Perform a final code review of all changed files.
    2.  Remove any commented-out old code and add new comments where the logic has changed significantly.
    3.  Update all affected `.md` documentation files (`PROJECT_OVERVIEW.md`, `PROJECT_STRUCTURE.md`, etc.) to reflect the new architecture.
    4.  Merge the `feature/project-decouple` branch back into the main branch.
*   **Verification:** The PR is approved, and the main branch contains the fully refactored, documented, and functional codebase.