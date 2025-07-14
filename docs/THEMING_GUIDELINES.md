# HUE 9000 Theming Guidelines (REVISED for v2.3)

This document outlines the principles and conventions for theming the HUE 9000 interface, reflecting the XState-orchestrated startup sequence and component-based architecture.

## Core Theming Principles

1.  **"Low" (Dark) vs. "High" (Light) Intensity:** (As before) The primary themes are `theme-dark` and `theme-light`.
    *   **CRITICAL WARNING NOTE:** The `theme-light.css` (referred to as "High Intensity" or "Light Theme") is **NOT** a traditional light mode (e.g., white backgrounds, dark text). It is designed as a *brighter, (in some ways lower contrast) variant of the dark theme aesthetic*. All design and variable choices for `theme-light.css` should reflect this intent, maintaining the overall retro-futuristic, control panel feel, rather than attempting to invert it into a standard "day mode."

2.  **Dynamic Theming via CSS Variables and JavaScript:** (As before)
    *   **CSS Custom Properties (`oklch()`):** All colors in the HUE 9000 interface are defined using CSS custom properties with the `oklch()` color function. This perceptually uniform color space allows for intuitive manipulation of lightness (L), chroma (C), and hue (H).
    *   **Dynamic Color Inputs:** Variables like `--dynamic-env-hue`, `--dynamic-lcd-chroma`, and `--dynamic-ui-accent-hue` are controlled by JavaScript (via `DynamicStyleManager.js` and `actionHandler.js`) based on user interactions (e.g., dial changes, hue assignment button presses). These dynamic inputs then propagate through the theme contract, allowing large portions of the UI to change color based on user selection.
    *   **Critical for Theme Overrides:** Selectors like `body.theme-dark` or `body.theme-light` are essential for overriding variables defined in `_variables-theme-contract.css`. This ensures that theme-specific values take precedence over the defaults.

3.  **DIM Mode Theming (`_theme-dim.css`) & Startup Factors:**
    *   `_theme-dim.css` defines the *base* visual characteristics for the application's initial "dim" or "standby" state. It generally sets very low lightness values and often reduces chroma, creating a desaturated, low-power appearance.
    *   During the startup sequence (Phases P0-P11), these base visuals are further attenuated by three CSS custom properties animated by GSAP in each `startupPhaseX.js` module:
        *   `--startup-L-reduction-factor`: Reduces the Lightness (L) channel of OKLCH colors, making elements appear darker. Used for backgrounds, bezels, and labels.
        *   `--startup-opacity-factor`: Reduces the overall opacity of various visual elements and effects (e.g., textures, glows, text shadows).
        *   `--startup-opacity-factor-boosted`: A clamped, faster-ramping version of the opacity factor used for components that should appear more quickly or prominently (e.g., logo, dials, color chips, grill).
    *   **Button States in DIM Mode (Phases P0-P9 of startup):**
        *   `is-unlit`: Default state for most buttons after P0. Extremely faint, almost invisible.
        *   `is-dimly-lit`: Applied via flicker profiles. Buttons in this state are achromatic (grayscale) and faintly lit.
        *   `.is-energized` (with `_theme-dim.css` overrides): Used for MAIN PWR and AUX buttons. These buttons adopt a "dark theme energized" appearance even while the rest of the UI is dim. They flicker *from* `is-dimly-lit` *to this state*.

4.  **Transition from DIM Mode & Energizing (Startup Phase P12):**
    *   A 1-second visual transition for key global elements is orchestrated by `startupSequenceManager.js` and CSS.
        *   During Phase P12, JavaScript (`startupPhase12.js`) adds the `.animate-on-dim-exit` class to elements defined in `config.selectorsForDimExitAnimation`.
        *   The `body.is-transitioning-from-dim` class is added to `<body>`.
        *   A CSS rule in `_dim-to-theme-transition.css` (targeting `body.is-transitioning-from-dim .animate-on-dim-exit`) applies the 1-second transition to a specific list of properties (e.g., `background-color`, `border-color`, `opacity`, `fill`, `stroke`, `filter`, `text-shadow`).
        *   `actionHandler.js` is instructed to call `appState.setTheme('dark')`, which removes `body.theme-dim` and adds `body.theme-dark`. The underlying CSS variables then smoothly animate to their `_theme-dark.css` values.
        *   Cleanup of these classes is handled by an FSM action (`performThemeTransitionCleanup`) upon entry to the `COMPLETE` state of the startup machine.
    *   **Button Energizing Flicker (SCAN, HUE ASSN, FIT EVAL):**
        *   Concurrently, in Phase P9, `buttonManager.setButtonState()` orchestrates flicker animations for buttons that were in the `is-dimly-lit` state.
        *   These buttons flicker from their `is-dimly-lit` appearance directly *to* their final `is-energized` state, as defined by `_theme-dark.css`.
        *   MAIN PWR and AUX buttons, already `.is-energized`, visually adapt due to the global theme change without needing to re-flicker.

## Specific Component Guidelines

### 1. LCD Displays (Mood, Intensity, Terminal)
*   **DIM Mode (Phases P0-P6):**
    *   Terminal LCD (`.actual-lcd-screen-element`) is initially styled with `.lcd--unlit` (very low opacity, grayscale). Its content area is empty.
    *   Dial LCDs (A & B) are styled with `.lcd--unlit`. Their content (V2 Displays) is hidden.
*   **DIM Mode (Phases P7-P11):**
    *   In P7, the Dial LCD screens flicker to `.lcd--dimly-lit`, and their V2 Display content becomes visible.
    *   In `_theme-dim.css`, all `dimly-lit` and `unlit` LCD states are achromatic (grayscale), with text lightness defined in `_theme-dim.css`. The V2 Displays use `--mood-matrix-value-text-l` and `--mood-matrix-value-base-chroma: 0` from `_theme-dim.css` to appear grayscale.
    *   The phosphor mask (`.lcd-container::before`) and CRT overlay (`.lcd-container::after`) are visible but attenuated by `calc(... * var(--startup-opacity-factor))`.
*   **Theme Transition (Phase P12):**
    *   All LCDs are explicitly set to an 'active' state (i.e., the `.lcd--dimly-lit` class is removed) by a `call` function in `startupPhase12.js`.
    *   This cleanup is critical. It allows their `background-image` and `color` properties to transition smoothly to the `_theme-dark.css` values as the underlying CSS variables change.
    *   The phosphor mask and CRT overlay transition to their full theme opacities.

### 2. Dials
*   **DIM Mode:** Dials are unlit until Phase 7. Their visibility is controlled by the global `--startup-opacity-factor-boosted` variable. They are rendered using grayscale variables from `_theme-dim.css` (attenuated by startup factors). Their visual rotation is set to 0.
*   **Theme Transition (Phase P12):** Dials are redrawn in their full-color state as defined by `_theme-dark.css` variables. The `DialController`'s direct subscription to the `themeChanged` event in `appState` ensures this redraw happens reliably. Their hue and rotation are set to their default interactive values.

### 3. Buttons (`button-unit` System)
*   **Color Source:**
    *   In DIM mode (Phases P0-P9), button appearance is defined by `is-unlit`, `is-dimly-lit`, or special `.is-energized` styles in `_theme-dim.css`, all attenuated by startup factors.
    *   In Full Theme (P10+), `is-energized` buttons use themed variables from `_theme-dark.css` or `_theme-light.css`.
*   **Text Color:**
    *   Button text is explicitly black or very dark in `_theme-dim.css` for `is-unlit` and `is-dimly-lit` states.
    *   For `.is-energized` buttons in `_theme-dim.css` (like MAIN PWR, AUX), text color matches the dark theme energized style for consistency.
*   **Transition from DIM (Phase P9):**
    *   SCAN, HUE ASSN, and FIT EVAL buttons flicker from `is-dimly-lit` to their final `.is-energized` states. This animation runs concurrently with the global 1s CSS transition.
*   **High-Performance Glow Mechanism (IMPORTANT):**
    *   The glow effect on buttons is implemented differently based on their state to ensure performance.
    *   **Selected Buttons (`.is-selected.is-resonating`):** The "breathing" glow is achieved using a `::after` pseudo-element. Its `transform: scale()` and `opacity` are animated by JavaScript via CSS variables. A `transition` property on this pseudo-element is critical for the animation to be visible. The main `.button-unit` element has its `box-shadow` set to `none`.
    *   **Unselected Energized Buttons (`.is-energized:not(.is-selected)`):** These buttons use a standard, static `box-shadow` for their glow, as they do not have a continuous animation.
    *   **Theming Implication:** To theme the selected button glow, you must target the `background-color` and `filter: blur()` of the `.button-unit::after` pseudo-element. To theme the unselected glow, you target the `box-shadow` property on the `.button-unit` itself.
*   **Ambient Animations:** Buttons dynamically receive the `is-resonating` class (for selected, energized buttons) or `css-idle-drifting` class (for unselected, energized buttons) from `AmbientAnimationManager.js` when the app status is `interactive`. These classes drive ambient light effects via CSS variables and keyframes.

### 4. Lens Display & Glows
*   **Bezel:** The lens bezel rings (`#lens-container::before/::after`) have their L-values attenuated by `--startup-L-reduction-factor` during startup. Their base opacity is set by `--lens-bezel-opacity` in `_theme-dim.css`. They transition to their full metallic conic gradient in P12.
*   **Glow System (`outer-glow`, `super-glow`):**
    *   This is a complex system driven by the `--lens-power` CSS variable (updated by JS). The `lensManager.js` updates this variable based on Dial B's hue.
    *   **DIM Mode Overrides:** `_theme-dim.css` significantly alters the glow appearance. It uses variables like `--lens-outer-glow-dim-scale-multiplier` and `--base-outer-glow-blur` to make the glows larger, more diffuse, and more prominent during the dim state, creating a signature "standby" effect.
    *   **Full Theme:** In `_theme-dark.css` or `_theme-light.css`, these overrides are removed, and the glows become tighter and more responsive to the raw `--lens-power` value.

### 5. Terminal Text Glow
*   The terminal has a themeable text glow effect. The base color (`--terminal-text-glow-color-base`) and bloom size (`--terminal-text-bloom-size`) are defined in `_variables-theme-contract.css`.
*   Each theme (`_theme-dim.css`, `_theme-dark.css`, `_theme-light.css`) can adjust the glow's final appearance by overriding two scaling factors:
    *   `--theme-terminal-glow-opacity-factor`
    *   `--theme-terminal-glow-size-factor`
*   This allows `_theme-dim.css` to have a bright, full-sized glow while `_theme-light.css` can have a more subtle, smaller glow, without duplicating the `text-shadow` rule.

### 6. Chromatic Aberration (CA) Effect
*   The chromatic aberration effect is applied to various text and display elements across the UI, including terminal text, scan sequence elements, and V2 display values/blocks.
*   It is implemented using multiple `text-shadow` or `box-shadow` layers.
*   The effect's intensity is controlled by the `--_ca-current-offset` CSS variable, which is animated by `DisruptionManager.js` to create a subtle, randomized glitch.
*   The color components of the CA effect (red and blue) are defined by themeable variables (`--terminal-bloom-aberration-color-1`, `--terminal-bloom-aberration-color-2`, `--lcd-chroma-red-opacity`, `--lcd-chroma-blue-opacity`) in `_variables-theme-contract.css`, allowing themes to adjust its appearance.
*   **Example Rule:**
    ```css
    .terminal-line, .scan-main-title, .display-container__row--name {
        text-shadow:
            var(--_ca-current-offset, 0px) 0 0 oklch(from var(--terminal-bloom-aberration-color-1) l c h / var(--lcd-chroma-red-opacity)),
            calc(-1 * var(--_ca-current-offset, 0px)) 0 0 oklch(from var(--terminal-bloom-aberration-color-2) l c h / var(--lcd-chroma-blue-opacity));
    }
    ```