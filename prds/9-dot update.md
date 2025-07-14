Of course. Based on the red-team analysis and the new requirements, here are the fully updated PRD and file manifest. The plan is now more robust, addresses all identified risks, and incorporates the new UX details for a high-craft implementation.

---

### **Updated PRD: `9-dot update.md`**

# PRD/Design Spec: 9-Dot Spinner Enhancements (V2 - Revised)

## 1. Functional Requirements

### FR.4: 9-Dot Spinner - New Pattern
A new animation pattern for the 9-dot spinner must be implemented, displaying dots in a specific column-by-column zigzag order.

### FR.5: 9-Dot Spinner - Startup Integration
The 9-dot spinner animation must be integrated into the terminal output, running concurrently with the typing of the first message of the application's startup sequence.

### FR.6: Spinner to Check-mark Transition (NEW)
Upon successful completion of the concurrent animation/typing, the 9-dot spinner must visually transition into a "success" check-mark icon.

### FR.7: Layout Stability (NEW)
The transition from spinner to check-mark must not cause any layout shift or reflow on the terminal line.

## 2. Design Specifications

### DS.4: 9-Dot Spinner - New Pattern
*   **Dot Grid Layout (Indices):**
    ```
    0 1 2
    3 4 5
    6 7 8
    ```
*   **New Pattern Order (`zigzagColumn`):** The single source of truth for the new pattern is the array `[0, 3, 7, 1, 5, 2, 6, 4, 8]`.
*   **Animation Behavior:** The `createDotGridSpinnerTimeline` will alternate between the existing `spiral` pattern and this new `zigzagColumn` pattern.

### DS.5: 9-Dot Spinner - Startup Integration & Transition
*   **Visual Layout:** A fixed-width container will be prepended to the terminal line containing the first startup message. This container ensures horizontal alignment and prevents layout shift.
*   **Concurrent Animation:** The container will initially display the 9-dot spinner, which animates using the `spiral` pattern *concurrently* with the typing of the message "INITIATING STARTUP PROTOCOL".
*   **Completion Transition:** Upon completion of the text typing, the spinner will fade out as a "success" check-mark icon (from Material Symbols) fades in within the *same container*.
*   **Styling:**
    *   The spinner and check-mark icon will be vertically centered with the terminal text.
    *   The check-mark icon must inherit the `line-success` color defined in `_terminal.css`.
    *   The spinner dots must use the chromatic aberration effect consistent with other scan UI elements.

## 3. Technical Solution Approach

### TSA.4: 9-Dot Spinner - New Pattern
*   **Module:** `src/js/animationUtils.js`
*   **Approach:**
    1.  In the `createDotGridSpinnerTimeline` function, update the `patterns` object to include the new pattern:
        ```javascript
        const patterns = {
            spiral: [0, 1, 2, 5, 8, 7, 6, 3, 4],
            zigzagColumn: [0, 3, 7, 1, 5, 2, 6, 4, 8] // New pattern
        };
        ```
    2.  Modify the `masterTl` within the function to alternate between the two main patterns:
        ```javascript
        masterTl.add(runPatternCycle('spiral'))
                .add(runPatternCycle('zigzagColumn'), `+=${pauseDuration * 0.5}`);
        ```

### TSA.5: Startup Integration, Transition & Layout Stability
This requires a coordinated implementation across CSS, `terminalMessages.js`, and `terminalManager.js`.

*   **`src/css/components/_terminal.css`:**
    *   **Approach:** Define styles for a new prefix container and its children to manage layout, sizing, and the transition.
        ```css
        .terminal-line {
            display: flex; /* Change from block to flex */
            align-items: center;
            gap: var(--space-sm);
        }

        .terminal-line-prefix {
            flex-shrink: 0;
            position: relative;
            width: 1.5em;  /* Fixed width to prevent shift */
            height: 1.5em; /* Fixed height to prevent shift */
            display: inline-flex;
            align-items: center;
            justify-content: center;
        }

        .terminal-line-prefix .dot-grid-spinner,
        .terminal-line-prefix .completion-icon {
            position: absolute;
            width: 100%;
            height: 100%;
            transition: opacity 0.3s ease-in-out;
        }

        .terminal-line-prefix .dot-grid-spinner {
            opacity: 1;
        }

        .terminal-line-prefix .completion-icon {
            opacity: 0;
            font-size: 1.5em; /* Match container size */
        }
        ```

*   **`src/js/terminalMessages.js`:**
    *   **Approach:** Modify the `P1_EMERGENCY_SUBSYSTEMS` message to be a declarative command that invokes the new, specialized handler in `terminalManager`. This avoids redundant text and isolates the logic.
        ```javascript
        // In startupMessages
        P1_EMERGENCY_SUBSYSTEMS: {
            command: 'typeWithPrefixSpinner', // New, descriptive command name
            params: {
                text: "INITIATING STARTUP PROTOCOL",
                spinnerPattern: 'spiral' // Specify which pattern to use
            }
        },
        ```

*   **`src/js/terminalManager.js`:**
    *   **Approach:** Implement a new, dedicated command handler, `_handleTypeWithPrefixSpinner`, and add it to the `_commandHandlers` map. This handler will orchestrate the entire concurrent animation and transition.
    1.  **Create Handler:**
        ```javascript
        _commandHandlers = {
            'pause': this._handlePauseCommand.bind(this),
            'displayText': this._handleDisplayTextCommand.bind(this),
            'spinner': this._handleSpinnerCommand.bind(this),
            'typeWithPrefixSpinner': this._handleTypeWithPrefixSpinner.bind(this) // Add new handler
        };
        ```
    2.  **Implement `_handleTypeWithPrefixSpinner`:**
        *   The function receives `params` (`text`, `spinnerPattern`).
        *   **DOM Setup:**
            *   Create the line structure: `<div class="terminal-line"><div class="terminal-line-prefix"></div><span class="text-content"></span></div>`.
            *   Create the 9-dot spinner DOM (`.dot-grid-spinner`) and append it to `.terminal-line-prefix`.
            *   Create the check-mark icon (`<span class="material-symbols-outlined completion-icon line-success">check_circle</span>`) and also append it to `.terminal-line-prefix`.
        *   **Animation Orchestration:**
            *   Get the spinner timeline: `const spinnerTl = animationUtils.createDotGridSpinnerTimeline(...)`.
            *   Create the typing animation using GSAP's `TextPlugin`: `const typingTl = this._gsap.to(textContentSpan, { text: params.text, duration: ..., ease: 'none' })`.
            *   Create a master GSAP timeline.
            *   Add both `spinnerTl` and `typingTl` to the master timeline to run concurrently (`masterTl.add(spinnerTl).add(typingTl, 0)`).
            *   Add an `onComplete` callback to the master timeline. This callback will handle the visual transition:
                *   `gsap.to(spinnerElement, { opacity: 0, duration: 0.3 })`
                *   `gsap.to(checkMarkElement, { opacity: 1, duration: 0.3 })`
        *   **Promise Handling:** The handler must return a `Promise` that resolves when the master GSAP timeline (including the final fade transition) is complete, allowing `_processQueue` to proceed correctly.

## 4. File Manifest

The following files will be modified to implement this feature.

*   `src/js/animationUtils.js`
*   `src/js/terminalManager.js`
*   `src/js/terminalMessages.js`
*   `src/css/components/_terminal.css`
*   `src/css/components/_scan-sequence.css` (To ensure `.dot-grid-spinner` styles are available and consistent)

---

