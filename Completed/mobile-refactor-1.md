### **Pragmatic Push Plan: Enable Diegetic Feedback for Dial Controls**

#### **1. Product Requirements (PRD)**

**Objective:** To enhance user immersion and system responsiveness by providing real-time, diegetic terminal feedback when the user interacts with the "Mood" (Dial A) and "Intensity" (Dial B) controls. This functionality must be consistent across both desktop and mobile layouts.

**Key Requirements:**
*   **Mood Dial Feedback:** When a user finishes adjusting the Mood dial, a message confirming the new affective state will be printed to the terminal (e.g., `AFFECTIVE STATE ANALYSIS: > PRIMARY: 75% FOCUSED > SECONDARY: 25% ANALYTICAL`).
*   **Intensity Dial Feedback:** When a user finishes adjusting the Intensity dial, a message confirming the new power level will be printed to the terminal (e.g., `LENS INTENSITY SET TO: 45.2%.`).
*   **Interaction Model:** Feedback should be triggered at the *end* of a user's interaction (i.e., on "drag end" or after a "flick" settles) to prevent spamming the terminal during a continuous drag.
*   **Platform Parity:** This behavior must be identical for both desktop and mobile users.
*   **Out of Scope:** The mobile color slider will remain a "silent" control and will not generate terminal feedback.

---

#### **2. Architectural Approach**

This plan will follow a pragmatic, low-impact methodology by extending the existing `appState` event-driven architecture rather than introducing new patterns. The core of this approach is to create a new, centralized listener that reacts to the *completion* of a dial interaction.

1.  **Leverage Existing Event:** The `DialController.js` already emits a `dialUpdated` event on every frame of a drag. This event's payload critically includes an `isDragging` boolean flag. We will use this flag to detect the end of an interaction.

2.  **Stateful Event Subscriber:** A new subscriber will be created within `appInitializer.js`. This subscriber will maintain a simple state machine (via a `lastIsDragging` flag) for each dial. It will trigger its logic only when a `dialUpdated` event arrives with `isDragging: false` immediately following an event where `isDragging: true`.

3.  **Centralized Logic:** By placing this new subscriber in `appInitializer.js`, we maintain the established architectural pattern of a single, central location for orchestrating UI feedback from user interactions. This avoids fragmenting logic across multiple files.

4.  **Re-use Existing Infrastructure:** The subscriber's only action will be to format and emit a `requestTerminalMessage` event. This reuses the entire existing `terminalManager` and `terminalMessages` infrastructure, ensuring the new feedback is queued and displayed correctly without any changes to the terminal system itself.

This approach is highly efficient as it requires **no changes to the `DialController` or `dialManager`** and introduces a single, well-defined piece of logic in the application's central setup file.

---

#### **3. Code Change Highlights**

##### **Step 1: Enhance `terminalMessages.js` with New Templates**

The message generation module must be updated to support the new interaction types.

*   **File:** `src/js/terminalMessages.js`
*   **Action:** Add new entries for `mood_change` and `intensity_change` to the `interactionMessageTemplates` object. Then, update the `getMessage` function to process their data.

```javascript
// In terminalMessages.js

const interactionMessageTemplates = {
    aux_light: ["AUXILIARY LIGHTING STATE: {state}", /* ... */],
    hue_assign: { /* ... */ },
    // NEW TEMPLATES
    intensity_change: [
        "LENS INTENSITY SET TO: {power}%.", 
        "LENS POWER LEVEL: {power}%.", 
        "INTENSITY MODULATION: {power}%."
    ],
    mood_change: [
        ["PSYCHOLOGICAL STATE RECALIBRATED.", "{moodSummary}"],
        ["MOOD MATRIX RESOLVED.", "{moodSummary}"],
        ["AFFECTIVE STATE ANALYSIS:", "{moodSummary}"]
    ]
};

// ... inside getMessage() function, within the 'interaction' case:
// ...
} else if (source === 'mood_change') {
    const messageParts = getPseudoRandomMessage(source, { [source]: templatesForSource });
    const moods = MOOD_MATRIX_DEFINITIONS;
    const degreesPerBlock = 360 / moods.length;
    const primaryIndex = Math.floor(data.hue / degreesPerBlock);
    const progress = (data.hue % degreesPerBlock) / degreesPerBlock;
    const primaryValue = Math.round(100 - (Math.abs(progress - 0.5) * 200));
    const secondaryIndex = progress < 0.5 ? (primaryIndex - 1 + moods.length) % moods.length : (primaryIndex + 1) % moods.length;
    
    lines = [];
    messageParts.forEach(part => {
        if (part === "{moodSummary}") {
            lines.push(`> PRIMARY: ${primaryValue}% ${moods[primaryIndex].toUpperCase()}`, `> SECONDARY: ${100 - primaryValue}% ${moods[secondaryIndex].toUpperCase()}`);
        } else {
            lines.push(part);
        }
    });
} else if (templatesForSource) { // Add intensity_change handling here
    const template = getPseudoRandomMessage(source, { [source]: templatesForSource });
    let replaced = template;
    if (source === 'aux_light') replaced = template.replace('{state}', data.state);
    if (source === 'intensity_change') replaced = template.replace('{power}', data.power.toFixed(1)); // New line
    lines = [replaced];
}
// ...
```

##### **Step 2: Implement the Central Dial Interaction Listener**

This is the core of the change. A new subscriber in the application's initializer will watch for the end of dial drags.

*   **File:** `src/js/appInitializer.js`
*   **Action:** In the `_setupGlobalEventListeners` method, add a new stateful subscriber for the `dialUpdated` event.

```javascript
// In appInitializer.js, _setupGlobalEventListeners()

// Keep this object in the closure to maintain state
const lastDialDraggingState = { A: false, B: false };

appState.subscribe('dialUpdated', ({ id, state }) => {
    // We only care about the moment the user *stops* dragging.
    if (lastDialDraggingState[id] === true && state.isDragging === false) {
        
        if (id === 'A') {
            // Mood Dial drag ended
            appState.emit('requestTerminalMessage', {
                type: 'interaction',
                source: 'mood_change',
                coalesce: true,
                coalesceId: 'mood_dial_interaction',
                data: { hue: state.hue }
            });
        } else if (id === 'B') {
            // Intensity Dial drag ended
            const powerPercentage = (state.hue / 359.999) * 100;
            appState.emit('requestTerminalMessage', {
                type: 'interaction',
                source: 'intensity_change',
                coalesce: true,
                coalesceId: 'intensity_dial_interaction',
                data: { power: powerPercentage }
            });
        }
    }
    
    // Update the state for the next event
    lastDialDraggingState[id] = state.isDragging;
});

// ... existing `buttonInteracted` subscriber ...
```