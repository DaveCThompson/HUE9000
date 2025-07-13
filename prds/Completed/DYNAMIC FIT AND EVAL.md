Of course. Here is the fully updated and consolidated specification document, revised to incorporate the red-team analysis and de-risk the development plan.

---

# HUE 9000 Feature Specification: Dynamic "Fit/Eval" Scan Sequence (v1.2)

**Document Version:** 1.2
**Date:** 2023-10-27
**Status:** Approved for Implementation

**Change Log (v1.1 -> v1.2):**
*   This document is the approved v1.2 specification, incorporating all prior feedback.
*   Clarified the async orchestration between `TerminalManager` and `ScanSequencePlayer` to use a Promise-based flow, mitigating execution risk (see Part 3, Section 1).
*   Standardized accessibility announcements to include mandatory per-segment feedback, creating a richer non-visual experience (see NFR-3.1 and Part 2, Section 5).
*   Added `FR-13` and a corresponding development plan for a visual lockout state, disabling other scan buttons while an animation is active to improve UX focus (see Part 3, Section 6).
*   Corrected data inconsistency for the scan target's name across all examples.
*   Enhanced the data model to include the final `conclusionMessage`, making the entire sequence fully data-driven.

---

## **Part 1: Product Requirements Document (PRD)**

### 1. Objective
To replace the static text output of the "Fit/Eval" buttons with a rich, dynamic, and visually engaging animated sequence that simulates a real-time capability scan. This will enhance user immersion and showcase the application's advanced animation capabilities.

### 2. User Stories
*   **As a user,** when I press a "Fit/Eval" button (e.g., "Craft"), I want to see a detailed, multi-stage animation that provides real-time feedback on the scanning process, making the interface feel intelligent and responsive.
*   **As a developer,** I want the scan sequence to be data-driven, allowing for easy modification of scan steps, timings, and content without rewriting the core animation logic.

### 3. Functional Requirements (FR)

| ID | Requirement | Details |
| :-- | :--- | :--- |
| FR-1 | **Initiation** | Pressing a "Fit/Eval" button on desktop or mobile shall trigger the dynamic scan sequence in the corresponding terminal. |
| FR-2 | **Main Title & Spinner** | The sequence shall begin by displaying a main title (e.g., "EVALUATING INDIVIDUAL CONTRIBUTOR FIT") preceded by a "main-processing" spinner icon. |
| FR-3 | **Scan Target Display** | A "Scan Target:" label shall appear, followed by the target's name (e.g., "DAVID THOMPSON"). The target's name must be dynamically colorable. |
| FR-4 | **Sub-Job Processing** | The scan shall consist of a series of sequential "sub-jobs" (e.g., "Expert-Level Craft," "Innovation Matrix"), driven by a configuration object. |
| FR-5 | **Sub-Job Lifecycle** | Each sub-job will proceed through the following visual lifecycle: **Queued** -> **Active** -> **Complete**. |
| FR-6 | **Active Sub-Job** | An **Active** sub-job shall display a "sub-processing" spinner and its associated title. The spinner and the main "Scan Target" name will be colored with the sub-job's unique hue. |
| FR-7 | **Rapid Text Feedback (Visual)** | During an active sub-job, a series of one-line text snippets will appear and disappear in rapid succession underneath the sub-job title. **This is a visual-only effect.** |
| FR-8 | **Text Feedback Animation** | Each feedback line will: (A) Type out quickly. (B) Flash its background with a glow effect for a set number of cycles. (C) Fade out as the next line begins to appear. |
| FR-9 | **Completed Sub-Job** | A **Complete** sub-job shall replace its spinner with a "complete" (e.g., checkmark) icon and revert its text color to the standard terminal theme. |
| FR-10 | **Progress Counter** | An overall progress percentage (e.g., "SCANNING SEGMENTS: 42%") shall be displayed and must increment as each sub-job is completed. |
| FR-11 | **Sequence Completion** | Upon reaching 100%, all elements (main title, spinners, target name) shall revert to the standard terminal theme, and a final "CONCLUSION" message (defined in the data model) shall be displayed. |
| FR-12 | **Graceful Interruption** | The scan sequence must terminate immediately and gracefully if an interrupt command is received (e.g., Reset, Clear, or another scan is initiated). All visual elements created by the scan must be removed from the DOM without leaving artifacts. |
| FR-13 | **Scan State Visual Lockout** | While a scan sequence is active, other 'Fit/Eval' and 'Skill Scan' buttons must be visually and functionally disabled to prevent concurrent animations and focus the user's attention. |

### 4. Non-Functional Requirements (NFR)

| ID | Requirement | Details |
| :-- | :--- | :--- |
| NFR-1 | **Performance** | The entire animation must run smoothly at 60 FPS on target devices. The implementation **must avoid DOM thrashing** by using an element pooling strategy for the rapid text feedback effect, reusing a small, fixed number of DOM nodes. |
| NFR-2 | **Responsiveness** | The sequence must be legible and well-formatted in both the desktop and mobile terminal views. |
| NFR-3 | **Accessibility** | The sequence must not flood screen readers with rapid, verbose updates. A dedicated, encapsulated accessibility strategy must be implemented. |
| NFR-3.1| **A11y Implementation** | The component managing the scan shall create and manage its own visually-hidden `div` with `aria-live="polite"`. This region will be updated with sparse, high-level summaries (e.g., "Scan started," "Expert-Level Craft complete," "Scan finished"). All rapidly changing visual-only elements **must** have the `aria-hidden="true"` attribute. |

---

## **Part 2: Design Specification**

### 1. Iconography (Material Symbols Outlined)
*   **Main Thinking Spinner:** `progress_activity`
*   **Main Processing Spinner:** `autorenew`
*   **Sub-Processing Spinner:** `donut_large`
*   **Completion Icon:** `check_circle`

### 2. Color Palette & Theming
*   **Sub-Job Hues:** Each sub-job will be assigned a hue from the existing `HUE_ASSIGNMENT_ROW_HUES` array for visual consistency.
*   **Dynamic Coloring:** When a sub-job is active, its assigned hue will be applied to:
    1.  The `DAVID THOMPSON` text element.
    2.  The `sub-processing` spinner icon.
    3.  The rapid-feedback text line.
*   **Completion State:** All completed elements will revert to the standard terminal text color (`--lcd-active-text-*` variables).

### 3. Animation & Timing
The animation sequence will be driven by a declarative data model. The master timeline will be constructed programmatically based on the timings defined in the data for each sub-job.

*   **Example Timing Parameters per Sub-Job:**
    *   `introDelay`: Time before the first feedback line appears (e.g., 200ms).
    *   `lineTypeSpeed`: Milliseconds per character for typing effect (e.g., 20ms).
    *   `lineFlashDuration`: Total duration of the background flash effect (e.g., 500ms).
    *   `linePersistDuration`: How long the line stays visible after flashing (e.g., 100ms).
    *   `outroDelay`: Time after the last feedback line before the job is marked complete (e.g., 300ms).

### 4. Rapid Text Flash Effect
*   The text `<span>` for a feedback line will have a `::before` pseudo-element positioned behind it.
*   The `::before` element will have its `background-color` set to the current sub-job hue with ~30% alpha.
*   GSAP will animate the `opacity` of the `::before` element from 0 to 1 and back, with `repeat: 7, yoyo: true`, and a duration of ~0.07s per flash.

### 5. Accessibility Design
The screen reader experience will be as follows, shielding the user from the high-frequency visual updates:
1.  **On Scan Start:** Announces: "Evaluation started for [Scan Target Name]."
2.  **On Sub-Job Complete:** Announces: "[Sub-Job Title] complete."
3.  **During Rapid Feedback:** No announcements are made as feedback lines flash.
4.  **On Scan End:** Announces: "Evaluation complete." followed by the final "CONCLUSION" text being read normally.

---

## **Part 3: Development Plan & Architecture**

### 1. Architectural Decision: Async-Aware Orchestration
The implementation will use a **Dedicated `ScanSequencePlayer` Class**. This class will manage a promise-based lifecycle to integrate safely with an `async`-aware `TerminalManager`.

*   **Orchestration Flow:**
    1.  `terminalManager._processQueue()` method is refactored to be `async`.
    2.  It instantiates a new `ScanSequencePlayer`, passing the terminal's content `div` and the scan configuration data.
    3.  It calls `scanPlayer.play()`, which returns a `Promise` that resolves on animation completion or rejects on interruption.
    4.  `terminalManager` will `await` this promise inside a `try...catch` block. This pauses its own queue processing without blocking the main thread.
    5.  If an interrupt command is received, `terminalManager` calls `scanPlayer.kill()`. The `kill()` method will cause the promise to `reject`, allowing the `catch` block to handle cleanup and resume queue processing.

### 2. Performance Strategy: DOM Element Pooling
To satisfy **NFR-1**, the `ScanSequencePlayer` **must** implement DOM element pooling for the rapid feedback text.
*   On initialization, the player will create a small, fixed-size pool of `<div>` elements (e.g., 3) and append them to its render target with `opacity: 0`.
*   During the animation, it will cycle through this pool, updating the `textContent` of an available element and animating it into and out of view with GSAP.
*   This completely avoids the performance penalty of creating and destroying DOM nodes in a tight loop.

### 3. State & Lifecycle Management
To satisfy **FR-12**, the `ScanSequencePlayer` class must expose a clear and robust public API for lifecycle management.
*   `play()`: Starts the animation and returns a `Promise` that wraps the master GSAP timeline.
*   `kill()`: Must be implemented to immediately:
    1.  Kill the master GSAP timeline and all its children.
    2.  Remove all DOM nodes created by the player (the main container, pooled elements, etc.).
    3.  Ensure no "zombie" animations or event listeners remain.
    4.  Reject the promise returned by `play()`.

### 4. Data-Driven Model
The `ScanSequencePlayer` will be driven by a declarative configuration object. This decouples the animation logic from the content and timing.

*   **Final Data Structure:**
    ```javascript
    // To be stored in a config or messages file
    export const scanSequences = {
      BTN3_SCAN: { // Key matches the messageKey
        mainTitle: "EVALUATING INDIVIDUAL CONTRIBUTOR FIT",
        scanTarget: "DAVID THOMPSON",
        conclusionMessage: "CONCLUSION: HIGHLY EFFECTIVE IN LEAD IC ROLE.",
        subJobs: [
          {
            title: "Expert-Level Craft",
            hue: 115, // Green
            timings: {
              introDelayMs: 200,
              lineTypeSpeedMs: 20,
              lineFlashDurationMs: 500,
              lineFlashCycles: 7,
              linePersistMs: 100,
              outroDelayMs: 300
            },
            feedbackLines: [
                "Analyzing discovery protocols...", 
                "Mapping UX architecture patterns...", 
                "Quantifying heuristic knowledge..."
            ]
          },
          // ... more subJob objects
        ]
      }
    };
    ```

### 5. Accessibility Implementation
To satisfy **NFR-3.1**, the `ScanSequencePlayer` will encapsulate its own accessibility management.
*   On `play()`, it will create a `div` with `aria-live="polite"` and `aria-atomic="true"` and append it to the terminal. It will immediately populate this `div` with the "Scan started..." message.
*   It will update the `aria-live` `div` with "[Sub-Job Title] complete." as each segment finishes.
*   All visual elements it creates (spinners, text lines, etc.) will have `aria-hidden="true"`.
*   On completion, it will update its `aria-live` `div` with the "Scan complete." message.
*   On `kill()`, it must remove its `aria-live` `div` from the DOM as part of its cleanup routine.

### 6. UI State Management During Scan
To satisfy **FR-13**, the application will enter a visual lockout state during the scan animation.
*   **Mechanism:** The `ScanSequencePlayer` will be responsible for adding a class `is-scan-active` to the `<body>` element when its `play()` method is called. It must remove this class in its `kill()` method and upon successful completion.
*   **Effect:** CSS will target this class to reduce the `opacity` and set `pointer-events: none` on all other buttons in the `.scan-button-block` containers, effectively disabling them for the duration of the animation.