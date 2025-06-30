Of course. Based on the red-team analysis, I have revised the original proposal to be more robust, maintainable, and aligned with the project's architecture. The scope has also been expanded to include all LCD screens as requested.

Here is the hardened plan.

***

## HUE 9000: Terminal & LCD Visual Effects Enhancement Plan (v2)

This document outlines the requirements and implementation plan for integrating advanced CRT-style visual effects across all LCD screens in the HUE 9000 interface.

### 1. File Manifest for Implementation

The following files are required to provide context and will be modified during this task.

**Files to be Modified:**

*   `src/css/components/_lcd.css`: **(Major Change)** Will become the central stylesheet for universal LCD effects (scanline, sweep, chromatic aberration, disruption).
*   `src/css/components/_terminal.css`: **(Major Change)** Existing screen effects will be removed to inherit the new global styles from `_lcd.css`.
*   `src/index.html`: **(Minor Change)** A new overlay element will be added to each of the three LCD containers.
*   `src/js/config/index.js`: **(Minor Change)** To export the new effects configuration.
*   `src/js/animationUtils.js`: **(Minor Change)** To remove the `flickerTriggered` event emission.
*   `src/js/main.js`: **(Minor Change)** To initialize the new `DisruptionManager`.

**New Files to be Created:**

*   `src/js/config/effects.js`: A new file to house all configurable parameters for the new visual effects.
*   `src/js/DisruptionManager.js`: A new module to manage the logic and triggers for the system-wide disruption effect.

**Files for Context:**

*   `src/js/appState.js`: To understand state management and event subscription.
*   `src/js/serviceLocator.js`: To understand how modules are registered and retrieved.
*   `src/js/startupMachine.js`: To see how high-level state changes are orchestrated.
*   `src/css/components/_dial-displays.css`: To understand the structure of the V2 LCDs.
*   `src/js/ThemeManager.js`: To understand how theme changes are handled.

---

### 2. Hardened Product Requirements Document (PRD)

**Title:** PRD-005.1: Universal LCD Visual Effects Enhancement

**1. Overview**
To increase the immersion and diegetic realism of the HUE 9000 interface, this initiative will integrate a suite of advanced visual effects across **all LCD screens (Terminal, Mood Matrix, Intensity Display)**. These effects will create a more authentic, dynamic, and cohesive CRT monitor feel throughout the application.

**2. Feature Requirements**

*   **FR-1: Universal Screen Effects:** All LCD screens will be upgraded with new, persistent visual artifacts.
    *   **FR-1.1: Scanline & Jitter:** The existing terminal-only scanline effect will be replaced with a more refined, universal effect applied to all LCDs, which includes a subtle "jitter" animation.
    *   **FR-1.2: Refresh Sweep:** A new, persistent, faint horizontal line will continuously sweep from top to bottom on all LCDs, mimicking a CRT monitor's refresh cycle.
    *   **FR-1.3: Dynamic Color & Theme Adaptation:** All new screen effects must be dynamically colored based on the currently assigned "LCD" hue. They must also adapt their intensity and appearance for the `dark` and `light` themes.

*   **FR-2: Chromatic Aberration Text Effect:** The rendering of all text within all LCDs will be enhanced with a subtle chromatic aberration effect to simulate light distortion on a curved glass screen.

*   **FR-3: System Disruption Event:** A new, transient visual "glitch" or "disruption" event will be introduced to simulate system stress.
    *   **FR-3.1: Synchronized Visuals:** When triggered, the disruption will cause a brief, intense, and **synchronized** burst of screen flicker, jitter, and exaggerated chromatic aberration on **all three LCD screens simultaneously**.
    *   **FR-3.2: Context-Aware Triggers:** The disruption event will be triggered by meaningful, high-level application state changes, not low-level animation calls. Triggers include:
        1.  A global theme change (e.g., switching from `dim` to `dark` or `light`).
        2.  A change in the Resistive Shutdown stage.
        3.  A periodic, random timer that only fires when the application is in a stable, interactive state.
    *   **FR-3.3: Configuration:** All parameters of the disruption (peak intensity, duration, random trigger frequency) must be centrally configurable.

**3. Non-Functional Requirements**

*   **NFR-1: Performance:** Persistent animations (sweep, jitter) must be paused via an `IntersectionObserver` when the LCDs are not in the viewport to conserve resources.
*   **NFR-2: Modularity & Decoupling:** The logic for the Disruption Effect will be encapsulated in a new, dedicated `DisruptionManager.js` module. This module will operate by observing `appState` and will be completely decoupled from the animation or theme-changing subsystems.
*   **NFR-3: Architectural Consistency:** The implementation will prioritize the use of CSS pseudo-elements (`::before`, `::after`) for layered styling to maintain consistency with the existing project architecture, minimizing changes to the DOM.
*   **NFR-4: Configurability:** All magic numbers and parameters for the new effects will be extracted into a new, central configuration file.

---

### 3. Updated Development Specification

This document outlines the technical implementation plan for PRD-005.1, incorporating feedback from the red-team analysis.

**1. Configuration**

1.  **Create New File:** `src/js/config/effects.js`.
2.  **Add Content:** Populate with the following centralized, configurable parameters.

    ```javascript
    // src/js/config/effects.js

    /** @const {number} Speed of the refresh sweep animation in seconds. */
    export const LCD_SWEEP_SPEED_S = 5;
    /** @const {number} Opacity of the refresh sweep line. */
    export const LCD_SWEEP_OPACITY = 0.09;
    /** @const {number} Thickness of the scanlines. */
    export const LCD_SCANLINE_THICKNESS_PX = 3;
    /** @const {number} Opacity of the scanlines. */
    export const LCD_SCANLINE_OPACITY = 0.12;
    /** @const {number} Intensity (in px) of the jitter effect. */
    export const LCD_JITTER_INTENSITY_PX = 0.5;

    /** @const {number} Offset (in px) for the chromatic aberration text shadow. */
    export const LCD_CHROMA_ABERRATION_OFFSET_PX = 0.75;
    /** @const {number} Opacity of the red component of the chromatic aberration. */
    export const LCD_CHROMA_RED_OPACITY = 0.5;
    /** @const {number} Opacity of the blue component of the chromatic aberration. */
    export const LCD_CHROMA_BLUE_OPACITY = 0.5;

    /**
     * @typedef {object} DisruptionParams
     * @property {number} DURATION_S - Total duration of the disruption event.
     * @property {number} FLICKER_PEAK - Peak opacity (0-1) for the flicker effect.
     * @property {number} JITTER_PEAK_PX - Peak intensity (in px) for the jitter effect.
     * @property {number} CHROMA_OFFSET_PEAK_PX - Peak offset (in px) for chromatic aberration.
     * @property {number} PERIODIC_TRIGGER_INTERVAL_S - Average interval for random disruptions.
     */
    export const DISRUPTION_PARAMS = {
        DURATION_S: 1.5,
        FLICKER_PEAK: 0.25,
        JITTER_PEAK_PX: 8.0,
        CHROMA_OFFSET_PEAK_PX: 6.0,
        PERIODIC_TRIGGER_INTERVAL_S: 25 // Increased from 20 for subtlety
    };
    ```
3.  **Update Index:** Modify `src/js/config/index.js` to add `export * from './effects.js';`.

**2. CSS Modifications**

1.  **File: `_terminal.css`**
    *   **[HARDENED-PLAN] REMOVE:** The entire `.lcd-container.actual-lcd-screen-element::before` rule and its associated keyframes (`terminalScanlineMove`, `terminalJitter`). This effect is being promoted to a global LCD style.

2.  **File: `_lcd.css`**
    *   **[HARDENED-PLAN] ADD:** A new universal `::before` rule on the common `.lcd-container` class. This will apply the scanline, sweep, and jitter effects to all three LCDs. This rule centralizes the effects, avoiding duplication.

        ```css
        /* ADD THIS TO _lcd.css */
        
        /* Universal Screen Effects (Scanline, Sweep, Jitter) */
        .lcd-container::before {
            content: '';
            position: absolute;
            inset: 0;
            pointer-events: none;
            z-index: 2; /* Sits above CRT texture (::after) but below content */
            border-radius: inherit;
            
            /* CSS variables for JS control during disruption */
            --_jitter-intensity: var(--lcd-jitter-intensity-px, 0.5px);
            
            /* Multiple background layers */
            background-image:
                /* Layer 2: The sweep line */
                linear-gradient(to bottom, 
                    transparent 0%, transparent 45%,
                    oklch(95% calc(var(--dynamic-lcd-chroma) * 0.5) var(--dynamic-lcd-hue) / var(--lcd-sweep-opacity, 0.09)) 50%,
                    transparent 55%, transparent 100%
                ),
                /* Layer 1: The scanlines */
                repeating-linear-gradient(
                    transparent 0, transparent 50%,
                    oklch(85% var(--dynamic-lcd-chroma) var(--dynamic-lcd-hue) / var(--lcd-scanline-opacity, 0.12)) 50%,
                    oklch(85% var(--dynamic-lcd-chroma) var(--dynamic-lcd-hue) / var(--lcd-scanline-opacity, 0.12)) 100%
                );
            background-size: 100% 200%, 100% var(--lcd-scanline-thickness, 3px);
            
            animation: 
                lcdSweep var(--lcd-sweep-speed, 5s) linear infinite,
                lcdJitter 0.03s linear infinite;
        }

        /* Pause animations when observer fires */
        .lcd-container.effects-paused::before {
            animation-play-state: paused;
        }

        /* NEW Keyframes for Universal Effects */
        @keyframes lcdJitter {
            0% { transform: translate(0, 0); } 
            25% { transform: translate(calc(var(--_jitter-intensity) * -1), var(--_jitter-intensity)); }
            50% { transform: translate(var(--_jitter-intensity), calc(var(--_jitter-intensity) * -1)); } 
            75% { transform: translate(calc(var(--_jitter-intensity) * -1), var(--_jitter-intensity)); }
            100% { transform: translate(0, 0); }
        }

        @keyframes lcdSweep { 
            from { background-position-y: -150%, 0; } 
            to { background-position-y: 150%, 0; } 
        }

        /* ADD a style for the disruption flicker overlay */
        .disruption-overlay {
            position: absolute;
            inset: 0;
            pointer-events: none;
            z-index: 7; /* On top of everything */
            background: oklch(95% 0.1 150); /* Bright, sickly green flicker */
            opacity: 0; /* Controlled by JS */
            border-radius: inherit;
        }
        ```
    *   **[HARDENED-PLAN] MODIFY:** The `text-shadow` property on `.lcd-content-wrapper` to add the universal chromatic aberration effect. Animate a root-level CSS variable for the offset.

        ```css
        /* In _lcd.css, find .lcd-content-wrapper */
        /* Change this block */
        .lcd-content-wrapper {
            /* ... existing properties ... */
            
            /* MODIFIED: Add Chromatic Aberration layers */
            text-shadow:
                /* Chromatic Aberration Layers (Offset controlled by JS) */
                var(--_chroma-aberration-offset, var(--lcd-chroma-aberration-offset-px, 0.75px)) 0 1px oklch(75% 0.25 15 / var(--lcd-chroma-red-opacity, 0.5)),
                calc(var(--_chroma-aberration-offset, var(--lcd-chroma-aberration-offset-px, 0.75px)) * -1) 0 1px oklch(70% 0.22 230 / var(--lcd-chroma-blue-opacity, 0.5)),
                
                /* Existing Main Bloom/Glow Layers */
                0 0 calc(var(--terminal-text-bloom-size) * 0.3 * var(--theme-terminal-glow-size-factor)) var(--terminal-text-glow-color),
                0 0 calc(var(--terminal-text-bloom-size) * 1.0 * var(--theme-terminal-glow-size-factor)) var(--terminal-text-glow-color);

            /* ... existing properties ... */
        }
        ```

**3. HTML Modifications**

1.  **File: `src/index.html`**
    *   **[HARDENED-PLAN] ADD:** The new `.disruption-overlay` `div` inside all three LCD containers.

        ```html
        <!-- In .left-panel -->
        <div class="actual-lcd-screen-element lcd-container">
            <div id="terminal-lcd-content" ...></div>
            <div class="disruption-overlay"></div> <!-- ADD THIS -->
        </div>

        <!-- In .right-panel (Mood Display) -->
        <div class="hue-lcd-display lcd-container" id="hue-lcd-A" ...>
            <div class="lcd-content-wrapper"></div>
            <div class="disruption-overlay"></div> <!-- ADD THIS -->
        </div>
        
        <!-- In .right-panel (Intensity Display) -->
        <div class="hue-lcd-display lcd-container" id="hue-lcd-B" ...>
            <div class="lcd-content-wrapper"></div>
            <div class="disruption-overlay"></div> <!-- ADD THIS -->
        </div>
        ```

**4. JavaScript Implementation**

1.  **Create New Module: `src/js/DisruptionManager.js`**

    ```javascript
    // src/js/DisruptionManager.js
    import { serviceLocator } from './serviceLocator.js';
    import * as appState from './appState.js';
    import { DISRUPTION_PARAMS } from './config/index.js';

    class DisruptionManager {
        constructor() {
            this.gsap = null;
            this.dom = null;
            this.isDisrupting = false;
            this.periodicTimer = null;
            this.unsubscribers = [];
            this.allLcds = [];
            this.disruptionOverlays = [];
        }

        init() {
            this.gsap = serviceLocator.get('gsap');
            this.dom = serviceLocator.get('domElements');
            
            this.allLcds = [this.dom.terminalContainer, this.dom.lcdA, this.dom.lcdB].filter(Boolean);
            this.disruptionOverlays = this.allLcds.map(lcd => lcd.querySelector('.disruption-overlay')).filter(Boolean);

            this._subscribeToTriggers();
            this._setupIntersectionObserver();
        }

        _subscribeToTriggers() {
            // High-level, state-based triggers
            const themeUnsub = appState.subscribe('themeChanged', () => this.triggerDisruption());
            const shutdownUnsub = appState.subscribe('resistiveShutdownStageChanged', () => this.triggerDisruption());
            this.unsubscribers.push(themeUnsub, shutdownUnsub);

            this._startPeriodicTrigger();
        }

        _startPeriodicTrigger() {
            if (this.periodicTimer) clearTimeout(this.periodicTimer);
            const baseInterval = DISRUPTION_PARAMS.PERIODIC_TRIGGER_INTERVAL_S * 1000;
            const randomWait = () => {
                if (appState.getAppStatus() === 'interactive' && !this.isDisrupting) {
                    this.triggerDisruption();
                }
                const nextInterval = baseInterval + (Math.random() - 0.5) * (baseInterval * 0.5);
                this.periodicTimer = setTimeout(randomWait, nextInterval);
            };
            this.periodicTimer = setTimeout(randomWait, baseInterval);
        }

        _setupIntersectionObserver() {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    this.allLcds.forEach(lcd => lcd.classList.toggle('effects-paused', !entry.isIntersecting));
                });
            }, { threshold: 0.1 });
            
            if (this.dom.appWrapper) observer.observe(this.dom.appWrapper);
        }

        triggerDisruption() {
            if (this.isDisrupting || appState.getAppStatus() !== 'interactive') return;
            this.isDisrupting = true;
            
            const D_PARAMS = DISRUPTION_PARAMS;
            const halfDuration = D_PARAMS.DURATION_S / 2;
            const tl = this.gsap.timeline({
                onComplete: () => { this.isDisrupting = false; }
            });

            const rootStyle = document.documentElement.style;
            const stableJitter = getComputedStyle(document.documentElement).getPropertyValue('--lcd-jitter-intensity-px').trim() || '0.5px';
            const stableChroma = getComputedStyle(document.documentElement).getPropertyValue('--lcd-chroma-aberration-offset-px').trim() || '0.75px';

            tl.to(this.disruptionOverlays, { opacity: D_PARAMS.FLICKER_PEAK, duration: 0.05 })
              .to(rootStyle, { '--_jitter-intensity': `${D_PARAMS.JITTER_PEAK_PX}px`, duration: halfDuration, ease: 'power2.in' }, 0)
              .to(rootStyle, { '--_chroma-aberration-offset': `${D_PARAMS.CHROMA_OFFSET_PEAK_PX}px`, duration: halfDuration, ease: 'power2.in' }, 0)
              .to(this.disruptionOverlays, { opacity: 0, duration: D_PARAMS.DURATION_S - 0.05 }, 0.05)
              .to(rootStyle, { '--_jitter-intensity': stableJitter, duration: halfDuration, ease: 'power2.out' }, halfDuration)
              .to(rootStyle, { '--_chroma-aberration-offset': stableChroma, duration: halfDuration, ease: 'power2.out' }, halfDuration);
        }

        destroy() {
            this.unsubscribers.forEach(unsub => unsub());
            if (this.periodicTimer) clearTimeout(this.periodicTimer);
        }
    }

    export default new DisruptionManager();
    ```

2.  **File: `src/js/animationUtils.js`**
    *   **[HARDENED-PLAN] REMOVE:** The `appState.emit('flickerTriggered', ...)` line. This function should only be responsible for creating the animation, not for triggering side effects.

3.  **File: `src/js/main.js`**
    *   **[HARDENED-PLAN] MODIFY:** Import and initialize the new `DisruptionManager` in the `initializeApp` function.

        ```javascript
        // In main.js -> initializeApp()
        // ... other imports
        import disruptionManagerInstance from './DisruptionManager.js'; // ADD

        // ...
        const startupSequenceManager = new StartupSequenceManager();
        // ... ADD THE NEW MANAGER TO THIS LIST
        const intensityDisplayManager = new IntensityDisplayManager();
        
        serviceLocator.register('startupSequenceManager', startupSequenceManager);
        serviceLocator.register('moodMatrixManager', moodMatrixManager);
        serviceLocator.register('intensityDisplayManager', intensityDisplayManager);
        // ADD NEW REGISTRATION
        serviceLocator.register('disruptionManager', disruptionManagerInstance);

        // ...
        [ themeManager, lcdUpdater, dynamicStyleManager, dialManager, lensManager, ambientAnimationManager, moodMatrixManager, intensityDisplayManager, disruptionManagerInstance ].forEach(manager => {
            if (typeof manager.init === 'function') manager.init();
        });
        // ...
        ```