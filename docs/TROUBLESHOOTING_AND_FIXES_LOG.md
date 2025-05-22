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