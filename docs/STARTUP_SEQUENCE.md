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
        *   `.is-energized` (and `.is-selected` where appropriate): Full power, styled by `theme-dark.css` variables. SCAN, FIT EVAL, HUE ASSN buttons flicker from `is-dimly-lit` to this state in P10. MAIN PWR and AUX buttons visually adapt due to CSS variable changes.
*   **LCD/Terminal Visuals During Startup:**
    *   **Terminal Flicker (P1):** The initial terminal message in P1 uses a special composed animation in `PhaseRunner` (via `specialTerminalFlicker: true`) that flickers both the screen container and the text itself for a dramatic power-on effect.
    *   **Subsequent Terminal Messages (P2+):** All subsequent startup messages (triggered by `terminalMessageKey`) are simply typed onto the next line by `terminalManager`, preserving the message history. No special container/text flicker is applied after P1 for these messages.
    *   **Screen Background Flicker (P6):**
        *   Dial LCDs (A & B) use the `lcdScreenFlickerToDimlyLit` profile for their visual power-on.
        *   The Terminal screen background might also use a similar profile if targeted, but typically its content remains from previous messages.
    *   **Theme Transition (P10):** LCD backgrounds transition via CSS. A `background-color` fallback is used in `_lcd.css` to minimize visual glitches.

## Startup Phases (FSM States & Corresponding `startupPhaseX.js` modules)

*(Timing `T=` is relative to the start of that specific phase)*

### Phase 0: System Idle / Baseline Setup (`startupPhase0.js`)
*   **FSM State:** `RUNNING_PHASE` (context.currentPhase: 0)
*   **Phase Duration:** Approximately 0.5 seconds.
*   **Conceptual Goal:** Establish initial visual state.
*   **Key Actions & Timing:**
    1.  **`T=0.0s`:** `startupSequenceManager.resetVisualsAndState()` is called:
        *   `body.pre-boot` class removed.
        *   `--startup-L-reduction-factor` set to `STARTUP_L_REDUCTION_FACTORS.P0`.
        *   `--startup-opacity-factor` calculated.
        *   `appState` set to `starting-up`, theme to `dim`.
        *   All buttons set to `is-unlit`. Lens power to 0. LCDs to `lcd--unlit`. Logo SVG injected.
*   **Visual Outcome:** UI elements extremely dim. LCDs blank. Logo very faint.

### Phase 1: Initializing Emergency Subsystems (`startupPhase1.js`)
*   **FSM State:** `RUNNING_PHASE` (context.currentPhase: 1)
*   **Phase Duration:** Approximately 3.5 seconds.
*   **Conceptual Goal:** Initial terminal power-on with precise audio-visual sync, body fade-in.
*   **Key Actions & Timing:**
    1.  **`T=0.0s`:**
        *   **Visual:** `specialTerminalFlicker` for "INITIATING STARTUP PROTOCOL" begins (container & text flicker).
        *   **Visual:** Dimming factors begin animating to `STARTUP_L_REDUCTION_FACTORS.P1` (duration 1.0s).
        *   **Visual:** Body begins fading in (opacity 0 to 1, duration 0.3s).
    2.  **`T=1.075s`:**
        *   **Audio:** `terminalBoot` sound plays, timed to synchronize its impact with the terminal's visual appearance sequence.
*   **Visual Outcome:** Terminal flickers on with its first message. Body becomes visible. UI elements are very dim.

### Phase 2: Activating Backup Power Systems (`startupPhase2.js`)
*   **FSM State:** `RUNNING_PHASE` (context.currentPhase: 2)
*   **Phase Duration:** Approximately 3.5 seconds.
*   **Conceptual Goal:** Prepare main power buttons.
*   **Key Actions & Timing:**
    1.  **`T=0.0s`:**
        *   **Terminal:** Message "P2_BACKUP_POWER" requested (typed by `terminalManager`).
        *   **Visual:** Dimming factors begin animating to `STARTUP_L_REDUCTION_FACTORS.P2` (duration 1.0s).
    2.  **`T=0.1s`:**
        *   **Visual:** MAIN PWR buttons (group `system-power`) begin flickering to `is-dimly-lit` state.
    3.  **`T=1.3s`:**
        *   **Audio:** `itemAppear` sound plays, its auditory peak timed to align with the visual stabilization of the MAIN PWR buttons' flicker.
*   **Visual Outcome:** Main power buttons become dimly visible. A second line of text appears in the terminal.

### Phase 3: Main Power Online (`startupPhase3.js`)
*   **FSM State:** `RUNNING_PHASE` (context.currentPhase: 3)
*   **Phase Duration:** Approximately 3.5 seconds.
*   **Conceptual Goal:** Energize main power buttons.
*   **Key Actions & Timing:**
    1.  **`T=0.0s`:**
        *   **Terminal:** Message "P3_MAIN_POWER_ONLINE" requested (typed).
        *   **Visual:** Dimming factors begin animating to `STARTUP_L_REDUCTION_FACTORS.P3` (duration 1.0s).
    2.  **`T=0.1s`:**
        *   **Visual:** MAIN PWR "ON" button flickers (fast profile) to `.is-energized.is-selected`.
        *   **Visual:** MAIN PWR "OFF" button flickers (fast profile) to `.is-energized`.
    3.  **`T=0.15s`:**
        *   **Audio:** `buttonEnergize` sound plays, timed for its impact to align with the peak of the "Fast" button flicker.
*   **Visual Outcome:** Main power buttons appear energized (dim theme variant).

### Phase 4: Reactivating Optical Core (`startupPhase4.js`)
*   **FSM State:** `RUNNING_PHASE` (context.currentPhase: 4)
*   **Phase Duration:** Approximately 4.5 seconds.
*   **Conceptual Goal:** Activate central lens.
*   **Key Actions & Timing:**
    1.  **`T=0.0s`:**
        *   **Terminal:** Message "P4_OPTICAL_CORE_REACTIVATE" requested (typed).
        *   **Visual:** Dimming factors begin animating to `STARTUP_L_REDUCTION_FACTORS.P4` (duration 1.0s).
    2.  **`T=0.1s`:**
        *   **Visual:** Lens energize sequence (`lensManager.energizeLensCoreStartup()`) begins (ramp over `LENS_STARTUP_RAMP_DURATION`).
        *   **Audio:** `lensStartup` sound plays, coinciding with the start of the lens energize sequence.
*   **Visual Outcome:** Central lens activates and shows initial power.

### Phase 5: Initializing Diagnostic Control Interface (`startupPhase5.js`)
*   **FSM State:** `RUNNING_PHASE` (context.currentPhase: 5)
*   **Phase Duration:** Approximately 3.5 seconds.
*   **Conceptual Goal:** Prime SCAN and FIT EVAL buttons.
*   **Key Actions & Timing:**
    1.  **`T=0.0s`:**
        *   **Terminal:** Message "P5_DIAGNOSTIC_INTERFACE" requested (typed).
        *   **Visual:** Dimming factors begin animating to `STARTUP_L_REDUCTION_FACTORS.P5` (duration 1.0s).
    2.  **`T=0.1s`:**
        *   **Visual:** Buttons for SKILL SCAN & FIT EVAL (BTN1-4) begin flickering to `is-dimly-lit`.
    3.  **`T=1.3s`:**
        *   **Audio:** `itemAppear` sound plays, its auditory peak timed to align with the visual stabilization of the buttons' flicker.
*   **Visual Outcome:** BTN1-4 become dimly visible.

### Phase 6: Initializing Mood and Intensity Controls (`startupPhase6.js`)
*   **FSM State:** `RUNNING_PHASE` (context.currentPhase: 6)
*   **Phase Duration:** Approximately 3.5 seconds.
*   **Conceptual Goal:** Activate dials, then their LCDs, as distinct events.
*   **Key Actions & Timing:**
    1.  **`T=0.0s`:**
        *   **Terminal:** Message "P6_MOOD_INTENSITY_CONTROLS" requested (typed).
        *   **Visual:** Dimming factors begin animating to `STARTUP_L_REDUCTION_FACTORS.P6` (duration 1.0s).
    2.  **`T=0.5s`:**
        *   **Visual:** Dials (MOOD, INTENSITY) become visually active (`dialManager.setDialsActiveState(true)`).
    3.  **`T=1.5s`:**
        *   **Visual:** Dial LCDs (A & B) begin flickering to `lcd--dimly-lit` state.
        *   **Audio (Commented Out):** `lcdPowerOn` sound was intended here, coinciding with LCD visual power-on.
    4.  **`T=1.8s`:**
        *   **Audio:** `itemAppear` sound plays, its auditory peak timed to align with the visual stabilization of the dials becoming active (which started at `T=0.5s`).
*   **Visual Outcome:** Dials become "active dim". A second later, their LCDs also flicker to a dimly-lit state. Mood display shows initial "Commanding" state.

### Phase 7: Initializing Hue Correction Systems (`startupPhase7.js`)
*   **FSM State:** `RUNNING_PHASE` (context.currentPhase: 7)
*   **Phase Duration:** Approximately 3.5 seconds.
*   **Conceptual Goal:** Prime Hue Assignment buttons.
*   **Key Actions & Timing:**
    1.  **`T=0.0s`:**
        *   **Terminal:** Message "P7_HUE_CORRECTION_SYSTEMS" requested (typed).
        *   **Visual:** Dimming factors begin animating to `STARTUP_L_REDUCTION_FACTORS.P7` (duration 1.0s).
    2.  **`T=0.1s`:**
        *   **Visual:** Hue Assignment buttons (ENV, LCD, LOGO, BTN columns) begin flickering to `is-dimly-lit`.
    3.  **`T=1.3s`:**
        *   **Audio:** `itemAppear` sound plays, its auditory peak timed to align with the visual stabilization of the buttons' flicker.
*   **Visual Outcome:** Hue Assignment buttons become dimly visible.

### Phase 8: Initializing External Lighting Controls (`startupPhase8.js`)
*   **FSM State:** `RUNNING_PHASE` (context.currentPhase: 8)
*   **Phase Duration:** Approximately 3.5 seconds.
*   **Conceptual Goal:** Prime Auxiliary Light buttons and finalize dimming factor animations.
*   **Key Actions & Timing:**
    1.  **`T=0.0s`:**
        *   **Terminal:** Message "P8_EXTERNAL_LIGHTING_CONTROLS" requested (typed).
        *   **Visual:** Dimming factors animate to their final value (L-factor to 0.0) (duration 1.0s).
    2.  **`T=0.1s`:**
        *   **Visual:** AUX LIGHT buttons (LOW, HIGH) begin flickering to `is-dimly-lit`.
    3.  **`T=1.3s`:**
        *   **Audio:** `itemAppear` sound plays, its auditory peak timed to align with the visual stabilization of the buttons' flicker.
*   **Visual Outcome:** Auxiliary light buttons become dimly visible. All UI elements affected by startup factors are now at their full `theme-dim` base appearance.

### Phase 9: Activating Auxiliary Lighting: Low Intensity (`startupPhase9.js`)
*   **FSM State:** `RUNNING_PHASE` (context.currentPhase: 9)
*   **Phase Duration:** Approximately 3.5 seconds.
*   **Conceptual Goal:** Energize Auxiliary Light buttons to default "LOW" state.
*   **Key Actions & Timing:**
    1.  **`T=0.0s`:**
        *   **Terminal:** Message "P9_AUX_LIGHTING_LOW" requested (typed).
    2.  **`T=0.1s`:**
        *   **Visual:** AUX LIGHT "LOW" button flickers (regular profile) to `.is-energized.is-selected`.
        *   **Visual:** AUX LIGHT "HIGH" button flickers (regular profile) to `.is-energized`.
    3.  **`T=0.25s`:**
        *   **Audio:** `buttonEnergize` sound plays, timed for its impact to align with the peak of the regular button flicker.
*   **Visual Outcome:** Auxiliary light buttons appear energized (dim theme variant), "LOW" selected.

### Phase 10: Engaging Ambient Theme (`startupPhase10.js`)
*   **FSM State:** `RUNNING_PHASE` (context.currentPhase: 10)
*   **Phase Duration:** Approximately 1.5 seconds.
*   **Conceptual Goal:** Transition global theme to `theme-dark` and fully energize remaining buttons.
*   **Key Actions & Timing:**
    1.  **`T=0.5s`:**
        *   **Call:** All LCDs set to 'active' state by `LcdUpdater`.
        *   **Call:** `body` classes updated for theme transition, `appState.setTheme('dark')` called. CSS theme transitions (1.0s duration via `config.THEME_TRANSITION_DURATION`) begin.
    2.  **`T=0.6s`:**
        *   **Visual:** SCAN, FIT EVAL, and HUE ASSN buttons (which were `is-dimly-lit`) begin flickering to their final `.is-energized` states.
        *   **Audio:** `themeEngage` sound plays, coinciding with button energizing and theme transition start.
*   **Visual Outcome:** Global theme transitions from dim to dark. SCAN, FIT EVAL, HUE ASSN buttons flicker to full power.

### Phase 11: HUE 9000 Operational (`startupPhase11.js`)
*   **FSM State:** `RUNNING_PHASE` (context.currentPhase: 11), then `COMPLETE`.
*   **Phase Duration:** Approximately 0.5 seconds.
*   **Conceptual Goal:** Finalize UI and declare system ready.
*   **Key Actions & Timing (FSM entry action `_performThemeTransitionCleanup` runs first):**
    1.  **`T=0.0s`:**
        *   **Terminal:** Message "P11_SYSTEM_OPERATIONAL" requested (typed).
        *   **Call:** Default selected states for MAIN PWR, AUX LIGHT, and HUE ASSN groups are confirmed/set by `buttonManager.setGroupSelected()`.
    2.  *(Shortly after, on FSM transition to `COMPLETE`)*: `appState.setAppStatus('interactive')`.
*   **Visual Outcome:** All systems online. UI fully interactive and styled by `theme-dark`.