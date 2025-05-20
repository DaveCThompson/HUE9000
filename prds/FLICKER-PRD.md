# HUE 9000: Enhanced Visual Feedback & Diagnostics - PRD & Architectural Spec

**Version:** 1.1 (Updated post-initial implementation and GSAP fixes)
**Date:** (Current Date)
**Project Lead:** (Your Name/Handle)

**1. Introduction & Goals**

This document outlines the requirements and architectural approach for enhancing the visual feedback of the HUE 9000 interface, focusing on:
*   More dramatic and sophisticated "flicker on" effects with integrated glow/bloom for various UI elements (Terminal, Buttons, LCDs), managed via a centralized utility and configurable profiles.
*   An enhanced, multi-layered lens glow, with distinct behavior in "dim" mode.
*   A refined visual style for button "pressed" states.
*   Improved console logging for easier debugging and state tracing.

The primary goals are to increase visual richness, provide more satisfying interactive feedback, improve developer insight into the application's state, and ensure a maintainable and configurable animation system.

**2. Detailed Requirements & Enhancements**

**2.1. Enhanced Flicker & Glow Effects (Managed by `animationUtils.createAdvancedFlicker`)**

*   **2.1.1. General Flicker Principles (Implemented via `ADVANCED_FLICKER_PROFILES` in `config.js`)**
    *   **Animation:** Flickers involve multiple on/off cycles.
    *   **Timing:** The period (duration of one on/off cycle) can vary, typically starting longer and becoming shorter towards the end of the animation.
    *   **Intensity (Amplitude):** The "on" intensity/opacity of the base element (e.g., button lights, LCD background) typically starts lower and increases towards the end of the animation, before settling to a final state.
    *   **Glow Integration:** A configurable glow/bloom effect is integrated, varying with the flicker's amplitude and having a defined initial, peak, and final (steady-state) presence.
    *   **Configuration:** Specific parameters for `numCycles`, `periodStart/End`, `onDurationRatio`, `amplitudeStart/End`, and detailed `glow` properties (opacity, size, color variables, scaling behavior) are defined in `config.js` within `ADVANCED_FLICKER_PROFILES`.

*   **2.1.2. Terminal Text Bloom (Startup Phase P0)**
    *   **Target:** The "INITIALIZING..." text line element in the main terminal.
    *   **Effect:** During its flicker-on animation in P0, triggered by `terminalManager.playInitialTextFlicker`.
    *   **Profile:** `terminalP0Flicker` (from `config.js`).
    *   **Glow Implementation:** Uses `text-shadow` controlled by CSS variables (e.g., `--terminal-text-glow-color`, `--terminal-text-glow-opacity`, `--terminal-text-bloom-size`) animated by `createAdvancedFlicker`.
    *   **Animation:** Glow opacity and bloom size animate with the flicker intensity.

*   **2.1.3. Button Glow (Startup Phases P2 MAIN PWR, P5 AUX LIGHT)**
    *   **Target:** MAIN PWR OFF/ON buttons (P2), AUX LIGHT LOW/HIGH buttons (P5).
    *   **Effect:** During their flicker-on animation to the `.is-energized` state (with `theme-dim` styling), triggered by `buttonManager.playFlickerToState` via `startupSequenceManager`.
    *   **Profile:** `buttonEnergizeP2P5` (from `config.js`).
    *   **Glow Source:** Glow CSS variables are applied to the main button element (`.button-unit`) to affect its `box-shadow`. Opacity/intensity of indicator lights (`.light`) are animated directly.
    *   **Differentiation (Selected vs. Unselected):** The `buttonEnergizeP2P5` profile in `config.js` and the `createAdvancedFlicker` utility use an `isButtonSelected` parameter (passed by the caller) to potentially select different final glow sizes/opacities (e.g., by setting `--btn-glow-size` to either `--btn-selected-glow-size` or `--btn-unselected-glow-size` within the animation or as part of the final state).
        *   **P2 MAIN PWR "ON" (selected):** Glow should be significantly more prominent.
        *   **P5 AUX LIGHT "LOW" (selected):** Glow should be significantly more prominent.
    *   **Flicker Cycles:** Defined by the `numCycles` in the `buttonEnergizeP2P5` profile.
    *   **Steady-State Glow:** The final state of the flicker (defined by `amplitudeEnd` and `glow.finalOpacity/finalSize` in the profile) determines the subtle steady-state glow. CSS classes (`.is-energized`, `.is-selected`) will define the primary non-animated steady-state appearance.

*   **2.1.4. Lens Glow Enhancement**
    *   **Target:** The central lens display (`#outer-glow` and new `#lens-super-glow`).
    *   **Existing Glow Layer (`#outer-glow`):**
        *   Increase its general strength/intensity by approximately 33% (achieved by adjusting its CSS, e.g., opacity or gradient stops).
    *   **New Additional Glow Layer (`#lens-super-glow`):**
        *   **Element:** A dedicated `div#lens-super-glow` added to `index.html`.
        *   **Size:** Approximately 4x larger in diameter than the current `#outer-glow`.
        *   **Intensity:** Approximately 4x stronger (opacity/brightness) than the *original* `#outer-glow`.
        *   **Falloff:** Gradual, soft falloff (e.g., using `radial-gradient` or `filter: blur()`).
        *   **Color:** Same hue as the primary lens color (derived from Dial A via `--dynamic-lens-super-glow-hue` CSS variable). Low chroma.
        *   **Control:** Intensity (opacity, size) proportional to `--lens-power` (JS in `lensManager.js` updates CSS variables like `--calc-lens-super-glow-opacity` and `--calc-lens-super-glow-size`).
    *   **Dim Mode Lens Glow (`body.theme-dim` active):**
        *   Both lens glow layers should be significantly larger and more diffuse. This is achieved by CSS rules scoped to `body.theme-dim` that modify the size/opacity CSS variables or apply multipliers (e.g., `transform: scale(var(--lens-glow-dim-scale-multiplier))`).
        *   `lensManager.js` will ensure these effects are updated correctly on theme changes.

*   **2.1.5. P4 Flicker Transitions (LCDs & Buttons)**
    *   **Target:**
        *   LCDs: Dial A/B LCDs (`.hue-lcd-display`), Main Terminal screen (`.actual-lcd-screen-element`).
        *   Buttons: HUE ASSN radio buttons, BTN 1-4, AUX LIGHT LOW/HIGH.
    *   **Effect:** When these elements transition to their "dimly-lit" state in P4. This replaces the previous smooth fade.
    *   **Implementation:**
        *   **LCDs:** `uiUpdater.setLcdState` (when called with `useP4Flicker: true`) or `terminalManager.playScreenFlickerToDimlyLit` will use `createAdvancedFlicker` with the `lcdP4Flicker` profile.
        *   **Buttons:** `buttonManager.playFlickerToState` will be called by `startupSequenceManager` with the `buttonP4DimlyLitFlicker` profile.
    *   **Glow/Bloom:** Defined by the respective profiles in `config.js`.
    *   **Flicker Style:** Adheres to general flicker principles via profile configuration.

*   **2.1.6. P6 Button Energizing Flicker (SCAN/HUE ASSN/FIT EVAL)**
    *   **Target:** Buttons previously set to `is-dimly-lit` in P4 (SCAN, HUE ASSN, FIT EVAL groups).
    *   **Effect:** Flicker from `is-dimly-lit` to their final `is-energized` (selected or unselected) state during P6.
    *   **Profile:** `buttonP6EnergizeFlicker` (from `config.js`).
    *   **Implementation:** `buttonManager.flickerDimlyLitToEnergizedStartup` calls `buttonManager.playFlickerToState` for each relevant button, using this profile.

**2.2. Modified Button Pressed State**

*   **Target Buttons:** All interactive buttons (HUE ASSIGNMENT, BTN 1-4, AUX LIGHT, MAIN PWR).
*   **Visual Style (`.is-pressing` state):**
    *   The style should be a visual intermediate between their current `.is-energized` (unselected) state and their `.is-energized.is-selected` state (or a hypothetical selected state for action buttons).
    *   **Implementation:** Achieved via CSS. New CSS custom variables (e.g., `--btn-pressing-bg-l`, `--btn-pressing-light-a`, `--btn-pressing-glow-size`) will be defined in `_variables-theme-contract.css`. Theme files will provide values for these, calculated to be midpoints. The `.button-unit.is-pressing` CSS rules will use these variables.
    *   No significant JS changes are required in `Button.js` for this, beyond applying/removing the `.is-pressing` class.

**2.3. Enhanced Console Logging**

*   **Goal:** Provide detailed, structured console logs.
*   **Implementation:**
    *   Adopt a consistent logging format: `[Manager/Module FunctionName | Context] Target: X, Requested: Y, Actual: Z`.
    *   Focus on logging state transitions, function entry/exit for key operations, and values being set/read.
    *   Implemented directly using `console.log`, `console.warn`, `console.error`. A formal logging utility can be added later if verbosity becomes an issue.
    *   `appState.js` `emit` function includes payload summaries for complex objects to reduce console clutter by default, while still logging the full payload if needed.

**3. Architectural Approach & Implementation Details**

**3.1. Glow System Architecture**

*   **3.1.1. CSS Variables for Glow:**
    *   Extensive use of CSS custom properties for glow color, size, opacity, spread, etc., defined in `_variables-theme-contract.css` and overridden by themes.
    *   Examples: `--btn-glow-color`, `--btn-glow-size`, `--btn-glow-opacity`, `--btn-selected-glow-size`, `--terminal-text-glow-color`, `--terminal-text-bloom-size`, `--lcd-glow-color`, `--dynamic-lens-super-glow-hue`, `--calc-lens-super-glow-opacity`.
*   **3.1.2. Glow Implementation (Specifics):**
    *   **Lens Glow:** Managed by `lensManager.js`, updating CSS variables for `#outer-glow` and `#lens-super-glow`. Dim mode variations controlled by CSS rules using specific dim-mode variables or multipliers.
    *   **Button Glow:** `box-shadow` on button frame, animated opacity/shadow on indicator lights. Managed by `createAdvancedFlicker` (called via `Button.js`) animating CSS variables or directly setting inline styles during flicker. Steady-state glow via CSS classes.
    *   **Terminal Text Glow (P0):** `text-shadow` controlled by CSS variables, animated by `createAdvancedFlicker` (called via `terminalManager.js`).
    *   **LCD Glow (P4):** `box-shadow` on LCD elements, animated by `createAdvancedFlicker` (called via `uiUpdater.js` or `terminalManager.js`).

**3.2. Flicker System Enhancements**

*   **3.2.1. Centralized Flicker Utility (`animationUtils.createAdvancedFlicker`):**
    *   This function takes a target element, a profile name (from `config.js`) or a parameter object, and options.
    *   It programmatically builds a GSAP timeline based on the profile's `numCycles`, `periodStart/End`, `onDurationRatio`, `amplitudeStart/End`, and `glow` parameters.
    *   It intelligently targets opacity/autoAlpha (e.g., on button lights if `targetProperty` indicates) and CSS variables for glow effects on the main element.
*   **3.2.2. Configuration (`config.js` - `ADVANCED_FLICKER_PROFILES`):**
    *   This object holds detailed parameters for each named flicker effect (e.g., `terminalP0Flicker`, `buttonEnergizeP2P5`, `lcdP4Flicker`, `buttonP4DimlyLitFlicker`, `buttonP6EnergizeFlicker`).
    *   Parameters include base element animation (cycles, period, amplitude) and glow animation (initial/peak/final opacity & size, color variables, scaling).
*   **3.2.3. Invocation:**
    *   `Button.js` (`playFlickerToState`): Calls `createAdvancedFlicker` with appropriate profile and options.
    *   `terminalManager.js` (`playInitialTextFlicker`, `playScreenFlickerToDimlyLit`): Calls `createAdvancedFlicker`.
    *   `uiUpdater.js` (`setLcdState` with `useP4Flicker: true`): Calls `createAdvancedFlicker`.

**3.3. Button Pressed State Implementation (`.is-pressing`)**

*   **CSS Driven:** Primarily handled by CSS rules for `.button-unit.is-pressing` in `_button-unit.css`, using the new "half-way" CSS variables.
*   JS in `Button.js` (`setPressedVisuals`) toggles the class.

**3.4. Logging System**

*   Implemented via direct `console.log/warn/error` calls with a structured format.
*   `appState.js` uses payload summaries for its event emissions.

**3.5. GSAP Setup and Usage**
*   **NPM Installation:** GSAP is installed via npm.
*   **Central Import & Registration:** `gsap` and `TextPlugin` are imported and registered in `main.js`.
*   **Dependency Injection:** The configured `gsap` instance from `main.js` is passed to managers and component constructors that require direct GSAP manipulation.
*   **Utility Import:** Utility modules like `animationUtils.js` import `gsap` directly.

**4. Open Questions & Considerations (Resolved/Addressed)**

*   **Performance:** Addressed by using efficient GSAP animations, `autoAlpha`, and careful targeting. Continued monitoring is good practice.
*   **Glow Layering (`z-index`):** `#lens-super-glow` is positioned appropriately in `index.html`.
*   **"Half-way" Pressed State Calculation:** Implemented via CSS variables set by themes.
*   **Log Utility Adoption:** Current direct logging is functional. A utility remains an option for future verbosity control.

**5. Out of Scope**

*   Major changes to the core logic of button groups or dial interactions beyond visual feedback.
*   Fundamental refactoring of the existing theming system beyond adding new variables.
*   New interactive functionalities not directly related to these visual enhancements.