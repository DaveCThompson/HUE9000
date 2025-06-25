/**
 * @module config/ui
 * @description Configuration constants for various UI elements and displays.
 */

// --- Hue Assignment Grid Configuration ---

/** @const {number[]} The specific hue values for each row in the assignment grid. */
export const HUE_ASSIGNMENT_ROW_HUES = [
  0,       // 0: Colorless (Gray)
  344.182, // 1: Pink-Red
  311.455, // 2: Magenta
  278.727, // 3: Purple
  246,     // 4: Blue
  213.273, // 5: Sky Blue
  180.545, // 6: Cyan
  147.818, // 7: Teal
  115.091, // 8: Green
  82.364,  // 9: Yellow
  60.0,  // 10: Orange
  40.0   // 11: Red
];

/** @const {object.<string, number>} The default selected row index for each assignment target. */
export const DEFAULT_ASSIGNMENT_SELECTIONS = {
    env: 0,
    lcd: 0,
    logo: 0,
    btn: 0
};

// --- Mood Matrix Display Configuration ---

/** @const {string[]} The names of the moods for the Mood Matrix display. */
export const MOOD_MATRIX_DEFINITIONS = [
    "Commanding",
    "Analytical",
    "Focused",
    "Advisory",
    "Introspective",
    "Evaluative"
];

/**
 * @typedef {object} V2DisplayParams
 * @property {number} INTENSITY_BARS - The number of bars in the intensity display.
 * @property {number} INTENSITY_DOTS - The number of dots in the intensity display.
 * @property {number} MOOD_MAJOR_BLOCKS - The number of major blocks in the mood display.
 * @property {number} MOOD_FINE_DOTS - The number of dots in the mood display.
 * @property {number} RESONANCE_IDLE_DELAY_MS - The delay in ms before an LCD starts resonating.
 */
export const V2_DISPLAY_PARAMS = {
    INTENSITY_BARS: 36,
    INTENSITY_DOTS: 36,
    MOOD_MAJOR_BLOCKS: 6,
    MOOD_FINE_DOTS: 36,
    RESONANCE_IDLE_DELAY_MS: 250
};

/** 
 * @const {string} The CSS media query string for mobile viewports.
 * NOTE TO DEV: This value MUST be kept in sync with the media queries in the CSS.
 * e.g., @media (max-width: 768px) { ... }
 */
export const MOBILE_BREAKPOINT = '(max-width: 768px)';