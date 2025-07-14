```markdown
# HUE 9000 CSS Module Reference

This document provides a comprehensive overview of each CSS module in the HUE 9000 project, reflecting the current architecture.

## Core / Hub

### `main.css`
The central CSS entry point.
*   **Core Responsibilities:**
    *   Acts as the import hub, pulling in all other CSS files in a specific, intentional order.
    *   **Defines the CSS `@layer` order**: `base`, `components`, `themes`, `layout`, `utilities`. This revised order is crucial for ensuring layout and responsive styles correctly override component defaults.
    *   Uses the `@import url(...) layer(layer-name);` syntax to correctly assign imported stylesheets to their respective layers.
    *   Imports Google Fonts (Material Symbols Outlined) within the `base` layer.

## 1-base/ (Foundational Styles)

### `_base.css`
Contains the most fundamental, global styles for the document structure.
*   **Core Responsibilities:**
    *   Defines global `html`, `body`, and `*` (universal box-sizing) styles.
    *   Sets the root font size (`16px`) for `rem` unit calculations.
    *   Includes the dynamic `oklch()` body background gradient (composed of `linear-gradient` and a `noise.svg` texture) and global transitions for `color`, `background-color`, and `background-image` that apply to the entire page.
    *   Manages the `body.pre-boot` state to initially hide the application content until the preloader completes.
    *   Sets `touch-action: none` on the body to prevent unwanted mobile browser behaviors like pull-to-refresh.

### `_variables-structural.css`
Defines non-themeable, structural constants.
*   **Core Responsibilities:**
    *   Includes sizing (`--height-lower-section`, `--bezel-thickness`), spacing (`--space-xxs` to `--space-4xl`), timing (`--transition-duration-fast`, `--button-light-transition-duration`), and complex, non-aesthetic calculations (e.g., lens glow math, bezel angles). These are the immutable structural pillars of the UI.
    *   Defines `z-index` values for proper layering of UI elements (e.g., `--z-index-lens-super-glow`, `--z-index-info-panel-overlay`).
    *   Introduces `--startup-L-reduction-factor` and `--startup-opacity-factor` for global dimming/visibility during the startup sequence, controlled by JavaScript.
    *   Defines core structural variables for LCD effects (`--lcd-sweep-speed`, `--lcd-scanline-thickness`, `--lcd-jitter-intensity-px`, `--lcd-chroma-aberration-offset-px`).
    *   **All pixel values in this file have been converted to `rem`** (except for explicit `1px` lines) to support responsive scaling.

### `_variables-theme-contract.css`
The "API" for all themes.
*   **Core Responsibilities:**
    *   Defines the name of every themeable CSS variable (e.g., `--body-bg-top-l`, `--btn-energized-selected-bg-l`, `--lcd-active-text-l`).
    *   Provides default (fallback) values for each variable, which collectively constitute the **Dark Theme**. All other themes work by overriding a subset of these variables.
    *   Includes **dynamic color input variables** (e.g., `--dynamic-env-hue`, `--dynamic-lcd-chroma`), which are controlled by JavaScript based on user selections or app state, and are then consumed by other theme variables.
    *   Defines specific themeable variables for new components like V2 Displays (`--mood-matrix-value-text-l`), mobile UI (`--mobile-control-button-icon-color`), and terminal message colors (`--terminal-text-color-error-l`).
    *   Includes themeable variables for ambient animations (e.g., `--harmonic-resonance-glow-opacity`) and LCD effects (e.g., `--lcd-sweep-opacity`, `--lcd-chroma-red-opacity`).
    *   **All pixel values in this file have been converted to `rem`** (except for explicit `1px` lines) to support responsive scaling.

### `_layout.css`
Governs the high-level structure and layout of the main application panels.
*   **Core Responsibilities:**
    *   Uses Flexbox and Grid to position the primary UI containers (`.app-wrapper`, `.main-content-area`, `.panel-bezel`, `.panel-section`).
    *   Manages the horizontal shift and scale of the `.app-wrapper` when the side panel is expanded on desktop.
    *   Includes critical `body.pre-boot` and `body.is-starting-up` styles to prevent a Flash of Unstyled Content (FOUC) for LCDs and other elements during the initial page load and startup sequence.
    *   Defines the scrolling behavior for the terminal output.
    *   **All pixel values in this file have been converted to `rem`** to support responsive scaling.

### `_typography.css`
Sets the base font family and defines shared text styles.
*   **Core Responsibilities:**
    *   Sets `font-family` for the `body` (prioritizing monospace).
    *   Defines styles for shared labels like `.control-group-label` and `.block-label-bottom`.
    *   These styles consume theme variables for color and are attenuated during startup by `--startup-L-reduction-factor` (which reduces lightness as startup progresses).
    *   **All pixel values in this file have been converted to `rem`** to support responsive scaling.

### `_dim-to-theme-transition.css`
Manages the synchronized visual transition from DIM mode to a full theme.
*   **Core Responsibilities:**
    *   Contains a single, highly specific CSS rule targeting elements with `body.is-transitioning-from-dim.animate-on-dim-exit` or `body.is-transitioning-from-dim .animate-on-dim-exit`.
    *   This rule is activated by JavaScript during startup phase P12 to apply a smooth, 1-second transition (`--theme-transition-duration`) to specific CSS properties (e.g., `opacity`, `background-color`, `border-color`, `box-shadow`, `fill`, `stroke`, `filter`).
    *   Ensures that elements like the lens bezel also transition smoothly.
    *   **All pixel values in this file have been converted to `rem`** to support responsive scaling.

### `_utilities.css`
Provides simple, reusable helper classes.
*   **Core Responsibilities:**
    *   Defines common patterns like `.visually-hidden` (for accessibility), cursor styles (`.cursor-pointer`, `.cursor-grab`), and display helpers (`.display-flex`, `.opacity-0`).
    *   **All pixel values in this file have been converted to `rem`** (except for explicit `1px` lines) to support responsive scaling.

### `_mobile.css`
Contains responsive overrides for mobile devices.
*   **Core Responsibilities:**
    *   Uses a CSS Media Query (`@media (max-width: 48rem)`) to apply mobile-specific styles.
    *   Hides desktop-only UI elements by default and selectively re-enables them within the media query to prevent FOUC on "Request Desktop Site" views.
    *   Completely re-orders the main content panels into a single-column layout using CSS Grid (`grid-template-areas`) for portrait orientation.
    *   Restyles the info panel and terminal drawer to be full-screen overlays that slide in/out.
    *   Applies a CSS `perspective` to the `app-wrapper` for 3D transforms during mobile terminal transitions.
    *   Includes a landscape orientation media query for scaling down the UI on narrow, wide screens.
    *   **All pixel values in this file have been converted to `rem`** to support responsive scaling.

## 2-components/ (Individual Component Styles)

### `_preloader.css`
Styles the initial loading screen.
*   **Core Responsibilities:**
    *   Defines the layout and appearance of the preloader interface, which mimics the main UI's bezel/panel design.
    *   Uses a performant `@property --preloader-dynamic-hue` and `@keyframes preloader-hue-rotate` to create the continuous hue-cycling effect on the background and progress elements.
    *   Defines the appearance of data streams, progress bars, and the interactive "Engage" button.
    *   Includes specific hover and active states for the preloader button, including a high-performance `::after` pseudo-element for the glow.
    *   **All pixel values in this file have been converted to `rem`** (except for explicit `1px` lines) to support responsive scaling.

### `_side-panels.css`
Styles the slide-out info panel.
*   **Core Responsibilities:**
    *   Defines the appearance of the compact vertical bar (`.compact-view-wrapper`) for desktop and the expanded info panel (`.side-panel`).
    *   Manages the `transform` applied to `.app-wrapper` when a panel is open on desktop, and adapts for mobile to make the panel a full-screen overlay sliding from the right.
    *   Styles the panel header, close button, tab navigation (`.panel-tabs`, `.panel-tab-button`), and scrollable content area (`.panel-content`).
    *   Includes styles for internal images (`.panel-image`) with lazy-load animation and hover effects.
    *   Defines styles for generic settings toggles.
    *   **All pixel values in this file have been converted to `rem`** (except for explicit `1px` lines) to support responsive scaling.

### `_panel-bezel.css`
Styles the main "chrome" of the UI panels.
*   **Core Responsibilities:**
    *   Defines the metallic `linear-gradient` background, inner/outer `box-shadow`s, and the recessed `.panel-section` areas.
    *   Uses an `::after` pseudo-element with an SVG `filter` to create a subtle brushed metal texture overlay.
    *   Its appearance (lightness, opacity) is dynamically attenuated during startup by `--startup-L-reduction-factor` and `--startup-opacity-factor` controlled by JavaScript.
    *   Defines generic `.control-block` and `.joined-block-pair` styles for content within panel sections.
    *   **All pixel values in this file have been converted to `rem`** to support responsive scaling.

### `_button-unit.css`
The comprehensive stylesheet for all interactive buttons.
*   **Core Responsibilities:**
    *   Defines all visual states: `is-unlit`, `is-dimly-lit`, `is-energized` (unselected), `is-selected`, `is-pressing`, `is-permanently-disabled`, and `is-flickering`.
    *   Implements a high-performance layering system for background and glow: the `::before` pseudo-element handles the `background-color`, while the `::after` pseudo-element is used for the animated `transform`/`opacity` glow on selected buttons. This is a critical performance optimization.
    *   Manages sizing (`--s`, `--m`, `--l`), hover effects (brightness, scale, glow), and press effects (transform, inner shadow).
    *   Includes temporary tint classes (`is-flashing-tint-*`) for resistive shutdown animations.
    *   Defines the `css-idle-drifting` class and its `@keyframes idleLightDrift` for ambient light variations on unselected buttons.
    *   Manages the `is-resonating` class for selected buttons, which consumes global ambient animation variables.
    *   Includes lockout styles for scan mode.
    *   **All pixel values in this file have been converted to `rem`** (except for explicit `1px` lines) to support responsive scaling.

### `_dial.css`
Styles the housing for the SVG dials.
*   **Core Responsibilities:**
    *   Styles the `.dial-canvas-container` (the outer housing) with its background, border-radius, and shadows.
    *   Defines base classes for the SVG elements (`.dial-svg`, `.dial-face`, `.dial-ridge`, `dial-shading-*-color`) that are dynamically manipulated by `DialController.js` to create the 3D rotation and lighting effects.
    *   **All pixel values in this file have been converted to `rem`** (except for explicit `1px` lines) to support responsive scaling.

### `_lcd.css`
The authoritative stylesheet for all LCD screens (terminal, mood, intensity).
*   **Core Responsibilities:**
    *   Defines the outer container (`.lcd-container`), which handles background gradients, borders, and shadows based on the current LCD state (`lcd--unlit`, `lcd--dimly-lit`, active).
    *   Includes a new phosphor mask effect (`::before` pseudo-element) for all LCDs.
    *   Defines the dynamic sweep line animation (`#sweep-overlay .sweep-line`) and its pause state when off-screen.
    *   Applies a CRT overlay texture (`::after` pseudo-element) with `mix-blend-mode`.
    *   Styles the `.lcd-content-wrapper` (the inner, padded area for text/displays) and includes the `is-disrupting` class for the jitter effect.
    *   **All pixel values in this file have been converted to `rem`** (except for explicit `1px` lines) to support responsive scaling.

### `_logo.css`
Styles for the HUE 9000 SVG logo.
*   **Core Responsibilities:**
    *   Defines how the logo's different SVG path elements are filled (`.logo-dynamic-bg`, `.logo-panel-bg-rect`, `.logo-fixed-white-text`) based on theme and dynamic color variables (`--dynamic-logo-hue`, `--panel-section-bg-l`).
    *   Manages the overall `opacity` of the logo, which can be attenuated during startup.
    *   **All pixel values in this file have been converted to `rem`** to support responsive scaling.

### `_lens-container.css`
Styles the bezel of the central lens.
*   **Core Responsibilities:**
    *   Uses two pseudo-elements (`::before`, `::after`) with complex `conic-gradient` backgrounds to create a metallic, 3D effect for the outer and inner bezel rings.
    *   Their lightness and hue are attenuated during startup by `--startup-L-reduction-factor`.
    *   Includes a `filter: drop-shadow` for the container.
    *   **All pixel values in this file have been converted to `rem`** (except for explicit `1px` lines) to support responsive scaling.

### `_lens-core.css`
Styles the innermost part of the lens.
*   **Core Responsibilities:**
    *   Styles the main circular lens element (`#color-lens`) and its `specular-highlights.svg` overlay (`::after`).
    *   Its `background` is a simple `oklch()` color, while its `filter` and `opacity` are controlled by JS.
    *   **All pixel values in this file have been converted to `rem`** (except for explicit `1px` lines) to support responsive scaling.

### `_lens-outer-glow.css` & `_lens-super-glow.css`
Styles the two-part glow system emanating from the lens.
*   **Core Responsibilities:**
    *   Define the appearance (`opacity`, `filter: blur`, `background: radial-gradient`) of the outer glow (`#outer-glow`) and the super glow (`#lens-super-glow`).
    *   These glows are dynamically driven by CSS variables like `--lens-power`, `--dynamic-ui-accent-hue`, and `--dynamic-lens-super-glow-hue`, which are updated by JavaScript.
    *   Use `mix-blend-mode: screen` for additive blending.
    *   The `dim` theme provides significant overrides to these files to create a larger, more diffuse "standby" effect.
    *   **All pixel values in this file have been converted to `rem`** to support responsive scaling.

### `_color-chips.css`
Styles for the small, vertical color indicator strips in the Hue Assignment panel.
*   **Core Responsibilities:**
    *   Defines the basic appearance (`width`, `border-radius`, `border`, `box-shadow`) of the `.color-chip` elements.
    *   Applies static `background-color`s for each of the 12 predefined hues (e.g., `.color-chip-0`, `.color-chip-1`).
    *   Its `opacity` is controlled by `calc(var(--color-chip-base-opacity) * var(--startup-opacity-factor-boosted))`, allowing it to fade in during startup.
    *   **All pixel values in this file have been converted to `rem`** (except for explicit `1px` lines) to support responsive scaling.

### `_grill.css`
Styles the metallic grill texture used in placeholder sections.
*   **Core Responsibilities:**
    *   Applies a `background-image` (metal-grill.png) with `background-blend-mode` to create the textured effect.
    *   Its `opacity` is controlled by `calc(var(--grill-opacity) * var(--startup-opacity-factor-boosted))`, allowing it to fade in during startup.
    *   **All pixel values in this file have been converted to `rem`** to support responsive scaling.

### `_terminal.css`
Contains styles unique to the terminal component, building upon `_lcd.css`.
*   **Core Responsibilities:**
    *   Defines specific styles for `.terminal-line` (line height, word wrap).
    *   Includes rich text styles (`.tm-text--highlight`, `.tm-text--bold`, `.tm-text--dim`) and color-coded line styles (`.line-error`, `.line-success`).
    *   Styles the dynamic cursor (`.terminal-cursor`) and its animations (`is-blinking`, `is-solid`, `is-thinking`).
    *   Defines the unified **Chromatic Aberration (CA) effect** for all terminal text (and other dynamic displays) via `text-shadow`, driven by the `--_ca-current-offset` CSS variable animated by `DisruptionManager.js`.
    *   Customizes the scrollbar for the terminal.
    *   **All pixel values in this file have been converted to `rem`** (except for explicit `1px` lines) to support responsive scaling.

### `_dial-displays.css`
Styles for the Mood Matrix and Intensity Display components.
*   **Core Responsibilities:**
    *   Defines the layout and styling for the block/dot-based displays (`.mood-matrix__row--major-blocks`, `.fine-dot-row`, `.intensity-display__row--bars`).
    *   Critically, it **derives its colors** (`--display-color-on`, `--display-color-off-bg`, etc.) from the theme variables of its parent `.lcd-container` (e.g., `--dynamic-lcd-chroma`, `--lcd-active-text-l`), ensuring it matches the state (dimly-lit, active) and hue of the screen it's on.
    *   Applies **Chromatic Aberration (CA) effects** to display text and individual blocks/dots (`.major-block--on`, `.intensity-bar--selected`, `.fine-dot--on`), with varying intensity based on their active state.
    *   **All pixel values in this file have been converted to `rem`** (except for explicit `1px` lines) to support responsive scaling.

### `_mobile-controls-overlay.css`
Contains styles exclusively for the mobile overlay controls.
*   **Core Responsibilities:**
    *   Positions `mobile-controls-overlay` as a `fixed` element at the top of the viewport.
    *   Styles the individual circular control buttons (`.mobile-control-button`) with their background, border, and icon color.
    *   Includes a notification pulse animation (`@keyframes terminal-notification-pulse`) for the terminal toggle button when there are unread messages.
    *   Defines a pressed state transform and hover effects.
    *   Manages the `transform` and `filter` of the overlay when the mobile terminal drawer is open, syncing with the `main-content-area` transition.
    *   **All pixel values in this file have been converted to `rem`** to support responsive scaling.

### `_mobile-color-slider.css`
Contains styles exclusively for the mobile vertical color slider component.
*   **Core Responsibilities:**
    *   Styles the `mobile-slider-container` (the overall track area) with its background, border, and radius.
    *   Defines the appearance of the `mobile-slider-track` (the vertical color gradient bar) and its scaling on hover/drag.
    *   Styles the `mobile-slider-thumb` (the draggable indicator) and its inner/outer circles, which change size on interaction.
    *   **All pixel values in this file have been converted to `rem`** to support responsive scaling.

### `_mobile-terminal-drawer.css`
Contains styles exclusively for the mobile terminal drawer.
*   **Core Responsibilities:**
    *   Positions `mobile-terminal-drawer` as a `fixed` element, covering the entire screen, and animates its `transform` (vertical slide and scale) to open/close.
    *   Styles the close button (`#mobile-terminal-close-btn`) and its appearance animation.
    *   Defines the layout within the drawer, stacking the terminal LCD above action buttons.
    *   Styles the `mobile-terminal-actions-flex-container` for the bottom action buttons, including their layout and lockout state during scans.
    *   **All pixel values in this file have been converted to `rem`** to support responsive scaling.

### `_scan-sequence.css`
Styles for the V2 scan sequence and its renderers.
*   **Core Responsibilities:**
    *   Defines the overall layout and typography for the `scan-sequence-container` (main title, scan target, progress, sub-jobs).
    *   Styles the high-craft 9-dot spinner (`.dot-grid-spinner`) including its chromatic aberration.
    *   Provides styles for `renderBarFill` (e.g., `.scan-progressive-bar-segment`) and `renderTypeWindow` (e.g., `.type-window-pulse` for the background animation).
    *   Ensures all scan UI text and icons correctly inherit and display the chromatic aberration effect.
    *   **All pixel values in this file have been converted to `rem`** to support responsive scaling.

## 3-themes/ (Variable Overrides)

### `_theme-dim.css`
Defines the very dark, low-power "standby" appearance.
*   **Core Responsibilities:**
    *   Aggressively lowers the lightness (`--theme-text-primary-l`, `--body-bg-top-l`, `--panel-section-bg-l`) and opacity (`--theme-text-secondary-a`, `--btn-unlit-bg-a`, `--grill-opacity`) of most UI elements, creating a desaturated, minimal look.
    *   Provides specific overrides for button states that must appear "on" during the dim state (e.g., MAIN PWR) and disables hover/cursor effects.
    *   Significantly adjusts the lens glow system variables (`--base-outer-glow-blur`, `--lens-super-glow-size-multiplier-dim`) to create a larger, more diffuse "standby" effect.
    *   Modifies `panel-bezel` shadows and `lcd` unlit/dimly-lit states to match the dim aesthetic.
    *   **All pixel values in this file have been converted to `rem`** (except for explicit `1px` lines) to support responsive scaling.

### `_theme-dark.css`
Defines the standard "Dark" theme.
*   **Core Responsibilities:**
    *   This file is intentionally minimal. Since the values in `_variables-theme-contract.css` already define the dark theme, this file primarily contains minor adjustments and fine-tuning overrides to the contract defaults.
    *   Adjusts `body` background lightness and chroma, `panel` background lightness, and `LCD` gradient values for a richer, more saturated dark appearance compared to `dim`.
    *   **All pixel values in this file have been converted to `rem`** (except for explicit `1px` lines) to support responsive scaling.

### `_theme-light.css`
Defines a brighter, higher-intensity variant of the dark aesthetic.
*   **Core Responsibilities:**
    *   Overrides variables to increase the lightness of backgrounds (`--body-bg-top-l`), bezels (`--panel-bezel-grad-*`), buttons (`--btn-energized-selected-bg-l`), and LCDs (`--lcd-active-text-l`).
    *   Adjusts shadows and border opacities to suit the brighter context.
    *   **Note:** This is **not a traditional light mode** (white backgrounds, black text). It maintains the retro-futuristic, control-panel feel with a brighter, high-contrast look.
    *   **All pixel values in this file have been converted to `rem`** (except for explicit `1px` lines) to support responsive scaling.