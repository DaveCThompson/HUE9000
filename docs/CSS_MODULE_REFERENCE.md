# HUE 9000 CSS Module Reference

This document provides a comprehensive overview of each CSS module in the HUE 9000 project, reflecting the current architecture.

## Core / Hub

### `main.css`
The central CSS entry point.
*   **Core Responsibilities:**
    *   Acts as the import hub, pulling in all other CSS files in a specific, intentional order.
    *   **Defines the CSS `@layer` order**: `base`, `components`, `themes`, `layout`, `utilities`. This revised order is crucial for ensuring layout and responsive styles correctly override component defaults.
    *   Uses the `@import url(...) layer(layer-name);` syntax to correctly assign imported stylesheets to their respective layers.

## 1-base/ (Foundational Styles)

### `_base.css` (NEW)
Contains the most fundamental, global styles for the document structure.
*   **Core Responsibilities:**
    *   Defines global `html`, `body`, and `*` (universal box-sizing) styles.
    *   Sets the root font size (`16px`) for `rem` unit calculations.
    *   Includes the dynamic `oklch()` body background gradient and global transitions that apply to the entire page.

### `_variables-structural.css`
Defines non-themeable, structural constants.
*   **Core Responsibilities:**
    *   Includes sizing (`--height-lower-section`), spacing (`--space-md`), timing (`--transition-duration-medium`), and complex, non-aesthetic calculations (e.g., lens glow math). These are the immutable structural pillars of the UI.
    *   **All pixel values in this file have been converted to `rem`** (except for explicit `1px` lines) to support responsive scaling.

### `_variables-theme-contract.css`
The "API" for all themes.
*   **Core Responsibilities:**
    *   Defines the name of every themeable CSS variable.
    *   Provides default (fallback) values, which collectively constitute the **Dark Theme**. All other themes work by overriding a subset of these variables.
    *   **All pixel values in this file have been converted to `rem`** (except for explicit `1px` lines) to support responsive scaling.

### `_layout.css`
Governs the high-level structure and layout of the main application panels.
*   **Core Responsibilities:**
    *   Uses Flexbox and Grid to position the primary UI containers (`.app-wrapper`, `.panel-bezel`, etc.).
    *   Includes critical `body.pre-boot` styles to prevent a Flash of Unstyled Content (FOUC) for LCDs during the initial page load.
    *   **All pixel values in this file have been converted to `rem`** to support responsive scaling.

### `_typography.css`
Sets the base font family and defines shared text styles.
*   **Core Responsibilities:**
    *   Defines styles for shared labels like `.control-group-label` and `.block-label-bottom`.
    *   These styles consume theme variables for color and are attenuated during startup by `--startup-L-reduction-factor`.
    *   **All pixel values in this file have been converted to `rem`** to support responsive scaling.

### `_dim-to-theme-transition.css`
Manages the synchronized visual transition from DIM mode to a full theme.
*   **Core Responsibilities:**
    *   Contains a single, highly specific CSS rule targeting `body.is-transitioning-from-dim .animate-on-dim-exit`.
    *   This rule is activated by JavaScript during startup phase P10 to apply a smooth, 1-second transition to specific CSS properties (e.g., `background-color`, `border-color`, `opacity`).
    *   **All pixel values in this file have been converted to `rem`** to support responsive scaling.

### `_utilities.css`
Provides simple, reusable helper classes.
*   **Core Responsibilities:**
    *   Defines common patterns like `.visually-hidden`, `.cursor-pointer`, and `.display-flex`.
    *   **All pixel values in this file have been converted to `rem`** (except for explicit `1px` lines) to support responsive scaling.

### `_mobile.css`
Contains responsive overrides for mobile devices.
*   **Core Responsibilities:**
    *   Adjusts the main content area to a single-column grid layout for portrait orientation on smaller screens.
    *   Hides certain desktop-only panels.
    *   **All pixel values in this file have been converted to `rem`** to support responsive scaling.

## 2-components/ (Individual Component Styles)

### `_preloader.css`
Styles the initial loading screen.
*   **Core Responsibilities:**
    *   Defines the layout and appearance of the preloader interface, which mimics the main UI's bezel/panel design.
    *   Uses a performant `@property` animation on the `body.preloader-active` class to create the continuous hue-cycling effect.
    *   **All pixel values in this file have been converted to `rem`** (except for explicit `1px` lines) to support responsive scaling.

### `_side-panels.css`
Styles the slide-out left and right panels.
*   **Core Responsibilities:**
    *   Defines the appearance of the compact vertical bar (`.compact-view`) and the expanded panel content (`.expanded-view`).
    *   Manages the `transform` applied to `.app-wrapper` when a panel is open.
    *   **All pixel values in this file have been converted to `rem`** (except for explicit `1px` lines) to support responsive scaling.

### `_panel-bezel.css`
Styles the main "chrome" of the UI panels.
*   **Core Responsibilities:**
    *   Defines the metallic `linear-gradient` background, inner/outer shadows, and the recessed `.panel-section` areas.
    *   Its appearance is attenuated during startup by `--startup-L-reduction-factor` and `--startup-opacity-factor`.
    *   **All pixel values in this file have been converted to `rem`** to support responsive scaling.

### `_button-unit.css`
The comprehensive stylesheet for all interactive buttons.
*   **Core Responsibilities:**
    *   Defines all states (`is-unlit`, `is-energized`, `is-selected`), sizes (`--s`, `--m`, `--l`), and hover/pressed effects.
    *   Implements a high-performance layering system: the `::before` pseudo-element handles the `background-color`, while the `::after` pseudo-element is used for the animated `transform`/`opacity` glow on selected buttons. This is a critical performance optimization.
    *   **All pixel values in this file have been converted to `rem`** (except for explicit `1px` lines) to support responsive scaling.

### `_dial.css`
Styles the housing for the SVG dials.
*   **Core Responsibilities:**
    *   Styles the `.dial-canvas-container` and defines base classes for the SVG elements (`.dial-face`, `.dial-ridge`) that are manipulated by `DialController.js`.
    *   **All pixel values in this file have been converted to `rem`** (except for explicit `1px` lines) to support responsive scaling.

### `_lcd.css`
The authoritative stylesheet for all LCD screens.
*   **Core Responsibilities:**
    *   Defines the container (`.lcd-container`), the inner content wrapper, the CRT overlay effect, and the core states (`.lcd--unlit`, `.lcd--dimly-lit`, active).
    *   Defines the base `text-shadow` for the "harmonic resonance" text glow effect, which is then scaled by theme-specific factors.
    *   **All pixel values in this file have been converted to `rem`** (except for explicit `1px` lines) to support responsive scaling.

### `_logo.css`
Styles for the HUE 9000 SVG logo.
*   **Core Responsibilities:**
    *   Defines how the logo's different SVG path elements are filled based on theme and dynamic color variables (`--dynamic-logo-hue`, etc.).
    *   **All pixel values in this file have been converted to `rem`** to support responsive scaling.

### `_lens-container.css`
Styles the bezel of the central lens.
*   **Core Responsibilities:**
    *   Uses two pseudo-elements (`::before`, `::after`) with complex `conic-gradient` backgrounds to create a metallic, 3D effect.
    *   **All pixel values in this file have been converted to `rem`** (except for explicit `1px` lines) to support responsive scaling.

### `_lens-core.css`
Styles the innermost part of the lens.
*   **Core Responsibilities:**
    *   Styles the colored circle (`#color-lens`) and its `specular-highlights.svg` overlay.
    *   **All pixel values in this file have been converted to `rem`** (except for explicit `1px` lines) to support responsive scaling.

### `_lens-outer-glow.css` & `_lens-super-glow.css`
Styles the two-part glow system emanating from the lens.
*   **Core Responsibilities:**
    *   Defines the appearance of the glows, which are driven by the `--lens-power` CSS variable.
    *   The `dim` theme provides significant overrides to these files to create a larger, more diffuse "standby" effect.
    *   **All pixel values in this file have been converted to `rem`** to support responsive scaling.

### `_color-chips.css`
Styles for the small, vertical color indicator strips in the Hue Assignment panel.
*   **Core Responsibilities:**
    *   **All pixel values in this file have been converted to `rem`** (except for explicit `1px` lines) to support responsive scaling.

### `_grill.css`
Styles the metallic grill texture used in placeholder sections.
*   **Core Responsibilities:**
    *   **All pixel values in this file have been converted to `rem`** to support responsive scaling.

### `_terminal.css`
Contains styles unique to the terminal component.
*   **Core Responsibilities:**
    *   Defines the animated scanline effect and the blinking cursor. It builds upon the foundational styles from `_lcd.css`.
    *   **All pixel values in this file have been converted to `rem`** (except for explicit `1px` lines) to support responsive scaling.

### `_dial-displays.css`
Styles the Mood Matrix and Intensity Display components.
*   **Core Responsibilities:**
    *   Defines the layout for the block/dot-based displays.
    *   Critically, it **derives its colors** from the theme variables of its parent `.lcd-container`, ensuring it matches the state (dimly-lit, active) of the screen it's on.
    *   **All pixel values in this file have been converted to `rem`** (except for explicit `1px` lines) to support responsive scaling.

## 3-themes/ (Variable Overrides)

### `_theme-dim.css`
Defines the very dark, low-power "standby" appearance.
*   **Core Responsibilities:**
    *   Aggressively lowers the lightness and opacity of most UI elements.
    *   Provides special `.is-energized` styles for buttons that must appear "on" during the dim state (e.g., MAIN PWR).
    *   Provides significant overrides for the lens glow system to create a unique standby effect.
    *   **All pixel values in this file have been converted to `rem`** (except for explicit `1px` lines) to support responsive scaling.

### `_theme-dark.css`
Defines the standard "Dark" theme.
*   **Core Responsibilities:**
    *   This file is intentionally minimal. Since the values in `_variables-theme-contract.css` already define the dark theme, this file only contains minor adjustments and fine-tuning overrides.
    *   **All pixel values in this file have been converted to `rem`** (except for explicit `1px` lines) to support responsive scaling.

### `_theme-light.css`
Defines a brighter, higher-intensity variant of the dark aesthetic.
*   **Core Responsibilities:**
    *   Overrides variables to increase the lightness of backgrounds, bezels, and buttons.
    *   **Note:** This is **not a traditional light mode**. It maintains the retro-futuristic, control-panel feel.
    *   **All pixel values in this file have been converted to `rem`** (except for explicit `1px` lines) to support responsive scaling.