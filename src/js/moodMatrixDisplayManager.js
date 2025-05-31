/**
 * @module moodMatrixDisplayManager
 * @description Manages the HUE 9000 Mood Matrix Display within the Dial A LCD.
 * Displays two mood lines with interpolating percentages based on Dial A's hue,
 * and handles scrolling animations when crossing 40-degree mood segments.
 * Complies with the startup sequence of its parent LCD container.
 */
import { gsap } from "gsap"; // Assuming GSAP is globally available or imported if bundling

class MoodMatrixDisplayManager {
    constructor(targetLcdContainerElement, gsapInstance, appStateService, configModule) {
        if (!targetLcdContainerElement) throw new Error("MoodMatrixDisplayManager: Target LCD container element not provided.");
        if (!gsapInstance) throw new Error("MoodMatrixDisplayManager: GSAP instance not provided.");
        if (!appStateService) throw new Error("MoodMatrixDisplayManager: AppState service not provided.");
        if (!configModule) throw new Error("MoodMatrixDisplayManager: Config module not provided.");

        this.parentLcdElement = targetLcdContainerElement;
        this.gsap = gsapInstance;
        this.appState = appStateService;
        this.config = configModule;

        this.rowElements = [];
        this.visibleRowDomIndices = [0, 1]; // Indices into this.rowElements for Line 1 and Line 2
        this.currentDialHue = -1;
        this.currentDisplaySegmentStartIndex = -1; // Index in MOOD_MATRIX_DEFINITIONS
        this.isScrolling = false;
        this.rowHeight = 0;
        this.currentParentLcdState = this._getInitialParentLcdState(); // e.g., 'unlit', 'dimly-lit', 'active'

        this.debug = false; // Set to true for verbose logging

        this._initDOM();
        this._cacheRowHeight();
        this._setupInitialState();
        this._subscribeToEvents();

        if (this.debug) console.log(`[MoodMatrixDisplayManager INIT] Initialized for ${this.parentLcdElement.id}. Initial LCD State: ${this.currentParentLcdState}`);
    }

    _initDOM() {
        // Clear existing content (e.g., the old numeric span)
        this.parentLcdElement.innerHTML = '';

        for (let i = 0; i < 3; i++) {
            const row = document.createElement('div');
            row.classList.add('mood-matrix-row');
            row.dataset.rowIndex = i; // For debugging

            const valueSpan = document.createElement('span');
            valueSpan.classList.add('mood-value');
            row.appendChild(valueSpan);

            const labelSpan = document.createElement('span');
            labelSpan.classList.add('mood-label');
            row.appendChild(labelSpan);

            this.parentLcdElement.appendChild(row);
            this.rowElements.push(row);
        }
        if (this.debug) console.log(`[MoodMatrixDisplayManager _initDOM] Created 3 row elements within ${this.parentLcdElement.id}`);
    }

    _cacheRowHeight() {
        if (this.rowElements.length > 0) {
            // Ensure styles are applied before measuring
            this.gsap.set(this.rowElements[0], { y: 0 }); // Ensure it's in a measurable position
            this.rowHeight = this.rowElements[0].offsetHeight;
            if (this.debug) console.log(`[MoodMatrixDisplayManager _cacheRowHeight] Cached row height: ${this.rowHeight}px`);
            if (this.rowHeight === 0) {
                console.warn("[MoodMatrixDisplayManager _cacheRowHeight] Warning: Row height calculated as 0. Ensure CSS is loaded and element is visible.");
                // Fallback if offsetHeight is 0 (e.g. display:none parent)
                const fontSize = parseFloat(getComputedStyle(this.parentLcdElement).fontSize) || 16;
                this.rowHeight = fontSize * (parseFloat(this.config.MOOD_MATRIX_ROW_HEIGHT_EM_FALLBACK) || 1.4);
                if (this.debug) console.log(`[MoodMatrixDisplayManager _cacheRowHeight] Using fallback row height: ${this.rowHeight}px`);
            }
        }
    }

    _getInitialParentLcdState() {
        if (this.parentLcdElement.classList.contains('lcd--unlit')) return 'unlit';
        if (this.parentLcdElement.classList.contains('lcd--dimly-lit')) return 'dimly-lit';
        if (this.parentLcdElement.classList.contains('js-active-dim-lcd')) return 'dimly-lit'; // Treat active-dim as dimly-lit for text
        return 'active'; // Default if no specific startup class
    }

    _setupInitialState() {
        if (this.rowHeight === 0) this._cacheRowHeight(); // Recalculate if needed

        // Initial positions: Line 1 (DOM 0), Line 2 (DOM 1), Buffer (DOM 2) below
        this.gsap.set(this.rowElements[this.visibleRowDomIndices[0]], { y: 0, opacity: 1 });
        this.gsap.set(this.rowElements[this.visibleRowDomIndices[1]], { y: this.rowHeight, opacity: 1 });
        const bufferIndex = this._getBufferDomIndex();
        this.gsap.set(this.rowElements[bufferIndex], { y: 2 * this.rowHeight, opacity: 0 }); // Hidden below

        const dialAState = this.appState.getDialState('A');
        this.currentDialHue = dialAState ? dialAState.hue : this.config.DEFAULT_DIAL_A_HUE;

        this.currentDisplaySegmentStartIndex = Math.floor(this.currentDialHue / this.config.MOOD_MATRIX_SEGMENT_DEGREES);
        const hueWithinSegment = this.currentDialHue % this.config.MOOD_MATRIX_SEGMENT_DEGREES;
        const interpolationFactorT = hueWithinSegment / this.config.MOOD_MATRIX_SEGMENT_DEGREES;

        this._updateVisibleMoodsContent(this.currentDisplaySegmentStartIndex, interpolationFactorT);
        this._prepBufferRow(this.currentDisplaySegmentStartIndex, 'down'); // Prep for potential next scroll down

        if (this.debug) console.log(`[MoodMatrixDisplayManager _setupInitialState] Initial state set. Hue: ${this.currentDialHue.toFixed(1)}, SegmentStartIdx: ${this.currentDisplaySegmentStartIndex}, t: ${interpolationFactorT.toFixed(2)}`);
    }

    _subscribeToEvents() {
        this.appState.subscribe('dialUpdated', this._handleDialAUpdate.bind(this));
        // Subscribe to LCD state changes (assuming uiUpdater emits this)
        this.appState.subscribe('lcdStateChanged', this._handleParentLcdStateChange.bind(this));
        // Also handle direct app status changes that might affect LCD visibility implicitly
        this.appState.subscribe('appStatusChanged', () => this._handleParentLcdStateChange());
        this.appState.subscribe('startupPhaseNumberChanged', () => this._handleParentLcdStateChange());
    }

    _handleParentLcdStateChange(payload) {
        // If payload is specific to this LCD, use it. Otherwise, re-evaluate based on class.
        let newParentState = this._getInitialParentLcdState(); // Re-evaluate based on current classes
        if (payload && payload.lcdId === this.parentLcdElement.id) {
            newParentState = payload.newStateKey; // e.g., 'unlit', 'dimly-lit', 'active'
        }

        if (newParentState !== this.currentParentLcdState) {
            if (this.debug) console.log(`[MoodMatrixDisplayManager _handleParentLcdStateChange] Parent LCD state changed from ${this.currentParentLcdState} to ${newParentState}`);
            this.currentParentLcdState = newParentState;
            // Re-apply content styling to currently visible rows
            const hueWithinSegment = this.currentDialHue % this.config.MOOD_MATRIX_SEGMENT_DEGREES;
            const interpolationFactorT = hueWithinSegment / this.config.MOOD_MATRIX_SEGMENT_DEGREES;
            this._updateVisibleMoodsContent(this.currentDisplaySegmentStartIndex, interpolationFactorT);
        }
    }

    _handleDialAUpdate({ id, state }) {
        if (id !== 'A' || !state) return;

        const newHue = state.hue;
        if (Math.abs(newHue - this.currentDialHue) < 0.01 && !this.isScrolling) { // Tolerance for minor jitter
            return;
        }

        const oldSegmentStartIndex = this.currentDisplaySegmentStartIndex;
        const newSegmentStartIndex = Math.floor(newHue / this.config.MOOD_MATRIX_SEGMENT_DEGREES);

        const hueWithinSegment = newHue % this.config.MOOD_MATRIX_SEGMENT_DEGREES;
        let interpolationFactorT = hueWithinSegment / this.config.MOOD_MATRIX_SEGMENT_DEGREES;
        // Clamp t to prevent over/undershoot due to floating point, especially at boundaries
        interpolationFactorT = Math.max(0, Math.min(1, interpolationFactorT));


        if (this.debug && Math.abs(newHue - this.currentDialHue) >= 0.01) {
            // console.log(`[MoodMatrixDisplayManager _handleDialAUpdate] Hue: ${newHue.toFixed(1)}, OldSegmentIdx: ${oldSegmentStartIndex}, NewSegmentIdx: ${newSegmentStartIndex}, t: ${interpolationFactorT.toFixed(3)}`);
        }

        this.currentDialHue = newHue;

        if (newSegmentStartIndex !== oldSegmentStartIndex && !this.isScrolling) {
            this.isScrolling = true;
            const scrollDirection = newSegmentStartIndex > oldSegmentStartIndex || (newSegmentStartIndex === 0 && oldSegmentStartIndex === this.config.MOOD_MATRIX_DEFINITIONS.length - 1) ? 'down' : 'up';
            // Handle wrap around for direction
            if (scrollDirection === 'down' && newSegmentStartIndex < oldSegmentStartIndex && oldSegmentStartIndex === this.config.MOOD_MATRIX_DEFINITIONS.length -1 && newSegmentStartIndex === 0) {
                // This is a valid scroll down (e.g. Introspective -> Scanning)
            } else if (scrollDirection === 'up' && newSegmentStartIndex > oldSegmentStartIndex && newSegmentStartIndex === this.config.MOOD_MATRIX_DEFINITIONS.length -1 && oldSegmentStartIndex === 0) {
                // This is a valid scroll up (e.g. Scanning -> Introspective)
            }


            if (this.debug) console.log(`[MoodMatrixDisplayManager _handleDialAUpdate] Boundary crossed. Scrolling ${scrollDirection}. New segment starts with index ${newSegmentStartIndex}.`);

            // Determine t for the *new* segment's perspective after scroll
            // If scrolling down, new segment starts, t should be near 0.
            // If scrolling up, new segment is entered from its end, t should be near 1.
            let tForPostScroll = interpolationFactorT;
            if (scrollDirection === 'down') {
                // If we just crossed into newSegmentStartIndex, hueWithinSegment is small, so t is small.
            } else { // scrollDirection === 'up'
                // If we just crossed (backwards) into newSegmentStartIndex, hueWithinSegment is large (close to 40), so t is large (close to 1).
            }


            this._animateScroll(scrollDirection, newSegmentStartIndex, tForPostScroll);
            this.currentDisplaySegmentStartIndex = newSegmentStartIndex;
        } else if (!this.isScrolling) {
            this._updateVisibleMoodsContent(this.currentDisplaySegmentStartIndex, interpolationFactorT);
        }
    }

    _updateMoodRowContent(domElement, percentage, label) {
        const valueSpan = domElement.querySelector('.mood-value');
        const labelSpan = domElement.querySelector('.mood-label');

        if (valueSpan) valueSpan.textContent = this._formatPercentageString(percentage);
        if (labelSpan) labelSpan.textContent = label;

        // Apply text styling based on parent LCD state
        const textElements = [valueSpan, labelSpan].filter(el => el);
        textElements.forEach(el => {
            el.classList.remove('text-is-unlit', 'text-is-dimly-lit', 'text-is-active');
            if (this.currentParentLcdState === 'unlit') {
                el.classList.add('text-is-unlit');
            } else if (this.currentParentLcdState === 'dimly-lit') {
                el.classList.add('text-is-dimly-lit');
            } else {
                el.classList.add('text-is-active');
            }
        });
    }

    _updateVisibleMoodsContent(segmentStartIndex, t) {
        const N = this.config.MOOD_MATRIX_DEFINITIONS.length;
        const mood1Index = (segmentStartIndex % N + N) % N; // Ensure positive modulo
        const mood2Index = ((segmentStartIndex + 1) % N + N) % N;

        const mood1Name = this.config.MOOD_MATRIX_DEFINITIONS[mood1Index];
        const mood2Name = this.config.MOOD_MATRIX_DEFINITIONS[mood2Index];

        const mood1Percent = (1 - t) * 100;
        const mood2Percent = t * 100;

        const elLine1 = this.rowElements[this.visibleRowDomIndices[0]];
        const elLine2 = this.rowElements[this.visibleRowDomIndices[1]];

        this._updateMoodRowContent(elLine1, mood1Percent, mood1Name);
        this._updateMoodRowContent(elLine2, mood2Percent, mood2Name);

        if (this.debug && Math.random() < 0.1) { // Log occasionally
            // console.log(`[MoodMatrixDisplayManager _updateVisibleMoodsContent] L1 (${elLine1.dataset.rowIndex}): ${mood1Name} ${mood1Percent.toFixed(0)}%, L2 (${elLine2.dataset.rowIndex}): ${mood2Name} ${mood2Percent.toFixed(0)}%. Parent LCD: ${this.currentParentLcdState}`);
        }
    }

    _getBufferDomIndex() {
        return [0, 1, 2].find(i => !this.visibleRowDomIndices.includes(i));
    }

    _prepBufferRow(currentSegmentStartIndex, scrollDirectionAhead) {
        const N = this.config.MOOD_MATRIX_DEFINITIONS.length;
        const bufferDomEl = this.rowElements[this._getBufferDomIndex()];
        let moodForBufferName;
        let moodForBufferPercent;
        let bufferYPosition;

        if (scrollDirectionAhead === 'down') { // Buffer is for the mood that will appear on Line 2 after next scroll down
            const moodIndex = ((currentSegmentStartIndex + 2) % N + N) % N;
            moodForBufferName = this.config.MOOD_MATRIX_DEFINITIONS[moodIndex];
            moodForBufferPercent = 0; // When it scrolls in, it starts at 0%
            bufferYPosition = 2 * this.rowHeight;
        } else { // scrollDirectionAhead === 'up', Buffer is for mood that will appear on Line 1 after next scroll up
            const moodIndex = ((currentSegmentStartIndex - 1) % N + N) % N;
            moodForBufferName = this.config.MOOD_MATRIX_DEFINITIONS[moodIndex];
            moodForBufferPercent = 100; // When it scrolls in, it starts at 100%
            bufferYPosition = -this.rowHeight;
        }
        this._updateMoodRowContent(bufferDomEl, moodForBufferPercent, moodForBufferName);
        this.gsap.set(bufferDomEl, { y: bufferYPosition, opacity: 0 });
        if (this.debug) {
            // console.log(`[MoodMatrixDisplayManager _prepBufferRow] Prepped DOM row ${bufferDomEl.dataset.rowIndex} for ${scrollDirectionAhead} scroll. Content: ${moodForBufferName}, PosY: ${bufferYPosition}`);
        }
    }

    _animateScroll(direction, newSegmentStartIndex, interpolationFactorTForNewSegment) {
        if (this.rowHeight === 0) {
            console.warn("[MoodMatrixDisplayManager _animateScroll] rowHeight is 0, cannot animate. Re-caching.");
            this._cacheRowHeight();
            if (this.rowHeight === 0) {
                this.isScrolling = false;
                console.error("[MoodMatrixDisplayManager _animateScroll] rowHeight still 0 after re-cache. Scroll aborted.");
                return;
            }
        }

        const tl = this.gsap.timeline({
            onComplete: () => {
                this.isScrolling = false;
                // Update visibleRowDomIndices based on the scroll
                const oldLine1DomIndex = this.visibleRowDomIndices[0];
                const oldLine2DomIndex = this.visibleRowDomIndices[1];
                const oldBufferDomIndex = this._getBufferDomIndex();

                if (direction === 'down') {
                    this.visibleRowDomIndices[0] = oldLine2DomIndex;
                    this.visibleRowDomIndices[1] = oldBufferDomIndex;
                } else { // up
                    this.visibleRowDomIndices[0] = oldBufferDomIndex;
                    this.visibleRowDomIndices[1] = oldLine1DomIndex;
                }
                // The element that scrolled out (oldLine1DomIndex if down, oldLine2DomIndex if up) is now the new buffer.
                this._prepBufferRow(newSegmentStartIndex, direction);
                // Final precise content update for the new visible rows
                this._updateVisibleMoodsContent(newSegmentStartIndex, interpolationFactorTForNewSegment);
                if (this.debug) console.log(`[MoodMatrixDisplayManager _animateScroll COMPLETE] Scroll ${direction}. New visible DOM indices: ${this.visibleRowDomIndices}.`);
            }
        });

        const elCurrentLine1 = this.rowElements[this.visibleRowDomIndices[0]];
        const elCurrentLine2 = this.rowElements[this.visibleRowDomIndices[1]];
        const elBuffer = this.rowElements[this._getBufferDomIndex()];

        const N = this.config.MOOD_MATRIX_DEFINITIONS.length;
        let newContentForAnimatingLine1, newPercentForAnimatingLine1;
        let newContentForAnimatingLine2, newPercentForAnimatingLine2;

        // Determine content for rows *as they will appear after the scroll starts*
        if (direction === 'down') {
            // Current Line 2 becomes the new Line 1
            newContentForAnimatingLine1 = this.config.MOOD_MATRIX_DEFINITIONS[(newSegmentStartIndex % N + N) % N];
            newPercentForAnimatingLine1 = 100; // Starts at 100%
            // Buffer becomes the new Line 2
            newContentForAnimatingLine2 = this.config.MOOD_MATRIX_DEFINITIONS[((newSegmentStartIndex + 1) % N + N) % N];
            newPercentForAnimatingLine2 = 0; // Starts at 0%

            this._updateMoodRowContent(elCurrentLine2, newPercentForAnimatingLine1, newContentForAnimatingLine1); // Prep content before animation
            this._updateMoodRowContent(elBuffer, newPercentForAnimatingLine2, newContentForAnimatingLine2); // Prep content before animation

            tl.to(elCurrentLine1, { y: -this.rowHeight, opacity: 0, duration: this.config.MOOD_MATRIX_SCROLL_DURATION, ease: "sine.inOut" }, 0)
              .to(elCurrentLine2, { y: 0, duration: this.config.MOOD_MATRIX_SCROLL_DURATION, ease: "sine.inOut" }, 0)
              .fromTo(elBuffer, { y: 2 * this.rowHeight, opacity: 0 }, { y: this.rowHeight, opacity: 1, duration: this.config.MOOD_MATRIX_SCROLL_DURATION, ease: "sine.inOut" }, 0);
        } else { // direction === 'up'
            // Buffer becomes the new Line 1
            newContentForAnimatingLine1 = this.config.MOOD_MATRIX_DEFINITIONS[(newSegmentStartIndex % N + N) % N];
            newPercentForAnimatingLine1 = 100; // Starts at 100% (because t will be high for this segment)
            // Current Line 1 becomes the new Line 2
            newContentForAnimatingLine2 = this.config.MOOD_MATRIX_DEFINITIONS[((newSegmentStartIndex + 1) % N + N) % N];
            newPercentForAnimatingLine2 = 0; // Starts at 0%

            this._updateMoodRowContent(elBuffer, newPercentForAnimatingLine1, newContentForAnimatingLine1); // Prep content before animation
            this._updateMoodRowContent(elCurrentLine1, newPercentForAnimatingLine2, newContentForAnimatingLine2); // Prep content before animation

            tl.to(elCurrentLine2, { y: 2 * this.rowHeight, opacity: 0, duration: this.config.MOOD_MATRIX_SCROLL_DURATION, ease: "sine.inOut" }, 0)
              .to(elCurrentLine1, { y: this.rowHeight, duration: this.config.MOOD_MATRIX_SCROLL_DURATION, ease: "sine.inOut" }, 0)
              .fromTo(elBuffer, { y: -this.rowHeight, opacity: 0 }, { y: 0, opacity: 1, duration: this.config.MOOD_MATRIX_SCROLL_DURATION, ease: "sine.inOut" }, 0);
        }
        if (this.debug) console.log(`[MoodMatrixDisplayManager _animateScroll START] Scrolling ${direction}. Target segment starts with ${this.config.MOOD_MATRIX_DEFINITIONS[(newSegmentStartIndex % N + N) % N]}.`);
    }

    _formatPercentageString(percentage) {
        const rounded = Math.round(percentage);
        return String(rounded).padStart(3, ' ') + '%';
    }

    destroy() {
        // Unsubscribe from appState events if a mechanism is provided by appState
        // For now, assuming appState.subscribe returns a function to unsubscribe
        // This part needs to be implemented if appState.subscribe returns unsub functions
        if (this.debug) console.log("[MoodMatrixDisplayManager DESTROY] Destroying manager.");
    }
}

export default MoodMatrixDisplayManager;