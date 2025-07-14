# PRD/Design Spec: 9-Dot Spinner Enhancements

## 1. Functional Requirements

### FR.4: 9-Dot Spinner - New Pattern
A new animation pattern for the 9-dot spinner must be implemented, displaying dots in a specific column-by-column zigzag order.

### FR.5: 9-Dot Spinner - Startup Integration
The 9-dot spinner animation must be integrated into the terminal output for the first message of the application's startup sequence.

## 2. Design Specifications

### DS.4: 9-Dot Spinner - New Pattern
*   **Dot Grid Layout (Indices):**
    ```
    0 1 2
    3 4 5
    6 7 8
    ```
*   **New Pattern Order (Zigzag Column):** `[0, 3, 7, 1, 5, 2, 6, 4, 8]`
*   **Animation Behavior:** Each dot will scale in and fade in (`scale: 0 -> 1`, `opacity: 0 -> 1`) then scale out and fade out (`scale: 1 -> 0`, `opacity: 1 -> 0`) according to the new pattern, similar to the existing spiral pattern.
*   **Cycling:** The `createDotGridSpinnerTimeline` will alternate between the existing `spiral` pattern and this new `zigzagColumn` pattern.

### DS.5: 9-Dot Spinner - Startup Integration
*   **Placement:** The 9-dot spinner (`dot-grid-spinner`) will appear immediately to the left of the terminal text for the first startup message: "INITIATING STARTUP PROTOCOL".
*   **Animation:** The spinner will animate using the `spiral` pattern (as per DS.4) concurrently with the typing of "INITIATING STARTUP PROTOCOL".
*   **Transition:** Once "INITIATING STARTUP PROTOCOL" is fully typed, the spinner will animate out (e.g., `scale: 0`, `opacity: 0`) over a short duration, and then be removed from the DOM.
*   **Terminal Behavior:** The terminal's cursor (`terminal-cursor`) will remain on the line after the spinner disappears and the message is fully typed, ready for the next message.

## 3. Technical Solution Approach

### TSA.4: 9-Dot Spinner - New Pattern
*   **Module:** `src/js/animationUtils.js` (specifically `createDotGridSpinnerTimeline` function).
*   **Approach:**
    1.  Add a new pattern array to the `patterns` object within `createDotGridSpinnerTimeline`:
        ```javascript
        const patterns = {
            spiral: [0, 1, 2, 5, 8, 7, 6, 3, 4],
            rows: [0, 1, 2, 3, 4, 5, 6, 7, 8], // Existing (likely unused)
            zigzagColumn: [0, 3, 7, 1, 5, 2, 6, 4, 8] // New pattern
        };
        ```
    2.  Modify the `masterTl` within the function to alternate between the `spiral` and `zigzagColumn` patterns in its `add` calls:
        ```javascript
        masterTl.add(runPatternCycle('spiral'))
                .add(runPatternCycle('zigzagColumn'), `+=${pauseDuration * 0.5}`); // Add a slight delay for rhythm
        ```

### TSA.5: 9-Dot Spinner - Startup Integration
*   **Modules:** `src/js/terminalManager.js`, `src/js/terminalMessages.js`.
*   **Approach:**
    1.  **`terminalMessages.js`:**
        *   Locate `startupMessages.P1_EMERGENCY_SUBSYSTEMS`.
        *   Remove the `flicker: true` property if it exists (it's a legacy property no longer used for this effect).
        *   Add a `beforeTyping` array to `P1_EMERGENCY_SUBSYSTEMS` to invoke the `spinner` command:
            ```javascript
            P1_EMERGENCY_SUBSYSTEMS: {
                beforeTyping: [
                    { command: 'spinner', params: { duration: 2000, text: 'INITIATING...' } } // Duration should match typing time
                ],
                content: toUnifiedContent("INITIATING STARTUP PROTOCOL")
            },
            ```
            (The `duration` for the spinner should be roughly equivalent to the typing duration of "INITIATING STARTUP PROTOCOL" at `TERMINAL_TYPING_SPEED_STARTUP_MS_PER_CHAR`.)
    2.  **`terminalManager.js`:**
        *   The existing `_handleSpinnerCommand` is designed to create a spinner, append it to the current line, and then remove it after a duration. It already handles setting the cursor state to 'thinking' and back.
        *   Ensure `_handleSpinnerCommand` uses `createDotGridSpinnerTimeline` to animate the spinner. The `spinnerLine` will need to correctly contain the spinner and the `textNode`.
        *   Modify the `_handleSpinnerCommand` to correctly append the `textNode` and the spinner to the `spinnerLine` in the desired order (spinner first, then text). The current implementation appends `spinnerCursor` and `textNode`. This `spinnerCursor` is already using the 9-dot animation in its CSS. So no change needed to `_handleSpinnerCommand` itself.

## 4. File Manifest

*   `src/js/animationUtils.js`
*   `src/js/terminalManager.js`
*   `src/js/terminalMessages.js`
*   `src/css/partials/_terminal.css` (or main `main.css` to ensure spinner styling)

## 5. Open Questions / Clarifications

*   **DS.4 9-Dot Spinner - New Pattern:** The requested order "Col 1, Row 1, then Col 1, Row 2, then Col 2, Row 3, Then col 2, row 1, ... and so on" was interpreted as `[0, 3, 7, 1, 5, 2, 6, 4, 8]`. Please confirm this specific sequence is correct.