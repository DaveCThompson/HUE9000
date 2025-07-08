Of course. Here is the comprehensive specification document for the LCD Effects Performance Overhaul, structured as requested.

***

# HUE 9000 - LCD Effects Performance Overhaul

**Document ID:** `SPEC-FX-002`
**Version:** 2.0
**Date:** July 9, 2025
**Author:** HUE 9000 (Principal Engineer)
**Status:** Approved for Implementation

This document outlines the complete technical, visual, and architectural specification for refactoring the LCD sweep and chromatic aberration effects. It supersedes all previous plans and addresses critical performance and maintainability issues identified in the prior implementation attempt.

---

## Master File List

The following files are relevant to this task. Developers should review these files to understand the context and implement the specified changes.

| Type | Action | File Path | Purpose / Notes |
| :--- | :--- | :--- | :--- |
| **CSS** | **Modified** | `src/css/components/_dial-displays.css` | **Remove** old, redundant Chromatic Aberration rules. |
| **CSS** | **Modified** | `src/css/components/_lcd.css` | **Implement** the new performant sweep animation. |
| **CSS** | **Modified** | `src/css/components/_scan-sequence.css` | **Remove** old `text-shadow` rule for Chromatic Aberration. |
| **CSS** | **Modified** | `src/css/components/_terminal.css` | **Implement** the new unified Chromatic Aberration rule. |
| **CSS** | Review | `src/css/core/_variables-theme-contract.css` | Provides context for dynamic color variables (`--dynamic-lcd-hue`, etc.). |
| **HTML** | **Modified** | `index.html` | **Update** the DOM structure for `#sweep-overlay` elements. |
| **JavaScript** | Review | `src/js/DisruptionManager.js` | **No changes needed.** Review to understand how `--_ca-current-offset` is animated. |
| **JavaScript** | Review | `src/js/IntensityDisplay.js` | Context for text elements affected by the unified CA rule. |
| **JavaScript** | Review | `src/js/LcdUpdater.js` | Context for how LCD states are managed. |
| **JavaScript** | Review | `src/js/MoodMatrix.js` | Context for text elements affected by the unified CA rule. |
| **JavaScript** | Review | `src/js/terminalManager.js` | Context for terminal text elements affected by the unified CA rule. |
| **Markdown**| **Modified** | `LCD FX.md` | This specification document. |

---

## 1. Product Requirements Document (PRD)

### 1.1. Goal
Refactor all ambient LCD animations (`sweep`) and event-driven effects (`disruption`) to be highly performant by running exclusively on the browser's compositor thread where possible. This will eliminate associated Lighthouse warnings, reduce CPU load, and ensure a consistently smooth 60fps animation across all devices.

### 1.2. Problem Statement
The current implementation of the LCD effects has two primary issues:
1.  **Performance:** The `sweep` animation (using `background-position`) and the `disruption` animation (using `text-shadow`) trigger expensive paint and layout operations on every frame, leading to performance degradation and Lighthouse warnings.
2.  **Implementation Failure:** A previous attempt to fix this failed, resulting in the sweep effect becoming invisible and the chromatic aberration effect disappearing entirely.

This refactor will address both the underlying performance problem and the failed implementation with a robust, maintainable solution.

### 1.3. Requirements

| ID | Type | Requirement Description |
| :--- | :--- | :--- |
| **FR-1** | Functional | The **sweep animation** must be a continuous, seamless, infinite vertical scroll of a thin, horizontal line over any active LCD screen. |
| **FR-2** | Functional | The **chromatic aberration (CA) effect** must be a crisp, horizontal splitting of text into red and blue "ghost" channels, triggered by the existing `DisruptionManager`. |
| **FR-3** | Functional | The visual appearance (color, opacity) of all effects must continue to be derived from the current theme's CSS custom properties. |
| **FR-4** | Functional | The sweep animation must play independently and be visually unaffected by other LCD effects, including the `resonance` pulse and the `disruption` flicker. |
| **NFR-1**| **Performance**| The **sweep animation MUST use only compositor-friendly CSS properties** (`transform`, `opacity`). It must not trigger layout or paint operations. |
| **NFR-2**| Performance | The implementation must resolve the "Avoid non-composited animations" Lighthouse diagnostic for the sweep effect. The CA effect's performance impact will be minimized but may remain a minor paint event due to its infrequency. |
| **NFR-3**| **Maintainability**| The solution **MUST NOT** require widespread JavaScript changes. Specifically, it must avoid creating a dependency where JS needs to update a `data-text` attribute for a CSS effect to function. |
| **NFR-4**| Regression | The changes must not introduce any new layout shifts (CLS), visual artifacts (e.g., seams, tearing), or negatively impact the rendering of other LCD content. |

---

## 2. User Experience (UX) & Visual Specification

### 2.1. UX Objective
This is a technical refactor. The end-user experience should be preserved, with the only noticeable change being improved smoothness and application performance. The visual language must remain consistent with the established design.

### 2.2. UX Acceptance Criteria
-   [ ] The sweep animation is perfectly seamless, with no "pop-in" or "pop-out" at the start or end of its cycle.
-   [ ] The chromatic aberration effect is crisp and does not cause text to appear blurry or misaligned when not active.
-   [ ] All animations are visibly smooth (target 60fps) with no stuttering, even during other UI interactions.

### 2.3. Visual Specification

#### 2.3.1. LCD Sweep Animation
-   **Description:** A thin, horizontal line that continuously scrolls from top to bottom over the LCD screen.
-   **Appearance:** The line should have a soft vertical gradient, giving it a "glow" effect.
-   **Color:** Derived from `oklch(95% calc(var(--dynamic-lcd-chroma) * 0.5) var(--dynamic-lcd-hue) / var(--lcd-sweep-opacity, 0.045))`.
-   **Thickness:** `2px`.
-   **Animation:** A smooth, linear, infinite vertical scroll.

#### 2.3.2. Chromatic Aberration (CA) Effect
-   **Description:** A momentary visual glitch applied to LCD text during a "disruption" event.
-   **Appearance:** The primary text remains, but two "ghost" copies are rendered: one red and one blue. These copies are offset horizontally in opposite directions.
-   **Color (Red Ghost):** `oklch(80% 0.15 40 / 0.7)`
-   **Color (Blue Ghost):** `oklch(80% 0.15 250 / 0.7)`
-   **Animation:** The horizontal offset of the ghost images is animated by `DisruptionManager.js` via the `--_ca-current-offset` CSS custom property, creating a "splitting" and "re-converging" effect.

---

## 3. Architectural & Developer Specification

### 3.1. Architectural Objective
Implement performant versions of the LCD sweep and chromatic aberration effects by replacing main-thread properties (`background-position`) with compositor-thread properties (`transform`) for the sweep, and by consolidating the CA effect into a single, maintainable CSS rule.

### 3.2. Decision & Rationale

1.  **LCD Sweep: "Two-Element Swap" Pattern**
    *   **Decision:** We will use two dedicated `<div>` elements inside the `#sweep-overlay` container. Each `div` will represent one sweep line and will be animated independently using `transform: translateY()`. One animation will be delayed by half the total duration, creating a seamless handoff as one line exits the screen and the other enters.
    *   **Rationale:** This is the industry-standard, robust pattern for creating performant, seamless, looping animations. It guarantees adherence to **FR-1** and **NFR-1**.

2.  **Chromatic Aberration: "Unified `text-shadow` Rule"**
    *   **Decision:** We will abandon the `attr(data-text)` approach from the previous plan. Instead, we will create a single, unified CSS rule that applies the `text-shadow` effect to all relevant LCD text selectors. This rule will be driven by the existing `--_ca-current-offset` variable animated by `DisruptionManager.js`.
    *   **Rationale:** This solution is vastly more maintainable (**NFR-3**), as it requires no JavaScript changes and decouples the visual effect from the content-setting logic. It centralizes the CA effect in one place, making it easy to manage. While `text-shadow` is not a compositor-only property, the effect is brief and infrequent, making its performance impact negligible and acceptable.

### 3.3. Implementation Plan & Code Changes

#### **Step 1: Update HTML Structure**

**File:** `index.html`
**Action:** In all three locations where `#sweep-overlay` appears, replace the empty `div` with the new two-element structure.

```html
<!-- FIND THIS (appears 3 times): -->
<div id="sweep-overlay" class="overlay"></div>

<!-- REPLACE WITH THIS (in all 3 locations): -->
<div id="sweep-overlay" class="overlay">
    <div class="sweep-line"></div>
    <div class="sweep-line"></div>
</div>
```

#### **Step 2: Refactor LCD Sweep CSS**

**File:** `src/css/components/_lcd.css`
**Action:** Replace the existing `#sweep-overlay` and `@keyframes lcdSweep` rules with the following new implementation.

```css
/* --- src/css/components/_lcd.css --- */

/* ... existing .lcd-container and other styles ... */

/* MODIFIED: The overlay is now a simple, transparent container. */
#sweep-overlay {
    position: absolute;
    inset: 0;
    pointer-events: none;
    z-index: 2;
    border-radius: inherit;
    /* CRITICAL: This clips the sweep lines to the LCD bounds. */
    overflow: hidden; 
    /* The overlay itself is made visible by the parent's state */
    visibility: hidden;
    opacity: 0;
    transition: opacity var(--transition-duration-medium) ease, visibility var(--transition-duration-medium) ease;
}

/* FIX: Explicitly make the sweep overlay visible only when its parent is NOT unlit. */
.lcd-container:not(.lcd--unlit) #sweep-overlay,
.actual-lcd-screen-element:not(.lcd--unlit) #sweep-overlay {
    visibility: visible;
    opacity: 1;
}

/* NEW: The individual sweeping lines */
#sweep-overlay .sweep-line {
    position: absolute;
    left: 0;
    right: 0;
    height: 2px; /* A fixed, crisp height */
    background-image: linear-gradient(to bottom,
        transparent,
        transparent calc(50% - 1px),
        oklch(95% calc(var(--dynamic-lcd-chroma) * 0.5) var(--dynamic-lcd-hue) / var(--lcd-sweep-opacity, 0.045)) calc(50% - 1px),
        oklch(95% calc(var(--dynamic-lcd-chroma) * 0.5) var(--dynamic-lcd-hue) / var(--lcd-sweep-opacity, 0.045)) calc(50% + 1px),
        transparent calc(50% + 1px),
        transparent
    );
    will-change: transform;
    animation: lcdSweep var(--lcd-sweep-speed, 5s) linear infinite;
}

/* NEW: Delay the second line to create a seamless loop */
#sweep-overlay .sweep-line:nth-child(2) {
    animation-delay: calc(var(--lcd-sweep-speed, 5s) / 2);
}

/* Pause animations when observer fires */
.lcd-container.effects-paused #sweep-overlay .sweep-line,
.actual-lcd-screen-element.effects-paused #sweep-overlay .sweep-line {
    animation-play-state: paused;
}

/* ... existing styles ... */

/* REVISED: The keyframe now animates the transform property for performance. */
@keyframes lcdSweep {
    from {
        transform: translateY(-100%);
    }
    to {
        /* Use a large vh unit to guarantee it clears the screen on all viewport sizes */
        transform: translateY(100vh); 
    }
}
```

#### **Step 3: Consolidate Chromatic Aberration CSS**

**File:** `src/css/components/_terminal.css`
**Action:** Add the new, unified rule for Chromatic Aberration. This rule will now be the single source of truth for this effect.

```css
/* --- src/css/components/_terminal.css --- */

/* ... other terminal styles ... */

/*
========================================================================
TERMINAL CHROMATIC ABERRATION - UNIFIED RULE
========================================================================
*/
/* This single, unified rule applies the CA effect to all relevant text elements
   across the application. It is driven by the --_ca-current-offset variable
   animated by DisruptionManager.js. */
.terminal-line,
.scan-main-title,
.scan-progress-label,
.scan-progress-value,
.scan-target-label,
.scan-target-name,
.scan-sub-job-title,
.scan-progressive-text,
.scan-conclusion,
.display-container__row--name,
.major-block--in-progress {
    text-shadow:
        var(--_ca-current-offset, 0px) 0 0 oklch(80% 0.15 40 / 0.7),
        calc(-1 * var(--_ca-current-offset, 0px)) 0 0 oklch(80% 0.15 250 / 0.7);
}
```

**File:** `src/css/components/_scan-sequence.css`
**Action:** Find and **REMOVE** the old `text-shadow` rule that targets `.scan-main-title`, etc. It is now redundant.

**File:** `src/css/components/_dial-displays.css`
**Action:** Find and **REMOVE** the entire `V2 DISPLAY CHROMATIC ABERRATION` section, including all `text-shadow` and `box-shadow` rules for the CA effect. It is now redundant.

### 3.4. Verification Plan

1.  **Functional & Visual:**
    *   [ ] Verify the sweep animation is now visible and seamless on all three themes (`dim`, `dark`, `light`) and across all three LCD screens.
    *   [ ] Trigger a disruption (e.g., by changing themes). Verify the CA effect is crisp, correctly aligned, and present on all relevant text (terminal lines, scan sequence text, V2 display text).
    *   [ ] Verify the sweep animation continues to play smoothly during the `resonance` and `disruption` effects.
2.  **Performance:**
    *   [ ] Use Chrome DevTools > Rendering > "Paint flashing". Confirm **no green flashes** appear from the sweep animation as it loops.
    *   [ ] Run a Lighthouse report. Confirm the "Avoid non-composited animations" diagnostic is clear of any LCD sweep-related elements.
3.  **Maintainability & Regression:**
    *   [ ] Confirm no changes were needed in `DisruptionManager.js`, `MoodMatrix.js`, or other JS files to make the CA effect work.
    *   [ ] Confirm there are no new visual artifacts (seams, tearing, alignment issues) on any LCDs.