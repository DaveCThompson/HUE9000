Of course. Here is the Product Requirements Document (PRD) and detailed Change Specification for the approved scope.

---

### **Product Requirements Document: HUE 9000 - Refactor & Polish (v2.4)**

**Document Version:** 1.0
**Date:** October 26, 2023
**Author:** AI Assistant

#### **1. Overview**

This document outlines the requirements for a targeted technical refactoring and user experience polish sprint for the HUE 9000 application. The primary focus is on enhancing architectural robustness, eliminating minor visual artifacts during the loading sequence, and improving the maintainability of core interactive components. These changes will solidify the application's foundation, improve the perceived quality for first-time users, and streamline future development.

#### **2. Goals & Objectives**

*   **Improve Loading Experience:** Eliminate all visual "flickering" or flashes during the preloader-to-application handoff, providing a seamless and professional initial impression.
*   **Enhance Feature Robustness:** Ensure that core interactive sequences, specifically the terminal "Scan" feature, are repeatable and function correctly on subsequent uses within the same session.
*   **Increase Architectural Purity:** Refine key rendering components (SVG Dials) to be more performant and less dependent on fragile DOM measurements, adhering to best practices for dynamic graphics.
*   **Standardize User Feedback:** Centralize and abstract haptic feedback mechanisms to create a consistent user experience on mobile and simplify the codebase.

#### **3. Scope & Requirements**

This work is divided into five main requirements:

| ID | Requirement | User Story / Rationale |
| :-- | :--- | :--- |
| **RQ-1** | **Eliminate Preloader Flicker** | As a user, I want the application loading sequence to be perfectly smooth, without any flashes or disappearance of the preloader UI after it first appears. |
| **RQ-2** | **Fix Terminal Scan Re-initialization** | As a user, I want to be able to run the "Scan" or "Eval" sequences multiple times in a session without the terminal display breaking or becoming invisible on the second attempt. |
| **RQ-3** | **Implement Preloader-to-App Bridge State** | The application must have a seamless, controlled visual handoff from the preloader to the main startup sequence, preventing any "flash of un-styled content" (FOUC). |
| **RQ-4** | **Refactor SVG Dial Rendering** | As a developer, I want the SVG dial rendering logic to be decoupled from the component's pixel dimensions to improve performance and prevent rendering distortions, especially during window resizing. |
| **RQ-5** | **Centralize Haptic Feedback** | As a developer, I want all haptic feedback logic to be centralized in a single manager to ensure consistency, respect user settings globally, and simplify the addition of new interactive elements. |

---

### **Detailed Change Specification**

This section details the necessary changes to the codebase to fulfill the requirements outlined above. **No code should be written; this is a specification for implementation.**

#### **Spec-1: Preloader Flicker (RQ-1)**

*   **File(s) Affected:** `src/js/preloader.js`, `src/css/2-components/_preloader.css`
*   **Specification:**
    1.  **In `preloader.js`:**
        *   Locate the `runPreloader` function.
        *   **Remove** the GSAP animation that fades in the `preloaderRoot` element at the beginning of the function.
        *   Modify the logic that removes the `pre-boot` class from `<body>`. Immediately after removing `pre-boot`, **add** a new class `is-visible` to the `preloaderRoot` element.
    2.  **In `_preloader.css`:**
        *   Add a new CSS rule: `#datastream-preloader.is-visible { opacity: 1; }`. This ensures the preloader remains visible during the handoff from the initial `pre-boot` styling to the script-controlled state.

#### **Spec-2: Terminal Scan Re-initialization (RQ-2)**

*   **File(s) Affected:** `src/js/terminalManager.js`
*   **Specification:**
    1.  **In `terminalManager.js`:**
        *   **Remove** the `_cleanupScanContainer()` method entirely.
        *   In the `concludeScan()` method, **remove** the call to `_cleanupScanContainer()`. The method's responsibility is now only to set `_isTakeoverActive = false` and resume the message queue.
        *   Modify the `_initiateScan()` method to be the single source of truth for preparing a new scan. It must perform the following actions in order:
            *   Clear the main terminal content: `this._terminalContentElement.innerHTML = '';`
            *   Create a new `scan-animation-container` element.
            *   **Crucially**, before appending the new container, use `gsap.set(this._scanContainerElement, { autoAlpha: 1 });` to guarantee it is visible.
            *   Append the new container to the terminal.
            *   Dispatch the scan job to the `scanOrchestrator`.

#### **Spec-3: Preloader-to-App Bridge State (RQ-3)**

*   **File(s) Affected:** `src/js/preloader.js`, `src/js/startupSequenceManager.js`, `src/css/core/_layout.css`
*   **Specification:**
    1.  **In `preloader.js`:**
        *   In the `onComplete` callback of the final preloader fade-out animation (after the "Engage" button is clicked), **add** a new class `post-preload-hiding` to the `<body>` element.
    2.  **In `_layout.css`:**
        *   Add a new, high-specificity CSS rule: `body.post-preload-hiding .app-wrapper { visibility: hidden; }`.
    3.  **In `startupSequenceManager.js`:**
        *   In the `_resetVisualsAndState()` method, **add** logic to remove the `post-preload-hiding` class from the `<body>` element. This should happen just before the `is-starting-up` class is added, ensuring a clean handoff.

#### **Spec-4: SVG Dial Rendering (RQ-4)**

*   **File(s) Affected:** `src/js/dialManager.js`, `src/js/DialController.js`
*   **Specification:**
    1.  **In `dialManager.js`:**
        *   In the `injectDialSVGs()` method, after injecting the SVG string, get a reference to the `<svg>` element and programmatically set its attribute: `svgElement.setAttribute('preserveAspectRatio', 'none');`.
        *   Also within this method, ensure the background `<rect class="dial-face">` has its `width` and `height` attributes set to match the `viewBox` dimensions (e.g., "200").
    2.  **In `DialController.js`:**
        *   In the constructor, change `this.svgWidth` from a dynamically read property to a hardcoded constant that matches the SVG's `viewBox` width (e.g., `this.svgWidth = 200;`).
        *   In the `forceRedraw()` method, **remove** the line that reads `getBoundingClientRect()`. The method's only responsibilities are now to update cached theme variables and call `_draw()`.

#### **Spec-5: Haptic Feedback Centralization (RQ-5)**

*   **File(s) Affected:** New files, `appInitializer.js`, `EventBinder.js`, `DialController.js`, `MobileColorSlider.js`.
*   **Specification:**
    1.  **Create New File:** `src/js/hapticFeedbackManager.js`.
        *   This module will export a singleton instance of a `HapticFeedbackManager` class.
        *   The class will have methods like `triggerClick()`, `triggerToggleOn()`, `triggerToggleOff()`, `triggerSliderScrub()`.
        *   Each method will internally check for `navigator.vibrate` support and the global `appState.getIsHapticsEnabled()` setting before calling `navigator.vibrate()` with a predefined pattern (e.g., `10`, `20`, `5`).
    2.  **Create New File:** `src/js/mobileInteraction.js`.
        *   This module will export a utility function: `createMobileInteraction(element, { onClick, hapticType = 'click' })`.
        *   This function will attach a `pointerup` event listener to the `element`.
        *   The listener's handler will call the appropriate method on the `hapticFeedbackManager` based on `hapticType`, then execute the `onClick` callback.
    3.  **Update `appInitializer.js`:** Register the new `hapticFeedbackManager` with the `serviceLocator`.
    4.  **Update `EventBinder.js`:**
        *   In `_bindMobileOverlayButtons()`, replace direct event listener attachments with calls to the new `createMobileInteraction()` utility for each mobile button.
    5.  **Refactor Existing Components:**
        *   In `DialController.js` and `MobileColorSlider.js`, **remove** all direct calls to `navigator.vibrate()`.
        *   Replace them with calls to the appropriate methods on the injected `hapticManager` instance (e.g., `this.hapticManager.triggerClick()`).

### **Testing & Verification Plan**

*   **RQ-1/RQ-3:** Perform multiple hard reloads (Cmd/Ctrl+Shift+R) on various network speeds (using browser dev tools). Verify there is no visual flicker of the preloader or the main application UI. The transition must be seamless.
*   **RQ-2:** On both desktop and mobile, trigger a "Scan" or "Eval" sequence. After it completes, immediately trigger a different one. Confirm the second scan's UI renders and animates correctly. Repeat 3-4 times.
*   **RQ-4:** After implementation, resize the browser window horizontally and vertically. Confirm the SVG dials do not distort or stretch incorrectly. They should maintain their circular appearance within their containers.
*   **RQ-5:** On a physical mobile device, test all interactive elements (buttons, sliders, dials). Confirm that haptic feedback is present and feels appropriate for each interaction. Go to the "Settings" tab in the info panel, disable "Haptic Feedback," and re-test all elements to confirm feedback has stopped.