# HUE 9000 Project Structure (REFACTOR-V2.3 - XState Update)

This document outlines the file and directory structure for the HUE 9000 project, emphasizing modularity and a clear separation of concerns.

HUE9000_Project/
├── public/
│   ├── metal-grill.png
│   ├── specular-highlights.svg
│   ├── noise.svg
│   └── logo.svg                     # Main application logo
├── src/
│   ├── js/
│   │   ├── AmbientAnimationManager.js # Manages continuous ambient animations
│   │   ├── animationUtils.js          # Utilities for complex animations (e.g., flicker)
│   │   ├── appState.js
│   │   ├── Button.js                  # Manages individual button components
│   │   ├── buttonManager.js           # Orchestrates Button.js instances
│   │   ├── config.js
│   │   ├── Dial.js                    # Manages individual dial components
│   │   ├── dialManager.js             # Orchestrates Dial.js instances
│   │   ├── debugManager.js            # Manages debug panel UI and logic
│   │   ├── gridManager.js
│   │   ├── lensManager.js
│   │   ├── main.js
│   │   ├── moodMatrixDisplayManager.js  # Manages the Mood Matrix display in Dial A's LCD
│   │   ├── resistiveShutdownController.js # Orchestrates the resistive shutdown sequence
│   │   ├── startupSequenceManager.js  # Orchestrates the XState startup sequence
│   │   ├── startupMachine.js          # XState machine definition for startup
│   │   ├── startupPhase0.js           # Startup phase logic (pattern: startupPhaseX.js)
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
│   │   ├── terminalManager.js         # Manages terminal display
│   │   ├── terminalMessages.js        # Terminal message content
│   │   ├── toggleManager.js
│   │   ├── uiUpdater.js
│   │   └── utils.js
│   └── css/
│       ├── 1-base/                        # Foundational styles, variables, and helpers
│       │   ├── _variables-structural.css  # Non-themeable (spacers, fixed sizes, startup factors)
│       │   ├── _variables-theme-contract.css # Defines ALL themeable variable NAMES + default/fallback values
│       │   ├── _layout.css                # Main page structure, panel layout rules
│       │   ├── _typography.css            # Base font settings, text styles
│       │   ├── _effects.css               # Reusable keyframes and animation classes
│       │   ├── _startup-transition.css    # Styles for .is-transitioning-from-dim
│       │   └── _utilities.css             # General helper classes
│       │
│       ├── 2-components/                  # Styles for individual UI components
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
│       │   └── _mood-matrix-display.css
│       │
│       ├── 3-themes/                      # Theme-specific variable overrides
│       │   ├── theme-dim.css              # Overrides for DIM mode (startup)
│       │   ├── theme-dark.css             # Overrides for DARK mode (primary full theme)
│       │   └── theme-light.css            # Overrides for LIGHT mode
│       │
│       └── main.css                       # Main CSS file to import all others
├── index.html