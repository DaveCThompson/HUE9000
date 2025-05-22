# HUE 9000 Startup Sequence Detailed Breakdown (XState Refactor)

This document details the phased startup sequence for the HUE 9000 interface, orchestrated by an XState Finite State Machine (FSM) as of REFACTOR-V2.3/SSR-V1.0. Each FSM phase invokes a corresponding `startupPhaseX.js` module. UI updates are handled by relevant managers.

*(Conceptual P-Phase mapping from older versions is provided in parentheses for historical context and relation to user-perceived stages.)*

## Core Principles During Startup

*   **Initial Theme:** `body.theme-dim` is active.
*   **Progressive Reveal:** Elements activate in stages.
*   **Button States (CSS Classes applied by `Button.js` components):**
    *   **During `theme-dim` (FSM Phases 0-4 / Conceptual P0-P5):**
        *   `is-unlit`: Default for unpowered buttons. Extremely faint, achromatic. Button text is very dark.
        *   `is-dimly-lit`: For buttons that need to be more prominent but are not fully energized in `theme-dim` (e.g., SCAN, HUE ASSN, FIT EVAL, AUX buttons in FSM Phase 3 / Conceptual P4).
        *   `.is-energized` (and `.is-selected` for ON): Applied to MAIN PWR buttons in FSM Phase 1 (Conceptual P2), and AUX buttons in FSM Phase 4 (Conceptual P5). Within `theme-dim`, CSS variable overrides ensure these adopt a "dark theme energized" visual appearance.
    *   **During `theme-dark` (FSM Phase 5 / Conceptual P6 onwards):**
        *   `.is-energized` (and `.is-selected` where appropriate): Full power, styled by `theme-dark.css` variables.

## Startup Phases (FSM States & Corresponding `startupPhaseX.js` modules)

### FSM Phase 0: System Boot & Body Fade-In (`startupPhase0.js`)
*   *(Corresponds to conceptual P0_Baseline + P1_BodyFadeIn)*
*   **Visuals:**
    *   `body` opacity animates from 0 to 1 (if auto-playing FSM). `theme-dim` active.
    *   Global dim attenuation effect starts via CSS variable `--global-dim-attenuation`, reducing overall dimness.
    *   UI elements remain very dim (`is-unlit`). Lens invisible. Dials/Dial LCDs unlit/blank. Logo very faint (~5% opacity). Control block borders/labels very faint.
*   **Terminal:** "INITIALIZING..." (flickers in, then types out).
*   **FSM:** Transitions from `IDLE` to `RUNNING_SEQUENCE.PHASE_0_BOOTING`.

### FSM Phase 1: Main Power Online (`startupPhase1.js`)
*   *(Corresponds to conceptual P2_MainPwr)*
*   **Environment:** `theme-dim`.
*   **Action:** MAIN PWR buttons (ON/OFF) flicker to their `.is-energized` state (ON button also `.is-selected`). Visually appear "dark theme energized" due to `theme-dim.css` overrides for this state.
*   **Terminal:** "MAIN POWER RESTORED... STANDBY".
*   **FSM:** `RUNNING_SEQUENCE.PHASE_1_MAIN_PWR`.

### FSM Phase 2: Optical Core Online (`startupPhase2.js`)
*   *(Corresponds to conceptual P3_Lens)*
*   **Environment:** `theme-dim`.
*   **Action:** `lensManager.energizeLensCoreStartup()` called. Lens radial gradient becomes visible, ramping to target power (e.g., 25%). `appState` for Dial B (Intensity) is synced to this power level.
*   **Terminal:** "OPTICAL CORE ENERGIZING...".
*   **FSM:** `RUNNING_SEQUENCE.PHASE_2_OPTICAL_CORE`.

### FSM Phase 3: Subsystem Priming (`startupPhase3.js`)
*   *(Corresponds to conceptual P4_PreStartPriming)*
*   **Environment:** `theme-dim`.
*   **Action:**
    1.  **Buttons (SCAN, HUE ASSN, FIT EVAL, AUX):** Flicker to `is-dimly-lit` state.
    2.  **Dials & Dial LCDs (MOOD, INTENSITY):** Become "active dim." Dials show ridges. LCDs flicker to `lcd--dimly-lit` and display initial values (Mood ~41, Intensity reflects lens power from Phase 2, e.g., ~25%).
    3.  **Terminal LCD:** Remains `lcd--dimly-lit` (set by its own flicker in this phase if not already).
    4.  **Logo:** Remains very dim.
*   **Terminal:** "SECONDARY SYSTEMS ONLINE... STANDBY."
*   **FSM:** `RUNNING_SEQUENCE.PHASE_3_SUBSYSTEM_PRIMING`.

### FSM Phase 4: Auxiliary Systems Online (`startupPhase4.js`)
*   *(Corresponds to conceptual P5_AuxLightsEnergize_Dim)*
*   **Environment:** `theme-dim`.
*   **Action:** AUX LIGHT "LOW" button flickers to `.is-energized.is-selected`, "HIGH" button to `.is-energized`. Visually "dark theme energized".
*   **Terminal:** "AUXILIARY LIGHTS ONLINE. DEFAULT: LOW."
*   **FSM:** `RUNNING_SEQUENCE.PHASE_4_AUX_SYSTEMS`.

### FSM Phase 5: Full System Activation & Ready (`startupPhase5.js`)
*   *(Corresponds to conceptual P6_ThemeTransitionAndFinalEnergize + P7_SystemReady)*
*   **Environment:** Transitions from `theme-dim` to `theme-dark`.
*   **Action (P6 part - Theme Transition & Final Energize):**
    1.  **Global Theme Transition (CSS):** `body.theme-dim` is replaced by `body.theme-dark`. Designated UI elements (panels, text, etc., tagged with `.animate-on-dim-exit`) smoothly transition their visual properties over ~1s, orchestrated by JS adding/removing helper classes (`body.is-transitioning-from-dim`).
    2.  MAIN PWR and AUX buttons (already `.is-energized`) visually adapt to the true `theme-dark` energized appearance due to CSS variable changes.
    3.  **Button Energizing:** SCAN, HUE ASSN, and FIT EVAL buttons (which were set to `is-dimly-lit` in FSM Phase 3) execute a flicker animation to their final `.is-energized` states (HUE ASSN defaults applied for selection), now styled by `theme-dark.css`.
    4.  **Terminal:** "AMBIENT THEME ENGAGED. ALL SYSTEMS NOMINAL."
*   **Action (P7 part - System Ready, occurs after P6 animations complete):**
    1.  P6 CSS transition helper classes (`.animate-on-dim-exit`, `body.is-transitioning-from-dim`) are removed.
    2.  Final ARIA attribute states for button groups are confirmed/set by `buttonManager`.
    3.  `appStateService.setAppStatus('interactive')`.
    4.  **Terminal:** "ALL SYSTEMS ONLINE. HUE 9000 READY."
*   **FSM:** `RUNNING_SEQUENCE.PHASE_5_ACTIVATION`, then transitions to `SYSTEM_READY` (final state).

---