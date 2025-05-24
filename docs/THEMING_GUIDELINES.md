---
file: THEMING_GUIDELINES.md
---
# HUE 9000 Theming Guidelines (REVISED for XState Startup)

This document outlines the principles and conventions for theming the HUE 9000 interface, reflecting the XState-orchestrated startup sequence and component-based architecture.

## Core Theming Principles

1.  **"Low" (Dark) vs. "High" (Light) Intensity:** (As before) The primary themes are `theme-dark` and `theme-light`.
    *   **CRITICAL WARNING NOTE:** The `theme-light.css` (referred to as "High Intensity" or "Light Theme") is **NOT** a traditional light mode (e.g., white backgrounds, dark text). It is designed as a *brighter, higher contrast variant of the dark theme aesthetic*. All design and variable choices for `theme-light.css` should reflect this intent, maintaining the overall retro-futuristic, control panel feel, rather than attempting to invert it into a standard "day mode."

2.  **Dynamic Theming via CSS Variables and JavaScript:** (As before)
    *   **Critical for Theme Overrides:** Selectors like `body.theme-dark` or `body.theme-light` (potentially qualified by `:not(.theme-dim)`) are essential.

3.  **DIM Mode Theming (`theme-dim.css`) & Startup Factors:**
    *   `theme-dim.css` defines the *base* visual characteristics for the startup/dim state.
    *   During the startup sequence (Phases P0-P8), these base visuals are further attenuated by two CSS custom properties animated by GSAP in each `startupPhaseX.js` module:
        *   `--startup-L-reduction-factor`: Reduces the Lightness (L) channel of OKLCH colors.
        *   `--startup-opacity-factor`: Reduces the opacity of various visual effects (textures, glows, text shadows).
    *   Button text in `theme-dim` is **black** or very dark (defined by variables like `--btn-unlit-text-l` or `--btn-dimly-lit-text-l`).
    *   **Button States in DIM Mode (Phases P0-P9 of startup):**
        *   `is-unlit`: Default state for most buttons after P0. Extremely faint.
        *   `is-dimly-lit`: Applied via flicker (e.g., `buttonFlickerToDimlyLit` profile) to:
            *   MAIN PWR buttons in Phase P2.
            *   SCAN/FIT EVAL buttons in Phase P5.
            *   HUE ASSN buttons in Phase P7.
            *   AUX LIGHT buttons in Phase P8.
        *   `.is-energized` (with `theme-dim.css` overrides): Used for MAIN PWR buttons in Phase P3, and AUX LIGHT "LOW" button in Phase P9. These buttons adopt a "dark theme energized" appearance. They flicker *from* `is-dimly-lit` *to this state* (e.g., using `buttonFlickerFromDimlyLitToFullyLitSelectedFast` or `buttonFlickerFromDimlyLitToFullyLitSelected`).

4.  **Transition from DIM Mode & Energizing (Startup Phase P10):**
    *   A 1-second visual transition for key global elements (panels, text, etc.) is orchestrated by `startupSequenceManager.js` and CSS.
        *   JavaScript (in `startupPhase10.js`) identifies DOM elements via `config.selectorsForDimExitAnimation` and adds `.animate-on-dim-exit` to them.
        *   `body.is-transitioning-from-dim` class is added to `<body>`.
        *   `appStateService.setTheme('dark')` is called, which causes `uiUpdater.js` to remove `body.theme-dim` and add `body.theme-dark`.
        *   A CSS rule in `_startup-transition.css` (targeting `body.is-transitioning-from-dim .animate-on-dim-exit`) applies the 1-second transition.
        *   Cleanup of these classes is handled by an FSM action (`performThemeTransitionCleanupIfNeeded`) upon entry to Phase P11.
    *   **Button Energizing Flicker (SCAN, HUE ASSN, FIT EVAL):**
        *   Concurrently with the global CSS transition, `buttonManager.flickerDimlyLitToEnergizedStartup()` orchestrates flicker animations for buttons that were in the `is-dimly-lit` state.
        *   Individual `Button.js` instances execute a flicker animation (e.g., `buttonFlickerFromDimlyLitToFullyLitSelected` or `buttonFlickerFromDimlyLitToFullyLitUnselected`) from their `is-dimly-lit` appearance directly *to* their final `is-energized` state, as defined by `theme-dark.css`.
        *   HUE ASSN buttons get their appropriate selected/unselected energized state based on `DEFAULT_ASSIGNMENT_SELECTIONS`.
        *   MAIN PWR and AUX buttons, already `.is-energized` from earlier phases, visually adapt due to the global theme change (CSS variables updating) without needing to re-flicker.

5.  **Performance Considerations:** (As before)

## Specific Component Guidelines

### 1. LCD Displays (Mood, Intensity, Terminal)
*   **DIM Mode (Phases P0-P5):**
    *   Terminal LCD text (from P1) remains visible. Its screen background (`.actual-lcd-screen-element`) is styled as `lcd--unlit` by `uiUpdater.js`.
    *   Dial LCDs (A & B) are styled as `lcd--unlit`. Their text (`.lcd-value`) is opacity 0.
*   **DIM Mode (Phases P6-P9):**
    *   Terminal screen background flickers to `lcd--dimly-lit` (using `terminalScreenFlickerToDimlyLit` profile, container `autoAlpha` stays 1, text persists).
    *   Dial LCD screens flicker to `lcd--dimly-lit` (using `lcdScreenFlickerToDimlyLit` profile, container `autoAlpha` animates from 0). Their text becomes visible.
    *   **Key Point for LCD Flickers:** `uiUpdater.setLcdState` ensures that for profiles starting from `autoAlpha:0` (like for Dial LCDs), the `autoAlpha:0` is set by GSAP *before* the target class (e.g., `.lcd--dimly-lit`) is applied, preventing a visual flash of the class styles.
*   **Theme Transition (Phase P10):**
    *   All LCDs are set to an 'active' state (classless regarding `lcd--unlit`/`lcd--dimly-lit`) by `uiUpdater.js` *before* `appStateService.setTheme('dark')` is called.
    *   Their `background-image` (and `background-color` fallback) transitions via CSS due to changing theme variables. Text remains visible.
    *   `uiUpdater.applyInitialLcdStates()` is called again after a short delay post-theme-set to ensure final state consistency.
*   **CSS Fallback:** `_lcd.css` includes a `background-color` for LCD elements, derived from their gradient's darkest stop. This acts as a fallback during CSS transitions of `background-image` to prevent full transparency if the gradient momentarily fails to render.

### 2. UI Elements (e.g., Hue Wheels/Dials, Lens Accents)
*   **DIM Mode Dials:** Dials are unlit/featureless (canvas drawn flat dark grey by `Dial.js` instances) until Phase P6. In Phase P6, `dialManager.js` calls `DialInstance.setActiveDimState(true)`, causing dial canvases to be redrawn by their `Dial.js` instances to show an "active dim" state using "dim active" variables from `theme-dim.css` (further attenuated by startup factors).

### 3. Buttons (`button-unit` System)
*   **Button States & Visuals (Managed by `Button.js` instances, orchestrated by `buttonManager.js`):**
    *   **`is-unlit`**: Default in `body.theme-dim` for most buttons after P0.
    *   **`is-dimly-lit`**: Class `.is-dimly-lit`. Applied via flicker in Phases P2, P5, P7, P8.
    *   **`.is-energized` (in `theme-dim`)**: Special state for MAIN PWR (P3) and AUX (P9). Styled by `theme-dim.css` overrides to appear energized. Lights flicker from `is-dimly-lit` to this state.
    *   **`is-energized` (+ `is-selected` / or unselected)**: Full power, themed state. SCAN, HUE ASSN, and FIT EVAL buttons flicker *to* this state in Phase P10 from their `is-dimly-lit` state.
*   **Color Source:**
    *   In DIM mode (Phases P0-P9), button appearance is defined by `is-unlit`, `is-dimly-lit`, or special `.is-energized` styles in `theme-dim.css`, all further attenuated by startup factors.
    *   In Full Theme (Phase P10+), `is-energized` buttons use themed variables from `theme-dark.css` (or `theme-light.css`).
*   **Text Color:**
    *   Explicitly black or very dark in `theme-dim` for `is-unlit` and `is-dimly-lit` states. For `.is-energized` buttons in `theme-dim` (like MAIN PWR, AUX), text color matches the dark theme energized style.
    *   Transitions to themed color during Phase P10 global theme change / flicker.
*   **Transition from DIM (Phase P10):**
    *   SCAN, HUE ASSN, and FIT EVAL buttons (via their `Button.js` instances) flicker from `is-dimly-lit` to their final `.is-energized` states. This animation runs concurrently with the global 1s CSS transition.

### 4. Lens Display
*   (As before)
*   **Bezel Theming:** The lens bezel rings (`#lens-container::before/::after`) have their L-values attenuated by `--startup-L-reduction-factor` throughout startup. Their opacity is `var(--lens-bezel-opacity)` (from `theme-dim.css`). They transition to their full metallic conic gradient when the main theme activates in Phase P10.

## Maintaining Consistency & Performance
*   (As before, emphasizing testing the button lifecycle via `Button.js` components, the startup sequence, and the Phase P10 transition).
*   **LCD State Management:** Pay close attention to the order of operations in `uiUpdater.js -> setLcdState` and `applyInitialLcdStates`. For elements animated with flicker profiles starting from `autoAlpha:0`, ensure GSAP sets this invisibility *before* any CSS classes that define a visible state are applied to prevent visual flashes. For CSS transitions involving `background-image` gradients driven by variables, ensure a suitable `background-color` fallback is present.