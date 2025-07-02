/**
 * @file mobileInteraction.js
 * @description Provides a centralized utility for creating standardized mobile interactions
 * that include haptic feedback.
 */
import { serviceLocator } from './serviceLocator.js';

/**
 * Creates a standardized mobile interaction listener for a given element.
 * This handles haptics and the callback logic.
 *
 * @param {HTMLElement} element - The DOM element to attach the listener to.
 * @param {object} options - Configuration for the interaction.
 * @param {Function} options.onClick - The callback function to execute on interaction.
 * @param {string} [options.hapticType='click'] - The type of haptic feedback to trigger ('click', 'toggleOn', 'toggleOff').
 */
export function createMobileInteraction(element, { onClick, hapticType = 'click' }) {
    if (!element) return;

    const hapticManager = serviceLocator.get('hapticFeedbackManager');

    const handleInteraction = (event) => {
        // We only care about primary pointer actions (e.g., left-click, single touch)
        if (event.isPrimary === false) return;

        // Trigger the appropriate haptic feedback
        switch (hapticType) {
            case 'toggleOn':
                hapticManager.triggerToggleOn();
                break;
            case 'toggleOff':
                hapticManager.triggerToggleOff();
                break;
            case 'click':
            default:
                hapticManager.triggerClick();
                break;
        }

        // Execute the provided callback function
        if (typeof onClick === 'function') {
            onClick(event);
        }
    };

    // Use pointerup as it's a reliable "completion" event for both taps and clicks
    element.addEventListener('pointerup', handleInteraction);
}