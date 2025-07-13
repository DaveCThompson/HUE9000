/**
 * @module sidePanelManager
 * @description Manages the UI and interactions for the left side info panel. (REFACTORED for v2.2)
 */
import { serviceLocator } from './serviceLocator.js';
import { appState } from './state/index.js'

export class SidePanelManager {
    constructor() {
        this.dom = null;
        this.startupManager = null;
    }

    init() {
        this.dom = serviceLocator.get('domElements');
        this.startupManager = serviceLocator.get('startupSequenceManager');

        // REMOVED: All event binding methods are now handled by EventBinder.js
    }

    /**
     * Toggles the visibility of the info panel.
     * Called by desktop and mobile "Info" buttons.
     */
    toggle() {
        // Guard: Don't do anything if the core panel element doesn't exist.
        if (!this.dom.controlDeck) return;
        const isExpanded = this.dom.controlDeck.classList.toggle('is-expanded');
        this.dom.appWrapper.classList.toggle('left-panel-expanded', isExpanded);
    }

    /**
     * Explicitly closes the info panel.
     * Called by the 'X' button in the panel header.
     */
    close() {
        // Guard: Don't do anything if the core panel element doesn't exist.
        if (!this.dom.controlDeck) return;
        this.dom.controlDeck.classList.remove('is-expanded');
        this.dom.appWrapper.classList.remove('left-panel-expanded');
    }
}