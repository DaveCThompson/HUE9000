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
        
        // Proxy object for GSAP to tween
        this.caProxy = { factor: 1.0 };
    }

    init() {
        this.gsap = serviceLocator.get('gsap');
        this.dom = serviceLocator.get('domElements');
        
        const terminalParent = this.dom.terminalContainer?.closest('.actual-lcd-screen-element');
        this.allLcdParents = [terminalParent, this.dom.lcdA, this.dom.lcdB].filter(Boolean);
        
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
    
    _applyCaEffect(factor) {
        const offset = DISRUPTION_PARAMS.CHROMA_OFFSET_PEAK_PX * (factor - 1);
        
        const textShadowString = `${offset.toFixed(2)}px 0 0 oklch(80% 0.15 40 / 0.9), ${-offset.toFixed(2)}px 0 0 oklch(80% 0.15 250 / 0.9)`;
        const boxShadowString = `${offset.toFixed(2)}px 0 0 oklch(80% 0.15 40 / 0.9), ${-offset.toFixed(2)}px 0 0 oklch(80% 0.15 250 / 0.9)`;

        this.lcdContentWrappers.forEach(el => {
            el.style.textShadow = textShadowString;
        });
        
        const litBlocks = document.querySelectorAll('.major-block--on, .major-block--in-progress, .intensity-bar--selected, .fine-dot--on');
        litBlocks.forEach(el => {
            el.style.boxShadow = boxShadowString;
        });
    }

    triggerDisruption() {
        if (this.isDisrupting || appState.getAppStatus() !== 'interactive') return;
        this.isDisrupting = true;
        
        const D_PARAMS = { ...DISRUPTION_PARAMS };
        const halfDuration = D_PARAMS.DURATION_S / 2;
        
        this.caProxy.factor = 1.0;
        
        const tl = this.gsap.timeline({
            onStart: () => {
                this.lcdContentWrappers.forEach(el => el.classList.add('is-disrupting'));
            },
            onComplete: () => {
                this.isDisrupting = false;
                this.lcdContentWrappers.forEach(el => {
                    el.classList.remove('is-disrupting');
                    el.style.textShadow = ''; // Clear inline style
                });
                 const litBlocks = document.querySelectorAll('.major-block--on, .major-block--in-progress, .intensity-bar--selected, .fine-dot--on');
                litBlocks.forEach(el => {
                    el.style.boxShadow = ''; // Clear inline style
                });
            }
        });

        // --- Fast background flicker ---
        tl.to(this.disruptionOverlays, {
            keyframes: [
                { opacity: 0.25, duration: 0.03 },
                { opacity: 0.05, duration: 0.03 },
                { opacity: 0.30, duration: 0.02 },
                { opacity: 0.02, duration: 0.05 },
                { opacity: 0.22, duration: 0.03 },
                { opacity: 0.0, duration: 0.25 }
            ],
            ease: 'steps(1)'
        }, 0);


        // --- Chromatic Aberration Spread ---
        tl.to(this.caProxy, { 
            factor: 10, // Multiplier for the peak offset
            duration: halfDuration, 
            ease: 'power2.in',
            onUpdate: () => this._applyCaEffect(this.caProxy.factor)
        }, 0)
          .to(this.caProxy, { 
            factor: 1, 
            duration: halfDuration, 
            ease: 'power2.out',
            onUpdate: () => this._applyCaEffect(this.caProxy.factor)
        }, halfDuration);
    }

    destroy() {
        this.unsubscribers.forEach(unsub => unsub());
        if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
    }
}

const disruptionManagerInstance = new DisruptionManager();
export default disruptionManagerInstance;