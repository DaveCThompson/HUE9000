# HUE 9000 Theming Guidelines (REVISED for XState Startup)

This document outlines the principles and conventions for theming the HUE 9000 interface, reflecting the XState-orchestrated startup sequence and component-based architecture.

## Core Theming Principles

1.  **"Low" (Dark) vs. "High" (Light) Intensity:** (As before) The primary themes are `theme-dark` and `theme-light`.
    *   **CRITICAL WARNING NOTE:** The `theme-light.css` (referred to as "High Intensity" or "Light Theme") is **NOT** a traditional light mode (e.g., white backgrounds, dark text). It is designed as a *brighter, higher contrast variant of the dark theme aesthetic*. All design and variable choices for `theme-light.css` should reflect this intent, maintaining the overall retro-futuristic, control panel feel, rather than attempting to invert it into a standard "day mode."

2.  **Dynamic Theming via CSS Variables and JavaScript:** (As before)
    *   **Critical for Theme Overrides:** Selectors like `body.theme-dark` or `body.theme-light` are essential for overriding variables defined in `_variables-theme-contract.css`.

3.  **DIM Mode Theming (`theme-dim.css`) & Startup Factors:**
    *   `theme-dim.css` defines the *base* visual characteristics for the startup/dim state.
    *   During the startup sequence (Phases P0-P8), these base visuals are further attenuated by three CSS custom properties animated by GSAP in each `startupPhaseX.js` module:
        *   `--startup-L-reduction-factor`: Reduces the Lightness (L) channel of OKLCH colors. Used for backgrounds, bezels, and labels.
        *   `--startup-opacity-factor`: Reduces the opacity of various visual effects (textures, glows, text shadows).
        *   `--startup-opacity-factor-boosted`: A clamped, faster-ramping version of the opacity factor used for components that should appear more quickly or prominently (e.g., logo, dials, color chips, grill).
    *   **Button States in DIM Mode (Phases P0-P9 of startup):**
        *   `is-unlit`: Default state for most buttons after P0. Extremely faint.
        *   `is-dimly-lit`: Applied via flicker profiles. Buttons in this state are achromatic (grayscale) and faintly lit.
        *   `.is-energized` (with `theme-dim.css` overrides): Used for MAIN PWR and AUX buttons. These buttons adopt a "dark theme energized" appearance even while the rest of the UI is dim. They flicker *from* `is-dimly-lit` *to this state*.

4.  **Transition from DIM Mode & Energizing (Startup Phase P10):**
    *   A 1-second visual transition for key global elements is orchestrated by `startupSequenceManager.js` and CSS.
        *   JavaScript (`startupPhase10.js`) adds the `.animate-on-dim-exit` class to elements defined in `config.selectorsForDimExitAnimation`.
        *   The `body.is-transitioning-from-dim` class is added to `<body>`.
        *   `appStateService.setTheme('dark')` is called, which removes `body.theme-dim` and adds `body.theme-dark`.
        *   A CSS rule in `_startup-transition.css` (targeting `body.is-transitioning-from-dim .animate-on-dim-exit`) applies the 1-second transition to a specific list of properties.
        *   Cleanup of these classes is handled by an FSM action (`performThemeTransitionCleanupIfNeeded`) upon entry to Phase P11.
    *   **Button Energizing Flicker (SCAN, HUE ASSN, FIT EVAL):**
        *   Concurrently, `buttonManager.flickerDimlyLitToEnergizedStartup()` orchestrates flicker animations for buttons that were in the `is-dimly-lit` state.
        *   These buttons flicker from their `is-dimly-lit` appearance directly *to* their final `is-energized` state, as defined by `theme-dark.css`.
        *   MAIN PWR and AUX buttons, already `.is-energized`, visually adapt due to the global theme change without needing to re-flicker.

## Specific Component Guidelines

### 1. LCD Displays (Mood, Intensity, Terminal)
*   **DIM Mode (Phases P0-P5):**
    *   Terminal LCD (`.actual-lcd-screen-element`) is styled with `.lcd--unlit`. Its text is visible but the background is nearly black.
    *   Dial LCDs (A & B) are styled with `.lcd--unlit`. Their text/content is opacity 0.
*   **DIM Mode (Phases P6-P9):**
    *   Terminal screen flickers to `.lcd--dimly-lit`.
    *   Dial LCD screens flicker to `.lcd--dimly-lit`. Their text/content becomes visible.
    *   In `theme-dim`, all `dimly-lit` and `unlit` LCD states are achromatic (grayscale), with text lightness defined in `theme-dim.css`.
*   **Theme Transition (Phase P10):**
    *   All LCDs are explicitly set to an 'active' state (i.e., the `.lcd--dimly-lit` class is removed) by a `call` function in `startupPhase10.js`.
    *   This cleanup is critical. It allows their `background-image` and `color` properties to transition smoothly to the `theme-dark` values as the underlying CSS variables change.

### 2. Dials
*   **DIM Mode:** Dials are unlit until Phase P6. In P6, `dialManager.js` calls `DialInstance.setActiveDimState(true)`, causing them to be redrawn in an "active dim" state using variables from `theme-dim.css` (attenuated by startup factors).
*   **Theme Transition (Phase P10):** Dials are redrawn in their full-color state as defined by `theme-dark.css` variables.

### 3. Buttons (`button-unit` System)
*   **Color Source:**
    *   In DIM mode, button appearance is defined by `is-unlit`, `is-dimly-lit`, or special `.is-energized` styles in `theme-dim.css`, all attenuated by startup factors.
    *   In Full Theme (P10+), `is-energized` buttons use themed variables from `theme-dark.css` or `theme-light.css`.
*   **Text Color:**
    *   Button text is explicitly black or very dark in `theme-dim` for `is-unlit` and `is-dimly-lit` states.
    *   For `.is-energized` buttons in `theme-dim` (like MAIN PWR, AUX), text color matches the dark theme energized style for consistency.
*   **Transition from DIM (Phase P10):**
    *   SCAN, HUE ASSN, and FIT EVAL buttons flicker from `is-dimly-lit` to their final `.is-energized` states. This animation runs concurrently with the global 1s CSS transition.
*   **High-Performance Glow Mechanism (IMPORTANT):**
    *   The glow effect on buttons is implemented differently based on their state to ensure performance.
    *   **Selected Buttons (`.is-selected.is-resonating`):** The "breathing" glow is achieved using a `::after` pseudo-element. Its `transform: scale()` and `opacity` are animated by JavaScript. This is highly performant. The main `.button-unit` element has its `box-shadow` set to `none`.
    *   **Unselected Energized Buttons (`.is-energized:not(.is-selected)`):** These buttons use a standard, static `box-shadow` for their glow, as they do not have a continuous animation.
    *   **Theming Implication:** To theme the selected button glow, you must target the `background-color` and `filter: blur()` of the `.button-unit::after` pseudo-element. To theme the unselected glow, you target the `box-shadow` property on the `.button-unit` itself.

### 4. Lens Display & Glows
*   **Bezel:** The lens bezel rings (`#lens-container::before/::after`) have their L-values attenuated by `--startup-L-reduction-factor` during startup. Their base opacity is set by `--lens-bezel-opacity` in `theme-dim.css`. They transition to their full metallic conic gradient in P10.
*   **Glow System (`outer-glow`, `super-glow`):**
    *   This is a complex system driven by the `--lens-power` CSS variable (updated by JS).
    *   **DIM Mode Overrides:** `theme-dim.css` significantly alters the glow appearance. It uses variables like `--lens-outer-glow-dim-scale-multiplier` and `--base-outer-glow-blur` to make the glows larger, more diffuse, and more prominent during the dim state, creating a signature "standby" effect.
    *   **Full Theme:** In `theme-dark` or `theme-light`, these overrides are removed, and the glows become tighter and more responsive to the raw `--lens-power` value.

### 5. Terminal Text Glow
*   The terminal has a themeable text glow effect. The base color and bloom size are defined in `_variables-theme-contract.css`.
*   Each theme (`theme-dim`, `theme-dark`, `theme-light`) can adjust the glow's final appearance by overriding two scaling factors:
    *   `--theme-terminal-glow-opacity-factor`
    *   `--theme-terminal-glow-size-factor`
*   This allows `theme-dim` to have a bright, full-sized glow while `theme-light` can have a more subtle, smaller glow, without duplicating the `text-shadow` rule.