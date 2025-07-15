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
