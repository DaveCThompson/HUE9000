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
        
        this.isContinuouslyScrambling = false;
        this.currentScrambleTween = null;

        this.container.innerHTML = '';
        
        this.nameEl = this.container.appendChild(document.createElement('div'));
        this.nameEl.className = 'display-container__row--name';
        this.nameEl.textContent = 'INITIALIZING';

        this.majorBlocksContainer = this.container.appendChild(document.createElement('div'));
        this.majorBlocksContainer.className = 'mood-matrix__row--major-blocks';
        
        this.fineDotsContainer = this.container.appendChild(document.createElement('div'));
        this.fineDotsContainer.className = 'fine-dot-row';
        
        this.majorBlockEls = [];
        this.fineDotEls = [];

        this._setupDOM();
    }

    _setupDOM() {
        for (let i = 0; i < this.config.majorBlocks; i++) {
            const blockEl = document.createElement('div');
            blockEl.className = 'major-block major-block--off';
            blockEl.textContent = '00';
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
        const wrappedHue = ((hue % 360) + 360) % 360;
        
        if (!this.isContinuouslyScrambling) {
            const moodIndex = Math.floor(wrappedHue / (360 / this.config.majorBlocks)) % this.config.majorBlocks;
            const moodName = this.config.moods[moodIndex] || "UNKNOWN";
            this._updateMoodName(moodName);
        }
        
        this._updateMajorBlocks(wrappedHue);
        this._updateFineProgress(Math.floor(wrappedHue / (360 / this.config.fineDots)));
    }

    startContinuousScramble(currentHue) {
        if (this.isContinuouslyScrambling) return;
        this.isContinuouslyScrambling = true;

        const wrappedHue = ((currentHue % 360) + 360) % 360;
        const moodIndex = Math.floor(wrappedHue / (360 / this.config.majorBlocks)) % this.config.majorBlocks;
        const initialText = this.config.moods[moodIndex] || "ERROR";
        const textLength = initialText.length;

        if (this.currentScrambleTween) this.currentScrambleTween.kill();
        
        const scrambleChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ*#_1234567890";

        this.currentScrambleTween = this.gsap.to(this.nameEl, {
            duration: 0.15,
            text: {
                value: () => {
                    let text = '';
                    for (let i = 0; i < textLength; i++) {
                        text += scrambleChars.charAt(Math.floor(Math.random() * scrambleChars.length));
                    }
                    return text;
                },
                scrambleText: { 
                    chars: scrambleChars, 
                    speed: 1.8,
                    tweenLength: false 
                }
            },
            ease: "none",
            repeat: -1,
            repeatRefresh: true
        });
    }

    stopContinuousScramble(finalHue) {
        if (!this.isContinuouslyScrambling) return;
        this.isContinuouslyScrambling = false;

        const wrappedHue = ((finalHue % 360) + 360) % 360;
        const moodIndex = Math.floor(wrappedHue / (360 / this.config.majorBlocks)) % this.config.majorBlocks;
        const finalText = this.config.moods[moodIndex] || "RESOLVED";
        
        if (this.currentScrambleTween) this.currentScrambleTween.kill();
        
        this.currentScrambleTween = this.gsap.to(this.nameEl, {
            duration: 0.4,
            text: { value: finalText, scrambleText: { chars: "ABCDEFGHIJKLMNOPQRSTUVWXYZ*#_1234567890", speed: 0.8, tweenLength: true } },
            ease: "none",
        });
    }

    _updateMoodName(name) {
        if (this.nameEl.textContent !== name && !this.isContinuouslyScrambling) {
            if (this.currentScrambleTween) this.currentScrambleTween.kill();
            this.currentScrambleTween = this.gsap.to(this.nameEl, {
                duration: 0.4,
                text: { value: name, scrambleText: { chars: "ABCDEFGHIJKLMNOPQRSTUVWXYZ*#_1234567890", speed: 0.8, tweenLength: true } },
                ease: "none",
            });
        }
    }

    _updateMajorBlocks(hue) {
        const { majorBlocks, moods } = this.config;
        const degreesPerBlock = 360 / majorBlocks;
        
        const primaryBlockIndex = Math.floor(hue / degreesPerBlock);
        const progressInSegment = (hue % degreesPerBlock) / degreesPerBlock;

        const primaryValue = 100 - (Math.abs(progressInSegment - 0.5) * 100);
        const secondaryValue = 100 - primaryValue;

        const secondaryBlockIndex = progressInSegment < 0.5 
            ? (primaryBlockIndex - 1 + majorBlocks) % majorBlocks 
            : (primaryBlockIndex + 1) % majorBlocks;

        this.majorBlockEls.forEach((block, i) => {
            let stateClass = 'major-block--off';
            let textContent = '';

            const firstLetter = (moods[i] ? moods[i].charAt(0) : '?');

            let number = 0;
            if (i === primaryBlockIndex) {
                stateClass = 'major-block--on';
                number = Math.min(9, Math.round(primaryValue / 10));
            } else if (i === secondaryBlockIndex) {
                stateClass = 'major-block--in-progress';
                number = Math.min(9, Math.round(secondaryValue / 10));
            } else {
                stateClass = 'major-block--off';
                number = 0;
            }
            textContent = `${firstLetter}${number}`;
            
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