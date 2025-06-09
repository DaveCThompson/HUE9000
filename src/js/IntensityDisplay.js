/**
 * @module IntensityDisplay
 * @description A self-contained presentational component for the Intensity Display.
 * It is responsible for creating and updating its own internal DOM (percentage text,
 * bars, dots) based on props passed to its update() method. It has no knowledge
 * of application state.
 */
export class IntensityDisplay {
    /**
     * @param {HTMLElement} containerElement - The DOM element to populate with the display.
     * @param {object} config - Configuration object.
     * @param {number} config.bars - The number of main progress bars.
     * @param {number} config.dots - The number of micro-dots.
     */
    constructor(containerElement, config) {
        this.config = config;
        this.container = containerElement;

        // [DEBUG]
        console.log('[IntensityDisplay] Constructor called. Config:', config);

        // Clear any existing content
        this.container.innerHTML = '';

        // Create the component's DOM structure
        this.percentEl = this.container.appendChild(document.createElement('div'));
        this.percentEl.className = 'display-container__row--name';

        this.barsContainer = this.container.appendChild(document.createElement('div'));
        this.barsContainer.className = 'intensity-display__row--bars';

        this.dotsContainer = this.container.appendChild(document.createElement('div'));
        this.dotsContainer.className = 'fine-dot-row';

        this.barEls = [];
        this.dotEls = [];

        this._setupDOM();
    }

    _setupDOM() {
        for (let i = 0; i < this.config.bars; i++) {
            const barEl = document.createElement('div');
            barEl.className = 'intensity-bar intensity-bar--unselected';
            this.barEls.push(this.barsContainer.appendChild(barEl));
        }
        for (let i = 0; i < this.config.dots; i++) {
            const dotEl = document.createElement('div');
            dotEl.className = 'fine-dot fine-dot--off';
            this.dotEls.push(this.dotsContainer.appendChild(dotEl));
        }
    }

    /**
     * Updates the display based on new data.
     * @param {object} data
     * @param {number} data.percentage - The intensity percentage (0-100).
     */
    update({ percentage }) {
        // [DEBUG]
        // console.log(`[IntensityDisplay] update() called with percentage: ${percentage.toFixed(2)}`);

        this._updatePercentageText(percentage);
        // --- FIX: Use Math.round() to ensure 100% lights the last bar ---
        const litBars = Math.round((percentage / 100) * this.config.bars);
        this._updateBars(litBars);
        this._updateDots(litBars);
    }

    _updatePercentageText(percentage) {
        // FIX: Use Math.round() to correctly display 100%
        const text = `${Math.round(percentage)}%`;
        if (this.percentEl.textContent !== text) {
            this.percentEl.textContent = text;
        }
    }

    _updateBars(litBars) {
        this.barEls.forEach((bar, i) => {
            const stateClass = i < litBars ? 'intensity-bar--selected' : 'intensity-bar--unselected';
            const fullClassName = `intensity-bar ${stateClass}`;
            if (bar.className !== fullClassName) {
                bar.className = fullClassName;
            }
        });
    }

    _updateDots(litBars) {
        const activeIndex = litBars > 0 ? litBars - 1 : -1;

        // Define the trail position to the left of the active dot
        const p1 = activeIndex - 1;

        this.dotEls.forEach((dot, i) => {
            let stateClass = 'fine-dot--off'; // Default to off

            if (i === activeIndex) {
                stateClass = 'fine-dot--on'; // [S]
            } else if (i === p1) {
                stateClass = 'fine-dot--in-progress-1'; // [3]
            } else if (i < p1) { // All dots further to the left adopt the "lower lit" value
                stateClass = 'fine-dot--in-progress-2'; // [2]
            }
            // All dots to the right of the active one (i > activeIndex) remain 'fine-dot--off' [D]
            
            const fullClassName = `fine-dot ${stateClass}`;
            if (dot.className !== fullClassName) {
                dot.className = fullClassName;
            }
        });
    }
}