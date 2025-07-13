
## Notes for Future Scope & Technical Debt

The following items were identified during the review but are considered higher-risk or lower-priority than the items in the plan above. They are captured here for future planning.

#### **1. SVG Dial Rendering Performance Refactor**

*   **Observation:** The current `DialController` uses `getBoundingClientRect()` within its render loop (`_draw`), which can cause performance issues by forcing browser reflows on every frame.
*   **Proposed Solution:** Refactor the rendering logic to use a static, virtual `viewBox` (e.g., "0 0 200 200") for all internal calculations. The browser's native, highly-optimized SVG engine would then handle the scaling to the final on-screen size.
*   **Reason for Deferral:** **High Risk.** The existing rendering logic is mathematically complex, involving 3D perspective projection and dynamic lighting calculations. A direct porting of this logic risks introducing subtle but significant visual regressions.
*   **Next Step:** Before this task is scheduled, a **time-boxed technical spike** is strongly recommended to create a small, isolated prototype. The goal of the spike would be to prove that the `viewBox`-based math can perfectly replicate the existing visual output. This will de-risk the effort and provide an accurate time estimate.

#### **2. Deepen Haptic Feedback Integration**

*   **Observation:** The current haptic system provides simple, one-shot feedback (`click`, `toggleOn`, etc.).
*   **Potential Enhancement:** The `HapticFeedbackManager` could be enhanced to support more complex, patterned vibrations. For example, a "success" pattern (`[50, 50, 50]`) or an "error" pattern (`[100, 50, 100, 50, 100]`).
*   **Reason for Deferral:** **Low Priority.** The current system is functional and provides good baseline feedback. This is a "nice-to-have" enhancement, not a core requirement.

#### **3. Investigate Component-Level State Management**

*   **Observation:** The application relies heavily on a single, global `appState` module for all state management. While effective for this project's scale, it can lead to tight coupling as an application grows. For instance, `AmbientAnimationManager` and `LensManager` both listen for generic `dialUpdated` events and then filter by `id`, rather than subscribing to a more specific, relevant state change.
*   **Potential Enhancement:** For future, larger projects, consider a pattern where components can manage their own internal state and only publish/subscribe to high-level, intentional events or state slices from the global store. This would improve component encapsulation and reusability.
*   **Reason for Deferral:** **Architectural Overhead.** The current system works well for the application's size. Introducing a more complex state management pattern at this stage would be an over-architecture. This is a strategic consideration for future projects.