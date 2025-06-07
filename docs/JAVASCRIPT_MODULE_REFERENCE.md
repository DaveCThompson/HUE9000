# HUE 9000 JavaScript Module Reference

This document provides a high-level overview of each JavaScript module in the HUE 9000 project. Its purpose is to serve as a quick reference for understanding the role of each file and its primary interactions within the application architecture.

---

### Core & Configuration

#### `main.js`
*   **@module main:** Entry point for the application.
*   **Core Responsibilities:**
    *   Imports all necessary modules and GSAP plugins.
    *   Collects and organizes DOM element references.
    *   Initializes all manager and controller instances (`buttonManager`, `dialManager`, `terminalManager`, etc.).
    *   Connects managers to each other where necessary (e.g., providing `uiUpdater` to `buttonManager`).
    *   Initializes and starts the `startupSequenceManager`.
*   **Key Interactions:**
    *   **Initializes:** Nearly every other module.
    *   **Starts:** `startupSequenceManager`.

#### `appState.js`
*   **@module appState:** Manages the central, authoritative application state.
*   **Core Responsibilities:**
    *   Holds all shared state data (dial values, theme, lens power, app status, resistive shutdown stage, etc.).
    *   Provides getters for safe, read-only access to state.
    *   Provides setters that validate input and emit events upon state change.
    *   Implements a simple event emitter (`on`, `emit`) for modules to subscribe to state changes.
*   **Key Interactions:**
    *   **Interacted with by:** Almost every module reads from or writes to `appState`.
    *   **Emits events to:** Any module that subscribes to state changes (e.g., `uiUpdater`, `lensManager`).

#### `config.js`
*   **@module config:** Defines shared, static configuration constants.
*   **Core Responsibilities:**
    *   Stores constants for interaction sensitivity (`PIXELS_PER_DEGREE_ROTATION`).
    *   Defines animation parameters (durations, eases, staggers).
    *   Contains data structures for UI elements (e.g., `HUE_ASSIGNMENT_ROW_HUES`, `LENS_GRADIENT_BREAKPOINTS`).
    *   Defines all `ADVANCED_FLICKER_PROFILES` for flicker animations.
    *   Defines parameters for ambient animations and the resistive shutdown sequence.
*   **Key Interactions:**
    *   **Imported by:** Nearly every module to retrieve constant values.

#### `utils.js`
*   **@module utils:** Provides common, reusable utility functions.
*   **Core Responsibilities:**
    *   Provides helper functions like `debounce`, `clamp`, `mapRange`, and `shuffleArray`.
*   **Key Interactions:**
    *   **Imported by:** Various modules that require its helper functions.

---

### UI Component Classes

#### `Button.js`
*   **@module Button:** Represents a single, individual UI button component.
*   **Core Responsibilities:**
    *   Manages its own state (`_isSelected`, `_isPermanentlyDisabled`).
    *   Applies and removes CSS classes to reflect its visual state (`is-unlit`, `is-energized`, etc.).
    *   Manages its ARIA attributes for accessibility.
    *   Handles its own ambient animations (Harmonic Resonance, Idle Light Drift) by adding/removing CSS classes.
*   **Key Interactions:**
    *   **Instantiated by:** `buttonManager`.
    *   **Reads from:** `appState` (for theme context), `config` (for animation params).

#### `Dial.js`
*   **@module Dial:** Represents a single, individual rotary dial component.
*   **Core Responsibilities:**
    *   Manages the rendering of its own canvas element.
    *   Handles user drag interactions to calculate new dial values.
    *   Updates its visual appearance based on theme and active state.
*   **Key Interactions:**
    *   **Instantiated by:** `dialManager`.
    *   **Reads from/Writes to:** `appState` (reads current state, proposes new state on drag).
    *   **Reads from:** `config` (for rendering and interaction constants).

---

### Manager & Controller Modules (Orchestration)

#### `buttonManager.js`
*   **@module buttonManager:** Orchestrates all `Button` instances.
*   **Core Responsibilities:**
    *   Discovers button DOM elements and creates `Button` instances for them.
    *   Manages group behaviors (e.g., ensuring only one radio/toggle button in a group is selected).
    *   Provides an API for other modules to trigger complex animations like `playFlickerToState`.
    *   Handles logic for the resistive shutdown sequence as it pertains to button flashing and disabling.
    *   Emits events (`beforeButtonTransition`, `afterButtonTransition`) for `AmbientAnimationManager`.
*   **Key Interactions:**
    *   **Instantiates:** `Button` components.
    *   **Called by:** `startupSequenceManager` (to run startup animations), `toggleManager` (to set group states), `gridManager`, `resistiveShutdownController`.

#### `dialManager.js`
*   **@module dialManager:** Orchestrates all `Dial` instances.
*   **Core Responsibilities:**
    *   Discovers dial container elements and creates `Dial` instances.
    *   Provides global methods to operate on all dials, such as `resizeAllCanvases` and `setDialsActiveState`.
*   **Key Interactions:**
    *   **Instantiates:** `Dial` components.
    *   **Called by:** `startupSequenceManager` (to activate dials during startup).

#### `uiUpdater.js`
*   **@module uiUpdater:** Handles global UI updates not tied to a single component.
*   **Core Responsibilities:**
    *   Manages global theme changes by updating the `<body>` class.
    *   Injects the logo SVG into the DOM.
    *   Updates dynamic CSS variables for hue assignments (`--dynamic-env-hue`, etc.).
    *   Manages the visual state of LCD screens (Dial B and Terminal), including applying flicker effects.
*   **Key Interactions:**
    *   **Subscribes to:** `appState` changes (`themeChanged`, `targetColorChanged`, etc.).
    *   **Called by:** `startupSequenceManager` (to set LCD states during startup).

#### `lensManager.js`
*   **@module lensManager:** Manages all aspects of the central lens visual.
*   **Core Responsibilities:**
    *   Updates the lens's complex radial gradient based on power (from Dial B) and hue (from Dial A).
    *   Manages the smoothing and idle oscillation of the lens power.
    *   Updates CSS variables for the lens glow effects.
    *   Responds to the resistive shutdown sequence to animate the lens to specific colors/intensities.
*   **Key Interactions:**
    *   **Subscribes to:** `appState` changes (`trueLensPowerChanged`, `dialUpdated` for Dial A, `resistiveShutdownStageChanged`).

#### `toggleManager.js`
*   **@module toggleManager:** Manages specific toggle button groups (Main Power, Aux Light).
*   **Core Responsibilities:**
    *   Handles the click logic for these specific groups.
    *   Updates `appState` based on interactions (e.g., sets the global theme when Aux Light is toggled).
    *   Initiates the resistive shutdown sequence when the Main Power Off button is clicked.
*   **Key Interactions:**
    *   **Calls methods on:** `buttonManager` (to set the visual state of the selected button).
    *   **Writes to:** `appState` (`setTheme`, `setResistiveShutdownStage`).

#### `gridManager.js`
*   **@module gridManager:** Manages the Hue Assignment button grid.
*   **Core Responsibilities:**
    *   Dynamically generates the radio buttons for each hue assignment column.
    *   Adds click listeners to the generated buttons.
    *   On click, updates `appState` with the new target hue for the corresponding UI element (env, lcd, etc.).
*   **Key Interactions:**
    *   **Calls methods on:** `buttonManager` (to add the generated buttons and set group selection).
    *   **Writes to:** `appState` (`setTargetColorProperties`).

#### `terminalManager.js`
*   **@module terminalManager:** Manages the terminal display.
*   **Core Responsibilities:**
    *   Manages a message queue to prevent multiple messages from typing at once.
    *   Handles the character-by-character "typing" effect using GSAP's TextPlugin.
    *   Manages the terminal cursor's visibility and position.
    *   Automatically scrolls the terminal content.
    *   Handles the special flicker-in effect for the first startup message.
*   **Key Interactions:**
    *   **Subscribes to:** `appState` (`requestTerminalMessage` event).
    *   **Reads from:** `terminalMessages` (to get message content).

#### `terminalMessages.js`
*   **@module terminalMessages:** A central repository for terminal message content.
*   **Core Responsibilities:**
    *   Stores all static and template strings for startup, button presses, and status updates.
    *   Provides a `getMessage` function that retrieves and formats the correct message based on a payload, including populating dynamic data from `appState`.
*   **Key Interactions:**
    *   **Imported by:** `terminalManager` (to get messages), `startupPhaseX.js` modules (to calculate durations).

#### `AmbientAnimationManager.js`
*   **@module AmbientAnimationManager:** Manages continuous, ambient animations for UI elements.
*   **Core Responsibilities:**
    *   Manages the "Harmonic Resonance" effect for selected buttons by updating a global CSS variable.
    *   Determines which ambient animation (`Harmonic Resonance` or `Idle Light Drift`) a button should have based on its state (selected, energized).
    *   Starts and stops animations globally based on the application status (`interactive` or not).
*   **Key Interactions:**
    *   **Subscribes to:** `appState` (`appStatusChanged`), `buttonManager` (`beforeButtonTransition`, `afterButtonTransition`).
    *   **Calls methods on:** `Button` instances (`startHarmonicResonance`, `setCssIdleLightDriftActive`, etc.).

#### `moodMatrixDisplayManager.js`
*   **@module moodMatrixDisplayManager:** Manages the Mood Matrix display in Dial A's LCD.
*   **Core Responsibilities:**
    *   Dynamically creates and manages the DOM for the scrolling mood list.
    *   Calculates and displays the two currently active moods and their interpolated percentages based on Dial A's hue.
    *   Handles the scrolling animation when the hue crosses a 40-degree segment boundary.
    *   Updates text colors based on the parent LCD's state (unlit, dimly-lit, active).
*   **Key Interactions:**
    *   **Subscribes to:** `appState` (`dialUpdated` for Dial A, `lcdStateChanged`).
    *   **Reads from:** `config` (for mood definitions and parameters).

#### `resistiveShutdownController.js`
*   **@module resistiveShutdownController:** Orchestrates the resistive shutdown sequence.
*   **Core Responsibilities:**
    *   Listens for changes to the `resistiveShutdownStage` in `appState`.
    *   When the stage changes, it triggers all corresponding UI effects defined in `config.js`.
    *   Triggers terminal messages.
    *   Animates the lens to specific colors/intensities by updating `appState`.
    *   Flickers the Hue Assignment buttons to specific colors.
    *   Disables the main power buttons at the final stage.
*   **Key Interactions:**
    *   **Subscribes to:** `appState` (`resistiveShutdownStageChanged`).
    *   **Writes to:** `appState` (`emit('requestTerminalMessage')`, `updateDialState`, `setTrueLensPower`, `setTargetColorProperties`, `setIsMainPowerOffButtonDisabled`).
    *   **Calls methods on:** `buttonManager` (to flicker buttons).

---

### Startup Sequence

#### `startupSequenceManager.js`
*   **@module startupSequenceManager:** Manages the application startup sequence using an XState machine.
*   **Core Responsibilities:**
    *   Initializes and runs the XState `startupMachine`.
    *   Provides the FSM with all necessary dependencies (managers, appState, config, etc.).
    *   Provides an API for the debug panel to `start`, `playNextPhase`, and `resetSequence`.
    *   Handles the initial setup (`resetVisualsAndState`) before the sequence begins.
    *   Listens to FSM transitions and notifies `debugManager` of phase changes.
*   **Key Interactions:**
    *   **Instantiates/Runs:** The XState `startupMachine`.
    *   **Called by:** `main.js` (to start), `debugManager` (to control the sequence).

#### `startupMachine.js`
*   **@module startupMachine:** Defines the XState Finite State Machine for the startup sequence.
*   **Core Responsibilities:**
    *   Defines all states (e.g., `IDLE`, `RUNNING_SEQUENCE`, `PAUSED_AWAITING_NEXT_STEP`, `SYSTEM_READY`, `ERROR_STATE`).
    *   Defines the transitions between states based on events (`START_SEQUENCE`, `NEXT_STEP_REQUESTED`, `onDone`).
    *   Invokes the appropriate `startupPhaseX.js` module as a promise-based service for each phase.
    *   Manages FSM context, such as `isStepThroughMode`.
*   **Key Interactions:**
    *   **Invokes:** `startupPhaseX.js` modules.
    *   **Interpreted by:** `startupSequenceManager`.

#### `startupPhase[0-11].js`
*   **@module startupPhaseX:** A series of modules, each responsible for a single phase of the startup sequence.
*   **Core Responsibilities:**
    *   Each module exports a `createPhaseTimeline` function that returns a promise wrapping a GSAP timeline.
    *   The timeline contains all animations and state changes for that specific phase (e.g., animating dimming factors, calling manager methods to flicker buttons, emitting terminal messages).
*   **Key Interactions:**
    *   **Invoked by:** `startupMachine`.
    *   **Calls methods on:** `managerInstances` (e.g., `buttonManager.playFlickerToState`, `lensManager.energizeLensCoreStartup`).
    *   **Writes to:** `appState` (`emit('requestTerminalMessage')`).

---

### Animation Utilities

#### `animationUtils.js`
*   **@module animationUtils:** Provides utility functions for creating complex, reusable animations.
*   **Core Responsibilities:**
    *   Contains the `createAdvancedFlicker` function, which generates complex, multi-cycle flicker and glow animations based on profiles from `config.js`.
*   **Key Interactions:**
    *   **Imported by:** `buttonManager`, `uiUpdater`, `terminalManager` to create flicker effects.
    *   **Reads from:** `config` (for `ADVANCED_FLICKER_PROFILES`).