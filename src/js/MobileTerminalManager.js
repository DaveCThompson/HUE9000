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
        this._setupEventListeners();

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

    _setupEventListeners() {
        // Guard against the element not being found
        if (this.dom.mobileTerminalToggle) {
            createMobileInteraction(this.dom.mobileTerminalToggle, {
                onClick: () => this.toggle()
            });
        }
        if (this.dom.mobileTerminalCloseBtn) {
            createMobileInteraction(this.dom.mobileTerminalCloseBtn, {
                onClick: () => this.toggle(false)
            });
        }

        const actionButtonsContainer = this.dom.mobileTerminalDrawer.querySelector('.mobile-terminal-actions-flex-container');
        if (actionButtonsContainer) {
            actionButtonsContainer.addEventListener('click', (event) => {
                const button = event.target.closest('.button-unit--action');
                if (!button) return;

                this.audioManager.play('buttonPress', true);
                const action = button.dataset.action;

                switch (action) {
                    case 'think':
                        appState.emit('requestTerminalMessage', { type: 'block', messageKey: 'BTN1_MESSAGE', interrupt: true });
                        break;
                    case 'build':
                        appState.emit('requestTerminalMessage', { type: 'block', messageKey: 'BTN2_MESSAGE', interrupt: true });
                        break;
                    case 'craft':
                        appState.emit('requestTerminalMessage', { type: 'scan', messageKey: 'BTN3_SCAN', interrupt: true });
                        break;
                    case 'lead':
                        appState.emit('requestTerminalMessage', { type: 'scan', messageKey: 'BTN4_SCAN', interrupt: true });
                        break;
                }
            });
        }
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