# HUE 9000 Project Overview (Project Decouple - V2.3)

## 1. Project Intent & Core Concept

**High-Level Goal:** To create a visually rich, highly performant, and interactive web interface simulating a futuristic control panel, codenamed "HUE 9000."

**Core Interaction:** Users manipulate controls (dials, buttons, mobile sliders) to change various "hue" and "intensity" parameters. These interactions dynamically affect the visual appearance of the interface elements, including global environment ambiance, UI accents, LCD screen colors, button illumination, and a central "lens" display.

**Aesthetic:** Retro-futuristic with strong skeuomorphic tendencies (realistic textures, lighting, depth, and tactile feedback), realized through modern web technologies. Emphasis is on **smooth, responsive animations** and immediate visual feedback to user input. The design leverages the `oklch()` color space for perceptually uniform color manipulation and `rem` units for responsive scaling.

**Key Visual Centerpiece:** The dynamic "lens" display. Its appearance, including a complex radial gradient and an outer glow, changes dramatically based on an "intensity" or "power" value (controlled by Dial B). Its core color (hue) is controlled by the "MOOD" dial (Dial A).

**Startup Sequence:**
The interface "powers on" with a choreographed, multi-phase sequence (P0-P13), orchestrated by an XState Finite State Machine executing declarative phase configurations. The `body` starts with `theme-dim` active. Elements are progressively revealed and energized, with their appearance during startup controlled by animated CSS variables (`--startup-L-reduction-factor`, `--startup-opacity-factor`). The sequence culminates in a global CSS transition to the main `theme-dark` in **Phase P12**.
(Full details in `STARTUP_SEQUENCE.md`)

**Mobile Responsiveness:** A dedicated mobile-first design for touch interactions, including a mobile terminal drawer and a vertical color slider, ensuring a tailored experience across devices.

**Scan Sequences:** Interactive, animated data scans within the terminal display, triggered by user input, with dynamic rendering and progress feedback.

**Resistive Shutdown Sequence:** A multi-stage, reactive sequence triggered by repeated attempts to power off, resulting in escalating visual and auditory feedback that alters UI parameters.

## 2. Architecture & Key Technologies (Project Decouple - V2.3)

**Frontend:** HTML5, CSS3, JavaScript (ES Modules).

**Styling:**
*   **CSS Custom Properties (Variables):** The primary mechanism for all theming and dynamic styling.
*   **OKLCH Color Space:** Used extensively for its perceptual uniformity and intuitive manipulation of lightness, chroma, and hue.
*   **Modular CSS:** Organized into `@layer` directives (`base/`, `components/`, `themes/`) to ensure a predictable cascade and maintainability.
*   **`rem` Units:** Preferred for most sizing values to support responsive scaling based on the root font size.

**JavaScript Architecture (Decoupled):**
*   **Entry Point:** `main.js` is the initial script, responsible for global setup and initiating the `AppInitializer`.
*   **App Initializer:** `AppInitializer.js` acts as the central bootstrap, instantiating all managers, registering them with the `serviceLocator`, and initiating the startup sequence.
*   **Inversion of Control (IoC):** A **`serviceLocator`** centralizes dependency management. Modules do not import each other directly; they request dependencies from the locator, promoting loose coupling.
*   **State Management (Command Bus Pattern):**
    *   `state/appState.js` is the single source of truth for all application state. It also acts as a **Command Bus**, exposing a `dispatch()` function for UI components to send user intents (actions).
    *   `state/actionHandler.js` is the *sole module* authorized to subscribe to dispatched actions, mutate `appState` (via its internal setters), and trigger side effects (e.g., sounds, terminal messages).
    *   `state/actions.js` defines all possible user intents as constants and action creator functions, ensuring consistency.
*   **Component-Oriented:** Stateful UI elements (`Button`, `DialController`) and managers/controllers (`ButtonManager`, `LensManager`, `ThemeManager`) are encapsulated in **Classes**.
*   **Presentational Components:** Components like `MoodMatrix` and `IntensityDisplay` are purely presentational, receiving all data via props from their respective managers and having no direct knowledge of global state.
*   **Centralized Event Handling:** `EventBinder.js` centralizes all static DOM event listener bindings, dispatching actions to `appState` or delegating to specific managers.
*   **Audio Management:** `AudioManager.js` (using `Howler.js`) handles all sound loading, playback, and global audio state.
*   **Haptic Feedback:** `hapticFeedbackManager.js` provides tactile feedback for interactions on supported devices.
*   **Declarative Startup:** The multi-phase startup sequence is defined by simple configuration objects in `startupPhaseX.js` files, which are executed by a generic `PhaseRunner` class invoked by an XState FSM.

**Key Libraries:**
*   **XState (v5):** Orchestrates the multi-phase startup sequence state logic and the interactive scan sequences.
*   **GSAP:** The core animation library for startup, dynamic interactions, and complex visual effects.
*   **Howler.js:** Used by the `AudioManager` for robust web audio management.

## 3. Core Principles & Design Intentions

*   **Visual Fidelity & Smoothness:** The highest priority. All animations and transitions must be fluid, responsive, and contribute to a believable, tactile experience.
*   **Modularity & Decoupling:** Each part of the system is designed to be as independent as possible, communicating via `serviceLocator` and the `appState` Command Bus.
*   **State-Driven UI:** The UI always directly reflects the authoritative data in `appState.js`. All UI changes are a direct consequence of state mutations.
*   **Dynamic Lens Gradient:** The central lens's appearance is a core feature, driven by a complex, multi-stop gradient calculation that dynamically updates based on hue and power.
*   **Button Visuals & States:** Clear distinction between states: `is-unlit`, `is-dimly-lit`, `.is-energized` (selected/unselected), `is-pressing`, `is-permanently-disabled`. Buttons feature flickering effects during transitions and continuous ambient effects like the "breathing" glow (`is-resonating`) and "light drift" (`css-idle-drifting`) when interactive.
*   **Accessibility:** Inclusion of ARIA attributes for screen readers, `prefers-reduced-motion` support (where animations are simplified), and enhanced keyboard navigation for interactive elements.