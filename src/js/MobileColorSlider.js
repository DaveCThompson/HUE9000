import { gsap } from "gsap";
import { appState, actions } from './state/index.js';
import { HUE_ASSIGNMENT_ROW_HUES, MOBILE_SLIDER_HUE_NAMES } from './config/index.js';
import { serviceLocator } from "./serviceLocator.js";

/**
 * @class MobileColorSlider
 * @description Manages the mobile-only vertical color slider component.
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
    #thumbInner;

    // --- State ---
    #isDragging = false;
    #dragHue = null; // MODIFIED: Local state for drag value
    #stateUpdatePending = false;
    #audioManager;
    #hapticManager;
    #trackRect = null;
    #containerRect = null;

    constructor() {
        this.#audioManager = serviceLocator.get('audioManager');
        this.#hapticManager = serviceLocator.get('hapticFeedbackManager');
        this.#container = document.getElementById('mobile-color-slider-container');
        this.#track = document.getElementById('mobile-slider-track');
        this.#thumb = document.getElementById('mobile-slider-thumb');
        if (this.#thumb) {
            this.#thumbInner = this.#thumb.querySelector('.thumb-inner');
        }
    }

    init() {
        if (!this.#container || !this.#track || !this.#thumb || !this.#thumbInner) {
            return;
        }
        this._recalculateDimensions();
        this.#updateTrackGradient();
        this.#container.addEventListener('pointerdown', this.#onDragStart);
        appState.subscribe('targetColorChanged', this.#onExternalStateChange);
        this.#updateThumbFromState();
    }

    _recalculateDimensions = () => {
        this.#trackRect = this.#track.getBoundingClientRect();
        if (this.#container) {
            this.#containerRect = this.#container.getBoundingClientRect();
        }
    };

    #getOklchColorString = (hue) => {
        if (hue === this.#CONFIG.HUES[0] || hue === null) {
            return `oklch(${this.#CONFIG.COLOR_LUMINANCE} 0 0)`;
        }
        return `oklch(${this.#CONFIG.COLOR_LUMINANCE} ${this.#CONFIG.COLOR_CHROMA} ${hue})`;
    };

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

        this.#thumbInner.style.backgroundColor = this.#getOklchColorString(currentHue);

        let yPercent;
        if (hueIndex === 0) {
            yPercent = 0;
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
        this.#hapticManager.triggerSliderScrub();
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
        
        // MODIFIED: Update visuals directly, but store hue locally for final dispatch.
        this.#dragHue = targetHue;
        this.#thumbInner.style.backgroundColor = this.#getOklchColorString(targetHue);
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
        
        if (this.#dragHue !== null) {
            appState.dispatch(actions.setHueAssignment('all', this.#dragHue));
        }
        this.#dragHue = null;
        
        this.#updateThumbFromState();
        
        window.removeEventListener('pointermove', this.#handlePointerAction);
    };

    #onExternalStateChange = (payload) => {
        if (payload.targetKey === 'env' || payload.targetKey === 'all') {
            this.#updateThumbFromState();
        }
    };
}