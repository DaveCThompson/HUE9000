# HUE 9000 JavaScript Module Reference (Project Decouple - V2.1)

This document provides a high-level overview of each JavaScript module in the refactored HUE 9000 project.

---

### Core & Configuration

#### `main.js`
*   **@module main:** Entry point and application orchestrator.
*   **Core Responsibilities:**
    *   Orchestrates the `preloader` sequence.
    *   Initializes and registers all managers with the `serviceLocator`.
    *   Sets up top-level event listeners (e.g., for `buttonInteracted`).
    *   Starts the `startupSequenceManager` after the preloader completes.
*   **Key Interactions:** Instantiates and initializes nearly every other manager.

#### `appState.js`
*   **@module appState:** Manages the central, authoritative application state.
*   **Core Responsibilities:** Holds all shared state data, provides getters/setters, and emits events on state changes.
*   **Key Interactions:** Interacted with by almost every module.

#### `config.js`
*   **@module config:** Defines shared, static configuration constants (animation parameters, audio settings including volumes and cooldowns, flicker profiles, startup phase L-reduction factors, etc.).
*   **Key Interactions:** Imported by nearly every module to retrieve constant values.

#### `serviceLocator.js`
*   **@module serviceLocator:** A simple Inversion of Control (IoC) container.
*   **Core Responsibilities:** Provides `register(name, service)` and `get(name)` methods to manage and provide access to shared manager instances, breaking direct import dependencies.
*   **Key Interactions:** Used by `main.js` to register all services and by all managers in their `init()` methods to retrieve dependencies.

#### `utils.js`
*   **@module utils:** Provides common, reusable utility functions (`debounce`, `clamp`, etc.).

---

### UI Component Classes

#### `Button.js`
*   **@module Button:** Represents a single, individual UI button component.
*   **Core Responsibilities:** Manages its own state (`_isSelected`), applies CSS classes to reflect its visual state, and handles its own ambient animations.
*   **Key Interactions:** Instantiated and managed by `buttonManager`.

#### `DialController.js`
*   **@module DialController:** Represents a single, individual rotary dial component rendered via SVG.
*   **Core Responsibilities:** Manages the dynamic rendering of its SVG ridges to create a 3D effect, handles user drag interactions, and updates its appearance by subscribing to theme and color changes in `appState`.
*   **Key Interactions:** Instantiated and managed by `dialManager`.

#### `MoodMatrix.js` & `IntensityDisplay.js`
*   **@module MoodMatrix, IntensityDisplay:** Self-contained presentational components for the V2 displays.
*   **Core Responsibilities:** Create and manage their own internal DOM. Update their visuals based on props passed from their respective managers. They have no knowledge of global application state.
*   **Key Interactions:** Instantiated and managed by `MoodMatrixManager` and `IntensityDisplayManager`.

---

### Manager & Controller Classes (Orchestration)

#### `AudioManager.js`
*   **@module AudioManager:** Manages all application audio using Howler.js.
*   **Core Responsibilities:** Preloads sounds (using conceptual keys like `terminalBoot`, `itemAppear`, `buttonEnergize`, `lcdPowerOn`, `lensStartup`, `themeEngage`, `auxModeChange`, `buttonPress`, etc., which map to actual MP3 files). Handles playback for UI interactions and background music, respects volume settings from `config.js`, manages looping sounds, and responds to application state changes. Unlocks the audio context on first user interaction.

#### `buttonManager.js`
*   **@module buttonManager:** Orchestrates all `Button` instances.
*   **Core Responsibilities:** Discovers buttons, creates `Button` instances, manages group behaviors (radio/toggle deselection), triggers interactive sounds (e.g., `auxModeChange`, `buttonPress` via `AudioManager`), and provides an API for complex animations (`playFlickerToState`). Emits `buttonInteracted` to `appState`.

#### `dialManager.js`
*   **@module dialManager:** Orchestrates all `DialController` instances.
*   **Core Responsibilities:** Discovers dial containers, injects the base SVG markup, and creates `DialController` instances.

#### `ThemeManager.js`
*   **@module ThemeManager:** Manages global UI theme changes.
*   **Core Responsibilities:** Subscribes to `appState.themeChanged` and updates the `<body>` class accordingly.

#### `LcdUpdater.js`
*   **@module LcdUpdater:** Manages the visual state of all LCD screens.
*   **Core Responsibilities:**
    *   Handles `unlit`, `dimly-lit`, and `active` states for LCD containers.
    *   Provides an API (`getLcdPowerOnTimeline`) for `PhaseRunner` to create flicker animations during startup.
    *   When the application is interactive, it applies the correct final state based on `appStatus` and enables the continuous resonance effect on the main terminal.

#### `DynamicStyleManager.js`
*   **@module DynamicStyleManager:** Manages dynamic CSS custom properties.
*   **Core Responsibilities:** Updates CSS variables for hue assignments (`--dynamic-env-hue`, etc.) and the UI accent color. Also handles injecting the logo SVG.

#### `lensManager.js`
*   **@module lensManager:** Manages all aspects of the central lens visual.
*   **Core Responsibilities:** Updates the lens's complex radial gradient, manages power smoothing and idle oscillation, and responds to the resistive shutdown sequence.

#### `terminalManager.js`
*   **@module terminalManager:** Manages the terminal display.
*   **Core Responsibilities:** Manages a message queue, handles the "typing" effect, manages the cursor, and scrolls content. `playStartupFlicker()` method provides the special flicker animation for Phase 1.

#### `AmbientAnimationManager.js`
*   **@module AmbientAnimationManager:** Manages continuous, ambient animations for UI elements.
*   **Core Responsibilities:** Provides global, continuously animated CSS variables (`--harmonic-resonance-glow-opacity`, `--harmonic-resonance-glow-scale`) that are consumed by CSS to create "breathing" effects on buttons and LCD text.

#### `MoodMatrixManager.js` & `IntensityDisplayManager.js`
*   **@module MoodMatrixManager, IntensityDisplayManager:** Bridge the gap between `appState` and their respective presentational components.
*   **Core Responsibilities:** Subscribe to `appState` events (e.g., `dialUpdated`), process the data, and pass simplified props to their `MoodMatrix` or `IntensityDisplay` instance via the `.update()` method. Also manage the interaction-based resonance for their specific displays.

#### `resistiveShutdownController.js`
*   **@module resistiveShutdownController:** Orchestrates the resistive shutdown sequence.
*   **Core Responsibilities:** Listens for `resistiveShutdownStage` changes in `appState` and triggers all corresponding UI effects (terminal messages, lens animations, button flickers).

#### `sidePanelManager.js`
*   **@module sidePanelManager:** Manages the UI and interactions for the left and right side panels.
*   **Core Responsibilities:** Handles panel expansion/collapse, tab switching, and populating panel content (e.g., audio controls, sequence list).

---

### Startup & Preloader

#### `preloader.js`
*   **@module preloader:** Handles the initial "cold boot" loading sequence.
*   **Core Responsibilities:** Displays a thematic loading screen, orchestrates the loading of critical assets (fonts, audio, SVGs), and waits for a user interaction (`[ ENGAGE ]`) before allowing the main application to initialize.

#### `startupSequenceManager.js`
*   **@module startupSequenceManager:** Manages the application startup sequence using an XState machine.
*   **Core Responsibilities:** Initializes and runs the `startupMachine`, provides dependencies, and exposes an API for debug controls (used by `sidePanelManager`).

#### `startupMachine.js`
*   **@module startupMachine:** Defines the XState Finite State Machine for the startup sequence.
*   **Core Responsibilities:** Defines all states and transitions, and invokes the `PhaseRunner` for each phase.

#### `PhaseRunner.js`
*   **@module PhaseRunner:** A generic executor for declarative startup phase configurations.
*   **Core Responsibilities:**
    *   Parses a phase config object and builds a GSAP timeline dynamically from it. Handles timing of animations (including sounds via `type: 'audio'`) based on their `position` property.
    *   Manages `specialTerminalFlicker` for Phase 1, ensuring its visual timeline starts at T=0 of the phase.
    *   Orchestrates all procedural state changes for components during the startup sequence.
    *   Returns a promise that resolves on completion of the phase timeline.

#### `startupPhase[0-11].js`
*   **@module startupPhaseX:** A series of modules, each exporting a single, declarative configuration object that defines all animations (including sound triggers with specific `position` values for timing) and actions for that phase. Durations are set to achieve a rhythmic overall sequence.