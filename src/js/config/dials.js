/**
 * @module config/dials
 * @description Configuration constants for the rotary dial controls.
 */

// --- Dial Visual Parameters ---

/** @const {number} Number of ridges to render for the 3D effect. */
export const NUM_RIDGES = 32;

/** @const {number} Factor to scale the width of each ridge. */
export const RIDGE_WIDTH_FACTOR = 1.6;

/** @const {number} Factor to scale the width of the ridge highlight. */
export const HIGHLIGHT_WIDTH_FACTOR = 0.15;

/** @const {number} Scaling factor for the dial's color gradient. */
export const DIAL_GRADIENT_SCALE_FACTOR = 0.8;

/** @const {number} Multiplier for Dial B's visual rotation relative to its hue value. */
export const DIAL_B_VISUAL_ROTATION_PER_HUE_DEGREE_CONFIG = 2;

/** @const {number} The default starting hue for Dial A. */
export const DEFAULT_DIAL_A_HUE = 40.6;

/** @const {number} The duration in seconds for the dial canvas to fade in. */
export const DIAL_CANVAS_FADE_IN_DURATION = 0.5;