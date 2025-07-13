Excellent. This is a crucial addition for a satisfying conclusion to the sequence. Here is the complete, updated specification incorporating the third and final flicker-to-deactivation stage.

---

### **PRD: Resistive Shutdown Visual Enhancement v1.3**

**1. Overview**

This document outlines requirements to enhance the "Resistive Shutdown" sequence. The goal is to create an immersive user experience by implementing a dramatic, multi-stage flicker on the "OFF" button, synchronized with a system-wide color alert that culminates in the button's deactivation.

**2. Problem & Goal**

*   **Problem:** The current shutdown feedback is a simple blink that lacks narrative weight and fails to convey the system's "resistive" nature through its escalating stages.
*   **Goal:** Implement a three-stage visual feedback loop where each button press intensifies the response, culminating in a final, critical alert and the button's deactivation.

**3. Scope**

*   **Part 1: Multi-Stage Button Flicker (In Scope)**
    *   **1.1:** The "OFF" button's animation will be a multi-pulse flicker.
    *   **1.2:** The flicker will use escalating, high-contrast colors for each stage: **Yellow -> Orange -> Red**.
    *   **1.3:** The third and final flicker will resolve with the button settling into its "permanently disabled" visual state.

*   **Part 2: System-Wide Alert State (In Scope)**
    *   **2.1:** In sync with each button flicker, the entire UI's color theme will temporarily flash to the corresponding alert color (Yellow, Orange, Red).
    *   **2.2:** After a brief duration, the UI colors will revert to their original user-selected settings.

*   **Out of Scope:**
    *   Physical jitter/shake animations, audio changes, or modifications to the core number of stages (which is now defined as 3).

---

### **UX/UI Specification**

**1. User Experience**

*   **User Flow:**
    1.  User clicks "OFF" button (1st time) -> **Yellow** flicker on button + **Yellow** system-wide flash.
    2.  User clicks "OFF" button (2nd time) -> **Orange** flicker on button + **Orange** system-wide flash.
    3.  User clicks "OFF" button (3rd time) -> **Red** flicker on button + **Red** system-wide flash. The button then becomes visually disabled.

*   **Visual Feel:** The sequence builds tension. The final red flash acts as a critical warning and a definitive conclusion, confirming the system's refusal to shut down.

**2. UI Design**

*   **Button Flicker Animation:** Each stage uses a multi-pulse flicker (3-5 flashes). The final stage may be slightly faster or more intense to signify finality.

*   **System-Wide Alert Colors:**
    *   **Stage 1 (Yellow):** `oklch(0.8 0.22 90)`
    *   **Stage 2 (Orange):** `oklch(0.75 0.25 55)`
    *   **Stage 3 (Red):** `oklch(0.7 0.28 25)`

---

### **Architecture Specification (Complete Plan)**

**1. CSS (`_button-unit.css`)**

*   **Action:** Add a new class rule for the final stage's flash color.

    ```css
    /* ADD THIS NEW RULE */
    .button-unit.is-flashing-tint-red::before {
        background-color: oklch(0.7 0.28 25 / 0.6);
    }
    .button-unit.is-flashing-tint-red {
        border-color: oklch(0.7 0.28 25 / 0.8);
    }
    .button-unit.is-flashing-tint-red .light {
        background-color: oklch(0.7 0.28 25);
    }
    ```

**2. Configuration (`config/index.js`)**

*   **Action:** Update the main `RESISTIVE_SHUTDOWN_PARAMS` constant.

    ```javascript
    export const RESISTIVE_SHUTDOWN_PARAMS = {
        MAX_STAGE: 3, // UPDATE from 2 to 3
        // ... STAGE_1 and STAGE_2 remain as previously defined ...

        // ADD THIS ENTIRE NEW STAGE_3 OBJECT
        STAGE_3: {
            TERMINAL_MESSAGE_KEY: 'RESIST_REFUSAL', // Assumes this key exists in terminalMessages.js
            BUTTON_FLASH_PROFILE_NAME: 'resistiveShutdownStage3',
            BUTTON_FLASH_GLOW_COLOR: 'oklch(0.7 0.28 25)',
            BUTTON_TINT_CLASS: 'is-flashing-tint-red',
            HUE_ASSIGN_TARGET_HUE: 25, // Red
        }
    };
    ```

*   **Action:** Add a new flicker profile to the `ADVANCED_FLICKER_PROFILES` constant.

    ```javascript
    // In ADVANCED_FLICKER_PROFILES
    // ADD THIS NEW PROFILE
    resistiveShutdownStage3: {
        numCycles: 6, // More cycles for more intensity
        periodStart: 0.1, periodEnd: 0.05, // Faster than previous stages
        onDurationRatio: 0.5,
        amplitudeStart: 1.0, amplitudeEnd: 1.0,
        targetProperty: 'button-lights-and-frame',
    },
    ```

**3. Controller (`resistiveShutdownController.js`)**

*   **Action:** Modify the `handleStageChange` method to correctly handle the final stage.

    ```javascript
    // In resistiveShutdownController.js -> handleStageChange method

    handleStageChange({ newStage }) {
        if (newStage === 0) {
            // ... (no changes to this block)
            return;
        }

        const stageKey = `STAGE_${newStage}`;
        const stageParams = RESISTIVE_SHUTDOWN_PARAMS[stageKey];
        if (!stageParams) return;

        if (stageParams.TERMINAL_MESSAGE_KEY) {
            appState.emit('requestTerminalMessage', { /* ... */ });
        }

        // Determine the final state *after* the flicker completes.
        const targetState = newStage === RESISTIVE_SHUTDOWN_PARAMS.MAX_STAGE
            ? ButtonStates.PERMANENTLY_DISABLED
            : 'is-energized is-selected'; // The button is visually selected during the sequence

        if (stageParams.BUTTON_FLASH_PROFILE_NAME) {
            this.buttonManager.playFlickerToState(this.buttonManager.mainPowerOffButtonInstance.element, targetState, {
                profileName: stageParams.BUTTON_FLASH_PROFILE_NAME,
                tempGlowColor: stageParams.BUTTON_FLASH_GLOW_COLOR,
                tempTintColorClass: stageParams.BUTTON_TINT_CLASS,
                isButtonSelectedOverride: true
            });
        }
        
        // System-wide alert logic (no changes needed, it works based on stageParams)
        const originalColors = this._triggerSystemWideAlert(stageParams);
        if (newStage < RESISTIVE_SHUTDOWN_PARAMS.MAX_STAGE) {
            setTimeout(() => {
                this._revertToOriginalColors(originalColors);
            }, 400);
        }
        // NOTE: On the final stage, we DO NOT revert the colors. The red alert state persists.

        // If this is the final stage, also update the app state to formally disable the button logic.
        if (newStage === RESISTIVE_SHUTDOWN_PARAMS.MAX_STAGE) {
            appState.setIsMainPowerOffButtonDisabled(true);
        }
    }
    ```
    *Self-Correction:* The original logic for reverting colors needs a small adjustment. We should *not* revert the colors on the final stage, letting the UI remain in the red "alert" state to signify the system's final refusal. The code above reflects this.