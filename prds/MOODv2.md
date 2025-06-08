Of course. This is the perfect next step. We need to solidify the specification for this new behavior and create a robust POC that demonstrates it before attempting to integrate it into the main project.

Based on your final set of requirements, I have produced the two requested artifacts:

1.  **A rigorous PRD / Architectural Specification** in a single Markdown file. This document details the final behavior of both new display components, including the integration of the harmonic resonance effect.
2.  **An updated, single-file Proof of Concept.** This HTML file demonstrates the final visual and interactive logic, including a new "Resonance" slider to simulate the ambient oscillation, allowing you to see exactly how it will affect the components.

---

### **Part 1: Final Specification Document**

Here is the comprehensive specification document for the new display components.

---

### **V2 Displays (Mood & Intensity) - Final PRD & Architectural Specification**

#### **1. Overview & Core Concept**

This document outlines the final specification for two new UI components, the **Mood Matrix V2** and the **Intensity Display V2**. These components will replace their predecessors, offering a more dynamic and visually rich representation of the HUE 9000's core parameters. They share a unified design language but have unique logic tailored to their purpose.

A key feature is the integration of the global **Harmonic Resonance** effect, which will cause active elements within the displays to pulsate in sync with other selected UI elements.

#### **2. Detailed Component Specification**

##### **Shared Visual & Behavioral Specifications**

*   **Font:** The primary text display for both components (Mood Name and Percentage) will be standardized to the same font size and weight for visual consistency.
*   **Color Theming:** Both components' active colors will be driven by **Dial A's hue**. This ensures visual harmony. A CSS custom property (`--display-active-hue`) will be set on each component's root element by its respective manager.
*   **Harmonic Resonance Effect:**
    *   **Trigger:** The resonance effect will be active on a display component when its controlling dial has been **idle for a short period** (e.g., >250ms) and its value is above a minimum threshold. This state will be managed by adding a `.is-resonating` class to the component's container.
    *   **Mechanism:** The effect is driven by global CSS variables set by the `AmbientAnimationManager` (e.g., `--harmonic-resonance-lightness-factor`). The component's CSS will consume these variables to create a pulsating effect.
    *   **Affected Elements:** When `.is-resonating` is active, the following "selected" elements will pulsate:
        *   The glow effect on the primary text display.
        *   The background brightness of all `on` state major blocks/bars.
        *   The background brightness of all `on` and `in-progress` state micro-dots.

##### **Component-Specific Logic: Intensity Display V2**

*   **Row 1 (Percentage Text):** Displays the input percentage (e.g., `21%`).
*   **Row 2 (Main Progress Bar):** 36 vertical bars. The number of `selected` bars directly maps to the input percentage (e.g., 21% lights up `floor(0.21 * 36) = 7` bars).
*   **Row 3 (Micro-Dot Progress Bar):** A "comet trail" effect. The `on` dot indicates the current position. All dots to its **left** are `in-progress` (at decreasing brightness levels). All dots to its **right** are `off`.

##### **Component-Specific Logic: Mood Matrix V2**

*   **Row 1 (Mood Name):** Animates changes using a GSAP ScrambleText effect.
*   **Row 2 (Major Blocks):**
    *   **Core Logic:** Implements the "rise and fall" logic. A block's value is calculated based on the proximity of the current `hue` to the center of that block's 60-degree segment.
    *   A block's value peaks at `99` when the hue is at its center.
    *   When the hue is on the boundary between two blocks, both blocks will display `50`.
    *   The sum of the two visible numbers will always equal 100 (allowing for rounding and capping at 99).
*   **Row 3 (Fine Progress Dots):** One `on` dot indicates the current position, with several `in-progress` dots on either side at decreasing brightness levels to create a soft trail.

#### **3. Architectural & Implementation Plan**

##### **Component API (Presentational)**

The components will remain purely presentational, controlled by a simple `update` method.

```javascript
// For MoodMatrixV2
moodMatrix.update({ hue: 89.5 });

// For IntensityDisplayV2
intensityDisplay.update({ percentage: 21.3 });
```

##### **CSS Strategy**

*   **Dynamic Theming:** The component's active color will be driven by a single CSS custom property on its root element: `--display-active-hue`.
*   **State Classes:** Visual states (`on`, `in-progress`, `off`) will be managed by adding/removing CSS classes. CSS `transition` properties will ensure smooth animations between these states.
*   **Harmonic Resonance Integration:**
    *   The component managers will be responsible for toggling a `.is-resonating` class on the component's root container.
    *   The component's CSS will contain rules that consume the global resonance variables (e.g., `--harmonic-resonance-lightness-factor`) when this class is present.
    *   The effect will be implemented by modulating the `l` (lightness) channel of the element's `oklch()` background color.

##### **Integration Plan into HUE 9000 Project**

1.  **Develop in Isolation:** Use the final, updated POC file as the blueprint.
2.  **Create New Files:**
    *   `src/js/components/MoodMatrix.js`
    *   `src/js/components/IntensityDisplay.js`
    *   `src/css/2-components/_v2-displays.css` (A shared stylesheet for both components).
3.  **Create New Lean Managers:**
    *   `MoodMatrixManager.js`: Subscribes to `appState` for Dial A changes. Calls `moodMatrix.update()`. Monitors Dial A's interaction state to toggle the `.is-resonating` class.
    *   `IntensityDisplayManager.js`: Subscribes to `appState` for Dial B changes. Converts value to percentage and calls `intensityDisplay.update()`. Monitors Dial B's interaction state to toggle the `.is-resonating` class.
4.  **Update `main.js`:** Instantiate the two new managers.
5.  **Deprecate Old Code:** Remove the old `moodMatrixDisplayManager` and any now-redundant logic and styling.

#### **4. Unresolved Questions & Clarifications**

*   **Q1: Harmonic Resonance Visual Mapping:** The current `AmbientAnimationManager` provides a single value (e.g., `--harmonic-resonance-lightness-factor`) that oscillates between a min and max. Is a direct mapping of this value to the lightness of all "selected" elements sufficient, or do we need a more complex mapping (e.g., the text glow pulsates more intensely than the micro-dots)?
    *   **Recommendation:** Start with a direct 1-to-1 mapping. It's the simplest to implement and can be refined with multipliers later if needed (e.g., `calc(l * var(--harmonic-resonance-lightness-factor) * var(--text-glow-multiplier))`).

*   **Q2: Intensity Threshold for Resonance:** Should the resonance effect on the Intensity Display only activate above a certain percentage (e.g., > 5%), or should it be active even at very low intensity levels as long as the dial is idle?
    *   **Recommendation:** The effect should probably have a minimum threshold to feel natural. A good starting point would be to only activate resonance when `percentage > 5`. This should be a configurable value in `config.js`.

*   **Q3: ScrambleText Variations:** The POC includes four commented-out concepts for the ScrambleText animation. Which one is preferred for the final implementation?
    *   **Recommendation:** "Concept A: The Glitchy Terminal" is the default as it best matches the existing UI aesthetic. This should be confirmed before final integration.

---

### **Part 2: Updated Proof of Concept File**

This file demonstrates all the final logic, including the simulated harmonic resonance effect.

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>V2 Displays - Mood & Intensity POC (Final Annotated)</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">
    <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/TextPlugin.min.js"></script>

    <style>
        /*
        ========================================================================
        COMPONENT STYLESHEET
        ========================================================================
        INTENTION: This stylesheet defines the appearance for both the Mood Matrix
        and Intensity Display components. It is architected around a shared,
        dynamic theming system driven by CSS Custom Properties.

        KEY ARCHITECTURAL DECISIONS:
        1.  OKLCH COLOR SPACE: Used for all colors to ensure perceptually uniform
            brightness and intuitive manipulation of hue and chroma.
        2.  DYNAMIC THEME VIA CSS VARIABLES: A single base hue variable
            (`--display-active-hue`) is updated by JavaScript. All other
            colors are derived from it within the component's scope, ensuring
            the entire theme updates consistently.
        3.  HARMONIC RESONANCE: A new `.is-resonating` class triggers styles
            that consume global `--harmonic-resonance-*` variables to create a
            pulsating effect on active elements.
        ========================================================================
        */

        :root {
            --display-font: 'IBM Plex Mono', monospace;
            --display-bg-color: #111;
            --display-block-size: 52px;
            --display-block-gap: 1px;
            --display-block-radius: 4px;
            --display-dot-height: 4px;
            --display-dot-gap: 1px;
            --display-dot-radius: 1px;
            --display-row-gap: 12px;
        }

        body {
            background-color: var(--display-bg-color);
            color: white;
            font-family: var(--display-font);
            display: flex;
            justify-content: center;
            align-items: flex-start;
            min-height: 100vh;
            gap: 4rem;
            padding-top: 2rem;

            /* --- SHARED THEME & GLOW DEFINITIONS --- */
            --display-active-hue: 210;
            --display-color-on: oklch(90% 0.1 var(--display-active-hue));
            --display-color-text-dark: oklch(15% 0.01 var(--display-active-hue) / 0.5);
            --display-color-off-bg: oklch(30% 0.01 var(--display-active-hue) / 0.5);
            --display-color-off-dot: oklch(40% 0.01 var(--display-active-hue) / 0.4);
            
            --display-glow-color-1: oklch(85% 0.12 var(--display-active-hue) / 0.8);
            --display-glow-color-2: oklch(90% 0.1 var(--display-active-hue) / 0.5);
            --display-glow-blur-1: 4px;
            --display-glow-blur-2: 12px;

            /* [NEW] HARMONIC RESONANCE: These are the variables the real AmbientAnimationManager will control. */
            --harmonic-resonance-lightness-factor: 1.0; /* 1.0 = normal, < 1.0 = dimmer */
        }

        /* --- SHARED COMPONENT STYLES --- */
        .display-container { display: flex; flex-direction: column; align-items: center; gap: var(--display-row-gap); padding: 2rem; width: 400px; }
        .display-container__row--name { font-size: 28px; font-weight: 500; letter-spacing: 0.05em; color: var(--display-color-on); text-shadow: 0 0 var(--display-glow-blur-1) var(--display-glow-color-1), 0 0 var(--display-glow-blur-2) var(--display-glow-color-2); transition: color 0.2s ease-out, text-shadow 0.2s ease-out; }
        .fine-dot-row { display: flex; width: 100%; gap: var(--display-dot-gap); }
        .fine-dot { flex: 1; height: var(--display-dot-height); border-radius: var(--display-dot-radius); transition: background-color 0.1s linear, box-shadow 0.2s ease-out; }
        .fine-dot--off { background-color: var(--display-color-off-dot); box-shadow: none; }
        .fine-dot--on { background-color: var(--display-color-on); box-shadow: 0 0 var(--display-glow-blur-1) var(--display-glow-color-1); }
        .fine-dot--in-progress-1 { background-color: oklch(from var(--display-color-on) l c h / 0.65); }
        .fine-dot--in-progress-2 { background-color: oklch(from var(--display-color-on) l c h / 0.40); }
        .fine-dot--in-progress-3 { background-color: oklch(from var(--display-color-on) l c h / 0.20); }

        /* --- MOOD MATRIX SPECIFIC STYLES --- */
        .mood-matrix__row--major-blocks { display: flex; justify-content: center; gap: var(--display-block-gap); width: 100%; }
        .major-block { flex: 1; height: var(--display-block-size); border-radius: var(--display-block-radius); display: flex; justify-content: center; align-items: center; font-size: 18px; font-weight: 500; transition: background-color 0.2s ease-out, color 0.2s ease-out, box-shadow 0.2s ease-out, opacity 0.2s ease-out; }
        .major-block--off { background-color: var(--display-color-off-bg); color: var(--display-color-off-dot); opacity: 0.7; box-shadow: none; }
        .major-block--in-progress { background-color: var(--display-color-off-bg); color: var(--display-color-on); opacity: 1; text-shadow: 0 0 var(--display-glow-blur-1) var(--display-glow-color-1), 0 0 var(--display-glow-blur-2) var(--display-glow-color-2); box-shadow: none; }
        .major-block--on { background-color: var(--display-color-on); color: var(--display-color-text-dark); opacity: 1; text-shadow: none; box-shadow: 0 0 var(--display-glow-blur-1) var(--display-glow-color-1), 0 0 var(--display-glow-blur-2) var(--display-glow-color-2); }

        /* --- INTENSITY DISPLAY SPECIFIC STYLES --- */
        .intensity-display__row--bars { display: flex; width: 100%; gap: var(--display-block-gap); align-items: flex-end; }
        .intensity-bar { flex: 1; height: var(--display-block-size); border-radius: var(--display-dot-radius); transition: background-color 0.1s linear, box-shadow 0.2s ease-out; }
        .intensity-bar--unselected { background-color: var(--display-color-off-dot); box-shadow: none; }
        .intensity-bar--selected { background-color: var(--display-color-on); box-shadow: 0 0 var(--display-glow-blur-1) var(--display-glow-color-1); }

        /*
        ========================================================================
        [NEW] HARMONIC RESONANCE STYLES
        ========================================================================
        INTENTION: These styles are only active when the `.is-resonating` class
        is applied to the component's container. They modulate the lightness
        of existing colors based on the global resonance factor.
        ========================================================================
        */
        .is-resonating .display-container__row--name,
        .is-resonating .major-block--on,
        .is-resonating .major-block--in-progress,
        .is-resonating .intensity-bar--selected,
        .is-resonating .fine-dot--on,
        .is-resonating .fine-dot--in-progress-1,
        .is-resonating .fine-dot--in-progress-2,
        .is-resonating .fine-dot--in-progress-3 {
            /* Remove transitions so the pulsation is instant and driven by GSAP */
            transition: none;
        }

        .is-resonating .display-container__row--name {
            color: oklch(from var(--display-color-on) calc(l * var(--harmonic-resonance-lightness-factor)));
        }
        .is-resonating .major-block--on,
        .is-resonating .intensity-bar--selected,
        .is-resonating .fine-dot--on {
            background-color: oklch(from var(--display-color-on) calc(l * var(--harmonic-resonance-lightness-factor)));
        }
        .is-resonating .major-block--in-progress {
            color: oklch(from var(--display-color-on) calc(l * var(--harmonic-resonance-lightness-factor)));
        }
        .is-resonating .fine-dot--in-progress-1 { background-color: oklch(from var(--display-color-on) calc(l * var(--harmonic-resonance-lightness-factor)) c h / 0.65); }
        .is-resonating .fine-dot--in-progress-2 { background-color: oklch(from var(--display-color-on) calc(l * var(--harmonic-resonance-lightness-factor)) c h / 0.40); }
        .is-resonating .fine-dot--in-progress-3 { background-color: oklch(from var(--display-color-on) calc(l * var(--harmonic-resonance-lightness-factor)) c h / 0.20); }


        /* --- CONTROLS (POC ONLY) --- */
        .controls-wrapper { position: fixed; bottom: 1rem; left: 1rem; right: 1rem; display: flex; gap: 2rem; justify-content: center; }
        .poc-controls { width: 300px; text-align: center; }
        .poc-controls input[type="range"] { width: 100%; }
        .poc-controls label { display: block; margin-bottom: 0.5rem; }
    </style>
</head>

<body>

    <div class="display-container" id="mood-matrix-poc">
        <div class="display-container__row--name" id="mood-name">INITIALIZING</div>
        <div class="mood-matrix__row--major-blocks"></div>
        <div class="fine-dot-row" id="mood-dots"></div>
    </div>

    <div class="display-container" id="intensity-display-poc">
        <div class="display-container__row--name" id="intensity-percent">0%</div>
        <div class="intensity-display__row--bars"></div>
        <div class="fine-dot-row" id="intensity-dots"></div>
    </div>

    <div class="controls-wrapper">
        <div class="poc-controls">
            <label for="hue-slider">Dial A (Hue & Theme)</label>
            <input type="range" id="hue-slider" min="0" max="359.9" value="89" step="0.1">
        </div>
        <div class="poc-controls">
            <label for="intensity-slider">Dial B (Intensity)</label>
            <input type="range" id="intensity-slider" min="0" max="100" value="21" step="0.1">
        </div>
        <div class="poc-controls">
            <label for="resonance-toggle">
                <input type="checkbox" id="resonance-toggle"> Enable Harmonic Resonance
            </label>
        </div>
    </div>

    <script>
        /*
        ========================================================================
        COMPONENT JAVASCRIPT
        ========================================================================
        INTENTION: This script defines the two final component classes and a
        simulation of the AmbientAnimationManager to demonstrate the harmonic
        resonance effect.

        MIGRATION PLAN:
        1.  The `MoodMatrix` and `IntensityDisplay` classes are ready for migration.
        2.  The `AmbientAnimationSimulator` logic will be replaced by the real
            `AmbientAnimationManager` in the main project.
        3.  The component managers will be responsible for toggling the
            `.is-resonating` class on the component containers based on dial
            interaction state.
        ========================================================================
        */

        class MoodMatrix {
            constructor(containerElement, config, gsapInstance) {
                if (!gsapInstance) throw new Error("GSAP instance required.");
                this.gsap = gsapInstance;
                this.config = config;
                this.container = containerElement;
                this.nameEl = containerElement.querySelector('#mood-name');
                this.majorBlocksContainer = containerElement.querySelector('.mood-matrix__row--major-blocks');
                this.fineDotsContainer = containerElement.querySelector('#mood-dots');
                this.majorBlockEls = [];
                this.fineDotEls = [];
                this.currentScrambleTween = null;
                this._setupDOM();
            }
            _setupDOM() {
                for (let i = 0; i < this.config.majorBlocks; i++) { this.majorBlockEls.push(this.majorBlocksContainer.appendChild(document.createElement('div'))); }
                for (let i = 0; i < this.config.fineDots; i++) { this.fineDotEls.push(this.fineDotsContainer.appendChild(document.createElement('div'))); }
            }
            update({ hue }) {
                const moodIndex = Math.floor(hue / (360 / this.config.moods.length)) % this.config.moods.length;
                this._updateMoodName(this.config.moods[moodIndex]);
                this._updateMajorBlocks(hue);
                this._updateFineProgress(Math.floor(hue / (360 / this.config.fineDots)));
            }
            _updateMoodName(name) {
                if (this.nameEl.textContent !== name) {
                    if (this.currentScrambleTween) this.currentScrambleTween.kill();
                    this.currentScrambleTween = this.gsap.to(this.nameEl, {
                        duration: 0.4,
                        text: { value: name, scrambleText: { chars: "ABCDEFGHIJKLMNOPQRSTUVWXYZ*#_1234567890", speed: 0.8, tweenLength: true, } },
                        ease: "none",
                    });
                }
            }
            _updateMajorBlocks(hue) {
                const { majorBlocks } = this.config;
                const degreesPerBlock = 360 / majorBlocks;
                const halfBlock = degreesPerBlock / 2;
                this.majorBlockEls.forEach((block, i) => {
                    const blockCenter = (i * degreesPerBlock) + halfBlock;
                    const diff = Math.abs(hue - blockCenter);
                    const distance = Math.min(diff, 360 - diff);
                    const percentage = Math.max(0, 100 * (1 - (distance / halfBlock)));
                    let stateClass = '', textContent = '';
                    if (percentage > 0.1) {
                        textContent = String(Math.min(99, Math.round(percentage))).padStart(2, '0');
                        stateClass = percentage >= 50 ? 'major-block--on' : 'major-block--in-progress';
                    } else {
                        textContent = '--';
                        stateClass = 'major-block--off';
                    }
                    if (block.className !== `major-block ${stateClass}`) block.className = `major-block ${stateClass}`;
                    if (block.textContent !== textContent) block.textContent = textContent;
                });
            }
            _updateFineProgress(activeIndex) {
                const numDots = this.config.fineDots;
                const p1 = (activeIndex - 1 + numDots) % numDots, n1 = (activeIndex + 1) % numDots;
                const p2 = (activeIndex - 2 + numDots) % numDots, n2 = (activeIndex + 2) % numDots;
                const p3 = (activeIndex - 3 + numDots) % numDots, n3 = (activeIndex + 3) % numDots;
                this.fineDotEls.forEach((dot, i) => {
                    let stateClass = 'fine-dot--off';
                    if (i === activeIndex) stateClass = 'fine-dot--on';
                    else if (i === p1 || i === n1) stateClass = 'fine-dot--in-progress-1';
                    else if (i === p2 || i === n2) stateClass = 'fine-dot--in-progress-2';
                    else if (i === p3 || i === n3) stateClass = 'fine-dot--in-progress-3';
                    if (dot.className !== `fine-dot ${stateClass}`) dot.className = `fine-dot ${stateClass}`;
                });
            }
        }

        class IntensityDisplay {
            constructor(containerElement, config) { this.config = config; this.container = containerElement; this.percentEl = containerElement.querySelector('#intensity-percent'); this.barsContainer = containerElement.querySelector('.intensity-display__row--bars'); this.dotsContainer = containerElement.querySelector('#intensity-dots'); this.barEls = []; this.dotEls = []; this._setupDOM(); }
            _setupDOM() { for (let i = 0; i < this.config.bars; i++) { this.barEls.push(this.barsContainer.appendChild(document.createElement('div'))); } for (let i = 0; i < this.config.dots; i++) { this.dotEls.push(this.dotsContainer.appendChild(document.createElement('div'))); } }
            update({ percentage }) { this._updatePercentageText(percentage); const litBars = Math.floor((percentage / 100) * this.config.bars); this._updateBars(litBars); this._updateDots(litBars); }
            _updatePercentageText(percentage) { const text = `${Math.floor(percentage)}%`; if (this.percentEl.textContent !== text) this.percentEl.textContent = text; }
            _updateBars(litBars) { this.barEls.forEach((bar, i) => { const stateClass = i < litBars ? 'intensity-bar--selected' : 'intensity-bar--unselected'; if (bar.className !== `intensity-bar ${stateClass}`) bar.className = `intensity-bar ${stateClass}`; }); }
            _updateDots(litBars) {
                const activeIndex = litBars > 0 ? litBars - 1 : -1;
                const p1 = activeIndex - 1, p2 = activeIndex - 2, p3 = activeIndex - 3;
                this.dotEls.forEach((dot, i) => {
                    let stateClass = 'fine-dot--off';
                    if (i === activeIndex) stateClass = 'fine-dot--on';
                    else if (i === p1) stateClass = 'fine-dot--in-progress-1';
                    else if (i === p2) stateClass = 'fine-dot--in-progress-2';
                    else if (i === p3) stateClass = 'fine-dot--in-progress-3';
                    if (dot.className !== `fine-dot ${stateClass}`) dot.className = `fine-dot ${stateClass}`;
                });
            }
        }

        /**
         * [NEW] Simulates the global AmbientAnimationManager for this POC.
         * In the real app, this logic lives in AmbientAnimationManager.js.
         */
        class AmbientAnimationSimulator {
            constructor(gsapInstance) {
                this.gsap = gsapInstance;
                this.resonanceTween = null;
            }
            start() {
                if (this.resonanceTween) return;
                // This tween continuously animates the global CSS variable.
                this.resonanceTween = this.gsap.to("body", {
                    "--harmonic-resonance-lightness-factor": 0.85, // The "dimmed" value
                    duration: 1.25, // Half the period
                    ease: "sine.inOut",
                    yoyo: true,
                    repeat: -1,
                });
            }
            stop() {
                if (this.resonanceTween) {
                    this.resonanceTween.kill();
                    this.resonanceTween = null;
                    // Reset the variable to its default (no effect).
                    this.gsap.set("body", { "--harmonic-resonance-lightness-factor": 1.0 });
                }
            }
        }

        // --- POC SETUP ---
        document.addEventListener('DOMContentLoaded', () => {
            gsap.registerPlugin(TextPlugin);
            const moodContainer = document.getElementById('mood-matrix-poc');
            const intensityContainer = document.getElementById('intensity-display-poc');
            const hueSlider = document.getElementById('hue-slider');
            const intensitySlider = document.getElementById('intensity-slider');
            const resonanceToggle = document.getElementById('resonance-toggle');

            const moodMatrix = new MoodMatrix(moodContainer, { moods: ["Scanning", "Commanding", "Evaluative", "Curious", "Advisory", "Analytical", "Focused", "Reserved", "Introspective"], majorBlocks: 6, fineDots: 36 }, gsap);
            const intensityDisplay = new IntensityDisplay(intensityContainer, { bars: 36, dots: 36 });
            const resonanceSimulator = new AmbientAnimationSimulator(gsap);

            function handleHueUpdate() {
                const hue = Number(hueSlider.value);
                document.body.style.setProperty('--display-active-hue', hue.toFixed(1));
                moodMatrix.update({ hue });
                intensityDisplay.update({ percentage: Number(intensitySlider.value) }); // Also update intensity display color
            }
            function handleIntensityUpdate() { intensityDisplay.update({ percentage: Number(intensitySlider.value) }); }
            
            // [NEW] Control the resonance effect
            function handleResonanceToggle() {
                const isEnabled = resonanceToggle.checked;
                moodContainer.classList.toggle('is-resonating', isEnabled);
                intensityContainer.classList.toggle('is-resonating', isEnabled);
                if (isEnabled) {
                    resonanceSimulator.start();
                } else {
                    resonanceSimulator.stop();
                }
            }

            hueSlider.addEventListener('input', handleHueUpdate);
            intensitySlider.addEventListener('input', handleIntensityUpdate);
            resonanceToggle.addEventListener('change', handleResonanceToggle);

            // Initial render for all components
            handleHueUpdate();
            handleIntensityUpdate();
        });
    </script>
</body>
</html>
```


Of course. This is a critical step. To properly integrate and vet this feature, we need to touch several parts of the existing application. The goal is to replace the old moodMatrixDisplayManager with two new, more capable components and their respective managers, while also extending the AmbientAnimationManager's functionality.

Based on the project structure and the final POC, here is a comprehensive list of all files that will need to be created, modified, or deleted to fully implement this feature.

File Implementation & Migration Plan
Part 1: New Files to Create

These files contain the core logic and styling for the new V2 display components.

src/js/components/IntensityDisplay.js

Purpose: A new, self-contained "presentational" component class for the Intensity Display.

Content: Will contain the IntensityDisplay class from the POC. It will be responsible for creating and updating its own internal DOM (percentage text, bars, dots) based on props passed to its update() method. It will have no knowledge of application state.

src/js/components/MoodMatrixDisplay.js

Purpose: A new, self-contained "presentational" component class for the Mood Matrix Display.

Content: Will contain the MoodMatrix class from the POC. It will handle the "rise and fall" logic, the GSAP text scramble, and updating its DOM based on props passed to its update() method.

src/js/managers/IntensityDisplayManager.js

Purpose: A new, lean manager to act as the bridge between appState and the IntensityDisplay component.

Responsibilities:

Instantiate the IntensityDisplay component, targeting the Dial B LCD container.

Subscribe to appState for dialUpdated (for Dial B) and dialBInteractionChange events.

Convert Dial B's hue value to a percentage and pass it to intensityDisplay.update().

Toggle a .is-resonating class on the component's container based on the dial's interaction state and value threshold, triggering the harmonic resonance effect.

src/js/managers/MoodMatrixManager.js

Purpose: A new manager to replace the old moodMatrixDisplayManager, bridging appState and the new MoodMatrixDisplay component.

Responsibilities:

Instantiate the MoodMatrixDisplay component, targeting the Dial A LCD container.

Subscribe to appState for dialUpdated (for Dial A) events.

Pass the hue value to moodMatrixDisplay.update().

Toggle the .is-resonating class on its component's container based on Dial A's interaction state.

src/css/2-components/_v2-displays.css

Purpose: A new, shared stylesheet for both V2 display components.

Content: Will contain all the CSS from the final POC's <style> block, including the shared theme variables, component-specific layouts, and the .is-resonating styles.

Part 2: Existing Files Requiring Significant Modification

These files are central to the integration and will need notable changes.

src/js/main.js

Purpose: The application orchestrator.

Required Changes:

Remove the import for the old moodMatrixDisplayManager.

Import the new MoodMatrixManager and IntensityDisplayManager.

In initializeApp(), remove the instantiation of the old manager.

Instantiate the new MoodMatrixManager and IntensityDisplayManager, passing them their target DOM elements.

Register both new managers with the serviceLocator.

Remove any old logic from top-level event listeners that was responsible for updating the Dial B percentage text (this is now handled by IntensityDisplayManager).

src/js/AmbientAnimationManager.js

Purpose: Manages global ambient effects.

Required Changes:

The core _updateResonance method, which sets the global CSS variables, is already correct.

The manager needs a mechanism to know when to apply the .is-resonating class to the new display components. The best approach is to keep this manager's responsibility focused on providing the global animation values. The new component-specific managers (MoodMatrixManager, IntensityDisplayManager) will be responsible for consuming these values by toggling the .is-resonating class on their respective components based on dial interaction state. Therefore, no direct code change is needed here, but its role in the new system is critical to acknowledge.

src/js/LcdUpdater.js

Purpose: Manages the state of LCD containers.

Required Changes:

Remove the updateLcdBContent method. Its responsibility of updating the percentage text is now handled by the new IntensityDisplay component.

Review any subscriptions to trueLensPowerChanged or dialUpdated and remove them if their only purpose was to call the now-deleted updateLcdBContent. The LcdUpdater should now be purely concerned with the visual state of the LCD shell (unlit, dimly-lit, active, flicker effects).

Part 3: Existing Files Requiring Minor Modification

These files need small but important updates to support the new feature.

src/index.html

Purpose: The main application document.

Required Changes:

Ensure the containers for the new displays are correctly identified. The existing structure is likely sufficient, but we need to verify the target elements for the new managers.

The content of #hue-lcd-A .lcd-content-wrapper and #hue-lcd-B .lcd-content-wrapper should be cleared, as the new components will populate them entirely.

src/css/main.css

Purpose: The main CSS import hub.

Required Changes:

Remove the import for the old _mood-matrix-display.css.

Add an @import for the new _v2-displays.css within the components section.

src/js/config.js

Purpose: Shared application constants.

Required Changes:

Add a new configuration object for the V2 displays to define constants like the number of bars/dots and the resonance activation threshold.

Example:

export const V2_DISPLAY_PARAMS = {
    INTENSITY_BARS: 36,
    INTENSITY_DOTS: 36,
    MOOD_MAJOR_BLOCKS: 6,
    MOOD_FINE_DOTS: 36,
    RESONANCE_ACTIVATION_THRESHOLD: 5.0, // e.g., percentage for intensity
    RESONANCE_IDLE_DELAY_MS: 250
};

Part 4: Files to Delete / Deprecate

These files are made obsolete by the new implementation.

src/js/moodMatrixDisplayManager.js

Reason: Completely replaced by the new, more capable MoodMatrixManager and the presentational MoodMatrixDisplay component.

src/css/2-components/_mood-matrix-display.css

Reason: All styling is now handled by the new, shared _v2-displays.css file.