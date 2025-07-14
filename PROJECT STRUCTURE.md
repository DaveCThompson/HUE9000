Generated markdown
# HUE 9000 Project Structure (V2.3 - Fully Synced)

This document outlines the file and directory structure for the HUE 9000 project, emphasizing modularity and a clear separation of concerns. This version reflects the "Project Decouple" refactoring, Vite-idiomatic asset migration, and correction of CSS asset pathing.

HUE9000_Project/
├── public/                     # Minimal static assets not processed by Vite (e.g., favicon.ico, robots.txt)
├── src/
│   ├── assets/                 # All static assets processed by Vite
│   │   ├── audio/              # Sound effects for the UI
│   │   ├── svgs/               # Core, standalone SVG assets for components (e.g., logo, dial face)
│   │   └── textures/           # Tiling textures and overlay patterns (e.g., .png, .svg for noise)
│   │
│   ├── js/                     # All application logic and component controllers
│   │   ├── config/             # Modular configuration files
│   │   │   ├── animations.js
│   │   │   ├── audio.js
│   │   │   ├── dials.js
│   │   │   ├── effects.js
│   │   │   ├── flickerProfiles.js
│   │   │   ├── index.js        # Exports all other config modules
│   │   │   ├── interaction.js
│   │   │   ├── lens.js
│   │   │   ├── preloader.js
│   │   │   ├── scanSequences.js # NEW: Scan sequence definitions
│   │   │   ├── sequences.js
│   │   │   ├── terminal.js
│   │   │   └── ui.js
│   │   │
│   │   ├── AmbientAnimationManager.js # RENAMED from AnimationManager.js
│   │   ├── AudioManager.js
│   │   ├── animationUtils.js   # NEW: Utility functions for animations
│   │   ├── appInitializer.js   # NEW: Main application bootstrapping logic
│   │   ├── Button.js
│   │   ├── buttonManager.js
│   │   ├── DialController.js
│   │   ├── dialManager.js
│   │   ├── DisruptionManager.js
│   │   ├── DOMManager.js
│   │   ├── DynamicStyleManager.js
│   │   ├── EventEmitter.js
│   │   ├── EventBinder.js      # NEW: Centralized DOM event binding
│   │   ├── hapticFeedbackManager.js # RENAMED/RECASED
│   │   ├── IntensityDisplay.js
│   │   ├── IntensityDisplayManager.js
│   │   ├── LcdUpdater.js
│   │   ├── lensManager.js
│   │   ├── main.js             # Application entry point
│   │   ├── MobileColorSlider.js
│   │   ├── MobileInteraction.js
│   │   ├── MobileTerminalManager.js
│   │   ├── MoodMatrix.js
│   │   ├── MoodMatrixManager.js
│   │   ├── MusicController.js
│   │   ├── PhaseRunner.js
│   │   ├── preloader.js
│   │   ├── resistiveShutdownController.js # RENAMED/RECASED
│   │   ├── scanFsm.js          # NEW: XState machine for scan sequences
│   │   ├── scanOrchestrator.js # NEW: Orchestrates scan lifecycle
│   │   ├── scanRenderers.js
│   │   ├── serviceLocator.js   # RENAMED/RECASED
│   │   ├── sidePanelManager.js
│   │   ├── state/              # NEW: Centralized state management (Command Bus pattern)
│   │   │   ├── actionHandler.js  # Handles dispatched actions
│   │   │   ├── actions.js        # Defines all possible actions
│   │   │   ├── appState.js       # The core state and event emitter
│   │   │   └── index.js          # Barrel file for state module
│   │   ├── startupMachine.js   # XState FSM definition for startup
│   │   ├── startupMobile.js
│   │   ├── startupPhase0.js
│   │   ├── startupPhase1.js
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
│   │   ├── startupPhase12.js
│   │   ├── startupPhase13.js
│   │   ├── StartupSequenceManager.js
│   │   ├── terminalManager.js  # RENAMED/RECASED
│   │   ├── terminalMessages.js # RENAMED/RECASED
│   │   ├── ThemeManager.js
│   │   └── utils.js
│   │
│   └── css/
│       ├── 1-base/             # Foundational styles, variables, and utilities
│       │   ├── _base.css           
│       │   ├── _dim-to-theme-transition.css
│       │   ├── _layout.css
│       │   ├── _mobile.css             
│       │   ├── _typography.css
│       │   ├── _utilities.css
│       │   ├── _variables-structural.css
│       │   └── _variables-theme-contract.css
│       │
│       ├── 2-components/       # Styles for individual, self-contained components
│       │   ├── _button-unit.css
│       │   ├── _color-chips.css
│       │   ├── _dial.css
│       │   ├── _dial-displays.css
│       │   ├── _grill.css
│       │   ├── _lcd.css
│       │   ├── _lens-container.css
│       │   ├── _lens-core.css
│       │   ├── _lens-outer-glow.css
│       │   ├── _lens-super-glow.css
│       │   ├── _logo.css
│       │   ├── _mobile-color-slider.css
│       │   ├── _mobile-controls-overlay.css
│       │   ├── _mobile-terminal-drawer.css
│       │   ├── _panel-bezel.css
│       │   ├── _preloader.css
│       │   ├── _scan-sequence.css  # NEW: Styles for scan sequence UI
│       │   ├── _side-panels.css
│       │   └── _terminal.css
│       │
│       ├── 3-themes/           # Theme-specific overrides of contract variables
│       │   ├── _theme-dark.css
│       │   ├── _theme-dim.css
│       │   └── _theme-light.css
│       │
│       └── main.css            # Central CSS import hub
│
├── index.html
├── vite.config.js
├── package.json
├── yarn.lock / package-lock.json
└── README.md
