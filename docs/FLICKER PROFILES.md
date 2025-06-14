# HUE 9000 Flicker Profile Reference

This document details the standardized flicker animation profiles used for UI element transitions.

## I. Overview & Purpose

*   **Goal:** To provide a consistent visual language for elements transitioning between states (e.g., Unlit, Dimly Lit, Fully Lit).
*   **Mechanism:** Flicker animations are generated by `animationUtils.createAdvancedFlicker()` using profiles defined in `src/js/config.js` (`ADVANCED_FLICKER_PROFILES`).
*   **Naming Convention:** `elementTypeFlickerFrom[InitialState]To[FinalState][Variant]`
    *   Examples: `buttonFlickerToDimlyLit`, `textFlickerToDimlyLit`, `buttonFlickerFromDimlyLitToFullyLitSelectedFast`.

## II. Target Visual States (Endpoints)

These are the intended visual characteristics an element should have *after* a flicker animation targeting that state completes.

*   **Unlit:**
    *   **Visual:** Element is off or imperceptible.
    *   **Key Profile Parameters (at end of flicker):**
        *   `amplitudeEnd`: ~0.0 - 0.05 (Opacity of primary animated property)
        *   `glow.finalOpacity`: ~0.0
        *   `glow.finalSize`: ~'0px'
*   **Dimly Lit (Unselected Appearance):**
    *   **Visual:** Standby, primed, or secondary active state; noticeably dimmer than fully lit.
    *   **Key Profile Parameters (at end of flicker):**
        *   `amplitudeEnd`: ~0.8
        *   `glow.finalOpacity`: ~0.2
        *   `glow.finalSize`: ~'2px'
        *   `glow.colorVar`: Typically uses a specific "dimly-lit" glow color variable (e.g., `--btn-dimly-lit-glow-color`, `--lcd-dimly-lit-glow-color`).
*   **Fully Lit Unselected:**
    *   **Visual:** Energized, active, but not the primary focus or selection.
    *   **Key Profile Parameters (at end of flicker):**
        *   `amplitudeEnd`: ~0.95
        *   `glow.finalOpacity`: ~0.6
        *   `glow.finalSize`: ~'9px'
        *   `glow.colorVar`: Typically uses a general "energized" glow color variable (e.g., `--btn-glow-color`).
*   **Fully Lit Selected:**
    *   **Visual:** Energized, active, and representing the primary focus or selection; typically the brightest state.
    *   **Key Profile Parameters (at end of Flicker):**
        *   `amplitudeEnd`: ~1.0
        *   `glow.finalOpacity`: ~0.8
        *   `glow.finalSize`: ~'13px'
        *   `glow.colorVar`: Typically uses a general "energized" glow color variable (e.g., `--btn-glow-color`), often brighter or more prominent due to size/opacity.

## III. Flicker Profile Details

Each profile defines the dynamics of the transition (`numCycles`, `periodStart`, `periodEnd`, `onDurationRatio`, `peakOpacity`, `peakSize`, `scaleWithAmplitude`) and the starting/ending visual parameters.

**Key Starting Parameters for Smooth Transitions:**
*   `amplitudeStart`: Opacity of the primary animated property at the beginning of the flicker.
*   `glow.initialOpacity`: Glow opacity at the beginning of the flicker.
*   `glow.initialSize`: Glow size at the beginning of the flicker.

For profiles named `...From[InitialState]To...`, these starting parameters are designed to match the *final* parameters of a `...To[InitialState]` profile to ensure visual continuity.

---
### A. Text Element Profiles
   *(Primarily for terminal messages)*

*   **1. `textFlickerToDimlyLit`**
    *   **Transition:** Unlit -> Dimly Lit
    *   **`targetProperty`**: `text-shadow-opacity-and-blur`
    *   **Starting State:**
        *   `amplitudeStart`: 0.0
        *   `glow.initialOpacity`: 0.0
        *   `glow.initialSize`: '0px'
    *   **Ending State (matches "Dimly Lit" target for terminal text):**
        *   `amplitudeEnd`: 1.0
        *   `glow.finalOpacity`: 1.0
        *   `glow.finalSize`: '16px'
    *   **Glow Variables:**
        *   `glow.colorVar`: `--terminal-text-glow-color-base`
        *   `glow.animatedProperties`: `{ opacity: '--terminal-text-glow-opacity', blur: '--terminal-text-bloom-size' }`
    *   *(Other dynamic parameters like `numCycles`, `period`, `peakOpacity` are defined in `config.js`)*

---
### B. LCD Screen Element Profiles
   *(For Dial LCD backgrounds and Terminal screen background)*

*   **1. `lcdScreenFlickerToDimlyLit`**
    *   **Transition:** Unlit -> Dimly Lit
    *   **`targetProperty`**: `element-opacity-and-box-shadow`
    *   **Starting State:**
        *   `amplitudeStart`: 0.0
        *   `glow.initialOpacity`: 0.0
        *   `glow.initialSize`: '0px'
    *   **Ending State (matches "Dimly Lit" target):**
        *   `amplitudeEnd`: 0.8
        *   `glow.finalOpacity`: 0.2
        *   `glow.finalSize`: '2px'
    *   **Glow Variables:**
        *   `glow.colorVar`: `--lcd-glow-color`
        *   `glow.sizeVar`: `--lcd-glow-size`
        *   `glow.opacityVar`: `--lcd-glow-opacity`
    *   *(Other dynamic parameters defined in `config.js`)*

*   **2. `terminalScreenFlickerToDimlyLit`**
    *   **Transition:** Unlit -> Dimly Lit (for the screen background/glow only)
    *   **Purpose:** Animates the terminal screen's background glow without affecting the opacity of the text content inside it.
    *   **`targetProperty`**: `element-opacity-and-box-shadow`
    *   **Starting State:**
        *   `amplitudeStart`: 1.0 (Crucially, this keeps the container element itself opaque, preserving text visibility)
        *   `glow.initialOpacity`: 0.0
        *   `glow.initialSize`: '0px'
    *   **Ending State (matches "Dimly Lit" target):**
        *   `amplitudeEnd`: 0.8
        *   `glow.finalOpacity`: 0.2
        *   `glow.finalSize`: '2px'
    *   **Glow Variables:**
        *   `glow.colorVar`: `--lcd-glow-color`
        *   `glow.sizeVar`: `--lcd-glow-size`
        *   `glow.opacityVar`: `--lcd-glow-opacity`
    *   *(Other dynamic parameters defined in `config.js`)*

---
### C. Button Element Profiles
   *(For all interactive buttons)*

*   **1. `buttonFlickerToDimlyLit`**
    *   **Transition:** Unlit -> Dimly Lit (Unselected)
    *   **`targetProperty`**: `button-lights-and-frame`
    *   **Starting State:**
        *   `amplitudeStart`: 0.0
        *   `glow.initialOpacity`: 0.0
        *   `glow.initialSize`: '0px'
    *   **Ending State (matches "Dimly Lit" target):**
        *   `amplitudeEnd`: 0.8
        *   `glow.finalOpacity`: 0.2
        *   `glow.finalSize`: '2px'
    *   **Glow Variables:**
        *   `glow.colorVar`: `--btn-dimly-lit-glow-color`
        *   `glow.sizeVar`: `--btn-dimly-lit-glow-size`
        *   `glow.opacityVar`: `--btn-dimly-lit-glow-opacity`
    *   *(Other dynamic parameters defined in `config.js`)*

*   **2. `buttonFlickerFromDimlyLitToFullyLitUnselected`**
    *   **Transition:** Dimly Lit -> Fully Lit (Unselected)
    *   **`targetProperty`**: `button-lights-and-frame`
    *   **Starting State (matches end of `buttonFlickerToDimlyLit`):**
        *   `amplitudeStart`: 0.8
        *   `glow.initialOpacity`: 0.2
        *   `glow.initialSize`: '2px'
    *   **Ending State (matches "Fully Lit Unselected" target):**
        *   `amplitudeEnd`: 0.95
        *   `glow.finalOpacity`: 0.6
        *   `glow.finalSize`: '9px'
    *   **Glow Variables:**
        *   `glow.colorVar`: `--btn-glow-color`
        *   `glow.sizeVar`: `--btn-glow-size`
        *   `glow.opacityVar`: `--btn-glow-opacity`
    *   *(Other dynamic parameters defined in `config.js`)*

*   **3. `buttonFlickerFromDimlyLitToFullyLitSelected`**
    *   **Transition:** Dimly Lit -> Fully Lit (Selected)
    *   **`targetProperty`**: `button-lights-and-frame`
    *   **Starting State (matches end of `buttonFlickerToDimlyLit`):**
        *   `amplitudeStart`: 0.8
        *   `glow.initialOpacity`: 0.2
        *   `glow.initialSize`: '2px'
    *   **Ending State (matches "Fully Lit Selected" target):**
        *   `amplitudeEnd`: 1.0
        *   `glow.finalOpacity`: 0.8
        *   `glow.finalSize`: '13px'
    *   **Glow Variables:**
        *   `glow.colorVar`: `--btn-glow-color`
        *   `glow.sizeVar`: `--btn-glow-size`
        *   `glow.opacityVar`: `--btn-glow-opacity`
    *   *(Other dynamic parameters defined in `config.js`)*

*   **4. `buttonFlickerFromDimlyLitToFullyLitUnselectedFast`**
    *   *(Same as `buttonFlickerFromDimlyLitToFullyLitUnselected` but with faster `numCycles`/`period` values defined in `config.js`)*
    *   **Starting State:** `amplitudeStart: 0.8`, `glow.initialOpacity: 0.2`, `glow.initialSize: '2px'`
    *   **Ending State:** `amplitudeEnd: 0.95`, `glow.finalOpacity: 0.6`, `glow.finalSize: '9px'`

*   **5. `buttonFlickerFromDimlyLitToFullyLitSelectedFast`**
    *   *(Same as `buttonFlickerFromDimlyLitToFullyLitSelected` but with faster `numCycles`/`period` values defined in `config.js`)*
    *   **Starting State:** `amplitudeStart: 0.8`, `glow.initialOpacity: 0.2`, `glow.initialSize: '2px'`
    *   **Ending State:** `amplitudeEnd: 1.0`, `glow.finalOpacity: 0.8`, `glow.finalSize: '13px'`

*   **6. `buttonFlickerFromUnlitToFullyLitUnselected`**
    *   **Transition:** Unlit -> Fully Lit (Unselected)
    *   **`targetProperty`**: `button-lights-and-frame`
    *   **Starting State:**
        *   `amplitudeStart`: 0.0
        *   `glow.initialOpacity`: 0.0
        *   `glow.initialSize`: '0px'
    *   **Ending State (matches "Fully Lit Unselected" target):**
        *   `amplitudeEnd`: 0.95
        *   `glow.finalOpacity`: 0.6
        *   `glow.finalSize`: '9px'
    *   *(Other dynamic parameters defined in `config.js`)*

*   **7. `buttonFlickerFromUnlitToFullyLitSelected`**
    *   **Transition:** Unlit -> Fully Lit (Selected)
    *   **`targetProperty`**: `button-lights-and-frame`
    *   **Starting State:**
        *   `amplitudeStart`: 0.0
        *   `glow.initialOpacity`: 0.0
        *   `glow.initialSize`: '0px'
    *   **Ending State (matches "Fully Lit Selected" target):**
        *   `amplitudeEnd`: 1.0
        *   `glow.finalOpacity`: 0.8
        *   `glow.finalSize`: '13px'
    *   *(Other dynamic parameters defined in `config.js`)*

---
### D. Resistive Shutdown Button Profiles
   *(For the Main Power OFF button during the shutdown sequence)*

*   **1. `buttonFlickerResistYellow`**
    *   **Purpose:** A short, sharp flicker with a yellow tint to indicate the first stage of resistance.
    *   **`targetProperty`**: `button-lights-and-frame`
    *   **Starting/Ending State:** Designed to start from and return to the button's current energized state. `amplitudeStart` and `amplitudeEnd` are 1.0.
    *   **Glow:** Uses a temporary yellow glow color. Glow parameters are conditional on whether the button is selected or not.
    *   *(Dynamic parameters defined in `config.js`)*

*   **2. `buttonFlickerResistOrange`**
    *   **Purpose:** A slightly more intense flicker with an orange tint for the second stage.
    *   **`targetProperty`**: `button-lights-and-frame`
    *   **Starting/Ending State:** Starts from and returns to the button's current energized state.
    *   **Glow:** Uses a temporary orange glow color.
    *   *(Dynamic parameters defined in `config.js`)*

*   **3. `buttonFlickerResistRedThenSolid`**
    *   **Purpose:** A final, dramatic red flash that resolves to a solid, disabled state.
    *   **`targetProperty`**: `button-lights-and-frame`
    *   **Starting/Ending State:** Starts from energized, ends in a permanently disabled visual state.
    *   **Glow:** Uses a temporary red glow color.
    *   *(Dynamic parameters defined in `config.js`)*

---

*Note: The exact values for `numCycles`, `periodStart`, `periodEnd`, `onDurationRatio`, `peakOpacity`, `peakSize`, and `scaleWithAmplitude` for each profile are detailed in `src/js/config.js` under `ADVANCED_FLICKER_PROFILES` and contribute to the unique feel of each flicker while adhering to these start/end visual targets.*