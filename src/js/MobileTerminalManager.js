import * as appState from './appState.js';
import { serviceLocator } from './serviceLocator.js';
import { createMobileInteraction } from './mobileInteraction.js';
import { IDLE_LIGHT_DRIFT_PARAMS } from './config/index.js';

export class MobileTerminalManager {
    constructor() {
        this.dom = {
            body: document.body,
            toggleButton: document.getElementById('mobile-terminal-toggle'),
            drawer: document.getElementById('mobile-terminal-drawer'),
            mainContent: document.querySelector('.main-content-area'),
            actionButtons: [],
            // NEW: Add the close button to the DOM selectors
            closeButton: document.getElementById('mobile-terminal-close-btn'),
        };
        // Dependencies will be injected in init()
        this.audioManager = null;
        this.gsap = null;
        this.hapticManager = null;
        this.cssIdleDriftClassName = 'css-idle-drifting';
    }

    init() {
        if (!this.dom.toggleButton || !this.dom.drawer) {
            console.warn('[MobileTerminalManager] Could not initialize. Required DOM elements not found.');
            return;
        }

        // Inject dependencies from the service locator
        this.audioManager = serviceLocator.get('audioManager');
        this.gsap = serviceLocator.get('gsap');
        this.hapticManager = serviceLocator.get('hapticFeedbackManager');

        this.dom.actionButtons = Array.from(this.dom.drawer.querySelectorAll('.scan-button-block .button-unit'));
        this._setupEventListeners();

        // Activate idle drift on the action buttons
        this.dom.actionButtons.forEach(button => {
            this._activateIdleDrift(button);
        });
    }

    _setupEventListeners() {
        // Toggle button to open/close the drawer
        createMobileInteraction(this.dom.toggleButton, {
            onClick: () => this.toggle(),
            hapticType: 'toggleOn'
        });
        
        // NEW: Event listener for the dedicated close button
        if (this.dom.closeButton) {
            createMobileInteraction(this.dom.closeButton, {
                onClick: () => this.close(),
                hapticType: 'toggleOff' // Use a different haptic for closing
            });
        }


        // Action buttons inside the drawer
        this.dom.actionButtons.forEach(button => {
            // We use a manual listener here because createMobileInteraction is for single-tap events,
            // but we need to manage the 'is-pressing' class for visual feedback.
            button.addEventListener('pointerdown', (e) => {
                if (e.isPrimary === false) return;
                this.hapticManager.triggerClick();
                button.classList.add('is-pressing');
            });
            button.addEventListener('pointerup', (e) => {
                if (e.isPrimary === false) return;
                button.classList.remove('is-pressing');
                this._handleActionClick(button.dataset.action || button.getAttribute('aria-label'));
            });
            // Ensure pressing class is removed if pointer leaves the button
            button.addEventListener('pointerleave', () => {
                 button.classList.remove('is-pressing');
            });
        });

        // Listen for state changes to update the notification pulse
        appState.subscribe('unreadTerminalMessagesChanged', ({ hasUnread }) => {
            this.dom.toggleButton.classList.toggle('has-notification', hasUnread);
        });

        // Listen for state changes to update the ARIA attribute
        appState.subscribe('mobileTerminalStateChanged', ({ isOpen }) => {
            this.dom.toggleButton.setAttribute('aria-expanded', isOpen.toString());
        });
    }

    /**
     * Activates the CSS-based idle light drift animation on a button.
     * This is a lightweight, isolated version of the logic from Button.js.
     * @param {HTMLElement} buttonElement - The .button-unit element.
     * @private
     */
    _activateIdleDrift(buttonElement) {
        const lights = Array.from(buttonElement.querySelectorAll('.light'));
        if (lights.length === 0 || buttonElement.classList.contains(this.cssIdleDriftClassName)) {
            return;
        }

        const D_PARAMS = IDLE_LIGHT_DRIFT_PARAMS;
        const currentOpacity = D_PARAMS.BASE_LIGHT_OPACITY_UNSELECTED_ENERGIZED;
        const targetVariation = currentOpacity * D_PARAMS.OPACITY_VARIATION_FACTOR;
        const variationProxy = { value: 0 };

        const randomDuration = this.gsap.utils.random(D_PARAMS.PERIOD_MIN, D_PARAMS.PERIOD_MAX);
        lights.forEach(light => {
            light.style.setProperty('--light-idle-base-opacity', currentOpacity.toFixed(3));
            light.style.setProperty('--light-idle-variation', '0');
            light.style.setProperty('--light-idle-duration', `${randomDuration}s`);
            light.style.setProperty('--light-idle-delay', '0s');
        });

        buttonElement.classList.add(this.cssIdleDriftClassName);

        this.gsap.to(variationProxy, {
            value: targetVariation,
            duration: 2.0,
            delay: this.gsap.utils.random(0, 1.5),
            ease: 'sine.inOut',
            onUpdate: () => {
                lights.forEach(light => {
                    light.style.setProperty('--light-idle-variation', variationProxy.value.toFixed(3));
                });
            }
        });
    }

    _handleActionClick(action) {
        if (!action) return;
        const actionLower = action.toLowerCase();
        this.audioManager.play('buttonPress', true);
        let messageKey = '';
        let type = 'block'; // Default type
        switch (actionLower) {
            case 'think': messageKey = 'BTN1_MESSAGE'; break;
            case 'build': messageKey = 'BTN2_MESSAGE'; break;
            case 'craft': messageKey = 'BTN3_SCAN'; type = 'scan'; break;
            case 'lead':  messageKey = 'BTN4_SCAN'; type = 'scan'; break;
            default: return;
        }
        appState.emit('requestTerminalMessage', { type, messageKey, interrupt: true });
    }

    toggle() {
        const isOpen = appState.getIsMobileTerminalOpen();
        if (isOpen) {
            this.close();
        } else {
            this.open();
        }
    }

    open() {
        if (appState.getIsMobileTerminalOpen()) return;

        this.dom.body.classList.add('mobile-terminal-is-open');
        appState.setIsMobileTerminalOpen(true);

        if (appState.getHasUnreadTerminalMessages()) {
            appState.setHasUnreadTerminalMessages(false);
        }
    }



    close() {
        if (!appState.getIsMobileTerminalOpen()) return;
        
        this.dom.body.classList.remove('mobile-terminal-is-open');
        appState.setIsMobileTerminalOpen(false);
    }
}