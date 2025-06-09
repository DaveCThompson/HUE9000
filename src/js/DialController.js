/**
 * @module DialController
 * @description Represents a single rotary dial component, managing its state
 * and user interaction. It dynamically recalculates and updates SVG ridge attributes
 * on each frame to create a 3D perspective rotation effect.
 */
import { serviceLocator } from './serviceLocator.js';

class DialController {
    /**
     * @param {HTMLElement} containerElement - The main div container for the dial.
     * @param {string} dialId - 'A' or 'B'.
     */
    constructor(containerElement, dialId) {
        // Dependencies
        this.appState = serviceLocator.get('appState');
        this.configModule = serviceLocator.get('config');
        this.gsap = serviceLocator.get('gsap');

        // Element & State
        this.containerElement = containerElement;
        this.dialId = dialId;
        this.svg = this.containerElement.querySelector('.dial-svg');
        this.ridgesGroup = this.svg ? this.svg.querySelector('.dial-ridges-group') : null;
        if (!this.svg || !this.ridgesGroup) {
            console.error(`[DialController ${this.dialId}] Critical SVG elements not found.`);
            return;
        }

        this.config = {
            NUM_RIDGES: 100,
            RIDGE_WIDTH_FACTOR: 1.6,
            PIXELS_PER_DEGREE_ROTATION: 1.3,
            PIXELS_PER_DEGREE_HUE: 0.16,
            GSAP_TWEEN_DURATION: 0.5,
            GSAP_TWEEN_EASE: 'power2.out',
            LIGHT_ANGLE_DEG: 0,
            // This factor is now applied in JS to halve the chroma from the environment variable.
            CHROMA_MODIFICATION_FACTOR: 0.5,
        };

        this.isDragging = false;
        this.rotation = 0;
        this.targetRotation = 0;
        this.currentPointerX = 0;
        this.gsapTween = null;
        this.ridgeElements = [];
        this.lightAngleRad = this.config.LIGHT_ANGLE_DEG * (Math.PI / 180);
        this.unsubscribers = [];
        this.themeVars = {};
        this.debug = false;

        this._createRidges();
        this._addDragListeners();
        this._subscribeToAppStateEvents();
        this.forceRedraw(); // Initial draw
    }

    _subscribeToAppStateEvents() {
        const dialUpdateUnsub = this.appState.subscribe('dialUpdated', payload => {
            if (payload && payload.id === this.dialId && !this.isDragging) {
                if (this.gsapTween) this.gsapTween.kill();
                this.gsapTween = this.gsap.to(this, {
                    rotation: payload.state.rotation,
                    duration: this.config.GSAP_TWEEN_DURATION,
                    ease: this.config.GSAP_TWEEN_EASE,
                    onUpdate: () => this._draw()
                });
            }
        });
        this.unsubscribers.push(dialUpdateUnsub);

        const themeChangeUnsub = this.appState.subscribe('themeChanged', newTheme => {
            if (this.debug) console.log(`[DialController ${this.dialId}] Detected themeChanged to '${newTheme}'. Forcing redraw.`);
            requestAnimationFrame(() => this.forceRedraw());
        });
        this.unsubscribers.push(themeChangeUnsub);

        const envColorUnsub = this.appState.subscribe('targetColorChanged', payload => {
            if (payload.targetKey === 'env') {
                if (this.debug) console.log(`[DialController ${this.dialId}] Detected ENV color change. Forcing redraw.`);
                this.forceRedraw();
            }
        });
        this.unsubscribers.push(envColorUnsub);
    }

    _createRidges() {
        const fragment = document.createDocumentFragment();
        for (let i = 0; i < this.config.NUM_RIDGES; i++) {
            const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            rect.setAttribute('class', 'dial-ridge');
            rect.setAttribute('y', '0');
            rect.setAttribute('height', '100%');
            rect.setAttribute('rx', '0.5');
            this.ridgeElements.push(rect);
            fragment.appendChild(rect);
        }
        this.ridgesGroup.appendChild(fragment);
    }
    
    _addDragListeners() {
        this.boundInteractionStart = this._handleInteractionStart.bind(this);
        this.boundInteractionMove = this._handleInteractionMove.bind(this);
        this.boundInteractionEnd = this._handleInteractionEnd.bind(this);
        this.boundOnResize = this.forceRedraw.bind(this);

        this.containerElement.addEventListener('mousedown', this.boundInteractionStart);
        this.containerElement.addEventListener('touchstart', this.boundInteractionStart, { passive: false });
        window.addEventListener('mousemove', this.boundInteractionMove);
        window.addEventListener('touchmove', this.boundInteractionMove, { passive: false });
        window.addEventListener('mouseup', this.boundInteractionEnd);
        window.addEventListener('touchend', this.boundInteractionEnd);
        window.addEventListener('mouseleave', this.boundInteractionEnd);
        window.addEventListener('resize', this.boundOnResize);
    }

    _handleInteractionStart(event) {
        if (this.appState.getAppStatus() !== 'interactive') return;
        event.preventDefault();
        this.isDragging = true;
        this.containerElement.classList.add('is-dragging');
        if (this.gsapTween) this.gsapTween.kill();
        this.currentPointerX = event.touches ? event.touches[0].clientX : event.clientX;
        this.targetRotation = this.rotation;
        this.appState.updateDialState(this.dialId, { isDragging: true });
        if (this.dialId === 'B') this.appState.setDialBInteractionState('dragging');
    }

    _handleInteractionMove(event) {
        if (!this.isDragging) return;
        event.preventDefault();

        const newPointerX = event.touches ? event.touches[0].clientX : event.clientX;
        const deltaX = newPointerX - this.currentPointerX;
        this.currentPointerX = newPointerX;

        this.targetRotation += deltaX / this.config.PIXELS_PER_DEGREE_ROTATION;
        const hueDelta = deltaX / this.config.PIXELS_PER_DEGREE_HUE;

        if (this.gsapTween) this.gsapTween.kill();
        this.gsapTween = this.gsap.to(this, {
            rotation: this.targetRotation,
            duration: this.config.GSAP_TWEEN_DURATION,
            ease: this.config.GSAP_TWEEN_EASE,
            onUpdate: () => {
                this._draw();
                const currentHue = this.appState.getDialState(this.dialId).hue + hueDelta * this.gsapTween.progress();
                this.appState.updateDialState(this.dialId, { rotation: this.rotation, hue: currentHue });
                if (this.dialId === 'B') this.appState.setTrueLensPower((this.appState.getDialState('B').hue / 359.999) * 100);
            }
        });
    }

    _handleInteractionEnd() {
        if (!this.isDragging) return;
        this.isDragging = false;
        this.containerElement.classList.remove('is-dragging');
        this.appState.updateDialState(this.dialId, { isDragging: false });
        if (this.dialId === 'B') {
            this.appState.setDialBInteractionState('settling');
            setTimeout(() => { if (!this.isDragging) this.appState.setDialBInteractionState('idle'); }, 200);
        }
    }

    forceRedraw() {
        if (this.debug) console.log(`[DialController ${this.dialId}] forceRedraw() called.`);
        this.svgWidth = this.svg.getBoundingClientRect().width;
        this._updateAndCacheThemeStyles();
        this._draw();
    }

    _updateAndCacheThemeStyles() {
        const style = getComputedStyle(this.containerElement);

        // *** DEFINITIVE FIX EXPLANATION ***
        // The regression was caused by using `calc()` in the CSS for chroma, e.g.,
        // `--dial-ridge-c: calc(var(--dynamic-env-chroma) / 2);`
        // The JavaScript `parseFloat()` function CANNOT parse the string "calc(...)".
        // It returns NaN, which poisons the color calculation and makes the dials render black.
        // The CORRECT and ROBUST approach is to have CSS provide a clean, base numeric
        // value, parse it in JS, and then perform any mathematical modifications.
        const baseChroma = parseFloat(style.getPropertyValue('--dial-ridge-c'));
        const modifiedChroma = baseChroma * this.config.CHROMA_MODIFICATION_FACTOR;

        this.themeVars = {
            ridgeL: parseFloat(style.getPropertyValue('--dial-ridge-l')),
            ridgeC: modifiedChroma, // Use the modified value
            ridgeH: parseFloat(style.getPropertyValue('--dial-ridge-h')),
            ridgeHighlightL: parseFloat(style.getPropertyValue('--dial-ridge-highlight-l')),
            highlightExponent: parseFloat(style.getPropertyValue('--dial-highlight-exponent')),
        };

        if (this.debug) {
            console.log(`[DialController ${this.dialId}] Reading styles for theme: ${document.body.className}`);
            console.table({ ...this.themeVars, baseChroma }); // Log both for clarity
            if (isNaN(this.themeVars.ridgeL) || isNaN(this.themeVars.ridgeHighlightL)) {
                console.error(`[DialController ${this.dialId}] CRITICAL FAILURE: A parsed style value is NaN. This will cause rendering to fail. Check CSS variables for the current theme.`);
            }
        }
    }
    
    _draw() {
        if (!this.svgWidth || this.ridgeElements.length === 0 || isNaN(this.themeVars.ridgeL)) return;

        const rotationRadians = this.rotation * (Math.PI / 180);
        const angleStep = (2 * Math.PI) / this.config.NUM_RIDGES;
        const radius = this.svgWidth / 2;
        const baseRidgeWidth = (this.svgWidth / this.config.NUM_RIDGES) * this.config.RIDGE_WIDTH_FACTOR;
        
        const ridgesToDraw = [];

        for (let i = 0; i < this.config.NUM_RIDGES; i++) {
            const ridgeAngle = i * angleStep + rotationRadians;
            const cosAngle = Math.cos(ridgeAngle);
            if (cosAngle > 0.01) {
                const sinAngle = Math.sin(ridgeAngle);
                const perspectiveWidth = baseRidgeWidth * cosAngle;
                const x = radius + sinAngle * radius - perspectiveWidth / 2;
                const lightIncidence = Math.cos(ridgeAngle - this.lightAngleRad);
                const highlightFactor = Math.pow(Math.max(0, lightIncidence), this.themeVars.highlightExponent || 10);
                ridgesToDraw.push({ element: this.ridgeElements[i], x, width: perspectiveWidth, zIndex: cosAngle, highlightFactor });
                this.ridgeElements[i].style.display = 'block';
            } else {
                this.ridgeElements[i].style.display = 'none';
            }
        }
        
        ridgesToDraw.sort((a, b) => a.zIndex - b.zIndex);

        ridgesToDraw.forEach(ridge => {
            ridge.element.setAttribute('x', ridge.x.toFixed(2));
            ridge.element.setAttribute('width', ridge.width.toFixed(2));
            const currentL = this.gsap.utils.interpolate(this.themeVars.ridgeL, this.themeVars.ridgeHighlightL, ridge.highlightFactor);
            const ridgeColor = `oklch(${currentL} ${this.themeVars.ridgeC} ${this.themeVars.ridgeH})`;
            ridge.element.setAttribute('fill', ridgeColor);
            this.ridgesGroup.appendChild(ridge.element);
        });
    }

    destroy() {
        this.unsubscribers.forEach(unsub => unsub());
        this.unsubscribers = [];
        if (this.gsapTween) this.gsapTween.kill();
        
        this.containerElement.removeEventListener('mousedown', this.boundInteractionStart);
        this.containerElement.removeEventListener('touchstart', this.boundInteractionStart);
        window.removeEventListener('mousemove', this.boundInteractionMove);
        window.removeEventListener('touchmove', this.boundInteractionMove);
        window.removeEventListener('mouseup', this.boundInteractionEnd);
        window.removeEventListener('touchend', this.boundInteractionEnd);
        window.removeEventListener('mouseleave', this.boundInteractionEnd);
        window.removeEventListener('resize', this.boundOnResize);
    }
}

export default DialController;