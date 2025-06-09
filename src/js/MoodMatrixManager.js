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
                if (state.isDragging !== this.lastIsDragging) {
                    this.handleInteractionChange(state.isDragging, state.hue);
                    this.lastIsDragging = state.isDragging;
                    return; // Prevents race condition where handleDialUpdate overwrites animations.
                }
                this.handleDialUpdate(state.hue);
            }
        });

        // Initial render
        this.handleDialUpdate(this.appState.getDialState('A').hue);
    }

    handleDialUpdate(hue) {
        this.moodMatrix.update({ hue });
    }

    handleInteractionChange(isInteracting, currentHue) {
        const idleDelay = this.config.V2_DISPLAY_PARAMS.RESONANCE_IDLE_DELAY_MS;
        
        clearTimeout(this.resonanceTimer);
        this.dom.lcdA.classList.remove('is-resonating');

        if (isInteracting) {
            this.moodMatrix.startContinuousScramble(currentHue);
        } else {
            this.moodMatrix.stopContinuousScramble(currentHue);
            this.resonanceTimer = setTimeout(() => {
                const dialState = this.appState.getDialState('A');
                // Only resonate if there's a non-zero value
                if (dialState && dialState.hue > 0) {
                    this.dom.lcdA.classList.add('is-resonating');
                }
            }, idleDelay);
        }
    }
}