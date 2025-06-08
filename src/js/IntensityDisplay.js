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
        const litBars = Math.floor((percentage / 100) * this.config.bars);
        this._updateBars(litBars);
        this._updateDots(litBars);
    }

    _updatePercentageText(percentage) {
        const text = `${Math.floor(percentage)}%`;
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
        const p1 = activeIndex - 1;
        const p2 = activeIndex - 2;
        const p3 = activeIndex - 3;

        this.dotEls.forEach((dot, i) => {
            let stateClass = 'fine-dot--off';
            if (i === activeIndex) stateClass = 'fine-dot--on';
            else if (i === p1) stateClass = 'fine-dot--in-progress-1';
            else if (i === p2) stateClass = 'fine-dot--in-progress-2';
            else if (i === p3) stateClass = 'fine-dot--in-progress-3';
            
            const fullClassName = `fine-dot ${stateClass}`;
            if (dot.className !== fullClassName) {
                dot.className = fullClassName;
            }
        });
    }
}