# HUE 9000 Startup Sequence Detailed Breakdown (XState Orchestrated - P0-P11)

This document details the phased startup sequence for the HUE 9000 interface, orchestrated by an XState Finite State Machine (FSM) as of the XState Refactor (SSR-V1.0). Each FSM phase invokes a corresponding `startupPhaseX.js` module executed by `PhaseRunner.js`.

## Core Principles During Startup

*   **Initial Theme:** `body.theme-dim` is active. `body` also starts with `pre-boot` class (removed by `startupSequenceManager.js` during P0 setup).
*   **Procedural Control:** During the startup sequence (Phases P0-P10), the declarative `startupPhaseX.js` configurations, executed by `PhaseRunner`, are the **single source of truth** for all component state changes and animations. Reactive managers (like `LcdUpdater` reacting to `appStatus`) are intentionally passive or have their startup-related reactions carefully managed to prevent race conditions with the procedural sequence.
*   **Progressive Reveal & Dimming Factors:**
    *   Elements activate in stages. Their visual appearance during startup is heavily influenced by two CSS custom properties animated by GSAP within each phase module:
        *   `--startup-L-reduction-factor`: Ranges from a high value (e.g., 0.40) down to 0.0 (no lightness reduction). Affects `oklch()` L-values.
        *   `--startup-opacity-factor`: Derived as `1.0 - L-reduction-factor`. Affects opacity of textures, glows, text shadows.
    *   The `config.js` file (`STARTUP_L_REDUCTION_FACTORS`) defines the target L-reduction factor for each phase.
*   **Button States (CSS Classes applied by `Button.js` components, managed by `buttonManager.js`):**
    *   **Initial (P0):** All buttons are set to `is-unlit` by `buttonManager.setInitialDimStates()`.
    *   **During `theme-dim` (Phases P0-P9):**
        *   `is-unlit`: Default for unpowered buttons. Extremely faint, achromatic.
        *   `is-dimly-lit`: For buttons that need to be more prominent but are not fully energized in `theme-dim`. Achieved by flickering from `is-unlit` using `buttonFlickerToDimlyLit` profile.
            *   MAIN PWR (P2), SCAN/FIT EVAL (P5), HUE ASSN (P7), AUX (P8) buttons transition to this state.
            *   **Note on P7 Hue Assignment Buttons:** The typical `playStateTransitionEcho` animation is conditionally skipped for these buttons when they transition to `is-dimly-lit` in P7. This is to prevent visual clutter from ~48 massively overlapping echo effects. Their final light opacity (`0.8`) is preserved directly from the flicker animation's end state by careful `clearProps` management in `Button.setState`.
        *   `.is-energized` (and `.is-selected` for ON): Applied to MAIN PWR buttons in P3, and AUX LIGHT "LOW" button in P9. Within `theme-dim`, CSS variable overrides ensure these adopt a "dark theme energized" visual appearance. They flicker to this state from `is-dimly-lit`.
    *   **During Theme Transition & `theme-dark` (Phases P10-P11):**
        *   `.is-energized` (and `.is-selected` where appropriate): Full power, styled by `theme-dark.css` variables. SCAN, FIT EVAL, HUE ASSN buttons flicker from `is-dimly-lit` to this state in P10.
*   **LCD/Terminal Visuals During Startup:**
    *   **Terminal Flicker (P1):** The initial terminal message in P1 uses a special composed animation (`specialTerminalFlicker: true` in phase config) that flickers both the screen container and the text itself.
    *   **Subsequent Terminal Messages (P2+):** Startup messages (triggered by `terminalMessageKey`) are typed onto the next line by `terminalManager`.
    *   **Screen Background Flicker (P6):** Dial LCDs (A & B) use the `lcdScreenFlickerToDimlyLit` profile for their visual power-on. The `lcdPowerOn` sound is timed to play concurrently with the start of this visual flicker.
    *   **Theme Transition (P10):** LCD backgrounds transition via CSS. A `background-color` fallback in `_lcd.css` helps minimize visual glitches.

## Startup Phases (FSM States & Corresponding `startupPhaseX.js` modules)

*(Timing `T=` is relative to the start of that specific phase)*

### Phase 0: System Idle / Baseline Setup (`startupPhase0.js`)
*   **FSM State:** `RUNNING_PHASE` (context.currentPhase: 0)
*   **Phase Duration:** Approx 0.5s.
*   **Key Actions:** `startupSequenceManager._resetVisualsAndState()`: `body.pre-boot` removed, dimming factors set, `appState` to `starting-up`/`dim`, buttons to `is-unlit`, LCDs `lcd--unlit`.
*   **Visual Outcome:** UI elements extremely dim.

### Phase 1: Initializing Emergency Subsystems (`startupPhase1.js`)
*   **FSM State:** `RUNNING_PHASE` (context.currentPhase: 1)
*   **Phase Duration:** Approx 3.5s.
*   **Key Actions & Timing:**
    1.  **`T=0.0s`:** Terminal `specialTerminalFlicker` ("INITIATING..."), dimming factors animate, body fades in.
    2.  **`T=1.075s`:** **Audio:** `terminalBoot` sound.
*   **Visual Outcome:** Terminal flickers on. Body visible.

### Phase 2: Activating Backup Power Systems (`startupPhase2.js`)
*   **FSM State:** `RUNNING_PHASE` (context.currentPhase: 2)
*   **Phase Duration:** Approx 3.5s.
*   **Key Actions & Timing:**
    1.  **`T=0.0s`:** Terminal message "P2_BACKUP_POWER", dimming factors animate.
    2.  **`T=0.1s`:** MAIN PWR buttons flicker to `is-dimly-lit`.
    3.  **`T=1.3s`:** **Audio:** `itemAppear` sound (with `forceRestart: true`).
*   **Visual Outcome:** Main power buttons dimly visible.

### Phase 3: Main Power Online (`startupPhase3.js`)
*   **FSM State:** `RUNNING_PHASE` (context.currentPhase: 3)
*   **Phase Duration:** Approx 3.5s.
*   **Key Actions & Timing:**
    1.  **`T=0.0s`:** Terminal message "P3_MAIN_POWER_ONLINE", dimming factors animate.
    2.  **`T=0.1s`:** MAIN PWR "ON" flickers to `.is-energized.is-selected`; "OFF" to `.is-energized`.
    3.  **`T=0.15s`:** **Audio:** `buttonEnergize` sound.
*   **Visual Outcome:** Main power buttons appear energized (dim theme variant).

### Phase 4: Reactivating Optical Core (`startupPhase4.js`)
*   **FSM State:** `RUNNING_PHASE` (context.currentPhase: 4)
*   **Phase Duration:** Approx 4.5s.
*   **Key Actions & Timing:**
    1.  **`T=0.0s`:** Terminal message "P4_OPTICAL_CORE_REACTIVATE", dimming factors animate.
    2.  **`T=0.1s`:** Lens energize sequence begins. **Audio:** `lensStartup` sound.
*   **Visual Outcome:** Central lens activates.

### Phase 5: Initializing Diagnostic Control Interface (`startupPhase5.js`)
*   **FSM State:** `RUNNING_PHASE` (context.currentPhase: 5)
*   **Phase Duration:** Approx 3.5s.
*   **Key Actions & Timing:**
    1.  **`T=0.0s`:** Terminal message "P5_DIAGNOSTIC_INTERFACE", dimming factors animate.
    2.  **`T=0.1s`:** SCAN/FIT EVAL buttons (BTN1-4) flicker to `is-dimly-lit`.
    3.  **`T=1.3s`:** **Audio:** `itemAppear` sound (with `forceRestart: true`).
*   **Visual Outcome:** BTN1-4 dimly visible.

### Phase 6: Initializing Mood and Intensity Controls (`startupPhase6.js`)
*   **FSM State:** `RUNNING_PHASE` (context.currentPhase: 6)
*   **Phase Duration:** Approx 3.5s.
*   **Key Actions & Timing:**
    1.  **`T=0.0s`:** Terminal message "P6_MOOD_INTENSITY_CONTROLS", dimming factors animate.
    2.  **`T=0.5s`:** Dials (MOOD, INTENSITY) become visually active.
    3.  **`T=1.5s`:** Dial LCDs (A & B) flicker to `lcd--dimly-lit`. **Audio:** `lcdPowerOn` sound (with `forceRestart: true`).
    4.  **`T=1.8s`:** **Audio:** `itemAppear` sound (with `forceRestart: true`).
*   **Visual Outcome:** Dials active, then their LCDs dimly lit.

### Phase 7: Initializing Hue Correction Systems (`startupPhase7.js`)
*   **FSM State:** `RUNNING_PHASE` (context.currentPhase: 7)
*   **Phase Duration:** Approx 3.5s.
*   **Key Actions & Timing:**
    1.  **`T=0.0s`:** Terminal message "P7_HUE_CORRECTION_SYSTEMS", dimming factors animate.
    2.  **`T=0.1s`:** Hue Assignment buttons flicker to `is-dimly-lit`. (Note: `playStateTransitionEcho` is skipped for these to maintain visual clarity).
    3.  **`T=1.3s`:** **Audio:** `itemAppear` sound (with `forceRestart: true`).
*   **Visual Outcome:** Hue Assignment buttons dimly visible and stable.

### Phase 8: Initializing External Lighting Controls (`startupPhase8.js`)
*   **FSM State:** `RUNNING_PHASE` (context.currentPhase: 8)
*   **Phase Duration:** Approx 3.5s.
*   **Key Actions & Timing:**
    1.  **`T=0.0s`:** Terminal message "P8_EXTERNAL_LIGHTING_CONTROLS", dimming factors animate to final (0.0 L-reduction).
    2.  **`T=0.1s`:** AUX LIGHT buttons flicker to `is-dimly-lit`.
    3.  **`T=1.3s`:** **Audio:** `itemAppear` sound (with `forceRestart: true`).
*   **Visual Outcome:** Aux light buttons dimly visible. UI at full `theme-dim` base appearance.

### Phase 9: Activating Auxiliary Lighting: Low Intensity (`startupPhase9.js`)
*   **FSM State:** `RUNNING_PHASE` (context.currentPhase: 9)
*   **Phase Duration:** Approx 3.5s.
*   **Key Actions & Timing:**
    1.  **`T=0.0s`:** Terminal message "P9_AUX_LIGHTING_LOW".
    2.  **`T=0.1s`:** AUX LIGHT "LOW" flickers to `.is-energized.is-selected`; "HIGH" to `.is-energized`.
    3.  **`T=0.25s`:** **Audio:** `buttonEnergize` sound.
*   **Visual Outcome:** Aux lights energized, "LOW" selected (dim theme variant).

### Phase 10: Engaging Ambient Theme (`startupPhase10.js`)
*   **FSM State:** `RUNNING_PHASE` (context.currentPhase: 10)
*   **Phase Duration:** Approx 1.5s.
*   **Key Actions & Timing:**
    1.  **`T=0.5s`:** LCDs set to 'active'. `appState.setTheme('dark')`; CSS theme transition begins.
    2.  **`T=0.6s`:** SCAN, FIT EVAL, HUE ASSN buttons flicker to `.is-energized` (with default selections). **Audio:** `themeEngage` sound.
*   **Visual Outcome:** Global theme transitions to dark. Remaining interactive buttons energize.

### Phase 11: HUE 9000 Operational (`startupPhase11.js`)
*   **FSM State:** `RUNNING_PHASE` (context.currentPhase: 11), then `COMPLETE`.
*   **Phase Duration:** Approx 0.5s.
*   **Key Actions (FSM entry action `_performThemeTransitionCleanup` for P11 runs first):**
    1.  **`T=0.0s`:** Terminal message "P11_SYSTEM_OPERATIONAL". Default selected states for button groups confirmed.
    2.  *(On FSM transition to `COMPLETE`)*: `appState.setAppStatus('interactive')`.
*   **Visual Outcome:** All systems online. UI fully interactive in `theme-dark`.

---
## Startup Sequence Troubleshooting Tips

*   **Phase Stalling:** If the startup sequence hangs on a particular phase:
    *   Check the browser console for errors.
    *   Verify the `duration` in the corresponding `startupPhaseX.js` config.
    *   Ensure all GSAP timelines created within that phase have `onComplete` callbacks that are reachable and that any promises (e.g., from `createAdvancedFlicker`) are correctly `await`ed or chained.
    *   Use `PhaseRunner` logs: `[PhaseRunner] Executing Phase X...` and `[PhaseRunner] <<<< COMPLETED >>>> Phase X...` to track FSM progress.
*   **Sound Issues (Missing/Delayed/Incorrect):**
    *   **`forceRestart: true`:** For sounds that need to play reliably even if recently triggered (common in startup or rapid UI clicks), ensure `forceRestart: true` is set in their `type: 'audio'` definition in `startupPhaseX.js` or in direct `audioManager.play()` calls in `main.js`.
    *   **Timing (`position`):** The `position` property in `type: 'audio'` definitions is critical. If a sound seems misaligned with visuals, adjust this value.
    *   **Loading:** While most critical sounds are now preloaded or `forceRestart`ed, ensure the sound file exists and is not corrupted. Use `AudioManager` debug logs (`A_LOAD_INIT`, `A_LOAD_DONE`, `A_PLAY_ATTEMPT`, etc.) to trace loading and playback attempts.
    *   **P6 Sounds:** If P6 sounds (`itemAppear`, `lcdPowerOn`) are missing, check `PhaseRunner` logs:
        *   `[P_RUNNER_P6_AUDIO_BUILD_ENTRY]` (should appear for each audio anim in P6 config).
        *   `[P_RUNNER_SCHED P6_SOUND_...]` (should appear, confirming scheduling).
        *   `[P_RUNNER_P6_TL_DEBUG]` (confirms P6 timeline duration is sufficient).
*   **Visual Flickering/Glitches:**
    *   **Button `is-dimly-lit` Inconsistency (P7 Solved):** This was due to overlapping `playStateTransitionEcho` animations and the interaction of GSAP's `clearProps` with CSS. The fix involved skipping echoes for P7 Hue Assignment buttons and using selective `clearProps` in `Button.setState` to preserve GSAP-set light opacity. If similar issues appear elsewhere, these are good areas to check.
    *   **CSS Transitions:** Unintended CSS transitions on properties GSAP is also animating can cause conflicts. Inspect elements for active transitions.
    *   **`clearProps` Usage:** Be cautious with `gsap.set(element, { clearProps: "all" })`. If a GSAP animation is meant to leave a persistent inline style (like opacity), `clearProps: "all"` will remove it. Use selective clearing (e.g., `clearProps: "transform,filter"`) or ensure CSS correctly defines the desired final state.
    *   **Glow Effects:** Glows are often `box-shadow`. Ensure the CSS variables controlling glow (`--btn-glow-opacity`, `--btn-glow-size`, `--btn-glow-color`) are correctly set by animations and that the CSS rules using them are well-defined for each theme and button state.
*   **General Debugging:**
    *   Use browser developer tools to inspect element classes, computed styles, and console logs.
    *   Temporarily simplify complex animations or comment out sections in `startupPhaseX.js` files to isolate problematic behavior.
    *   Increase verbosity of debug logs in relevant managers if needed.