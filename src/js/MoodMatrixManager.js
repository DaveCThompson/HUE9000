/**
 * @module MoodMatrixManager
 * @description Bridges appState and the new MoodMatrix component.
 */
import { serviceLocator } from './serviceLocator.js';
import { appState } from './state/index.js';
import { MoodMatrix } from './MoodMatrix.js';
import { MOOD_MATRIX_DEFINITIONS, V2_DISPLAY_PARAMS } from './config/index.js';

export class MoodMatrixManager {
    constructor() {
        this.dom = null;
        this.gsap = null;
        this.moodMatrix = null;
        this.resonanceTimer = null;
        this.lastIsDragging = false;
        this.moodLcdContent = null;
    }

    init() {
        this.dom = serviceLocator.get('domElements');
        this.gsap = serviceLocator.get('gsap');
        this.moodLcdContent = this.dom.lcdA.querySelector('.lcd-content-wrapper');
        const displayConfig = {
            moods: MOOD_MATRIX_DEFINITIONS.map(mood => mood.toUpperCase()),
            majorBlocks: V2_DISPLAY_PARAMS.MOOD_MAJOR_BLOCKS,
            fineDots: V2_DISPLAY_PARAMS.MOOD_FINE_DOTS,
        };
        this.moodMatrix = new MoodMatrix(this.moodLcdContent, displayConfig, this.gsap);
        appState.subscribe('dialUpdated', ({ id, state }) => {
            if (id === 'A') {
                if (state.isDragging !== this.lastIsDragging) {
                    this.handleInteractionChange(state.isDragging, state.hue);
                    this.lastIsDragging = state.isDragging;
                    return; 
                }
                this.handleDialUpdate(state.hue);
            }
        });
        this.handleDialUpdate(appState.getDialState('A').hue);
    }

    handleDialUpdate(hue) {
        this.moodMatrix.update({ hue });
    }

    handleInteractionChange(isInteracting, currentHue) {
        const idleDelay = V2_DISPLAY_PARAMS.RESONANCE_IDLE_DELAY_MS;
        clearTimeout(this.resonanceTimer);
        this.dom.lcdA.classList.remove('is-resonating');
        if (isInteracting) {
            this.moodMatrix.startContinuousScramble(currentHue);
        } else {
            this.moodMatrix.stopContinuousScramble(currentHue);
            this.resonanceTimer = setTimeout(() => {
                const dialState = appState.getDialState('A');
                if (dialState && dialState.hue > 0) {
                    this.dom.lcdA.classList.add('is-resonating');
                }
            }, idleDelay);
        }
    }
}