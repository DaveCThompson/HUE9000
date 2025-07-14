# HUE 9000 JavaScript Module Reference (Project Decouple - V2.3 Refined)

This document provides a high-level overview of each JavaScript module in the refactored HUE 9000 project.

---

### Core & Application Lifecycle

#### `main.js`
*   **@module main:** The primary entry point for the HUE 9000 application.
*   **Core Responsibilities:**
    *   Registers core GSAP plugins (`Draggable`, `InertiaPlugin`, `TextPlugin`).
    *   Initializes a visual viewport watcher for responsive mobile layouts.
    *   Sets up a resize listener to trigger a page reload if the viewport crosses the mobile/desktop breakpoint.
    *   Sets the dynamic copyright year.
    *   Instantiates and registers the `AudioManager` with the `serviceLocator` *before* the preloader, as the preloader relies on it for audio asset loading.
    *   Orchestrates the `runPreloader` sequence.
    *   After the preloader (or if `DEV_SKIP_STARTUP` is true), it instantiates and runs the `AppInitializer`, handing off control for the main application bootstrap.
*   **Key Interactions:** Orchestrates `preloader.js` and `AppInitializer.js`.

#### `appInitializer.js`
*   **@module AppInitializer:** Centralized class for bootstrapping the entire HUE 9000 application. This is the single source of truth for application startup.
*   **Core Responsibilities:**
    *   Registers core services (`gsap`, `config`, `hapticFeedbackManager`, `actionHandler`) with the `serviceLocator`.
    *   Instantiates all necessary managers based on whether the viewport is mobile or desktop, and registers them with the `serviceLocator`.
    *   Initializes all instantiated managers by calling their `init()` methods.
    *   Sets up global event listeners (e.g., for audio mute toggle).
    *   Creates the dynamic grid buttons for hue assignment on desktop.
    *   Handles the `DEV_SKIP_STARTUP` flag, allowing direct jump to the interactive state for faster development.
    *   Initiates the `startupSequenceManager` after all components are ready.
*   **Key Interactions:** Instantiated by `main.js`. Instantiates and initializes nearly every other manager and service.

#### `DOMManager.js`
*   **@module DOMManager:** Centralizes DOM element selections.
*   **Core Responsibilities:** Queries the DOM on initialization to find all key elements and registers itself as `domElements` with the `serviceLocator`. This provides a single, consistent source for DOM references across the application, improving maintainability.
*   **Key Interactions:** Instantiated once in `AppInitializer.js`. Used by almost every other manager to access DOM elements.

#### `EventBinder.js`
*   **@module EventBinder:** Centralizes all static DOM event listener bindings for the application.
*   **Core Responsibilities:**
    *   Binds event listeners to various UI elements (buttons, toggles, panel controls).
    *   Delegates interactions to the appropriate managers (e.g., `buttonManager`, `sidePanelManager`, `mobileTerminalManager`).
    *   Dispatches actions to `appState` based on user interactions (e.g., `resetSequence`, `toggleAudioMute`, `cycleTheme`, `requestScan`).
    *   Handles desktop and mobile-specific event bindings using `window.matchMedia`.
*   **Key Interactions:** Initialized by `AppInitializer.js`. Interacts with `buttonManager`, `sidePanelManager`, `mobileTerminalManager`, and dispatches actions to `appState`.

#### `config/index.js`
*   **@module config:** The central export hub for all configuration constants.
*   **Core Responsibilities:** This module imports from all other files in the `config/` directory (e.g., `animations.js`, `audio.js`, `sequences.js`) and re-exports them. This allows other parts of the application to import all configuration from a single, convenient location.
*   **Key Interactions:** Imported by nearly every module to retrieve constant values.

#### `serviceLocator.js`
*   **@module serviceLocator:** A simple Inversion of Control (IoC) container.
*   **Core Responsibilities:** Provides `register(name, service)` and `get(name)` methods to manage and provide access to shared manager instances, breaking direct import dependencies.
*   **Key Interactions:** Used by `AppInitializer.js` to register all services and by all managers in their `init()` methods to retrieve dependencies.

#### `EventEmitter.js`
*   **@module EventEmitter:** A simple, generic event emitter (pub/sub) class.
*   **Core Responsibilities:** Provides `subscribe(eventName, listener)` and `emit(eventName, payload)` methods for event-driven communication.
*   **Key Interactions:** Used internally by `AudioManager` (to announce `soundLoaded`) and `appState` (as its core eventing mechanism).

---

### State Management (Command Bus Pattern)

#### `state/index.js`
*   **@module state/index:** Barrel file for the state management system.
*   **Core Responsibilities:** Provides a single import point for both the `appState` module (for getters and the `dispatch` function) and all action creators.
*   **Key Interactions:** Used by UI components to import `appState` and `actions`.

#### `state/appState.js`
*   **@module state/appState:** Manages the central, authoritative application state and acts as the **Command Bus**.
*   **Core Responsibilities:**
    *   Holds all shared state data in a private `state` object.
    *   Provides controlled, validated access to state properties via exported getter functions (e.g., `getDialState()`, `getCurrentTheme()`).
    *   Provides exported setter functions (e.g., `updateDialState()`, `setTheme()`) that are *primarily intended to be called by the `actionHandler`* to mutate state. These setters emit specific events (e.g., `dialUpdated`, `themeChanged`) when state changes occur.
    *   Exposes a `dispatch(action)` function, which is the **primary entry point for all UI components to trigger changes**. It broadcasts actions to the `actionDispatched` event.
    *   Exposes an `emit(eventName, payload)` function for *internal* use (within `appState` itself or by the `actionHandler`) to signal derived state changes or side effects.
    *   Provides `resetAppStateToDefaults()`, a crucial function for resetting the entire application state.
*   **Key Interactions:**
    *   UI components call `dispatch()` to request changes.
    *   `actionHandler.js` subscribes to `actionDispatched` and calls the setters.
    *   Other modules subscribe to specific state change events (e.g., `themeChanged`, `dialUpdated`) to react to state updates.

#### `state/actions.js`
*   **@module state/actions:** Defines all possible user intents (Actions) as constants and provides "action creator" functions.
*   **Core Responsibilities:**
    *   Exports constants for each action type (e.g., `SET_THEME`, `REQUEST_SCAN`).
    *   Exports "action creator" functions (e.g., `setTheme(theme)`, `requestScan(messageKey)`) that return standardized action objects (`{ type: ACTION_TYPE, payload: data }`). This avoids magic strings and ensures consistency across the application.
*   **Key Interactions:** Imported by `EventBinder.js` and other UI components to create actions for dispatching. Imported by `actionHandler.js` to handle actions.

#### `state/actionHandler.js`
*   **@module state/actionHandler:** The central "Action Handler" or "Reducer" for the application.
*   **Core Responsibilities:**
    *   Subscribes to the `actionDispatched` event from `appState`.
    *   Contains a `handleAction(action)` method that acts as a central dispatcher, interpreting each action's `type` and `payload`.
    *   **Is the ONLY module authorized to directly mutate the central `appState`** by calling its internal setter functions (e.g., `appState.setTheme()`, `appState.setResistiveShutdownStage()`).
    *   Triggers side effects (e.g., playing sounds via `audioManager`, requesting terminal messages via `appState.emit('requestTerminalMessage')`, managing the startup sequence via `startupManager`).
    *   Includes logic for coalescing frequent interaction messages to prevent terminal spam.
*   **Key Interactions:** Initialized by `AppInitializer.js`. Subscribes to `appState`. Interacts with `audioManager`, `startupSequenceManager`, and directly calls `appState` setters and `appState.emit`.

---

### Utilities

#### `utils.js`
*   **@module utils:** Provides common, reusable utility functions (`debounce`, `clamp`, `mapRange`, `shuffleArray`, etc.).

#### `animationUtils.js`
*   **@module animationUtils:** A utility module for creating complex, reusable animations.
*   **Core Responsibilities:**
    *   Exports `createAdvancedFlicker`, a powerful function for generating detailed flicker and glow effects based on predefined profiles in `config/flickerProfiles.js`. It carefully manages GSAP tweens, CSS variables, and ensures smooth transitions.
    *   Exports `createDotGridSpinnerTimeline`, a GSAP timeline for the 9-dot spinner animation used in scan sequences.
*   **Key Interactions:** Used by `buttonManager`, `LcdUpdater`, `terminalManager`, and `ScanOrchestrator`. Reads animation profiles from `config/flickerProfiles.js`.

#### `terminalMessages.js`
*   **@module terminalMessages:** Central repository for all HUE 9000 terminal message content and logic.
*   **Core Responsibilities:**
    *   Exports the `getMessage` function, which retrieves message content based on a `messageKey` and `type`.
    *   Returns messages in a unified, structured format that can include rich text segments, `beforeTyping` commands (like `pause`, `displayText`, `spinner`), and CSS class names.
    *   Can generate dynamic messages by substituting placeholders with data (e.g., hue values, mood summaries).
    *   Manages verbosity logic for repeated interactions to provide varied responses.
    *   Directly references `scanSequences.js` for scan-specific configurations.
*   **Key Interactions:** Used exclusively by `terminalManager`. Reads data from `config/ui.js` and `config/scanSequences.js`.

#### `mobileInteraction.js`
*   **@module mobileInteraction:** Provides a centralized utility for creating standardized mobile interactions.
*   **Core Responsibilities:**
    *   Exports `createMobileInteraction`, a function that attaches a `pointerup` listener to an element.
    *   Triggers haptic feedback (via `hapticFeedbackManager`) and executes a provided `onClick` callback.
    *   Ensures a consistent user experience for mobile button presses and toggles.
*   **Key Interactions:** Used by `EventBinder.js` for mobile control buttons.

---

### UI Component Classes (Presentational)

#### `Button.js`
*   **@module Button:** Represents a single, individual UI button component.
*   **Core Responsibilities:**
    *   Manages its own internal state (`_isSelected`, `_isPermanentlyDisabled`).
    *   Applies CSS classes and ARIA attributes to reflect its visual and interactive state.
    *   Its `setState` method carefully handles GSAP's `clearProps` when called from flicker animation completions to prevent style conflicts.
    *   `setPressedVisuals` handles the immediate visual feedback on press.
    *   `setCssIdleLightDriftActive` and `startHarmonicResonance` manage ambient animations.
    *   `playStateTransitionEcho` creates a subtle "ripple" effect after state changes.
*   **Key Interactions:** Instantiated and managed by `buttonManager`. Consumes CSS variables for its appearance.

#### `DialController.js`
*   **@module DialController:** Represents a single, individual rotary dial component rendered via SVG.
*   **Core Responsibilities:**
    *   Manages the dynamic rendering of its SVG ridges to create a 3D perspective rotation effect.
    *   Handles user drag interactions, updating its internal rotation and hue values based on pointer movement.
    *   Dispatches a `dialInteractionComplete` action to `appState` when dragging ends.
    *   Updates its appearance by subscribing to `appState.dialUpdated` (for programmatic changes), `appState.themeChanged`, and `appState.targetColorChanged` (for 'env') to ensure its visuals (e.g., ridge colors, shading) align with the current state and theme.
*   **Key Interactions:** Instantiated and managed by `dialManager`. Directly imports and interacts with `appState`, `audioManager`, and `hapticFeedbackManager`.

#### `MoodMatrix.js` & `IntensityDisplay.js`
*   **@module MoodMatrix, IntensityDisplay:** Self-contained presentational components for the Mood Matrix and Intensity Display.
*   **Core Responsibilities:**
    *   Create and manage their own internal DOM elements (e.g., text, bars, dots).
    *   Update their visuals (`.update()` method) based on simplified props (e.g., `hue`, `percentage`) passed from their respective managers.
    *   `MoodMatrix` handles the GSAP text scramble effect for mood names.
    *   They have no direct knowledge of global application state, promoting reusability.
*   **Key Interactions:** Instantiated and managed by `MoodMatrixManager` and `IntensityDisplayManager`.

---

### Manager & Controller Classes (Orchestration)

#### `AudioManager.js`
*   **@module AudioManager:** Manages all application audio using Howler.js.
*   **Core Responsibilities:**
    *   Preloads all sounds defined in `config/audio.js` and tracks their loading states.
    *   Handles playback (`play()`, `stop()`, `fadeIn()`, `fadeOut()`), respects individual sound volumes and global mute state.
    *   Includes an internal sound queuing mechanism for `play()` calls made before a sound is fully loaded.
    *   Manages audio context unlocking on first user interaction.
    *   Handles page visibility changes, muting audio when the tab is hidden.
    *   `play(key, forceRestart = false, ...)`: `forceRestart` is crucial for re-triggering short sounds during rapid UI interactions or specific startup sequence events to ensure auditory feedback.
*   **Preloading Note:** While `AudioManager` initiates loading for all sounds, only a subset (specified in `PRELOADER_ASSETS` in `config/preloader.js` and processed by `preloader.js`) is *actively waited for* by the preloader's visual progress. Other sounds load asynchronously in the background.

#### `MusicController.js`
*   **@module MusicController:** Manages background music tracks.
*   **Core Responsibilities:**
    *   Subscribes to `appState` events (`themeChanged`, `resistiveShutdownStageChanged`).
    *   Based on these events, it determines which background music track (e.g., `bgDim`, `bgLight`, `bgResistive`) should be playing.
    *   Uses `AudioManager` to play and crossfade between music tracks smoothly.
    *   Ensures the correct music resumes after a resistive shutdown sequence.
*   **Key Interactions:** Instantiated by `AppInitializer.js`. Uses `AudioManager`. Listens to `appState`.

#### `buttonManager.js`
*   **@module buttonManager:** Orchestrates all `Button` instances (Desktop-only).
*   **Core Responsibilities:**
    *   Discovers DOM button elements, creates and manages `Button` instances.
    *   Manages button groups (e.g., 'radio' behavior where only one button in a group can be selected).
    *   `handleInteraction(buttonElement)`: The primary entry point from `EventBinder.js` for user clicks. It calls the `Button` instance's `handleInteraction()` and then dispatches the appropriate action to `appState`.
    *   `setButtonState(buttonOrElement, targetState, options)`: A public API for programmatically setting a button's visual state, including playing flicker animations (via `createAdvancedFlicker`). It conditionally manages whether `Button.playStateTransitionEcho` is invoked.
    *   Responds to `appState.resistiveShutdownStageChanged` and `appState.mainPowerOffButtonDisabledChanged` to manage the main power button's state and flicker effects during shutdown.
*   **Key Interactions:** Initialized by `AppInitializer.js`. Creates `Button` instances. Dispatches actions to `appState`. Subscribes to `appState` events. Uses `audioManager` and `ambientAnimationManager`.

#### `dialManager.js`
*   **@module dialManager:** Manages rotary dial controls.
*   **Core Responsibilities:**
    *   Discovers dial container elements in the DOM.
    *   Injects the base SVG markup for the dials (using Vite's `?raw` import for SVG content).
    *   Creates and manages `DialController` instances for each dial.
*   **Key Interactions:** Initialized by `AppInitializer.js`. Uses `audioManager` and `hapticFeedbackManager` (passed to `DialController`).

#### `ThemeManager.js`
*   **@module ThemeManager:** Manages global UI theme changes.
*   **Core Responsibilities:** Subscribes to `appState.themeChanged` and updates the `<body>` class accordingly (`theme-dim`, `theme-dark`, `theme-light`).
*   **Key Interactions:** Initialized by `AppInitializer.js`. Subscribes to `appState`.

#### `LcdUpdater.js`
*   **@module LcdUpdater:** Manages the visual state of all LCD screens (Dials, Terminal).
*   **Core Responsibilities:**
    *   Handles `unlit`, `dimly-lit`, and `active` states for LCD containers by applying appropriate CSS classes.
    *   Provides `getLcdPowerOnTimeline()`, an API for `PhaseRunner` to create GSAP timelines for flicker animations during startup.
    *   Updates the visibility of the internal content wrapper based on the LCD state.
    *   Responds to `appState.appStatusChanged` to apply the correct final LCD states (e.g., all active when `interactive`).
*   **Key Interactions:** Initialized by `AppInitializer.js`. Subscribes to `appState`. Uses `animationUtils.createAdvancedFlicker`.

#### `DynamicStyleManager.js`
*   **@module DynamicStyleManager:** Manages dynamic CSS custom properties for hue assignments and the UI accent color.
*   **Core Responsibilities:**
    *   Subscribes to `appState.targetColorChanged` and `appState.dialUpdated` (for Dial A).
    *   Updates CSS variables on the `:root` element (e.g., `--dynamic-env-hue`, `--dynamic-env-chroma`, `--dynamic-ui-accent-hue`) to reflect the selected hues and chroma values.
    *   Injects the main logo SVG into its container (using Vite's `?raw` import for SVG content).
*   **Key Interactions:** Initialized by `AppInitializer.js`. Subscribes to `appState`.

#### `lensManager.js`
*   **@module lensManager:** Manages all aspects of the central lens visual.
*   **Core Responsibilities:**
    *   Updates the lens's complex radial gradient based on `trueLensPower` and `currentMasterHue`.
    *   Manages smoothing of lens power changes and implements the subtle idle oscillation effect.
    *   Responds to `appState.resistiveShutdownStageChanged` to adjust lens animation duration and easing during shutdown.
    *   `energizeLensCoreStartup()`: Provides a GSAP timeline for the lens ramp-up during startup.
*   **Key Interactions:** Initialized by `AppInitializer.js`. Subscribes to `appState` events (`trueLensPowerChanged`, `dialBInteractionChange`, `dialUpdated` for Dial A, `appStatusChanged`, `ambientPulse`).

#### `terminalManager.js`
*   **@module terminalManager:** Manages the HUE 9000 terminal display.
*   **Core Responsibilities:**
    *   Manages a message queue for incoming terminal messages.
    *   Implements the "typing" effect character by character.
    *   Manages the cursor state (`idle`, `typing`, `thinking`).
    *   Handles automatic scrolling to the bottom of the terminal output.
    *   Processes `beforeTyping` commands from messages (e.g., `pause`, `displayText`, `spinner`).
    *   Manages the "scan takeover" state, where the terminal displays a full-screen scan animation orchestrated by `ScanOrchestrator`.
    *   Communicates with `terminalMessages.js` to retrieve message content.
*   **Key Interactions:** Initialized by `AppInitializer.js`. Subscribes to `appState.requestTerminalMessage` and `appState.scanComplete`. Uses `terminalMessages.js` and `ScanOrchestrator.js`.

#### `AmbientAnimationManager.js`
*   **@module AmbientAnimationManager:** Manages continuous ambient animations for UI elements.
*   **Core Responsibilities:**
    *   Controls global CSS variables (`--harmonic-resonance-glow-opacity`, `--harmonic-resonance-glow-scale`) that drive a "breathing" effect on selected buttons and V2 displays.
    *   Manages a "light drift" CSS animation for unselected, energized buttons.
    *   Activates/deactivates these effects when the `appStatus` changes to/from `'interactive'`.
    *   Temporarily pauses ambient effects on buttons during user interaction or managed flicker animations to prevent visual conflicts.
*   **Key Interactions:** Initialized by `AppInitializer.js`. Subscribes to `appState.appStatusChanged` and `appState.ambientPulse`. Subscribes to `buttonManager` events (`beforeButtonTransition`, `afterButtonTransition`).

#### `DisruptionManager.js`
*   **@module DisruptionManager:** Manages the periodic visual "glitch" or "disruption" effect on all LCDs.
*   **Core Responsibilities:**
    *   Triggers a short, randomized visual effect on active LCDs.
    *   The effect combines a fast background flicker with a chromatic aberration "spread" effect (driven by animating a `--_ca-current-offset` CSS variable).
    *   Triggers periodically when the app is interactive, and also on specific events like theme changes or during startup.
    *   Uses an `IntersectionObserver` to pause effects when LCDs are outside the viewport for performance.
*   **Key Interactions:** Initialized by `AppInitializer.js`. Subscribes to `appState.themeChanged` and `appState.resistiveShutdownStageChanged`.

#### `MoodMatrixManager.js` & `IntensityDisplayManager.js`
*   **@module MoodMatrixManager, IntensityDisplayManager:** Bridge the gap between `appState` and their respective presentational components (`MoodMatrix`, `IntensityDisplay`).
*   **Core Responsibilities:**
    *   Instantiate their respective display components.
    *   Subscribe to `appState.dialUpdated` (specifically for Dial A for Mood, Dial B for Intensity).
    *   Process the raw dial `hue` data and translate it into simplified props (e.g., `hue` for Mood, `percentage` for Intensity).
    *   Pass these props to their display instance via the `.update()` method.
    *   Manage the interaction-based resonance (`is-resonating` class) for their specific displays, which ties into the global ambient animation system.
*   **Key Interactions:** Initialized by `AppInitializer.js`. Subscribes to `appState`. Manages `MoodMatrix` or `IntensityDisplay` instances.

#### `hapticFeedbackManager.js`
*   **@module hapticFeedbackManager:** Manages haptic feedback for UI interactions on supported devices.
*   **Core Responsibilities:**
    *   Provides methods (`triggerClick()`, `triggerToggleOn()`, `triggerToggleOff()`, `triggerSliderScrub()`) to trigger specific vibration patterns.
    *   Respects the user's preference set in `appState.isHapticsEnabled`.
    *   Checks for `Vibration API` support.
*   **Key Interactions:** Initialized by `AppInitializer.js`. Used by `DialController`, `EventBinder.js`, `MobileColorSlider.js`. Reads `appState.isHapticsEnabled`.

#### `resistiveShutdownController.js`
*   **@module resistiveShutdownController:** Orchestrates the resistive shutdown sequence (Desktop-only).
*   **Core Responsibilities:**
    *   **Purely reactive:** It *subscribes* to `appState.resistiveShutdownStageChanged` and responds to state changes. It does *not* initiate the shutdown sequence itself; that is handled by `actionHandler.js` dispatching the `REQUEST_SHUTDOWN` action.
    *   Based on the `newStage` value, it triggers all corresponding UI effects: updates terminal messages, animates lens power and Dial A hue, adjusts Dial B rotation, and applies specific flicker and tint effects to the main power button and hue assignment buttons via `buttonManager`.
*   **Key Interactions:** Initialized by `AppInitializer.js`. Subscribes to `appState`. Uses `buttonManager`, `audioManager`, and directly calls `appState` setters for dial/lens.

#### `sidePanelManager.js`
*   **@module sidePanelManager:** Manages the UI and interactions for the left side info panel.
*   **Core Responsibilities:**
    *   Toggles the visibility of the info panel (`is-expanded` class on `controlDeck` and `left-panel-expanded` on `body`).
    *   Handles closing the panel.
    *   Manages tab switching within the panel.
    *   Sets up an `IntersectionObserver` (`_initImageObserver`) to animate images as they scroll into view within the panel content.
*   **Key Interactions:** Initialized by `AppInitializer.js`. Used by `EventBinder.js`. Plays sounds via `audioManager`.

---

### Mobile-Specific Modules

#### `MobileColorSlider.js`
*   **@module MobileColorSlider:** Manages the mobile-only vertical color slider component.
*   **Core Responsibilities:**
    *   Initializes the slider's DOM elements and calculates dimensions.
    *   Handles `pointerdown`, `pointermove`, `pointerup` events for touch-based dragging.
    *   Translates vertical pointer position into a hue value, snapping to predefined hue steps.
    *   Updates the visual appearance of the slider thumb and track gradient.
    *   Dispatches `setHueAssignment` action to `appState` when dragging ends.
    *   Provides haptic feedback during interaction.
*   **Key Interactions:** Instantiated by `AppInitializer.js` (only on mobile). Dispatches actions to `appState`. Uses `audioManager` and `hapticFeedbackManager`.

#### `MobileInteraction.js`
*   **@module MobileInteraction:** Provides a centralized utility for creating standardized mobile interactions.
*   **Core Responsibilities:**
    *   Exports `createMobileInteraction`, a function that attaches a `pointerup` listener to an element.
    *   Triggers haptic feedback (via `hapticFeedbackManager`) and executes a provided `onClick` callback.
    *   Ensures a consistent user experience for mobile button presses and toggles.
*   **Key Interactions:** Used by `EventBinder.js` for mobile control buttons.

#### `MobileTerminalManager.js`
*   **@module MobileTerminalManager:** Manages the state and interactions for the mobile terminal drawer.
*   **Core Responsibilities:**
    *   Controls the opening and closing of the mobile terminal drawer using a GSAP timeline.
    *   Manages the visual transformation of the `main-content-area` when the drawer opens (slides up, scales down, blurs).
    *   Toggles the `mobile-terminal-is-open` class on `document.body`.
    *   Subscribes to `appState.unreadTerminalMessagesChanged` to display a notification on the terminal toggle button.
*   **Key Interactions:** Instantiated by `AppInitializer.js` (only on mobile). Subscribes to `appState`. Uses `audioManager`.

---

### Scan Sequence Modules

#### `ScanOrchestrator.js`
*   **@module ScanOrchestrator:** Manages the entire lifecycle of a scan sequence.
*   **Core Responsibilities:**
    *   Initiates a scan by creating an `XState` actor from `scanFsm.js`.
    *   Sets up the initial UI elements for the scan (main title, progress, sub-job containers).
    *   Runs intro/outro animations for the scan UI.
    *   Handles the 'Escape' key to abort a scan.
    *   Signals `scanComplete` event to `appState` upon completion, abortion, or error.
    *   Manages the main dot-grid spinner animation.
*   **Key Interactions:** Initialized by `AppInitializer.js`. Called by `terminalManager` to start a scan. Uses `scanFsm.js`, `scanRenderers.js`, `animationUtils.createDotGridSpinnerTimeline`. Emits `scanComplete` to `appState`.

#### `scanFsm.js`
*   **@module scanFsm:** Defines the hierarchical XState machine for managing a scan sequence.
*   **Core Responsibilities:**
    *   Creates a dynamic state machine based on the `scanConfig` (which includes `subJobs`).
    *   Manages the flow through intro animation, individual sub-jobs, and outro animation.
    *   Invokes `scanRenderers` for each sub-job and `ScanOrchestrator`'s intro/outro animations as XState actors (`fromPromise`).
    *   Handles success, error, and abort states for the scan.
    *   Includes watchdog timers for renderer timeouts and overall FSM timeout for robustness.
*   **XState v5 Critical Note:** Adheres to XState v5 patterns and actor model.
*   **Key Interactions:** Used by `ScanOrchestrator.js`. Invokes `scanRenderers.js`.

#### `scanRenderers.js`
*   **@module scanRenderers:** Provides concrete rendering functions for different types of scan sub-jobs.
*   **Core Responsibilities:**
    *   Exports `renderBarFill` (for progressive lines with a filling bar) and `renderTypeWindow` (for a single-line text scramble effect).
    *   Each renderer function takes a target DOM element, job configuration, and a `gsap` instance, returning a `Promise` that resolves when its animation is complete.
    *   Includes `prefers-reduced-motion` queries to provide simplified animations for accessibility.
    *   Registers itself with a simple `rendererRegistry` map for dynamic retrieval by `scanFsm`.
*   **Key Interactions:** Called by `scanFsm.js`.

---

### Startup & Preloader

#### `preloader.js`
*   **@module preloader:** Handles the initial "cold boot" loading sequence.
*   **Core Responsibilities:**
    *   Displays a thematic loading screen (`#datastream-preloader`).
    *   Orchestrates the loading of critical assets (fonts, specific audio files, SVGs) defined in `config/preloader.js`.
    *   Provides visual feedback via progress bars and streaming text.
    *   Animates the preloader logo via GSAP.
    *   Waits for a user interaction (`[ ENGAGE ]` button click) before allowing the main application to initialize, ensuring audio context is unlocked.
*   **Key Interactions:** Called by `main.js`. Uses `AudioManager` for audio asset loading. Reads `config/preloader.js`.

#### `startupSequenceManager.js`
*   **@module startupSequenceManager:** Manages the application startup sequence using an XState state machine.
*   **Core Responsibilities:**
    *   Initializes and runs the `startupMachine` (defined in `startupMachine.js`).
    *   Provides dependencies (like `proxies` for CSS variable animation) to the FSM's context.
    *   Exposes an API (`playNextPhase()`, `playAllRemaining()`, `pauseSequence()`, `resumeSequence()`, `resetSequence()`) for external control/debugging.
    *   `jumpToState(targetPhaseName, context)`: A crucial method for instantly applying the final state of all startup phases up to a target point (used for `DEV_SKIP_STARTUP`).
    *   `_resetVisualsAndState()`: Resets all UI elements and `appState` to a known baseline (P0 state) before a new startup sequence. This now centrally calls `appState.resetAppStateToDefaults()`.
    *   `_performSequenceCompletion()`: Centralized cleanup logic called at the end of any startup sequence (animated or skipped) to remove temporary CSS classes and set the final `appStatus` to `interactive`.
*   **XState v5 Critical Note:** This manager (and `startupMachine.js`) uses XState v5. Refer to v5 documentation for API details.
*   **Key Interactions:** Initialized by `AppInitializer.js`. Subscribes to `appState.appStatusChanged`. Directly interacts with `appState` setters and `appState.emit`.

#### `startupMachine.js`
*   **@module startupMachine:** Defines the XState Finite State Machine for the HUE 9000 startup sequence.
*   **Core Responsibilities:**
    *   Defines all states (`IDLE`, `RUNNING_PHASE`, `PAUSED`, `CHECK_SEQUENCE_STATUS`, `COMPLETE`, `ERROR`) and transitions.
    *   Uses `assign` to manage the FSM's context (e.g., `currentPhase`, `isStepThroughMode`, `activePhaseConfigs`).
    *   Invokes the `PhaseRunner` for each phase (`phaseRunnerService`) using `fromPromise`, ensuring asynchronous phase execution.
    *   Includes `onError` transitions to handle and log errors during phase execution.
    *   The `COMPLETE` state's `entry` actions ensure final cleanup and `appStatus` update.
    *   `desktopPhaseConfigs`: Exports the array of declarative phase configurations for desktop.
*   **XState v5 Critical Note:** Adheres to XState v5 patterns and actor model.
*   **Key Interactions:** Used by `startupSequenceManager`. Invokes `PhaseRunner.js`.

#### `PhaseRunner.js`
*   **@module PhaseRunner:** A generic executor for declarative startup phase configuration objects.
*   **Core Responsibilities:**
    *   Takes a `phaseConfig` object (from `startupPhaseX.js`) as input.
    *   Dynamically builds a GSAP timeline based on the `animations` array within the `phaseConfig`.
    *   Handles various animation types (`tween`, `flicker`, `lcdPowerOn`, `call`, `lensEnergize`, `audio`).
    *   Ensures proper timing of animations based on their `position` property within the master timeline. For audio, it passes the `forceRestart` property from the phase config to `AudioManager.play()`.
    *   Orchestrates all procedural state changes for components during the startup sequence by calling manager methods (e.g., `lcdUpdater.setLcdState`, `buttonManager.setButtonState`).
    *   Ensures the GSAP timeline for a phase meets the `duration` specified in the phase config by padding if necessary, which is crucial for reliable scheduling.
    *   Returns a promise that resolves on completion of the phase's main GSAP timeline.
*   **Troubleshooting Tip:** If a startup phase seems to hang or sounds don't play, check the browser console for `[PhaseRunner]` logs to ensure the phase timeline duration is as expected and that sound scheduling logs appear.
*   **Key Interactions:** Used by `startupMachine.js`. Interacts with `serviceLocator` to get required managers (`dialManager`, `lensManager`, `lcdUpdater`, `audioManager`, `buttonManager`, `disruptionManager`).

#### `startupPhase[0-13].js` & `startupMobile.js`
*   **@module startupPhaseX:** A series of modules, each exporting a single, declarative configuration object that defines all animations and actions for a specific phase of the desktop or mobile startup.
*   **Core Responsibilities:**
    *   Define the `phase` number, `name`, `duration`, and `terminalMessageKey`.
    *   Contain an `animations` array, where each object specifies:
        *   `type`: The type of animation (e.g., `'tween'`, `'flicker'`, `'audio'`).
        *   `target`: The element(s) or property to animate.
        *   `vars`: GSAP tween variables.
        *   `position`: The start time within the phase's overall timeline.
        *   `deps`: An array of `serviceLocator` keys for dependencies needed by `applyFinalState`.
        *   `applyFinalState(deps, animConfig)`: A function that is called *only in "skip startup" mode* to instantly apply the final visual state of this specific animation. This is critical for the `jumpToState` functionality in `startupSequenceManager`.
*   **Audio Note:** For `type: 'audio'` animations, `forceRestart: true` is often included to ensure sounds play reliably, especially if the same `soundKey` might have been used in a preceding phase.
*   **Key Interactions:** Imported by `startupMachine.js` to define the FSM's `activePhaseConfigs`.