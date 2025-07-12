/**
 * @module MobileTerminalManager
 * @description Manages the state and interactions for the mobile terminal drawer.
 */
import { serviceLocator } from './serviceLocator.js';
import * as appState from './appState.js';
import { createMobileInteraction } from './mobileInteraction.js';

export class MobileTerminalManager {
    constructor() {
        this.dom = serviceLocator.get('domElements');
        this.gsap = serviceLocator.get('gsap');
        this.audioManager = serviceLocator.get('audioManager');

        this.isOpen = false;
        this.timeline = this.gsap.timeline({ paused: true });
    }

    init() {
        if (!this.dom.mobileTerminalDrawer) {
            console.log("[MobileTerminalManager] Drawer not found, skipping init.");
            return;
        }

        this._buildAnimation();
        // REMOVED: _setupEventListeners call is now handled by EventBinder.js

        // Subscribe to appState changes
        appState.subscribe('mobileTerminalStateChanged', ({ isOpen }) => this.toggle(isOpen));
        appState.subscribe('unreadTerminalMessagesChanged', ({ hasUnread }) => {
            if (this.dom.mobileTerminalToggle) {
                this.dom.mobileTerminalToggle.classList.toggle('has-notification', hasUnread);
            }
        });
    }

    _buildAnimation() {
        // This timeline now correctly controls the drawer, the main content area, AND the controls overlay
        this.timeline
            .fromTo(this.dom.mobileTerminalDrawer,
                { y: '100%', scale: 0.95, transformOrigin: 'center center' },
                { y: '0%', scale: 1, duration: 0.6, ease: 'cubic-bezier(0.65, 0, 0.35, 1)' },
                0 // Start all animations at time 0
            )
            .fromTo(document.querySelector('.main-content-area'),
                { y: '0%', scale: 1, filter: 'blur(0px) brightness(1)', transformOrigin: 'bottom center' },
                { y: '-100%', scale: 0.9, filter: 'blur(4px) brightness(0.6)', duration: 0.6, ease: 'cubic-bezier(0.65, 0, 0.35, 1)' },
                0
            )
            .fromTo(this.dom.mobileControlsOverlay,
                { autoAlpha: 1 },
                { autoAlpha: 0, duration: 0.3 },
                0
            );
    }

    toggle(forceState) {
        const shouldBeOpen = typeof forceState === 'boolean' ? forceState : !this.isOpen;

        if (shouldBeOpen === this.isOpen) return;
        this.isOpen = shouldBeOpen;

        const mainContent = document.querySelector('.main-content-area');
        
        document.body.classList.toggle('mobile-terminal-is-open', this.isOpen);

        if (this.isOpen) {
            this.dom.mobileTerminalDrawer.style.display = 'flex';
            if (mainContent) mainContent.style.pointerEvents = 'none';
            if (this.dom.mobileControlsOverlay) this.dom.mobileControlsOverlay.style.pointerEvents = 'none';
            this.timeline.play();
            appState.setHasUnreadTerminalMessages(false);
        } else {
            if (mainContent) mainContent.style.pointerEvents = 'auto';
            if (this.dom.mobileControlsOverlay) this.dom.mobileControlsOverlay.style.pointerEvents = 'auto';
            this.timeline.reverse();
        }
    }
}