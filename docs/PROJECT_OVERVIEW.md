# HUE 9000 Project Overview (Project Decouple - V2.0)

## 1. Project Intent & Core Concept

**High-Level Goal:** To create a visually rich, highly performant, and interactive web interface simulating a futuristic control panel, codenamed "HUE 9000."

**Core Interaction:** Users manipulate controls (dials, buttons) to change various "hue" and "intensity" parameters. These interactions dynamically affect the visual appearance of the interface elements, including global environment ambiance, UI accents, LCD screen colors, button illumination, and a central "lens" display.

**Aesthetic:** Retro-futuristic with skeuomorphic tendencies (realistic textures, lighting, depth, and tactile feedback), realized through modern web technologies. Emphasis is on **smooth, responsive animations** and immediate visual feedback to user input.

**Key Visual Centerpiece:** The dynamic "lens" display. Its appearance, including a complex radial gradient and an outer glow, changes dramatically based on an "intensity" or "power" value (controlled by Dial B). Its core color (hue) is controlled by the "MOOD" dial (Dial A).

**Startup Sequence:**
The interface "powers on" with a choreographed, multi-phase sequence (P0-P11), orchestrated by an XState Finite State Machine executing declarative phase configurations. `body` starts with `theme-dim` active. Elements are progressively revealed and energized, with their appearance during startup controlled by animated CSS variables (`--startup-L-reduction-factor`, `--startup-opacity-factor`). The sequence culminates in a transition to the main `theme-dark`.
(Full details in `STARTUP_SEQUENCE.md`)

## 2. Architecture & Key Technologies (Project Decouple - V2.0)

**Frontend:** HTML5, CSS3, JavaScript (ES Modules).

**Styling:**
*   **CSS Custom Properties (Variables):** The primary mechanism for all theming and dynamic styling.
*   **OKLCH Color Space:** Preferred for its perceptual uniformity.
*   **Modular CSS:** Organized into `base/`, `components/`, and `themes/`.

**JavaScript Architecture (Decoupled):**
*   **Core Principle:** Inversion of Control (IoC) via a **`serviceLocator`**. Modules do not import each other directly; they request dependencies from the locator.
*   **Component-Oriented:** Stateful UI elements (`Button`, `Dial`) and managers (`ButtonManager`, `LensManager`, etc.) are encapsulated in **Classes**.
*   **Orchestrator:** `main.js` acts as the central orchestrator. It instantiates all managers, registers them with the `serviceLocator`, and sets up top-level event listeners for application side-effects.
*   **State Management:** `appState.js` remains the single source of truth, emitting events on state changes.
*   **Declarative Startup:** The startup sequence is defined by simple configuration objects in `startupPhaseX.js` files, which are executed by a generic `PhaseRunner` class.

**Key Libraries:**
*   **XState:** Orchestrates the multi-phase startup sequence state logic.
*   **GSAP:** Core animation library for startup, interactions, and complex effects.
*   **CSS Transitions & Animations:** Used for theme changes and ambient effects.

## 3. Core Principles & Design Intentions

*   **Visual Fidelity & Smoothness:** The highest priority. All animations and transitions must be fluid.
*   **Modularity & Decoupling:** Each part of the system should be as independent as possible.
*   **State-Driven UI:** The UI should always be a reflection of the data in `appState.js`.
*   **Dynamic Lens Gradient:** The lens's appearance is a core feature, driven by a complex, multi-stop gradient calculation.
*   **Button Visuals & States:** Clear distinction between states: `is-unlit`, `is-dimly-lit`, `.is-energized` (selected/unselected), `is-pressing`, and flickering effects.