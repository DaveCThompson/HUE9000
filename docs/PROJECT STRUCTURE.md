# HUE 9000 Project Structure (Project Decouple - V2.0)

This document outlines the file and directory structure for the HUE 9000 project, emphasizing modularity and a clear separation of concerns after the "Project Decouple" refactoring.

HUE9000_Project/
├── public/
│   ├── metal-grill.png
│   ├── specular-highlights.svg
│   ├── noise.svg
│   └── logo.svg
├── src/
│   ├── js/
│   │   ├── AmbientAnimationManager.js # Manages continuous ambient animations
│   │   ├── animationUtils.js          # Utilities for complex animations (e.g., flicker)
│   │   ├── appState.js                # Central application state management
│   │   ├── Button.js                  # Class for individual button components
│   │   ├── buttonManager.js           # Class to orchestrate Button instances
│   │   ├── config.js                  # Shared configuration constants
│   │   ├── Dial.js                    # Class for individual dial components
│   │   ├── dialManager.js             # Class to orchestrate Dial instances
│   │   ├── debugManager.js            # Manages debug panel UI and logic
│   │   ├── DynamicStyleManager.js     # NEW: Manages dynamic CSS variables and logo
│   │   ├── IntensityDisplay.js        # V2 Component: Renders the intensity display
│   │   ├── IntensityDisplayManager.js # V2 Manager: Bridges appState and IntensityDisplay
│   │   ├── LcdUpdater.js              # NEW: Manages LCD state and animations
│   │   ├── lensManager.js             # Class to manage the central lens visuals
│   │   ├── main.js                    # Application entry point and orchestrator
│   │   ├── MoodMatrix.js              # V2 Component: Renders the mood matrix display
│   │   ├── MoodMatrixManager.js       # V2 Manager: Bridges appState and MoodMatrix
│   │   ├── PhaseRunner.js             # NEW: Executes declarative startup phase configs
│   │   ├── resistiveShutdownController.js # Orchestrates the resistive shutdown sequence
│   │   ├── serviceLocator.js          # NEW: Central dependency locator
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
│   │   ├── ThemeManager.js            # NEW: Manages global theme changes
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
│       │   └── theme-light.css
│       │
│       └── main.css
├── index.html