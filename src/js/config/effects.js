// src/js/config/effects.js

/** @const {number} Speed of the refresh sweep animation in seconds. */
export const LCD_SWEEP_SPEED_S = 5;
/** @const {number} Opacity of the refresh sweep line. */
export const LCD_SWEEP_OPACITY = 0.09;
/** @const {number} Thickness of the scanlines in pixels. */
export const LCD_SCANLINE_THICKNESS_PX = 3;
/** @const {number} Opacity of the scanlines. */
export const LCD_SCANLINE_OPACITY = 0.12;
/** @const {number} Intensity (in px) of the jitter effect. */
export const LCD_JITTER_INTENSITY_PX = 0.5;

/** @const {number} Offset (in px) for the chromatic aberration text shadow. */
export const LCD_CHROMA_ABERRATION_OFFSET_PX = 0.75;
/** @const {number} Opacity of the red component of the chromatic aberration. */
export const LCD_CHROMA_RED_OPACITY = 0.5;
/** @const {number} Opacity of the blue component of the chromatic aberration. */
export const LCD_CHROMA_BLUE_OPACITY = 0.5;

/**
 * @typedef {object} DisruptionParams
 * @property {number} DURATION_S - Total duration of the disruption event.
 * @property {number} FLICKER_PEAK - Peak opacity (0-1) for the flicker effect.
 * @property {number} JITTER_PEAK_PX - Peak intensity (in px) for the jitter effect.
 * @property {number} CHROMA_OFFSET_PEAK_PX - Peak offset (in px) for chromatic aberration.
 * @property {number} PERIODIC_TRIGGER_INTERVAL_S - Average interval for random disruptions.
 */
export const DISRUPTION_PARAMS = {
    DURATION_S: 1.5,
    FLICKER_PEAK: 0.25,
    JITTER_PEAK_PX: 8.0,
    CHROMA_OFFSET_PEAK_PX: 6.0,
    PERIODIC_TRIGGER_INTERVAL_S: 25
};