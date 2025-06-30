// src/js/DisruptionManager.js
import { serviceLocator } from './serviceLocator.js';
import * as appState from './appState.js';
import { DISRUPTION_PARAMS } from './config/index.js';

class DisruptionManager {
    constructor() {
        this.gsap = null;
        this.dom = null;
        this.isDisrupting = false;
        this.unsubscribers = [];
        this.allLcdParents = []; // Parent elements containing an LCD and its overlays
        this.disruptionOverlays = [];
        this.lcdContentWrappers = [];

        // For rAF timer
        this.animationFrameId = null;
        this.lastTick = 0;
        this.nextInterval = 0;
        
        // FIX: Proxy object for GSAP to tween, representing effect strength from 0 to 1
        this.caProxy = { strength: 0.0 };
    }

    init() {
        this.gsap = serviceLocator.get('gsap');
        this.dom = serviceLocator.get('domElements');
        
        // FIX: The terminal's parent is now correctly identified as dom.terminalContainer
        this.allLcdParents = [this.dom.terminalContainer, this.dom.lcdA, this.dom.lcdB].filter(Boolean);
        
        this.disruptionOverlays = this.allLcdParents.map(parent => parent.querySelector('.disruption-overlay')).filter(Boolean);
        this.lcdContentWrappers = this.allLcdParents.map(parent => parent.querySelector('.lcd-content-wrapper')).filter(Boolean);

        this._subscribeToTriggers();
        this._setupIntersectionObserver();
    }

    _subscribeToTriggers() {
        const themeUnsub = appState.subscribe('themeChanged', () => this.triggerDisruption());
        const shutdownUnsub = appState.subscribe('resistiveShutdownStageChanged', () => this.triggerDisruption());
        this.unsubscribers.push(themeUnsub, shutdownUnsub);

        this._startPeriodicTrigger();
    }

    _startPeriodicTrigger() {
        if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
        
        const baseInterval = DISRUPTION_PARAMS.PERIODIC_TRIGGER_INTERVAL_S * 1000;
        this.nextInterval = baseInterval + (Math.random() - 0.5) * (baseInterval * 0.5);
        this.lastTick = performance.now();

        const tick = (now) => {
            const delta = now - this.lastTick;
            if (delta >= this.nextInterval) {
                if (appState.getAppStatus() === 'interactive' && !this.isDisrupting) {
                    this.triggerDisruption();
                }
                this.lastTick = now;
                this.nextInterval = baseInterval + (Math.random() - 0.5) * (baseInterval * 0.5);
            }
            this.animationFrameId = requestAnimationFrame(tick);
        };
        
        this.animationFrameId = requestAnimationFrame(tick);
    }

    _setupIntersectionObserver() {
        const observer = new IntersectionObserver((entries) => {
            const isVisible = entries.some(entry => entry.isIntersecting);
            this.allLcdParents.forEach(parent => parent.classList.toggle('effects-paused', !isVisible));
        }, { threshold: 0.1 });
        
        if (this.dom.appWrapper) {
            observer.observe(this.dom.appWrapper);
        }
    }

    triggerDisruption() {
        const status = appState.getAppStatus();
        if (this.isDisrupting || (status !== 'interactive' && status !== 'starting-up')) return;
        this.isDisrupting = true;
        
        // FIX: Filter targets to only animate those that are currently visible.
        const activeLcds = this.allLcdParents.filter(parent => !parent.classList.contains('lcd--unlit'));
        const activeOverlays = activeLcds.map(parent => parent.querySelector('.disruption-overlay')).filter(Boolean);
        const activeContentWrappers = activeLcds.map(parent => parent.querySelector('.lcd-content-wrapper')).filter(Boolean);
        
        if (activeLcds.length === 0) {
            this.isDisrupting = false;
            return; // No visible LCDs to disrupt
        }

        const D_PARAMS = { ...DISRUPTION_PARAMS };
        const halfDuration = D_PARAMS.DURATION_S / 2;
        const rootEl = document.documentElement;
        
        // Ensure the proxy starts at 0
        this.caProxy.strength = 0.0;
        
        const tl = this.gsap.timeline({
            onStart: () => {
                activeContentWrappers.forEach(el => el.classList.add('is-disrupting'));
            },
            onComplete: () => {
                this.isDisrupting = false;
                activeContentWrappers.forEach(el => el.classList.remove('is-disrupting'));
                // Return to default state by setting the final offset to 0
                this.gsap.set(rootEl, { '--_ca-current-offset': '0px' });
            }
        });

        // FIX: Use the new configurable keyframe array from the config file.
        tl.to(activeOverlays, {
            keyframes: D_PARAMS.FLICKER_KEYFRAMES,
            ease: 'none'
        }, 0);

        // --- Chromatic Aberration Spread ---
        // We tween a JS proxy object, and on each update, we calculate the final
        // pixel value and set it to a CSS variable. This avoids calc() in CSS.
        const peakOffsetRem = 0.5; // 0.5rem for red, -0.5rem for blue = 1rem total separation
        const peakOffsetPx = peakOffsetRem * 16; 

        tl.to(this.caProxy, { 
            strength: 1.0, // from 0 to 1
            duration: halfDuration, 
            ease: 'power2.in',
            onUpdate: () => {
                const currentOffset = (peakOffsetPx * this.caProxy.strength).toFixed(2);
                rootEl.style.setProperty('--_ca-current-offset', `${currentOffset}px`);
            }
        }, 0)
          .to(this.caProxy, { 
            strength: 0.0, // from 1 to 0
            duration: halfDuration, 
            ease: 'power2.out',
            onUpdate: () => {
                const currentOffset = (peakOffsetPx * this.caProxy.strength).toFixed(2);
                rootEl.style.setProperty('--_ca-current-offset', `${currentOffset}px`);
            }
        }, halfDuration);
    }

    destroy() {
        this.unsubscribers.forEach(unsub => unsub());
        if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
    }
}

const disruptionManagerInstance = new DisruptionManager();
export default disruptionManagerInstance;