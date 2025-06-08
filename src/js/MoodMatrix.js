/**
 * @module MoodMatrix
 * @description A self-contained presentational component for the Mood Matrix Display.
 * It handles the "rise and fall" logic, the GSAP text scramble, and updating its
 * DOM based on props passed to its update() method.
 */
export class MoodMatrix {
    /**
     * @param {HTMLElement} containerElement - The DOM element to populate.
     * @param {object} config - Configuration object.
     * @param {string[]} config.moods - Array of mood names.
     * @param {number} config.majorBlocks - Number of major block displays.
     * @param {number} config.fineDots - Number of fine progress dots.
     * @param {object} gsapInstance - The GSAP instance.
     */
    constructor(containerElement, config, gsapInstance) {
        if (!gsapInstance) throw new Error("GSAP instance is required for MoodMatrix.");
        this.gsap = gsapInstance;
        this.config = config;
        this.container = containerElement;
        
        // [DEBUG]
        console.log('[MoodMatrix] Constructor called. Config:', config);

        // Clear any existing content
        this.container.innerHTML = '';
        
        // Create the component's DOM structure
        this.nameEl = this.container.appendChild(document.createElement('div'));
        this.nameEl.className = 'display-container__row--name';
        this.nameEl.textContent = 'INITIALIZING';

        this.majorBlocksContainer = this.container.appendChild(document.createElement('div'));
        this.majorBlocksContainer.className = 'mood-matrix__row--major-blocks';
        
        this.fineDotsContainer = this.container.appendChild(document.createElement('div'));
        this.fineDotsContainer.className = 'fine-dot-row';
        
        this.majorBlockEls = [];
        this.fineDotEls = [];
        this.currentScrambleTween = null;

        this._setupDOM();
    }

    _setupDOM() {
        for (let i = 0; i < this.config.majorBlocks; i++) {
            const blockEl = document.createElement('div');
            blockEl.className = 'major-block major-block--off';
            blockEl.textContent = '--';
            this.majorBlockEls.push(this.majorBlocksContainer.appendChild(blockEl));
        }
        for (let i = 0; i < this.config.fineDots; i++) {
            const dotEl = document.createElement('div');
            dotEl.className = 'fine-dot fine-dot--off';
            this.fineDotEls.push(this.fineDotsContainer.appendChild(dotEl));
        }
    }

    /**
     * Updates the display based on new data.
     * @param {object} data
     * @param {number} data.hue - The current hue value (0-360).
     */
    update({ hue }) {
        // [DEBUG]
        // console.log(`[MoodMatrix] update() called with hue: ${hue.toFixed(2)}`);

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
                text: { value: name, scrambleText: { chars: "ABCDEFGHIJKLMNOPQRSTUVWXYZ*#_1234567890", speed: 0.8, tweenLength: true } },
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
            
            const fullClassName = `major-block ${stateClass}`;
            if (block.className !== fullClassName) block.className = fullClassName;
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
            
            const fullClassName = `fine-dot ${stateClass}`;
            if (dot.className !== fullClassName) dot.className = fullClassName;
        });
    }
}