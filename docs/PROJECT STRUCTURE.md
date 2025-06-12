# HUE 9000 Project Structure (Project Decouple - V2.1)

This document outlines the file and directory structure for the HUE 9000 project, emphasizing modularity and a clear separation of concerns after the "Project Decouple" refactoring.

HUE9000_Project/
├── public/
│   ├── audio/
│   │   ├── background.mp3
│   │   ├── big-on.wav
│   │   ├── button-press.mp3
│   │   ├── dial.mp3
│   │   ├── flicker-to-dim.wav
│   │   ├── lcd-on.wav
│   │   ├── lens-startup.wav
│   │   ├── lights-on.wav
│   │   ├── off.wav
│   │   └── terminal-on.wav
│   ├── crt-overlay.png
│   ├── dial.svg
│   ├── metal-grill.png
│   ├── noise.svg
│   ├── specular-highlights.svg
│   └── logo.svg
├── src/
│   ├── js/
│   │   ├── AmbientAnimationManager.js # Manages continuous ambient animations
│   │   ├── animationUtils.js          # Utilities for complex animations (e.g., flicker)
│   │   ├── appState.js                # Central application state management
│   │   ├── AudioManager.js            # Class to manage all application audio
│   │   ├── Button.js                  # Class for individual button components
│   │   ├── buttonManager.js           # Class to orchestrate Button instances
│   │   ├── config.js                  # Shared configuration constants
│   │   ├── DialController.js          # Class for individual SVG dial components
│   │   ├── dialManager.js             # Class to orchestrate Dial instances
│   │   ├── DynamicStyleManager.js     # Manages dynamic CSS variables and logo
│   │   ├── IntensityDisplay.js        # V2 Component: Renders the intensity display
│   │   ├── IntensityDisplayManager.js # V2 Manager: Bridges appState and IntensityDisplay
│   │   ├── LcdUpdater.js              # Manages LCD state and animations
│   │   ├── lensManager.js             # Class to manage the central lens visuals
│   │   ├── main.js                    # Application entry point and orchestrator
│   │   ├── MoodMatrix.js              # V2 Component: Renders the mood matrix display
│   │   ├── MoodMatrixManager.js       # V2 Manager: Bridges appState and MoodMatrix
│   │   ├── PhaseRunner.js             # Executes declarative startup phase configs
│   │   ├── preloader.js               # NEW: Manages the initial boot-up/loading screen
│   │   ├── resistiveShutdownController.js # Orchestrates the resistive shutdown sequence
│   │   ├── serviceLocator.js          # Central dependency locator
│   │   ├── sidePanelManager.js        # NEW: Manages the left/right info/debug panels
│   │   ├── startupSequenceManager.js  # Manages the XState startup sequence
│   │   ├── startupMachine.js          # XState machine definition for startup
│   │   ├── startupPhase0.js           # Declarative config for startup phase 0
│   │   ├── startupPhase1.js           # (pattern continues for all phases...)
│   │   ├── startupPhase2.js
│   │   ├── startupPhase3.js
│   │   ├── startupPhase4.js
│   │   ├── startupPhase5.js
│   │   ├── startupPhase6.js
│   │   ├── startupPhase7.js
│   │   ├── startupPhase8.js
│   │   ├── startupPhase9.js
│   │   ├── startupPhase10.js
│   │   ├── startupPhase11.js
│   │   ├── terminalManager.js         # Manages terminal display
│   │   ├── terminalMessages.js        # Terminal message content
│   │   ├── ThemeManager.js            # Manages global theme changes
│   │   └── utils.js                   # Common utility functions
│   │
│   └── css/
│       ├── 1-base/
│       │   ├── _variables-structural.css
│       │   ├── _variables-theme-contract.css
│       │   ├── _layout.css
│       │   ├── _typography.css
│       │   ├── _effects.css
│       │   ├── _startup-transition.css
│       │   └── _utilities.css
│       │
│       ├── 2-components/
│       │   ├── _preloader.css             # NEW: Styles for the preloader
│       │   ├── _side-panels.css         # NEW: Styles for the side info/debug panels
│       │   ├── _panel-bezel.css
│       │   ├── _button-unit.css
│       │   ├── _dial.css
│       │   ├── _lcd.css
│       │   ├── _logo.css
│       │   ├── _lens-container.css
│       │   ├── _lens-core.css
│       │   ├── _lens-outer-glow.css
│       │   ├── _lens-super-glow.css
│       │   ├── _color-chips.css
│       │   ├── _grill.css
│       │   ├── _terminal.css
│       │   └── _v2-displays.css
│       │
│       ├── 3-themes/
│       │   ├── theme-dim.css
│       │   ├── theme-dark.css
│       └── │   └── theme-light.css
│       │
│       └── main.css
├── index.html
└── JAVASCRIPT_MODULE_REFERENCE.md