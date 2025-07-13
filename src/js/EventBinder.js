/**
 * @module EventBinder
 * @description Centralizes all static DOM event listener bindings for the application.
 * This module is the single source of truth for how static UI elements are wired to
 * application logic, improving maintainability and decoupling managers from the view.
 */
import { serviceLocator } from './serviceLocator.js';
import * as appState from './appState.js';
import { MOBILE_BREAKPOINT } from './config/index.js';
import { createMobileInteraction } from './mobileInteraction.js';

export class EventBinder {
    constructor() {
        this.isMobile = window.matchMedia(MOBILE_BREAKPOINT).matches;
    }

    /**
     * Initializes all event bindings. This should be called once during application
     * startup after all manager services have been registered and initialized.
     */
    init() {
        if (this.isMobile) {
            this._bindMobileControls();
        } else {
            this._bindDesktopControls();
        }
    }

    /**
     * Binds all event listeners specific to the desktop layout.
     */
    _bindDesktopControls() {
        this._bindDesktopButtonInteractions();
        this._bindSidePanelControls();
    }

    /**
     * Binds all event listeners specific to the mobile layout.
     */
    _bindMobileControls() {
        this._bindMobileOverlayButtons();
        this._bindMobileTerminal();
    }

    /**
     * Sets up the main delegated click listener for all `.button-unit` elements on desktop.
     */
    _bindDesktopButtonInteractions() {
        const buttonManager = serviceLocator.get('buttonManager');
        this._queryAndBind('body', 'click', (event) => {
            const buttonElement = event.target.closest('.button-unit');
            if (buttonElement) {
                buttonManager.handleInteraction(buttonElement);
            }
        });
    }

    /**
     * Binds listeners for the desktop side info panel, including toggles, core controls,
     * tabs, and settings.
     */
    _bindSidePanelControls() {
        const sidePanelManager = serviceLocator.get('sidePanelManager');
        const startupManager = serviceLocator.get('startupSequenceManager');

        // Panel Toggles
        this._queryAndBind('#info-toggle-desktop', 'click', () => sidePanelManager.toggle());
        this._queryAndBind('#info-panel-close-btn', 'click', () => sidePanelManager.close());

        // Core Controls
        this._queryAndBind('#seq-reset', 'click', () => startupManager.resetSequence());
        this._queryAndBind('#audio-mute-toggle', 'click', () => {
            appState.setIsAudioMuted(!appState.getIsAudioMuted());
        });

        // Panel Tabs
        const panelTabs = document.querySelectorAll('.panel-tab-button');
        if (panelTabs.length > 0) {
            panelTabs.forEach(tab => {
                tab.addEventListener('click', () => {
                    const parentPanel = tab.closest('.expanded-view');
                    if (!parentPanel) return;

                    parentPanel.querySelectorAll('.panel-tab-button').forEach(t => t.classList.remove('active'));
                    parentPanel.querySelectorAll('.panel-tab-content').forEach(c => c.classList.remove('active'));
                    
                    tab.classList.add('active');
                    const contentId = tab.dataset.tab;
                    const contentEl = parentPanel.querySelector(`#${contentId}`);
                    if (contentEl) contentEl.classList.add('active');
                });
            });
        } else {
            console.warn('[EventBinder] Could not find any side panel tab buttons (.panel-tab-button).');
        }

        // Settings
        this._queryAndBind('#haptics-toggle', 'change', (event) => {
            appState.setIsHapticsEnabled(event.target.checked);
        });
    }

    /**
     * Binds listeners for the main mobile control overlay buttons.
     */
    _bindMobileOverlayButtons() {
        const startupManager = serviceLocator.get('startupSequenceManager');
        const sidePanelManager = serviceLocator.get('sidePanelManager');
        const mobileTerminalManager = serviceLocator.get('mobileTerminalManager');

        createMobileInteraction(document.getElementById('mobile-reset-btn'), {
            onClick: () => startupManager.resetSequence()
        });
        createMobileInteraction(document.getElementById('mobile-info-btn'), {
            onClick: () => sidePanelManager.toggle()
        });
        createMobileInteraction(document.getElementById('mobile-audio-btn'), {
            onClick: () => appState.setIsAudioMuted(!appState.getIsAudioMuted())
        });
        createMobileInteraction(document.getElementById('mobile-light-btn'), {
            // MODIFIED: Emit a new, specific event for the mobile toggle behavior.
            onClick: () => appState.emit('mobileLightToggleRequested')
        });
        createMobileInteraction(document.getElementById('mobile-terminal-toggle'), {
            onClick: () => mobileTerminalManager.toggle()
        });
    }

    /**
     * Binds listeners for the mobile terminal drawer, including the close button
     * and action buttons.
     */
    _bindMobileTerminal() {
        const mobileTerminalManager = serviceLocator.get('mobileTerminalManager');
        const audioManager = serviceLocator.get('audioManager');

        this._queryAndBind('#mobile-terminal-close-btn', 'click', () => mobileTerminalManager.toggle(false));

        const actionButtonsContainer = document.querySelector('#mobile-terminal-drawer .mobile-terminal-actions-flex-container');
        if (actionButtonsContainer) {
            actionButtonsContainer.addEventListener('click', (event) => {
                const button = event.target.closest('.button-unit--action');
                if (!button) return;

                audioManager.play('buttonPress', true);
                const action = button.dataset.action;

                switch (action) {
                    case 'scan-a':
                        appState.emit('requestTerminalMessage', { type: 'scan', messageKey: 'BTN1_SCAN', interrupt: true });
                        break;
                    case 'scan-b':
                        appState.emit('requestTerminalMessage', { type: 'scan', messageKey: 'BTN2_SCAN', interrupt: true });
                        break;
                    case 'eval-x':
                        appState.emit('requestTerminalMessage', { type: 'scan', messageKey: 'BTN3_SCAN', interrupt: true });
                        break;
                    case 'eval-y':
                        appState.emit('requestTerminalMessage', { type: 'scan', messageKey: 'BTN4_SCAN', interrupt: true });
                        break;
                }
            });
        }
    }

    /**
     * A robust query and binding helper that prevents fatal errors if an element
     * is not found in the DOM.
     * @param {string|Element} selectorOrElement - The CSS selector or direct element reference.
     * @param {string} event - The name of the event to listen for (e.g., 'click').
     * @param {Function} handler - The event handler function.
     */
    _queryAndBind(selectorOrElement, event, handler) {
        const element = typeof selectorOrElement === 'string'
            ? document.querySelector(selectorOrElement)
            : selectorOrElement;

        if (element) {
            element.addEventListener(event, handler);
        } else if (typeof selectorOrElement === 'string') {
            console.warn(`[EventBinder] Element with selector "${selectorOrElement}" not found. Could not attach event listener for "${event}".`);
        }
    }
}