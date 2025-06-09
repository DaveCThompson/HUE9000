# HUE 9000 JavaScript Module Reference (Project Decouple - V2.0)

This document provides a high-level overview of each JavaScript module in the refactored HUE 9000 project.

---

### Core & Configuration

#### `main.js`
*   **@module main:** Entry point and application orchestrator.
*   **Core Responsibilities:**
    *   Initializes and registers all managers with the `serviceLocator`.
    *   Sets up top-level event listeners (e.g., for `buttonInteracted`) to handle application-wide side-effects.
    *   Starts the `startupSequenceManager`.
*   **Key Interactions:** Instantiates and initializes nearly every other manager.

#### `appState.js`
*   **@module appState:** Manages the central, authoritative application state.
*   **Core Responsibilities:** Holds all shared state data, provides getters/setters, and emits events on state changes.
*   **Key Interactions:** Interacted with by almost every module.

#### `config.js`
*   **@module config:** Defines shared, static configuration constants (animation parameters, data structures, flicker profiles, etc.).
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

#### `Dial.js`
*   **@module Dial:** Represents a single, individual rotary dial component.
*   **Core Responsibilities:** Manages the rendering of its canvas, handles user drag interactions, and updates its appearance based on theme and state.
*   **Key Interactions:** Instantiated and managed by `dialManager`.

#### `MoodMatrix.js` & `IntensityDisplay.js`
*   **@module MoodMatrix, IntensityDisplay:** Self-contained presentational components for the V2 displays.
*   **Core Responsibilities:** Create and manage their own internal DOM. Update their visuals based on props passed from their respective managers. They have no knowledge of global application state.
*   **Key Interactions:** Instantiated and managed by `MoodMatrixManager` and `IntensityDisplayManager`.

---

### Manager & Controller Classes (Orchestration)

#### `buttonManager.js`
*   **@module buttonManager:** Orchestrates all `Button` instances.
*   **Core Responsibilities:** Discovers buttons, creates `Button` instances, manages group behaviors (radio/toggle deselection), and provides an API for complex animations (`playFlickerToState`). Emits `buttonInteracted` to `appState`.

#### `dialManager.js`
*   **@module dialManager:** Orchestrates all `Dial` instances.
*   **Core Responsibilities:** Discovers dial containers, creates `Dial` instances, and provides global methods like `resizeAllCanvases`.

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
*   **Core Responsibilities:** Manages a message queue, handles the "typing" effect, manages the cursor, and scrolls content.

#### `AmbientAnimationManager.js`
*   **@module AmbientAnimationManager:** Manages continuous, ambient animations for UI elements.
*   **Core Responsibilities:** Provides global, continuously animated CSS variables (`--harmonic-resonance-glow-opacity`, `--harmonic-resonance-glow-scale`) that are consumed by CSS to create "breathing" effects on buttons and LCD text.

#### `MoodMatrixManager.js` & `IntensityDisplayManager.js`
*   **@module MoodMatrixManager, IntensityDisplayManager:** Bridge the gap between `appState` and their respective presentational components.
*   **Core Responsibilities:** Subscribe to `appState` events (e.g., `dialUpdated`), process the data, and pass simplified props to their `MoodMatrix` or `IntensityDisplay` instance via the `.update()` method. Also manage the interaction-based resonance for their specific displays.

#### `resistiveShutdownController.js`
*   **@module resistiveShutdownController:** Orchestrates the resistive shutdown sequence.
*   **Core Responsibilities:** Listens for `resistiveShutdownStage` changes in `appState` and triggers all corresponding UI effects (terminal messages, lens animations, button flickers).

---

### Startup Sequence

#### `startupSequenceManager.js`
*   **@module startupSequenceManager:** Manages the application startup sequence using an XState machine.
*   **Core Responsibilities:** Initializes and runs the `startupMachine`, provides dependencies, and exposes an API for debug controls.

#### `startupMachine.js`
*   **@module startupMachine:** Defines the XState Finite State Machine for the startup sequence.
*   **Core Responsibilities:** Defines all states and transitions, and invokes the `PhaseRunner` for each phase.

#### `PhaseRunner.js`
*   **@module PhaseRunner:** A generic executor for declarative startup phase configurations.
*   **Core Responsibilities:**
    *   Parses a phase config object and builds a GSAP timeline dynamically from it.
    *   Orchestrates all procedural state changes for components during the startup sequence, acting as the **single source of truth** for animations and state until the sequence completes.
    *   Returns a promise that resolves on completion of the phase timeline.

#### `startupPhase[0-11].js`
*   **@module startupPhaseX:** A series of modules, each exporting a single, declarative configuration object that defines all animations and actions for that phase.