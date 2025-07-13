/**
 * @module EventBinder
 * @description Centralizes all static DOM event listener bindings for the application.
 */
import { serviceLocator } from './serviceLocator.js';
import { appState, actions } from './state/index.js';
import { MOBILE_BREAKPOINT } from './config/index.js';
import { createMobileInteraction } from './mobileInteraction.js';

export class EventBinder {
    constructor() {
        this.isMobile = window.matchMedia(MOBILE_BREAKPOINT).matches;
    }

    init() {
        if (this.isMobile) {
            this._bindMobileControls();
        } else {
            this._bindDesktopControls();
        }
    }

    _bindDesktopControls() {
        this._bindDesktopButtonInteractions();
        this._bindSidePanelControls();
    }

    _bindMobileControls() {
        this._bindMobileOverlayButtons();
        this._bindMobileTerminal();
        this._bindSidePanelControls();
    }

    _bindDesktopButtonInteractions() {
        const buttonManager = serviceLocator.get('buttonManager');
        this._queryAndBind('body', 'click', (event) => {
            const buttonElement = event.target.closest('.button-unit');
            if (buttonElement) {
                buttonManager.handleInteraction(buttonElement);
            }
        });
    }

    _bindSidePanelControls() {
        const sidePanelManager = serviceLocator.get('sidePanelManager');
        const startupManager = serviceLocator.get('startupSequenceManager');

        this._queryAndBind('#info-toggle-desktop', 'click', () => sidePanelManager.toggle());
        this._queryAndBind('#info-panel-close-btn', 'click', () => sidePanelManager.close());

        this._queryAndBind('#seq-reset', 'click', () => appState.dispatch(actions.resetSequence()));
        this._queryAndBind('#audio-mute-toggle', 'click', () => appState.dispatch(actions.toggleAudioMute()));

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
        }

        this._queryAndBind('#haptics-toggle', 'change', (event) => {
            appState.setIsHapticsEnabled(event.target.checked);
        });
    }

    _bindMobileOverlayButtons() {
        const sidePanelManager = serviceLocator.get('sidePanelManager');
        const mobileTerminalManager = serviceLocator.get('mobileTerminalManager');

        createMobileInteraction(document.getElementById('mobile-reset-btn'), {
            onClick: () => appState.dispatch(actions.resetSequence())
        });
        createMobileInteraction(document.getElementById('mobile-info-btn'), {
            onClick: () => sidePanelManager.toggle()
        });
        createMobileInteraction(document.getElementById('mobile-audio-btn'), {
            onClick: () => appState.dispatch(actions.toggleAudioMute())
        });
        createMobileInteraction(document.getElementById('mobile-light-btn'), {
            onClick: () => appState.dispatch(actions.cycleTheme())
        });
        createMobileInteraction(document.getElementById('mobile-terminal-toggle'), {
            onClick: () => mobileTerminalManager.toggle()
        });
    }

    _bindMobileTerminal() {
        const mobileTerminalManager = serviceLocator.get('mobileTerminalManager');
        
        this._queryAndBind('#mobile-terminal-close-btn', 'click', () => mobileTerminalManager.toggle(false));

        const actionButtonsContainer = document.querySelector('#mobile-terminal-drawer .mobile-terminal-actions-flex-container');
        if (actionButtonsContainer) {
            actionButtonsContainer.addEventListener('click', (event) => {
                const button = event.target.closest('.button-unit--action');
                if (!button) return;

                const action = button.dataset.action;
                let messageKey = '';

                switch (action) {
                    case 'scan-a': messageKey = 'BTN1_SCAN'; break;
                    case 'scan-b': messageKey = 'BTN2_SCAN'; break;
                    case 'eval-x': messageKey = 'BTN3_SCAN'; break;
                    case 'eval-y': messageKey = 'BTN4_SCAN'; break;
                }
                
                if (messageKey) {
                    appState.dispatch(actions.requestScan(messageKey));
                }
            });
        }
    }

    _queryAndBind(selectorOrElement, event, handler) {
        const element = typeof selectorOrElement === 'string'
            ? document.querySelector(selectorOrElement)
            : selectorOrElement;
        if (element) {
            element.addEventListener(event, handler);
        }
    }
}