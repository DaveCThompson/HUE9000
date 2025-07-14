# PRD/Design Spec: Scan Sequence Visuals & Behavior Enhancements

## 1. Functional Requirements

### FR.1: Scan Sequence - Type Window Behavior
The single-line "type window" renderer (used for `.typeWindow` scan sub-jobs) must ensure a clear and stable display of the final typed text before transitioning out, eliminating any perceived "gaps" or premature disappearance of content.

### FR.2: Scan Sequence - Visibility of Sub-Jobs
Only the currently active scan sub-job should be prominently displayed. Upcoming (queued) and completed sub-jobs must be visually de-emphasized to maintain user focus.

### FR.3: Scan Sequence - Completed Sub-Job Visuals
Completed scan sub-job titles should adopt a visually fainter appearance to indicate their status without disappearing entirely. The overall scan conclusion message should remain fully prominent.

### FR.7: Scan Progress Display Precision
The overall scan progress percentage displayed in the header of the scan sequence must animate smoothly and include one decimal place.

## 2. Design Specifications

### DS.1: Scan Sequence - Type Window Behavior
*   **Current Behavior (Problem):** The `renderTypeWindow` currently applies a `scrambleText` effect across all lines, which means the text is constantly changing, even on the last line, before the container fades out. This can lead to a perception of a "gap" if the final text isn't displayed stably.
*   **Desired Behavior:**
    *   For the last `progressiveLine` in the `renderTypeWindow` sequence, the text should type out normally (without scrambling) and then remain static and fully visible for a brief pause.
    *   After this pause, the entire `scan-progressive-line-container` (which holds the text and pulse background) will smoothly fade out.
*   **Visual Example (ASCII Wireframe - conceptual flow):**
    ```
    +---------------------------------+
    | > INITIALIZING SCAN...          | (Line 1, scrambling)
    +---------------------------------+
    
    +---------------------------------+
    | > INITIALIZING SCAN...          | (Line 1, settled)
    | > DATA STREAM ESTABLISHED.      | (Line 2, scrambling)
    +---------------------------------+
    
    ... (intermediate lines) ...
    
    +---------------------------------+
    | > ANALYSIS COMPLETE.            | (Last Line, settled, NO SCRAMBLE)
    +---------------------------------+
    
    (Brief Pause - last line remains visible and stable)
    
    +---------------------------------+
    |                                 | (Entire container fades out)
    +---------------------------------+
    ```

### DS.2: Scan Sequence - Visibility of Sub-Jobs
*   **Initial State (All Sub-Jobs):**
    *   All `scan-job-wrapper` elements (except the main header and the overall `scan-animation-container`) will start with `opacity: 0` (or `autoAlpha: 0`) and `pointer-events: none`.
*   **Active State (Current Sub-Job):**
    *   When a `scan-job-wrapper` becomes the active sub-job, it will animate to `opacity: 1` over a short duration (e.3s, ease: `power2.out`).
    *   `pointer-events` should be `auto` for the active job's content.
*   **Completed State (Previous Sub-Jobs):**
    *   When a `scan-job-wrapper` completes its animation, it will transition to `opacity: 0.3` over a short duration (e.g., 0.3s, ease: `power2.out`).
    *   The `pointer-events` should remain `none` to prevent interaction with completed elements.
*   **Visual Example (Conceptual):**
    ```
    +-----------------------------+
    | MAIN SCAN HEADER            |
    +-----------------------------+
    |                             |
    | [ ] SUB-JOB A (HIDDEN)      |
    | [ ] SUB-JOB B (HIDDEN)      |
    | [ ] SUB-JOB C (HIDDEN)      |
    +-----------------------------+
    
    (Sub-Job A Becomes Active)
    +-----------------------------+
    | MAIN SCAN HEADER            |
    +-----------------------------+
    |                             |
    | [ ] SUB-JOB A (ACTIVE)      |
    | [ ] SUB-JOB B (HIDDEN)      |
    | [ ] SUB-JOB C (HIDDEN)      |
    +-----------------------------+
    
    (Sub-Job A Completes, Sub-Job B Becomes Active)
    +-----------------------------+
    | MAIN SCAN HEADER            |
    +-----------------------------+
    |                             |
    | [X] SUB-JOB A (FAINT)       |
    | [ ] SUB-JOB B (ACTIVE)      |
    | [ ] SUB-JOB C (HIDDEN)      |
    +-----------------------------+
    ```

### DS.3: Scan Sequence - Completed Sub-Job Visuals
*   **Font Fainter:** The `opacity: 0.3` applied to the `scan-job-wrapper` (as per DS.2) will naturally make the `scan-sub-job-title` and associated spinner/checkmark fainter. No additional specific font styling changes are required beyond this.
*   **Final Conclusion Line:** The conclusion message displayed in the `_runOutroAnimation` (e.g., "ANALYSIS COMPLETE.") will remain at full opacity (`opacity: 1`) to ensure it stands out as the final summary.

### DS.7: Scan Progress Display Precision
*   **Location:** The percentage displayed by the `span.scan-progress-value` element within the `scan-progress-container` (e.g., "0%") will be updated.
*   **Format:** The percentage will be displayed with one decimal place, e.g., "75.3%".
*   **Animation:** The number will smoothly tween between its current value and the new target value, updating on each GSAP `onUpdate` tick to provide continuous visual feedback.

## 3. Technical Solution Approach

### TSA.1: Scan Sequence - Type Window Behavior
*   **Module:** `src/js/scanRenderers.js` (specifically `renderTypeWindow` function).
*   **Approach:**
    1.  Modify the `timeline.to(textEl, ...)` loop. For the *last* iteration (i.e., `index === jobConfig.progressiveLines.length - 1`), remove the `scrambleText` property from the `text` plugin's `vars`. This will ensure the final line types out clearly and then remains stable.
    2.  The existing `timeline.to(lineContainer, { autoAlpha: 0, duration: 0.3 }, "+=0.5");` already provides a sufficient pause (`0.5s`) after the last line is typed before the container fades out. No change needed here.

### TSA.2: Scan Sequence - Visibility of Sub-Jobs
*   **Modules:** `src/js/ScanOrchestrator.js`, `src/js/scanFSM.js`, `src/css/partials/_scan-sequence.css` (or equivalent).
*   **Approach:**
    1.  **CSS (Initial State):** Add a CSS rule to `.scan-job-wrapper` to set `opacity: 0` and `pointer-events: none` by default.
    2.  **`ScanOrchestrator._createUI`:** Remove any initial class additions like `is-queued` as the default CSS will handle the initial hidden state.
    3.  **`scanFSM.js` (`jobStates` entry action):**
        *   When a job state is entered (e.g., `job_0`, `job_1`), add a GSAP tween to animate the `jobUI.wrapper` to `autoAlpha: 1` (or `opacity: 1`) and `pointer-events: auto`.
        ```javascript
        // In the 'entry' action for each job_X state:
        gsap.to(jobUI.wrapper, { autoAlpha: 1, duration: 0.3, ease: 'power2.out' });
        gsap.set(jobUI.wrapper, { pointerEvents: 'auto' }); // Set immediately for active interaction
        ```
    4.  **`scanFSM.js` (`jobStates` onDone action):**
        *   When a job completes (`onDone`), add a GSAP tween to animate the `jobUI.wrapper` to `autoAlpha: 0.3` (or `opacity: 0.3`). Ensure `pointer-events` remain `none`.
        ```javascript
        // In the 'onDone' action for each job_X state:
        gsap.to(jobUI.wrapper, { autoAlpha: 0.3, duration: 0.3, ease: 'power2.out' });
        gsap.set(jobUI.wrapper, { pointerEvents: 'none' }); // Ensure it's not interactable
        ```

### TSA.3: Scan Sequence - Completed Sub-Job Visuals
*   **Modules:** `src/js/scanFSM.js`.
*   **Approach:**
    1.  This requirement is inherently satisfied by TSA.2. The `autoAlpha: 0.3` applied to the `scan-job-wrapper` will automatically dim all its children, including the `scan-sub-job-title` and the checkmark/spinner within it.
    2.  The main conclusion line (in `_runOutroAnimation`) is rendered separately and will not be affected by these opacity changes, thus retaining its full prominence.

### TSA.7: Scan Progress Display Precision
*   **Module:** `src/js/scanFSM.js` (specifically the `onDone` action for job states).
*   **Approach:**
    1.  **Modify `onDone` action:** Instead of directly animating `ui.progressValue.innerText`, create a GSAP proxy object to hold the numerical value for smooth decimal animation.
    2.  **Implementation:**
        ```javascript
        // In the 'onDone' action for each job_X state:
        // ... (existing code) ...
        const newProgress = ((index + 1) / subJobs.length) * 100; // Calculate as a decimal

        // Create a proxy object to animate the number
        const progressProxy = { value: parseFloat(ui.progressValue.textContent) || 0 }; 

        gsap.to(progressProxy, {
            value: newProgress,
            duration: 0.5, // Keep animation duration consistent
            ease: 'power2.out',
            onUpdate: () => {
                ui.progressValue.textContent = `${progressProxy.value.toFixed(1)}%`; // Format to one decimal
            }
        });
        // ... (rest of the existing code) ...
        ```
    3.  Ensure any existing `snap` property on the `innerText` tween is removed if present, as it conflicts with decimal animation via a proxy.

## 4. File Manifest

*   `index.html` (for CSS changes if applicable, or for observing DOM structure)
*   `src/js/scanRenderers.js`
*   `src/js/ScanOrchestrator.js`
*   `src/js/scanFSM.js`
*   `src/css/partials/_scan-sequence.css` (or the main `main.css` ifpartials are not used for this)

## 5. Open Questions / Clarifications

*   **DS.1 Scan Sequence - Type Window Conclusion/Gap:** The current plan ensures the final line's text is stable before the container fades. Is this sufficient, or does "concluding statement" imply a *new* piece of text that appears *after* the progressive lines, but *within* the `type-window-container`? The current interpretation assumes no *new* text is needed, just a stable display of the *last* progressive line.