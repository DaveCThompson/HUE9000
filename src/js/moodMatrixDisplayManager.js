/**
 * @module moodMatrixDisplayManager
 * @description Manages the HUE 9000 Mood Matrix Display within the Dial A LCD.
 * Displays two mood lines with interpolating percentages based on Dial A's hue,
 * and handles scrolling animations when crossing 40-degree mood segments.
 * Complies with the startup sequence of its parent LCD container.
 * V1.7: Enhanced logging in _animateScroll for diagnosing initial scroll percentage issue.
 *       Retains V1.6 fixes.
 */
import { gsap } from "gsap";

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

        this.rowsWrapper = null;
        this.rowElements = [];
        this.domCycleIndex = 0;

        this.currentDialHue = -1;
        this.currentDisplaySegmentStartIndex = -1;
        this.isScrolling = false;
        this.rowHeight = 0;
        this.currentParentLcdState = this._getInitialParentLcdState();

        this.debug = true; // Ensure this is true for detailed logs

        this._initDOM();
        this._cacheLayoutMetrics();
        this._setupInitialState();
        this._subscribeToEvents();

        window.addEventListener('resize', this._handleResize.bind(this));

        if (this.debug) console.log(`[MMDM INIT v1.7] Initialized for ${this.parentLcdElement.id}. LCD State: ${this.currentParentLcdState}, RowH: ${this.rowHeight}`);
    }

    _initDOM() {
        this.parentLcdElement.innerHTML = '';
        this.rowsWrapper = document.createElement('div');
        this.rowsWrapper.classList.add('mood-matrix-rows-wrapper');
        this.parentLcdElement.appendChild(this.rowsWrapper);

        for (let i = 0; i < 3; i++) {
            const row = document.createElement('div');
            row.classList.add('mood-matrix-row');
            row.dataset.physicalIndex = i; // Keep for debugging

            const valueSpan = document.createElement('span');
            valueSpan.classList.add('mood-value');
            row.appendChild(valueSpan);

            const spaceSpan = document.createElement('span');
            spaceSpan.classList.add('mood-spacer');
            spaceSpan.textContent = ' ';
            row.appendChild(spaceSpan);

            const labelSpan = document.createElement('span');
            labelSpan.classList.add('mood-label');
            row.appendChild(labelSpan);

            this.rowsWrapper.appendChild(row);
            this.rowElements.push(row);
        }
    }

    _cacheLayoutMetrics() {
        if (this.rowElements.length > 0 && this.rowsWrapper) {
            const tempVisible = this.rowsWrapper.offsetHeight === 0;
            if (tempVisible) this.gsap.set(this.rowElements[0], { position:'relative', display:'flex', opacity:1 });
            this.rowHeight = this.rowElements[0].offsetHeight;
            if (tempVisible) this.gsap.set(this.rowElements[0], { position:'absolute', display:'flex', opacity:0 });

            if (this.rowHeight === 0) {
                const fontSize = parseFloat(getComputedStyle(this.parentLcdElement).fontSize) || 16;
                this.rowHeight = fontSize * (parseFloat(this.config.MOOD_MATRIX_ROW_HEIGHT_EM_FALLBACK) || 1.4);
            }
            this.rowsWrapper.style.height = `${2 * this.rowHeight}px`;
            if (this.debug) console.log(`[MMDM _cacheLayoutMetrics] RowH: ${this.rowHeight}, WrapperH set to: ${2 * this.rowHeight}px`);
        }
    }

    _handleResize() {
        this._cacheLayoutMetrics();
        // Recalculate initial state based on new metrics, preserving current logical segment if possible
        const hueWithinSegment = this.currentDialHue % this.config.MOOD_MATRIX_SEGMENT_DEGREES;
        const interpolationFactorT = Math.max(0, Math.min(1, hueWithinSegment / this.config.MOOD_MATRIX_SEGMENT_DEGREES));
        this._updateVisibleMoodsContent(this.currentDisplaySegmentStartIndex, interpolationFactorT);
        
        // Re-evaluate buffer prep based on current state
        const elBuffer = this.rowElements[(this.domCycleIndex + 2) % 3];
        // Determine if buffer should be above or below based on typical next move or a default
        // This part might need more sophisticated logic if resizing during scroll is frequent
        this._prepBufferElement(elBuffer, this.currentDisplaySegmentStartIndex, 'down'); // Default to 'down' for simplicity
    }

    _getInitialParentLcdState() {
        if (!this.parentLcdElement) return 'active';
        if (this.parentLcdElement.classList.contains('lcd--unlit')) return 'unlit';
        if (this.parentLcdElement.classList.contains('lcd--dimly-lit')) return 'dimly-lit';
        if (this.parentLcdElement.classList.contains('js-active-dim-lcd')) return 'dimly-lit';
        return 'active';
    }

    _setupInitialState() {
        if (this.rowHeight === 0) this._cacheLayoutMetrics();
        if (this.rowHeight === 0) { if(this.debug) console.error("[MMDM _setupInitialState] RowHeight is 0. Aborting."); return; }

        this.domCycleIndex = 0;

        const elLine1 = this.rowElements[this.domCycleIndex % 3];
        const elLine2 = this.rowElements[(this.domCycleIndex + 1) % 3];
        const elBuffer = this.rowElements[(this.domCycleIndex + 2) % 3];

        elLine1.dataset.logicalRole = "Line1";
        elLine2.dataset.logicalRole = "Line2";
        // elBuffer's logicalRole is set by _prepBufferElement
        this.gsap.set(elLine1, { y: 0, opacity: 1 });
        this.gsap.set(elLine2, { y: this.rowHeight, opacity: 1 });
        // elBuffer's y and opacity are set by _prepBufferElement

        const dialAState = this.appState.getDialState('A');
        this.currentDialHue = dialAState ? dialAState.hue : this.config.DEFAULT_DIAL_A_HUE;
        this.currentDisplaySegmentStartIndex = Math.floor(this.currentDialHue / this.config.MOOD_MATRIX_SEGMENT_DEGREES);
        
        const hueWithinSegment = this.currentDialHue % this.config.MOOD_MATRIX_SEGMENT_DEGREES;
        const interpolationFactorT = Math.max(0, Math.min(1, hueWithinSegment / this.config.MOOD_MATRIX_SEGMENT_DEGREES));

        this._updateVisibleMoodsContent(this.currentDisplaySegmentStartIndex, interpolationFactorT);
        this._prepBufferElement(elBuffer, this.currentDisplaySegmentStartIndex, 'down'); // Default prep for buffer

        if (this.debug) console.log(`[MMDM _setupInitialState] Initial state. Hue: ${this.currentDialHue.toFixed(1)}, AbsSegIdx: ${this.currentDisplaySegmentStartIndex}, t: ${interpolationFactorT.toFixed(2)}. Phys L1:${elLine1.dataset.physicalIndex}, L2:${elLine2.dataset.physicalIndex}, Buf:${elBuffer.dataset.physicalIndex} (${elBuffer.dataset.logicalRole})`);
    }

    _subscribeToEvents() {
        this.appState.subscribe('dialUpdated', this._handleDialAUpdate.bind(this));
        this.appState.subscribe('lcdStateChanged', this._handleParentLcdStateChange.bind(this));
        this.appState.subscribe('appStatusChanged', () => this._handleParentLcdStateChange());
        this.appState.subscribe('startupPhaseNumberChanged', () => this._handleParentLcdStateChange());
    }

    _handleParentLcdStateChange(payload) {
        let newParentState = this._getInitialParentLcdState();
        // Check if the payload is for this specific LCD instance if lcdId is present
        if (payload && payload.lcdId && this.parentLcdElement.id === payload.lcdId) {
            newParentState = payload.newStateKey;
        } else if (payload && !payload.lcdId) { // Generic state change, re-evaluate
             newParentState = this._getInitialParentLcdState();
        }


        if (newParentState !== this.currentParentLcdState) {
            if (this.debug) console.log(`[MMDM _handleParentLcdStateChange] Parent LCD ${this.parentLcdElement.id} state: ${this.currentParentLcdState} -> ${newParentState}`);
            this.currentParentLcdState = newParentState;
            // Re-render content with current hue/segment to apply new text styling
            const hueWithinSegment = this.currentDialHue % this.config.MOOD_MATRIX_SEGMENT_DEGREES;
            const interpolationFactorT = Math.max(0, Math.min(1, hueWithinSegment / this.config.MOOD_MATRIX_SEGMENT_DEGREES));
            this._updateVisibleMoodsContent(this.currentDisplaySegmentStartIndex, interpolationFactorT);
        }
    }

    _handleDialAUpdate({ id, state }) {
        if (id !== 'A' || !state || this.isScrolling) return;
        const newHue = state.hue;
        if (Math.abs(newHue - this.currentDialHue) < 0.05) return; // Threshold to prevent excessive updates

        const oldAbsoluteSegmentStartIndex = this.currentDisplaySegmentStartIndex;
        const newAbsoluteSegmentStartIndex = Math.floor(newHue / this.config.MOOD_MATRIX_SEGMENT_DEGREES);
        
        const hueWithinSegment = newHue % this.config.MOOD_MATRIX_SEGMENT_DEGREES;
        // Ensure t is always calculated based on positive hueWithinSegment relative to segment start
        const positiveHueWithinSegment = (hueWithinSegment < 0) ? hueWithinSegment + this.config.MOOD_MATRIX_SEGMENT_DEGREES : hueWithinSegment;
        let interpolationFactorT = Math.max(0, Math.min(1, positiveHueWithinSegment / this.config.MOOD_MATRIX_SEGMENT_DEGREES));
        
        this.currentDialHue = newHue;

        if (newAbsoluteSegmentStartIndex !== oldAbsoluteSegmentStartIndex) {
            this.isScrolling = true;
            const N = this.config.MOOD_MATRIX_DEFINITIONS.length;
            const normalizedOld = (oldAbsoluteSegmentStartIndex % N + N) % N;
            const normalizedNew = (newAbsoluteSegmentStartIndex % N + N) % N;
            
            let scrollDirection;
            if (normalizedOld === N - 1 && normalizedNew === 0) scrollDirection = 'down'; // Wrap forward
            else if (normalizedOld === 0 && normalizedNew === N - 1) scrollDirection = 'up';   // Wrap backward
            else scrollDirection = newAbsoluteSegmentStartIndex > oldAbsoluteSegmentStartIndex ? 'down' : 'up';
            
            if (this.debug) console.log(`[MMDM _handleDialAUpdate] Boundary crossed. Hue:${newHue.toFixed(1)} Dir:${scrollDirection}. OldAbsSegIdx:${oldAbsoluteSegmentStartIndex}, NewAbsSegIdx:${newAbsoluteSegmentStartIndex}, tForNewSeg:${interpolationFactorT.toFixed(3)} (from positiveHueInSeg: ${positiveHueWithinSegment.toFixed(3)})`);
            
            this._animateScroll(scrollDirection, newAbsoluteSegmentStartIndex, interpolationFactorT);
            // currentDisplaySegmentStartIndex is updated in the onComplete of _animateScroll
        } else {
            // Still in the same segment, just update percentages
            this._updateVisibleMoodsContent(this.currentDisplaySegmentStartIndex, interpolationFactorT);
        }
    }

    _getPeakHueForMood(moodName) {
        const moodIndex = this.config.MOOD_MATRIX_DEFINITIONS.indexOf(moodName);
        if (moodIndex === -1) return this.appState.getTargetColorProperties('lcd')?.hue || 0; // Fallback
        // Calculate peak hue as the start of the mood's segment
        return (moodIndex * this.config.MOOD_MATRIX_SEGMENT_DEGREES) % 360;
    }

    _updateMoodRowContent(domElement, percentage, label) {
        if (!domElement) {
            if (this.debug) console.error('[MMDM _updateMoodRowContent] Attempted to update undefined domElement!');
            return;
        }
        const valueSpan = domElement.querySelector('.mood-value');
        const labelSpan = domElement.querySelector('.mood-label');

        if (!valueSpan || !labelSpan) {
            if (this.debug) console.error(`[MMDM _updateMoodRowContent] Missing value or label span in domElement (phys index ${domElement.dataset.physicalIndex}, logical role ${domElement.dataset.logicalRole || 'N/A'})`);
            return;
        }
        
        const peakHue = this._getPeakHueForMood(label);

        valueSpan.textContent = this._formatPercentageString(percentage);
        valueSpan.style.setProperty('--mood-value-specific-hue', peakHue.toFixed(1));
        
        labelSpan.textContent = label;
        labelSpan.style.setProperty('--mood-label-specific-hue', peakHue.toFixed(1));

        // Apply text styling based on parent LCD state
        const textElements = [valueSpan, labelSpan];
        textElements.forEach(el => {
            el.classList.remove('text-is-unlit', 'text-is-dimly-lit', 'text-is-active');
            
            let effectiveState = this.currentParentLcdState;
            // Special handling during startup if parent is 'active' but global dimming is still in effect
            if (this.appState.getAppStatus() === 'starting-up' &&
                this.currentParentLcdState === 'active' &&
                parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--startup-L-reduction-factor') || '0') > 0.01) {
                effectiveState = 'dimly-lit'; // Treat as dimly-lit for text color purposes
            }

            if (effectiveState === 'unlit') el.classList.add('text-is-unlit');
            else if (effectiveState === 'dimly-lit') el.classList.add('text-is-dimly-lit');
            else el.classList.add('text-is-active'); // Default to active
        });
    }

    _updateVisibleMoodsContent(absoluteSegmentStartIndex, t) {
        const N = this.config.MOOD_MATRIX_DEFINITIONS.length;
        const mood1Index = (absoluteSegmentStartIndex % N + N) % N;
        const mood2Index = ((absoluteSegmentStartIndex + 1) % N + N) % N; // Next mood in sequence
        
        const mood1Name = this.config.MOOD_MATRIX_DEFINITIONS[mood1Index];
        const mood2Name = this.config.MOOD_MATRIX_DEFINITIONS[mood2Index];

        const mood1Percent = (1 - t) * 100;
        const mood2Percent = t * 100;

        const elLine1 = this.rowElements[this.domCycleIndex % 3];
        const elLine2 = this.rowElements[(this.domCycleIndex + 1) % 3];

        if (!elLine1 || !elLine2) {
            if (this.debug) console.error(`[MMDM _updateVisibleMoodsContent] ERROR: elLine1 or elLine2 is undefined! CycleIndex: ${this.domCycleIndex}`);
            return;
        }
        
        // Ensure logical roles are set for clarity if needed elsewhere, though primarily for debugging here
        elLine1.dataset.logicalRole = "Line1";
        elLine2.dataset.logicalRole = "Line2";

        this._updateMoodRowContent(elLine1, mood1Percent, mood1Name);
        this._updateMoodRowContent(elLine2, mood2Percent, mood2Name);
        
        if (this.debug && Math.random() < 0.05) { // Occasional log
            // console.log(`[MMDM _updateVisible] L1(phys ${elLine1.dataset.physicalIndex}): ${mood1Name} ${mood1Percent.toFixed(0)}%, L2(phys ${elLine2.dataset.physicalIndex}): ${mood2Name} ${mood2Percent.toFixed(0)}%. ParentLCD: ${this.currentParentLcdState}, t=${t.toFixed(3)}`);
        }
    }
    
    _prepBufferElement(bufferElement, forAbsoluteSegmentStartIndex, forScrollDirection) {
        if (!bufferElement) { if (this.debug) console.error("[MMDM _prepBufferElement] bufferElement is undefined!"); return; }
        
        const N = this.config.MOOD_MATRIX_DEFINITIONS.length;
        let moodNameForBuffer;
        let yPos;
        let logicalRoleForBuffer;

        if (forScrollDirection === 'down') { // Buffer is being prepared to sit below the visible lines
            const moodIndex = ((forAbsoluteSegmentStartIndex + 2) % N + N) % N;
            moodNameForBuffer = this.config.MOOD_MATRIX_DEFINITIONS[moodIndex];
            yPos = 2 * this.rowHeight;
            logicalRoleForBuffer = "BufferBelow";
        } else { // forScrollDirection === 'up'. Buffer is being prepared to sit above the visible lines
            const moodIndex = ((forAbsoluteSegmentStartIndex - 1) % N + N) % N;
            moodNameForBuffer = this.config.MOOD_MATRIX_DEFINITIONS[moodIndex];
            yPos = -this.rowHeight;
            logicalRoleForBuffer = "BufferAbove";
        }
        
        bufferElement.dataset.logicalRole = logicalRoleForBuffer;
        this._updateMoodRowContent(bufferElement, 0, moodNameForBuffer); // Buffers always show 0% initially
        this.gsap.set(bufferElement, { y: yPos, opacity: 0 }); // Ensure opacity is 0 for buffer
        
        if (this.debug) console.log(`  [MMDM _prepBuffer] Prepped phys ${bufferElement.dataset.physicalIndex} as ${logicalRoleForBuffer}. Content: ${moodNameForBuffer} 0%, y: ${yPos.toFixed(1)}, op:0. Based on newAbsSegIdx: ${forAbsoluteSegmentStartIndex}, scrollDir: ${forScrollDirection}`);
    }

    _animateScroll(direction, newAbsoluteSegmentStartIndex, interpolationFactorTForNewSegment) {
        if (this.rowHeight === 0) this._cacheLayoutMetrics();
        if (this.rowHeight === 0) { 
            if(this.debug) console.error("[MMDM _animateScroll] RowHeight is 0. Aborting scroll animation.");
            this.isScrolling = false; 
            return; 
        }

        const oldCycleIndex = this.domCycleIndex;
        const elCurrentLine1 = this.rowElements[oldCycleIndex % 3];
        const elCurrentLine2 = this.rowElements[(oldCycleIndex + 1) % 3];
        const elBufferAnimatingIn = this.rowElements[(oldCycleIndex + 2) % 3];

        if (this.debug) console.log(`[MMDM _animateScroll START] Dir: ${direction}, NewAbsSegIdx: ${newAbsoluteSegmentStartIndex}, tForNew (received): ${interpolationFactorTForNewSegment.toFixed(4)}. CURR cycleIdx: ${oldCycleIndex}. L1(phys ${elCurrentLine1.dataset.physicalIndex}), L2(phys ${elCurrentLine2.dataset.physicalIndex}), BufIn(phys ${elBufferAnimatingIn.dataset.physicalIndex})`);

        const N = this.config.MOOD_MATRIX_DEFINITIONS.length;
        // These are the moods for the segment we are scrolling INTO
        const newMood1Name = this.config.MOOD_MATRIX_DEFINITIONS[(newAbsoluteSegmentStartIndex % N + N) % N];
        const newMood2Name = this.config.MOOD_MATRIX_DEFINITIONS[((newAbsoluteSegmentStartIndex + 1) % N + N) % N];

        // CRITICAL DEBUG: Log the interpolation factor *immediately* before use for percentages
        if (this.debug) {
            console.log(`  [MMDM _animateScroll] CRITICAL CHECK: Using t=${interpolationFactorTForNewSegment.toFixed(4)} for percentage calculation. Direction: ${direction}. New Segment Start Index: ${newAbsoluteSegmentStartIndex}`);
        }

        const newMood1Percent = (1 - interpolationFactorTForNewSegment) * 100;
        const newMood2Percent = interpolationFactorTForNewSegment * 100;

        if (this.debug) {
            console.log(`  [MMDM _animateScroll Pre-ContentUpdate] Dir: ${direction}. New L1 target: ${newMood1Name} ${newMood1Percent.toFixed(1)}%. New L2 target: ${newMood2Name} ${newMood2Percent.toFixed(1)}%. (Derived from t=${interpolationFactorTForNewSegment.toFixed(4)})`);
        }

        const tl = this.gsap.timeline({
            onComplete: () => {
                let elementThatScrolledOut;
                let newCycleIndexVal;

                if (direction === 'down') {
                    newCycleIndexVal = (oldCycleIndex + 1) % 3;
                    elementThatScrolledOut = elCurrentLine1;
                } else { // up
                    newCycleIndexVal = (oldCycleIndex - 1 + 3) % 3;
                    elementThatScrolledOut = elCurrentLine2;
                }
                this.domCycleIndex = newCycleIndexVal;
                
                this._prepBufferElement(elementThatScrolledOut, newAbsoluteSegmentStartIndex, direction); 
                this._updateVisibleMoodsContent(newAbsoluteSegmentStartIndex, interpolationFactorTForNewSegment); 
                
                this.isScrolling = false;
                this.currentDisplaySegmentStartIndex = newAbsoluteSegmentStartIndex;
                if (this.debug) console.log(`[MMDM _animateScroll ONCOMPLETE] Dir: ${direction}. New cycleIdx: ${this.domCycleIndex}. ScrolledOut(phys ${elementThatScrolledOut.dataset.physicalIndex}) is new buffer. MasterSegIdx: ${this.currentDisplaySegmentStartIndex}, t used for final update: ${interpolationFactorTForNewSegment.toFixed(4)}`);
            }
        });

        if (direction === 'down') {
            // elCurrentLine2 becomes New Line1. elBufferAnimatingIn becomes New Line2.
            if (this.debug) {
                console.log(`  [MMDM _animateScroll DOWN] Updating phys ${elCurrentLine2.dataset.physicalIndex} (Old L2 -> New L1) with: ${newMood1Name} ${newMood1Percent.toFixed(1)}%`);
                console.log(`  [MMDM _animateScroll DOWN] Updating phys ${elBufferAnimatingIn.dataset.physicalIndex} (Old BufBelow -> New L2) with: ${newMood2Name} ${newMood2Percent.toFixed(1)}%`);
            }
            this._updateMoodRowContent(elCurrentLine2, newMood1Percent, newMood1Name);
            this._updateMoodRowContent(elBufferAnimatingIn, newMood2Percent, newMood2Name);

            elCurrentLine1.dataset.logicalRole = "ScrollingOutUp";
            elCurrentLine2.dataset.logicalRole = "BecomingLine1";
            elBufferAnimatingIn.dataset.logicalRole = "BecomingLine2FromBelow";

            tl.to(elCurrentLine1, { y: -this.rowHeight, opacity: 0, duration: this.config.MOOD_MATRIX_SCROLL_DURATION, ease: "sine.inOut" }, 0)
              .to(elCurrentLine2, { y: 0, opacity: 1, duration: this.config.MOOD_MATRIX_SCROLL_DURATION, ease: "sine.inOut" }, 0)
              .fromTo(elBufferAnimatingIn, { y: 2 * this.rowHeight, opacity: 0 }, { y: this.rowHeight, opacity: 1, duration: this.config.MOOD_MATRIX_SCROLL_DURATION, ease: "sine.inOut" }, 0);
        } else { // direction === 'up'
            // elBufferAnimatingIn becomes New Line1. elCurrentLine1 becomes New Line2.
            if (this.debug) {
                console.log(`  [MMDM _animateScroll UP] Updating phys ${elBufferAnimatingIn.dataset.physicalIndex} (Old BufAbove -> New L1) with: ${newMood1Name} ${newMood1Percent.toFixed(1)}%`);
                console.log(`  [MMDM _animateScroll UP] Updating phys ${elCurrentLine1.dataset.physicalIndex} (Old L1 -> New L2) with: ${newMood2Name} ${newMood2Percent.toFixed(1)}%`);
            }
            this._updateMoodRowContent(elBufferAnimatingIn, newMood1Percent, newMood1Name);
            this._updateMoodRowContent(elCurrentLine1, newMood2Percent, newMood2Name);

            elCurrentLine2.dataset.logicalRole = "ScrollingOutDown";
            elCurrentLine1.dataset.logicalRole = "BecomingLine2";
            elBufferAnimatingIn.dataset.logicalRole = "BecomingLine1FromAbove";

            tl.to(elCurrentLine2, { y: 2 * this.rowHeight, opacity: 0, duration: this.config.MOOD_MATRIX_SCROLL_DURATION, ease: "sine.inOut" }, 0)
              .to(elCurrentLine1, { y: this.rowHeight, opacity: 1, duration: this.config.MOOD_MATRIX_SCROLL_DURATION, ease: "sine.inOut" }, 0)
              .fromTo(elBufferAnimatingIn, { y: -this.rowHeight, opacity: 0 }, { y: 0, opacity: 1, duration: this.config.MOOD_MATRIX_SCROLL_DURATION, ease: "sine.inOut" }, 0);
        }
    }

    _formatPercentageString(percentage) {
        const rounded = Math.round(percentage);
        return String(rounded).padStart(3, ' ') + '%';
    }

    destroy() {
        window.removeEventListener('resize', this._handleResize.bind(this));
        // Add any other necessary cleanup, like unsubscribing from appState events
        // For now, appState subscriptions are not explicitly cleaned up, but in a larger app, this would be important.
        if (this.debug) console.log("[MMDM DESTROY] Destroying manager.");
    }
}

export default MoodMatrixDisplayManager;