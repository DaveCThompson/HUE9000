// src/js/DisruptionManager.js
import { serviceLocator } from './serviceLocator.js';
import { appState } from './state/index.js';
import { DISRUPTION_PARAMS } from './config/index.js';

class DisruptionManager {
    constructor() {
        this.gsap = null;
        this.dom = null;
        this.isDisrupting = false;
        this.unsubscribers = [];
        this.allLcdParents = [];
        this.disruptionOverlays = [];
        this.lcdContentWrappers = [];
        this.animationFrameId = null;
        this.lastTick = 0;
        this.nextInterval = 0;
        this.caProxy = { strength: 0.0 };
    }

    init() {
        this.gsap = serviceLocator.get('gsap');
        this.dom = serviceLocator.get('domElements');
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
        if (this.dom.appWrapper) observer.observe(this.dom.appWrapper);
    }

    triggerDisruption() {
        const status = appState.getAppStatus();
        if (this.isDisrupting || (status !== 'interactive' && status !== 'starting-up')) return;
        this.isDisrupting = true;
        const activeLcds = this.allLcdParents.filter(parent => !parent.classList.contains('lcd--unlit'));
        const activeOverlays = activeLcds.map(parent => parent.querySelector('.disruption-overlay')).filter(Boolean);
        const activeContentWrappers = activeLcds.map(parent => parent.querySelector('.lcd-content-wrapper')).filter(Boolean);
        if (activeLcds.length === 0) {
            this.isDisrupting = false;
            return;
        }
        const D_PARAMS = { ...DISRUPTION_PARAMS };
        const halfDuration = D_PARAMS.DURATION_S / 2;
        const rootEl = document.documentElement;
        this.caProxy.strength = 0.0;
        const tl = this.gsap.timeline({
            onStart: () => activeContentWrappers.forEach(el => el.classList.add('is-disrupting')),
            onComplete: () => {
                this.isDisrupting = false;
                activeContentWrappers.forEach(el => el.classList.remove('is-disrupting'));
                this.gsap.set(rootEl, { '--_ca-current-offset': '0px' });
            }
        });
        tl.to(activeOverlays, { keyframes: D_PARAMS.FLICKER_KEYFRAMES, ease: 'none' }, 0);
        const peakOffsetPx = 0.5 * 16; 
        tl.to(this.caProxy, { 
            strength: 1.0, duration: halfDuration, ease: 'power2.in',
            onUpdate: () => rootEl.style.setProperty('--_ca-current-offset', `${(peakOffsetPx * this.caProxy.strength).toFixed(2)}px`)
        }, 0)
          .to(this.caProxy, { 
            strength: 0.0, duration: halfDuration, ease: 'power2.out',
            onUpdate: () => rootEl.style.setProperty('--_ca-current-offset', `${(peakOffsetPx * this.caProxy.strength).toFixed(2)}px`)
        }, halfDuration);
    }

    destroy() {
        this.unsubscribers.forEach(unsub => unsub());
        if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
    }
}

const disruptionManagerInstance = new DisruptionManager();
export default disruptionManagerInstance;