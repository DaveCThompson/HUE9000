Excellent. Based on the principal engineer's red-team review, I have fully updated the planning and specification document. The new version incorporates solutions for the identified risks, improves maintainability, and clarifies all ambiguities.

---

# PRD/Design Spec: Scan Sequence Visuals & Behavior Enhancements (v2 - Revised)

*This document has been updated to incorporate feedback from a technical design review, addressing edge cases, maintainability, and implementation clarity.*

## 1. Functional Requirements

### FR.1: Scan Sequence - Type Window Behavior
The single-line "type window" renderer (used for `.typeWindow` scan sub-jobs) must ensure a clear and stable display of the final typed text before transitioning out, eliminating any perceived "gaps" or premature disappearance of content.

### FR.2: Scan Sequence - Visibility of Sub-Jobs
Only the currently active scan sub-job should be prominently displayed. Upcoming (queued) and completed sub-jobs must be visually de-emphasized to maintain user focus.

### FR.3: Scan Sequence - Completed Sub-Job Visuals
Completed scan sub-job titles should adopt a visually fainter appearance to indicate their status without disappearing entirely. The overall scan conclusion message should remain fully prominent.

### FR.4: Scan Sequence - Sub-Job Failure State
If a sub-job encounters an unrecoverable error, it must visually indicate failure (e.g., with an 'X' icon) and de-emphasize itself without halting the entire scan sequence's visual progression to the conclusion.

### FR.7: Scan Progress Display Precision
The overall scan progress percentage displayed in the header of the scan sequence must animate smoothly and include one decimal place.

## 2. Design Specifications

### DS.1: Scan Sequence - Type Window Behavior
*   **Current Behavior (Problem):** The `renderTypeWindow` currently applies a `scrambleText` effect across all lines, which means the text is constantly changing, even on the last line, before the container fades out. This can lead to a perception of a "gap" if the final text isn't displayed stably.
*   **Desired Behavior:**
    *   For the last `progressiveLine` in the `renderTypeWindow` sequence, the text should type out normally (without scrambling) and then remain static and fully visible for a brief pause.
    *   After this pause, the entire `scan-progressive-line-container` (which holds the text and pulse background) will smoothly fade out.

### DS.2: Scan Sequence - Visibility of Sub-Jobs
*   **Initial State (All Sub-Jobs):** All `scan-job-wrapper` elements start with `opacity: 0` and are not interactive.
*   **Active State (Current Sub-Job):** When a `scan-job-wrapper` becomes active, it animates to `opacity: 1` and becomes interactive.
*   **Completed State (Previous Sub-Jobs):** When a `scan-job-wrapper` completes, it transitions to `opacity: 0.3` and becomes non-interactive.

### DS.3: Scan Sequence - Completed Sub-Job Visuals
*   **Font Fainter:** The `opacity: 0.3` applied to the `scan-job-wrapper` (as per DS.2) will naturally make the `scan-sub-job-title` and associated spinner/checkmark fainter.
*   **Final Conclusion Line:** The conclusion message displayed in the `_runOutroAnimation` will remain at full opacity (`opacity: 1`).

### DS.4: Scan Sequence - Sub-Job Failure Visuals
*   **Visual State:** When a sub-job fails, its running spinner will be replaced by a distinct failure icon (e.g., a red 'X').
*   **Opacity:** The entire `scan-job-wrapper` will then fade to `opacity: 0.3`, matching the visual weight of a successfully completed job to maintain a clean and consistent layout.

### DS.7: Scan Progress Display Precision
*   **Location:** The percentage displayed by the `span.scan-progress-value` element.
*   **Format:** The percentage will be displayed with one decimal place (e.g., "75.3%").
*   **Animation:** The number will smoothly tween between values.

## 3. Technical Solution Approach

### TSA.1: Scan Sequence - Type Window Behavior
*   **Module:** `src/js/scanRenderers.js` (specifically `renderTypeWindow` function).
*   **Approach:**
    1.  Modify the `timeline.to(textEl, ...)` loop. For the *last* iteration (i.e., `index === jobConfig.progressiveLines.length - 1`), remove the `scrambleText` property from the `text` plugin's `vars`. This will ensure the final line types out clearly and then remains stable.
    2.  The existing `timeline.to(lineContainer, { autoAlpha: 0, duration: 0.3 }, "+=0.5");` already provides a sufficient pause and is correct.

### TSA.2 & TSA.3: Sub-Job Visibility & Completed/Failed Visuals
*   **Modules:** `src/js/scanFSM.js`, `src/css/partials/_scan-sequence.css`.
*   **Approach:** Logic will be managed by the FSM via named actions for clarity and maintainability.
    1.  **CSS:**
        *   In `_scan-sequence.css`, set the default state for `.scan-job-wrapper` to `opacity: 0; pointer-events: none;`.
        *   **Crucially, remove any CSS `transition` property on `.scan-job-wrapper`** to cede full animation control to GSAP and prevent conflicts.
    2.  **FSM State - `entry`:** The `entry` action for each job state will trigger a single named action, `showActiveJob`.
        ```javascript
        // In the FSM implementation object:
        actions: {
            showActiveJob: ({ context, event }) => {
                const jobUI = /* ... get current job UI from context ... */;
                gsap.to(jobUI.wrapper, { autoAlpha: 1, duration: 0.3, ease: 'power2.out' });
                gsap.set(jobUI.wrapper, { pointerEvents: 'auto' });
            },
            // ... other actions
        }
        ```
    3.  **FSM State - `onDone` (Success):** The `onDone` transition will trigger a sequence of discrete, named actions for clarity.
        ```javascript
        // In the 'onDone' transition for each job_X state:
        actions: ['markJobAsComplete', 'updateOverallProgress', 'fadeCompletedJobWrapper']
        ```
        *   `markJobAsComplete`: A named action that runs the GSAP timeline to swap the spinner for a checkmark icon.
        *   `fadeCompletedJobWrapper`: A reusable named action that animates the `jobUI.wrapper` to `autoAlpha: 0.3` and sets `pointerEvents: 'none'`.
    4.  **FSM State - `onError` (Failure):** The `onError` transition will gracefully handle the UI before proceeding to the final error state.
        ```javascript
        // In the 'onError' transition for each job_X state:
        target: '#scan.error',
        actions: ['markJobAsFailed', 'fadeCompletedJobWrapper', 'logError']
        ```
        *   `markJobAsFailed`: A new named action that stops the spinner and replaces it with a failure icon (e.g., 'X').
        *   `fadeCompletedJobWrapper`: The same reusable action is called here to ensure visual consistency for any job that is no longer active.

### TSA.7: Scan Progress Display Precision
*   **Module:** `src/js/scanFSM.js`.
*   **Approach:** The logic will be encapsulated in the `updateOverallProgress` named action, triggered by the `onDone` transition of each successful job state.
    1.  **Implementation (`updateOverallProgress` action):**
        ```javascript
        // In the FSM implementation object:
        updateOverallProgress: ({ context, event }) => {
            // ... (logic to determine current job index) ...
            const newProgress = ((index + 1) / context.subJobs.length) * 100;
            const progressProxy = { value: parseFloat(context.ui.progressValue.textContent) || 0 }; 

            gsap.to(progressProxy, {
                value: newProgress,
                duration: 0.5,
                ease: 'power2.out',
                onUpdate: () => {
                    // Format to one decimal place on each tick
                    context.ui.progressValue.textContent = `${progressProxy.value.toFixed(1)}%`;
                }
            });
        }
        ```
    2.  This approach isolates the progress animation logic and avoids direct, non-decimal `innerText` tweens.

## 4. File Manifest

*   `index.html` (no changes, for context only)
*   `src/js/scanRenderers.js` (for TSA.1)
*   `src/js/ScanOrchestrator.js` (no changes, FSM is the locus of change)
*   `src/js/scanFSM.js` (for TSA.2, TSA.3, TSA.4, TSA.7 - major refactor to named actions)
*   `src/css/partials/_scan-sequence.css` (for TSA.2 - to remove conflicting CSS transition)

## 5. Decisions Log

*   **DS.1 Scan Sequence - Type Window Conclusion/Gap:** It is confirmed that the requirement is to ensure the *last progressive line's* text becomes stable before the fade-out. No new, separate concluding text is needed within the type window. The plan outlined in TSA.1 is correct and sufficient.