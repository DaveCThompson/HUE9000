/**
 * @module config/interaction
 * @description Configuration constants for user interaction sensitivity and thresholds.
 */

/** @const {number} Pixels of mouse movement required to rotate a dial by one degree. */
export const PIXELS_PER_DEGREE_ROTATION = 1.3;

/** @const {number} Pixels of mouse movement required to change a dial's hue value by one degree. */
export const PIXELS_PER_DEGREE_HUE = 1.3;

/** @const {number} The minimum change in hue required to trigger an update. */
export const HUE_UPDATE_THRESHOLD = 0.1;

/** @const {number} The debounce delay in milliseconds for expensive operations. */
export const DEBOUNCE_DELAY = 150;