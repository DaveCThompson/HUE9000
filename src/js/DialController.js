/**
 * @module DialController
 * @description Represents a single rotary dial component, managing its state
 * and user interaction. It dynamically recalculates and updates SVG ridge attributes
 * on each frame to create a 3D perspective rotation effect.
 */
import { serviceLocator } from './serviceLocator.js';
import { throttle } from './utils.js';

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
            NUM_RIDGES: 66, // Reduced from 100 for a chunkier look
            RIDGE_WIDTH_FACTOR: 1.6,
            PIXELS_PER_DEGREE_ROTATION: 1.3,
            PIXELS_PER_DEGREE_HUE: 0.64, // Increased again from 0.32 to further slow value changes
            SHADOW_OFFSET_MULTIPLIER: 8,
            THROTTLE_LIMIT_MS: 50, // Update appState at most every 50ms (20fps)
        };

        // Local component state for smooth dragging
        this.isDragging = false;
        this.rotation = this.appState.getDialState(this.dialId).rotation || 0;
        this.hue = this.appState.getDialState(this.dialId).hue || 0;
        this.targetRotation = this.rotation;
        this.currentPointerX = 0;
        
        this.gsapTween = null;
        this.ridgeElements = [];
        this.lightAngleRad = 0; // Light from top
        this.unsubscribers = [];
        this.themeVars = {};
        this.debug = false;

        // Throttled function for real-time but performant app state updates
        this.throttledUpdateAppState = throttle(this._updateAppState.bind(this), this.config.THROTTLE_LIMIT_MS);

        this._createRidges();
        this._addDragListeners();
        this._subscribeToAppStateEvents();
        this.forceRedraw(); // Initial draw
    }

    _subscribeToAppStateEvents() {
        const dialUpdateUnsub = this.appState.subscribe('dialUpdated', payload => {
            if (payload && payload.id === this.dialId && !this.isDragging) {
                if (this.gsapTween) this.gsapTween.kill();
                
                const targetState = payload.state;
                this.targetRotation = targetState.rotation;

                this.gsapTween = this.gsap.to(this, {
                    rotation: targetState.rotation,
                    hue: targetState.hue,
                    duration: 0.5,
                    ease: 'power2.out',
                    onUpdate: () => this._draw()
                });
            }
        });
        this.unsubscribers.push(dialUpdateUnsub);

        const themeChangeUnsub = this.appState.subscribe('themeChanged', newTheme => {
            if (this.debug) console.log(`[DialController ${this.dialId}] Detected themeChanged to '${newTheme}'. Forcing redraw.`);
            // FIX: Defer redraw to next frame to ensure browser has applied new CSS variables.
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

        const currentState = this.appState.getDialState(this.dialId);
        this.rotation = currentState.rotation;
        this.hue = currentState.hue;
        this.targetRotation = this.rotation;
        
        this.currentPointerX = event.touches ? event.touches[0].clientX : event.clientX;

        if (this.dialId === 'B') this.appState.setDialBInteractionState('dragging');
        // No need to update the main dial state here, the first throttled call will handle it.
    }

    _handleInteractionMove(event) {
        if (!this.isDragging) return;
        event.preventDefault();

        const newPointerX = event.touches ? event.touches[0].clientX : event.clientX;
        const deltaX = newPointerX - this.currentPointerX;
        this.currentPointerX = newPointerX;

        const rotationDelta = deltaX / this.config.PIXELS_PER_DEGREE_ROTATION;
        const hueDelta = deltaX / this.config.PIXELS_PER_DEGREE_HUE;
        
        this.rotation += rotationDelta;
        this.targetRotation = this.rotation;
        
        let newHue = this.hue + hueDelta;
        if (this.dialId === 'A') {
            newHue = ((newHue % 360) + 360) % 360;
        } else {
            newHue = this.gsap.utils.clamp(0, 359.999, newHue);
        }
        this.hue = newHue;

        // Immediately update local visuals for 1:1 feel
        this._draw();
        // Update global state on a throttled interval for performance
        this.throttledUpdateAppState();
    }

    _handleInteractionEnd() {
        if (!this.isDragging) return;
        this.isDragging = false;
        this.containerElement.classList.remove('is-dragging');

        // Perform one final, immediate update to ensure perfect sync
        this._updateAppState();

        if (this.dialId === 'B') {
            this.appState.setDialBInteractionState('settling');
            this.gsap.delayedCall(0.2, () => {
                if (!this.isDragging) this.appState.setDialBInteractionState('idle');
            });
        }
    }
    
    /** A dedicated method for updating global state, to be used by the throttler. */
    _updateAppState() {
        this.appState.updateDialState(this.dialId, {
            isDragging: this.isDragging,
            rotation: this.rotation,
            targetRotation: this.targetRotation,
            hue: this.hue,
            targetHue: this.hue,
        });

        if (this.dialId === 'B') {
            this.appState.setTrueLensPower((this.hue / 359.999) * 100);
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
        // FIX: Add validation to prevent NaN poisoning from getComputedStyle during theme changes.
        const baseChroma = parseFloat(style.getPropertyValue('--dial-ridge-c'));
        const multiplier = parseFloat(style.getPropertyValue('--dial-ridge-chroma-multiplier'));
        const finalChroma = isNaN(baseChroma) || isNaN(multiplier) ? (baseChroma || 0) : baseChroma * multiplier;
        
        this.themeVars = {
            ridgeL: parseFloat(style.getPropertyValue('--dial-ridge-l')),
            ridgeC: finalChroma,
            ridgeH: parseFloat(style.getPropertyValue('--dial-ridge-h')),
            ridgeHighlightL: parseFloat(style.getPropertyValue('--dial-ridge-highlight-l')),
            highlightExponent: parseFloat(style.getPropertyValue('--dial-highlight-exponent')),
        };
    }
    
    _draw() {
        // FIX: Add guard clause to prevent drawing if theme variables are invalid (NaN).
        if (!this.svgWidth || this.ridgeElements.length === 0 || isNaN(this.themeVars.ridgeL)) return;

        const rotationRadians = this.rotation * (Math.PI / 180);
        const angleStep = (2 * Math.PI) / this.config.NUM_RIDGES;
        const radius = this.svgWidth / 2;
        const baseRidgeWidth = (this.svgWidth / this.config.NUM_RIDGES) * this.config.RIDGE_WIDTH_FACTOR;
        
        const shadowOffsetY = Math.sin(rotationRadians) * this.config.SHADOW_OFFSET_MULTIPLIER;
        this.containerElement.style.setProperty('--dial-shadow-offset-y', `${shadowOffsetY}px`);

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