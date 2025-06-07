# HUE 9000 Startup Sequence Detailed Breakdown (XState Orchestrated - P0-P11)

This document details the phased startup sequence for the HUE 9000 interface, orchestrated by an XState Finite State Machine (FSM) as of the XState Refactor. Each FSM phase invokes a corresponding `startupPhaseX.js` module.

## Core Principles During Startup

*   **Initial Theme:** `body.theme-dim` is active. `body` also starts with `pre-boot` class (removed by `startupSequenceManager.js` during P0).
*   **Procedural Control:** During the startup sequence (Phases P0-P10), the declarative `startupPhaseX.js` configurations, executed by `PhaseRunner`, are the **single source of truth** for all component state changes and animations. Reactive managers (like `LcdUpdater`) are intentionally passive to prevent race conditions.
*   **Progressive Reveal & Dimming Factors:**
    *   Elements activate in stages. Their visual appearance during startup is heavily influenced by two CSS custom properties animated by GSAP within each phase module:
        *   `--startup-L-reduction-factor`: Ranges from a high value (e.g., 0.40) down to 0.0 (no lightness reduction). Affects `oklch()` L-values.
        *   `--startup-opacity-factor`: Ranges from a low value (e.g., 0.60) up to 1.0 (full base opacity). Affects opacity of textures, glows, text shadows.
    *   The `config.js` file (`STARTUP_L_REDUCTION_FACTORS`) defines the target L-reduction factor for each phase. The opacity factor is typically `1.0 - L-reduction-factor`.
*   **Button States (CSS Classes applied by `Button.js` components, managed by `buttonManager.js`):**
    *   **Initial (P0):** All buttons are set to `is-unlit` by `buttonManager.setInitialDimStates()`.
    *   **During `theme-dim` (Phases P0-P9):**
        *   `is-unlit`: Default for unpowered buttons. Extremely faint, achromatic. Button text is very dark.
        *   `is-dimly-lit`: For buttons that need to be more prominent but are not fully energized in `theme-dim`. Achieved by flickering from `is-unlit` using `buttonFlickerToDimlyLit` profile.
            *   MAIN PWR (P2), SCAN/FIT EVAL (P5), HUE ASSN (P7), AUX (P8) buttons transition to this state.
        *   `.is-energized` (and `.is-selected` for ON): Applied to MAIN PWR buttons in P3, and AUX LIGHT "LOW" button in P9. Within `theme-dim`, CSS variable overrides ensure these adopt a "dark theme energized" visual appearance. They flicker to this state from `is-dimly-lit` using profiles like `buttonFlickerFromDimlyLitToFullyLitSelectedFast` or `buttonFlickerFromDimlyLitToFullyLitSelected`.
    *   **During Theme Transition & `theme-dark` (Phases P10-P11):**
        *   `.is-energized` (and `.is-selected` where appropriate): Full power, styled by `theme-dark.css` variables. SCAN, HUE ASSN, FIT EVAL buttons flicker from `is-dimly-lit` to this state in P10. MAIN PWR and AUX buttons visually adapt due to CSS variable changes.
*   **LCD/Terminal Visuals During Startup:**
    *   **Text Persistence:** Terminal text, once typed (e.g., P1 message), should remain visible through subsequent phases (P2-P5) even if its parent screen container (`.actual-lcd-screen-element`) is styled as `lcd--unlit`. `terminalManager.js` has logic to ensure its content area is visible before typing.
    *   **Screen Background Flicker (P6):**
        *   Dial LCDs (A & B) use the `lcdScreenFlickerToDimlyLit` profile. Their containers are set to `autoAlpha:0` by GSAP *before* the `.lcd--dimly-lit` class (which defines a visible background) is applied by the flicker animation logic. This prevents a "flash-on" from the class before the flicker's `autoAlpha:0` takes effect.
        *   The Terminal screen uses the `terminalScreenFlickerToDimlyLit` profile, which starts with `amplitudeStart:1.0` (container `autoAlpha` remains 1), so only its glow/background effect animates in, while existing text remains visible.
    *   **Theme Transition (P10):** LCD backgrounds transition via CSS. A `background-color` fallback is used in `_lcd.css` to minimize visual glitches if the `background-image` gradient transition isn't perfectly smooth.

## Startup Phases (FSM States & Corresponding `startupPhaseX.js` modules)

### Phase 0: System Idle / Baseline Setup (`startupPhase0.js`)
*   **FSM State:** `RUNNING_SEQUENCE.PHASE_0_IDLE`
*   **Conceptual Goal:** Establish initial visual state.
*   **Key Actions:**
    1.  `startupSequenceManager.resetVisualsAndState()` is called:
        *   `body.pre-boot` class removed.
        *   `--startup-L-reduction-factor` set to `STARTUP_L_REDUCTION_FACTORS.P0` (e.g., 0.40).
        *   `--startup-opacity-factor` set to `1.0 - L-reduction-factor_P0` (e.g., 0.60).
        *   `--startup-opacity-factor-boosted` calculated.
        *   `appState` set to `starting-up`, theme to `dim`.
        *   All buttons set to `is-unlit`. Lens power to 0. LCDs to `lcd--unlit`. Logo SVG injected.
        *   Body opacity set to 0 (for auto-play) or 1 (for step-through).
    2.  `appStateService.setAppStatus('starting-up')` (if not already).
*   **Visual Outcome:** UI elements extremely dim or invisible (if body opacity is 0). LCDs blank. Logo very faint.

### Phase 1: Initializing Emergency Subsystems (`startupPhase1.js`)
*   **FSM State:** `RUNNING_SEQUENCE.PHASE_1_EMERGENCY_SUBSYSTEMS`
*   **Conceptual Goal:** Body fade-in, initial terminal message.
*   **Key Actions:**
    1.  **Dimming Factors:** Animate to `STARTUP_L_REDUCTION_FACTORS.P1`.
    2.  **Body:** Fades in (opacity 0 to 1) if auto-playing.
    3.  **Terminal:** Emits "P1_EMERGENCY_SUBSYSTEMS" message, which flickers in using `textFlickerToDimlyLit`. Terminal content area (`#terminal-lcd-content`) opacity set to 1.
*   **Visual Outcome:** Body visible. UI elements very dim. First terminal line visible and dimly lit.

### Phase 2: Activating Backup Power Systems (`startupPhase2.js`)
*   **FSM State:** `RUNNING_SEQUENCE.PHASE_2_BACKUP_POWER`
*   **Conceptual Goal:** Prepare main power buttons.
*   **Key Actions:**
    1.  **Dimming Factors:** Animate to `STARTUP_L_REDUCTION_FACTORS.P2`.
    2.  **Terminal:** Emits "P2_BACKUP_POWER" message.
    3.  **MAIN PWR Buttons (ON/OFF):** Flicker to `is-dimly-lit` state using `buttonFlickerToDimlyLit` profile.
*   **Visual Outcome:** Main power buttons become dimly visible. Other elements remain very dim.

### Phase 3: Main Power Online (`startupPhase3.js`)
*   **FSM State:** `RUNNING_SEQUENCE.PHASE_3_MAIN_POWER_ONLINE`
*   **Conceptual Goal:** Energize main power buttons.
*   **Key Actions:**
    1.  **Dimming Factors:** Animate to `STARTUP_L_REDUCTION_FACTORS.P3`.
    2.  **Terminal:** Emits "P3_MAIN_POWER_ONLINE" message.
    3.  **MAIN PWR Buttons:**
        *   "ON" button flickers from `is-dimly-lit` to `.is-energized.is-selected` (dark theme energized look) using `buttonFlickerFromDimlyLitToFullyLitSelectedFast`.
        *   "OFF" button flickers from `is-dimly-lit` to `.is-energized` (dark theme energized look, unselected) using `buttonFlickerFromDimlyLitToFullyLitUnselectedFast`.
*   **Visual Outcome:** Main power buttons appear energized (dim theme variant).

### Phase 4: Reactivating Optical Core (`startupPhase4.js`)
*   **FSM State:** `RUNNING_SEQUENCE.PHASE_4_OPTICAL_CORE_REACTIVATE`
*   **Conceptual Goal:** Activate central lens.
*   **Key Actions:**
    1.  **Dimming Factors:** Animate to `STARTUP_L_REDUCTION_FACTORS.P4`.
    2.  **Terminal:** Emits "P4_OPTICAL_CORE_REACTIVATE" message.
    3.  **Lens:** `lensManager.energizeLensCoreStartup()` called. Lens radial gradient becomes visible, ramping to target power (e.g., 25%). `appState` for Dial B (Intensity) is synced.
*   **Visual Outcome:** Central lens activates and shows initial power.

### Phase 5: Initializing Diagnostic Control Interface (`startupPhase5.js`)
*   **FSM State:** `RUNNING_SEQUENCE.PHASE_5_DIAGNOSTIC_INTERFACE`
*   **Conceptual Goal:** Prime SCAN and FIT EVAL buttons.
*   **Key Actions:**
    1.  **Dimming Factors:** Animate to `STARTUP_L_REDUCTION_FACTORS.P5`.
    2.  **Terminal:** Emits "P5_DIAGNOSTIC_INTERFACE" message.
    3.  **Buttons (BTN1-4 for SKILL SCAN, FIT EVAL):** Flicker to `is-dimly-lit` state using `buttonFlickerToDimlyLit`.
*   **Visual Outcome:** BTN1-4 become dimly visible.

### Phase 6: Initializing Mood and Intensity Controls (`startupPhase6.js`)
*   **FSM State:** `RUNNING_SEQUENCE.PHASE_6_MOOD_INTENSITY_CONTROLS`
*   **Conceptual Goal:** Activate dials and their LCDs.
*   **Key Actions:**
    1.  **Dimming Factors:** Animate to `STARTUP_L_REDUCTION_FACTORS.P6`.
    2.  **Terminal:** Emits "P6_MOOD_INTENSITY_CONTROLS" message.
    3.  **Dials (MOOD, INTENSITY):** `dialManager.setDialsActiveState(true)` called. Dials show ridges and fade in.
    4.  **Dial LCDs (A, B):** Flicker to `lcd--dimly-lit` state using `lcdScreenFlickerToDimlyLit` profile. Dial LCDs display initial values (Mood Matrix for A, % for B).
    5.  **Terminal Screen:** Background flickers to `lcd--dimly-lit` state using `terminalScreenFlickerToDimlyLit` profile (text persists).
*   **Visual Outcome:** Dials and their LCDs become "active dim." Terminal screen background also dimly lit.

### Phase 7: Initializing Hue Correction Systems (`startupPhase7.js`)
*   **FSM State:** `RUNNING_SEQUENCE.PHASE_7_HUE_CORRECTION_SYSTEMS`
*   **Conceptual Goal:** Prime Hue Assignment buttons.
*   **Key Actions:**
    1.  **Dimming Factors:** Animate to `STARTUP_L_REDUCTION_FACTORS.P7`.
    2.  **Terminal:** Emits "P7_HUE_CORRECTION_SYSTEMS" message.
    3.  **Hue Assignment Buttons (ENV, LCD, LOGO, BTN columns):** Flicker to `is-dimly-lit` state using `buttonFlickerToDimlyLit`.
*   **Visual Outcome:** Hue Assignment buttons become dimly visible.

### Phase 8: Initializing External Lighting Controls (`startupPhase8.js`)
*   **FSM State:** `RUNNING_SEQUENCE.PHASE_8_EXTERNAL_LIGHTING_CONTROLS`
*   **Conceptual Goal:** Prime Auxiliary Light buttons and finalize dimming factor animations.
*   **Key Actions:**
    1.  **Dimming Factors:** Animate to `STARTUP_L_REDUCTION_FACTORS.P8` (L-factor to 0.0, O-factor to 1.0).
    2.  **Terminal:** Emits "P8_EXTERNAL_LIGHTING_CONTROLS" message.
    3.  **AUX LIGHT Buttons (LOW, HIGH):** Flicker to `is-dimly-lit` state using `buttonFlickerToDimlyLit`.
*   **Visual Outcome:** Auxiliary light buttons become dimly visible. All UI elements affected by startup factors are now at their full `theme-dim` base appearance (no further L-reduction or opacity attenuation from startup factors).

### Phase 9: Activating Auxiliary Lighting: Low Intensity (`startupPhase9.js`)
*   **FSM State:** `RUNNING_SEQUENCE.PHASE_9_AUX_LIGHTING_LOW`
*   **Conceptual Goal:** Energize Auxiliary Light buttons to default "LOW" state.
*   **Key Actions:**
    1.  **Dimming Factors:** Remain at L=0.0, O=1.0.
    2.  **Terminal:** Emits "P9_AUX_LIGHTING_LOW" message.
    3.  **AUX LIGHT Buttons:**
        *   "LOW" button flickers from `is-dimly-lit` to `.is-energized.is-selected` (dark theme energized look) using `buttonFlickerFromDimlyLitToFullyLitSelected`.
        *   "HIGH" button flickers from `is-dimly-lit` to `.is-energized` (dark theme energized look, unselected) using `buttonFlickerFromDimlyLitToFullyLitUnselected`.
*   **Visual Outcome:** Auxiliary light buttons appear energized (dim theme variant), "LOW" selected.

### Phase 10: Engaging Ambient Theme (`startupPhase10.js`)
*   **FSM State:** `RUNNING_SEQUENCE.PHASE_10_THEME_TRANSITION`
*   **Conceptual Goal:** Transition global theme to `theme-dark` and fully energize remaining buttons.
*   **Key Actions:**
    1.  **Dimming Factors:** Remain at L=0.0, O=1.0.
    2.  **UI Preparation:**
        *   **LCD State Cleanup:** All LCDs (`.actual-lcd-screen-element`, `.hue-lcd-display`) are explicitly set to their 'active' state by `LcdUpdater`. This removes the temporary `.lcd--dimly-lit` class, preparing them for a smooth CSS transition.
        *   Elements matching `config.selectorsForDimExitAnimation` get `.animate-on-dim-exit` class.
        *   `body` gets `is-transitioning-from-dim` class.
    3.  **Theme Change:** `appStateService.setTheme('dark')` called. This triggers CSS transitions for elements with `.animate-on-dim-exit` (1s duration). MAIN PWR and AUX buttons (already `.is-energized`) visually adapt. LCD backgrounds transition.
    4.  **Button Energizing (Concurrent):**
        *   SCAN, FIT EVAL, and HUE ASSN buttons (which were `is-dimly-lit`) execute flicker animations to their final `.is-energized` states (HUE ASSN defaults applied for selection), now styled by `theme-dark.css`. Uses profiles `buttonFlickerFromDimlyLitToFullyLitUnselected` or `buttonFlickerFromDimlyLitToFullyLitSelected`.
*   **Visual Outcome:** Global theme transitions from dim to dark. SCAN, FIT EVAL, HUE ASSN buttons flicker to full power.

### Phase 11: HUE 9000 Operational (`startupPhase11.js`)
*   **FSM State:** `RUNNING_SEQUENCE.PHASE_11_SYSTEM_OPERATIONAL`
*   **Conceptual Goal:** Finalize UI and declare system ready.
*   **Key Actions (FSM entry action `performThemeTransitionCleanupIfNeeded` runs first):**
    1.  **Theme Transition Cleanup:** `_performThemeTransitionCleanupLocal()` in `startupSequenceManager.js` removes `.animate-on-dim-exit` and `body.is-transitioning-from-dim`.
    2.  **Terminal:** Emits "P11_SYSTEM_OPERATIONAL" message.
    3.  **Button Groups:** Default selected states for MAIN PWR, AUX LIGHT, and HUE ASSN groups are confirmed/set by `buttonManager.setGroupSelected()`.
    4.  **App Status:** `appStateService.setAppStatus('interactive')`.
    5.  **Dials:** `dialManager.resizeAllCanvases(true)` to ensure correct rendering in the new theme.
*   **Visual Outcome:** All systems online. UI fully interactive and styled by `theme-dark`.