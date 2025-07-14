# PRD/Design Spec: Mobile Terminal Audio Enhancements

## 1. Functional Requirements

### FR.6: Mobile Terminal - Sound Effects
The mobile terminal drawer (opening and closing) must play a distinct sound effect, consistent with existing panel interactions.

## 2. Design Specifications

### DS.6: Mobile Terminal - Sound Effects
*   **Sound Event:** When the `#mobile-terminal-toggle` button is pressed (to open) and when the `#mobile-terminal-close-btn` is pressed (to close), the `panelToggle` sound effect will play.
*   **Volume/Restart:** The sound should play with `forceRestart: true` to ensure it always plays regardless of whether it's already active (e.g., if rapidly toggled).

## 3. Technical Solution Approach

### TSA.6: Mobile Terminal - Sound Effects
*   **Module:** `src/js/MobileTerminalManager.js`.
*   **Approach:**
    1.  In `MobileTerminalManager.toggle(forceState)`:
        *   Retrieve the `audioManager` from `serviceLocator`.
        *   Inside the `if (this.isOpen)` block (when opening), call `this.audioManager.play('panelToggle', true);`.
        *   Inside the `else` block (when closing), call `this.audioManager.play('panelToggle', true);`.

## 4. File Manifest

*   `src/js/MobileTerminalManager.js`
*   `src/js/AudioManager.js` (existing, provides `play` method)
*   `src/js/serviceLocator.js` (existing, for dependency injection)