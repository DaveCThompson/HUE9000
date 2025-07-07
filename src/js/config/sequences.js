/**
 * @module config/sequences
 * @description Configuration constants for timed sequences like startup and resistive shutdown.
 */

// --- Startup Sequence Config (Durations in seconds for GSAP, ms for JS setTimeout/Intervals) ---

/** @const {number} Delay in seconds before auto-playing the startup sequence. */
export const AUTO_PLAY_START_DELAY = 0.75;

/** @const {number} Duration in seconds for the initial application fade-in. */
export const APP_LOAD_FADE_IN_DURATION = 0.3;

/** @const {number} Duration in seconds for the body fade-in during Phase 1. */
export const BODY_FADE_IN_DURATION = 0.3;

/** @const {number} Duration in seconds for the CSS transition when changing themes. */
export const THEME_TRANSITION_DURATION = 1.0;

/** @const {number} The very short duration for the final "System Ready" phase. */
export const SYSTEM_READY_PHASE_DURATION = 0.1;

/** @const {number} The minimum duration for a phase when in step-through mode. */
export const MIN_PHASE_DURATION_FOR_STEPPING = 0.05;

/** @const {number} Duration in seconds for LCD text to fade in. */
export const LCD_TEXT_FADE_IN_DURATION = 0.3; 

/** @const {object.<string, number>} L-reduction factors for each startup phase. */
export const STARTUP_L_REDUCTION_FACTORS = {
    P0: 0.40, P1: 0.39, P2: 0.35, P3: 0.325, P4: 0.325, 
    P5: 0.275, P6: 0.225, P7: 0.075, P8: 0.00
};

/** @const {number} The standard duration in seconds for dimming factor tweens. */
export const STARTUP_DIM_FACTORS_ANIMATION_DURATION = 1.0;


// --- Startup Animation Staggers ---

/** @const {number} Stagger in seconds for button group appearances. */
export const STARTUP_BUTTON_GROUP_APPEAR_STAGGER = 0.04;

/** @const {number} Stagger in seconds for hue assignment button appearances. */
export const STARTUP_HUE_ASSIGN_BUTTON_APPEAR_STAGGER = 0.008; 

/** @const {number} Stagger in seconds for LCD group appearances. */
export const STARTUP_LCD_GROUP_APPEAR_STAGGER = 0.05;

/** @const {number} Stagger in seconds for button energize animations. */
export const STARTUP_BUTTON_ENERGIZE_STAGGER = 0.03;


/** @const {string[]} CSS selectors for elements that animate on theme exit from 'dim'. */
export const selectorsForDimExitAnimation = [
    'body', '.panel-bezel', '.panel-section', '.control-block', '.button-unit',
    '.button-unit .light', '.button-unit .button-text', '#logo-container',
    '#logo-container svg.logo-svg', '#logo-container svg.logo-svg .logo-dynamic-bg',
    '#logo-container svg.logo-svg .logo-panel-bg-rect', '.dial-canvas-container',
    '.hue-lcd-display', '.actual-lcd-screen-element', '#lens-container',
    '#color-lens', '.grill-placeholder', '.color-chip',
    '.control-group-label', '.block-label-bottom'
];


// --- Resistive Shutdown Configuration ---

/**
 * @typedef {object} ResistiveShutdownStageParams
 * @property {string} BUTTON_FLASH_PROFILE_NAME - The flicker profile for the power button.
 * @property {string} BUTTON_FLASH_GLOW_COLOR - The temporary glow color for the button flash.
 * @property {string} BUTTON_TINT_CLASS - The temporary CSS class for the button tint flash.
 * @property {string} TERMINAL_MESSAGE_KEY - The key for the terminal message for this stage.
 * @property {number} LENS_ANIM_DURATION_S - The duration of the lens animation for this stage.
 * @property {string} DIAL_A_HUE_TARGET_MODE - The targeting mode for Dial A's hue.
 * @property {number} DIAL_A_HUE_VALUE - The target hue value for Dial A.
 * @property {string} DIAL_B_POWER_TARGET_MODE - The targeting mode for Dial B's power.
 * @property {number} DIAL_B_POWER_VALUE - The target power value for Dial B.
 * @property {number} HUE_ASSIGN_TARGET_HUE - The target hue for all assignment buttons.
 */

/**
 * @typedef {object} ResistiveShutdownParams
 * @property {number} MAX_STAGE - The maximum stage number for the sequence.
 * @property {string} LENS_ANIMATION_EASING_DEFAULT - The default GSAP ease for lens animations.
 * @property {ResistiveShutdownStageParams} STAGE_1 - Parameters for stage 1.
 * @property {ResistiveShutdownStageParams} STAGE_2 - Parameters for stage 2.
 * @property {ResistiveShutdownStageParams} STAGE_3 - Parameters for stage 3.
 */
export const RESISTIVE_SHUTDOWN_PARAMS = {
    MAX_STAGE: 3,
    LENS_ANIMATION_EASING_DEFAULT: "power2.inOut",
    STAGE_1: {
        BUTTON_FLASH_PROFILE_NAME: 'buttonFlickerResistYellow',
        BUTTON_FLASH_GLOW_COLOR: 'oklch(0.85 0.15 85)',
        BUTTON_TINT_CLASS: 'is-flashing-tint-yellow',
        TERMINAL_MESSAGE_KEY: 'RESIST_SHUTDOWN_S1',
        LENS_ANIM_DURATION_S: 0.75,
        DIAL_A_HUE_TARGET_MODE: 'absolute',
        DIAL_A_HUE_VALUE: 82.364,
        DIAL_B_POWER_TARGET_MODE: 'increase_absolute_0_1',
        DIAL_B_POWER_VALUE: 0.20,
        HUE_ASSIGN_TARGET_HUE: 82.364,
    },
    STAGE_2: {
        BUTTON_FLASH_PROFILE_NAME: 'buttonFlickerResistOrange',
        BUTTON_FLASH_GLOW_COLOR: 'oklch(0.75 0.16 50)',
        BUTTON_TINT_CLASS: 'is-flashing-tint-orange',
        TERMINAL_MESSAGE_KEY: 'RESIST_SHUTDOWN_S2',
        LENS_ANIM_DURATION_S: 0.75,
        DIAL_A_HUE_TARGET_MODE: 'absolute',
        DIAL_A_HUE_VALUE: 60.636,
        DIAL_B_POWER_TARGET_MODE: 'increase_absolute_0_1',
        DIAL_B_POWER_VALUE: 0.20,
        HUE_ASSIGN_TARGET_HUE: 60.636,
    },
    STAGE_3: {
        BUTTON_FLASH_PROFILE_NAME: 'buttonFlickerResistRedThenSolid',
        BUTTON_FLASH_GLOW_COLOR: 'oklch(0.65 0.22 25)',
        BUTTON_TINT_CLASS: 'is-flashing-tint-red',
        TERMINAL_MESSAGE_KEY: 'RESIST_SHUTDOWN_S3',
        LENS_ANIM_DURATION_S: 1.0,
        DIAL_A_HUE_TARGET_MODE: 'absolute',
        DIAL_A_HUE_VALUE: 40.6,
        DIAL_B_POWER_TARGET_MODE: 'absolute_100',
        DIAL_B_POWER_VALUE: 1.0,
        HUE_ASSIGN_TARGET_HUE: 40.6,
    }
};