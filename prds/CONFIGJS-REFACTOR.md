Of course. After a thorough re-evaluation of the entire codebase and the initial plan, I have identified several key refinements and one overlooked detail. The following document integrates the original PRD's goals with a complete, one-shot implementation plan that incorporates these findings. This is the definitive guide for executing the refactor.

***

# HUE 9000 Technical PRD & Implementation Plan: Configuration Module Refactor

*   **Author:** HUE 9000 System Architect
*   **Status:** Final Plan
*   **Jira Ticket:** ENG-721
*   **Version:** 2.1 (One-Shot Implementation)

## 1. Overview & Goals

The project's current monolithic `config.js` file hinders maintainability and performance. This document outlines a comprehensive, one-shot refactor to decompose this file into a scalable, self-documenting, and tree-shakeable configuration directory.

The primary goals are:
*   **Decomposition:** Break `config.js` into small, feature-focused modules.
*   **Clarity:** Group constants semantically to improve readability.
*   **Maintainability:** Simplify finding, modifying, and adding new configuration.
*   **Performance:** Enable effective tree-shaking via named imports for smaller production bundles.
*   **Robustness:** Eliminate derived constants and add JSDoc annotations.

This is a pure refactor. The user-facing behavior of the application must remain identical.

## 2. The "One-Shot" Approach

Instead of a multi-PR, phased rollout, we will execute this refactor as a single, comprehensive update. This approach reduces merge complexity and ensures the codebase is always in a consistent state during the refactoring process. We will create a new directory `src/js/config/`, migrate all constants, update all consumer files to use named imports, and then delete the old `config.js`.

## 3. Key Changes & Issues to Watch For

This refactor introduces several significant improvements and requires attention to specific details:

*   **Barrel File Pattern:** The new `src/js/config/` directory will use an `index.js` barrel file to aggregate and re-export all constants. This provides a single, clean import point (`import { CONSTANT } from './config/index.js';`) for the rest of the application.

*   **Direct Named Imports:** All modules currently receiving the `config` object via `serviceLocator` or constructor injection will be refactored to use direct, named imports for the specific constants they need. This is the core change that enables tree-shaking.

*   **Eliminating Derived Constants:** The constant `P3_LENS_RAMP_DURATION_S` will be deleted. The source of truth `LENS_STARTUP_RAMP_DURATION` will be renamed to `LENS_STARTUP_RAMP_DURATION_MS` for clarity. Any module needing the value in seconds will perform the calculation itself.

*   **Co-location of Logic:** The `estimateFlickerDuration` function, which is tightly coupled to `ADVANCED_FLICKER_PROFILES`, will be moved into the new `config/flickerProfiles.js` file alongside the profiles themselves.

*   **Vite-Idiomatic Asset Handling:** All asset imports (audio, SVG) will be moved from the old `config.js` to their relevant new config modules (e.g., `audio.js`, `preloader.js`). Furthermore, SVG imports for `dialManager.js` and `dynamicStyleManager.js` will be updated to use Vite's `?raw` suffix (e.g., `import logoSvgRawString from '.../logo.svg?raw'`), which embeds the SVG content as a string at build time, eliminating runtime `fetch` calls.

*   **Dependency Chain Correction (Critical Find):** The `dialManager.js` module creates `DialController` instances, passing its `this.config` object to their constructor. The plan refactors `DialController` to no longer need this object. Therefore, the instantiation call within `dialManager.js` **must be updated** to remove the `config` argument. This was a subtle but critical detail missed in the initial plan.

*   **Bug Fix:** A redundant and incorrect line (`const localAppStateRef = serviceLocator.get('appState');`) in `startupSequenceManager.js` will be removed.

## 4. The Implementation Plan

### Step 1: Project Setup & New File Creation

1.  **Create Directory:** Create the `src/js/config/` directory.
2.  **Create New Config Files:** Inside `src/js/config/`, create the following empty files:
    *   `animations.js`
    *   `audio.js`
    *   `dials.js`
    *   `flickerProfiles.js`
    *   `interaction.js`
    *   `lens.js`
    *   `preloader.js`
    *   `sequences.js`
    *   `terminal.js`
    *   `ui.js`
    *   `index.js` (Barrel File)

### Step 2: Content Migration & Refinement

Migrate all constants and asset imports from the original `src/js/config.js` into the appropriate new files as detailed in the checklist. Add JSDoc comments for clarity and rename/remove constants as specified.

<details>
<summary><strong>Click for Detailed Content Migration Checklist...</strong></summary>

*   **`config/animations.js`**: Move `GSAP_TWEEN_...`, `GSAP_BUTTON_IDLE_...`, `PERCEPTUAL_AUDIO_OFFSET_MS`, `HARMONIC_RESONANCE_PARAMS`, `IDLE_LIGHT_DRIFT_PARAMS`, `STATE_TRANSITION_ECHO_PARAMS`.
*   **`config/audio.js`**: Move all `import ...Src from '../assets/audio/...'` statements. Move the entire `AUDIO_CONFIG` object.
*   **`config/dials.js`**: Move `NUM_RIDGES`, `RIDGE_WIDTH_FACTOR`, `HIGHLIGHT_WIDTH_FACTOR`, `DIAL_GRADIENT_SCALE_FACTOR`, `DIAL_B_VISUAL_ROTATION_PER_HUE_DEGREE_CONFIG`, `DEFAULT_DIAL_A_HUE`, `DIAL_CANVAS_FADE_IN_DURATION`.
*   **`config/flickerProfiles.js`**: Move the `VISUAL_STATES` object, the `ADVANCED_FLICKER_PROFILES` object, and the `estimateFlickerDuration` function.
*   **`config/interaction.js`**: Move `PIXELS_PER_DEGREE_...`, `HUE_UPDATE_THRESHOLD`, `DEBOUNCE_DELAY`.
*   **`config/lens.js`**: Move all `LENS_...` constants. **Action:** Rename `LENS_STARTUP_RAMP_DURATION` to `LENS_STARTUP_RAMP_DURATION_MS`. **Action:** Delete the derived constant `P3_LENS_RAMP_DURATION_S`.
*   **`config/preloader.js`**: Move `logoSvgSrc`, `dialSvgSrc`, `grillTextureSrc` imports. Move `PRELOADER_ASSETS` and `PRELOADER_CONFIG`.
*   **`config/sequences.js`**: Move all `STARTUP_...`, `AUTO_PLAY_...`, `THEME_TRANSITION_...`, `RESISTIVE_SHUTDOWN_...`, and other sequence-related timing constants. Move `selectorsForDimExitAnimation`.
*   **`config/terminal.js`**: Move all `TERMINAL_...` constants.
*   **`config/ui.js`**: Move `HUE_ASSIGNMENT_ROW_HUES`, `DEFAULT_ASSIGNMENT_SELECTIONS`, `MOOD_MATRIX_DEFINITIONS`, `V2_DISPLAY_PARAMS`.

</details>

### Step 3: Populate the Barrel File

Add the following content to `src/js/config/index.js` to re-export everything.

```javascript
// src/js/config/index.js
export * from './animations.js';
export * from './audio.js';
export * from './dials.js';
export * from './flickerProfiles.js';
export * from './interaction.js';
export * from './lens.js';
export * from './preloader.js';
export * from './sequences.js';
export * from './terminal.js';
export * from './ui.js';
```

### Step 4: Refactor All Consumer Files (The Checklist)

This is the most extensive step. Go through each file listed below and apply the specified changes. The new import path will typically be `from './config/index.js'`.

<details>
<summary><strong>Click for Detailed File Refactoring Checklist...</strong></summary>

*   **`main.js`**
    *   [ ] Change `import * as config from './config.js';` to `import * as config from './config/index.js';`.
    *   [ ] In `setupEventListeners()`, change `const hue = config.HUE_ASSIGNMENT_ROW_HUES[...]` to use a named import at the top of the file: `import { HUE_ASSIGNMENT_ROW_HUES } from './config/index.js';`.

*   **`appState.js`**
    *   [ ] At the top, add: `import { HUE_ASSIGNMENT_ROW_HUES, DEFAULT_ASSIGNMENT_SELECTIONS, DEFAULT_DIAL_A_HUE } from './config/index.js';`.
    *   [ ] All uses of these constants within the file will now work correctly.

*   **`Button.js`**
    *   [ ] Remove the `configModule` parameter from the constructor and its usage.
    *   [ ] At the top, add `import { IDLE_LIGHT_DRIFT_PARAMS, STATE_TRANSITION_ECHO_PARAMS } from './config/index.js';`.
    *   [ ] Replace `this.configModule.CONSTANT_NAME` with the direct imported constants.

*   **`DialController.js`**
    *   [ ] Remove the `configModule` parameter from the constructor and all `this.configModule` references.
    *   [ ] At the top, add `import { PIXELS_PER_DEGREE_ROTATION, PIXELS_PER_DEGREE_HUE } from './config/index.js';`.
    *   [ ] Use the imported constants directly.

*   **`dialManager.js`**
    *   [ ] **Action:** In the `init()` method, find the `DialController` instantiation line.
    *   [ ] Change `this.dialInstances[dialId] = new DialController(container, dialId, appState, this.config, this.gsap);`
    *   [ ] To: `this.dialInstances[dialId] = new DialController(container, dialId, appState, this.gsap);` (removing `this.config`).
    *   [ ] Change the `dialSvgRawString` import to use the `?raw` suffix: `import dialSvgRawString from '../assets/svgs/dial.svg?raw';`.

*   **`dynamicStyleManager.js`**
    *   [ ] Change the `logoSvgUrl` import to use the `?raw` suffix: `import logoSvgUrl from '../assets/svgs/logo.svg?raw';`.

*   **`lensManager.js`**
    *   [ ] Remove the injected `this.config` and replace all `this.config.CONSTANT_NAME` with direct named imports for the many `LENS_...`, `RESISTIVE_SHUTDOWN_...`, `DEFAULT_DIAL_A_HUE`, etc. constants it uses.
    *   [ ] Ensure `LENS_STARTUP_RAMP_DURATION_MS` is used where `LENS_STARTUP_RAMP_DURATION` was before.

*   **`startupSequenceManager.js`**
    *   [ ] **Bug Fix:** In `_resetVisualsAndState()`, remove the line `const localAppStateRef = serviceLocator.get('appState');`.
    *   [ ] Remove `this.config` usage and replace with named imports for `STARTUP_L_REDUCTION_FACTORS`, `DEFAULT_DIAL_A_HUE`, and `selectorsForDimExitAnimation`.

*   **`terminalManager.js`**
    *   [ ] Remove the injected `this._configModule` and replace all `this._configModule.CONSTANT_NAME` with direct named imports for `TERMINAL_...` constants.
    *   [ ] In `_handleRequestTerminalMessage()`, change the call to `getMessage(payload, appState);` (removing `this._configModule`).

*   **`terminalMessages.js`**
    *   [ ] At the top, add `import { HUE_ASSIGNMENT_ROW_HUES, MOOD_MATRIX_DEFINITIONS } from './config/index.js';`.
    *   [ ] Change the `getMessage` function signature to `getMessage(payload, currentAppState = {})`.
    *   [ ] Use the directly imported constants where `configModule` was previously used.

*   **All other managers (`AudioManager`, `buttonManager`, `MoodMatrixManager`, etc.)**
    *   [ ] Systematically go through each manager. Remove its `this.config = serviceLocator.get('config');` line from `init()`.
    *   [ ] Replace every instance of `this.config.CONSTANT_NAME` with a named import at the top of the file.

*   **All `startupPhaseX.js` files:**
    *   [ ] If any phase file uses a constant (like `startupPhase3.js` using `estimateFlickerDuration`), change its import path to `from './config/index.js';`.

</details>

### Step 5: Verification & Finalization

1.  **Delete Old File:** Delete the original `src/js/config.js`. Your IDE/linter should now clearly highlight any remaining incorrect imports.
2.  **Full Regression Test:** Perform a complete functional test of the application against the formal checklist. Pay special attention to:
    *   **Startup Timing:** Ensure all audio and visual cues are perfectly synchronized.
    *   **Dial Rendering:** Verify both dials render correctly in all themes.
    *   **Resistive Shutdown:** Test the multi-stage sequence and confirm all effects trigger.
    *   **Flicker Animations:** Check that all startup and interactive flickers appear as expected.
3.  **Update Documentation:** Update `PROJECT_STRUCTURE.md` and `JAVASCRIPT_MODULE_REFERENCE.md` to reflect the new `src/js/config/` directory structure, as detailed below.

### Step 6: Post-Refactor Documentation Snippets

#### A. `PROJECT_STRUCTURE.md` Update

Replace the `src/js/` section with the following to reflect the new `config` directory:

```markdown
│   ├── js/
│   │   ├── config/                  # NEW: Decomposed configuration directory
│   │   │   ├── animations.js
│   │   │   ├── audio.js
│   │   │   ├── dials.js
│   │   │   ├── flickerProfiles.js
│   │   │   ├── index.js             # (Barrel file)
│   │   │   ├── interaction.js
│   │   │   ├── lens.js
│   │   │   ├── preloader.js
│   │   │   ├── sequences.js
│   │   │   ├── terminal.js
│   │   │   └── ui.js
│   │   │
│   │   ├── AmbientAnimationManager.js
│   │   ├── animationUtils.js
│   │   ├── appState.js
│   │   ├── AudioManager.js
... (rest of the files)
```

#### B. `JAVASCRIPT_MODULE_REFERENCE.md` Update

Replace the entry for `config.js` with this new entry for the `config/` directory:

```markdown
#### `config/` (Directory)
*   **@module config:** A directory of small, feature-focused modules that define all shared, static configuration constants for the application.
*   **Core Responsibilities:**
    *   Each file (`animations.js`, `audio.js`, etc.) holds constants for a specific domain.
    *   The `index.js` barrel file aggregates and re-exports all constants, providing a single, clean import point for the rest of the application.
*   **Key Interactions:** Consumed by nearly every module via direct, named imports (e.g., `import { AUDIO_CONFIG } from './config/index.js'`) to enable tree-shaking and improve code clarity.
```