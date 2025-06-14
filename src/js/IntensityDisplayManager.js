/**
 * @module IntensityDisplayManager
 * @description Acts as the bridge between appState and the IntensityDisplay component.
 */
import { serviceLocator } from './serviceLocator.js';
import * as appState from './appState.js'; // IMPORT appState directly
import { IntensityDisplay } from './IntensityDisplay.js';

export class IntensityDisplayManager {
    constructor() {
        // this.appState = null; // REMOVED
        this.config = null;
        this.dom = null;
        this.intensityDisplay = null;
        this.resonanceTimer = null;
    }

    init() {
        console.log('[IntensityDisplayManager] init() called.');

        // this.appState = serviceLocator.get('appState'); // REMOVED
        this.config = serviceLocator.get('config');
        this.dom = serviceLocator.get('domElements');

        const displayConfig = {
            bars: this.config.V2_DISPLAY_PARAMS.INTENSITY_BARS,
            dots: this.config.V2_DISPLAY_PARAMS.INTENSITY_DOTS,
        };

        this.intensityDisplay = new IntensityDisplay(this.dom.lcdB.querySelector('.lcd-content-wrapper'), displayConfig);
        
        appState.subscribe('dialUpdated', ({ id, state }) => {
            if (id === 'B') {
                this.handleDialUpdate(state.hue);
            }
        });

        appState.subscribe('dialBInteractionChange', (interactionState) => {
            const isInteracting = (interactionState === 'dragging' || interactionState === 'settling');
            this.handleInteractionChange(isInteracting);
        });

        this.handleDialUpdate(appState.getDialState('B').hue);
    }

    handleDialUpdate(value) {
        const percentage = (value / 360) * 100;
        this.intensityDisplay.update({ percentage });
    }

    handleInteractionChange(isInteracting) {
        console.log(`[IntensityDisplayManager] handleInteractionChange() called. isInteracting: ${isInteracting}`);

        const idleDelay = this.config.V2_DISPLAY_PARAMS.RESONANCE_IDLE_DELAY_MS;
        
        clearTimeout(this.resonanceTimer);
        this.dom.lcdB.classList.remove('is-resonating');

        if (!isInteracting) {
            this.resonanceTimer = setTimeout(() => {
                const dialState = appState.getDialState('B');
                if (dialState && dialState.hue > 0) {
                    console.log('[IntensityDisplayManager] Starting resonance for Dial B.');
                    this.dom.lcdB.classList.add('is-resonating');
                }
            }, idleDelay);
        }
    }
}