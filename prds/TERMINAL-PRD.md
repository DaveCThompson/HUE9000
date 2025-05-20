Okay, incorporating the flicker-on effects for the terminal text and background at specific startup phases is a great touch, aligning it with the energizing feel of other components.

Here's the updated PRD with these additions:

---

## **HUE 9000: Enhanced Terminal - Product Requirements Document (FINAL - REFACTOR-V2.3)**

**Version:** 1.1
**Date:** October 26, 2023
**Project Intent:** To evolve the HUE 9000's main terminal display into a dynamic, immersive, and interactive component, significantly enhancing the retro-futuristic control panel experience and user feedback.

**1. Concise Requirements Summary:**

The HUE 9000 terminal will be enhanced to provide a dynamic, auto-scrolling, type-on display for system messages. It will feature a blinking block cursor on the current line where text is being actively typed or is imminently expected. Messages, including large pre-defined text blocks triggered by BTN1-4 and pseudo-randomized status updates from control interactions (dials, hue assignments, system startup), will be queued and typed out sequentially with configurable, context-dependent speeds. The visual aesthetic will feature theme-independent CRT-style text effects (subtle glow, drop shadow) and an animated scanline overlay, applied over the standard themed LCD background. **Terminal text will execute a fast flicker-on effect upon initial visibility during startup. The terminal's dim background will flicker on in Phase 4, and its full themed background/text appearance will flicker on during the Phase 6 theme transition.** All message content (strings, templates) will be centralized in a dedicated file. The implementation will primarily involve a new `terminalManager.js` module for display logic, a `terminalMessages.js` file for content, modifications to `appState.js` for robust message eventing, and new CSS/variables for styling.

**2. Detailed Requirements & Architectural Specifications:**

**2.1. Core Terminal Behavior & Mechanics:**

*   **R1.1: Display & Scrolling:**
    *   **R1.1.1:** The terminal display area (identified as the existing `.actual-lcd-screen-element`) will have its CSS `overflow-y` property set to `hidden`.
    *   **R1.1.2:** A new `terminalManager.js` module will dynamically manage individual line elements (e.g., `<div>` or `<p>`) within the `#terminal-lcd-content` container.
    *   **R1.1.3:** Text will initially fill from the top of the `#terminal-lcd-content` container. Once the visible area is full, older lines will programmatically scroll upwards as new lines are added at the bottom, keeping the latest content in view.
    *   **R1.1.4:** A configurable maximum number of lines (e.g., `TERMINAL_MAX_LINES_IN_DOM` = 150, defined in `config.js`) will be maintained in the DOM; oldest lines are removed as new ones cause this limit to be exceeded.
    *   **R1.1.5:** Font: IBM Plex Mono will continue to be used, with a new CSS variable (`--terminal-font-weight`) allowing for a configurable, increased font weight (defaulting to e.g., `500`).
*   **R1.2: Typing Effect:**
    *   **R1.2.1:** All messages will feature a character-by-character typing effect, to be implemented using GSAP's TextPlugin (or an equivalent robust utility).
    *   **R1.2.2:** Configurable typing speeds (defined in `config.js`), per character:
        *   Short status messages: `TERMINAL_TYPING_SPEED_STATUS_MS_PER_CHAR` (e.g., 40ms).
        *   Large text blocks (from BTN1-4): `TERMINAL_TYPING_SPEED_BLOCK_MS_PER_CHAR` (e.g., 15ms).
        *   System startup messages: `TERMINAL_TYPING_SPEED_STARTUP_MS_PER_CHAR` (e.g., 20ms).
    *   **R1.2.3:** A slight, configurable, and randomized delay (`TERMINAL_NEW_LINE_DELAY_MIN_MS` to `TERMINAL_NEW_LINE_DELAY_MAX_MS`, defined in `config.js`) will precede the typing of each new message entry/block in the queue.
*   **R1.3: Message Queuing:**
    *   **R1.3.1:** `terminalManager.js` will maintain an internal FIFO (First-In, First-Out) queue for incoming message requests.
    *   **R1.3.2:** Messages will be processed and typed one at a time from the queue. The typing of one full message block must complete before the next one begins.
*   **R1.4: Cursor:**
    *   **R1.4.1:** Visual: A block cursor (e.g., `▋`). Its color will be the standard themed LCD text color, derived from `oklch(var(--lcd-text-l) var(--lcd-text-c) var(--lcd-text-h))`.
    *   **R1.4.2:** Blink: A CSS-animated blink with configurable on/off durations (`TERMINAL_CURSOR_BLINK_ON_MS`, `TERMINAL_CURSOR_BLINK_OFF_MS` in `config.js`).
    *   **R1.4.3:** Behavior:
        *   The cursor is visible only on the "current" line where text is actively being typed or is about to be typed.
        *   It appears at the beginning of a new blank line before typing for that line/message starts.
        *   It positions itself immediately after the last typed character during the typing animation.
        *   It disappears once the current line (or entire message block, TBD by typing effect implementation) is fully typed.
        *   If the message queue is empty after a message completes, the cursor remains hidden. If there's a next message in the queue, the cursor reappears on the new blank line allocated for that subsequent message before typing begins.
*   **R1.5: Startup Flicker Effects (NEW):**
    *   **R1.5.1:** **Initial Text Flicker:** When the first line(s) of text become visible on the terminal during the initial page load/startup sequence (likely P0 or P1 as "INITIALIZING..." appears), the text itself should execute a fast flicker-on effect (similar to button light flickers, e.g., using GSAP to rapidly animate opacity from near 0 to full). This applies to the text content, not the background.
    *   **R1.5.2:** **Phase 4 Dim Background Flicker:** During Startup Phase 4 (Pre-Start Priming), when the terminal is intended to adopt its "dimly-lit active" appearance, the terminal's background (using `var(--lcd-bg-*)` variables appropriate for `theme-dim` and an active state) should flicker on. This flicker targets the background color/opacity of the `.actual-lcd-screen-element`.
    *   **R1.5.3:** **Phase 6 Full Theme Flicker:** During Startup Phase 6 (System Energize & Theme Transition), as the global theme transitions from `theme-dim` to `theme-dark`, the terminal's entire visual state (background, text color, using `var(--lcd-bg-*)` and `var(--lcd-text-*)` for `theme-dark`) should flicker to this new state, synchronized with the global CSS transition.

**2.2. Message Content & Triggers:**

*   **R2.1: Message Source - BTN1-4:**
    *   **R2.1.1:** Trigger: Single click on designated UI elements BTN1, BTN2, BTN3, or BTN4.
    *   **R2.1.2:** Content: Each button triggers a unique, pre-defined multi-line text block (ranging from 5 to 25 lines). Content may include paragraphs and simple bulleted lists (e.g., lines starting with `* ` or `- ` which will be typed as literal text).
*   **R2.2: Message Source - Control Interactions:**
    *   **R2.2.1:** Dials (MOOD/Dial A, INTENSITY/Dial B): A message is generated upon interaction end (e.g., `mouseup` or `touchend` after a drag). The content will reflect the final dial value and be chosen from a set of pseudo-randomized status message variations.
    *   **R2.2.2:** HUE ASSN Grid Buttons: A message is generated on click. The content will indicate the target element (ENV, LCD, LOGO, BTN) and the assigned hue value/row number, along with a pseudo-randomized status message variation.
*   **R2.3: Message Content Repository (`terminalMessages.js` - New File):**
    *   **R2.3.1:** A new `src/js/terminalMessages.js` file will centralize all message strings, templates, and logic for pseudo-randomization of status messages.
    *   **R2.3.2:** This file will export functions like `getBlockMessage(messageKey)` (e.g., `messageKey` = 'BTN1') and `getStatusMessage(source, data)` (e.g., `source` = 'dialA', `data` = `{ value: 123 }`) for `terminalManager.js` to consume.
    *   **R2.3.3:** The stylistic tone for messages should be inspired by "HAL 9000": informative, concise, and a neutral-to-formal tone.
*   **R2.4: Message Structure (for `appState` event emission):**
    *   **R2.4.1:** Interactions requiring terminal output will trigger an `appState.emit('requestTerminalMessage', payload)` event.
    *   **R2.4.2:** The `payload` object structure will be: `{ type: 'status' | 'block' | 'startup', source: string, // Descriptive source, e.g., 'dialA', 'BTN1', 'systemStartupP1' data?: object, // Optional data for message interpolation, e.g., { value: 123, target: 'ENV', hue: 246 } messageKey?: string // Optional specific key for direct lookup in terminalMessages.js (primarily for block messages) }`
*   **R2.5: Startup Messages:**
    *   **R2.5.1:** Existing system startup messages (e.g., "INITIALIZING...", "MAIN POWER RESTORED...") originating from `main.js` phases will be routed through this new terminal system using the `'startup'` message type. These messages will also adhere to the startup flicker effects (R1.5).
    *   **R2.5.2:** The final startup message displayed will be "HUE 9000 READY."

**2.3. Visual Design & Aesthetics:**

*   **R3.1: Terminal Background & Font:**
    *   **R3.1.1:** The terminal element (`.actual-lcd-screen-element`) will use the standard themed LCD background color, defined by `oklch(var(--lcd-bg-l) var(--lcd-bg-c) var(--lcd-bg-h) / var(--lcd-bg-a))`.
    *   **R3.1.2:** The `noise.svg` texture currently applied to panel sections will *not* be displayed on the terminal background. This requires a CSS override: `.actual-lcd-screen-element { background-image: none !important; }`.
    *   **R3.1.3:** Font: IBM Plex Mono will be used, with a specific CSS variable for weight: `font-weight: var(--terminal-font-weight, 500);`.
*   **R3.2: CRT Text Effects (Theme-Independent):**
    *   **R3.2.1:** These effects will be applied to all text rendered within the terminal, including the cursor. Their properties will be defined via CSS custom variables in `_variables-theme-contract.css` and are *not* intended to be significantly altered by theme-specific CSS files (e.g., `theme-dark.css`, `theme-light.css`) to maintain a consistent terminal appearance.
    *   **R3.2.2:** Glow: A subtle bloom effect around text characters.
        *   Implementation: Via CSS `text-shadow`. Example: `text-shadow: 0 0 var(--terminal-text-glow-radius) var(--terminal-text-glow-color), ...;` (can be layered with the drop shadow).
        *   `--terminal-text-glow-radius`: (e.g., `8px`).
        *   `--terminal-text-glow-color`: Derived from the current LCD text color but with a low alpha (e.g., `oklch(var(--lcd-text-l) var(--lcd-text-c) var(--lcd-text-h) / 0.15)`).
    *   **R3.2.3:** Drop Shadow: A subtle, tight drop shadow for slight depth.
        *   Implementation: Added as another layer to the CSS `text-shadow` property. Example: `... , var(--terminal-text-drop-shadow-offset-x) var(--terminal-text-drop-shadow-offset-y) var(--terminal-text-drop-shadow-blur) var(--terminal-text-drop-shadow-color);`
        *   `--terminal-text-drop-shadow-offset-x`: (e.g., `0.5px`).
        *   `--terminal-text-drop-shadow-offset-y`: (e.g., `0.5px`).
        *   `--terminal-text-drop-shadow-blur`: (e.g., `0px` to `1px`).
        *   `--terminal-text-drop-shadow-color`: (e.g., `oklch(0 0 0 / 0.2)`).
*   **R3.3: Scanline Overlay (Theme-Independent):**
    *   **R3.3.1:** An animated scanline effect (e.g., subtle, slowly rolling horizontal lines) will be overlaid across the terminal content area.
    *   **R3.3.2:** Implementation: Via a dedicated, absolutely positioned `<div>` (e.g., `<div class="terminal-scanline-overlay"></div>`) placed within `.actual-lcd-screen-element`, or another suitable CSS/JS technique that allows for animation.
    *   **R3.3.3:** Visual style (color, thickness, speed, animation technique) is TBD but should aim for subtlety and be defined via CSS custom variables (e.g., `--terminal-scanline-color`, `--terminal-scanline-thickness`, `--terminal-scanline-animation-duration`).

**2.4. Technical Implementation, Architecture & File Impact:**

*   **R4.1: New Files:**
    *   **R4.1.1: `src/js/terminalManager.js`:**
        *   **Purpose:** Primary controller for terminal display logic and behavior.
        *   **Responsibilities:** DOM management for lines within `#terminal-lcd-content`, scrolling, GSAP TextPlugin integration for typing, cursor management (position, blink, visibility), internal message queue, processing messages from `appState`, **orchestrating startup flicker effects (R1.5) for terminal content and background.**
        *   **Initialization:** From `main.js`, receiving the `.actual-lcd-screen-element` DOM reference.
    *   **R4.1.2: `src/js/terminalMessages.js`:**
        *   **Purpose:** Central repository for all terminal message strings and templates.
        *   **Responsibilities:** Stores static text blocks, templates for dynamic status messages, and logic for pseudo-random message selection. Exports functions for `terminalManager.js` to retrieve formatted messages.
    *   **R4.1.3: `src/css/components/_terminal.css`:**
        *   **Purpose:** Contains all new CSS rules specific to the enhanced terminal.
        *   **Responsibilities:** Styling for terminal lines, cursor (animation, appearance), CRT text effects (utilizing CSS variables), scanline overlay, and CSS overrides for `.actual-lcd-screen-element` (e.g., `overflow-y: hidden`, `background-image: none`, `font-weight: var(--terminal-font-weight)`). **Will include helper classes or states for managing flicker visibility if needed by GSAP.**
*   **R4.2: Modified Files:**
    *   **R4.2.1: `src/js/appState.js`:**
        *   **Deprecation:** `terminalLcdMessage` string state and `setTerminalLcdMessage()` function will be deprecated for the main terminal's functionality.
        *   **New Eventing:** The internal `EventEmitter` will be augmented to handle a new `'requestTerminalMessage'` event type. Modules will use `appState.emit('requestTerminalMessage', payload)` to send message requests.
    *   **R4.2.2: `src/js/main.js`:**
        *   **Initialization:** Will initialize the new `terminalManager.js`.
        *   **Event Triggers:** Startup sequence phases will be updated to trigger terminal messages via the new `appState.emit('requestTerminalMessage', ...)` system. **Startup phases (P0/P1, P4, P6) will coordinate with `terminalManager.js` to trigger the specified flicker effects (R1.5).**
        *   **Interaction Handlers:** Any global event handlers for UI elements (e.g., BTN1-4 clicks if managed here) will be updated to use the new `appState` event system for terminal messages.
    *   **R4.2.3: `src/js/config.js`:**
        *   **Additions:** Will include new configuration constants for terminal behavior: `TERMINAL_MAX_LINES_IN_DOM`, typing speeds (`_STATUS_MS_PER_CHAR`, `_BLOCK_MS_PER_CHAR`, `_STARTUP_MS_PER_CHAR`), new line delays (`_MIN_MS`, `_MAX_MS`), and cursor blink rates (`_ON_MS`, `_OFF_MS`). **May include flicker profile parameters if distinct from button flickers.**
    *   **R4.2.4: `src/css/core/_variables-theme-contract.css`:**
        *   **Additions:** Will be extended with new CSS custom variables for terminal-specific styling, intended to be theme-independent:
            *   `--terminal-font-weight`
            *   `--terminal-cursor-blink-on-duration`, `--terminal-cursor-blink-off-duration`
            *   `--terminal-text-glow-radius`, `--terminal-text-glow-color`
            *   `--terminal-text-drop-shadow-offset-x`, `--terminal-text-drop-shadow-offset-y`, `--terminal-text-drop-shadow-blur`, `--terminal-text-drop-shadow-color`
            *   Variables for scanlines (e.g., `--terminal-scanline-color`, `--terminal-scanline-thickness`, `--terminal-scanline-animation-duration`).
    *   **R4.2.5: `src/js/uiUpdater.js`:**
        *   **Changes:** Will cease directly updating the `innerHTML` of `#terminal-lcd-content` based on the old `terminalLcdMessage` state from `appState`. Its role concerning the main terminal content is superseded by `terminalManager.js`. It will still manage other LCDs (Dial A/B). **May need a method for `terminalManager.js` to query current theme-based LCD text/bg colors if not directly accessible via CSS vars by `terminalManager.js` for flicker targets.**
    *   **R4.2.6: Other JS modules triggering UI feedback (e.g., `dialManager.js`, event handlers in `buttonManager.js` for specific action buttons if not handled in `main.js`):**
        *   **Changes:** Will be updated to emit the `'requestTerminalMessage'` event through `appState.js` for relevant user actions, instead of any prior direct console logging or simpler UI feedback meant for the terminal.
*   **R4.3: HTML Structure (Assumptions & Management):**
    *   **R4.3.1:** The existing `div#terminal-lcd-content` (within `.actual-lcd-screen-element`) is expected. `terminalManager.js` will dynamically populate this element with individual line elements (e.g., `<div class="terminal-line">...</div>`) and a cursor element.
    *   **R4.3.2:** A scanline overlay element (e.g., `<div class="terminal-scanline-overlay"></div>`) will be added, likely as a direct child of `.actual-lcd-screen-element`, positioned to overlay `#terminal-lcd-content`.
*   **R4.4: Accessibility (ARIA):**
    *   **R4.4.1:** The main terminal container (`.actual-lcd-screen-element`) should have `role="log"`.
    *   **R4.4.2:** The `#terminal-lcd-content` element, which will contain the dynamically added lines, should have `aria-live="polite"` to announce new messages to assistive technologies.
    *   **R4.4.3:** The visual cursor element managed by `terminalManager.js` should have `aria-hidden="true"`.

**2.5. Phasing (Internal Development Guide - High-Level):**

*   **Phase 1 (MVP - Core Mechanics & Basic Content):**
    *   Establish `terminalManager.js` with basic line management, auto-scroll, and single-speed GSAP typing.
    *   Implement a basic block cursor (style, color, simple blink, follows typing).
    *   Integrate test messages from BTN1 and Dial A via the new `appState` eventing.
    *   Basic CRT glow effect and updated font weight.
    *   Essential CSS and variable setup.
    *   **Implement initial text flicker-on (R1.5.1).**
*   **Phase 2 (Enhancements - Richer Content & Effects):**
    *   Implement message queuing in `terminalManager.js`.
    *   Introduce variable typing speeds and inter-message delays.
    *   Develop `terminalMessages.js` with full content and randomization logic.
    *   Integrate all specified message triggers (all Dials, HUE ASSN, full startup sequence).
    *   Refine cursor behavior (hide/show logic, placement on new lines).
    *   Add CRT drop shadow effect.
    *   Implement full DOM line limiting.
    *   **Implement Phase 4 dim background flicker (R1.5.2) and Phase 6 full theme flicker (R1.5.3).**
*   **Phase 3 (Polish - Advanced Visuals & Optimization):**
    *   Design and implement the animated scanline overlay.
    *   Fine-tune all visual effects for optimal aesthetics and performance.
    *   Conduct thorough performance testing and optimize as needed.
    *   Finalize all configurable values in `config.js`.

=============================

Okay, we've made excellent progress! The terminal is displaying text, messages are flowing, and the basic structure is in place. The background and padding issues are also resolved.

Here's a list of next steps to fully realize the Terminal PRD, with structured details for the immediate next step:

## Next Steps - Overall Roadmap

1.  **Refine Terminal Visuals & Polish (Immediate Next Step - Detailed Below):**
    *   CRT Text Effects (Glow, Drop Shadow).
    *   Scanline Overlay Aesthetics.
    *   Cursor Blink Animation (ensure CSS variables are used).
    *   Finalize Terminal Font Weight.
2.  **Implement Remaining Message Triggers & Content:**
    *   Dial Interactions (MOOD/Dial A, INTENSITY/Dial B) triggering status messages.
    *   HUE ASSN Grid Button clicks triggering status messages.
    *   Full content for `terminalMessages.js` including pseudo-randomization for status messages.
3.  **Advanced Terminal Behavior:**
    *   Refine scrolling behavior if any edge cases are found.
    *   Implement DOM line limiting (`TERMINAL_MAX_LINES_IN_DOM`).
    *   Consider max queue length if testing reveals issues (currently unbounded).
4.  **Accessibility (ARIA):**
    *   Ensure `role="log"` on the terminal container.
    *   Ensure `aria-live="polite"` on `#terminal-lcd-content`.
    *   Ensure cursor has `aria-hidden="true"`.
5.  **Thorough Testing & Bug Fixing:**
    *   Test all startup phases and interactive message triggers.
    *   Test across different interaction speeds.
    *   Performance profiling, especially with many lines and rapid messages.
6.  **Code Cleanup & Final Review:**
    *   Remove any temporary debug logs.
    *   Ensure all configurations are in `config.js`.
    *   Review for maintainability and adherence to project standards.

---

## Detailed Next Step: Refine Terminal Visuals & Polish

This step focuses on implementing the specific visual effects outlined in the PRD to achieve the desired CRT/retro-futuristic terminal aesthetic.

**A. CRT Text Effects (PRD R3.2)**

*   **Goal:** Apply subtle glow and drop shadow to all text within the terminal, including the cursor, using CSS variables for theme-independence of the effect's *style* (while color can adapt).
*   **Files to Modify:**
    *   `src/css/components/_terminal.css`
    *   `src/css/core/_variables-theme-contract.css` (to ensure variables are defined, though they mostly are)
*   **Detailed Actions & CSS Properties:**
    1.  **Target Element:** The `text-shadow` property should be applied to `#terminal-lcd-content`. Since `.terminal-line` and `.terminal-cursor` inherit color, they should also effectively inherit the appearance of the text shadow if it's based on text color.
    2.  **CSS Variables (from `_variables-theme-contract.css` - verify/ensure present):**
        *   `--terminal-text-glow-radius: 8px;` (already defined)
        *   `--terminal-text-glow-color-base-alpha: 0.15;` (already defined)
        *   `--terminal-text-drop-shadow-offset-x: 0.5px;` (already defined)
        *   `--terminal-text-drop-shadow-offset-y: 0.5px;` (already defined)
        *   `--terminal-text-drop-shadow-blur: 0px;` (already defined)
        *   `--terminal-text-drop-shadow-color: oklch(0 0 0 / 0.2);` (already defined)
    3.  **CSS Implementation in `_terminal.css` (verify/refine existing):**
        ```css
        #terminal-lcd-content {
            /* ... existing styles ... */
            text-shadow:
                /* Glow: Uses current LCD text color (via CSS vars) with a specific alpha */
                0 0 var(--terminal-text-glow-radius) oklch(
                    var(--lcd-active-text-l) /* From theme-contract/theme */
                    calc(var(--dynamic-lcd-chroma) * var(--lcd-base-chroma-factor)) /* Dynamic part */
                    var(--dynamic-lcd-hue) /* Dynamic part */
                    / var(--terminal-text-glow-color-base-alpha) /* Fixed alpha for glow intensity */
                ),
                /* Drop Shadow: Fixed color and offsets */
                var(--terminal-text-drop-shadow-offset-x) 
                var(--terminal-text-drop-shadow-offset-y) 
                var(--terminal-text-drop-shadow-blur) 
                var(--terminal-text-drop-shadow-color);
        }
        ```
        *   **Note:** The `oklch()` function for the glow color needs to correctly use the dynamic LCD hue/chroma variables that `uiUpdater.js` sets on `:root` and that the LCD text color itself uses. The current implementation in `_terminal.css` looks correct.

**B. Scanline Overlay Aesthetics (PRD R3.3)**

*   **Goal:** Implement a subtle, slowly rolling horizontal scanline effect over the terminal content.
*   **Files to Modify:**
    *   `src/css/components/_terminal.css`
    *   `src/css/core/_variables-theme-contract.css` (for scanline properties)
*   **Detailed Actions & CSS Properties:**
    1.  **CSS Variables (in `_variables-theme-contract.css` - verify/ensure present):**
        *   `--terminal-scanline-color: oklch(var(--lcd-active-text-l) calc(var(--dynamic-lcd-chroma) * var(--lcd-base-chroma-factor)) var(--dynamic-lcd-hue) / 0.05);` (already defined, color based on LCD text but very faint)
        *   `--terminal-scanline-thickness: 1px;` (already defined)
        *   `--terminal-scanline-animation-duration: 8s;` (already defined)
    2.  **CSS Implementation in `_terminal.css` (verify/refine existing):**
        *   The current pseudo-element approach on `.terminal-block > .actual-lcd-screen-element::before` is good.
        *   **Key properties to check/tune:**
            *   `background-image`: The `repeating-linear-gradient`. The current definition creates lines of `var(--terminal-scanline-thickness)` with gaps of `calc(var(--terminal-scanline-thickness) * 3)`. This ratio can be tuned for density.
            *   `background-size`: Currently `100% calc(var(--terminal-scanline-thickness) * 8)`. The `* 8` means the pattern repeats every 8 "thickness units". This, combined with the gradient stops, determines density.
            *   `opacity`: Currently `0.3`. This is a key tuning parameter for subtlety.
            *   `animation`: `terminalScanlineMove var(--terminal-scanline-animation-duration) linear infinite;`. The duration (`8s`) controls speed.
            *   `z-index`: Currently `1`. Ensure it's above the terminal background but below the actual text content in `#terminal-lcd-content` (which is `z-index: 2`). This is correct.
    3.  **Visual Tuning:** Adjust the gradient stops, `background-size` multiplier, `opacity`, and `animation-duration` to achieve the desired subtle, slow-rolling effect.

**C. Cursor Blink Animation (PRD R1.4.2)**

*   **Goal:** Ensure the cursor blinks using CSS animation driven by CSS variables.
*   **Files to Modify:**
    *   `src/css/components/_terminal.css`
    *   `src/css/core/_variables-theme-contract.css` (variables are already defined)
*   **Detailed Actions & CSS Properties:**
    1.  **CSS Variables (from `_variables-theme-contract.css` - verify/ensure present):**
        *   `--terminal-cursor-blink-on-duration: 0.53s;` (already defined)
        *   `--terminal-cursor-blink-off-duration: 0.37s;` (already defined)
    2.  **CSS Implementation in `_terminal.css` (verify/refine existing):**
        ```css
        .terminal-cursor {
            /* ... existing styles ... */
            animation: terminalCursorBlink var(--terminal-cursor-blink-on-duration) steps(1, end) 0s infinite alternate;
            animation-duration: calc(var(--terminal-cursor-blink-on-duration) + var(--terminal-cursor-blink-off-duration)); /* Total cycle time */
        }

        @keyframes terminalCursorBlink {
            0%, 100% { /* Visible state - should cover the 'on' duration percentage */
                opacity: 1;
            }
            /* Calculate percentage for off state based on durations */
            /* Example: If ON=0.53s, OFF=0.37s, Total=0.9s. Off state starts at 0.53/0.9 = 58.8% */
            /* For steps(1, end) and alternate, 50% means it's visible for half the total duration, then invisible for half. */
            /* The current steps(1, end) with alternate will make it visible for --terminal-cursor-blink-on-duration and then invisible for the same duration.
               To achieve asymmetric on/off times with a single animation, it's more complex.
               A simpler approach is to use the total duration and adjust keyframes if needed, or accept that `steps(1, end) alternate` gives a 50/50 duty cycle based on the *single* duration provided to `animation` shorthand.
               The `animation-duration` property being set to the sum is correct for the total cycle.
            */
           /* For a 50/50 blink based on the *total* duration: */
            50% { 
                opacity: 0;
            }
        }
        ```
        *   **Refinement for Asymmetric Blink:** The current `steps(1, end) alternate` with `animation-duration` set to the sum of on/off times will result in the cursor being visible for `var(--terminal-cursor-blink-on-duration)` and then invisible for `var(--terminal-cursor-blink-off-duration)`. This is actually the desired outcome. The `50% { opacity: 0; }` keyframe combined with `alternate` and the calculated total duration should work.
        *   **Verification:** Check if the blink timing feels right based on the PRD's on/off millisecond values.

**D. Finalize Terminal Font Weight (PRD R1.1.5, R3.1.3)**

*   **Goal:** Ensure the terminal uses the specified font weight via a CSS variable.
*   **Files to Modify:**
    *   `src/css/components/_terminal.css` (or `_lcd.css` if the style is on `.actual-lcd-screen-element`)
    *   `src/css/core/_variables-theme-contract.css` (variable is already defined)
*   **Detailed Actions & CSS Properties:**
    1.  **CSS Variable (from `_variables-theme-contract.css` - verify/ensure present):**
        *   `--terminal-font-weight: 500;` (already defined)
    2.  **CSS Implementation:**
        *   The PRD suggests applying this to `.actual-lcd-screen-element`.
        *   In `_terminal.css`, the rule for `.terminal-block > .actual-lcd-screen-element` should include:
            ```css
            .terminal-block > .actual-lcd-screen-element {
                /* ... existing styles ... */
                font-weight: var(--terminal-font-weight);
            }
            ```
        *   This will override any default `font-weight` from `_lcd.css` for the terminal container. The text within `#terminal-lcd-content` and `.terminal-line` should inherit this.
