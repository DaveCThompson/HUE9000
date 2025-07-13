# Development Plan A: System Integrity & User Feedback Loop

**Status:** Proposed
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
| **TERM-2** | **Introduce FSM Timeout Recovery** | **High.** The scan's Finite State Machine (FSM) can deadlock if an internal promise never resolves, freezing the terminal. A 30-second "watchdog" timer will gracefully abort a stuck scan and return control to the user, ensuring application resilience. |
| **TERM-3** | **Standardize Scan Termination Feedback** | **Medium.** The conclusion of a scan is abrupt. This will implement clear, styled messages for success, user-initiated aborts, and system errors, improving the clarity of the user feedback loop. |
| **TERM-4** | **Implement Lightweight Aural Cues** | **Medium.** To improve usability for non-visual users, the system will announce key scan state changes (e.g., "Evaluation started," "Conclusion: ...") via a screen-reader-accessible live region. |

---

### **2. Architectural Approach**

The root cause of the scan failures is a tight coupling and confused ownership between the `TerminalManager` and the `ScanOrchestrator`. The `TerminalManager` currently attempts to manage the lifecycle of the scan UI, which is not its core responsibility. This plan decouples these modules and clarifies their roles.

#### **1. Decoupled Scan Lifecycle Management**

*   **`TerminalManager`'s Role:** Its *sole* responsibility is managing the terminal text buffer and message queue. When it receives a 'scan' request, its only actions will be to:
    1.  Pause its own message queue.
    2.  Clear its display content.
    3.  Provide a single, empty container element (`.scan-animation-container`) to the orchestrator.
    4.  Start the "watchdog" timeout (see below).

*   **`ScanOrchestrator`'s Role:** It will now *own the entire scan lifecycle* within the container provided by the terminal. It is responsible for creating, managing, and cleaning up all of its own UI elements.

*   **`appState` as an Event Bus:** The modules will communicate via the central `appState` event bus. When the `ScanOrchestrator`'s FSM finishes (success, abort, or error), it will emit a global `scanComplete` event. The `TerminalManager` will listen for this event to resume its own message queue. This eliminates direct dependencies.

#### **2. FSM Resilience via External Watchdog**

The `TerminalManager`, as the *initiator* of the scan, will implement the timeout.
1.  Upon initiating a scan, it will start a 30-second `setTimeout`.
2.  Upon receiving the `scanComplete` event, it will clear this timeout.
3.  If the timeout fires, it means the FSM is stuck. The `TerminalManager` will then force a cleanup, destroy the scan UI, and display a "System Recovery" message before resuming its queue.

#### **3. Abstracted Accessibility Layer**

The `ScanOrchestrator` will create and manage a visually hidden `div` with `aria-live="polite"` attributes. At key transition points (e.g., `startScan`, `_runOutroAnimation`), it will update the `textContent` of this div to announce state changes, providing a non-intrusive accessibility layer.

---

### **3. File Manifest**

#### **Modified Files (4)**

*   `src/js/terminalManager.js` (Major)
    *   Will be refactored to implement the decoupled lifecycle, watchdog timer, and event-based communication.
*   `src/js/scanOrchestrator.js` (Medium)
    *   Will be updated to manage its UI cleanup and the ARIA live region.
*   `src/js/scanFSM.js` (Minor)
    *   Final states will be adjusted to provide clear status (aborted, error, completed) for the feedback loop.
*   `src/js/terminalMessages.js` (Minor)
    *   New message strings for abort/error states will be added.