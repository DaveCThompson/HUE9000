Understood. The plan has been updated to incorporate the feedback regarding the watchdog timer and cleanup responsibilities. The PRD now reflects a more robust and maintainable architecture.

Here is the revised `RF-1.md`.

---

# Development Plan A: System Integrity & User Feedback Loop (REVISED)

**Status:** **Approved**
**Author:** AI Principal Engineer
**Date:** October 26, 2023

---

### **1. Product Requirements Document (PRD)**

#### **Overview**

The primary user-driven interaction in the HUE 9000 interface is the "Scan" sequence. Currently, this core feature suffers from critical reliability issues, including a high probability of failure on subsequent uses and a potential to lock the entire terminal. This plan focuses on re-architecting the scan lifecycle to ensure system integrity and provide a clear, robust user feedback loop.

#### **Key Requirements**

| ID | Requirement | Value & Rationale |
| :-- | :--- | :--- |
| **TERM-1** | **Ensure Scan Re-entrancy** | **Critical.** A core feature that can only be used once per page load is fundamentally broken. This fixes the state management bug that prevents subsequent scans from initializing and running correctly. |
| **TERM-2** | **Implement FSM-Native Timeout Recovery** | **High.** The scan's Finite State Machine (FSM) can deadlock if an internal promise never resolves. A **15-second, FSM-native timeout** will gracefully abort a stuck scan and return control to the user, ensuring application resilience without requiring long waits. |
| **TERM-3** | **Standardize Scan Termination Feedback** | **Medium.** The conclusion of a scan is abrupt. This will implement clear, styled messages for success, user-initiated aborts, and system errors, improving the clarity of the user feedback loop. |
| **TERM-4** | **Implement Lightweight Aural Cues** | **Medium.** To improve usability for non-visual users, the system will announce key scan state changes (e.g., "Evaluation started," "Conclusion: ...") via a screen-reader-accessible live region. |

---

### **2. Architectural Approach**

The root cause of the scan failures is a tight coupling and confused ownership between the `TerminalManager` and the `ScanOrchestrator`. This plan decouples these modules and clarifies their roles, with the `ScanOrchestrator` taking full ownership of the scan lifecycle.

#### **1. Decoupled Scan Lifecycle Management**

*   **`TerminalManager`'s Role:** Its *sole* responsibility is managing the terminal text buffer and message queue. When it receives a 'scan' request, its only actions will be to:
    1.  Pause its own message queue processing.
    2.  Clear its display content.
    3.  Provide a single, empty container element (`.scan-animation-container`) to the orchestrator.
    4.  Listen for the global `scanComplete` event to resume its queue.

*   **`ScanOrchestrator`'s Role:** It will now **own the entire scan lifecycle**, including UI creation and teardown.
    1.  It will receive the container element from the `TerminalManager`.
    2.  It will build, manage, and animate all of its own UI within that container.
    3.  It will implement a **centralized `_cleanup()` method** responsible for stopping the FSM, killing all related GSAP animations, and removing its UI from the DOM.
    4.  The `_cleanup()` method will be called reliably whenever the FSM reaches *any* final state (completed, aborted, or error).

*   **`appState` as an Event Bus:** The modules will communicate via the central `appState` event bus. When the `ScanOrchestrator`'s FSM finishes, it will emit a global `scanComplete` event. This eliminates direct dependencies and ensures a clean handoff back to the `TerminalManager`.

#### **2. FSM Resilience via Native Timeouts**

The previous "external watchdog" approach is replaced with a more robust, FSM-native solution.
1.  The `scanFSM.js` machine definition will include a built-in timeout using XState's `after` transition feature.
2.  If the main `running` state is active for more than **15 seconds** without transitioning, the `after` event will automatically fire.
3.  This event will transition the FSM to an `error` state.
4.  This `error` state is a final state, which will trigger the `ScanOrchestrator`'s `_cleanup()` routine and the emission of the `scanComplete` event, reliably returning control to the user.

#### **3. Abstracted Accessibility Layer**

The `ScanOrchestrator` will create and manage a visually hidden `div` with `aria-live="polite"` attributes. At key transition points (e.g., `startScan`, `_runOutroAnimation`), it will update the `textContent` of this div to announce state changes, providing a non-intrusive accessibility layer.

---

### **3. File Manifest**

#### **Modified Files (4)**

*   `src/js/terminalManager.js` (Major)
    *   Will be refactored to implement the simplified, decoupled lifecycle. Watchdog logic will be removed.
*   `src/js/scanOrchestrator.js` (Medium)
    *   Will be updated to implement the `_cleanup()` method and manage its full UI lifecycle.
*   `src/js/scanFSM.js` (Minor)
    *   Will be updated to include the `after` transition for the 15-second timeout. Final states will be adjusted for clear status reporting.
*   `src/js/terminalMessages.js` (Minor)
    *   New message strings for abort/error states will be added.