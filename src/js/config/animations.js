/**
 * @module config/animations
 * @description Configuration constants for animations, including GSAP tweens,
 * ambient effects, and flicker/glow profiles.
 */

// --- Animation Settings (GSAP) ---

/** @const {number} Default duration for GSAP tweens. */
export const GSAP_TWEEN_DURATION = 0.4;

/** @const {string} Default ease for GSAP tweens. */
export const GSAP_TWEEN_EASE = "power1.out";

/** @const {number} Perceptual offset in milliseconds to better sync audio with visuals. */
export const PERCEPTUAL_AUDIO_OFFSET_MS = 60;


// --- Button Animation Config ---

/** @const {number} Minimum duration for the button idle light drift animation. */
export const GSAP_BUTTON_IDLE_DURATION_MIN = 1.7;

/** @const {number} Maximum duration for the button idle light drift animation. */
export const GSAP_BUTTON_IDLE_DURATION_MAX = 2.6;

/** @const {string} Easing function for the button idle light drift animation. */
export const GSAP_BUTTON_IDLE_EASE = "sine.inOut";


// --- Ambient Animation Parameters ---

/**
 * @typedef {object} HarmonicResonanceParams
 * @property {boolean} ENABLED - Toggles the harmonic resonance effect.
 * @property {number} PERIOD - The period of the sine wave for the pulsing effect.
 * @property {string} ELIGIBILITY_CLASS - The class required on a button for this effect to apply.
 * @property {number[]} GLOW_OPACITY_RANGE - The min/max opacity range for the global glow.
 * @property {number[]} GLOW_SCALE_RANGE - The min/max scale range for the global glow.
 */
export const HARMONIC_RESONANCE_PARAMS = {
    ENABLED: true,
    PERIOD: 2.5,
    ELIGIBILITY_CLASS: 'is-energized',
    GLOW_OPACITY_RANGE:  [0.4, 0.6],
    GLOW_SCALE_RANGE:    [0.95, 1.05],
};

/**
 * @typedef {object} IdleLightDriftParams
 * @property {number} BASE_LIGHT_OPACITY_UNSELECTED_ENERGIZED - The base opacity for the light.
 * @property {number} OPACITY_VARIATION_FACTOR - How much the opacity varies from the base.
 * @property {number} PERIOD_MIN - The minimum duration for a full drift cycle.
 * @property {number} PERIOD_MAX - The maximum duration for a full drift cycle.
 * @property {number} STAGGER_PER_LIGHT - Delay between lights on a multi-light button.
 * @property {string} ELIGIBILITY_CLASS - The class required on a button for this effect to apply.
 */
export const IDLE_LIGHT_DRIFT_PARAMS = {
    BASE_LIGHT_OPACITY_UNSELECTED_ENERGIZED: 0.45, 
    OPACITY_VARIATION_FACTOR: 0.5, 
    PERIOD_MIN: 1.0, 
    PERIOD_MAX: 3., 
    STAGGER_PER_LIGHT: 0.15, 
    ELIGIBILITY_CLASS: 'is-energized'
};

/**
 * @typedef {object} StateTransitionEchoParams
 * @property {number} NUM_PULSES - Number of echo pulses.
 * @property {number} INITIAL_LIGHT_INTENSITY_FACTOR - Initial intensity of the light pulse.
 * @property {number} LIGHT_DECAY_FACTOR - Decay factor for light intensity over pulses.
 * @property {number} INITIAL_GLOW_OPACITY_FACTOR - Initial opacity of the glow pulse.
 * @property {number} GLOW_OPACITY_DECAY_FACTOR - Decay factor for glow opacity.
 * @property {number} INITIAL_GLOW_SIZE_FACTOR - Initial size of the glow pulse.
 * @property {number} GLOW_SIZE_DECAY_FACTOR - Decay factor for glow size.
 * @property {number} BASE_PULSE_PERIOD - The base period for each pulse.
 * @property {number} PERIOD_DECAY_FACTOR - Decay factor for the pulse period.
 * @property {number} DELAY_AFTER_TRANSITION - Delay before the echo effect starts.
 */
export const STATE_TRANSITION_ECHO_PARAMS = { 
    NUM_PULSES: 15,                             
    INITIAL_LIGHT_INTENSITY_FACTOR: 0.45,       
    LIGHT_DECAY_FACTOR: 0.55,                   
    INITIAL_GLOW_OPACITY_FACTOR: 0.5,
    GLOW_OPACITY_DECAY_FACTOR: 0.4,
    INITIAL_GLOW_SIZE_FACTOR: 0.3, 
    GLOW_SIZE_DECAY_FACTOR: 0.5,
    BASE_PULSE_PERIOD: 0.12,                    
    PERIOD_DECAY_FACTOR: 0.60,                  
    DELAY_AFTER_TRANSITION: 0.05 
};