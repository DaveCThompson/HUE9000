/**
 * @module sidePanelManager
 * @description Manages the UI and interactions for the left side info panel. (REFACTORED for v2.2)
 */
import { serviceLocator } from './serviceLocator.js'; // Corrected import path
import { appState } from './state/index.js' // This path was already correct relative to src/js/

export class SidePanelManager {
    constructor() {
        this.dom = null;
        this.startupManager = null;
        this.audioManager = null;
        this.imageObserver = null;
    }

    init() {
        this.dom = serviceLocator.get('domElements');
        this.startupManager = serviceLocator.get('startupSequenceManager');
        this.audioManager = serviceLocator.get('audioManager');

        this._initImageObserver();
    }

    /**
     * Toggles the visibility of the info panel.
     * Called by desktop and mobile "Info" buttons.
     */
    toggle() {
        // Guard: Don't do anything if the core panel element doesn't exist.
        if (!this.dom.controlDeck) return;
        const isExpanded = this.dom.controlDeck.classList.toggle('is-expanded');
        document.body.classList.toggle('left-panel-expanded', isExpanded); // Target body for global state
        
        this.audioManager.play('panelToggle', true);
    }

    /**
     * Explicitly closes the info panel.
     * Called by the 'X' button in the panel header.
     */
    close() {
        // Guard: Don't do anything if the core panel element doesn't exist.
        if (!this.dom.controlDeck) return;
        const wasExpanded = this.dom.controlDeck.classList.contains('is-expanded');
        
        if (wasExpanded) {
            this.dom.controlDeck.classList.remove('is-expanded');
            document.body.classList.remove('left-panel-expanded'); // Target body for global state
            this.audioManager.play('panelToggle', true);
        }
    }

    /**
     * Sets up an IntersectionObserver to animate images as they scroll into view.
     * @private
     */
    _initImageObserver() {
        // FIX: The scrollable element is panel-content, not controlDeck or expandedView.
        const panelContentEl = this.dom.controlDeck?.querySelector('.panel-content');
        if (!panelContentEl) return;

        const options = {
            root: panelContentEl, // FIX: Observe within the correct scrolling content area
            rootMargin: '0px',
            threshold: 0.1 // Trigger when 10% of the image is visible
        };

        this.imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                    // Stop observing the image once it's visible to save resources
                    observer.unobserve(entry.target);
                }
            });
        }, options);

        const images = panelContentEl.querySelectorAll('.panel-image');
        images.forEach(image => this.imageObserver.observe(image));
    }
}