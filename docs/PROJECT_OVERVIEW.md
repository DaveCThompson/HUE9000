# HUE 9000 Project Overview (REFACTOR-V2.3)

## 1. Project Intent & Core Concept

**High-Level Goal:** To create a visually rich, highly performant, and interactive web interface simulating a futuristic control panel, codenamed "HUE 9000."

**Core Interaction:** Users manipulate controls (dials, buttons) to change various "hue" and "intensity" parameters. These interactions dynamically affect the visual appearance of the interface elements, including global environment ambiance, UI accents, LCD screen colors, button illumination, and a central "lens" display. JavaScript modules will provide console logging to trace state changes and UI updates.

**Aesthetic:** Retro-futuristic with skeuomorphic tendencies (realistic textures, lighting, depth, and tactile feedback), realized through modern web technologies. Emphasis is on **smooth, responsive animations** and immediate visual feedback to user input. The experience should feel polished and immersive.

**Key Visual Centerpiece:** The dynamic "lens" display. Its appearance, including a complex radial gradient and an outer glow, changes dramatically based on an "intensity" or "power" value (controlled by Dial B). Its core color (hue) is controlled by the "MOOD" dial (Dial A). This component's visual updates are managed independently and should not be affected by global theme opacity modifiers for its core and glow.

**Startup Sequence:**
The interface "powers on" with a choreographed, multi-phase sequence. `body` starts with `theme-dim` active. Elements are initially unpowered or in a very dim state. The sequence includes:
*   **Initial Phases (P0-P1):** Body fades in. UI elements remain very dim. Dials and their LCDs are unlit/blank.
*   **Power & Core Activation (P2-P3):** Main Power buttons energize with a flicker effect (appearing as "dark theme energized" within the `theme-dim` environment). The central Lens activates, its radial gradient becoming visible and energizing.
*   **System Priming (P4):** Secondary buttons (SCAN, HUE ASSN, FIT EVAL, AUX) transition to a `is-dimly-lit` state. Dials and their LCDs become "active dim," showing ridges and initial values.
*   **Full Energization & Theme Transition (P5/P6 in revised sequence):** A global CSS transition occurs as the `body` theme shifts from `theme-dim` to `theme-dark`. Concurrently, previously `is-dimly-lit` buttons (SCAN, HUE ASSN, FIT EVAL) flicker to their final, fully energized states, now styled by `theme-dark`. **This flicker sequence is initiated at the correct point in P6 after the theme change has begun processing.**
*   **System Ready (P6/P7 in revised sequence):** All systems are declared online, and the UI becomes fully interactive.
(Full details in `STARTUP_SEQUENCE.md`)

## 2. Architecture & Key Technologies (REFACTOR-V2.3)

**Frontend:** HTML5, CSS3, JavaScript (ES Modules).

**Styling (Refactored Approach):**
*   **CSS Custom Properties (Variables):** The primary mechanism for all theming and dynamic styling.
    *   `src/css/core/_variables-structural.css`: Defines non-themeable variables.
    *   `src/css/core/_variables-theme-contract.css`: **Crucial file.** Declares all themeable CSS variable *names* with defaults.
    *   `src/css/themes/theme-*.css`: Override variables from the theme contract.
*   **OKLCH Color Space:** Preferred.
*   **CSS Organization (Modular):** `core/`, `themes/`, `components/`, `animations/`, `utilities/` subdirectories under `src/css/`.

**JavaScript Modules (all in `src/js/`):**
*   **Core State & Config:** `appState.js`, `config.js`.
*   **UI Components (New in V2.3):**
    *   `Button.js`: Manages individual button state, appearance, and animations.
    *   `Dial.js`: Manages individual dial state, rendering, and interactions.
*   **Managers (Orchestration):**
    *   `buttonManager.js`: Discovers and orchestrates `Button.js` instances. Manages group behaviors.
    *   `dialManager.js`: Discovers and orchestrates `Dial.js` instances. Handles global dial operations.
    *   `gridManager.js`: Manages Hue Assignment Grid buttons.
    *   `lensManager.js`: Manages the central lens display visuals.
    *   `toggleManager.js`: Manages toggle button groups (MAIN PWR, AUX LIGHT).
    *   `uiUpdater.js`: Handles global UI updates (themes, LCDs, dynamic CSS variables).
    *   `startupSequenceManager.js`: Orchestrates the GSAP-driven startup sequence.
    *   `debugManager.js`: Manages the debug panel UI and logic.
*   **Utilities:** `utils.js`.
(All modules include console logging for key operations).

**Animation & Interaction:**
*   **GSAP:** Core to startup sequence, dial dragging, lens smoothing, button light flickers.
*   **CSS Transitions:** Used for smooth visual changes when theme variables update and for specific state changes (e.g., buttons fading to `is-dimly-lit`, global theme transition).

## 3. Core Principles & Design Intentions (Preservation Areas)

*   Modular Design, State-Driven UI, Performant CSS Custom Properties, OKLCH Color Space.
*   **Visual Fidelity & Smoothness.**
*   Accessibility.
*   Dynamic Lens Gradient & Logic (exempt from global theme opacity for core/glow).
*   **Hue Assignment System.**
*   **Button Visuals & States:** Clear distinction between states: `is-unlit`, `is-dimly-lit`, `.is-energized` (selected/unselected, with `theme-dim` overrides for MAIN PWR/AUX), `is-pressing`, and flickering effects.
*   **Startup Sequence:** The multi-phase `theme-dim` to Full power-on sequence.


## 5. Key Performance Learnings & Optimizations Implemented

*   TO BE ADDED AS NEEDED


## 6. Future Development & Performance Considerations

*   The main terminal LCD will become increasingly interactive and more complex.