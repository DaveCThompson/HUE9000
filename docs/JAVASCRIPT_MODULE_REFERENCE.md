# HUE 9000 JavaScript Module Reference (Project Decouple - V2.3 Refined)

This document provides a high-level overview of each JavaScript module in the refactored HUE 9000 project.

---

### Core & Configuration

#### `main.js`
*   **@module main:** Entry point and application orchestrator.
*   **Core Responsibilities:**
    *   Orchestrates the `preloader` sequence.
    *   Initializes and registers all managers with the `serviceLocator`.
    *   Sets up top-level event listeners (e.g., for `buttonInteracted`, ensuring sounds like `buttonPress` use `forceRestart: true` for responsiveness).
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
*   **Core Responsibilities:**
    *   Manages its own state (`_isSelected`), applies CSS classes to reflect its visual state.
    *   Its `setState` method carefully handles GSAP's `clearProps` when called from flicker animation completions (especially for P7 Hue Assignment buttons during startup). This is to preserve GSAP-set opacity on light elements for a consistent appearance, using selective clearing like `clearProps: "transform,filter"` instead of `clearProps: "all"` on lights in specific contexts.
    *   Conditionally skips its `playStateTransitionEcho` method (e.g., for the P7 Hue Assignment button grid during startup) to prevent visual clutter from many overlapping echo animations.
*   **Key Interactions:** Instantiated and managed by `buttonManager`. Directly uses `appStateService` and `configModule` passed via its constructor.
*   **Troubleshooting Tip:** If buttons appear visually inconsistent after a flicker animation, investigate the `clearProps` logic in `setState` for that context and ensure the final CSS state aligns with the GSAP animation's end-state, particularly for opacity and glow.

#### `DialController.js`
*   **@module DialController:** Represents a single, individual rotary dial component rendered via SVG.
*   **Core Responsibilities:**
    *   Manages the dynamic rendering of its SVG ridges to create a 3D effect and handles user drag interactions.
    *   Updates its appearance by *directly subscribing to and reacting to* theme (`themeChanged`) and environment color (`targetColorChanged` for 'env') changes in `appState`, making it self-sufficient for theme updates.
*   **Key Interactions:** Instantiated and managed by `dialManager`.
*   **Critical Note for Developers (CSS Variable Parsing):**
    *   When `DialController.js` reads CSS custom properties (e.g., for ridge colors like `--dial-ridge-c`) using `parseFloat()`, these CSS variables **must** contain plain numeric values in the theme CSS files (`theme-dim.css`, `theme-dark.css`, `theme-light.css`).
    *   **Do not use `calc()` or other CSS functions** within these specific variables. `parseFloat()` cannot parse such strings and will return `NaN`, leading to rendering failures (e.g., black or incorrectly colored dials).
    *   Perform any necessary calculations (e.g., halving a chroma value) on the JavaScript side within `DialController._updateAndCacheThemeStyles` *after* parsing the clean numeric value from CSS.

#### `MoodMatrix.js` & `IntensityDisplay.js`
*   **@module MoodMatrix, IntensityDisplay:** Self-contained presentational components for the V2 displays.
*   **Core Responsibilities:** Create and manage their own internal DOM. Update their visuals based on props passed from their respective managers (`MoodMatrixManager`, `IntensityDisplayManager`). They have no direct knowledge of global application state.
*   **Key Interactions:** Instantiated and managed by `MoodMatrixManager` and `IntensityDisplayManager`.

---

### Manager & Controller Classes (Orchestration)

#### `AudioManager.js`
*   **@module AudioManager:** Manages all application audio using Howler.js.
*   **Core Responsibilities:**
    *   Preloads sounds using conceptual keys (e.g., `terminalBoot`, `itemAppear`) mapped to MP3 files.
    *   Handles playback, respects volume settings from `config.js`, manages looping.
    *   Unlocks audio context on first user interaction.
    *   Includes an internal sound queuing mechanism for sounds whose `play()` method is called before they are fully loaded.
    *   The `play(key, forceRestart = false, ...)` method's `forceRestart` parameter is important for re-triggering short sounds during rapid UI interactions or specific startup sequence events to ensure auditory feedback.
*   **Preloading Note:** While `AudioManager` initiates loading for all sounds defined in `config.js`, only a subset (specified in `PRELOADER_ASSETS` in `config.js` and processed by `preloader.js`) is *actively waited for* by the preloader's visual progress. Other sounds load asynchronously in the background. If a crucial early startup sound is not part of this preloader-waited set and experiences variable load times, it might lead to perceived timing inconsistencies.

#### `buttonManager.js`
*   **@module buttonManager:** Orchestrates all `Button` instances.
*   **Core Responsibilities:** Discovers buttons, creates `Button` instances, manages group behaviors. Triggers interactive sounds (e.g., `auxModeChange`, `buttonPress` via `AudioManager`), ensuring `forceRestart: true` is used for `buttonPress` from `main.js` for better responsiveness. Provides `playFlickerToState` for complex animations, which now conditionally manages whether `Button.playStateTransitionEcho` is invoked (e.g., skipping it for P7 Hue Assignment buttons during startup to prevent visual overload). Emits `buttonInteracted` to `appState`.
*   **Key Interactions:** Uses `appState` (imported directly) for some internal logic checks (like `getCurrentStartupPhaseNumber` for conditional echo logic within `playFlickerToState`'s `onTimelineComplete` callback).

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
    *   During the startup sequence, `PhaseRunner` is the primary controller of LCD states. Post-startup (when `appStatus` is `'interactive'`), `LcdUpdater` applies the correct final state and enables continuous resonance effect on the main terminal.
*   **Troubleshooting Tip:** If LCDs flash unexpectedly during startup, it might be a conflict between `LcdUpdater`'s reactive updates and `PhaseRunner`'s procedural commands. Ensure `LcdUpdater` is passive during startup.

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
*   **Core Responsibilities:** Provides global, continuously animated CSS variables (`--harmonic-resonance-glow-opacity`, `--harmonic-resonance-glow-scale`) that are consumed by CSS to create "breathing" effects on buttons and LCD text. It only applies effects to buttons that have the `ELIGIBILITY_CLASS` (typically `is-energized`) and when the app is `'interactive'`.

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
*   **Core Responsibilities:** Displays a thematic loading screen, orchestrates the loading of critical assets (fonts, specific audio files, SVGs), and waits for a user interaction (`[ ENGAGE ]`) before allowing the main application to initialize. Does *not* autoplay sounds.

#### `startupSequenceManager.js`
*   **@module startupSequenceManager:** Manages the application startup sequence using an XState machine.
*   **Core Responsibilities:** Initializes and runs the `startupMachine`, provides dependencies (GSAP, managers, config, etc.) to the FSM's context, and exposes an API for debug controls. Calls `_resetVisualsAndState` to set the initial P0 state.
*   **XState v5 Critical Note:** This manager (and `startupMachine.js`) uses XState v5. Refer to v5 documentation for API details (e.g., `fromPromise`, actor subscription, event/context signatures in guards/actions).

#### `startupMachine.js`
*   **@module startupMachine:** Defines the XState Finite State Machine for the startup sequence.
*   **Core Responsibilities:** Defines all states and transitions, and invokes the `PhaseRunner` for each phase using `fromPromise` with `phaseRunnerService`.
*   **XState v5 Critical Note:** Adheres to XState v5 patterns.

#### `PhaseRunner.js`
*   **@module PhaseRunner:** A generic executor for declarative startup phase configurations.
*   **Core Responsibilities:**
    *   Parses a phase config object (`startupPhaseX.js`) and builds a GSAP timeline dynamically.
    *   Handles timing of animations (including sounds via `type: 'audio'`) based on their `position` property. For audio, it passes the `forceRestart` property from the phase config to `AudioManager.play()`.
    *   Manages `specialTerminalFlicker` for Phase 1.
    *   Orchestrates all procedural state changes for components during the startup sequence.
    *   Ensures the GSAP timeline for a phase meets the `duration` specified in the phase config by padding if necessary. This is crucial for reliable scheduling of events within the phase.
    *   Returns a promise that resolves on completion of the phase's main GSAP timeline.
*   **Key Interactions:** Uses `appStateModule` (imported directly) for some logging. Invokes methods on various managers (`buttonManager`, `lcdUpdater`, `audioManager`, etc.) as defined by phase configs.
*   **Troubleshooting Tip:** If a startup phase seems to hang or sounds within it don't play, check the `[PhaseRunner ... P6_TL_DEBUG]` (or similar for other phases) logs to ensure the phase timeline duration is as expected and that sound scheduling logs appear.

#### `startupPhase[0-11].js`
*   **@module startupPhaseX:** A series of modules, each exporting a single, declarative configuration object that defines all animations and actions for that phase.
*   **Key Properties:**
    *   `phase`: Numeric identifier.
    *   `name`: Descriptive name.
    *   `duration`: Target duration for the phase (seconds). `PhaseRunner` will pad the GSAP timeline if its content is shorter.
    *   `terminalMessageKey` or `specialTerminalFlicker`/`message`: For terminal output.
    *   `animations`: An array of animation/action objects.
        *   `type`: e.g., 'tween', 'flicker', 'lcdPowerOn', 'call', 'lensEnergize', 'audio'.
        *   `target`: DOM element key (from `domElementsRegistry`), button group ID, or special proxy name.
        *   `position`: GSAP timeline position string/number.
        *   Specific properties per type (e.g., `soundKey`, `forceRestart` for audio; `profile`, `state` for flicker).
*   **Audio Note:** For `type: 'audio'` animations, include `forceRestart: true` to ensure sounds play reliably, especially if the same `soundKey` might have been used in a preceding phase.