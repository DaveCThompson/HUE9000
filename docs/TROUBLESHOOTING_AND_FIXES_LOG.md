# HUE 9000 - Troubleshooting, Fixes, and Refinements Log (Post REFACTOR-V2.3)

This document tracks significant issues encountered, their diagnosis, and the implemented solutions during the refinement of the HUE 9000 interface, particularly after the REFACTOR-V2.3 stage which introduced `Button.js` and `Dial.js` components.

## Section A: Issues Related to Pre-Refactor V2.1 or Earlier (Historical Context)
(Content from original file remains relevant for historical context)
...

## Section B: Refinements & Debugging (REFACTOR-V2.1 - Pre V2.3 State)
(Content from original file remains relevant for historical context of these specific fixes)
...

## Section C: Refactor V2.3 - UI Componentization Refinements & Fixes

This section details issues addressed during and immediately after the V2.3 refactor, which componentized Button and Dial management.

### C.1. Dial B Intensity Snap-to-Zero on First Interaction Post-Startup
*   **Symptom:** After the startup sequence completed (P3 - Lens activated to 25% power), the first user interaction (drag) with Dial B (Intensity) caused the lens's visual intensity to snap to 0% before responding to the drag from the expected 25% starting point.
*   **Root Cause Analysis:**
    1.  A `TypeError` (`this.targets is not a function`) occurred in the `onComplete` callback of the GSAP tween within `lensManager.energizeLensCoreStartup`. This happened because `this` inside the `onComplete` (when not an arrow function and not explicitly bound) referred to the tween itself, but the attempt to get `this.targets()[0].value` was problematic or the `lensPowerProxy` was not accessed correctly.
    2.  This error prevented the execution of subsequent code in the `onComplete` callback, which was responsible for updating `appState.dials.B` (specifically its `hue` and `targetHue`) to correspond to the 25% lens power achieved during startup.
    3.  As a result, when the `Dial.js` instance for Dial B handled the first user interaction, it read an initial `hue: 0` and `targetHue: 0` from `appState.dials.B` (its default constructed state), causing the interaction and visual lens power to start from 0% instead of the intended 25%.
*   **Solution Implemented:**
    1.  Corrected the `onComplete` callback in `lensManager.energizeLensCoreStartup` to directly access the `lensPowerProxy.value` (which was in its lexical scope) instead of relying on `this.targets()`.
    2.  Ensured that this `onComplete` callback now reliably updates `appState.dials.B` with `hue`, `targetHue`, `rotation`, and `targetRotation` values that accurately reflect the 25% lens power set during startup.
*   **Files Affected:** `src/js/lensManager.js`.
*   **Key Learning:** Careful management of `this` context in GSAP callbacks is crucial. Accessing variables from the outer scope (if available) or ensuring correct binding can prevent such errors. Synchronizing all related state aspects (e.g., lens power and the controlling dial's hue) is vital for consistent UI behavior.

### C.2. Lens Incorrectly Visible During Startup Idle Phase (P0)
*   **Symptom:** The lens displayed a minimal glow during the P0_Baseline phase of startup, when it should have been completely invisible.
*   **Root Cause Analysis:** The logic in `lensManager._updateLensGradientVisuals` was setting the lens `opacity` to `1` if the `appStatus` was not `loading` or `error`. During P0, `appStatus` is `starting-up`. Even if `trueLensPower` was 0, this condition led to `opacity: 1` being applied, making the base gradient (BP0) visible.
*   **Solution Implemented:**
    *   Modified `lensManager._updateLensGradientVisuals` to set lens `opacity: 0` and `background: none` under more specific initial conditions: if `appStatus` is `loading`, OR if `appStatus` is `starting-up` AND `currentVisualPower` is effectively zero (and Dial B's initial hue is also zero). This ensures the lens remains off until P3_Lens explicitly activates it by setting opacity to 1 and ramping up power.
    *   Ensured that once `appStatus` is `interactive` or during P3 activation onwards (and not `error`), the lens opacity is maintained at `1`, with its visual intensity solely determined by the calculated gradient.
*   **Files Affected:** `src/js/lensManager.js`.

### C.3. Body Opacity Incorrectly Zero on Initial Load in Debug/Step-Through Mode
*   **Symptom:** The entire UI was invisible (body opacity was 0) when the application loaded in step-through debug mode, requiring a "Play All" or stepping past P1 to become visible.
*   **Root Cause Analysis:** The `startupSequenceManager.start()` function had logic that could lead to `body.opacity` being set to 0 via `resetVisualsAndState(false, ...)` if `isStepThroughMode` was false, but the subsequent handling for `isStepThroughMode = true` in `start()` wasn't overriding this correctly or consistently before the user could see the page.
*   **Solution Implemented:**
    *   Simplified the body opacity setting in `startupSequenceManager.start()`. The initial `body.opacity` (0 for auto-play, 1 for step-through) is now more clearly and solely determined by the call to `resetVisualsAndState(isStepThroughMode, ...)`.
    *   `resetVisualsAndState` now reliably sets `gsap.set(domElementsRegistry.body, { opacity: forStepping ? 1 : 0 });`.
    *   If auto-playing (`!isStepThroughMode`), `GsapPhase1_BodyFadeIn` is responsible for animating opacity from 0 to 1. If stepping (`isStepThroughMode`), opacity starts at 1.
*   **Files Affected:** `src/js/startupSequenceManager.js`.

### C.4. (Minor) ButtonManager Import Casing Error
*   **Symptom:** TypeScript or linter error in VS Code due to inconsistent casing in the import statement for `Button.js` within `buttonManager.js`.
*   **Root Cause Analysis:** File system was likely case-insensitive, but the development environment's tooling was case-sensitive or configured for strict casing. The import `import Button from './button.js'` did not match the actual filename `Button.js`.
*   **Solution Implemented:** Corrected the import statement in `buttonManager.js` to `import Button from './Button.js';`.
*   **Files Affected:** `src/js/buttonManager.js`.

### C.5. P6 Button Energizing Failure: SCAN/HUE_ASSN/FIT_EVAL Buttons Not Transitioning from 'is-dimly-lit'
*   **Symptom:** During the P6 startup phase, SCAN, HUE ASSN, and FIT EVAL buttons, which were set to `is-dimly-lit` in P4, fail to flicker and transition to their `is-energized` state. The console log from `buttonManager.flickerDimlyLitToEnergizedStartup` shows "Total buttons to energize: 0".
*   **Root Cause Analysis (Fragility Identified):**
    1.  In P4, `startupSequenceManager` calls `buttonManager.smoothTransitionButtonsToState`, which uses `gsap.timeline().call()` to schedule `Button.setState(ButtonStates.DIMLY_LIT, ...)` for the relevant buttons. Console logs from within `Button.setState` confirm that `buttonInstance.currentClasses` *is* updated to include `is-dimly-lit` when these GSAP calls execute.
    2.  In the *current (problematic)* `startupSequenceManager.GsapPhase6_ThemeTransitionAndFinalEnergize`, the call to `managerInstances.buttonManager.flickerDimlyLitToEnergizedStartup(...)` happens *synchronously* when the P6 phase's GSAP timeline is being *built*.
    3.  The `flickerDimlyLitToEnergizedStartup` method itself iterates through `buttonManager._buttons` *synchronously at the time it is called* to determine which buttons are currently `is-dimly-lit` and should be included in the flicker animation timeline it *returns*.
    4.  **The Fragility:** This synchronous check during the P6 timeline *build phase* occurs *before* the P6 `appStateService.setTheme('dark')` call (and its subsequent synchronous event listeners like `uiUpdater.handleThemeChange` and `toggleManager.syncLightToggleToThemeVisuals`) has executed. While P4's `setState` calls *should* have completed, the timing of the P6 build phase check is too early relative to the overall sequence flow and dependencies. The old (working) version deferred the *invocation* of the equivalent button energizing logic until the P6 GSAP timeline was actually playing at the appropriate point, by wrapping it in a `gsap.call()`.
    5.  As a result, when `flickerDimlyLitToEnergizedStartup` inspects the `buttonInstance.currentClasses`, it does not find `is-dimly-lit` for the target buttons.
*   **Solution Implemented (Planned & Executed):**
    1.  Modified `startupSequenceManager.GsapPhase6_ThemeTransitionAndFinalEnergize` to defer the *invocation* of `managerInstances.buttonManager.flickerDimlyLitToEnergizedStartup`.
    2.  This was achieved by creating a new sub-timeline within P6 (`energizeButtonsSubTimeline`). This sub-timeline contains a `gsap.call()` that, when executed, *then* calls `flickerDimlyLitToEnergizedStartup`.
    3.  The timeline returned by `flickerDimlyLitToEnergizedStartup` (containing the actual flicker animations) is then added to this `energizeButtonsSubTimeline`.
    4.  The `energizeButtonsSubTimeline` is scheduled within the main P6 timeline at a point (`energizeStartTime`) that ensures the P4 states are set and the P6 theme change has been initiated and processed by relevant listeners.
*   **Files Affected:** `src/js/startupSequenceManager.js`.
*   **Key Learning:** The distinction between when a function that *builds* a GSAP timeline is called (and performs its state checks) versus when the *resulting timeline actually plays* is critical for complex, state-dependent sequences. State checks should occur at the point of GSAP execution if they depend on prior GSAP-driven state changes.

### C.6. GSAP Instance Management and Plugin Registration (Critical Fix)
*   **Symptom Series:**
    1.  Initial errors: `Invalid property autoAlpha set to ... Missing plugin? gsap.registerPlugin()`.
    2.  After attempting to fix by removing CDN and relying on `window.gsap`: `TypeError: Cannot read properties of undefined (reading 'set')` in `Button.js` (where `this.gsap` was undefined).
    3.  After passing `gsap` to `ButtonManager` and then to `Button` constructor: `ReferenceError: gsap is not defined` in `animationUtils.js`.
*   **Root Cause Analysis:**
    1.  **`autoAlpha` Error:** When using GSAP with a module bundler like Vite, relying solely on CDN-based global registration of GSAP and its plugins is unreliable. The bundler might not correctly "see" or link these global instances with module-imported GSAP, or tree-shaking could interfere. `autoAlpha` is part of CSSPlugin, which is usually core but its registration needs to be solid.
    2.  **`this.gsap` Undefined in `Button.js`:** `ButtonManager` was importing its own `gsap` instance but not passing it to the `Button` constructor. The `Button` constructor's fallback to `window.gsap` was unreliable during the synchronous initialization phase.
    3.  **`gsap` Undefined in `animationUtils.js`:** This utility module was attempting to use a global `gsap` variable directly, which was no longer reliably available after removing the CDN and before a proper import was added to the utility itself.
*   **Solution Implemented (Iterative):**
    1.  **Centralized GSAP Setup (`main.js`):**
        *   Removed GSAP CDN `<script>` tags from `index.html`.
        *   Installed `gsap` as an npm dependency (`npm install gsap`).
        *   In `main.js`, explicitly imported `gsap` and necessary plugins (e.g., `TextPlugin`) from the `gsap` package:
            ```javascript
            import { gsap } from "gsap";
            import { TextPlugin } from "gsap/TextPlugin";
            gsap.registerPlugin(TextPlugin);
            ```
        *   This configured `gsap` instance from `main.js` is now the single source of truth.
    2.  **Dependency Injection:**
        *   The configured `gsap` instance from `main.js` is explicitly passed to the `init` methods of all managers that require it (`buttonManager`, `dialManager`, `lensManager`, `terminalManager`, `startupSequenceManager`, `uiUpdater`).
        *   Managers that create component instances (like `ButtonManager` creating `Button`s, or `DialManager` creating `Dial`s) are responsible for passing this `gsap` instance to their component constructors.
        *   Example (`ButtonManager`):
            ```javascript
            // buttonManager.js
            init(buttonElements, gsapInstance) {
                this.gsap = gsapInstance;
                // ...
            }
            addButton(element, ...) {
                const buttonConfig = { ..., gsapInstance: this.gsap }; // Pass gsapInstance in config
                const buttonInstance = new Button(element, buttonConfig); // Button constructor extracts it
                // ...
            }
            ```
        *   Example (`Button.js` constructor):
            ```javascript
            constructor(domElement, config, gsapInstance, /*...other deps*/) { // gsapInstance passed directly
                this.gsap = gsapInstance;
                if (!this.gsap) throw new Error("GSAP instance not provided to Button constructor");
                // ...
            }
            ```
    3.  **Direct Import in Utilities (`animationUtils.js`):**
        *   For standalone utility modules like `animationUtils.js` that are not class-based managers, directly importing `gsap` is the cleanest approach:
            ```javascript
            // animationUtils.js
            import { gsap } from "gsap";
            // ... use gsap directly ...
            ```
*   **Files Affected:** `index.html`, `main.js`, `buttonManager.js`, `Button.js`, `animationUtils.js`, `dialManager.js`, `Dial.js`, `lensManager.js`, `terminalManager.js`, `startupSequenceManager.js`, `uiUpdater.js`.
*   **Key Learning & Best Practice for GSAP with Vite/Module Bundlers:**
    *   **NPM Installation:** Always install GSAP via npm/yarn.
    *   **Central Import & Registration:** Import `gsap` and register all required plugins (like `TextPlugin`, `ScrollTrigger`, etc.) once in your main application entry point (e.g., `main.js`). This ensures all plugins are available to the GSAP instance used throughout the application.
    *   **Explicit Dependency:**
        *   For manager classes or components, pass the configured `gsap` instance via their `init` method or constructor. Store it as `this.gsap` and use that for all GSAP calls. This makes the dependency clear and avoids reliance on potentially unreliable globals.
        *   For utility functions or modules that aren't class instances, importing `gsap` directly within that module is acceptable and often cleaner.
    *   **Avoid `window.gsap`:** Do not rely on `window.gsap` as the primary way to access GSAP in a bundled environment. While it might sometimes work, it's less robust and can lead to the types of errors encountered. The imported `gsap` object is the canonical reference.
    *   **CSSPlugin:** `CSSPlugin` (which handles `autoAlpha` and most DOM animations) is part of the GSAP core and is automatically registered when you import `gsap`. Explicit registration is usually not needed unless specific bundler issues arise. The `autoAlpha` errors were symptomatic of GSAP itself not being correctly available/configured, not necessarily a missing CSSPlugin registration *if GSAP itself was working*.

### C.7. LCD and Terminal Text/Background Flickering Issues During Startup
*   **Symptom:**
    1.  **Terminal Text (P1-P5):** Text visible from P1 would briefly flicker off and on when transitioning to subsequent early phases (P2-P5).
    2.  **Dial LCDs (P6):** Dial LCDs would flash on with their `lcd--dimly-lit` styles, then immediately turn off (due to `autoAlpha:0` from their flicker profile), and then flicker on as intended.
    3.  **Dial LCD Backgrounds (P10):** During the theme transition to `theme-dark`, the backgrounds of Dial LCDs would briefly flicker off (become transparent) while their text remained visible.
*   **Root Cause Analysis:**
    1.  **Terminal Text (P1-P5 Flicker):** `uiUpdater.applyInitialLcdStates()`, called on phase changes, was setting `#terminal-lcd-content` opacity to 0 for phases P0-P5 (as the parent screen was `lcd--unlit`). `terminalManager` would then quickly set it back to 1 when processing a new message, causing a rapid off/on flicker.
    2.  **Dial LCDs (P6 Flash On/Off/On):**
        *   `uiUpdater.applyInitialLcdStates()` (triggered by P6 start) would first apply `lcd--dimly-lit` class and styles *without* flicker, making the LCDs visible (Flash ON).
        *   Then, `startupPhase6.js` would call `uiUpdater.setLcdState()` again for the same LCDs, but *with* the `lcdScreenFlickerToDimlyLit` profile. This profile starts with `amplitudeStart: 0.0`, causing `createAdvancedFlicker` to immediately `gsap.set(lcdElement, { autoAlpha: 0 })` (Flash OFF).
        *   The flicker animation would then proceed from `autoAlpha:0` (Flicker ON).
    3.  **Dial LCD Backgrounds (P10 Flicker-Off):** This was attributed to a CSS transition artifact. When `theme-dim` is removed and `theme-dark` is added, the CSS variables defining the `background-image` gradient change. If the browser doesn't smoothly interpolate the gradient or if there's no solid `background-color` fallback, the gradient might momentarily fail to render, appearing transparent.
*   **Solutions Implemented (Iterative):**
    1.  **Terminal Text (P1-P5):** Modified `uiUpdater.updateLcdTextAndVisibility` to *not* set `#terminal-lcd-content` opacity to 0 if it already contains child elements (lines of text), even if its parent screen is `lcd--unlit`.
    2.  **Dial LCDs (P6):**
        *   Modified `uiUpdater.applyInitialLcdStates` to *not* call `setLcdState` for Dial LCDs A and B if `currentPhase === 6`. This allows `startupPhase6.js` to be the sole initiator of their transition to `lcd--dimly-lit` *with* flicker.
        *   In `uiUpdater.setLcdState`, when `useFlicker` is true and the flicker profile starts from unlit (like `lcdScreenFlickerToDimlyLit`), `gsap.set(screenElement, { autoAlpha: 0, immediateRender: true })` is now called *before* the target class (e.g., `lcd--dimly-lit`) is applied. This prevents the class styles from rendering the element visible just before GSAP hides it for the flicker.
    3.  **Dial LCD Backgrounds (P10):**
        *   Added a `background-color` property to the base `.hue-lcd-display` (and `.actual-lcd-screen-element`) style in `_lcd.css`. This color is derived from the darkest stop of its own `background-image` gradient variables. This provides a solid fallback if the gradient momentarily fails to render during the CSS theme transition. The `background-color` itself also transitions.
        *   Ensured `uiUpdater.handleThemeChange` defers `applyInitialLcdStates` during the P10 CSS transition.
        *   `startupPhase10.js` explicitly calls `uiUpdater.applyInitialLcdStates()` after a short delay *after* `setTheme('dark')` to help stabilize the final 'active' state under the new theme.
*   **Files Affected:** `src/js/uiUpdater.js`, `src/js/config.js` (new flicker profile for terminal screen), `src/js/startupPhase6.js` (to use new terminal screen flicker profile), `src/css/components/_lcd.css` (added `background-color`), `src/js/startupPhase10.js` (added delayed call to `applyInitialLcdStates`).
*   **Key Learnings:**
    *   The order of operations (class application vs. GSAP `autoAlpha` sets) is critical for elements that flicker from an unlit state. GSAP should make the element invisible *before* any class that would make it visible is applied.
    *   CSS transitions on complex properties like `background-image` (especially gradients driven by multiple CSS variables) can sometimes have rendering artifacts during theme switches. Providing a solid `background-color` fallback can mitigate visual glitches.
    *   Carefully consider the responsibilities of different functions that might affect the same element's state (e.g., `applyInitialLcdStates` vs. phase-specific logic) to avoid conflicting or redundant operations that can cause flashes.
    *   When an element's container (like the terminal screen) is animated, ensure its content's visibility is managed independently if the content should persist (e.g., terminal text should not disappear if only its screen background is flickering on).

### C.8. Startup Sequence Race Condition and State Management
*   **Symptom:** Dials and LCDs would appear in Phase 5 instead of Phase 6. Attempts to hide them with GSAP `set` or `tween` commands in `startupPhase5.js` were unreliable.
*   **Root Cause Analysis:** A race condition existed between the procedural, timeline-based logic of `PhaseRunner` and the reactive, event-driven logic of `LcdUpdater`.
    1.  `LcdUpdater` was subscribed to `startupPhaseNumberChanged`.
    2.  When the FSM transitioned from P5 to P6, `LcdUpdater` would immediately see `phase >= 6` and call `setLcdState(..., 'dimly-lit')`, making the LCDs visible.
    3.  This happened *before* the `PhaseRunner` began executing the `startupPhase6.js` animation timeline, which was *also* supposed to handle making the LCDs visible via a flicker effect. The reactive update pre-empted the procedural animation.
*   **Solution Implemented:**
    1.  **Decoupled `LcdUpdater` from Startup:** In `LcdUpdater.js`, removed the subscription to `startupPhaseNumberChanged`. Its `applyCurrentStateToAllLcds` method was modified to *only* run when the application is *not* in the `'starting-up'` state. This makes `PhaseRunner` the single source of truth for all state changes during the startup sequence.
    2.  **Explicit State Cleanup in P10:** In `startupPhase10.js`, added a `call` function at the beginning of the phase. This function explicitly calls `lcdUpdater.setLcdState(..., 'active')` for all LCDs. This removes the temporary `.lcd--dimly-lit` class and prepares the elements for the theme transition, fixing a related bug where backgrounds would not transition correctly.
*   **Files Affected:** `src/js/LcdUpdater.js`, `src/js/startupPhase10.js`.
*   **Key Learning:** In a hybrid system with both procedural animations (like a startup sequence) and reactive state management, clear boundaries of responsibility are essential. For a fixed sequence, the procedural controller (`PhaseRunner`) must have ultimate authority. Reactive systems (`LcdUpdater`) should be disabled or made passive during the sequence to prevent race conditions and ensure animations play as designed.

### C.9. Ambient "Harmonic Resonance" Animation Invisible, Choppy, or Missing Glow
*   **Symptom (Iterative):**
    1.  **Initial:** The "breathing" ambient animation on selected buttons was completely invisible.
    2.  **After JS Fixes:** The animation was visible but extremely choppy and stuttered.
    3.  **After Performance Fix:** The animation was smooth, but the button's glow disappeared entirely.
*   **Root Cause Analysis (Iterative):**
    1.  **Invisible Effect:** Debugging logs confirmed the JavaScript logic was correct (`AmbientAnimationManager` was calling `startHarmonicResonance` on the correct `Button` instances). The root cause was identified as a faulty guard clause (`if (!this.configModule) return;`) in the `Button.js` `startHarmonicResonance` method, which prevented the `.is-resonating` class from ever being added to the DOM element.
    2.  **Choppy Animation:** After fixing the JS, the animation became visible but performed poorly. The cause was animating the `box-shadow` property on every frame. Repainting a large, blurry `box-shadow` is computationally expensive and blocks the browser's main thread, causing jank.
    3.  **Missing Glow:** The `box-shadow` was replaced with a high-performance `::after` pseudo-element animated via `transform: scale()` and `opacity`. However, this new glow element was hidden due to a combination of `z-index: -1` (placing it behind the button's opaque background) and `overflow: hidden` on the main `.button-unit` (clipping any part of the glow that extended beyond the button's border).
*   **Solution Implemented (Final):**
    1.  **High-Performance Layering (CSS):** The button's structure in `_button-unit.css` was refactored:
        *   The main `.button-unit` element was made transparent.
        *   A `::before` pseudo-element was added to serve as the opaque background layer with `z-index: 1`.
        *   The `::after` pseudo-element (the glow) was given `z-index: 0`, placing it correctly *behind* the background but still visible.
        *   `overflow: hidden` was removed from `.button-unit` to ensure the glow was not clipped.
    2.  **Hybrid Glow Strategy:**
        *   For selected, resonating buttons, the performant `::after` pseudo-element is used for the animated glow.
        *   For unselected, energized buttons, the standard `box-shadow` was restored to provide their necessary static glow without performance cost.
    3.  **JavaScript Logic:** The `AmbientAnimationManager` and `config.js` were updated to drive the `opacity` and `transform: scale()` of the new pseudo-element glow via CSS custom variables (`--harmonic-resonance-glow-opacity`, `--harmonic-resonance-glow-scale`).
*   **Files Affected:** `src/js/config.js`, `src/js/AmbientAnimationManager.js`, `src/js/Button.js`, `src/css/2-components/_button-unit.css`.
*   **Key Learning:** For smooth, continuous animations, avoid animating expensive CSS properties like `box-shadow` or `filter` on a per-frame basis. Favor animating `transform` and `opacity` on dedicated elements or pseudo-elements. Correct CSS stacking context (`z-index`) and overflow properties are critical for the visibility of layered effects.

### C.10. Dial Theming and Rendering Failures (Multi-part, High-Pain)
*   **Symptom:** A cascade of issues where the SVG-based dials would fail to adopt the correct theme styles. They would appear too bright initially, disappear during startup, and then render black or fail to update when switching between dark and light themes post-startup.
*   **Root Cause Analysis (Iterative & Definitive):**
    1.  **Initial Misdiagnosis (Orchestration):** The problem was initially treated as a simple timing issue where the final redraw call was happening too early. Attempts to fix this by moving the `dialManager.resizeAllCanvases()` call to different points in the startup sequence proved ineffective and brittle.
    2.  **Architectural Flaw Identified:** The true root cause was a fundamental architectural flaw. The `DialController` component was not self-sufficient. It relied entirely on external code (the `startupSequenceManager`) to tell it when to update its appearance. This external orchestration was fragile and failed to account for all state transitions (e.g., theme changes initiated by the user post-startup).
    3.  **The `NaN` Poisoning:** The final, critical failure mode was identified via console logging. An attempt to use `calc()` in the CSS to modify a chroma value (e.g., `--dial-ridge-c: calc(var(--dynamic-env-chroma) / 2);`) was the source of the "dials go black" bug. The JavaScript `parseFloat()` function, used in `DialController` to read this value, **cannot parse a string containing "calc(...)"**. It returns `NaN`, which poisons the entire color rendering calculation, resulting in an invalid `fill` attribute.
*   **Solution Implemented (Definitive):**
    1.  **Component Self-Sufficiency:** The `DialController` was refactored to be fully reactive and self-updating.
        *   It now directly subscribes to the `appState`'s `themeChanged` and `targetColorChanged` (for 'env') events.
        *   Upon detecting a change, it queues its own `forceRedraw()` call, making it completely independent of the startup sequence's orchestration for theme updates. This was the most critical architectural fix.
    2.  **Elimination of `calc()` in CSS for JS-Consumed Variables:**
        *   All `calc()` functions were removed from CSS variables that were intended to be read by `parseFloat()` in JavaScript.
        *   The responsibility for modifying a base value (like halving the chroma) was moved into the `DialController`'s `_updateAndCacheThemeStyles` method. The JS now reads a clean base number from CSS and performs the math itself, preventing any `NaN` parsing errors.
    3.  **Aesthetic Tuning in CSS:** All dial color and contrast values (`--dial-ridge-l`, `--dial-ridge-highlight-l`, `--dial-highlight-exponent`, etc.) were explicitly defined with static, numeric values in each of the three theme files (`theme-dim.css`, `theme-dark.css`, `theme-light.css`), ensuring each theme has a distinct, predictable, and correctly rendered appearance.
*   **Files Affected:** `src/js/DialController.js`, `src/css/3-themes/theme-dim.css`, `src/css/3-themes/theme-dark.css`, `src/css/3-themes/theme-light.css`.
*   **Key Learning (CRITICAL):** Never use `calc()` or other CSS functions in a CSS custom property that you intend to read and parse with JavaScript's `parseFloat()`. The CSS variable must contain a simple, clean numeric value. Perform all mathematical modifications on the JavaScript side after parsing the clean value. This prevents `NaN` poisoning and ensures robust data flow between CSS and JS. A component should, whenever possible, subscribe to the state changes it cares about rather than relying on external callers to manually trigger its updates.

## Section D: XState Refactor & Key Considerations (Post V2.3 - SSR-V1.0)

This section highlights critical aspects and potential pitfalls related to the XState-orchestrated startup sequence, primarily for future maintenance and development.

### D.1. XState Versioning & API Usage (v5 Focus)
*   **Critical Pitfall:** XState v4 and v5 have significant API differences. The project uses **XState v5**.
    *   **Context:** Provide initial context when `interpret`ing the machine or via an event payload assigned by an initial action, not `machine.withContext()`. The `dependencies` object (containing GSAP, managers, etc.) is passed in the payload of the `START_SEQUENCE` event and assigned to the FSM's context.
    *   **Transitions Listener:** Use `actor.subscribe(snapshot => ...)` not `actor.onTransition()`.
    *   **Conditional Transitions:** Use `guard:` not `cond:`. The guard function receives `({ context, event })`.
    *   **Action/Guard Signatures:** Action implementations and guard functions receive an object like `{ context, event, ... }`. Access properties via `event.propertyName` or `context.propertyName`.
    *   **`send` API:** Always send event objects: `actor.send({ type: 'EVENT_NAME', ...payload })`.
    *   **Invoking Promises:** Use the `fromPromise` actor creator. The function provided to `fromPromise` receives an object with an `input` property (populated via the `invoke.input` field in the FSM config) and must return a Promise.
        ```javascript
        // Correct pattern for invoking a dynamically imported promise-returning function:
        import { fromPromise } from 'xstate';
        // ...
        // Helper function in startupMachine.js:
        // const createPhaseService = (importPath) => {
        //   return fromPromise(async ({ input }) => {
        //     const phaseModule = await import(importPath);
        //     if (!phaseModule || typeof phaseModule.createPhaseTimeline !== 'function') { /* error handling */ }
        //     return phaseModule.createPhaseTimeline(input.dependencies);
        //   });
        // };
        // ...
        // In machine state definition:
        invoke: {
          id: 'someService',
          src: createPhaseService('./path-to-module.js'), // Use the helper
          input: ({ context }) => ({ dependencies: context.dependencies }), // Pass data to fromPromise's input
          onDone: { /* ... */ },
          onError: { /* ... */ }
        }
        ```
*   **Symptom of Mismatch:** Errors like `...is not a function` (e.g., `withContext`, `onTransition`, `getInitialSnapshot`), or incorrect behavior of actions/guards/event sending.
*   **Files Affected:** `startupMachine.js`, `startupSequenceManager.js`.
*   **Key Learning:** Always verify XState API usage against the documentation for XState v5. The `fromPromise` creator is standard for promise-based services. Ensure action/guard signatures are correct for v5.

### D.2. Phase Service Promise Resolution & GSAP Timeline Completion
*   **Critical Pitfall:** Each phase module (e.g., `startupPhaseX.js`) invoked by the FSM *must* return a Promise that resolves only after *all* its asynchronous operations (including all GSAP animations it initiates) are fully completed.
    *   If a Promise from a phase service never resolves (e.g., a GSAP timeline within it hangs or its `onComplete` never fires), the FSM will stall in that phase's state.
    *   The `createAdvancedFlicker` utility returns `{ timeline, completionPromise }`. Phase modules must correctly `await` these `completionPromise`s for logical task completion. Additionally, the GSAP `timeline`s returned by `createAdvancedFlicker` (or other GSAP animations) must be properly added to a main GSAP timeline for the phase, and this main timeline must also be played and awaited for visual completion.
*   **Implementation Detail:**
    *   Phase modules (`startupPhaseX.js`) are `async` functions.
    *   They use `Promise.all()` to await all `completionPromise`s from flicker animations.
    *   They construct a main GSAP timeline (`phaseInternalGsapTimeline`) for the phase, add flicker timelines to it, and then `await` the completion of this main timeline using `new Promise(resolve => phaseInternalGsapTimeline.eventCallback('onComplete', resolve).play());`.
*   **Symptom of Mismatch:** Startup sequence stalls in a particular phase. Console logs might show individual promises resolving, but the phase service's main promise doesn't. Visuals for the phase might not complete.
*   **Files Affected:** All `startupPhaseX.js` modules, `animationUtils.js`.
*   **Key Learning:** Distinguish between awaiting the logical setup/promise of an animation and awaiting the completion of its actual GSAP timeline. Both are necessary for robust FSM phase progression. Ensure all created GSAP timelines are finite and their `onComplete` callbacks are reachable.

### D.3. Dependency Injection & Context Integrity
*   **Critical Pitfall:** All external dependencies (GSAP, `appStateService`, managers, DOM elements, config) must be correctly passed into the FSM's initial context by `startupSequenceManager.js` (via the `START_SEQUENCE` event's payload). Phase services receive these dependencies via the `input` argument of the function passed to `fromPromise`.
*   **Symptom of Mismatch:** `TypeError: Cannot read properties of undefined (reading 'someManager')` or `someDependency is not a function` within FSM actions, guards, or phase services.
*   **Files Affected:** `startupSequenceManager.js` (context creation), `startupMachine.js` (context assignment and `invoke.input`), all `startupPhaseX.js` modules (accessing `dependencies`).
*   **Key Learning:** Ensure a clear and consistent dependency injection path from application initialization to FSM context to invoked services.

### D.4. Visual Discrepancies & Animation Targeting
*   **Potential Pitfall:** Animations might logically complete (Promises resolve, FSM transitions) but not produce the intended visual effect.
    *   **Example (P1 MAIN PWR Buttons):** If these buttons "just appear" instead of visibly flickering, it could be due to:
        1.  The `buttonEnergizeP2P5` animation profile in `config.js` having parameters that result in a non-perceptible visual change (e.g., amplitudes too similar, durations too short, glow too faint).
        2.  `createAdvancedFlicker` not correctly targeting the `.light` elements within these specific buttons (check `baseTargetsForOpacity` via logging).
    *   **Example (P3 HUE ASSN / BTN 1-4 Buttons):** If these don't appear `is-dimly-lit`:
        1.  Ensure their HTML elements have the correct `data-group-id` attributes (`skill-scan-group`, `fit-eval-group` for BTN 1-4 containers; HUE ASSN buttons are grouped by `gridManager` as 'env', 'lcd', etc.).
        2.  Verify the `buttonsToPrimeElements` logic in `startupPhase3.js` correctly identifies these buttons based on their `groupId`.
        3.  Check the `buttonP4DimlyLitFlicker` profile for visibility.
*   **Debugging Approach:** Use console logging within animation utilities and phase modules to verify targets and parameters. Temporarily exaggerate animation profile values to confirm the animation path is working. Inspect CSS for overrides.
*   **Files Affected:** `animationUtils.js`, `config.js` (profiles), `startupPhaseX.js` (targeting logic), `index.html` (for `data-group-id`).
*   **Key Learning:** Visual verification is as important as logical completion. Debug targeting and animation parameters if visuals don't match expectations. Ensure HTML attributes support JS targeting logic.

---