Of course. Based on the red-team analysis, here is the revised and consolidated PRD and Implementation Plan. This document supersedes the previous plan and incorporates all required fixes and clarifications for a robust, maintainable, and performant solution.

---

### **Development Plan: HUE 9000 Terminal Enhancements (V2 - Final)**

#### **Executive Summary**

This document provides the final, consolidated development plan for enhancing the HUE 9000 terminal. It incorporates critical feedback from a technical review, resulting in two major architectural revisions to the original plan:

1.  **Robust Line Wrapping:** The initial proposal to use a pixel-based JavaScript text measurer has been **rejected** due to performance (layout thrashing) and edge-case fragility (window resizing). It is replaced with a **purely algorithmic, monospace-based calculation**. This approach is significantly faster, more reliable, and better aligned with the project's aesthetic.
2.  **Theme Contract Adherence:** The initial plan to use hardcoded CSS classes for message colors (`.line-error { color: red; }`) has been **rejected** as it violates the project's core theming architecture. It is replaced with a solution that **extends the CSS theme contract**, ensuring all terminal text colors are fully themeable and centrally managed.

This revised plan delivers the same end-user features but with superior performance, maintainability, and architectural integrity.

---

### **File Manifest for Development LLM**

The following files are required for this task. They are grouped by file type, then alphabetically, and categorized by their role in the development process.

#### **CSS Files**
*   **Files to Modify:**
    *   `src/css/components/_lcd.css`: To adjust the content wrapper for better line-wrapping control.
    *   `src/css/components/_terminal.css`: To add new styles for color-coded lines and custom cursors, and to define the `max-width` in `ch` units.
    *   `src/css/core/_variables-theme-contract.css`: To add new themeable CSS variables for terminal message colors.
*   **Files for Context:**
    *   `src/css/core/_layout.css`: To understand how the terminal block fits into the overall page structure.
    *   `src/css/core/_typography.css`: To understand base font styles.

#### **HTML Files**
*   **Files for Context:**
    *   `index.html`: To understand the terminal's DOM structure (`#terminal-lcd-content`).

#### **JavaScript Files**
*   **Files to Modify:**
    *   `src/js/terminalManager.js`: The primary target for modification. Will contain the new line-wrapping logic and cursor state management.
    *   `src/js/terminalMessages.js`: To update the data structure of returned messages to include styling metadata.
*   **Files for Context:**
    *   `src/js/appState.js`: To understand how terminal messages are requested via events.
    *   `src/js/config/index.js`: To access any relevant configuration constants.
    *   `main.js`: To understand how `terminalManager` is initialized and used.

#### **Markdown Files**
*   **Files for Context:**
    *   `PROJECT_OVERVIEW.md`: For high-level project goals and architecture.

---

### **Section 1: Core Usability & Interactive Feedback**

**Objective:** To fix the terminal's fundamental text handling issues and make it more dynamic, informative, and context-aware.

#### **1.1 Feature: Robust Line Wrapping and Cursor Positioning (CRITICAL FIX)**

*   **End-User Experience:** When a long line of text wraps, the typing cursor will correctly follow the text to the end of the current visual line. Text wraps predictably, making the UI feel professional and reliable.
*   **Architectural Approach (Revised):** We will use a **purely algorithmic, monospace-based calculation** instead of DOM measurement.
    1.  The terminal's content area will be given a `max-width` in `ch` units in CSS. This character count becomes our reliable breaking point.
    2.  In `terminalManager.js`, a new private helper function will take a long string and break it into an array of smaller strings, each no longer than the `max-width` in characters. This is a fast, pure-JS operation.
    3.  The main typing loop will then iterate over this new array of *visual lines*, creating a new `div.terminal-line` for each, ensuring the cursor is always appended to the correct line.
*   **Implementation Plan:**

    1.  **Modify `_lcd.css`:**
        *   Ensure the terminal's content wrapper can control its own width for centering.
        ```css
        /* In _lcd.css */
        #terminal-lcd-content.lcd-content-wrapper {
            /* ... existing styles ... */
            display: block; /* Override flex for standard block layout */
            margin: 0 auto; /* Center the text block within the padded area */
        }
        ```

    2.  **Modify `_terminal.css`:**
        *   Set the character-based width limit. This is the **single source of truth** for line breaking.
        ```css
        /* In _terminal.css */
        #terminal-lcd-content.lcd-content-wrapper {
            max-width: 65ch; /* Example value; adjust for best visual fit */
            width: 100%;
        }
        
        .terminal-line {
            /* ... existing styles ... */
            /* NEW: Ensure long words without spaces can break */
            overflow-wrap: break-word; 
        }
        ```

    3.  **Modify `terminalManager.js`:**
        *   Add a new configuration constant for the character limit, ensuring it stays in sync with the CSS.
        *   Create a new private helper for word-aware line breaking.
        *   Update `_typeMessage` to use this new logic.

*   **Code Snippets (`terminalManager.js`):**
    ```javascript
    // At the top of terminalManager.js, or imported from config
    const TERMINAL_MAX_CHARS_PER_LINE = 65; // Must match CSS!

    class TerminalManager {
        // ... constructor and other methods ...

        // NEW private helper method
        _breakTextIntoVisualLines(text) {
            const lines = [];
            const words = text.split(' ');
            let currentLine = '';

            for (const word of words) {
                if ((currentLine + ' ' + word).length > TERMINAL_MAX_CHARS_PER_LINE && currentLine.length > 0) {
                    lines.push(currentLine);
                    currentLine = word;
                } else {
                    if (currentLine.length > 0) {
                        currentLine += ' ';
                    }
                    currentLine += word;
                }
            }
            if (currentLine.length > 0) {
                lines.push(currentLine);
            }
            return lines;
        }

        async _typeMessage(messageObject, promise) {
            // ... (spacingBefore logic) ...

            // REVISED LOGIC
            const allVisualLines = [];
            for (const logicalLine of messageObject.content) {
                // Use the new helper to break each logical line into visual lines
                const visualLines = this._breakTextIntoVisualLines(logicalLine);
                allVisualLines.push(...visualLines);
            }
            
            // The rest of the loop now iterates over perfectly sized lines
            for (let i = 0; i < allVisualLines.length; i++) {
                if (promise.abort) return;

                const lineText = allVisualLines[i];
                // Pass the message's class (for color-coding) to the line creation method
                this._addNewLineAndPrepareForTyping(false, messageObject.className); 
                
                // ... (typeLine and pause logic) ...
            }
            this._isFirstLine = false;
        }

        // REVISED SIGNATURE
        _addNewLineAndPrepareForTyping(isSpacer = false, className = null) {
            this._currentLineElement = document.createElement('div');
            this._currentLineElement.className = 'terminal-line';
            if (className) {
                this._currentLineElement.classList.add(className);
            }
            // ... (rest of the method) ...
        }
    }
    ```

#### **1.2 Feature: Color-Coded Message Lines**

*   **End-User Experience:** System messages can now have distinct colors (e.g., critical errors in red, warnings in yellow), making the terminal output easier to parse at a glance.
*   **Architectural Approach (Revised):** We will **extend the theme contract** with new CSS variables. The `terminalMessages.js` module will provide metadata (`className`) which `terminalManager.js` will apply to the DOM. The CSS will then use the theme variables to style these classes.
*   **Implementation Plan:**

    1.  **Modify `_variables-theme-contract.css`:**
        *   Define the new color variables.
        ```css
        :root {
            /* ... existing variables ... */
            /* --- Component: Terminal (Additions) --- */
            --terminal-text-color-default: inherit; /* Inherits from standard LCD text color */
            --terminal-text-color-error-l: 0.75; --terminal-text-color-error-c: 0.22; --terminal-text-color-error-h: 25;
            --terminal-text-color-warning-l: 0.85; --terminal-text-color-warning-c: 0.18; --terminal-text-color-warning-h: 85;
            --terminal-text-color-success-l: 0.82; --terminal-text-color-success-c: 0.20; --terminal-text-color-success-h: 145;
        }
        ```

    2.  **Modify `_terminal.css`:**
        *   Create styles for the new classes that use the theme variables.
        ```css
        /* In _terminal.css */
        .terminal-line.line-error {
            color: oklch(var(--terminal-text-color-error-l) var(--terminal-text-color-error-c) var(--terminal-text-color-error-h));
        }
        .terminal-line.line-warning {
            color: oklch(var(--terminal-text-color-warning-l) var(--terminal-text-color-warning-c) var(--terminal-text-color-warning-h));
        }
        .terminal-line.line-success {
            color: oklch(var(--terminal-text-color-success-l) var(--terminal-text-color-success-c) var(--terminal-text-color-success-h));
        }
        ```

    3.  **Modify `terminalMessages.js`:**
        *   Update `getMessage` to return a `className` property in the message object where appropriate.
        ```javascript
        // Example within getMessage() in terminalMessages.js
        case 'status':
            const statusTemplate = statusMessageTemplates[messageKey];
            if (statusTemplate) {
                // ...
                // NEW: Add className based on message key
                if (messageKey.startsWith('RESIST_SHUTDOWN')) {
                    messageProperties.className = 'line-warning';
                }
                if (messageKey === 'FSM_ERROR') {
                    messageProperties.className = 'line-error';
                }
            }
            // ...
            // Final return object
            return { content, formatting, ...messageProperties }; // messageProperties now contains className
        ```

---

### **Section 2: Immersive Screen & Display Enhancements**

*(No architectural changes were needed for this section; the original plan was sound.)*

**Objective:** To elevate the terminal's visual fidelity to better emulate a physical CRT screen.

#### **2.1 Feature: Enhanced Scanline & Jitter Effect**

*   **End-User Experience:** A more realistic, dynamic scanline effect with a slow continuous scroll and a subtle, high-frequency horizontal jitter, making the screen feel more "alive" and analog.
*   **Architectural Approach:** A composite CSS animation on the terminal container's `::before` pseudo-element. This is highly performant.
*   **Implementation Plan & Snippets (`_terminal.css`):**
    ```css
    /* In _terminal.css, modifying the existing ::before rule on .lcd-container.actual-lcd-screen-element */
    .lcd-container.actual-lcd-screen-element::before {
        /* ... existing styles ... */
        background-position: 0 0;
        /* NEW: Composite animation */
        animation: 
            terminalScanlineMove 8s linear infinite,
            terminalJitter 0.07s steps(1, end) infinite;
        will-change: background-position; /* Performance hint */
    }

    /* Keep existing keyframes */
    @keyframes terminalScanlineMove {
        from { background-position-y: 0; }
        to { background-position-y: calc(var(--terminal-scanline-thickness) * -8); }
    }

    /* NEW keyframes for jitter */
    @keyframes terminalJitter {
        0%, 100% { background-position-x: 0; }
        25%      { background-position-x: -1px; }
        50%      { background-position-x: 1px; }
        75%      { background-position-x: -2px; }
    }
    ```

---

### **End-to-End Validation Walkthrough**

This walkthrough validates the revised architecture by tracing a complex scenario: **A user action triggers a long error message.**

1.  **Event Trigger:** A user clicks a button. An event is emitted: `appState.emit('requestTerminalMessage', { type: 'status', messageKey: 'FSM_ERROR', ... })`.
2.  **Message Generation (`terminalMessages.js`):**
    *   `getMessage` is called with the payload.
    *   It finds the template for `FSM_ERROR`.
    *   It generates the `content` array, which contains a single, long string: `["CRITICAL SYSTEM ERROR: Core directive conflict. Manual override required. Shutdown inhibited."]`
    *   Crucially, it adds the metadata: `messageProperties.className = 'line-error'`.
    *   It returns the final message object: `{ content: [...], className: 'line-error', ... }`.
3.  **Message Processing (`terminalManager.js`):**
    *   `_handleRequestTerminalMessage` receives the object and queues it.
    *   `_processQueue` picks it up and calls `_typeMessage`.
4.  **Line Breaking (`_typeMessage`):**
    *   The single long string from `messageObject.content` is passed to `this._breakTextIntoVisualLines()`.
    *   Assuming `TERMINAL_MAX_CHARS_PER_LINE` is 65, the helper function processes the string and returns a new array, `allVisualLines`:
        ```
        [
            "CRITICAL SYSTEM ERROR: Core directive conflict. Manual override",
            "required. Shutdown inhibited."
        ]
        ```
5.  **Typing and Styling (The Loop):**
    *   **Iteration 1:**
        *   The loop takes the first line: `"CRITICAL SYSTEM ERROR: ..."`.
        *   It calls `_addNewLineAndPrepareForTyping(false, 'line-error')`.
        *   Inside `_addNewLineAndPrepareForTyping`, a new `<div class="terminal-line line-error">` is created and appended to the DOM.
        *   `_typeLine` types out the first string. The cursor is attached to this `div` and follows along correctly.
    *   **Iteration 2:**
        *   The loop takes the second line: `"required. Shutdown inhibited."`.
        *   It calls `_addNewLineAndPrepareForTyping(false, 'line-error')` again.
        *   A *second* `<div class="terminal-line line-error">` is created and appended.
        *   `_typeLine` types out the second string. The cursor is now attached to this *new* `div` and follows correctly to the end.
6.  **Rendering (CSS):**
    *   The browser renders the two `div`s.
    *   The rule `.terminal-line.line-error` in `_terminal.css` matches.
    *   It applies `color: oklch(var(--terminal-text-color-error-l) ...);`.
    *   The browser resolves this variable using the values defined in `_variables-theme-contract.css`.
    *   The text appears in the correct "error" color, which is consistent with the application's overall theme.

**Validation Complete:** The revised approach successfully fixes the line-wrapping and cursor bug with a performant algorithm and correctly implements color-coding while adhering to the project's architectural principles.