# PRD: HUE 9000 Mobile Interface Adaptation

- **Status:** Draft
- **Owner:** [Your Name/Handle]
- **Contributors:** AI Assistant
- **Last Updated:** 2023-10-27

## 1. Overview & The Vision

This document outlines the requirements and development plan for adapting the HUE 9000 desktop interface into a first-class, fully interactive mobile experience. The primary goal is to move beyond a simple "responsive" layout to a "mobile-first" interaction model for key components, ensuring the application is not just usable, but delightful on a modern smartphone.

The core strategy is to maintain the "single screen" control surface feel by creating a non-scrolling 2x2 grid for the main panels, while redesigning complex interactions (terminal, color assignment, dials) to be ergonomic and precise for touch input.

## 2. Problem Statement

The current desktop-first design, when scaled down, presents three critical usability failures on a mobile viewport:

1.  **Terminal Content Loss:** The fixed-size terminal has no scroll mechanism, causing older, critical information to be pushed out of view and become permanently inaccessible.
2.  **Interaction Inaccuracy (The "Fat Finger" Problem):** The Hue Assignment grid, a core feature, becomes a matrix of tiny, tightly-packed tap targets that are frustrating and nearly impossible to use accurately with a finger.
3.  **Imprecise Control:** The horizontal drag-based dials offer a very short travel distance on a narrow mobile screen, making fine-grained value adjustments difficult and clumsy.

## 3. Goals & Success Metrics

| Goal                        | Success Metric                                                                                                                                      |
| :-------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Full Interaction Parity** | All controls available on desktop are present and fully functional on the mobile interface. No features are hidden or disabled.                     |
| **Superior Mobile UX**      | The interface feels deliberate and optimized for touch, not like a compromised desktop view. Key interactions are demonstrably faster and less error-prone. |
| **Preserve Core Aesthetic** | The mobile layout retains the high-fidelity, diegetic "hardware" feel of the HUE 9000 brand, even with mobile-centric UI patterns.          |
| **Ergonomic Controls**      | Key tap targets (e.g., Hue Assignment) meet or exceed the 44x44px recommended size. Precision controls (dials) are easy to operate.           |
| **Information Integrity**  | All historical data (e.g., terminal output) remains accessible to the user without requiring a full-page scroll.                                 |

## 4. User Stories

- **Terminal:** "As a mobile user, I want to scroll through my entire terminal history so that I can review past commands and outputs without losing context."
- **Hue Assignment:** "As a mobile user, I want to tap a clear category like 'LOGO' to open a large, touch-friendly list of colors so that I can confidently assign a new hue without making errors."
- **Dials:** "As a mobile user, I want to precisely set the 'Mood' dial to a specific value by dragging my finger vertically on the screen, giving me finer control."

## 5. Functional Requirements & Visual Specifications

### 5.1. Core Layout: The "Condensed Grid"

- **MUST** be triggered on viewports with a `max-width` of `800px` in `portrait` orientation.
- **MUST** arrange the three main panels into a 2x2 grid using CSS Grid.
  - `grid-template-areas`: `"left-panel center-panel" "right-panel right-panel"`
- **MUST** prevent the main `body` or `.app-wrapper` from scrolling.
- **SHOULD** use flexible row sizing (e.g., `minmax(300px, 1.2fr) minmax(250px, 1fr)`) to adapt gracefully to various phone aspect ratios.

### 5.2. Terminal Component

- **MUST** implement internal vertical scrolling via `overflow-y: auto`.
- **MUST** feature a custom-styled, minimalist scrollbar to match the UI theme.
  - **Track:** Thin, semi-transparent, and blended with the LCD background.
  - **Thumb:** A thin, bright element using the dynamic LCD text color.
- **MUST** automatically scroll to the bottom when new content is added.

### 5.3. Hue Assignment: The "Control Sheet"

- **MUST** be triggered by a tap on the column headers (`ENV`, `LCD`, `LOGO`, `BTN`).
- **MUST** appear as a modal panel ("sheet") that animates smoothly from the bottom of the viewport, covering ~50-60% of the screen.
- **MUST** display a vertically scrolling list of the 12 color chips. Each list item must be a large tap target and include the color's text label (e.g., "Cyan").
- **MUST** automatically dismiss (animate out) upon the user tapping a color choice.
- **MUST** immediately update the corresponding Hue Assignment column in the main UI upon dismissal to provide instant feedback.

### 5.4. Dial Controls

- **MUST** respond to a vertical touch-drag gesture for value adjustment. The horizontal position of the drag should not affect the value.
- **MUST** allow the user to initiate the drag on the dial component and continue the gesture anywhere on the screen ("detached drag") for maximum comfort.
- **SHOULD** provide a subtle one-time visual affordance (e.g., a brief vertical shimmer) on first touch to hint at the vertical drag interaction.

## 6. Out of Scope

-   **Landscape Mobile View:** This adaptation is for portrait orientation only. Landscape will display a scaled version of the desktop UI.
-   **Tablet-Specific Layout:** Tablets will use the desktop layout.
-   **Full UI Theming of the Control Sheet:** The initial version will match the default `theme-dim`, but will not dynamically change with all UI themes unless specified later.

## 7. Architectural & Development Plan

### 7.1. File Structure

1.  **Create New File:** `src/css/1-base/_mobile.css`. This file will contain all media queries and responsive overrides.
2.  **Modify Existing File:** `src/css/main.css`. Add `@import url('./1-base/_mobile.css');` to the very end of the file to ensure its rules have the highest specificity.

### 7.2. CSS Strategy

-   **Media Query:** All rules in `_mobile.css` will be wrapped in `@media (max-width: 800px) and (orientation: portrait) { ... }`.
-   **Variable Overrides:** The primary method for scaling the UI will be overriding structural CSS variables (e.g., `--space-xl`, `--height-lower-section`) within the media query.
-   **Grid Implementation:** The `.main-content-area` selector will be overridden from `display: flex` to `display: grid` with the specified `grid-template-areas`.
-   **Custom Scrollbar:** Use `::-webkit-scrollbar`, `::-webkit-scrollbar-track`, and `::-webkit-scrollbar-thumb` pseudo-elements to style the terminal scrollbar. Provide a fallback for Firefox if necessary.

### 7.3. JavaScript Strategy

This feature requires targeted JavaScript development for two of the three solutions.

1.  **Terminal Component:**
    -   **No JS changes required.** This is a pure CSS solution.

2.  **Hue Assignment "Control Sheet":**
    -   **HTML:** Add the DOM structure for the modal to `index.html`. It should be initially hidden with `display: none` or an opacity/transform class.
    -   **Event Listeners:** Add `click` event listeners to the four hue assignment column headers (`.env-assignment-column`, etc.).
    -   **Show/Hide Logic:** Create functions (`openHueSheet(target)`, `closeHueSheet()`) to manage the modal's visibility and animations by adding/removing CSS classes.
    -   **Dynamic Content:** The `openHueSheet(target)` function must populate the sheet's title and configure the click handlers for the color chips inside to know which target (`env`, `lcd`, etc.) is being modified.
    -   **State Management:** When a color is selected inside the sheet, its handler will call the existing `uiUpdater` or state management logic to apply the change, then call `closeHueSheet()`.

3.  **Dial Controls:**
    -   **Refactor Event Listeners:** Locate the existing `touchmove` (or `pointermove`) event handler for the dials.
    -   **Modify Delta Calculation:** The logic that calculates the change in value based on `event.clientX` movement must be changed to calculate based on `event.clientY` movement. The polarity may need to be inverted (e.g., dragging down increases the value).
    -   **Sensitivity Tuning:** The multiplier that converts pixel movement to value change will need to be re-tuned for the vertical axis to feel responsive but precise.

## 8. Paramount Questions for Stakeholders

1.  **Animation Fidelity:** The "Control Sheet" has a key animation. Is a simple, smooth slide-in/out sufficient, or should we invest more time in a more complex, physics-based "spring" animation to enhance the premium feel?
2.  **Scrollbar Design:** For the terminal, is a minimalist, functional custom scrollbar acceptable, or is a fully-designed, skeuomorphic element required to perfectly match the hardware aesthetic? The latter adds significant CSS complexity.
3.  **Haptic Feedback:** Should we add subtle haptic feedback (on supported devices) when a user selects a color in the Control Sheet or when a dial "clicks" over a specific increment? This is a pure enhancement that can be added later.

## 9. Key Areas for Future Refinement

> If we had more time and resources, these areas would provide the most impact for further elevating the mobile experience.

1.  **Container Queries:** The current plan uses a global media query. Refactoring component CSS to use `@container` queries would make them truly modular and resilient, allowing them to adapt perfectly regardless of where they are placed in the grid. This is the modern, "best practice" approach.
2.  **Comprehensive Accessibility (A11y) Audit:** While we are increasing tap target sizes, a full audit should be performed. This includes ensuring all new interactive elements (like the Control Sheet) properly manage focus, have correct ARIA roles, and are navigable via screen readers.
3.  **Landscape Mobile View:** Designing a dedicated layout for landscape orientation. This might involve a two-column layout or a tabbed interface to avoid content cramping.
4.  **Haptic Feedback Implementation:** Integrating a haptics library to provide tactile feedback for key interactions, making the "hardware" feel more tangible.