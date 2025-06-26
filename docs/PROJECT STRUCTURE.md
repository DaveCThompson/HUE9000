# HUE 9000 Project Structure (V2.1 - Post-Refactor)

This document outlines the file and directory structure for the HUE 9000 project, emphasizing modularity and a clear separation of concerns after the "Project Decouple" refactoring and Vite-idiomatic asset migration.

HUE9000_Project/
├── public/                     # Minimal static assets not processed by Vite (e.g., favicon.ico, robots.txt)
├── src/
│   ├── assets/                 # All static assets processed by Vite
│   │   ├── audio/              # Sound effects for the UI
│   │   ├── svgs/               # Core SVG assets for components
│   │   └── textures/           # Tiling textures for UI surfaces
│   │
│   ├── js/                     # All application logic and component controllers
│   │   ├── AmbientAnimationManager.js
│   │   ├── animationUtils.js
│   │   ├── appState.js         # Central application state (theme, power, etc.)
│   │   ├── AudioManager.js
│   │   ├── Button.js
│   │   ├── buttonManager.js
│   │   ├── config.js
│   │   ├── DialController.js
│   │   ├── dialManager.js
│   │   ├── DynamicStyleManager.js
│   │   ├── IntensityDisplay.js
│   │   ├── IntensityDisplayManager.js
│   │   ├── LcdUpdater.js
│   │   ├── lensManager.js
│   │   ├── main.js             # Application entry point
│   │   ├── MoodMatrix.js
│   │   ├── MoodMatrixManager.js
│   │   ├── PhaseRunner.js
│   │   ├── preloader.js
│   │   ├── resistiveShutdownController.js
│   │   ├── serviceLocator.js
│   │   ├── sidePanelManager.js
│   │   ├── startupSequenceManager.js
│   │   ├── startupMachine.js   # XState FSM definition for startup
│   │   ├── startupPhase0.js    # (Declarative configs for each startup phase)
│   │   ├── ...
│   │   ├── startupPhase12.js
│   │   ├── terminalManager.js
│   │   ├── terminalMessages.js
│   │   ├── ThemeManager.js
│   │   └── utils.js
│   │
│   └── css/
│       ├── 1-base/             # Foundational styles, variables, and utilities
│       │   ├── _base.css           
│       │   ├── _variables-structural.css
│       │   ├── _variables-theme-contract.css
│       │   ├── _layout.css
│       │   ├── _typography.css
│       │   ├── _dim-to-theme-transition.css
│       │   ├── _mobile.css             
│       │   └── _utilities.css
│       │
│       ├── 2-components/       # Styles for individual, self-contained components
│       │   ├── _preloader.css
│       │   ├── _side-panels.css
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
│       │   └── _dial-displays.css
│       │
│       ├── 3-themes/           # Theme-specific overrides of contract variables
│       │   ├── _theme-dim.css
│       │   ├── _theme-dark.css
│       │   └── _theme-light.css
│       │
│       └── main.css            # Central CSS import hub
│
├── index.html
├── vite.config.js
├── package.json
├── yarn.lock / package-lock.json
└── README.md