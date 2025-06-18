# HUE 9000 Startup Sequence: FSM Orchestration - Plan & Design

## Part 1: Product Requirements Document (PRD)

**1. Introduction & Goals**

*   **Product:** HUE 9000 Interactive Web Interface - Startup Sequence Module.
*   **Project:** Refactor the existing GSAP-based startup sequence to be orchestrated by a Finite State Machine (FSM) using XState.
*   **Goals:**
    *   **G1. Unwavering Reliability:** Eliminate instances of animations not completing, elements being left in intermediate/incorrect visual states, or critical application states (e.g., `appStatus = 'interactive'`) being set prematurely or too late. Address timing issues like those noted in `TROUBLESHOOTING_AND_FIXES_LOG.md` (e.g., C.5).
    *   **G2. Enhanced Maintainability:** Simplify the process of understanding, modifying, and extending the startup sequence. Reduce implicit inter-dependencies between phase logic by making transitions explicit.
    *   **G3. Improved Debuggability:** Provide clearer insights into the current state of the startup sequence and the transitions between phases via FSM state logging and potential integration with XState visualization tools.
    *   **G4. Explicit Error Handling:** Implement a structured way to handle potential errors during any phase of the startup sequence, allowing for graceful degradation (transition to an `ERROR_STATE`) or clear error reporting.
    *   **G5. Preserve User Experience:** Maintain the existing high-quality visual fidelity and choreographed feel of the startup sequence as detailed in `STARTUP_SEQUENCE.md`. The FSM should orchestrate, not dictate, the creative execution of animations within each phase.
    *   **G6. Support for Step-Through Debugging:** The FSM must accommodate the existing step-through debugging functionality, allowing developers to advance the sequence phase by phase, controlled via `debugManager.js`.

**2. Target Users & Use Cases**

*   **Target Users:**
    *   **End Users:** Experience a flawless, visually engaging startup sequence every time the application loads.
    *   **Developers (Maintainers & Future Contributors):** Work with a startup sequence that is easier to understand, debug, and extend due to a more declarative and robust flow control mechanism.
*   **Use Cases:**
    *   **UC1 (End User - Auto Play):** On application load (when not in debug step-through mode), the user observes the full, uninterrupted startup sequence (P0-P7 as per `STARTUP_SEQUENCE.md`), culminating in a fully interactive interface (`appStatus = 'interactive'`).
    *   **UC2 (End User - Error Scenario):** If a critical error occurs during a startup phase (e.g., a phase service's Promise rejects), the system transitions to a defined error state, logs the error, and potentially updates the UI to indicate a startup failure, rather than leaving the UI in an inconsistent or broken state.
    *   **UC3 (Developer - Step-Through):** A developer can initiate the startup sequence in a step-through mode. The FSM will pause after each phase completes its operations. The developer can then trigger the transition to the next phase via the debug controls (`btn-next-phase`).
    *   **UC4 (Developer - Modification):** A developer needs to add a new visual step or modify an existing phase. The FSM structure (defined states and invoked services) should make it clear where to integrate this change and how it affects the overall flow.
    *   **UC5 (Developer - Debugging):** A developer encounters an issue within a specific phase. The FSM's current state, context, and event logging (and potentially XState Viz) should help pinpoint the problem in the sequence's flow.

**3. Functional Requirements (Features)**

*   **FR1. State Definition:** The FSM shall define distinct states corresponding to each logical phase of the HUE 9000 startup sequence (e.g., `IDLE`, `PHASE_0_BOOTING` (P0+P1), `PHASE_1_MAIN_PWR` (P2), `PHASE_2_OPTICAL_CORE` (P3), `PHASE_3_SUBSYSTEM_PRIMING` (P4), `PHASE_4_AUX_SYSTEMS` (P5), `PHASE_5_ACTIVATION` (P6+P7), `SYSTEM_READY`).
*   **FR2. Event-Driven Transitions:** Transitions between states shall be triggered by defined events (e.g., `START_SEQUENCE`, `NEXT_STEP_REQUESTED`) or by the completion/error of invoked services.
*   **FR3. Phase Execution as Services/Actors:** Each FSM state representing a startup phase shall `invoke` a corresponding "service" (an async function).
    *   **FR3.1.** These services will be derived from the existing `startupPhaseX.js` modules.
    *   **FR3.2.** Services must return a `Promise`, resolving upon successful completion of the phase's activities (including all GSAP animations) or rejecting on error.
*   **FR4. Context Management:** The FSM shall manage a `context` object.
    *   **FR4.1.** The initial context will include necessary dependencies: GSAP instance, `appStateService`, all manager instances (`buttonManager`, `lensManager`, etc.), `domElementsRegistry`, and `configModule`.
    *   **FR4.2.** The context will also store transient state for the startup flow, such as `isStepThroughMode` and `errorInfo`.
*   **FR5. Action Execution:** The FSM shall support executing "actions" (side effects) upon state entry, state exit, or during transitions. Examples:
    *   Emitting terminal messages via `appStateService.emit('requestTerminalMessage', ...)`.
    *   Notifying `debugManager` of phase changes via `appStateService.emit('startup:phaseChanged', ...)`.
    *   Setting `appStateService.appStatus('interactive')` upon reaching `SYSTEM_READY`.
*   **FR6. Auto-Play Mode:**
    *   **FR6.1.** Upon receiving a `START_SEQUENCE` event (when `isStepThroughMode` is false), the FSM shall automatically transition through all startup phases sequentially until `SYSTEM_READY` is reached.
    *   **FR6.2.** The transition to the next phase shall occur automatically when the current phase's invoked service successfully resolves its Promise (`onDone`).
*   **FR7. Step-Through Mode:**
    *   **FR7.1.** The FSM must be initializable with `isStepThroughMode: true` in its context.
    *   **FR7.2.** When a phase service completes (`onDone`) and `isStepThroughMode` is true, the FSM shall transition to a `PAUSED_AWAITING_NEXT_STEP` state.
    *   **FR7.3.** An external event `NEXT_STEP_REQUESTED` (sent by `debugManager` via `startupSequenceManager`) shall trigger the FSM to transition from `PAUSED_AWAITING_NEXT_STEP` to the next logical phase.
*   **FR8. Error Handling:**
    *   **FR8.1.** If a phase execution service rejects its Promise (`onError`), the FSM shall transition to a defined `ERROR_STATE`.
    *   **FR8.2.** Actions associated with entering `ERROR_STATE` should log the error (from `event.data`), update `appStateService.appStatus('error')`, and potentially display a startup failure message in the terminal.
*   **FR9. Final State:** The FSM shall have a terminal `SYSTEM_READY` state.
    *   **FR9.1.** Upon entering `SYSTEM_READY`, an action shall set `appStateService.setAppStatus('interactive')`.
*   **FR10. Reset Functionality:** The FSM interpreter must be stoppable and restartable. `startupSequenceManager.resetSequence()` will re-initialize the FSM interpreter with its initial state (`IDLE`) and context, allowing the startup sequence to be re-initiated (primarily for debugging).

**4. Non-Functional Requirements**

*   **NFR1. Performance:** The FSM orchestration layer itself should introduce negligible performance overhead. The primary performance characteristics will continue to be dictated by the GSAP animations and DOM manipulations within each phase's service.
*   **NFR2. Code Readability:** The FSM definition (`startupMachine.js`) and associated service/action implementations should be clear, well-documented, and follow XState best practices.
*   **NFR3. Testability:** The FSM structure should lend itself to easier testing of the startup flow logic. Individual phase services can also be tested more easily in isolation.
*   **NFR4. Extensibility:** Adding new phases or modifying existing ones should be a relatively straightforward process by defining new states, services, and transitions in the machine configuration.

**5. Assumptions & Dependencies**

*   **A1.** XState (`xstate` npm package) will be chosen and integrated as the FSM library.
*   **A2.** Existing phase logic modules (`startupPhase0.js` to `startupPhase5.js`) will be refactored to export `async function executePhase(dependencies)` which returns a Promise. The `dependencies` argument will be the FSM's `context.dependencies`.
*   **A3.** All necessary manager instances (`buttonManager`, `lensManager`, etc.), `appStateService`, `domElementsRegistry`, `configModule`, and the GSAP instance will be passed into the FSM's initial context via `startupSequenceManager.js`.
*   **A4.** GSAP will remain the primary animation library used within the phase execution services.
*   **A5.** The `dimAttenuationProxy` will be passed as part of the dependencies in the FSM context if needed by phase services.

**6. Future Considerations (Out of Scope for Initial Refactor but to keep in mind)**

*   **FS1. Visual FSM Debugger:** Integration with tools like Stately Studio (formerly XState Viz) for live visualization of the FSM's state during development.
*   **FS2. Parallel States:** For future enhancements where some startup activities might occur concurrently but independently (e.g., loading assets while an initial animation plays). XState supports parallel states.
*   **FS3. More Granular Error Recovery:** Potentially allowing retries for certain non-critical startup errors or alternative paths, which XState can model.

---

## Part 2: FSM Architecture Plan

**1. Chosen FSM Library: XState**

*   **Rationale:** XState is a mature, powerful, and widely adopted JavaScript library for creating state machines and statecharts. It offers:
    *   Compliance with SCXML W3C standard.
    *   Hierarchical and parallel states.
    *   Guards (conditional transitions, `cond`).
    *   Actions (entry, exit, transition).
    *   Invoked services/actors (perfect for our Promise-returning phase modules).
    *   Context management for stateful data.
    *   Strong TypeScript support.
    *   Excellent documentation, community, and visualization tools (Stately Studio).

**2. Core Architectural Components**

*   **`startupMachine.js` (New File in `src/js/`):**
    *   Defines the XState machine configuration using `createMachine`. This includes states, initial context, events, transitions, invoked services, actions, and guards.
    *   This will be the single source of truth for the startup sequence flow.
*   **`startupSequenceManager.js` (Refactored):**
    *   No longer builds or manages a master GSAP timeline directly.
    *   Responsible for:
        *   Initializing the XState interpreter (`interpret(startupMachine)`).
        *   Providing the initial `context` (all dependencies like GSAP, managers, `appStateService`, etc.) to the machine.
        *   Starting the interpreter (`interpreter.start()`).
        *   Sending initial events to the FSM (e.g., `{ type: 'START_SEQUENCE', isStepThroughMode: true }`).
        *   Interfacing with `debugManager.js`:
            *   `playNextPhase()` will send a `NEXT_STEP_REQUESTED` event to the FSM.
        *   Subscribing to interpreter state changes (`interpreter.onTransition(state => ...)`) to:
            *   Log FSM state transitions.
            *   Update `debugManager` UI (e.g., phase status, enabling/disabling "Next Phase" button).
        *   Handling `resetSequence()`: Stops the current interpreter (if any), re-initializes a new interpreter with a fresh context, and sends the `START_SEQUENCE` event.
*   **Phase Modules (`startupPhaseX.js`) (Refactored):**
    *   Each module (e.g., `startupPhase0.js`) will export an `async function executePhase(dependencies)`:
        *   `dependencies`: The `context.dependencies` object passed from the FSM.
        *   This function will contain all the GSAP animations and logic for that specific phase.
        *   It **must** return a `Promise`. The Promise resolves when all operations for that phase (including GSAP animations via their `onComplete` callbacks) are successfully finished. It rejects if a critical error occurs in the phase.
        *   Direct calls to `handleStepComplete` or `notifyPhaseChange` from within these modules will be removed; these notifications will be handled by FSM actions or `onTransition` listeners in `startupSequenceManager.js`.
*   **`config.js`:** May define constants for FSM event names and state names for consistency, though often these are kept within the machine definition itself.

**3. FSM State Design**

*   **Top-Level States:**
    *   `IDLE`: Initial state before startup begins.
    *   `RUNNING_SEQUENCE`: Parent state encapsulating the active execution of the startup phases.
        *   `PHASE_0_BOOTING` (Invokes `startupPhase0.executePhase`)
        *   `PHASE_1_MAIN_PWR` (Invokes `startupPhase1.executePhase`)
        *   `PHASE_2_OPTICAL_CORE` (Invokes `startupPhase2.executePhase`)
        *   `PHASE_3_SUBSYSTEM_PRIMING` (Invokes `startupPhase3.executePhase`)
        *   `PHASE_4_AUX_SYSTEMS` (Invokes `startupPhase4.executePhase`)
        *   `PHASE_5_ACTIVATION` (Invokes `startupPhase5.executePhase`)
    *   `PAUSED_AWAITING_NEXT_STEP`: State entered in step-through mode after a phase completes, waiting for user input to proceed.
    *   `SYSTEM_READY`: Final successful state; application is interactive.
    *   `ERROR_STATE`: State entered if any phase service rejects its Promise.

*   **Initial Context (`context`):**
    ```javascript
    {
        dependencies: { // Populated by startupSequenceManager
            gsap: null,
            appStateService: null,
            managerInstances: { /* buttonManager, lensManager, etc. */ },
            domElementsRegistry: { /* body, logoContainer, etc. */ },
            configModule: null,
            dimAttenuationProxy: null
        },
        isStepThroughMode: true, // Default or set by START_SEQUENCE event
        currentPhaseNameForResume: '', // Stores the name of the phase to run next when resuming from PAUSED
        errorInfo: null // Stores error details if ERROR_STATE is reached
    }
    ```

*   **Key Events:**
    *   `START_SEQUENCE`: Payload `{ isStepThroughMode: boolean }`. Triggers start from `IDLE`.
    *   `NEXT_STEP_REQUESTED`: Triggered by debug panel to advance from `PAUSED_AWAITING_NEXT_STEP`.
    *   (Implicit XState events: `done.invoke.phaseXService` on Promise resolution, `error.platform.phaseXService` on Promise rejection).

*   **Key Transitions & Logic:**

    1.  **`IDLE` State:**
        *   On `START_SEQUENCE` event:
            *   Action: `assignIsStepThroughModeToContext` (from event payload).
            *   Action: `assignDependenciesToContext` (if not already set, though better to set on interpreter creation).
            *   Transition to: `RUNNING_SEQUENCE.PHASE_0_BOOTING`.

    2.  **`RUNNING_SEQUENCE.PHASE_X_...` States (e.g., `PHASE_0_BOOTING`):**
        *   `invoke`:
            *   `src`: `runPhaseXService` (e.g., `(context, event) => startupPhase0.executePhase(context.dependencies)`).
            *   `onDone`:
                *   Target: `PAUSED_AWAITING_NEXT_STEP` (If `isStepThroughMode` is true - checked by `cond`).
                    *   Action: `assignNextPhaseForResume` (e.g., set `currentPhaseNameForResume` to `PHASE_X+1_...`).
                *   Target: `RUNNING_SEQUENCE.PHASE_X+1_...` (If `isStepThroughMode` is false).
            *   `onError`:
                *   Target: `ERROR_STATE`.
                *   Action: `assignErrorInfoToContext` (from `event.data`).

    3.  **`RUNNING_SEQUENCE.PHASE_5_ACTIVATION` (Last Phase):**
        *   `invoke`: (Similar to above)
            *   `onDone`:
                *   Target: `PAUSED_AWAITING_NEXT_STEP` (If `isStepThroughMode` is true).
                    *   Action: `assignNextPhaseForResume` (set `currentPhaseNameForResume` to `SYSTEM_READY_TARGET` or similar special value).
                *   Target: `SYSTEM_READY` (If `isStepThroughMode` is false).
            *   `onError`: (Same as other phases)

    4.  **`PAUSED_AWAITING_NEXT_STEP` State:**
        *   On `NEXT_STEP_REQUESTED` event:
            *   Transition to: The state name stored in `context.currentPhaseNameForResume` (this requires dynamic target resolution or multiple conditional transitions).
                *   Example: If `context.currentPhaseNameForResume === 'PHASE_1_MAIN_PWR'`, transition to `RUNNING_SEQUENCE.PHASE_1_MAIN_PWR`.
                *   If `context.currentPhaseNameForResume === 'SYSTEM_READY_TARGET'`, transition to `SYSTEM_READY`.

    5.  **`SYSTEM_READY` State:**
        *   `type`: `'final'` (Indicates a terminal state for the machine).
        *   `entry` Actions:
            *   `setAppStatusInteractive` (call `appStateService.setAppStatus('interactive')`).
            *   `notifySystemReadyToDebugManager`.

    6.  **`ERROR_STATE` State:**
        *   `entry` Actions:
            *   `logErrorToConsole` (using `context.errorInfo`).
            *   `setAppStatusError` (call `appStateService.setAppStatus('error')`).
            *   `displayStartupErrorMessageInTerminal`.

*   **Actions (Examples):**
    *   `assignIsStepThroughModeToContext: assign({ isStepThroughMode: (context, event) => event.isStepThroughMode })`
    *   `assignNextPhaseForResume: assign({ currentPhaseNameForResume: (context, event, { state }) => /* logic to determine next phase name */ })`
    *   `assignErrorInfoToContext: assign({ errorInfo: (context, event) => event.data })`
    *   Actions to call `appStateService.emit('requestTerminalMessage', ...)` or `appStateService.emit('startup:phaseChanged', ...)` can be placed on `entry` of phase states or on transitions.

**4. Architectural Choices (Summary)**

*   **FSM Library:** XState.
*   **Step-Through Handling:** A dedicated `PAUSED_AWAITING_NEXT_STEP` state, with transitions to it guarded by `isStepThroughMode`. The next phase to run is stored in context.
*   **Granularity of Invoked Services:** Phase-Level Services. Each `startupPhaseX.js` module provides one `executePhase` service.
*   **GSAP Timeline Management:** Each Phase Service (`executePhase`) creates and manages its own GSAP timelines internally. The service returns a Promise that resolves/rejects based on the completion/failure of these internal operations. The FSM orchestrates the invocation of these services.

**5. Data Flow & Dependencies**

1.  `main.js` initializes all managers and `startupSequenceManager.js`.
2.  `startupSequenceManager.init()` receives all dependencies (GSAP, `appStateService`, other managers, DOM elements, config).
3.  `startupSequenceManager.start(isStepThroughMode, dimAttenuationProxy)`:
    *   Creates an XState interpreter with `startupMachine`.
    *   Populates the interpreter's initial `context` with all dependencies and `isStepThroughMode`.
    *   Starts the interpreter.
    *   Sends the `START_SEQUENCE` event (with `isStepThroughMode` payload) to the FSM.
4.  FSM transitions from `IDLE` to `RUNNING_SEQUENCE.PHASE_0_BOOTING`.
5.  The FSM `invokes` the `runPhase0Service` (which internally calls `startupPhase0.executePhase(context.dependencies)`).
6.  `startupPhase0.executePhase()` performs its GSAP animations and other logic, then returns a Promise.
7.  When the Promise resolves (`onDone`):
    *   If `isStepThroughMode` (guard `cond` is true): FSM transitions to `PAUSED_AWAITING_NEXT_STEP`. `startupSequenceManager` (listening to FSM transitions) updates `debugManager` (e.g., enables "Next Phase" button).
    *   Else (auto-play): FSM transitions directly to `RUNNING_SEQUENCE.PHASE_1_MAIN_PWR`.
8.  If in step-through, `debugManager` (when user clicks "Next Phase") calls `startupSequenceManager.playNextPhase()`, which sends `NEXT_STEP_REQUESTED` to the FSM.
9.  FSM transitions from `PAUSED_AWAITING_NEXT_STEP` to the phase specified in `context.currentPhaseNameForResume`.
10. This cycle repeats until `SYSTEM_READY` (final state) or `ERROR_STATE` is reached.
11. Actions within the FSM (e.g., `setAppStatusInteractive`, `emit('requestTerminalMessage')`) are triggered at appropriate state entries or transitions. `startupSequenceManager` also listens to FSM transitions to call `_notifyPhaseChange` for the debug panel.

---

## Part 3: Implementation Steps (High-Level)

1.  **Setup & Installation:**
    *   Install XState: `npm install xstate`.
    *   Create `src/js/startupMachine.js`.

2.  **Define `startupMachine.js`:**
    *   Import `createMachine`, `assign` from `xstate`.
    *   Define the machine structure as outlined in "FSM State Design" above (states, context schema, events, transitions, invokes, actions, guards).
    *   Initially, service implementations (`src` for `invoke`) can be stubs that resolve Promises immediately for flow testing.
    *   Action implementations can start with `console.log` stubs.

3.  **Refactor Phase Modules (`startupPhaseX.js`):**
    *   For each `startupPhaseN.js` (e.g., `startupPhase0.js`):
        *   Modify the main exported function to be `export async function executePhase(dependencies) { ... }`.
        *   The `dependencies` object will be `context.dependencies` from the FSM. Access `gsap`, `appStateService`, `managerInstances`, `domElementsRegistry`, `configModule`, `dimAttenuationProxy` via this object.
        *   Wrap the existing GSAP timeline logic (and any other async operations) within a `new Promise((resolve, reject) => { ... })`.
        *   The main GSAP timeline's `onComplete` for that phase should call `resolve()`.
        *   If any critical error occurs that should halt the startup, call `reject(new Error('Phase N failed: reason'))`.
        *   Remove direct calls to `handleStepComplete` or `notifyPhaseChange` from these modules.
        *   Ensure all necessary dependencies are accessed via the passed `dependencies` object.

4.  **Implement FSM Services & Actions in `startupMachine.js` (or linked files):**
    *   **Services:** Update the `src` for each phase's `invoke` to correctly call the refactored `executePhase` function from the corresponding `startupPhaseX.js` module.
        ```javascript
        // Example for one service in startupMachine.js
        services: {
            runPhase0Service: (context, event) => import('./startupPhase0.js').then(mod => mod.executePhase(context.dependencies)),
            // ... and so on for all phases
        }
        ```
    *   **Actions:** Implement the actual logic for actions like `setAppStatusInteractive`, `logErrorToConsole`, `emitTerminalMessage`, etc., using `context.dependencies.appStateService` and other dependencies.

5.  **Refactor `startupSequenceManager.js`:**
    *   Import `interpret` from `xstate` and the `startupMachine` definition.
    *   `init(config)`: Store dependencies (GSAP, `appStateService`, managers, etc.).
    *   `start(stepMode = true, dimAttenuationProxyInstance)`:
        *   If an interpreter instance exists, `stop()` it.
        *   Create the initial FSM context, populating `dependencies` with all necessary instances (including `dimAttenuationProxyInstance`).
        *   Create a new interpreter: `this.interpreter = interpret(startupMachine.withContext(initialContext));`
        *   Set up an `onTransition` listener on the interpreter:
            ```javascript
            this.interpreter.onTransition(state => {
                if (state.changed) {
                    console.log('[FSM Transition]', state.value, state.context);
                    // Call _notifyPhaseChange for debugManager updates
                    // Enable/disable "Next Phase" button in debugManager based on state.value
                }
            });
            ```
        *   Start the interpreter: `this.interpreter.start();`
        *   Send the initial event: `this.interpreter.send({ type: 'START_SEQUENCE', isStepThroughMode: stepMode });`
        *   Remove old `buildMasterTimeline` and direct GSAP play/pause logic.
    *   `playNextPhase()`:
        *   `if (this.interpreter) this.interpreter.send('NEXT_STEP_REQUESTED');`
    *   `resetSequence(dimAttenuationProxyInstance)`:
        *   Call `resetVisualsAndState()` (may need minor adjustments to not interfere with FSM).
        *   Call `start(true, dimAttenuationProxyInstance)` to re-initialize and start the FSM in step-through mode from `IDLE`.
    *   The old `_handleStepComplete` and `_notifyPhaseChange` will be driven by the FSM's state transitions observed in the `onTransition` listener.

6.  **Integrate with `debugManager.js`:**
    *   `debugManager.setNextPhaseButtonEnabled()` will be called by `startupSequenceManager` based on the FSM's current state (e.g., enabled if FSM is in `PAUSED_AWAITING_NEXT_STEP`, disabled otherwise or if in `SYSTEM_READY`/`ERROR_STATE`).
    *   `debugManager.updatePhaseDisplay()` will be called by `startupSequenceManager` (via `_notifyPhaseChange`) based on FSM state transitions.

7.  **Testing & Refinement:**
    *   Test auto-play mode thoroughly.
    *   Test step-through mode for each phase, ensuring pauses and resumes work correctly.
    *   Test reset functionality at various points in the sequence.
    *   Test error handling: Intentionally modify a phase's `executePhase` to `reject()` its Promise and verify the FSM transitions to `ERROR_STATE` and logs/updates UI appropriately.
    *   Use XState Viz (by `JSON.stringify(startupMachine)` and pasting into Stately.io/viz) or console logs from `onTransition` to observe FSM behavior.
    *   Verify all visual animations execute correctly and completely within their respective phase services.
    *   Confirm `appStateService.appStatus` is set to `interactive` only when `SYSTEM_READY` is reached.

**7. Risk Assessment & Mitigation**

*   **Risk 1: Learning Curve for XState.**
    *   **Mitigation:** Allocate focused time for developers to understand XState core concepts (machines, states, events, context, actions, services, guards). Start with the official XState documentation and examples. The planned FSM structure is relatively linear, which should ease adoption.
*   **Risk 2: Over-Engineering with FSM for Simpler Parts.**
    *   **Mitigation:** Keep the FSM states at the logical phase level (P0-P5). Avoid creating FSM states for every minor animation. The granularity of `startupPhaseX.js` modules is appropriate for FSM services.
*   **Risk 3: Debugging FSM Logic.**
    *   **Mitigation:** Utilize XState DevTools/Stately Viz for visualization. Implement comprehensive logging within the `interpreter.onTransition()` handler in `startupSequenceManager.js` to trace states, events, and context changes.
*   **Risk 4: Integrating GSAP's Asynchronous Nature with FSM's Invoked Promises.**
    *   **Mitigation:** This is the most critical integration. Each `executePhase` service *must* correctly return a Promise that only resolves when all its GSAP animations (and any other async work) are complete. Use GSAP's `onComplete` for the main timeline within the phase to trigger `resolve()`. For multiple parallel GSAP timelines within a phase, use `Promise.all()`. Thoroughly test each phase's Promise resolution.
*   **Risk 5: Context Management & Dependency Passing.**
    *   **Mitigation:** Clearly define the initial context in `startupSequenceManager.js` when creating the FSM interpreter. Ensure all phase modules (`executePhase`) correctly access their dependencies *only* from the `dependencies` object passed to them (which comes from `context.dependencies`). Avoid relying on module-level globals within phase services.
*   **Risk 6: P6 (`startupPhase5.js`) Complexity:**
    *   **Mitigation:** The `startupPhase5.executePhase` service will be the most complex. It needs to return a Promise that resolves only after the CSS transition (orchestrated by a GSAP delay/timeline) AND the button flicker animations (managed by `buttonManager`, which itself returns a Promise) are complete. `Promise.all()` will be key here. The cleanup actions (removing temporary classes) must occur after these completions.

This plan provides a solid foundation for the XState refactor, addressing the project's needs and leveraging XState's strengths.