# HUE 9000 Theming Guidelines (REVISED for V2.3)

This document outlines the principles and conventions for theming the HUE 9000 interface, reflecting the V2.3 component-based architecture for buttons and dials.

## Core Theming Principles

1.  **"Low" (Dark) vs. "High" (Light) Intensity:** (As before)
2.  **Dynamic Theming via CSS Variables and JavaScript:** (As before)
    *   **Critical for Theme Overrides:** Selectors like `body.theme-dark` or `body.theme-light` (potentially qualified by `:not(.theme-dim)`) are essential.
3.  **DIM Mode Theming (`theme-dim.css`):**
    *   Button text is **black** (or very dark, defined by CSS variables like `--btn-unlit-text-l` or `--btn-dimly-lit-text-l`).
    *   **Button States in DIM Mode (Phases P0-P5_AuxLightsEnergize_Dim of startup):**
        *   `is-unlit`: Default state for most buttons before their activation phase. Extremely faint. Managed by `Button.js` instances via `buttonManager.js`.
        *   `.is-energized` (with `theme-dim.css` overrides): Used for MAIN PWR buttons in Phase P2, and AUX buttons in P5_AuxLightsEnergize_Dim. These buttons adopt a "dark theme energized" appearance. Their lights flicker *to this state*, animated by their `Button.js` instance.
        *   `is-dimly-lit`: Applied in Phase P4 to SCAN, HUE ASSN, FIT EVAL, and AUX buttons. Brighter than `is-unlit` but not fully powered.
    *   Buttons smoothly transition (CSS transitions driven by class changes from `Button.setState()`) to `is-dimly-lit` in Phase P4. MAIN PWR and AUX buttons flicker to `.is-energized` in their respective phases.

4.  **Transition from DIM Mode & Energizing (Startup Phase P6_ThemeTransitionAndFinalEnergize):**
    *   Unified 1-second CSS animation for global elements (panels, text) via `.is-transitioning-from-dim` class as `body.theme-dim` is removed and `body.theme-dark` (or light) is added.
    *   **Button Energizing Flicker (SCAN, HUE ASSN, FIT EVAL):**
        *   Concurrently with the global CSS transition, `buttonManager.js` orchestrates flicker animations for buttons that were in the `is-dimly-lit` state. **This orchestration is triggered by a deferred call within the P6 GSAP timeline, ensuring button states are inspected after the theme change has been initiated.**
        *   Individual `Button.js` instances for SCAN, HUE ASSN, and FIT EVAL buttons execute a flicker animation from their `is-dimly-lit` appearance directly *to* their final `is-energized is-selected` or `is-energized` (unselected) state, as defined by the new theme (e.g., `theme-dark.css`).
        *   HUE ASSN buttons get their appropriate selected/unselected energized state based on `DEFAULT_ASSIGNMENT_SELECTIONS`.
        *   The `Button.playFlickerToState()` method (called by `buttonManager`) handles this animation. The `buttonManager.flickerDimlyLitToEnergizedStartup` method determines the target `is-energized` state based on the new theme context (`theme-dark`) and default selections.
        *   MAIN PWR and AUX buttons, already `.is-energized` from earlier phases, will visually transition their appearance due to the global theme change (CSS variables updating) without needing to re-flicker.

5.  **Performance Considerations:** (As before)

## Specific Component Guidelines

### 1. LCD Displays (Mood, Intensity, Terminal)
*   (As before)
*   **DIM Mode:** Terminal LCD text is visible but dim (styled by `theme-dim.css`). Dial LCD text is **blank** until Phase P4, then becomes visible and "active dim" (showing values) via `uiUpdater.js` adding `.js-active-dim-lcd` class. Values are sourced from `appState.js` (which `Dial.js` instances update).

### 2. UI Elements (e.g., Hue Wheels/Dials, Lens Accents)
*   (As before)
*   **DIM Mode Dials:** Dials are unlit/featureless (canvas drawn flat dark grey by `Dial.js` instances) until Phase P4. In Phase P4, `dialManager.js` calls `DialInstance.setActiveDimState(true)`, causing dial canvases to be redrawn by their `Dial.js` instances to show an "active dim" state using "dim active" variables from `theme-dim.css`.

### 3. Buttons (`button-unit` System)
*   **Button States & Visuals (Managed by `Button.js` instances, orchestrated by `buttonManager.js`):**
    *   **`is-unlit`**: Default in `body.theme-dim` for most buttons before their activation phase.
    *   **`.is-energized` (in `theme-dim`)**: Special state for MAIN PWR (P2) and AUX (P5_AuxLightsEnergize_Dim). Styled by `theme-dim.css` overrides to appear energized. Lights flicker to this state via `Button.playFlickerToState()`.
    *   **`is-dimly-lit`**: Class `.is-dimly-lit`. Applied in Phase P4 to SCAN, HUE ASSN, FIT EVAL, and AUX buttons. Text black.
    *   **`is-energized` (+ `is-selected` / or unselected)**: Full power, themed state. SCAN, HUE ASSN, and FIT EVAL buttons flicker *to* this state in Phase P6 from their `is-dimly-lit` state via `Button.playFlickerToState()`.
*   **Color Source:**
    *   In DIM mode (Phases P0-P5), button appearance is defined by `is-unlit`, `is-dimly-lit`, or special `.is-energized` styles in `theme-dim.css`.
    *   In Full Theme (Phase P6+), `is-energized` buttons use themed variables from `theme-dark.css` (or `theme-light.css`).
*   **Text Color:**
    *   Explicitly black or very dark in `theme-dim` for `is-unlit` and `is-dimly-lit` states. For `.is-energized` buttons in `theme-dim` (like MAIN PWR, AUX), text color matches the dark theme energized style.
    *   Transitions to themed color during Phase P6 global theme change / flicker.
*   **Transition from DIM (Phase P6):**
    *   SCAN, HUE ASSN, and FIT EVAL buttons (via their `Button.js` instances) flicker from `is-dimly-lit` to their final `.is-energized` states. This animation runs concurrently with the global 1s CSS transition.

### 4. Lens Display
*   (As before)
*   **Bezel Theming:** The lens bezel rings (`#lens-container::before/::after`) should appear as a flat, very dark grey in `theme-dim`. They transition to their metallic conic gradient when the main theme activates in Phase P6. The main `#lens-container` element itself follows global component opacity.

## Maintaining Consistency & Performance
*   (As before, emphasizing testing the button lifecycle via `Button.js` components, the startup sequence, and the Phase P6 transition).