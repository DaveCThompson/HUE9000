# PRD: Multi-Line Terminal Messages

**Version:** 1.0
**Date:** 2023-10-27
**Author:** AI Assistant
**Status:** Proposed

## 1. Introduction

This document outlines the requirements for enhancing the HUE 9000 terminal display to support multi-line messages for specific startup sequence events. Currently, all terminal messages, including potentially lengthy startup notifications, are rendered as single lines. This can impact readability and the desired aesthetic of a classic terminal interface. This feature will modify key startup messages to span multiple distinct lines.

## 2. Goals

*   Improve the readability and visual presentation of specific, predefined startup messages in the terminal.
*   Ensure the terminal system can gracefully handle and render messages defined as a sequence of lines.
*   Implement this change with minimal impact on the existing terminal rendering logic for single-line messages.

## 3. User Stories

*   **As a user observing the HUE 9000 startup sequence,** I want to see the "P1_EMERGENCY_SUBSYSTEMS" message displayed clearly across two lines for better readability.
*   **As a user observing the HUE 9000 startup sequence,** I want to see the "P11_SYSTEM_OPERATIONAL" message displayed clearly across two lines for better readability.
*   **As a developer,** I want the system to easily interpret and render messages defined as an array of strings, where each string represents a new line in the terminal.

## 4. Functional Requirements

*   **FR-1 (P1 Message Format):** The `P1_EMERGENCY_SUBSYSTEMS` message content shall be defined as:
    ```
    GOOD MORNING.
    INITIATING STARTUP PROTOCOL
    ```
    (Each on a separate line in the terminal output).
*   **FR-2 (P11 Message Format):** The `P11_SYSTEM_OPERATIONAL` message content shall be defined as:
    ```
    ALL SYSTEMS NOMINAL
    HUE 9000 OPERATIONAL
    ```
    (Each on a separate line in the terminal output).
*   **FR-3 (Message Data Structure):** The `terminalMessages.js` module shall be updated to store the P1 and P11 messages as arrays of strings, where each string element corresponds to one line of terminal output.
*   **FR-4 (Message Retrieval Logic):** The `getMessage()` function in `terminalMessages.js` must be updated to correctly return the array of strings if a message is defined as such, or wrap a single-string message in a single-element array, ensuring its return type is consistently an array of strings.
*   **FR-5 (Terminal Rendering Logic):** The `terminalManager.js` module's `_processQueue()` method must iterate through the array of strings provided in `messageObject.content`. For each string in the array, it must:
    *   Create a new, distinct `div.terminal-line` DOM element.
    *   Render the string content into this new `div.terminal-line`.
*   **FR-6 (Styling Consistency):** Each rendered line of a multi-line message must adhere to existing terminal line styling (e.g., font, color).
*   **FR-7 (Flicker Behavior for P1):** For the P1 message, the initial flicker effect (`textFlickerToDimlyLit`) should apply primarily to the first line ("GOOD MORNING."). The subsequent line ("INITIATING STARTUP PROTOCOL") should type out normally without the initial full-line flicker, though character-by-character typing effects still apply.
*   **FR-8 (Backward Compatibility):** Existing single-line messages in `terminalMessages.js` must continue to render correctly as single lines without any change in their definition or rendering behavior (other than `getMessage()` now consistently returning an array).

## 5. Acceptance Criteria

*   **AC-1:** During startup phase P1, the terminal visually displays "GOOD MORNING." on its own line.
*   **AC-2:** Immediately following "GOOD MORNING.", the terminal visually displays "INITIATING STARTUP PROTOCOL" on a new, subsequent line.
*   **AC-3:** During startup phase P11, the terminal visually displays "ALL SYSTEMS NOMINAL" on its own line.
*   **AC-4:** Immediately following "ALL SYSTEMS NOMINAL", the terminal visually displays "HUE 9000 OPERATIONAL" on a new, subsequent line.
*   **AC-5:** Each line segment of the multi-line messages respects existing terminal styling (font, color). The P1 first-line flicker behaves as specified in FR-7.
*   **AC-6:** Other terminal messages (not P1 or P11) remain unaffected and continue to display as single lines.
*   **AC-7:** The `terminalManager.js` correctly iterates through array-based message content, creating a new DOM element (`div.terminal-line`) for each string in the array.
*   **AC-8:** The CSS for `.terminal-line` ensures `display: block;` or equivalent to achieve visual line separation. (This is likely already in place but should be confirmed).
*   **AC-9:** The `getMessage()` function in `terminalMessages.js` consistently returns an array of strings.

## 6. Potential Issues & Risks

*   **Nested Arrays:** If `getMessage()` is not careful, it might return `[["Line 1", "Line 2"]]` instead of `["Line 1", "Line 2"]`, which would cause `terminalManager` to treat the inner array as a single string to type out (e.g., "Line 1,Line 2"). This needs careful implementation in `getMessage()`.
*   **P1 Flicker Logic:** The `playInitialTextFlicker` in `terminalManager.js` is currently designed for a single line. It needs to be confirmed that it correctly applies to the first line of the P1 message and that subsequent lines of the same message are typed normally. The current logic in `_processQueue` calls `_addNewLineAndPrepareForTyping` for *each* item in `messageObject.content`, so the flicker should naturally only apply to the first line if `_initialMessageFlickered` is managed correctly across the processing of a single multi-line message object.
*   **Message Typing Speed/Delay:** The delay between typing lines of a multi-line message (`TERMINAL_NEW_LINE_DELAY_MIN_MS`) should feel natural and not too abrupt or too slow. This might require minor tuning.
*   **Impact on `estimateFlickerDuration` or Phase Duration Calculations:** If phase durations are tightly coupled to message length, splitting messages into multiple lines (each potentially shorter) might affect these calculations if not accounted for. However, the current approach of `_processQueue` handling each line sequentially should mitigate this, as the total time will be the sum of typing times for each line plus delays.

## 7. Out of Scope

*   Inline styling of text *within* a single terminal line (e.g., bolding specific words).
*   User-configurable line wrapping for long single lines.
*   Dynamic splitting of arbitrary messages based on terminal width.