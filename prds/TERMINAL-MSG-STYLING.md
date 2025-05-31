# PRD: Terminal Message Segment Styling

**Version:** 1.0
**Date:** 2023-10-27
**Author:** AI Assistant
**Status:** Proposed (Future Enhancement)

## 1. Introduction

This document outlines the requirements for a future enhancement to the HUE 9000 terminal display, enabling specific segments of text *within* a single terminal line to have unique styling (e.g., different color, font-weight, opacity). This builds upon the basic multi-line message capability and allows for more visually rich and informative terminal outputs.

## 2. Goals

*   Allow developers to define messages where individual words or phrases within a line can have distinct visual styles.
*   Enable more nuanced visual communication in the terminal (e.g., highlighting key terms, dimming less important information).
*   Implement this with a data-driven approach, keeping styling definitions primarily within `terminalMessages.js`.
*   Ensure the terminal typing animation can gracefully handle and render these styled segments.

## 3. User Stories

*   **As a user observing the HUE 9000 terminal,** I want to see key terms or values (e.g., "HUE 9000", "OPTIMAL", error codes) visually emphasized with different styling (like bold or a distinct color) for quicker comprehension.
*   **As a developer,** I want to define terminal messages with inline styling for specific text segments in a structured and maintainable way within `terminalMessages.js`.
*   **As a developer,** I want the terminal rendering system to automatically apply these segment-specific styles during the typing animation.

## 4. Functional Requirements

*   **FR-1 (Segmented Message Data Structure):**
    *   `terminalMessages.js` shall support a new data structure for lines requiring internal styling.
    *   A line within `messageObject.content` (which is an array of lines) can itself be an array of "segment objects".
    *   Each segment object must contain at least a `text` property (string).
    *   Segment objects can optionally contain a `styleClass` property (string of one or more CSS class names) or a `styleDirect` property (object for inline CSS properties).
    *   Example:
        ```javascript
        // P11_SYSTEM_OPERATIONAL: [
        //     "ALL SYSTEMS NOMINAL", // Simple string for a simple line
        //     [ // Array of segments for a styled line
        //         { text: "HUE 9000", styleClass: "text-bold terminal-accent-color" },
        //         { text: " OPERATIONAL" } // Default styling
        //     ]
        // ],
        ```
*   **FR-2 (Terminal Rendering Logic for Segments):**
    *   The `terminalManager.js` module's `_typeLine` (or a new helper function) must detect if a line's content is a simple string or an array of segment objects.
    *   If it's an array of segments:
        *   For each segment, a `<span>` element must be created.
        *   If `styleClass` is provided, these classes must be added to the `<span>`.
        *   If `styleDirect` is provided, these styles must be applied inline to the `<span>`.
        *   The `<span>` elements for all segments of a line must be appended sequentially into the parent `div.terminal-line`.
*   **FR-3 (Typing Animation for Segments):**
    *   The GSAP TextPlugin (or an equivalent character-by-character animation mechanism) must type out the `text` content of each segment into its corresponding `<span>` element.
    *   The typing animation must proceed sequentially through the segments within a single line.
*   **FR-4 (CSS Class Definitions):**
    *   Commonly used styling variations (e.g., `text-bold`, `terminal-accent-color`, `text-dimmed`) should be defined as CSS classes in the project's stylesheets.
*   **FR-5 (Backward Compatibility):**
    *   Lines defined as simple strings (not arrays of segments) must continue to render correctly with default styling, as they do currently.
    *   The multi-line message functionality (PRD 1) must remain unaffected.

## 5. Non-Functional Requirements

*   **NFR-1 (Performance):** The introduction of segmented styling and potentially more complex DOM manipulation within `_typeLine` should not noticeably degrade the terminal's typing animation performance.
*   **NFR-2 (Maintainability):** The system for defining and rendering styled segments should be understandable and maintainable.

## 6. Acceptance Criteria

*   **AC-1:** A terminal message line defined as an array of segment objects is rendered with each segment's text within its own `<span>`.
*   **AC-2:** `<span>` elements for segments correctly have CSS classes applied if `styleClass` is specified in the segment object.
*   **AC-3:** `<span>` elements for segments correctly have inline styles applied if `styleDirect` is specified.
*   **AC-4:** The terminal typing animation types out text segment by segment, preserving the order and applying styles correctly as text appears.
*   **AC-5:** Simple string-based lines continue to render as before.
*   **AC-6:** Multi-line messages (where `messageObject.content` is an array of strings/segment arrays) continue to function, with each element of `messageObject.content` forming a new `div.terminal-line`.

## 7. Potential Issues & Risks

*   **`_typeLine` Complexity:** Refactoring `_typeLine` to handle both simple strings and arrays of styled segments will significantly increase its complexity. Careful state management and animation sequencing will be required.
*   **GSAP TextPlugin Limitations with Multiple Targets:** Using TextPlugin to type into multiple `<span>` elements sequentially within a single GSAP timeline might require careful construction of that timeline, potentially adding each segment's typing animation as a separate step.
*   **Performance with Many Segments:** A line with many small, individually styled segments could lead to a large number of `<span>` elements and GSAP tweens, potentially impacting performance. This should be monitored.
*   **Style Conflicts:** Developers need to be mindful of CSS specificity if using both `styleClass` and `styleDirect`. A clear precedence rule might be needed (e.g., `styleDirect` overrides `styleClass`).
*   **Cursor Positioning:** Ensuring the blinking cursor correctly positions itself after the last typed character across multiple `<span>` elements within a line will be more complex than with a single text node. The cursor is currently appended to the `div.terminal-line`. This might still work if the `<span>` elements are `display: inline`.
*   **Flicker Effects on Segments:** If flicker effects (like `textFlickerToDimlyLit`) are desired for individual segments rather than the whole line, the `createAdvancedFlicker` utility and its integration would need to be adapted to target `<span>` elements and manage their state. This is likely out of scope for an initial implementation of segment styling but is a consideration for advanced use.

## 8. Out of Scope (for initial implementation of this feature)

*   Nested segments (segments within segments).
*   Applying complex animations (beyond simple text typing) to individual segments via the message data structure.
*   A UI/editor for creating styled terminal messages.