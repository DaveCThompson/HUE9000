Of course. Here is the updated PRD containing only the high-value, low-risk scope, followed by detailed notes on future architectural work.

---

# Development Plan B.1: Foundational Stability & UI Completion

**Status:** Approved for Implementation
**Author:** AI Principal Engineer
**Date:** October 26, 2023

### **1. Product Requirements Document (PRD)**

#### **Overview**

This revised plan addresses critical, user-facing bugs and completes small but essential UI integrations. The goals are to restore a professional initial loading experience and ensure all visible UI controls are functional, thereby improving application stability and user trust. This work is foundational and low-risk.

#### **Key Requirements**

| ID | Requirement | Value & Rationale |
| :-- | :--- | :--- |
| **CORE-1**| **Eliminate Preloader Flicker** | **Critical.** The initial load currently exhibits a "Flash of Unstyled Content" (FOUC), which undermines the application's perceived quality. This restores a smooth, seamless entry into the interface. |
| **CORE-2**| **Wire Up Haptic Feedback Control** | **High.** The application includes a state management system for haptics and a UI toggle in the settings panel, but they are not connected. This change makes the setting functional, completing the feature and respecting user preferences. |

---

### **2. Architectural Approach**

#### **1. Preloader Rendering Strategy (FOUC-Elimination)**

The flicker will be eliminated by removing JavaScript from the critical path of the initial browser paint.

1.  **HTML State:** The `<body>` tag in `index.html` will be given a default class of `.pre-boot`.
2.  **CSS-First Rendering:** A new rule in the core stylesheet will target `body.pre-boot` and set its `opacity` to `0`, while the preloader itself remains visible by default. The browser will now correctly paint only the visible preloader on a hidden body.
3.  **JavaScript's Role (Post-Paint):** JavaScript's role in the *initial browser paint* is eliminated. However, once the DOM is ready, it remains responsible for orchestrating all *post-paint animations* within the preloader, such as the logo reveal, progress bar updates, and text stream effects.
4.  **Hand-off:** Upon user engagement, the preloader's JavaScript will simply remove the `.pre-boot` class from the `<body>`. Existing CSS transitions will then handle the fade-in of the main application, eliminating the race condition.

#### **2. Haptic UI Integration**

The existing haptic system will be connected to its UI toggle.

1.  **Event Binding:** The `EventBinder` module will be updated to add a `'change'` event listener to the `#haptics-toggle` checkbox element.
2.  **State Update:** The event listener's handler will call the existing `appState.setIsHapticsEnabled()` function, passing the `event.target.checked` value. This cleanly connects the user control to the central state, which the `HapticFeedbackManager` already respects.

---

### **3. File Manifest**

#### **New Files (0)**

*   None.

#### **Modified Files (4)**

*   `src/js/preloader.js`
    *   The initial GSAP fade-in of the preloader element will be removed, as this is now handled by CSS.
*   `src/js/EventBinder.js`
    *   A new event listener will be added in `_bindSidePanelControls` to wire up the `#haptics-toggle` checkbox.
*   `index.html`
    *   The `<body class="theme-dim">` will be changed to `<body class="theme-dim pre-boot">`.
*   `src/css/main.css` (or relevant partial)
    *   A new rule will be added: `body.pre-boot { opacity: 0; transition: none; }` to ensure the body is hidden instantly on first load.

---
---

## Notes for Future Scope & Technical Debt

The following items were identified during the review but are considered higher-risk or lower-priority than the items in the plan above. They are captured here for future planning.

#### **1. SVG Dial Rendering Performance Refactor**

*   **Observation:** The current `DialController` uses `getBoundingClientRect()` within its render loop (`_draw`), which can cause performance issues by forcing browser reflows on every frame.
*   **Proposed Solution:** Refactor the rendering logic to use a static, virtual `viewBox` (e.g., "0 0 200 200") for all internal calculations. The browser's native, highly-optimized SVG engine would then handle the scaling to the final on-screen size.
*   **Reason for Deferral:** **High Risk.** The existing rendering logic is mathematically complex, involving 3D perspective projection and dynamic lighting calculations. A direct porting of this logic risks introducing subtle but significant visual regressions.
*   **Next Step:** Before this task is scheduled, a **time-boxed technical spike** is strongly recommended to create a small, isolated prototype. The goal of the spike would be to prove that the `viewBox`-based math can perfectly replicate the existing visual output. This will de-risk the effort and provide an accurate time estimate.

#### **2. Deepen Haptic Feedback Integration**

*   **Observation:** The current haptic system provides simple, one-shot feedback (`click`, `toggleOn`, etc.).
*   **Potential Enhancement:** The `HapticFeedbackManager` could be enhanced to support more complex, patterned vibrations. For example, a "success" pattern (`[50, 50, 50]`) or an "error" pattern (`[100, 50, 100, 50, 100]`).
*   **Reason for Deferral:** **Low Priority.** The current system is functional and provides good baseline feedback. This is a "nice-to-have" enhancement, not a core requirement.

#### **3. Investigate Component-Level State Management**

*   **Observation:** The application relies heavily on a single, global `appState` module for all state management. While effective for this project's scale, it can lead to tight coupling as an application grows. For instance, `AmbientAnimationManager` and `LensManager` both listen for generic `dialUpdated` events and then filter by `id`, rather than subscribing to a more specific, relevant state change.
*   **Potential Enhancement:** For future, larger projects, consider a pattern where components can manage their own internal state and only publish/subscribe to high-level, intentional events or state slices from the global store. This would improve component encapsulation and reusability.
*   **Reason for Deferral:** **Architectural Overhead.** The current system works well for the application's size. Introducing a more complex state management pattern at this stage would be an over-architecture. This is a strategic consideration for future projects.