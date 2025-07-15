Area: Maintainability / Scalability
Description: The MobileColorSlider component, while not a primary focus of the PRD, is being modified and exhibits architectural flaws that run counter to the plan's goals of establishing "clean, scalable patterns." It is tightly coupled to application state, directly calling appState.setTargetColorProperties for four separate targets (env, logo, lcd, btn). This violates the single responsibility principle; the slider should manage sliding, not orchestrate the color state of the entire application.
Impact: High. This creates a future maintenance bottleneck. If a new color target is added, or if the logic for how targets derive their color changes (e.g., btn should now get its color from logo), developers must find and modify this specific UI component. It makes the component non-reusable and hard to reason about.
Solutions:
Option 1: Decouple via Events (Recommended)
Logic: Refactor MobileColorSlider to be a "dumb" component. It should only know about its own state (the currently selected hue). When the user interacts with it, it should emit a single, generic event like mobileColorChanged with the new hue as a payload. A separate, higher-level controller or a dedicated function within appInitializer's event setup would subscribe to this event and apply the business logic (i.e., updating the four appState targets).
Pros: Excellent decoupling. The slider is now reusable. Color logic is centralized in one place, making future changes trivial. Follows standard front-end architectural patterns.
Cons: Requires creating a small amount of new "glue" code to listen for the event and update the state.
Option 2: Data-Driven Configuration
Logic: Instead of hardcoding the targets, pass an array of target keys (e.g., ['env', 'logo', 'lcd', 'btn']) into the MobileColorSlider's constructor. The slider would then iterate over this array to update appState.
Pros: Better than the current implementation. It makes the targets configurable.
Cons: The component is still directly manipulating global application state, so the coupling remains, albeit in a more flexible way. It's a partial, not a complete, architectural fix.