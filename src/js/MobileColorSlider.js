import { gsap } from "gsap";
import * as appState from './appState.js';
import { HUE_ASSIGNMENT_ROW_HUES, MOBILE_SLIDER_HUE_NAMES } from './config/index.js';
import { serviceLocator } from "./serviceLocator.js";

/**
 * @class MobileColorSlider
 * @description Manages the mobile-only vertical color slider component.
 * Encapsulates all logic for interaction, state updates, and visual feedback.
 */
export class MobileColorSlider {
    // --- Configuration ---
    #CONFIG = {
        COLORLESS_ZONE_PERCENT: 10,
        SNAP_THRESHOLD_PERCENT: 12,
        COLOR_LUMINANCE: 0.705,
        COLOR_CHROMA: 0.15,
        HUES: HUE_ASSIGNMENT_ROW_HUES,
        HUE_NAMES: MOBILE_SLIDER_HUE_NAMES,
    };

    // --- DOM Elements ---
    #container;
    #track;
    #thumb;
    #thumbInner; // MODIFIED: Added for the inner circle

    // --- State ---
    #isDragging = false;
    #stateUpdatePending = false;
    #audioManager;
    #hapticManager;
    #trackRect = null;
    #containerRect = null;

    /**
     * @param {object} dependencies - Dependencies from serviceLocator.
     * @param {AudioManager} dependencies.audioManager - The application's audio manager.
     */
    constructor() {
        this.#audioManager = serviceLocator.get('audioManager');
        this.#hapticManager = serviceLocator.get('hapticFeedbackManager');
        this.#container = document.getElementById('mobile-color-slider-container');
        this.#track = document.getElementById('mobile-slider-track');
        this.#thumb = document.getElementById('mobile-slider-thumb');
        // MODIFIED: Select the new inner thumb element
        if (this.#thumb) {
            this.#thumbInner = this.#thumb.querySelector('.thumb-inner');
        }
    }

    /**
     * Initializes the component, sets up listeners and initial state.
     */
    init() {
        if (!this.#container || !this.#track || !this.#thumb || !this.#thumbInner) {
            console.warn('[MobileColorSlider] Could not initialize. Required DOM elements not found.');
            return;
        }

        this._recalculateDimensions();
        this.#updateTrackGradient();
        
        // Use pointerdown on the container for unified click/drag handling
        this.#container.addEventListener('pointerdown', this.#onDragStart);
        appState.subscribe('targetColorChanged', this.#onExternalStateChange);

        // FIX: Ensure thumb is correctly positioned on load
        this.#updateThumbFromState();
    }

    /**
     * @private
     * Caches the track's and container's dimensions for positioning calculations.
     */
    _recalculateDimensions = () => {
        this.#trackRect = this.#track.getBoundingClientRect();
        if (this.#container) {
            this.#containerRect = this.#container.getBoundingClientRect();
        }
    };

    /**
     * @private
     * Generates an OKLCH color string for a given hue.
     * @param {number | null} hue - The hue value, or null for colorless.
     * @returns {string} The OKLCH color string.
     */
    #getOklchColorString = (hue) => {
        // Use a neutral grey for the colorless state (HUES[0] is null)
        if (hue === this.#CONFIG.HUES[0] || hue === null) {
            return `oklch(${this.#CONFIG.COLOR_LUMINANCE} 0 0)`;
        }
        return `oklch(${this.#CONFIG.COLOR_LUMINANCE} ${this.#CONFIG.COLOR_CHROMA} ${hue})`;
    };

    /**
     * @private
     * Updates the thumb's visual `top` property based on a given percentage.
     * Converts the percentage (relative to track height) to an absolute pixel value.
     * @param {number} percent - The target percentage (0-100) for the thumb's top position.
     * @param {boolean} [animate=false] - Whether to animate the change.
     */
    #updateThumbVisuals = (percent, animate = false) => {
        if (!this.#trackRect || !this.#containerRect || this.#containerRect.height === 0) {
            this._recalculateDimensions();
            if (!this.#trackRect || !this.#containerRect || this.#containerRect.height === 0) return;
        }
        
        const paddingTop = this.#trackRect.top - this.#containerRect.top;
        const topOffsetInTrack = (percent / 100) * this.#trackRect.height;
        const finalTopValue = paddingTop + topOffsetInTrack;

        gsap.to(this.#thumb, {
            top: finalTopValue,
            duration: animate ? 0.2 : 0,
            ease: 'power1.out',
            overwrite: true
        });
    };

    #updateTrackGradient = () => {
        const hueStops = this.#CONFIG.HUES.slice(1).map((hue, i, arr) => {
            const percent = this.#CONFIG.COLORLESS_ZONE_PERCENT + ((i + 1) / arr.length) * (100 - this.#CONFIG.COLORLESS_ZONE_PERCENT);
            return `oklch(${this.#CONFIG.COLOR_LUMINANCE} ${this.#CONFIG.COLOR_CHROMA} ${hue}) ${percent}%`;
        }).join(', ');
        const colorlessColor = `oklch(${this.#CONFIG.COLOR_LUMINANCE} 0 0)`;
        this.#track.style.background = `linear-gradient(to bottom, ${colorlessColor} 0%, ${colorlessColor} ${this.#CONFIG.COLORLESS_ZONE_PERCENT}%, ${hueStops})`;
    };

    #updateThumbFromState = () => {
        if (this.#isDragging) {
            this.#stateUpdatePending = true;
            return;
        }

        this.#stateUpdatePending = false;
        const currentHue = appState.getTargetColorProperties('env').hue;
        const hueIndex = this.#CONFIG.HUES.findIndex(h => h === currentHue);
        if (hueIndex === -1) return;

        // MODIFIED: Update the inner thumb's color
        this.#thumbInner.style.backgroundColor = this.#getOklchColorString(currentHue);

        let yPercent;
        if (hueIndex === 0) {
            yPercent = 0; // Snap to the top for colorless
        } else {
            const colorStepCount = this.#CONFIG.HUES.length - 1;
            const colorIndex = hueIndex - 1;
            const colorRangePercent = colorIndex / (colorStepCount - 1);
            yPercent = this.#CONFIG.COLORLESS_ZONE_PERCENT + colorRangePercent * (100 - this.#CONFIG.COLORLESS_ZONE_PERCENT);
        }

        this.#updateThumbVisuals(yPercent, true);
        this.#updateAriaAttributes(hueIndex);
    };

    #handlePointerAction = (event) => {
        event.preventDefault();
        
        // Add a subtle vibration on each move event to simulate a dial "scrubbing"
        this.#hapticManager.triggerSliderScrub();

        if (!this.#trackRect) this._recalculateDimensions();
        if (!this.#trackRect || this.#trackRect.height === 0) return;

        const clientY = event.touches ? event.touches[0].clientY : event.clientY;
        const pointerYInTrack = clientY - this.#trackRect.top;
        
        const clampedPercent = Math.max(0, Math.min((pointerYInTrack / this.#trackRect.height) * 100, 100));
        
        let targetHue;
        let hueIndex;

        if (clampedPercent < this.#CONFIG.SNAP_THRESHOLD_PERCENT) {
            hueIndex = 0;
            targetHue = this.#CONFIG.HUES[0];
        } else {
            const colorRangeCount = this.#CONFIG.HUES.length - 1;
            const colorRangePercent = (clampedPercent - this.#CONFIG.COLORLESS_ZONE_PERCENT) / (100 - this.#CONFIG.COLORLESS_ZONE_PERCENT);
            hueIndex = Math.round(colorRangePercent * (colorRangeCount - 1)) + 1;
            hueIndex = Math.max(1, Math.min(this.#CONFIG.HUES.length - 1, hueIndex));
            targetHue = this.#CONFIG.HUES[hueIndex];
        }

        // MODIFIED: Update inner thumb color live during drag
        this.#thumbInner.style.backgroundColor = this.#getOklchColorString(targetHue);

        appState.setTargetColorProperties('env', targetHue);
        appState.setTargetColorProperties('logo', targetHue);
        appState.setTargetColorProperties('lcd', targetHue);
        // NEW: Also update the button hue
        appState.setTargetColorProperties('btn', targetHue);

        this.#updateAriaAttributes(hueIndex);

        if (this.#isDragging) {
            this.#updateThumbVisuals(clampedPercent, false);
        }
    };
    
    #updateAriaAttributes = (hueIndex) => {
        this.#container.setAttribute('aria-valuenow', hueIndex);
        this.#container.setAttribute('aria-valuetext', `Color: ${this.#CONFIG.HUE_NAMES[hueIndex]}`);
    };

    #onDragStart = (event) => {
        this.#isDragging = true;
        this.#stateUpdatePending = false;
        this._recalculateDimensions();
        this.#container.classList.add('is-dragging');
        this.#container.setPointerCapture(event.pointerId);
        this.#audioManager.play('dialLoop', true, 0.2);
        this.#hapticManager.triggerClick();
        
        this.#handlePointerAction(event);

        window.addEventListener('pointermove', this.#handlePointerAction);
        window.addEventListener('pointerup', this.#onDragEnd, { once: true });
    };

    #onDragEnd = (event) => {
        this.#isDragging = false;
        this.#container.releasePointerCapture(event.pointerId);
        this.#container.classList.remove('is-dragging');
        this.#audioManager.stop('dialLoop');
        this.#hapticManager.triggerToggleOff();
        
        this.#updateThumbFromState();
        
        window.removeEventListener('pointermove', this.#handlePointerAction);
    };

    #onExternalStateChange = (payload) => {
        if (payload.targetKey === 'env') {
            this.#updateThumbFromState();
        }
    };
}