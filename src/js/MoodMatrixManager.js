/**
 * @module MoodMatrixManager
 * @description Replaces the old moodMatrixDisplayManager, bridging appState and the new MoodMatrix component.
 */
import { serviceLocator } from './serviceLocator.js';
import { MoodMatrix } from './MoodMatrix.js';

export class MoodMatrixManager {
    constructor() {
        this.appState = null;
        this.config = null;
        this.dom = null;
        this.gsap = null;
        this.moodMatrix = null;
        this.resonanceTimer = null;
        this.lastIsDragging = false;
        this.moodLcdContent = null;
    }

    init() {
        // [DEBUG]
        console.log('[MoodMatrixManager] init() called.');

        this.appState = serviceLocator.get('appState');
        this.config = serviceLocator.get('config');
        this.dom = serviceLocator.get('domElements');
        this.gsap = serviceLocator.get('gsap');

        this.moodLcdContent = this.dom.lcdA.querySelector('.lcd-content-wrapper');

        const displayConfig = {
            moods: this.config.MOOD_MATRIX_DEFINITIONS.map(mood => mood.toUpperCase()),
            majorBlocks: this.config.V2_DISPLAY_PARAMS.MOOD_MAJOR_BLOCKS,
            fineDots: this.config.V2_DISPLAY_PARAMS.MOOD_FINE_DOTS,
        };

        this.moodMatrix = new MoodMatrix(this.moodLcdContent, displayConfig, this.gsap);

        this.appState.subscribe('dialUpdated', ({ id, state }) => {
            if (id === 'A') {
                // If the dragging state has changed, let the interaction handler
                // manage the transition and then STOP processing for this event tick.
                if (state.isDragging !== this.lastIsDragging) {
                    this.handleInteractionChange(state.isDragging, state.hue);
                    this.lastIsDragging = state.isDragging;
                    return; // <-- FIX: Prevents race condition where handleDialUpdate overwrites animations.
                }
                
                // This will now only run on subsequent 'dialUpdated' events
                // during a continuous drag, or when the value changes without dragging.
                this.handleDialUpdate(state.hue, state.isDragging);
            }
        });

        // Initial render
        this.handleDialUpdate(this.appState.getDialState('A').hue, false);
    }

    handleDialUpdate(hue, isDragging) {
        // Pass the dragging state to the component's update method.
        this.moodMatrix.update({ hue, isDragging });
    }

    handleInteractionChange(isInteracting, currentHue) {
        const idleDelay = this.config.V2_DISPLAY_PARAMS.RESONANCE_IDLE_DELAY_MS;
        
        clearTimeout(this.resonanceTimer);
        this.dom.lcdA.classList.remove('is-resonating');

        if (isInteracting) {
            // When interaction starts, begin the continuous scramble.
            this.moodMatrix.startContinuousScramble(currentHue);
        } else {
            // When interaction ends, stop the scramble and handle resonance.
            this.moodMatrix.stopContinuousScramble(currentHue);
            this.resonanceTimer = setTimeout(() => {
                const dialState = this.appState.getDialState('A');
                if (dialState && dialState.hue > 0) {
                    this.dom.lcdA.classList.add('is-resonating');
                }
            }, idleDelay);
        }
    }
}