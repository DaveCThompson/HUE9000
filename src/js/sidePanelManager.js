/**
 * @module sidePanelManager
 * @description Manages the UI and interactions for the left side info panel. (REFACTORED for v2.2)
 */
import { serviceLocator } from './serviceLocator.js';
import * as appState from './appState.js';

export class SidePanelManager {
    constructor() {
        this.dom = null;
        this.startupManager = null;
    }

    init() {
        this.dom = serviceLocator.get('domElements');
        this.startupManager = serviceLocator.get('startupSequenceManager');

        this._setupPanelToggles();
        this._setupTabControls();
        this._setupCoreControls();
    }

    /**
     * Toggles the visibility of the info panel.
     * Called by desktop and mobile "Info" buttons.
     */
    toggle() {
        const isExpanded = this.dom.controlDeck.classList.toggle('is-expanded');
        this.dom.appWrapper.classList.toggle('left-panel-expanded', isExpanded);
    }

    /**
     * Explicitly closes the info panel.
     * Called by the 'X' button in the panel header.
     */
    close() {
        this.dom.controlDeck.classList.remove('is-expanded');
        this.dom.appWrapper.classList.remove('left-panel-expanded');
    }

    /**
     * Wires up the event listeners for buttons that open/close the panel.
     */
    _setupPanelToggles() {
        const infoToggleDesktop = document.getElementById('info-toggle-desktop');
        const closeBtn = document.getElementById('info-panel-close-btn');
        // Mobile info button is wired up in main.js to call the public toggle() method.
        
        if (infoToggleDesktop) {
            infoToggleDesktop.addEventListener('click', () => this.toggle());
        }
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.close());
        }
    }

    /**
     * Wires up the remaining controls in the compact desktop bar (Reset, Mute).
     */
    _setupCoreControls() {
        const resetBtn = document.getElementById('seq-reset');
        const muteBtn = document.getElementById('audio-mute-toggle');
        
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                this.startupManager.resetSequence();
            });
        }

        if (muteBtn) {
            // The button's only job is to signal intent to change the global state.
            // The reaction (changing the icon, muting audio) is handled by a
            // central listener in main.js.
            muteBtn.addEventListener('click', () => {
                appState.setIsAudioMuted(!appState.getIsAudioMuted());
            });
        }
    }

    /**
     * Sets up the click handlers for the tabs within the info panel.
     */
    _setupTabControls() {
        const allTabs = this.dom.controlDeck.querySelectorAll('.panel-tab-button');
        allTabs.forEach(tab => {
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
}