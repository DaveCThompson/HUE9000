/**
 * @module moodMatrixDisplayManager
 * @description Manages the HUE 9000 Mood Matrix Display within the Dial A LCD.
 * (Project Decouple Refactor)
 */
import { serviceLocator } from './serviceLocator.js';

class MoodMatrixDisplayManager {
    constructor(targetLcdContainerElement) {
        if (!targetLcdContainerElement) throw new Error("MoodMatrixDisplayManager: Target LCD container element not provided.");
        this.parentLcdElement = targetLcdContainerElement;

        this.gsap = null;
        this.appState = null;
        this.config = null;

        this.contentWrapper = null;
        this.rowsWrapper = null;
        this.rowElements = [];
        this.domCycleIndex = 0;
        this.currentDialHue = -1;
        this.currentDisplaySegmentStartIndex = -1;
        this.isScrolling = false;
        this.rowHeight = 0;
        this.currentParentLcdState = 'unlit';
        this.debug = false;
    }

    init() {
        this.gsap = serviceLocator.get('gsap');
        this.appState = serviceLocator.get('appState');
        this.config = serviceLocator.get('config');

        if (this.debug) console.log(`[MMDM INIT] Initialized for ${this.parentLcdElement.id}.`);

        this._initDOM();
        this._cacheLayoutMetrics();
        this._setupInitialState();
        this._subscribeToEvents();

        window.addEventListener('resize', () => this._handleResize());
    }

    _initDOM() {
        this.contentWrapper = this.parentLcdElement.querySelector('.lcd-content-wrapper');
        if (!this.contentWrapper) {
            console.error("MoodMatrixDisplayManager: Could not find the .lcd-content-wrapper in the parent element.");
            return;
        }
        this.contentWrapper.innerHTML = '';

        this.rowsWrapper = document.createElement('div');
        this.rowsWrapper.classList.add('mood-matrix-rows-wrapper');
        this.contentWrapper.appendChild(this.rowsWrapper);

        for (let i = 0; i < 3; i++) {
            const row = document.createElement('div');
            row.className = 'mood-matrix-row';
            row.innerHTML = `<span class="mood-value"></span><span class="mood-spacer"> </span><span class="mood-label"></span>`;
            this.rowsWrapper.appendChild(row);
            this.rowElements.push(row);
        }
    }

    _cacheLayoutMetrics() {
        if (this.rowElements.length > 0 && this.rowsWrapper) {
            // FIX: Temporarily make the wrapper visible to ensure accurate measurement.
            const originalDisplay = this.contentWrapper.style.display;
            const wasHidden = this.contentWrapper.classList.contains('is-content-hidden');
            
            if (wasHidden) {
                this.contentWrapper.classList.remove('is-content-hidden');
            } else {
                this.gsap.set(this.contentWrapper, { display: 'flex' });
            }
            
            this.rowHeight = this.rowElements[0].offsetHeight;

            // Restore original state
            if (wasHidden) {
                this.contentWrapper.classList.add('is-content-hidden');
            } else {
                this.gsap.set(this.contentWrapper, { display: originalDisplay });
            }

            if (this.rowHeight === 0) {
                const fontSize = parseFloat(getComputedStyle(this.parentLcdElement).fontSize) || 16;
                this.rowHeight = fontSize * (this.config.MOOD_MATRIX_ROW_HEIGHT_EM_FALLBACK || 1.4);
                 if (this.debug) console.log(`[MMDM] Row height was 0, used fallback: ${this.rowHeight}px`);
            }
            this.rowsWrapper.style.height = `${2 * this.rowHeight}px`;
        }
    }

    _handleResize() {
        this._cacheLayoutMetrics();
        const hueWithinSegment = this.currentDialHue % this.config.MOOD_MATRIX_SEGMENT_DEGREES;
        const t = Math.max(0, Math.min(1, hueWithinSegment / this.config.MOOD_MATRIX_SEGMENT_DEGREES));
        this._updateVisibleMoodsContent(this.currentDisplaySegmentStartIndex, t);
        const elBuffer = this.rowElements[(this.domCycleIndex + 2) % 3];
        this._prepBufferElement(elBuffer, this.currentDisplaySegmentStartIndex, 'down');
    }

    _setupInitialState() {
        if (this.rowHeight === 0) this._cacheLayoutMetrics();
        if (this.rowHeight === 0) return;

        this.domCycleIndex = 0;
        const elLine1 = this.rowElements[0];
        const elLine2 = this.rowElements[1];
        const elBuffer = this.rowElements[2];

        this.gsap.set(elLine1, { y: 0, opacity: 1 });
        this.gsap.set(elLine2, { y: this.rowHeight, opacity: 1 });

        const dialAState = this.appState.getDialState('A');
        this.currentDialHue = dialAState ? dialAState.hue : this.config.DEFAULT_DIAL_A_HUE;
        this.currentDisplaySegmentStartIndex = Math.floor(this.currentDialHue / this.config.MOOD_MATRIX_SEGMENT_DEGREES);
        const hueWithinSegment = this.currentDialHue % this.config.MOOD_MATRIX_SEGMENT_DEGREES;
        const t = Math.max(0, Math.min(1, hueWithinSegment / this.config.MOOD_MATRIX_SEGMENT_DEGREES));

        this._updateVisibleMoodsContent(this.currentDisplaySegmentStartIndex, t);
        this._prepBufferElement(elBuffer, this.currentDisplaySegmentStartIndex, 'down');
    }

    _subscribeToEvents() {
        this.appState.subscribe('dialUpdated', (payload) => this._handleDialAUpdate(payload));
        this.appState.subscribe('lcdStateChanged', (payload) => this._handleParentLcdStateChange(payload));
    }

    _handleParentLcdStateChange(payload) {
        if (payload && payload.lcdId === this.parentLcdElement.id) {
            if (payload.newStateKey !== this.currentParentLcdState) {
                this.currentParentLcdState = payload.newStateKey;
                const hueWithinSegment = this.currentDialHue % this.config.MOOD_MATRIX_SEGMENT_DEGREES;
                const t = Math.max(0, Math.min(1, hueWithinSegment / this.config.MOOD_MATRIX_SEGMENT_DEGREES));
                this._updateVisibleMoodsContent(this.currentDisplaySegmentStartIndex, t);
            }
        }
    }

    _handleDialAUpdate({ id, state }) {
        if (id !== 'A' || !state || this.isScrolling) return;
        const newHue = state.hue;
        if (Math.abs(newHue - this.currentDialHue) < 0.05) return;

        const oldSegmentIndex = this.currentDisplaySegmentStartIndex;
        const newSegmentIndex = Math.floor(newHue / this.config.MOOD_MATRIX_SEGMENT_DEGREES);
        const hueWithinSegment = newHue % this.config.MOOD_MATRIX_SEGMENT_DEGREES;
        const t = Math.max(0, Math.min(1, (hueWithinSegment < 0 ? hueWithinSegment + this.config.MOOD_MATRIX_SEGMENT_DEGREES : hueWithinSegment) / this.config.MOOD_MATRIX_SEGMENT_DEGREES));
        this.currentDialHue = newHue;

        if (newSegmentIndex !== oldSegmentIndex) {
            this.isScrolling = true;
            const N = this.config.MOOD_MATRIX_DEFINITIONS.length;
            const normalizedOld = (oldSegmentIndex % N + N) % N;
            const normalizedNew = (newSegmentIndex % N + N) % N;
            let scrollDirection = (normalizedOld === N - 1 && normalizedNew === 0) ? 'down' :
                                  (normalizedOld === 0 && normalizedNew === N - 1) ? 'up' :
                                  (newSegmentIndex > oldSegmentIndex ? 'down' : 'up');
            this._animateScroll(scrollDirection, newSegmentIndex, t);
        } else {
            this._updateVisibleMoodsContent(this.currentDisplaySegmentStartIndex, t);
        }
    }

    _getPeakHueForMood(moodName) {
        const moodIndex = this.config.MOOD_MATRIX_DEFINITIONS.indexOf(moodName);
        if (moodIndex === -1) return this.appState.getTargetColorProperties('lcd')?.hue || 0;
        return (moodIndex * this.config.MOOD_MATRIX_SEGMENT_DEGREES) % 360;
    }

    _updateMoodRowContent(domElement, percentage, label) {
        if (!domElement) return;
        const valueSpan = domElement.querySelector('.mood-value');
        const labelSpan = domElement.querySelector('.mood-label');
        if (!valueSpan || !labelSpan) return;

        const peakHue = this._getPeakHueForMood(label);
        valueSpan.textContent = this._formatPercentageString(percentage);
        valueSpan.style.setProperty('--mood-value-specific-hue', peakHue.toFixed(1));
        labelSpan.textContent = label;
        labelSpan.style.setProperty('--mood-label-specific-hue', peakHue.toFixed(1));

        [valueSpan, labelSpan].forEach(el => {
            el.classList.remove('text-is-unlit', 'text-is-dimly-lit', 'text-is-active');
            if (this.currentParentLcdState === 'unlit') el.classList.add('text-is-unlit');
            else if (this.currentParentLcdState === 'dimly-lit') el.classList.add('text-is-dimly-lit');
            else el.classList.add('text-is-active');
        });
    }

    _updateVisibleMoodsContent(segmentIndex, t) {
        const N = this.config.MOOD_MATRIX_DEFINITIONS.length;
        const mood1Index = (segmentIndex % N + N) % N;
        const mood2Index = ((segmentIndex + 1) % N + N) % N;
        const mood1Name = this.config.MOOD_MATRIX_DEFINITIONS[mood1Index];
        const mood2Name = this.config.MOOD_MATRIX_DEFINITIONS[mood2Index];
        const elLine1 = this.rowElements[this.domCycleIndex % 3];
        const elLine2 = this.rowElements[(this.domCycleIndex + 1) % 3];
        this._updateMoodRowContent(elLine1, (1 - t) * 100, mood1Name);
        this._updateMoodRowContent(elLine2, t * 100, mood2Name);
    }

    _prepBufferElement(bufferElement, segmentIndex, scrollDirection) {
        if (!bufferElement) return;
        const N = this.config.MOOD_MATRIX_DEFINITIONS.length;
        let moodName, yPos;
        if (scrollDirection === 'down') {
            moodName = this.config.MOOD_MATRIX_DEFINITIONS[((segmentIndex + 2) % N + N) % N];
            yPos = 2 * this.rowHeight;
        } else {
            moodName = this.config.MOOD_MATRIX_DEFINITIONS[((segmentIndex - 1) % N + N) % N];
            yPos = -this.rowHeight;
        }
        this._updateMoodRowContent(bufferElement, 0, moodName);
        this.gsap.set(bufferElement, { y: yPos, opacity: 0 });
    }

    _animateScroll(direction, newSegmentIndex, t) {
        if (this.rowHeight === 0) { this.isScrolling = false; return; }
        const oldCycleIndex = this.domCycleIndex;
        const elCurrentLine1 = this.rowElements[oldCycleIndex % 3];
        const elCurrentLine2 = this.rowElements[(oldCycleIndex + 1) % 3];
        const elBuffer = this.rowElements[(oldCycleIndex + 2) % 3];

        const N = this.config.MOOD_MATRIX_DEFINITIONS.length;
        const newMood1Name = this.config.MOOD_MATRIX_DEFINITIONS[(newSegmentIndex % N + N) % N];
        const newMood2Name = this.config.MOOD_MATRIX_DEFINITIONS[((newSegmentIndex + 1) % N + N) % N];

        const tl = this.gsap.timeline({
            onComplete: () => {
                this.domCycleIndex = (direction === 'down') ? (oldCycleIndex + 1) % 3 : (oldCycleIndex - 1 + 3) % 3;
                const elementThatScrolledOut = (direction === 'down') ? elCurrentLine1 : elCurrentLine2;
                this._prepBufferElement(elementThatScrolledOut, newSegmentIndex, direction);
                this._updateVisibleMoodsContent(newSegmentIndex, t);
                this.isScrolling = false;
                this.currentDisplaySegmentStartIndex = newSegmentIndex;
            }
        });

        if (direction === 'down') {
            this._updateMoodRowContent(elCurrentLine2, (1 - t) * 100, newMood1Name);
            this._updateMoodRowContent(elBuffer, t * 100, newMood2Name);
            tl.to(elCurrentLine1, { y: -this.rowHeight, opacity: 0, duration: this.config.MOOD_MATRIX_SCROLL_DURATION, ease: "sine.inOut" }, 0)
              .to(elCurrentLine2, { y: 0, opacity: 1, duration: this.config.MOOD_MATRIX_SCROLL_DURATION, ease: "sine.inOut" }, 0)
              .fromTo(elBuffer, { y: 2 * this.rowHeight, opacity: 0 }, { y: this.rowHeight, opacity: 1, duration: this.config.MOOD_MATRIX_SCROLL_DURATION, ease: "sine.inOut" }, 0);
        } else {
            this._updateMoodRowContent(elBuffer, (1 - t) * 100, newMood1Name);
            this._updateMoodRowContent(elCurrentLine1, t * 100, newMood2Name);
            tl.to(elCurrentLine2, { y: 2 * this.rowHeight, opacity: 0, duration: this.config.MOOD_MATRIX_SCROLL_DURATION, ease: "sine.inOut" }, 0)
              .to(elCurrentLine1, { y: this.rowHeight, opacity: 1, duration: this.config.MOOD_MATRIX_SCROLL_DURATION, ease: "sine.inOut" }, 0)
              .fromTo(elBuffer, { y: -this.rowHeight, opacity: 0 }, { y: 0, opacity: 1, duration: this.config.MOOD_MATRIX_SCROLL_DURATION, ease: "sine.inOut" }, 0);
        }
    }

    _formatPercentageString(percentage) {
        return String(Math.round(percentage)).padStart(3, ' ') + '%';
    }

    destroy() {
        window.removeEventListener('resize', () => this._handleResize());
    }
}

export default MoodMatrixDisplayManager;