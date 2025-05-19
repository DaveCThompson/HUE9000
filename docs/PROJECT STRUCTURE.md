--- START OF FILE PROJECT_STRUCTURE.md ---

# HUE 9000 Project Structure (REFACTOR-V2.3)

This document outlines the file and directory structure for the HUE 9000 project, emphasizing modularity and a clear separation of concerns.

HUE9000_Project/
├── public/
│   ├── metal-grill.png
│   ├── specular-highlights.svg
│   ├── noise.svg
│   └── logo.svg                     # Main application logo
├── src/
│   ├── js/
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
│   │   ├── startupSequenceManager.js  # Orchestrates the GSAP startup sequence
│   │   ├── toggleManager.js
│   │   ├── uiUpdater.js
│   │   └── utils.js
│   └── css/
│       ├── core/                          # Foundational CSS (non-component specific)
│       │   ├── _variables-structural.css  # Non-themeable (spacers, fixed sizes)
│       │   ├── _variables-theme-contract.css # Defines ALL themeable variable NAMES + default/fallback values
│       │   ├── _layout.css                # Main page structure, panel layout rules
│       │   └── _typography.css            # Base font settings, text styles
│       │
│       ├── themes/                        # Theme-specific variable overrides
│       │   ├── theme-dim.css              # Overrides for DIM mode
│       │   ├── theme-dark.css             # Overrides for DARK mode
│       │   └── theme-light.css            # Overrides for LIGHT mode
│       │
│       ├── components/                    # Styles for individual UI components
│       │   ├── _panel-bezel.css
│       │   ├── _button-unit.css
│       │   ├── _dial.css
│       │   ├── _lcd.css
│       │   ├── _logo.css
│       │   ├── _lens-container.css
│       │   ├── _lens-core.css
│       │   ├── _lens-outer-glow.css
│       │   ├── _color-chips.css
│       │   └── _grill.css
│       │
│       ├── animations/                    # Reusable animations & startup transitions
│       │   ├── _effects.css
│       │   └── _startup-transition.css
│       │
│       ├── utilities/
│       │   └── _utilities.css
│       │
│       └── main.css                       # Main CSS file to import all others
├── index.html