**A) For Context:**
These files provide the architectural backbone and show how the different pieces of the application connect.

1.  `index.html`
2.  `main.js`
3.  `serviceLocator.js`

**B) To Be Modified/Created/Deleted:**
These are the specific files that will be directly altered during the refactoring process.

1.  `appState.js`
2.  `AudioManager.js`
3.  `config/animations.js` (to be deleted)
4.  `config/index.js`
5.  `DialController.js`
6.  `EventEmitter.js`
7.  `MusicController.js` (to be created)
8.  `DOMManager.js` (to be created)

---

### **Product Requirements Document (PRD): Architectural Refinements (V2.2)**

**1. Introduction**
The HUE 9000 (v2.1) project has a robust, modular architecture. This document outlines a set of targeted internal refactorings to further improve code quality, maintainability, and architectural consistency. These changes are non-functional; they will not alter the user-facing experience or performance but will significantly benefit future development and code comprehension.

**2. Problem Statement**
As the codebase has matured, several minor architectural inconsistencies and opportunities for cleanup have been identified:
*   **Code Duplication:** The `EventEmitter` class logic is duplicated in `appState.js`, violating the DRY principle.
*   **Poor Separation of Concerns:** Core application logic for music control resides in the main orchestration file (`main.js`) instead of its own dedicated module.
*   **Leaky Abstractions:** Component-specific logic for dial behavior (clamping vs. wrapping) currently resides in the global `appState` module, making the state manager less pure.
*   **Inconsistent Patterns:** The method for collecting and providing DOM elements is an outlier compared to the standardized class-based manager pattern used elsewhere.
*   **Code Clutter:** The project contains a configuration file (`config/animations.js`) that is no longer used, creating potential confusion for developers.

**3. Goals & Objectives**
*   Improve long-term code maintainability and scalability.
*   Increase architectural consistency across all modules.
*   Reduce cognitive overhead for developers by ensuring logic is co-located with its relevant domain.
*   Eliminate duplicated and vestigial code.
*   **Crucially, ensure 100% preservation of existing application functionality and performance.**

**4. Requirements / Scope of Work**

| ID | Requirement | Description |
| :-- | :--- | :--- |
| **REQ-1** | Centralize the `EventEmitter` | The duplicate `EventEmitter` class within `appState.js` will be removed. The module will instead import and use the canonical `EventEmitter` from `src/js/EventEmitter.js`. |
| **REQ-2** | Encapsulate Music Control Logic | The `MusicController` class will be moved from `main.js` into its own module, `src/js/MusicController.js`. `main.js` will then import and instantiate this class, restoring its role as a pure orchestrator. |
| **REQ-3** | Remove Vestigial Configuration | The unused configuration file `src/js/config/animations.js` will be deleted. The corresponding export statement will be removed from `src/js/config/index.js`. |
| **REQ-4** | Co-locate Component Logic | The business logic for clamping Dial B's value and wrapping Dial A's value will be moved from `appState.js` to the `_handleInteractionMove` method within `DialController.js`. `appState.js` will revert to being a pure data store. |
| **REQ-5** | Standardize Service Initialization | A new `DOMManager.js` class will be created. It will be responsible for querying and storing all necessary DOM elements. An instance of this manager will be registered with the `serviceLocator` in `main.js`, replacing the current global object pattern. |

**5. Success Metrics**
*   All 5 requirements are implemented as described.
*   The application is fully functional with no visual, behavioral, or performance regressions.
*   A code review confirms that the specified files have been modified/created/deleted correctly and that the new architecture is cleaner and more consistent.
*   The application successfully passes all stages of the startup sequence and remains fully interactive.

---

### **Development Plan: Architectural Refinements (V2.2)**

**Overview:** This technical plan details the step-by-step implementation for the five approved refactoring requirements. Each task should be completed sequentially, with verification after each step to ensure stability.

**Task 1: Centralize `EventEmitter`**
*   **Objective:** Remove duplicated code by using a single, shared `EventEmitter`.
*   **Steps:**
    1.  **Modify `appState.js`:**
        *   Delete the local `class EventEmitter { ... }` definition.
        *   Add the following import at the top of the file: `import { EventEmitter } from './EventEmitter.js';`
        *   The rest of the file should function as-is.
    2.  **Verify:** Run the application. Confirm that events (like dial updates, theme changes) are still being emitted and subscribed to correctly. The side panel's "State" tab is a good place to check this.

**Task 2: Encapsulate `MusicController`**
*   **Objective:** Improve separation of concerns by moving the `MusicController` to its own file.
*   **Steps:**
    1.  **Create `src/js/MusicController.js`:** Create a new file with this name.
    2.  **Move the Class:** Copy the entire `class MusicController { ... }` definition from `main.js` into the new `MusicController.js` file.
    3.  **Export the Class:** Add `export` before the class definition in `MusicController.js`: `export class MusicController { ... }`.
    4.  **Modify `main.js`:**
        *   Delete the `MusicController` class definition from `main.js`.
        *   Add the following import: `import { MusicController } from './MusicController.js';`
        *   The line `new MusicController(audioManager, appState, config);` should remain and will now work with the imported class.
    5.  **Verify:** Run the application. Confirm that background music plays on start, changes with the theme, and transitions correctly during the resistive shutdown sequence.

**Task 3: Remove Vestigial `animations.js`**
*   **Objective:** Eliminate dead code from the configuration directory.
*   **Steps:**
    1.  **Delete File:** Delete the file `src/js/config/animations.js`.
    2.  **Modify `src/js/config/index.js`:** Remove the line `export * from './animations.js';`.
    3.  **Verify:** Run the application. Confirm that all animations, especially the startup sequence flickers, still work perfectly. This change should have no functional impact.

**Task 4: Refactor Dial State Logic**
*   **Objective:** Relocate component-specific logic from the state manager to the component itself.
*   **Steps:**
    1.  **Modify `appState.js`:**
        *   In the `updateDialState` function, remove the entire `if/else if` block that checks `dialId === 'A'` and `dialId === 'B'`.
        *   The function should now only contain the logic to get the old state, assign the new state with `Object.assign`, check for relevant changes, and emit the event.
    2.  **Modify `DialController.js`:**
        *   In the `_handleInteractionMove` method, locate the line `this.hue = newHue;`.
        *   **Before** this line, insert the logic that was removed from `appState.js`:
            ```javascript
            let newHue = this.hue + hueDelta;
            if (this.dialId === 'A') {
                newHue = ((newHue % 360) + 360) % 360;
            } else { // Assumes Dial B
                newHue = this.gsap.utils.clamp(0, 359.999, newHue);
            }
            this.hue = newHue;
            ```
    3.  **Verify:** Run the application. Drag Dial A (Mood) and confirm it wraps around 360°. Drag Dial B (Intensity) and confirm its value stops at 0 and 360, without wrapping.

**Task 5: Implement `DOMManager` Service**
*   **Objective:** Standardize DOM element access using a consistent service pattern.
*   **Steps:**
    1.  **Create `src/js/DOMManager.js`:** Create a new file with this name.
    2.  **Implement the Class:**
        ```javascript
        import { serviceLocator } from './serviceLocator.js';

        export class DOMManager {
            constructor() {
                // Copy all document.querySelector/getElementById calls from
                // the old `collectDomElements` function in main.js here,
                // assigning them to `this.property`.
                this.root = document.documentElement;
                this.body = document.body;
                this.appWrapper = document.querySelector('.app-wrapper');
                // ... and so on for all elements.
            }

            init() {
                // The DOMManager's init can be a good place to do post-construction
                // logic if needed, but for now it can be empty.
                serviceLocator.register('domElements', this);
            }
        }
        ```
    3.  **Modify `main.js`:**
        *   Delete the global `const domElements = {};` object.
        *   Delete the `collectDomElements` function.
        *   Add the import: `import { DOMManager } from './DOMManager.js';`
        *   In the `initializeApp` function, before other managers are initialized, add:
            ```javascript
            const domManager = new DOMManager();
            domManager.init(); // This registers itself with the service locator
            ```
        *   Find the `runPreloader` call. The `preloaderDomForRun` object needs to be populated from the new `domManager` instance:
            ```javascript
            const preloaderDomForRun = {
                body: domManager.body,
                preloaderRoot: domManager.preloaderRoot,
                // ... etc. for all properties it needs.
            };
            ```
        *   Search `main.js` for any other references to the old `domElements` variable and update them to use the `domManager` instance.
    4.  **Verify:** The entire application should load and function correctly, from the preloader through to full interactivity. This is a critical change, so test thoroughly.

**Final Validation:**
After all tasks are complete, perform a full regression test of the application.
*   Run the preloader.
*   Run the startup sequence in both step-through and auto-play modes.
*   Interact with all buttons, dials, and panels.
*   Trigger the resistive shutdown sequence.
*   Ensure all audio and visual effects are working as intended.