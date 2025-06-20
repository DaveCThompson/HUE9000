Of course. Here is the Product Requirements Document (PRD) and Implementation Plan, structured as a single Markdown file. This document is designed to guide an LLM through the refactoring process, with specific instructions, validation criteria, and risk mitigation strategies.

---

# HUE 9000 Architectural Refactoring: PRD & Implementation Plan

## 1. Overview

This document outlines the requirements and implementation plan for a critical architectural refactoring of the HUE 9000 application. The primary goal is to enhance system stability, predictability, and maintainability by addressing identified race conditions, fragmented state, and inconsistent design patterns.

This initiative will be executed in three main phases, targeting the highest-impact issues first. The desired outcome is a robust, testable, and scalable codebase that adheres to modern front-end best practices.

**Target Audience:** This document is intended for a Large Language Model (LLM) acting as a senior software engineer. It provides explicit instructions, code-level goals, and validation checks to guide the implementation.

## 2. Problem Statement & Goals

The current architecture, while functional, suffers from several core issues:

*   **Instability:** Asynchronous race conditions cause critical UI failures, such as garbled terminal text during rapid interactions.
*   **Unpredictability:** Fragmented state management and inconsistent data flow patterns make the system difficult to debug and reason about. The "single source of truth" is not consistently honored.
*   **Low Maintainability:** Tightly coupled components with mixed concerns are difficult to test in isolation and brittle to change.

**Project Goals:**

1.  **Eliminate Race Conditions:** Eradicate all known asynchronous race conditions, ensuring predictable UI behavior under all circumstances.
2.  **Establish a Single Source of Truth:** Enforce a strict, unidirectional data flow pattern for all shared application state.
3.  **Clarify Dependency Management:** Standardize on a single, explicit pattern for dependency injection.
4.  **Improve Component Architecture:** Decouple component logic from presentation for improved testability and reusability.
5.  **Maintain 100% of Existing Functionality:** The refactor must not introduce any regressions in application features or visual fidelity.

## 3. Phase 1: Stabilize Asynchronous Operations

**Objective:** To fix the critical race condition in `TerminalManager` and prevent future similar issues.

**Chosen Solution:** **Option 1.1: Cooperative Cancellation (Tactical Fix)**

---

### **PRD: Phase 1**

#### **1.1. `TerminalManager` Cooperative Cancellation**

*   **Requirement 1.1.1:** The `TerminalManager` must be modified to ensure that when a new message with the `interrupt: true` flag is received, the currently typing asynchronous message task is gracefully and completely terminated before the new message begins.
*   **Requirement 1.1.2:** The `_interruptAndClear` method must signal the active async task to stop, rather than just resetting state variables.
*   **Requirement 1.1.3:** The async typing loops (`_typeMessage`, `_typeLine`) must check for this "cancellation" signal before every state-modifying action (e.g., adding a character to the DOM).
*   **Requirement 1.1.4:** The `_isTyping` flag must function as a true lock, preventing a new `_processQueue` from starting while another is active, even during the interrupt process.

---

### **Implementation Plan & LLM Instructions: Phase 1**

**Your Task:** Modify `terminalManager.js` to implement the Cooperative Cancellation pattern.

1.  **Introduce a Cancellation Token:**
    *   In the `TerminalManager` class, add a new property: `this._currentTypingPromise = null;`. This will hold our cancellation token object.

2.  **Modify `_interruptAndClear()`:**
    *   This method is the key. When it's called, its first action should be to signal the active task to stop.
    *   Add this line at the very top of the method: `if (this._currentTypingPromise) { this._currentTypingPromise.abort = true; }`.
    *   After setting the flag, you can proceed with the existing logic of clearing the message queue, DOM, and resetting `this._isTyping = false;`.

3.  **Modify `_processQueue()`:**
    *   This method orchestrates the typing. It needs to create and manage the token.
    *   Inside the `while (this._messageQueue.length > 0)` loop, before you call `_typeMessage`, create the token: `const typingPromise = {}; this._currentTypingPromise = typingPromise;`.
    *   Pass this `typingPromise` object down to the `_typeMessage` call: `await this._typeMessage(messageObject, typingPromise);`.
    *   After the `await` call, check if the task was aborted during its execution: `if (typingPromise.abort) { break; }`. This ensures the `while` loop terminates immediately upon a successful interruption.
    *   After the `while` loop, reset the token: `this._currentTypingPromise = null;`.

4.  **Propagate the Cancellation Token:**
    *   Modify the method signatures of `_typeMessage`, `_typeLine`, and `_pauseAndBlink` to accept the `promise` (our token) as an argument.
    *   **Crucially, inside these methods, add checks `if (promise.abort) return;` at the beginning and before any significant operation** (like appending a character, or resolving the promise after a `setTimeout`). This is how the async task "cooperates" with the cancellation request.

5.  **Validate the `_handleRequestTerminalMessage` Lock:**
    *   Review the logic. The `if (!this._isTyping)` check is critical. It correctly prevents a new queue from processing if one is already running. With the cooperative cancellation changes, this lock becomes fully effective, as `_isTyping` will no longer be prematurely set to `false` by an interrupt.

**Validation Criteria & Risk Mitigation:**

*   **Test Case 1 (The Race Condition):** Manually trigger a long message (e.g., "Scan Button 1"). While it is typing, immediately trigger an interrupting message (e.g., "Scan Button 2").
    *   **Expected Result:** The first message must stop typing *instantly*. The terminal must clear, and the second message must begin typing cleanly without any garbled characters from the first message.
    *   **Risk:** Low. The changes are localized to `TerminalManager`. The primary risk is a logic error in propagating the `abort` flag, which can be caught by this test case.
*   **Test Case 2 (Normal Operation):** Run the entire application startup sequence and test all non-interrupting terminal messages.
    *   **Expected Result:** All terminal messages must function exactly as they did before the change.
    *   **Risk:** Very low. The changes should not affect non-interrupted operations.

## 4. Phase 2: Centralize State & Standardize Dependencies

**Objective:** To refactor the application to use a single source of truth (`appState`) and a single method for dependency injection (`serviceLocator`), creating a predictable and testable architecture.

**Chosen Solutions:** **Option 2.1 (Single Source of Truth)** & **Option 2.2 (Standardize on Service Locator)**

---

### **PRD: Phase 2**

#### **2.1. Unidirectional Data Flow Enforcement**

*   **Requirement 2.1.1:** All shared application state must reside within `appState.js`. Local state within managers (e.g., `isAutoplayOn` in `SidePanelManager`) must be removed and sourced from `appState`.
*   **Requirement 2.1.2:** UI components must not directly modify their own state or the application state. They must only emit events or dispatch actions.
*   **Requirement 2.1.3:** State mutations must only occur within `appState.js` setters or the `startupMachine` context, which then updates `appState`.
*   **Requirement 2.1.4:** UI components must subscribe to `appState` events to reactively update their presentation.

#### **2.2. Dependency Injection Standardization**

*   **Requirement 2.2.1:** The `serviceLocator` shall be the sole mechanism for acquiring shared dependencies (managers, `appState`, `gsap`, `config`).
*   **Requirement 2.2.2:** Direct `import` of `appState.js` by UI/logic modules for the purpose of state mutation or access is forbidden. Modules should receive `appState` as a dependency.
*   **Requirement 2.2.3:** `main.js` is responsible for registering all services, including `appState`, at application startup.

---

### **Implementation Plan & LLM Instructions: Phase 2**

**Your Task:** Refactor the application to enforce a strict unidirectional data flow and standardize dependency injection.

1.  **Refactor `SidePanelManager` (Key Example):**
    *   **Remove Local State:** Delete `this.isAutoplayOn` from the `SidePanelManager` class.
    *   **Update Event Handler:** The click handler for the autoplay button (`#seq-autoplay-toggle`) should no longer modify a local property. It should now send an event to the FSM: `this.startupManager.playAllRemaining();` (This part is already correct, but the principle is key). The `pauseSequence` call is also correct. The FSM is the "action dispatcher".
    *   **Create Reactive Update:** `SidePanelManager` must now subscribe to state changes to update its UI.
        *   In `init`, subscribe to the FSM's state: `appState.subscribe('startup:phaseChanged', ({ status }) => { ... });`.
        *   Inside this subscriber, determine if the sequence is paused or running based on the `status` payload. Update the button's class (`is-active`) and icon based on this authoritative state, not a local flag.

2.  **Standardize `appState` Dependency:**
    *   **Registration:** In `main.js`, add `serviceLocator.register('appState', appState);`.
    *   **Refactor `Button.js`:**
        *   The `Button` constructor already correctly receives `appStateService`. No change needed here, it's a model of the correct pattern.
    *   **Refactor `ThemeManager.js`:**
        *   Remove the `import * as appState from './appState.js';` line.
        *   Add `this.appState = null;` to the constructor.
        *   Modify `init()`: `this.appState = serviceLocator.get('appState');`.
        *   Update all calls from `appState.someFunc()` to `this.appState.someFunc()`.
    *   **Apply this pattern to all other managers/modules that directly import `appState`:** This includes `DynamicStyleManager`, `LcdUpdater`, `lensManager`, `resistiveShutdownController`, `terminalManager`, `buttonManager`, etc. The goal is to remove all `import * as appState` from every file except `main.js`, `startupMachine.js`, and `appState.js` itself.

**Validation Criteria & Risk Mitigation:**

*   **Test Case 1 (Autoplay Toggle):** Click the autoplay button in the side panel.
    *   **Expected Result:** The startup sequence should begin auto-playing. The button's icon and style must update correctly. Clicking it again should pause the sequence, and the button's visuals must revert. The UI must always reflect the true state of the FSM.
    *   **Risk:** Medium. This touches core state management. The biggest risk is breaking the link between the UI action and the state update, or the state update and the UI reaction. Meticulous testing of the full loop is required.
*   **Test Case 2 (Full System Sanity Check):** Perform a complete run-through of the application, including the preloader, full startup sequence (both manual and autoplay), and all interactive elements (dials, buttons, theme changes).
    *   **Expected Result:** The application must be 100% functional with no regressions.
    *   **Risk:** The widespread nature of the dependency injection change could introduce subtle bugs if a module's dependency is missed. A thorough code review focusing on removing all direct `appState` imports is the primary mitigation.

## 5. Phase 3: Decompose Complex Components

**Objective:** To improve the architecture of the most complex component, `DialController`, by separating its concerns.

**Chosen Solution:** **Option 4.1: Decompose into Controller/View Pattern**

---

### **PRD: Phase 3**

#### **3.1. `DialController` Decomposition**

*   **Requirement 3.1.1:** A new, purely presentational class, `DialView`, must be created.
*   **Requirement 3.1.2:** `DialView`'s sole responsibility is to render the dial's SVG ridges based on data passed to it. It must not contain any event listeners or application state logic. It should have a public `render({ rotation, themeVars })` method.
*   **Requirement 3.1.3:** The existing `DialController` class must be refactored to act as a true controller. It will instantiate `DialView`.
*   **Requirement 3.1.4:** `DialController` will retain all responsibility for handling user input (drag listeners), interacting with `appState`, and calculating rotation physics.
*   **Requirement 3.1.5:** After calculating the new state, `DialController` will call `this.view.render(...)` to update the presentation.

---

### **Implementation Plan & LLM Instructions: Phase 3**

**Your Task:** Refactor `DialController.js` by splitting it into `DialController.js` and a new `DialView.js`.

1.  **Create `DialView.js`:**
    *   Create a new file. The `DialView` class constructor will take the `svgElement` as an argument.
    *   Move the following methods and properties from `DialController` into `DialView`:
        *   `_createRidges()`
        *   `_draw()`
        *   `ridgeElements`, `ridgesGroup`, `svgWidth` properties.
    *   The `_draw` method will need access to `themeVars`. The `render` method you create should accept this.
    *   Create the public `render` method. It should update `this.themeVars` and then call `this._draw()`.

2.  **Refactor `DialController.js`:**
    *   The constructor will now create an instance of the new `DialView`: `this.view = new DialView(this.svg);`.
    *   The `forceRedraw` method in the controller will now call a corresponding method on the view, e.g., `this.view.forceRedraw()`.
    *   The `_handleInteractionMove` and other methods that previously called `this._draw()` directly should now call `this.view.render({ rotation: this.rotation, themeVars: this.themeVars });`.
    *   The `_updateAndCacheThemeStyles` method remains in the controller, as it's part of the logic, not the presentation. The controller is responsible for passing the `themeVars` to the view.

**Validation Criteria & Risk Mitigation:**

*   **Test Case 1 (Dial Interaction):** Vigorously interact with both Dial A and Dial B.
    *   **Expected Result:** The dials must be visually identical and behave exactly as they did before the refactor. Dragging, smoothing, and theme-based color changes must all work perfectly.
    *   **Risk:** Medium. The main risk is an incorrect division of logic, where a piece of rendering logic is left in the controller or vice-versa. A logic error in how the controller passes data to the view could also break functionality.
*   **Test Case 2 (Resize and Theme Change):** While interacting with the dials, resize the browser window and change the application theme.
    *   **Expected Result:** The dials must redraw correctly without glitches, adopting the new sizes and theme colors seamlessly.
    *   **Risk:** Low. If the `forceRedraw` and theme update logic is correctly delegated from the controller to the view, this should function correctly.