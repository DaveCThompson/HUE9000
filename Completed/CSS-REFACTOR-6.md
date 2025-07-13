Understood. The button refactor is abandoned due to risk. The new plan will focus exclusively on the high-value, low-risk changes: fixing the mobile bug, improving CSS modularity, and correcting the grill's accessibility.

Here is the fully updated, single-file PRD and Development Plan reflecting this new, de-risked scope.

---

# **Product Requirements & Development Plan: HUE 9000 V2.4 Mobile & CSS Architecture Refinement**

*   **Document Version:** 2.0
*   **Date:** October 26, 2023
*   **Author:** AI Assistant
*   **Status:** Approved for Implementation

## **1. Overview**

This document outlines the requirements and development plan for the V2.4 update to the HUE 9000 interface. This is a targeted technical update focused on improving the project's CSS architecture and resolving specific mobile display and accessibility issues. These changes will enhance long-term maintainability and code quality.

This is a non-visual refactor; the user-facing design and experience will remain identical, with the exception of the bug fix. The previously considered semantic refactoring of `div` controls to native `<button>` elements has been deferred to a future initiative to eliminate visual regression risks.

## **2. Problem Statement**

The current implementation (V2.2) has several areas for technical improvement:

*   **Visual Bug:** The mobile-only terminal drawer is incorrectly rendered when a mobile browser's "Request Desktop Site" feature is used, as the styles hiding it are improperly scoped within a mobile-only media query.
*   **Suboptimal CSS Architecture:** Styles for distinct mobile-only components (overlay controls, color slider, terminal drawer) are mixed with general mobile layout overrides in a single, monolithic file (`_mobile.css`), reducing modularity and making maintenance more difficult.
*   **Accessibility Noise:** A purely decorative element (the grill) is announced by screen readers, adding unnecessary verbosity to the experience for users of assistive technology.

## **3. Goals & Objectives**

*   Resolve the "Request Desktop Site" display bug completely.
*   Improve the modularity and separation of concerns within the CSS architecture by creating component-specific mobile stylesheets.
*   Enhance accessibility by silencing the non-interactive grill element.
*   Ensure no visual or functional regressions are introduced on desktop or mobile platforms.

## **4. Scope**

#### **IN SCOPE:**

1.  **Bug Fix:** Implement a CSS fix to ensure the `#mobile-terminal-drawer` is hidden by default on all viewport sizes, and only made visible within the mobile media query.
2.  **Mobile CSS Modularity:** Isolate styles for mobile-only UI components into their own dedicated CSS files within the `components` layer, cleaning up the main mobile layout file.
3.  **Grill Semantics:** Update the grill placeholder element's HTML to hide it from assistive technologies.

#### **OUT OF SCOPE:**

*   **Converting `div` controls to native `<button>` elements.** This has been explicitly deferred.
*   Any changes to the visual design, color themes, or animations.
*   Refactoring existing CSS to use native nesting.
*   Performance optimizations (e.g., inlining SVGs).
*   Changes to the JavaScript application logic, state management, or build process.

## **5. Requirements & Acceptance Criteria**

| ID | Requirement | Acceptance Criteria |
| :--- | :--- | :--- |
| **FIX-01** | **Resolve Mobile Terminal Bug** | 1. On a mobile device, when "Request Desktop Site" is enabled, the mobile terminal drawer is not visible. <br> 2. The mobile terminal continues to function correctly in the standard mobile view. |
| **REQ-01** | **Component-ize Mobile CSS** | 1. New, granular CSS files for mobile components (e.g., `_mobile-color-slider.css`) exist in the `src/css/2-components/` directory. <br> 2. `main.css` is updated to import these new files in the `components` layer. <br> 3. `_mobile.css` now primarily contains layout overrides and is significantly cleaner. <br> 4. The mobile UI renders and behaves identically to V2.2. |
| **REQ-02** | **Update Grill Semantics** | 1. The `.grill-placeholder` element in `index.html` has the `aria-hidden="true"` attribute. <br> 2. The `aria-label` attribute has been removed from the grill element. <br> 3. When tested with a screen reader, the grill is not announced. |

---

## **Development Plan: HUE 9000 V2.4 Refactor**

This plan outlines the technical steps to implement the requirements defined in the PRD.

**Prerequisites:**
*   Developer has a local environment set up for the HUE 9000 project.
*   A new feature branch (e.g., `feature/v2.4-mobile-css-refactor`) is created from the `main` or `develop` branch.

### **Phase 1: CSS Architecture & Bug Fixes**

*   **Task 1.1: Implement Critical Bug Fix**
    *   **File:** `src/css/1-base/_mobile.css`
    *   **Action:** At the top of the file, *outside* of any `@media` query, add a default rule to hide the mobile-only drawer. This ensures it is hidden on desktop viewports by default.
        ```css
        /* Default state for desktop: Hide mobile-only elements */
        #mobile-terminal-drawer {
            display: none;
        }
        ```
    *   **Verification:** The existing `@media (max-width: 48rem)` block should already contain a rule like `#mobile-terminal-drawer { display: flex; }` which will correctly override this default on mobile viewports. No change is needed there.

*   **Task 1.2: Component-ize Mobile-Only UI Styles**
    *   **Strategy:** Create granular stylesheets for each distinct mobile UI component to mirror the modularity of the JavaScript architecture.
    *   **Action:**
        1.  Create the following new files:
            *   `src/css/2-components/_mobile-controls-overlay.css`
            *   `src/css/2-components/_mobile-color-slider.css`
            *   `src/css/2-components/_mobile-terminal-drawer.css`
        2.  In `src/css/1-base/_mobile.css`, identify and move the style blocks related to each component into its corresponding new file.
            *   **Move to `_mobile-controls-overlay.css`:** Styles for `#mobile-controls-overlay`, `.mobile-controls-group`, `.mobile-control-button`, and their states/children.
            *   **Move to `_mobile-color-slider.css`:** Styles for `.mobile-slider-container`, `.mobile-slider-track`, `.mobile-slider-thumb`, and their states/children.
            *   **Move to `_mobile-terminal-drawer.css`:** Styles for `#mobile-terminal-drawer`, its internal layout, and its open/closed states.
        3.  In `src/css/main.css`, update the `components` layer to import these new files.
            ```css
            /* In main.css, within @layer components */
            @import url('./2-components/_terminal.css') layer(components);
            @import url('./2-components/_dial-displays.css') layer(components);
            /* Add new mobile component styles */
            @import url('./2-components/_mobile-controls-overlay.css') layer(components);
            @import url('./2-components/_mobile-color-slider.css') layer(components);
            @import url('./2-components/_mobile-terminal-drawer.css') layer(components);
            ```
        4.  Review `_mobile.css`. It should now primarily contain `grid-template-areas` overrides, hiding of desktop elements (`.left-panel`), and other responsive layout adjustments.

### **Phase 2: HTML & Accessibility Refactoring**

*   **Task 2.1: Update Grill Element Semantics**
    *   **File:** `index.html`
    *   **Action:**
        1.  Locate the grill element: `<div class="placeholder grill-placeholder" aria-label="Device output grill">`
        2.  Remove the `aria-label` attribute.
        3.  Add the `aria-hidden="true"` attribute.
        *   **Result:** `<div class="placeholder grill-placeholder" aria-hidden="true">`

### **Phase 3: Quality Assurance & Finalization**

*   **Task 3.1: Manual Cross-Browser Testing**
    *   Perform a full regression test of the interface in the latest versions of **Chrome, Firefox, and Safari**.
    *   **Desktop:** Verify that all layouts, interactions, and animations are visually and functionally identical to the previous version.
    *   **Mobile:** Verify that all layouts, interactions, and the mobile-specific UI are visually and functionally identical to the previous version.
    *   **Critical Test:** On a physical mobile device (or browser dev tools), enable "Request Desktop Site" and confirm the mobile terminal drawer is **not** visible.

*   **Task 3.2: Accessibility Verification**
    *   **Screen Reader:** Use a screen reader (e.g., VoiceOver, NVDA) to check that the grill placeholder is no longer announced.
    *   **Keyboard:** Perform a quick check of keyboard navigation on the desktop view to ensure no regressions were introduced.

*   **Task 3.3: Code Review and Merge**
    *   Submit a Pull Request for the feature branch.
    *   Ensure the PR description links back to this PRD.
    *   After approval and passing all checks, merge the branch.