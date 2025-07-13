# Development Plan B: Architectural Refinement & Core Experience Polish

**Status:** Proposed
**Author:** AI Principal Engineer
**Date:** October 26, 2023

---

### **1. Product Requirements Document (PRD)**

#### **Overview**

This plan addresses foundational architectural issues and high-impact visual polish. The goals are to improve the application's initial impression, increase performance and stability, and establish clean, scalable patterns for future development. These changes focus on the core "platform" of the application rather than a single feature.

#### **Key Requirements**

| ID | Requirement | Value & Rationale |
| :-- | :--- | :--- |
| **CORE-1**| **Eliminate Preloader Flicker** | **Critical.** The initial load currently suffers from a "Flash of Unstyled Content" (FOUC), which is unprofessional and was a major regression. This restores a smooth, seamless entry into the application. |
| **CORE-2**| **Establish a Centralized Haptic Feedback Service** | **High.** Haptic feedback logic is currently scattered and inconsistent. This refactor will create a single, state-aware service that respects user settings (on/off), decouples components from the `navigator` API, and simplifies all future haptic implementations. |
| **CORE-3**| **Refactor SVG Dial Rendering for Robustness** | **High.** The dial rendering is currently tied to fragile, pixel-based DOM measurements (`getBoundingClientRect`), which can lead to performance bottlenecks and visual inconsistencies. This refactor makes the rendering mathematically pure and independent of screen resolution or zoom. |

---

### **2. Architectural Approach**

#### **1. Preloader Rendering Strategy (FOUC-Elimination)**

The current flicker is a JavaScript/CSS race condition. The solution is to remove JavaScript from the initial paint path entirely.
1.  **CSS-First Approach:** The `<body>` element will have a `.pre-boot` class applied by default in the HTML, with a corresponding CSS rule `body.pre-boot { opacity: 0; }`. The preloader element itself will have `opacity: 1;` by default.
2.  **JS Role:** The browser will now correctly paint the visible preloader on a hidden body. Once all preloader assets are loaded, the *only* action JavaScript will take is to remove the `.pre-boot` class from the body. The existing CSS transitions will then handle the fade-in of the main application. This pattern is declarative, robust, and eliminates the race condition.

#### **2. Haptic Feedback Service Abstraction**

A new service will be introduced to manage all haptic feedback, establishing a clear architectural layer.
1.  **`HapticFeedbackManager` Service:** A new singleton class will be created. It will be registered with the central `serviceLocator`.
2.  **Internal Logic:** The manager's methods (e.g., `triggerClick()`, `triggerScrub()`) will contain the logic to check both `navigator.vibrate` support and the global `appState` for whether haptics are user-enabled.
3.  **Component Integration:**
    *   For complex, interactive components (`DialController`, `MobileColorSlider`), the `HapticFeedbackManager` will be injected via their constructors. They will call its methods instead of the raw `navigator` API.
    *   For simple static buttons, a new helper function, `createMobileInteraction()`, will be created. This function will wrap the logic of adding an event listener and calling the appropriate haptic manager method, keeping the `EventBinder` module clean and declarative.

#### **3. SVG ViewBox-Based Rendering**

This refactor makes the dial rendering context-independent and more performant.
1.  **Establish a Virtual Coordinate System:** In `dialManager.js`, upon injecting the SVG markup, we will programmatically set the `<svg>` element's `viewBox` attribute to a static, known value (e.g., `"0 0 200 200"`). We will also set `preserveAspectRatio="none"` to ensure the SVG fills its container.
2.  **Decouple Rendering Logic:** In `DialController.js`, all rendering calculations will be rewritten to operate within this virtual 200x200 space. All references to `getBoundingClientRect().width` will be replaced with the static value `200`.
3.  **Browser-Native Scaling:** The browser's highly optimized SVG renderer will handle the final scaling of the virtual 200x200 canvas to the on-screen pixel dimensions, eliminating the need for expensive JS-based measurements on every frame.

---

### **3. File Manifest**

#### **New Files (2)**

*   `src/js/hapticFeedbackManager.js`
*   `src/js/mobileInteraction.js`

#### **Modified Files (6)**

*   `src/js/preloader.js` (Minor)
    *   Logic for initial GSAP fade-in will be removed.
*   `src/js/appInitializer.js` (Minor)
    *   Will register the new `HapticFeedbackManager`.
*   `src/js/dialManager.js` (Minor)
    *   Will be updated to set the SVG `viewBox` on injection.
*   `src/js/DialController.js` (Medium)
    *   Will be refactored to use the haptic service and viewBox-based rendering.
*   `src/js/MobileColorSlider.js` (Minor)
    *   Will be updated to use the haptic service.
*   `src/js/EventBinder.js` (Medium)
    *   Will be refactored to use the new `createMobileInteraction` helper for all mobile button bindings.