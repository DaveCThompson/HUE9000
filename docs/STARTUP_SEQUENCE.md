--- START OF FILE STARTUP_SEQUENCE.md ---

# HUE 9000 Startup Sequence Detailed Breakdown (REFACTOR-V2 - Revised)

This document details the phased startup sequence for the HUE 9000 interface, reflecting the REFACTOR-V2 architecture and subsequent V2.3 component refactor. `startupSequenceManager.js` orchestrates these phases, logging key events. UI updates are handled by relevant managers (e.g., `buttonManager.js` delegating to `Button.js` instances, `dialManager.js` to `Dial.js` instances, `uiUpdater.js`, `lensManager.js`).

## Core Principles During Startup

*   **Initial Theme:** `body.theme-dim` is active.
*   **Progressive Reveal:** Elements activate in stages.
*   **Button States (CSS Classes applied by `Button.js` components):**
    *   **During `theme-dim` (Phases P0-P5_AuxLightsEnergize_Dim):**
        *   `is-unlit`: Default for unpowered buttons. Extremely faint, achromatic. Button text is very dark.
        *   `is-dimly-lit`: For buttons that need to be more prominent but are not fully energized in `theme-dim` (e.g., SCAN, HUE ASSN, FIT EVAL, AUX buttons in P4).
        *   `.is-energized` (and `.is-selected` for ON): Applied to MAIN PWR buttons in P2, and AUX buttons in P5_AuxLightsEnergize_Dim. Within `theme-dim`, CSS variable overrides ensure these adopt a "dark theme energized" visual appearance.
    *   **During `theme-dark` (Phase P6_ThemeTransitionAndFinalEnergize onwards):**
        *   `.is-energized` (and `.is-selected` where appropriate): Full power, styled by `theme-dark.css` variables.

## Startup Phases (as per `startupSequenceManager.js` GSAP labels)

### Phase P0_Baseline
*   **Visuals:** UI is mostly dark. `body` has `theme-dim` class and its opacity is initially 0 (JS-managed, or 1 if debug stepping). Lens is not visible. Dials are unlit/featureless, housings very faint. Dial LCDs are blank. All buttons are in `is-unlit` state (achromatic, extremely dim). Logo is ~5% opacity. Control block borders and labels are very faint.
*   **Terminal:** "INITIALIZING..."

### Phase P1_BodyFadeIn
*   **Visuals:** Body opacity animates from 0 to 1. `is-unlit` elements become gradually more visible but remain very dim. Lens remains not visible. Dials and Dial LCDs remain unlit/blank.
*   **Terminal:** "INITIALIZING..." (continues)

### Phase P2_MainPwr (Energized)
*   **Environment:** `theme-dim`
*   **Action:** MAIN PWR buttons briefly transition to `is-dimly-lit`, then their `Button.js` instances are set to `.is-energized.is-selected` (ON) or `.is-energized` (OFF).
*   **Visual Summary:** MAIN PWR ON and OFF buttons appear energized (dark-theme style within `theme-dim`), with their lights flickering on. Other buttons remain `is-unlit`. Dials/LCDs remain unlit/blank. Lens is off.
*   **Terminal:** "MAIN POWER RESTORED... STANDBY".

### Phase P3_Lens (Activates)
*   **Environment:** `theme-dim`
*   **Action:** `lensManager.energizeLensCoreStartup()` is called. Lens radial gradient becomes visible and ramps up its energy (to 25% power). `appState` for Dial B's hue is synced to this 25% power.
*   **Visual Summary:** Lens core is visible and glowing. Main PWR buttons are energized. Other buttons, Dials, LCDs remain in their P0/P1 state.
*   **Terminal:** "OPTICAL CORE ENERGIZING...".

### Phase P4_PreStartPriming
*   **Environment:** `theme-dim`
*   **Action:**
    1.  **Buttons (SCAN, HUE ASSN, FIT EVAL, AUX):** Transition to the `is-dimly-lit` state.
    2.  **Dials & Dial LCDs (MOOD, INTENSITY):** `Dial.js` instances render them as "active dim" (ridges visible, LCDs show initial values).
    3.  **Logo:** Remains very dim.
*   **Terminal:** "SECONDARY SYSTEMS ONLINE... STANDBY."

### Phase P5_AuxLightsEnergize_Dim
*   **Environment:** `theme-dim`
*   **Action:** AUX LIGHT "LOW" `Button.js` instance is set to `.is-energized.is-selected`, AUX LIGHT "HIGH" to `.is-energized`.
*   **Visual Summary:** AUX buttons adopt a "dark theme energized" appearance, and their lights flicker on.
*   **Terminal:** "AUXILIARY LIGHTS ONLINE. DEFAULT: LOW."

### Phase P6_ThemeTransitionAndFinalEnergize
*   **Environment:** Transitions from `theme-dim` to `theme-dark`.
*   **Action:**
    1.  **Global Theme Transition (1s):** Orchestrated by `startupSequenceManager.js`:
        *   First, JavaScript identifies specific UI elements that need to animate their appearance due to theme variable changes and adds a temporary class (e.g., `.animate-on-dim-exit`) to them.
        *   Then, the `body.is-transitioning-from-dim` class is added to the `<body>` element.
        *   Immediately after, `body.theme-dim` is replaced with `body.theme-dark`.
        *   A CSS rule in `_startup-transition.css` (targeting `body.is-transitioning-from-dim .animate-on-dim-exit`) ensures these selected elements smoothly transition their visual properties over 1 second.
        *   Upon completion of this 1-second transition (managed by GSAP), JavaScript removes the `.animate-on-dim-exit` class from the elements and the `body.is-transitioning-from-dim` class from the `<body>`.
    2.  MAIN PWR and AUX buttons (already `.is-energized`) visually adapt to the true `theme-dark` energized appearance due to the theme's CSS variable changes.
    3.  **Button Flicker:** **At the appropriate point during P6 playback (after the theme change is initiated and processed),** `Button.js` instances for SCAN, HUE ASSN, and FIT EVAL buttons (which were set to `is-dimly-lit` in P4) execute a flicker animation to their final `.is-energized` states (selected/unselected as appropriate for HUE ASSN defaults), now styled by `theme-dark.css`. This is orchestrated by `buttonManager.flickerDimlyLitToEnergizedStartup` being called from within a deferred GSAP call in the P6 timeline.
    4.  GSAP waits for CSS transition and button flickers to complete.
*   **Terminal:** "AMBIENT THEME ENGAGED. ALL SYSTEMS NOMINAL."

### Phase P7_SystemReady
*   **Environment:** `theme-dark`
*   **Action:** Final ARIA attribute confirmations for button groups. `appState` set to `interactive`.
*   **Terminal:** "ALL SYSTEMS ONLINE. HUE 9000 READY."