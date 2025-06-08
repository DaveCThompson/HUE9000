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

        // [FIX] Cache the content wrapper elements
        this.moodLcdContent = null;
        this.intensityLcdContent = null;
    }

    init() {
        // [DEBUG]
        console.log('[MoodMatrixManager] init() called.');

        this.appState = serviceLocator.get('appState');
        this.config = serviceLocator.get('config');
        this.dom = serviceLocator.get('domElements');
        this.gsap = serviceLocator.get('gsap');

        // [FIX] Get references to the actual content wrappers
        this.moodLcdContent = this.dom.lcdA.querySelector('.lcd-content-wrapper');
        this.intensityLcdContent = this.dom.lcdB.querySelector('.lcd-content-wrapper');

        const displayConfig = {
            moods: this.config.MOOD_MATRIX_DEFINITIONS,
            majorBlocks: this.config.V2_DISPLAY_PARAMS.MOOD_MAJOR_BLOCKS,
            fineDots: this.config.V2_DISPLAY_PARAMS.MOOD_FINE_DOTS,
        };

        this.moodMatrix = new MoodMatrix(this.moodLcdContent, displayConfig, this.gsap);

        this.appState.subscribe('dialUpdated', ({ id, state }) => {
            if (id === 'A') {
                this.handleDialUpdate(state.hue);

                if (state.isDragging !== this.lastIsDragging) {
                    this.lastIsDragging = state.isDragging;
                    this.handleInteractionChange(state.isDragging);
                }
            }
        });

        // Initial render
        this.handleDialUpdate(this.appState.getDialState('A').hue);
    }

    handleDialUpdate(hue) {
        // [DEBUG]
        // console.log(`[MoodMatrixManager] handleDialUpdate() called with hue: ${hue}`);
        this.moodMatrix.update({ hue });
        
        const hueValue = Number(hue.toFixed(1));

        // [FIX] Set the CSS variable on the correct content wrapper elements
        if (this.moodLcdContent) {
            this.moodLcdContent.style.setProperty('--display-active-hue', hueValue);
        }
        if (this.intensityLcdContent) {
            this.intensityLcdContent.style.setProperty('--display-active-hue', hueValue);
        }
    }

    handleInteractionChange(isInteracting) {
        // [DEBUG]
        console.log(`[MoodMatrixManager] handleInteractionChange() called. isInteracting: ${isInteracting}`);

        const idleDelay = this.config.V2_DISPLAY_PARAMS.RESONANCE_IDLE_DELAY_MS;

        clearTimeout(this.resonanceTimer);
        this.dom.lcdA.classList.remove('is-resonating');

        if (!isInteracting) {
            this.resonanceTimer = setTimeout(() => {
                const dialState = this.appState.getDialState('A');
                if (dialState && dialState.hue > 0) {
                    // [DEBUG]
                    console.log('[MoodMatrixManager] Starting resonance for Dial A.');
                    this.dom.lcdA.classList.add('is-resonating');
                }
            }, idleDelay);
        }
    }
}