Of course. This is a critical moment for the project, and getting the plan right is paramount. The previous attempts likely failed because they introduced too much complexity (separate DOMs, JS race conditions) instead of simplifying. Your new direction—reusing desktop components and changing the layout with CSS—is a much more robust and standard approach.

Let's break this down. I will act as your technical lead, synthesizing the best practices from the `mobile-insights-A.md` document with your new layout requirements to create a single, comprehensive plan. I will ask clarifying questions as we go.

**Clarifying Question:** You mentioned the "MOOD + INTENSITY" block should appear directly on the background, without a "bezel." Looking at the `index.html`, these two components (`.hue-control-block`) are currently inside the `.right-panel`'s `.lower-section`. To achieve the desired mobile layout, we will need to conceptually "lift" them out of the right panel and position them below the center panel on mobile. This is perfectly achievable with modern CSS (like Grid or Flexbox `order`), but it's a key architectural decision. Does this sound correct?

Assuming that is correct, here is the consolidated document.

---

# **HUE 9000 Mobile Interface Refactor Plan (v3.0)**

**Document Version:** 1.0
**Status:** Proposed
**Author:** AI Product Manager
**Goal:** To define a robust, maintainable, and high-performance mobile interface by refactoring the existing desktop application using a single, responsive DOM structure. This document supersedes all previous mobile specifications.

### **1. Product Requirements Document (PRD)**

#### **1.1. Problem Statement**

Previous attempts to create a mobile interface for the HUE 9000 application have resulted in a fragile, buggy, and unmaintainable experience. The core issues stemmed from an overly complex architecture that involved hiding/showing entirely separate DOM structures for mobile and desktop. This led to significant performance degradation from hidden processing overhead, JavaScript race conditions due to separate initialization sequences, and an increased maintenance burden. The mobile interface has "never worked correctly," necessitating a fundamental change in strategy.

#### **1.2. Vision & Core Principles**

The vision is to create a mobile experience that is a first-class citizen of the HUE 9000 application—fast, intuitive, and reliable. We will achieve this by adhering to the following principles, derived from our internal best practices (`mobile-insights-A.md`):

1.  **Single, Semantic DOM:** We will use **one** HTML structure for both desktop and mobile. This eliminates duplicate elements, prevents state synchronization issues, and drastically reduces the risk of hidden JavaScript execution.
2.  **CSS-Driven Responsive Layout:** The distinction between mobile and desktop views will be controlled exclusively by CSS Media Queries. We will not use JavaScript to build or swap layouts. This ensures predictability and leverages the browser's native, optimized rendering path.
3.  **Component Re-use, Not Duplication:** All interactive components (dials, buttons, lens) will be the *exact same DOM elements* on mobile and desktop, simply re-arranged by CSS.
4.  **Performance & Stability First:** Every decision must be weighed against its impact on mobile performance (load time, responsiveness) and stability (predictable state, no race conditions).
5.  **Mobile-First (in CSS):** CSS will be structured with base styles for mobile, progressively enhanced for larger screens. This is a standard, proven methodology for clean, maintainable responsive design.

#### **1.3. User Experience & Functional Requirements**

*   **Portrait Orientation (Mobile View):**
    *   **Trigger:** Active on viewports with a `max-width` of **768px**.
    *   **Layout:** A single-column layout.
        *   **Top Section:** The complete desktop **Center Panel** (`.panel-bezel.center-panel`) will be displayed at the top. It must maintain its internal layout (Logo/Lens above Grill) and visual "bezel" created by the background showing through the `gap`.
        *   **Bottom Section:** The **"MOOD" and "INTENSITY"** control blocks will be displayed below the center panel. These two blocks will appear side-by-side (50%/50% split) and will *not* be wrapped in a "bezel."
    *   **Excluded Components:** All other panels and components from the desktop view (`.left-panel`, most of `.right-panel`, etc.) will be hidden using `display: none`. Specifically, `MAIN PWR`, `TERMINAL`, `SKILL SCAN`, `FIT EVAL`, `AUX LIGHT`, and `HUE ASSN` will be hidden.
*   **Landscape Orientation (Desktop View):**
    *   **Trigger:** Active when the viewport is in a landscape orientation (e.g., `(orientation: landscape)` and `min-width: 769px`).
    *   **Behavior:** The complete desktop UI will be rendered, scaled down proportionally to fit the viewport. Letterboxing is the expected and accepted result.

### **2. Architectural & Development Plan**

This plan outlines the "how." It is a direct implementation of the principles above, designed for maximum clarity and to avoid past mistakes.

#### **2.1. Architectural Shift: From "Static Swap" to True Responsive Web Design (RWD)**

We are abandoning the previous "Static Swap" approach. The new architecture is pure **Responsive Web Design (RWD)**.

*   **Old Way (Problematic):** Load both desktop and mobile DOMs. Use CSS to hide one. This keeps all DOM nodes and their associated JavaScript active in memory, causing bloat and unpredictable side effects.
*   **New Way (Robust):** Load a **single DOM**. Use CSS media queries to rearrange and hide/show elements for different viewport sizes. This is vastly more performant and stable. The browser only processes one set of elements, and since the DOM is unified, JavaScript state management becomes dramatically simpler.

#### **2.2. DOM & HTML Strategy**

**No changes to `index.html` are required.** We will work with the existing semantic structure. This is a cornerstone of the new approach's efficiency.

#### **2.3. CSS Implementation Strategy**

This is the core of the technical work. We will create a new stylesheet, e.g., `_mobile.css`, to be imported into `main.css`.

1.  **Media Query Wrapper:** All mobile-specific styles will be contained within a media query block. This ensures they only apply on smaller screens.

    ```css
    /* in _mobile.css */
    @media (max-width: 768px) {
      /* All mobile styles go here */
    }
    ```

2.  **Layout Reset & Re-ordering:** We will use **CSS Grid** on the `.main-content-area` container for mobile. This provides the most powerful and explicit control over re-ordering our existing panels.

    ```css
    /* in _mobile.css */
    @media (max-width: 768px) {
      .app-wrapper {
        padding: var(--space-lg); /* Reduce padding on mobile */
      }

      .main-content-area {
        display: grid;
        grid-template-columns: 1fr; /* A single column */
        grid-template-rows: auto auto; /* Two rows, sized by content */
        grid-template-areas:
          "center-panel"
          "dial-controls";
        gap: var(--space-2xl);
        height: auto; /* Allow height to be determined by content */
        max-width: 500px; /* Constrain max width on mobile for aesthetics */
        margin: 0 auto;
      }
    }
    ```

3.  **Panel Placement & Hiding:**

    ```css
    /* in _mobile.css */
    @media (max-width: 768px) {
      /* 1. Hide unwanted panels completely */
      .panel-bezel.left-panel,
      .panel-bezel.right-panel {
        display: none;
      }

      /* 2. Place the center panel in its grid area */
      .panel-bezel.center-panel {
        grid-area: center-panel;
        flex: 0 0 auto; /* Override desktop flex properties */
        width: 100%;
        /* See section 3.3 for aspect ratio */
      }

      /* 3. Create a NEW conceptual block for the dials */
      /* We will need to add a wrapper in the HTML or use display: contents */
      /* Let's go with a more robust CSS-only approach first. */
    }
    ```
    **Correction & Refinement:** Directly placing the dials is tricky since they are nested. The cleanest approach is to use `display: contents` on their parents, which makes the children act as direct grid items.

    ```css
    /* in _mobile.css */
    @media (max-width: 768px) {
        /* Hide the original panels */
        .panel-bezel.left-panel,
        .panel-bezel.right-panel { display: none; }
        
        /* Place the center panel */
        .panel-bezel.center-panel {
            grid-area: center-panel;
            width: 100%;
            /* ... aspect ratio styles ... */
        }

        /* Create a new grid container for the dials */
        /* We will re-purpose the .right-panel's lower-section */
        .main-content-area > .panel-bezel.right-panel {
            display: block; /* Un-hide the right panel */
            grid-area: dial-controls;
            background: none; /* Remove bezel styles */
            border: none;
            box-shadow: none;
            padding: 0;
        }

        /* Hide everything in the right panel EXCEPT the lower section */
        .main-content-area > .panel-bezel.right-panel > .top-section {
            display: none;
        }

        /* Style the dial container */
        .right-panel .lower-section {
            display: flex;
            flex-direction: row;
            gap: var(--space-lg);
            height: auto;
        }
    }
    ```
    This approach is robust because it re-uses the existing DOM perfectly. We un-hide the right panel, place it in the new grid area, and then hide the parts of it we don't need (`.top-section`), leaving only the `.lower-section` with the dials visible. We also strip the "bezel" styling from it.

4.  **Fixed Aspect Ratio (Nice-to-Have):** We will use the modern `aspect-ratio` CSS property for the center panel. It's well-supported and ideal for this.

    ```css
    /* in _mobile.css */
    @media (max-width: 768px) {
      .panel-bezel.center-panel {
        /* ... other styles ... */
        aspect-ratio: 360 / 784; /* Based on desktop flex-basis and assumed height */
        height: auto; /* Let the width and aspect-ratio define the height */
      }
    }
    ```

5.  **Landscape Mode:**

    ```css
    /* in _mobile.css */
    @media (orientation: landscape) and (max-height: 768px) {
        /* This is a simple implementation. We might need to refine it. */
        /* It ensures that on a phone, rotating to landscape brings back the desktop view */
        .main-content-area {
            /* Revert all mobile grid changes back to desktop flex */
            display: flex; 
            /* ... other desktop styles ... */

            /* Scale the UI down */
            transform: scale(0.8); /* Example scale factor, can be calculated with JS if needed */
            transform-origin: center center;
            height: 90vh; /* Restore desktop height */
        }
        /* We would need to add more reverts here, which is why a mobile-first CSS approach is cleaner. */
    }
    ```

#### **2.4. JavaScript Considerations**

Even with a CSS-only layout change, we must audit our JavaScript.

*   **State Management:** The good news is that with a single DOM, our state management (XState, etc.) becomes simpler. There is only one source of truth. We must ensure no code remains that was designed to sync state between two different DOMs.
*   **DOM-Dependent Calculations:** We must audit all JavaScript that might calculate element sizes or positions. For example, if any animation code uses `getBoundingClientRect()` to calculate a position, it will now get different values on mobile. This code must be reviewed to ensure it behaves correctly within the new flexible layout.
*   **Performance:** All principles from `mobile-insights-A.md` still apply. We must continue to be vigilant about memory leaks, efficient event handling (delegation), and minimizing render-blocking scripts.

#### **2.5. Development & Testing Workflow (Action Plan)**

This is a sequential plan to ensure a smooth and successful implementation.

1.  **Phase 1: CSS Scaffolding (1-2 days)**
    *   Create `src/css/mobile/_mobile.css` and import it into `main.css`.
    *   Implement the `max-width: 768px` media query.
    *   Apply `display: grid` to `.main-content-area` and hide the left and parts of the right panel as detailed in section 2.3.
    *   **Goal:** Have the correct components (center panel, dials) visible in the correct order on a mobile viewport, with other components hidden.

2.  **Phase 2: Component Adaptation & Styling (2-3 days)**
    *   Implement the `aspect-ratio` on the center panel.
    *   Ensure the `MOOD` and `INTENSITY` dials lay out correctly in their 50/50 split.
    *   Adjust font sizes, paddings, and margins on all visible components to ensure they are legible and touch-friendly.
    *   Implement the landscape "scaled desktop" view.
    *   **Goal:** The mobile UI looks and feels polished and intentional.

3.  **Phase 3: JavaScript Audit & Refinement (1-2 days)**
    *   Search the codebase for any hardcoded pixel values or layout assumptions (e.g., `element.style.width = '360px'`).
    *   Review all code using `getBoundingClientRect()` or `offsetWidth`/`offsetHeight` to ensure it functions correctly in a fluid layout.
    *   Remove any "dead" code related to the old mobile DOM/logic.
    *   **Goal:** Ensure all interactivity (dials, animations) works flawlessly in the new mobile layout.

4.  **Phase 4: Rigorous Testing & QA (2 days)**
    *   **Real Device Testing:** Use a service like **BrowserStack** to test on a variety of real iOS and Android devices. This is non-negotiable.
    *   **Emulator Testing:** Use **Chrome DevTools Device Mode** for rapid debugging during development.
    *   **Functional Testing:** Go through every user flow. Turn the dials. Check landscape/portrait switching.
    *   **Performance Profiling:** Use the DevTools Performance and Memory tabs to look for memory leaks or performance bottlenecks specifically on mobile emulation.
    *   **Goal:** A bug-free, performant experience on all target devices.

### **3. Updated Mobile Layout Specification (v3.0)**

#### **3.1. Core Principles**
*   **Strategy:** Responsive Web Design (RWD) using a single DOM.
*   **Breakpoint:** Mobile portrait layout active for `max-width: 768px`.
*   **Background:** The master `.app-wrapper` gradient is the universal background.

#### **3.2. Mobile Portrait Layout (`max-width: 768px`)**

A single-column layout centered horizontally, composed of two main sections.

**ASCII Layout Representation:**

```
+------------------------------------------------------+
|                     app-wrapper                      | (Master Gradient Background)
|                                                      |
| +--------------------------------------------------+ |
| |             .panel-bezel.center-panel            | | (Grid Area: center-panel)
| |                (Fixed Aspect Ratio)              | | (Bezel effect intact)
| | +----------------------------------------------+ | |
| | |                 LOGO + LENS                  | | |
| | +----------------------------------------------+ | |
| |                                                  | |
| | +----------------------------------------------+ | |
| | |                   GRILL                      | | |
| | +----------------------------------------------+ | |
| +--------------------------------------------------+ |
|                                                      |
| +------------------+  +---------------------------+ |
| |  .hue-control-   |  |     .hue-control-block    | | (Grid Area: dial-controls)
| |      block       |  |                           | | (No Bezel)
| |                  |  |                           | |
| |   [ MOOD DIAL ]  |  |   [ INTENSITY DIAL ]      | |
| |                  |  |                           | |
| +------------------+  +---------------------------+ |
|                                                      |
+------------------------------------------------------+
```

#### **3.3. Structural & Component Specification**

*   **Layout Container (`.main-content-area` @mobile):**
    *   `display: grid;`
    *   `grid-template-columns: 1fr;`
    *   `grid-template-areas: "center-panel" "dial-controls";`
    *   `gap: var(--space-2xl);`

*   **Top Section (`.panel-bezel.center-panel`):**
    *   **Placement:** `grid-area: center-panel;`
    *   **Sizing:** `width: 100%; height: auto; aspect-ratio: [value];` (e.g., `360 / 784`).
    *   **Contents:** Unchanged from desktop. The internal flexbox layout of its `.top-section` and `.lower-section` remains the same.

*   **Bottom Section (`.right-panel .lower-section` via parent):**
    *   **Placement:** The parent `.panel-bezel.right-panel` is assigned `grid-area: dial-controls;`.
    *   **Styling:** The parent `.panel-bezel.right-panel` has its bezel styles (background, border, shadow) removed.
    *   **Layout:** The `.lower-section` container within it uses `display: flex;` to position the two `.hue-control-block` elements side-by-side, each taking up 50% of the width.
    *   **Contents:** The `MOOD` and `INTENSITY` dial blocks are unchanged internally.

*   **Hidden Components (`display: none`):**
    *   `.panel-bezel.left-panel`
    *   `.right-panel .top-section` (This includes `AUX LIGHT` and `HUE ASSN`).
    *   The `MAIN PWR`, `TERMINAL`, `SKILL SCAN`, and `FIT EVAL` components are hidden as they are children of the hidden `.left-panel`.

#### **3.4. Mobile Landscape Layout**
*   **Behavior:** The complete desktop user interface is rendered.
*   **Implementation:** Media queries will revert the mobile grid layout to the desktop flexbox layout. A `transform: scale()` property will be applied to the `.main-content-area` to fit the UI within the viewport, with letterboxing on the sides.