# HUE 9000 JavaScript Module Reference (Project Decouple - V2.3 Refined)

This document provides a high-level overview of each JavaScript module in the refactored HUE 9000 project.

---

### Core & Configuration

#### `main.js`
*   **@module main:** Entry point and application orchestrator.
*   **Core Responsibilities:**
    *   Orchestrates the `preloader` sequence.
    *   Dynamically creates the buttons for the Hue Assignment grid and registers them with the `buttonManager` on desktop.
    *   Initializes and registers all managers with the `serviceLocator`.
    *   Sets up top-level event listeners, most notably for `buttonInteracted`. This listener acts as a central hub, translating UI interactions into `appState` changes (e.g., setting the theme, updating target color properties, initiating the resistive shutdown sequence) and triggering context-appropriate sounds. For direct interactions, it ensures sounds like `buttonPress` use `forceRestart: true` for responsiveness.
    *   Starts the `startupSequenceManager` after the preloader completes.
*   **Key Interactions:** Instantiates and initializes nearly every other manager.

#### `DOMManager.js`
*   **@module DOMManager:** Centralizes DOM element selections.
*   **Core Responsibilities:** Queries the DOM on initialization to find all key elements and registers itself as `domElements` with the `serviceLocator`. This provides a single, consistent source for DOM references across the application, improving maintainability.
*   **Key Interactions:** Instantiated once in `main.js`. Used by almost every other manager to access DOM elements.

#### `appState.js`
*   **@module appState:** Manages the central, authoritative application state.
*   **Core Responsibilities:**
    *   Holds all shared state data, provides getters/setters, and emits events on state changes.
    *   Manages the state for the resistive shutdown sequence via `resistiveShutdownStage` and `isMainPowerOffButtonDisabled`.
    *   Provides a global event bus via exported `subscribe` and `emit` functions, which wrap an internal `EventEmitter`.
    *   Exports `resetAppStateToDefaults()`, a crucial function for the startup sequence reset logic.
*   **Key Interactions:** Interacted with by almost every module.

#### `config/index.js`
*   **@module config:** The central export hub for all configuration constants.
*   **Core Responsibilities:** This module imports from all other files in the `config/` directory (e.g., `animations.js`, `audio.js`, `sequences.js`) and re-exports them. This allows other parts of the application to import all configuration from a single, convenient location.
*   **Key Interactions:** Imported by nearly every module to retrieve constant values.

#### `serviceLocator.js`
*   **@module serviceLocator:** A simple Inversion of Control (IoC) container.
*   **Core Responsibilities:** Provides `register(name, service)` and `get(name)` methods to manage and provide access to shared manager instances, breaking direct import dependencies.
*   **Key Interactions:** Used by `main.js` to register all services and by all managers in their `init()` methods to retrieve dependencies.

#### `EventEmitter.js`
*   **@module EventEmitter:** A simple, generic event emitter (pub/sub) class.
*   **Core Responsibilities:** Provides `subscribe(eventName, listener)` and `emit(eventName, payload)` methods for event-driven communication.
*   **Key Interactions:** Used internally by `AudioManager` (to announce `soundLoaded`) and `appState` (as its core eventing mechanism).

---

### Utilities

#### `utils.js`
*   **@module utils:** Provides common, reusable utility functions (`debounce`, `clamp`, etc.).

#### `animationUtils.js`
*   **@module animationUtils:** A utility module for creating complex, reusable animations.
*   **Core Responsibilities:**
    *   Exports `createAdvancedFlicker`, a powerful function for generating detailed flicker and glow effects.
    *   Animations are defined by named profiles in `config/flickerProfiles.js` or by passing a parameter object.
*   **Key Interactions:** Used by `buttonManager`, `LcdUpdater`, and `terminalManager` to create their flicker effects. Reads animation profiles from `config/flickerProfiles.js`.

#### `terminalMessages.js`
*   **@module terminalMessages:** Central repository for all terminal message content and logic.
*   **Core Responsibilities:**
    *   Exports the `getMessage` function, which retrieves message strings.
    *   Can generate dynamic messages by substituting placeholders with data from the current `appState` (e.g., `{dialAHue}`, `{currentTheme}`).
    *   Manages verbosity logic for repeated interactions to provide varied responses.
*   **Key Interactions:** Used exclusively by `terminalManager`. Reads data from `appState` and `config/ui.js` to populate dynamic messages.

---

### UI Component Classes

#### `Button.js`
*   **@module Button:** Represents a single, individual UI button component.
*   **Core Responsibilities:**
    *   Manages its own state (`_isSelected`), applies CSS classes to reflect its visual state.
    *   Its `setState` method carefully handles GSAP's `clearProps` when called from flicker animation completions. This is to preserve GSAP-set opacity on light elements for a consistent appearance.
    *   Its `playStateTransitionEcho` method can be invoked to create a ripple effect, but `buttonManager` may conditionally **skip calling it** (e.g., for the P7 Hue Assignment button grid during startup) to prevent visual clutter.
*   **Key Interactions:** Instantiated and managed by `buttonManager`. Directly uses `appState` and `config` passed via its constructor.
*   **Troubleshooting Tip:** If buttons appear visually inconsistent after a flicker animation, investigate the `clearProps` logic in `setState` for that context and ensure the final CSS state aligns with the GSAP animation's end-state, particularly for opacity and glow.

#### `DialController.js`
*   **@module DialController:** Represents a single, individual rotary dial component rendered via SVG.
*   **Core Responsibilities:**
    *   Manages the dynamic rendering of its SVG ridges to create a 3D effect and handles user drag interactions.
    *   Updates its appearance by *directly subscribing to and reacting to* theme (`themeChanged`) and environment color (`targetColorChanged` for 'env') changes in `appState`, making it self-sufficient for theme updates.
*   **Key Interactions:** Instantiated and managed by `dialManager`.

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
    *   Handles playback, respects volume settings from `config/audio.js`, manages looping.
    *   Unlocks audio context on first user interaction.
    *   Includes an internal sound queuing mechanism for sounds whose `play()` method is called before they are fully loaded.
    *   The `play(key, forceRestart = false, ...)` method's `forceRestart` parameter is important for re-triggering short sounds during rapid UI interactions or specific startup sequence events to ensure auditory feedback.
*   **Preloading Note:** While `AudioManager` initiates loading for all sounds defined in `config/audio.js`, only a subset (specified in `PRELOADER_ASSETS` in `config/preloader.js` and processed by `preloader.js`) is *actively waited for* by the preloader's visual progress. Other sounds load asynchronously in the background.

#### `MusicController.js`
*   **@module MusicController:** Manages the background music tracks.
*   **Core Responsibilities:** Subscribes to `appState` events (`themeChanged`, `resistiveShutdownStageChanged`) and tells the `AudioManager` which music track to play (e.g., `bgDim`, `bgLight`, `bgResistive`) using a crossfade.
*   **Key Interactions:** Uses `AudioManager` to play and fade tracks. Listens to `appState`.

#### `buttonManager.js`
*   **@module buttonManager:** Orchestrates all `Button` instances (Desktop-only).
*   **Core Responsibilities:** Discovers buttons, creates `Button` instances, manages group behaviors. Provides `playFlickerToState` for complex animations, which now conditionally manages whether `Button.playStateTransitionEcho` is invoked. Emits `buttonInteracted` to `appState`.
*   **Key Interactions:**
    *   Uses `appState` (imported directly) for some internal logic checks (like `getCurrentStartupPhaseNumber` for conditional echo logic).
    *   Subscribes to `resistiveShutdownStageChanged` and `mainPowerOffButtonDisabledChanged` from `appState` to manage the main power button's state and flicker effects.

#### `dialManager.js`
*   **@module dialManager:** Orchestrates all `DialController` instances.
*   **Core Responsibilities:** Discovers dial containers, injects the base SVG markup, and creates `DialController` instances.
*   **Build Note:** This module relies on Vite's `?raw` import syntax (e.g., `import svgString from './asset.svg?raw'`) to load the dial's SVG file content as a string at build time, avoiding a runtime `fetch` request.

#### `ThemeManager.js`
*   **@module ThemeManager:** Manages global UI theme changes.
*   **Core Responsibilities:** Subscribes to `appState.themeChanged` and updates the `<body>` class accordingly.

#### `LcdUpdater.js`
*   **@module LcdUpdater:** Manages the visual state of all LCD screens.
*   **Core Responsibilities:**
    *   Handles `unlit`, `dimly-lit`, and `active` states for LCD containers.
    *   Provides an API (`getLcdPowerOnTimeline`) for `PhaseRunner` to create flicker animations during startup.
    *   During the startup sequence, `PhaseRunner` is the primary controller of LCD states. Post-startup (when `appStatus` is `'interactive'`), `LcdUpdater` applies the correct final state.
*   **Troubleshooting Tip:** If LCDs flash unexpectedly during startup, it might be a conflict between `LcdUpdater`'s reactive updates and `PhaseRunner`'s procedural commands. Ensure `LcdUpdater` is passive during startup.

#### `DynamicStyleManager.js`
*   **@module DynamicStyleManager:** Manages dynamic CSS custom properties.
*   **Core Responsibilities:** Updates CSS variables for hue assignments (`--dynamic-env-hue`, etc.) and the UI accent color. Also handles injecting the logo SVG.
*   **Build Note:** This module relies on Vite's `?raw` import syntax to load the logo's SVG file content as a string at build time.

#### `lensManager.js`
*   **@module lensManager:** Manages all aspects of the central lens visual.
*   **Core Responsibilities:** Updates the lens's complex radial gradient, manages power smoothing and idle oscillation, and responds to the resistive shutdown sequence.

#### `terminalManager.js`
*   **@module terminalManager:** Manages the terminal display (Desktop-only).
*   **Core Responsibilities:** Manages a message queue, handles the "typing" effect, manages the cursor, and scrolls content. Uses the `terminalMessages` module to retrieve content.

#### `AmbientAnimationManager.js`
*   **@module AmbientAnimationManager:** Manages continuous, ambient animations for UI elements.
*   **Core Responsibilities:** Provides global, continuously animated CSS variables (`--harmonic-resonance-glow-opacity`, etc.) that are consumed by CSS to create "breathing" effects on buttons and LCD text. It only applies effects when the app is `'interactive'`.

#### `DisruptionManager.js`
*   **@module DisruptionManager:** Manages the periodic visual "glitch" or "disruption" effect on all LCDs.
*   **Core Responsibilities:** Creates a GSAP timeline that combines a fast background flicker with a chromatic aberration "spread" effect. Triggers this effect periodically when the app is interactive, and also on specific events like theme changes or during the startup sequence.

#### `MoodMatrixManager.js` & `IntensityDisplayManager.js`
*   **@module MoodMatrixManager, IntensityDisplayManager:** Bridge the gap between `appState` and their respective presentational components.
*   **Core Responsibilities:** Subscribe to `appState` events (e.g., `dialUpdated`), process the data, and pass simplified props to their `MoodMatrix` or `IntensityDisplay` instance via the `.update()` method. Also manage the interaction-based resonance for their specific displays.

#### `resistiveShutdownController.js`
*   **@module resistiveShutdownController:** Orchestrates the resistive shutdown sequence (Desktop-only).
*   **Core Responsibilities:** Exposes a `handlePowerOffClick` method—called from `main.js`—to initiate or advance the shutdown sequence. It then listens for `resistiveShutdownStage` changes in `appState` to trigger all corresponding UI effects (terminal messages, lens animations, button flickers).

#### `sidePanelManager.js`
*   **@module sidePanelManager:** Manages the UI and interactions for the slide-out info panel.
*   **Core Responsibilities:** Handles panel expansion/collapse, tab switching, and wiring up core controls like Reset and Mute.

---

### Startup & Preloader

#### `preloader.js`
*   **@module preloader:** Handles the initial "cold boot" loading sequence.
*   **Core Responsibilities:** Displays a thematic loading screen, orchestrates the loading of critical assets (fonts, specific audio files, SVGs), and waits for a user interaction (`[ ENGAGE ]`) before allowing the main application to initialize.

#### `startupSequenceManager.js`
*   **@module startupSequenceManager:** Manages the application startup sequence using an XState machine.
*   **Core Responsibilities:**
    *   Initializes and runs the `startupMachine`, provides dependencies to the FSM's context, and exposes an API for debug controls.
    *   Calls `_resetVisualsAndState` to set the initial P0 state.
    *   The FSM's `COMPLETE` state now handles cleanup of transition-related CSS classes.
*   **XState v5 Critical Note:** This manager (and `startupMachine.js`) uses XState v5. Refer to v5 documentation for API details.

#### `startupMachine.js`
*   **@module startupMachine:** Defines the XState Finite State Machine for the startup sequence.
*   **Core Responsibilities:** Defines all states and transitions, and invokes the `PhaseRunner` for each phase using `fromPromise` with `phaseRunnerService`.
*   **XState v5 Critical Note:** Adheres to XState v5 patterns.

#### `PhaseRunner.js`
*   **@module PhaseRunner:** A generic executor for declarative startup phase configurations.
*   **Core Responsibilities:**
    *   Parses a phase config object (`startupPhaseX.js`) and builds a GSAP timeline dynamically.
    *   Handles timing of animations (including sounds via `type: 'audio'`) based on their `position` property. For audio, it passes the `forceRestart` property from the phase config to `AudioManager.play()`.
    *   Orchestrates all procedural state changes for components during the startup sequence.
    *   Ensures the GSAP timeline for a phase meets the `duration` specified in the phase config by padding if necessary. This is crucial for reliable scheduling.
    *   Returns a promise that resolves on completion of the phase's main GSAP timeline.
*   **Troubleshooting Tip:** If a startup phase seems to hang or sounds don't play, check the browser console for `[PhaseRunner]` logs to ensure the phase timeline duration is as expected and that sound scheduling logs appear.

#### `startupPhase[0-12].js` & `startupMobile.js`
*   **@module startupPhaseX:** A series of modules, each exporting a single, declarative configuration object that defines all animations and actions for a specific phase of the desktop or mobile startup.
*   **Key Properties:**
    *   `phase`, `name`, `duration`, `terminalMessageKey`.
    *   `animations`: An array of animation/action objects (`type`, `target`, `position`, etc.).
*   **Audio Note:** For `type: 'audio'` animations, include `forceRestart: true` to ensure sounds play reliably, especially if the same `soundKey` might have been used in a preceding phase.