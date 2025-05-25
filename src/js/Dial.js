/**
 * @module Dial
 * @description Represents a single rotary dial component, managing its state,
 * user interaction (drag), canvas rendering, and style updates.
 * It reflects dial state from appState.js and proposes changes to appState.js
 * based on user interaction.
 */
// GSAP is accessed via window.gsap, which is populated by main.js import

class Dial {
    /**
     * @param {HTMLElement} containerElement - The main div container for the dial.
     * @param {string} dialId - 'A' or 'B'.
     * @param {object} appStateService - Reference to the appState module.
     * @param {object} configModuleParam - Reference to the config.js module (namespace object).
     * @param {object} gsapService - Reference to GSAP (passed from main.js).
     */
    constructor(containerElement, dialId, appStateService, configModuleParam, gsapService) { 
        this.containerElement = containerElement;
        this.dialId = dialId;
        this.appState = appStateService;
        this.configModule = configModuleParam; // Store the namespace object as this.configModule
        this.gsap = gsapService; // Use passed GSAP instance

        this.canvas = this.containerElement.querySelector(`#dial-canvas-${this.dialId}`);
        if (!this.canvas) {
            console.error(`[Dial ${this.dialId} CONSTRUCTOR] Canvas element not found!`);
            return;
        }
        this.ctx = this.canvas.getContext('2d');
        if (!this.ctx) {
            console.error(`[Dial ${this.dialId} CONSTRUCTOR] Failed to get 2D context!`);
            return;
        }

        this.computedStyleVars = {};
        this.isDragging = false;
        this.currentPointerX = 0;
        this.gsapValueTween = null;
        this.isActiveDim = false; 
        this.dialBSettleTimer = null;
        // REMOVED: this.drawCallQueued = false; 

        this.unsubscribers = []; 

        this._updateAndCacheComputedStyles();

        let initialState = this.appState.getDialState(this.dialId);
        if (!initialState || Object.keys(initialState).length === 0) {
            const initialHue = (this.dialId === 'B') ? 0.0 : this.configModule.DEFAULT_DIAL_A_HUE;
            const initialRotation = (this.dialId === 'B') ? initialHue * this.configModule.DIAL_B_VISUAL_ROTATION_PER_HUE_DEGREE_CONFIG : 0;
            initialState = {
                id: this.dialId, hue: initialHue, rotation: initialRotation,
                targetHue: initialHue, targetRotation: initialRotation, isDragging: false
            };
            this.appState.updateDialState(this.dialId, initialState);
        }
        
        console.log(`[Dial ${this.dialId} CONSTRUCTOR] Before initial resizeCanvas/draw. Current phase from appState: ${this.appState.getCurrentStartupPhaseNumber()}, isActiveDim: ${this.isActiveDim}`);
        this.resizeCanvas(true); 
        this._addDragListeners();
        this._subscribeToAppStateEvents();
    }

    _subscribeToAppStateEvents() {
        this.unsubscribers.push(this.appState.subscribe('dialUpdated', this._onAppStateDialUpdate.bind(this)));
        this.unsubscribers.push(this.appState.subscribe('themeChanged', this._onThemeChange.bind(this)));
        this.unsubscribers.push(this.appState.subscribe('appStatusChanged', this._onAppStatusChange.bind(this)));
        this.unsubscribers.push(this.appState.subscribe('startupPhaseNumberChanged', this._onStartupPhaseChange.bind(this)));
    }

    _onStartupPhaseChange(newPhaseNumber) {
        this._draw(); 
    }

    resizeCanvas(forceDraw = false) {
        if (!this.canvas || !this.ctx) return false;
        const dpr = window.devicePixelRatio || 1;
        const cssWidth = this.canvas.offsetWidth;
        const cssHeight = this.canvas.offsetHeight;

        if (cssWidth === 0 || cssHeight === 0) return false; 

        const canvasWidth = Math.round(cssWidth * dpr);
        const canvasHeight = Math.round(cssHeight * dpr);

        let resized = false;
        if (this.canvas.width !== canvasWidth || this.canvas.height !== canvasHeight) {
            this.canvas.width = canvasWidth;
            this.canvas.height = canvasHeight;
            resized = true;
        }

        if (resized || forceDraw) {
            this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0); 
            this._draw();
        }
        return resized;
    }

    setActiveDimState(isActive) {
        if (this.isActiveDim !== isActive) {
            this.isActiveDim = isActive;
            if (document.body.classList.contains('theme-dim')) {
                this.containerElement.classList.toggle('js-active-dim-dial', isActive);
            } else {
                this.containerElement.classList.remove('js-active-dim-dial');
            }
            this._updateAndCacheComputedStyles(); 
            this._draw(); 
        }
    }

    _handleInteractionStart(event) {
        if (this.appState.getAppStatus() !== 'interactive' || this.isDragging) {
            return;
        }
        if (event.type === 'touchstart' && event.cancelable) event.preventDefault();

        this.isDragging = true;
        if (this.gsapValueTween) this.gsapValueTween.kill();
        this.gsapValueTween = null;
        this.currentPointerX = (event.touches ? event.touches[0].clientX : event.clientX);

        const currentState = this.appState.getDialState(this.dialId);
        
        this.appState.updateDialState(this.dialId, {
            isDragging: true,
            targetHue: currentState.hue, 
            targetRotation: currentState.rotation
        });

        if (this.dialId === 'B') {
            if (this.dialBSettleTimer) clearTimeout(this.dialBSettleTimer);
            this.appState.setDialBInteractionState('dragging');
        }
        this.containerElement.style.cursor = 'grabbing';
        document.body.style.cursor = 'grabbing';
    }

    _handleInteractionMove(event) {
        if (!this.isDragging || this.appState.getAppStatus() !== 'interactive') return;
        if (event.type === 'touchmove' && event.cancelable) event.preventDefault();

        let newPointerX = event.touches ? event.touches[0].clientX : event.clientX;
        const deltaX = newPointerX - this.currentPointerX;
        const currentState = this.appState.getDialState(this.dialId); 

        let newTargetHue = currentState.targetHue + (deltaX / this.configModule.PIXELS_PER_DEGREE_HUE);
        const newTargetRotation = currentState.targetRotation + (deltaX / this.configModule.PIXELS_PER_DEGREE_ROTATION);

        if (this.dialId === 'B') {
            newTargetHue = Math.max(0, Math.min(newTargetHue, 359.999));
        }
        this.currentPointerX = newPointerX;

        if (this.gsapValueTween) this.gsapValueTween.kill();

        const animationProxy = { hue: currentState.hue, rotation: currentState.rotation };
        this.gsapValueTween = this.gsap.to(animationProxy, { 
            rotation: newTargetRotation,
            hue: newTargetHue,
            duration: this.configModule.GSAP_TWEEN_DURATION, 
            ease: this.configModule.GSAP_TWEEN_EASE,       
            overwrite: "auto",
            onUpdate: () => {
                if (!this.isDragging && this.gsapValueTween) { 
                    this.gsapValueTween.kill();
                    this.gsapValueTween = null;
                    return;
                }
                this.appState.updateDialState(this.dialId, {
                    hue: animationProxy.hue,
                    rotation: animationProxy.rotation,
                    targetHue: newTargetHue, 
                    targetRotation: newTargetRotation 
                });
                if (this.dialId === 'B') {
                    this.appState.setTrueLensPower((animationProxy.hue / 359.999) * 100);
                }
                // REVERTED: Call _draw() directly
                this._draw();
            },
            onComplete: () => { this.gsapValueTween = null; }
        });
    }

    _handleInteractionEnd(event) {
        if (!this.isDragging) {
            if (document.body.style.cursor === 'grabbing') document.body.style.cursor = 'default';
            return;
        }
        
        const endedDialId = this.dialId; 
        this.isDragging = false; 
        
        const finalState = this.appState.getDialState(endedDialId); 

        this.appState.updateDialState(endedDialId, { 
            isDragging: false,
        });

        if (this.gsapValueTween && this.gsapValueTween.isActive()) {
            this.gsapValueTween.kill(); 
            this.gsapValueTween = null;
            this.appState.updateDialState(endedDialId, { 
                hue: finalState.targetHue, 
                rotation: finalState.targetRotation 
            });
            if (endedDialId === 'B') this.appState.setTrueLensPower((finalState.targetHue / 359.999) * 100);

        } else if (Math.abs(finalState.hue - finalState.targetHue) > 0.01 || Math.abs(finalState.rotation - finalState.targetRotation) > 0.01) {
            this.appState.updateDialState(endedDialId, { 
                hue: finalState.targetHue, 
                rotation: finalState.targetRotation 
            });
            if (endedDialId === 'B') this.appState.setTrueLensPower((finalState.targetHue / 359.999) * 100);
        }


        if (endedDialId === 'B') {
            this.appState.setDialBInteractionState('settling');
            if (this.dialBSettleTimer) clearTimeout(this.dialBSettleTimer);
            this.dialBSettleTimer = setTimeout(() => {
                this.appState.setDialBInteractionState('idle');
                this.dialBSettleTimer = null;
            }, this.configModule.LENS_OSCILLATION_RESTART_DELAY);
        }

        this.containerElement.style.cursor = 'grab';
        document.body.style.cursor = 'default';
    }

    _addDragListeners() {
        this.boundHandleInteractionStart = this._handleInteractionStart.bind(this);
        this.boundHandleInteractionMove = this._handleInteractionMove.bind(this);
        this.boundHandleInteractionEnd = this._handleInteractionEnd.bind(this);

        this.containerElement.addEventListener('mousedown', this.boundHandleInteractionStart);
        this.containerElement.addEventListener('touchstart', this.boundHandleInteractionStart, { passive: false });

        window.addEventListener('mousemove', this.boundHandleInteractionMove);
        window.addEventListener('touchmove', this.boundHandleInteractionMove, { passive: false });
        window.addEventListener('mouseup', this.boundHandleInteractionEnd);
        window.addEventListener('touchend', this.boundHandleInteractionEnd);
        window.addEventListener('mouseleave', this.boundHandleInteractionEnd); 
        window.addEventListener('touchcancel', this.boundHandleInteractionEnd);
    }

    _removeDragListeners() {
        this.containerElement.removeEventListener('mousedown', this.boundHandleInteractionStart);
        this.containerElement.removeEventListener('touchstart', this.boundHandleInteractionStart);

        window.removeEventListener('mousemove', this.boundHandleInteractionMove);
        window.removeEventListener('touchmove', this.boundHandleInteractionMove);
        window.removeEventListener('mouseup', this.boundHandleInteractionEnd);
        window.removeEventListener('touchend', this.boundHandleInteractionEnd);
        window.removeEventListener('mouseleave', this.boundHandleInteractionEnd);
        window.removeEventListener('touchcancel', this.boundHandleInteractionEnd);
    }

    _updateAndCacheComputedStyles() {
        if (!this.ctx) return; 
        const rootStyle = getComputedStyle(document.documentElement);
        const isDimTheme = document.body.classList.contains('theme-dim');
        const useDimActiveStyles = isDimTheme && this.isActiveDim;

        if (useDimActiveStyles) {
            this.computedStyleVars = {
                faceBgL: rootStyle.getPropertyValue('--dial-dim-active-face-bg-l').trim() || '0.12',
                faceBgC: rootStyle.getPropertyValue('--dial-dim-active-face-bg-c').trim() || '0.003',
                faceBgH: rootStyle.getPropertyValue('--dial-dim-active-face-bg-h').trim() || '240',
                ridgeL: rootStyle.getPropertyValue('--dial-dim-active-ridge-l').trim() || '0.25',
                ridgeC: rootStyle.getPropertyValue('--dial-dim-active-ridge-c').trim() || rootStyle.getPropertyValue('--dial-dim-active-face-bg-c').trim() || '0.003',
                ridgeH: rootStyle.getPropertyValue('--dial-dim-active-ridge-h').trim() || rootStyle.getPropertyValue('--dial-dim-active-face-bg-h').trim() || '240',
                ridgeHighlightL: rootStyle.getPropertyValue('--dial-dim-active-ridge-highlight-l').trim() || '0.60',
                ridgeHighlightA: rootStyle.getPropertyValue('--dial-dim-active-ridge-highlight-a').trim() || '0.4',
                shadingStart: rootStyle.getPropertyValue('--dial-dim-active-shading-start-color').trim() || 'oklch(0% 0 0 / 0.1)',
                shadingEnd: rootStyle.getPropertyValue('--dial-dim-active-shading-end-color').trim() || 'oklch(0% 0 0 / 0.15)'
            };
        } else if (isDimTheme && !this.isActiveDim) { 
            this.computedStyleVars = {
                faceBgL: rootStyle.getPropertyValue('--dial-face-bg-l').trim() || '0.01', 
                faceBgC: rootStyle.getPropertyValue('--dial-face-bg-c').trim() || '0',
                faceBgH: rootStyle.getPropertyValue('--dial-face-bg-h').trim() || '0',
                ridgeL: rootStyle.getPropertyValue('--dial-ridge-l').trim() || '0.01', 
                ridgeC: rootStyle.getPropertyValue('--dial-ridge-c').trim() || '0',
                ridgeH: rootStyle.getPropertyValue('--dial-ridge-h').trim() || '0',
                ridgeHighlightL: "0", ridgeHighlightA: "0", 
                shadingStart: "oklch(0 0 0 / 0)", shadingEnd: "oklch(0 0 0 / 0)" 
            };
        } else { 
            this.computedStyleVars = {
                faceBgL: rootStyle.getPropertyValue('--dial-face-bg-l').trim() || '0.20',
                faceBgC: rootStyle.getPropertyValue('--dial-face-bg-c').trim() || '0.005',
                faceBgH: rootStyle.getPropertyValue('--dial-face-bg-h').trim() || '240',
                ridgeL: rootStyle.getPropertyValue('--dial-ridge-l').trim() || '0.45',
                ridgeC: rootStyle.getPropertyValue('--dial-ridge-c').trim() || rootStyle.getPropertyValue('--dial-face-bg-c').trim() || '0.005',
                ridgeH: rootStyle.getPropertyValue('--dial-ridge-h').trim() || rootStyle.getPropertyValue('--dial-face-bg-h').trim() || '240',
                ridgeHighlightL: rootStyle.getPropertyValue('--dial-ridge-highlight-l').trim() || '0.95',
                ridgeHighlightA: rootStyle.getPropertyValue('--dial-ridge-highlight-a').trim() || '0.85',
                shadingStart: rootStyle.getPropertyValue('--dial-shading-start-color').trim() || 'oklch(0% 0 0 / 0.35)',
                shadingEnd: rootStyle.getPropertyValue('--dial-shading-end-color').trim() || 'oklch(0% 0 0 / 0.4)'
            };
        }
    }

    _draw() {
        if (!this.ctx || !this.canvas || !this.configModule) return; 
        
        if (!this.computedStyleVars.faceBgL) {
            this._updateAndCacheComputedStyles();
            if (!this.computedStyleVars.faceBgL) { 
                console.error(`[Dial ${this.dialId} _draw] computedStyleVars.faceBgL still undefined after update. Bailing draw.`);
                return;
            }
        }

        const dialState = this.appState.getDialState(this.dialId);
        if (!dialState) return; 

        const { rotation } = dialState;
        const logicalWidth = this.canvas.width / (window.devicePixelRatio || 1);
        const logicalHeight = this.canvas.height / (window.devicePixelRatio || 1);

        if (logicalWidth === 0 || logicalHeight === 0) return;

        this.ctx.clearRect(0, 0, logicalWidth, logicalHeight); 

        const appStatus = this.appState.getAppStatus();
        const currentPhaseNum = this.appState.getCurrentStartupPhaseNumber();
        const isDimTheme = document.body.classList.contains('theme-dim');
        const isDuringThemeTransition = document.body.classList.contains('is-transitioning-from-dim');

        const isEarlyStartupUnlitState = isDimTheme && 
                                         !this.isActiveDim && 
                                         appStatus === 'starting-up' && 
                                         (currentPhaseNum === -1 || (currentPhaseNum >= 0 && currentPhaseNum < 6));

        if (isEarlyStartupUnlitState) {
            this.ctx.fillStyle = 'oklch(0 0 0)'; 
        } else {
            this.ctx.fillStyle = `oklch(${this.computedStyleVars.faceBgL} ${this.computedStyleVars.faceBgC} ${this.computedStyleVars.faceBgH})`;
        }
        this.ctx.fillRect(0, 0, logicalWidth, logicalHeight);


        let drawDetailedContent;
        if (isDimTheme && !isDuringThemeTransition) {
            drawDetailedContent = this.isActiveDim; 
        } else { 
            drawDetailedContent = this.isActiveDim || appStatus === 'interactive';
        }
        
        if (isEarlyStartupUnlitState) { 
            drawDetailedContent = false;
        }

        if (drawDetailedContent) {
            const angleStep = (2 * Math.PI) / this.configModule.NUM_RIDGES;
            const lightAngle = -Math.PI / 4; 
            const rotationRadians = rotation * Math.PI / 180;
            const scaleFactor = this.configModule.DIAL_GRADIENT_SCALE_FACTOR;

            for (let i = 0; i < this.configModule.NUM_RIDGES; i++) {
                const ridgeAngle = i * angleStep + rotationRadians;
                const cosAngle = Math.cos(ridgeAngle); 
                const sinAngle = Math.sin(ridgeAngle); 

                if (cosAngle > 0.03) { 
                    const fullPerspectiveWidth = (logicalWidth / this.configModule.NUM_RIDGES) * this.configModule.RIDGE_WIDTH_FACTOR * cosAngle;
                    const scaledPerspectiveWidth = fullPerspectiveWidth * scaleFactor;
                    const bgGap = (fullPerspectiveWidth - scaledPerspectiveWidth) / 2; 
                    const ridgeCenterX = logicalWidth / 2 + (sinAngle * logicalWidth / 2); 
                    const ridgeStartX = ridgeCenterX - fullPerspectiveWidth / 2;
                    const coloredPartStartX = ridgeStartX + bgGap;

                    this.ctx.fillStyle = `oklch(${this.computedStyleVars.ridgeL} ${this.computedStyleVars.ridgeC} ${this.computedStyleVars.ridgeH})`;
                    this.ctx.fillRect(coloredPartStartX, 0, scaledPerspectiveWidth, logicalHeight);

                    if (parseFloat(this.computedStyleVars.ridgeHighlightA) > 0) {
                        const lightIncidence = Math.max(0, Math.cos(ridgeAngle - lightAngle)); 
                        const highlightIntensity = Math.pow(lightIncidence, 10) * Math.pow(cosAngle, 1.5); 

                        if (highlightIntensity > 0.05) { 
                            const finalAlpha = Math.min(1.0, parseFloat(this.computedStyleVars.ridgeHighlightA) * highlightIntensity * 1.5);
                            this.ctx.fillStyle = `oklch(${this.computedStyleVars.ridgeHighlightL} ${this.computedStyleVars.ridgeC} ${this.computedStyleVars.ridgeH} / ${finalAlpha.toFixed(3)})`;
                            const hlx = coloredPartStartX + scaledPerspectiveWidth * 0.1; 
                            const hlw = scaledPerspectiveWidth * this.configModule.HIGHLIGHT_WIDTH_FACTOR;
                            this.ctx.fillRect(hlx, 0, hlw, logicalHeight);
                        }
                    }
                }
            }
            if (this.computedStyleVars.shadingStart !== "oklch(0 0 0 / 0)") {
                const gradient = this.ctx.createLinearGradient(0, 0, 0, logicalHeight);
                gradient.addColorStop(0, this.computedStyleVars.shadingStart);
                gradient.addColorStop(0.2, 'oklch(0 0 0 / 0)'); 
                gradient.addColorStop(0.8, 'oklch(0 0 0 / 0)'); 
                gradient.addColorStop(1, this.computedStyleVars.shadingEnd);
                this.ctx.fillStyle = gradient;
                this.ctx.fillRect(0, 0, logicalWidth, logicalHeight);
            }
        }
    }

    _onAppStateDialUpdate(payload) {
        if (payload && payload.id === this.dialId) {
            if (!this.isDragging) { // Only draw if not currently being dragged (GSAP onUpdate handles draw during drag)
                this._draw();
            }
        }
    }

    _onThemeChange() {
        this._updateAndCacheComputedStyles();
        requestAnimationFrame(() => { 
            const dpr = window.devicePixelRatio || 1;
            if (this.ctx) this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            this._draw();
        });
    }

    _onAppStatusChange(newStatus) {
        this._updateAndCacheComputedStyles(); 
        this._draw(); 
    }

    destroy() {
        this._removeDragListeners();
        this.unsubscribers.forEach(unsub => unsub());
        this.unsubscribers = [];
        if (this.gsapValueTween) this.gsapValueTween.kill();
        if (this.dialBSettleTimer) clearTimeout(this.dialBSettleTimer);
    }
}

export default Dial;