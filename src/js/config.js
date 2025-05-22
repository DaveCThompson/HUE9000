/**
 * @module config (REFACTOR-V2.1)
 * @description Defines shared configuration constants and settings for the HUE 9000 interface.
 */

// --- Interaction Sensitivity & Thresholds ---
export const PIXELS_PER_DEGREE_ROTATION = 1.3;
export const PIXELS_PER_DEGREE_HUE = 1.3;
export const HUE_UPDATE_THRESHOLD = 0.1;
export const DEBOUNCE_DELAY = 150;

// --- Dial Visual Parameters ---
export const NUM_RIDGES = 32;
export const RIDGE_WIDTH_FACTOR = 1.6;
export const HIGHLIGHT_WIDTH_FACTOR = 0.15;
export const DIAL_GRADIENT_SCALE_FACTOR = 0.8;
export const DIAL_B_VISUAL_ROTATION_PER_HUE_DEGREE_CONFIG = 2;
export const DEFAULT_DIAL_A_HUE = 40.6;

// --- Animation Settings (GSAP) ---
export const GSAP_TWEEN_DURATION = 0.4;
export const GSAP_TWEEN_EASE = "power1.out";

// --- Button Animation Config ---
export const GSAP_BUTTON_IDLE_DURATION_MIN = 1.7;
export const GSAP_BUTTON_IDLE_DURATION_MAX = 2.6;
export const GSAP_BUTTON_IDLE_EASE = "sine.inOut";

// --- Hue Assignment Grid Configuration ---
export const HUE_ASSIGNMENT_ROW_HUES = [
  0,
  246,
  278.727,
  311.455,
  344.182,
  16.909,
  49.636,
  82.364,
  115.091,
  147.818,
  180.545,
  213.273
];

export const DEFAULT_ASSIGNMENT_SELECTIONS = {
    env: 1,
    lcd: 0,
    logo: 1,
    btn: 0
};

// --- Startup Sequence Config (Durations in seconds for GSAP, ms for JS setTimeout/Intervals) ---
export const AUTO_PLAY_START_DELAY = 0.75; // seconds
export const APP_LOAD_FADE_IN_DURATION = 0.3;
export const BODY_FADE_IN_DURATION = 0.3; // For initial body opacity fade-in in P1
// export const ATTENUATION_DURATION = 0.5; // REPLACED by STARTUP_DIM_FACTORS_ANIMATION_DURATION per phase
export const LENS_STARTUP_TARGET_POWER = 25;
export const LENS_STARTUP_RAMP_DURATION = 1500; // ms
export const P3_LENS_RAMP_DURATION_S = LENS_STARTUP_RAMP_DURATION / 1000;
export const P4_BUTTON_FADE_STAGGER = 0.04;
export const P4_LCD_FADE_STAGGER = 0.05;
export const P6_BUTTON_ENERGIZE_FLICKER_STAGGER = 0.03;
export const THEME_TRANSITION_DURATION = 1.0;
export const SYSTEM_READY_PHASE_DURATION = 0.1;
export const MIN_PHASE_DURATION_FOR_STEPPING = 0.05;
export const LCD_TEXT_FADE_IN_DURATION = 0.3;

// NEW: Startup Dimming Configuration
export const STARTUP_L_REDUCTION_FACTORS = {
    // These map to the conceptual P-phases for dimming.
    // P0 is the initial state set by resetVisualsAndState.
    // P1 animation target, P2 animation target, etc.
    P0: 0.40, // New FSM Phase 0 (startupPhase0.js will ensure this via reset)
    P1: 0.39, // New FSM Phase 1 (startupPhase1.js animates to this)
    P2: 0.35, // New FSM Phase 2 (startupPhase2.js animates to this)
    P3: 0.325, // New FSM Phase 3 (startupPhase3.js animates to this)
    P4: 0.6, // New FSM Phase 4 (startupPhase4.js animates to this)
    P5: 0.275, // New FSM Phase 5 (startupPhase5.js animates to this)
    P6: 0.225, // New FSM Phase 6 (startupPhase6.js animates to this)
    P7: 0.075, // New FSM Phase 7 (startupPhase7.js animates to this)
    P8: 0.00  // New FSM Phase 8 (startupPhase8.js animates to this)
    // P9, P10, P11 will remain at L=0.0, O=1.0 (no reduction, full opacity factor)
};
export const STARTUP_DIM_FACTORS_ANIMATION_DURATION = 1; // Duration for each L/O factor tween within a phase

export const selectorsForDimExitAnimation = [
    'body',
    '.panel-bezel',
    '.panel-section',
    '.control-block',
    '.button-unit',
    '.button-unit .light',
    '.button-unit .button-text',
    '#logo-container',
    '#logo-container svg.logo-svg',
    '#logo-container svg.logo-svg .logo-dynamic-bg',
    '#logo-container svg.logo-svg .logo-panel-bg-rect',
    '.dial-canvas-container',
    '.hue-lcd-display',
    '.actual-lcd-screen-element',
    '#lens-container',
    '#color-lens',
    '.grill-placeholder',
    '.color-chip',
    '.control-group-label',
    '.block-label-bottom'
];

// --- Lens Visuals & Oscillation Configuration ---
export const LENS_OSCILLATION_THRESHOLD = 0.7;
export const LENS_OSCILLATION_SMOOTHING_DURATION = 0.2;
export const LENS_OSCILLATION_RESTART_DELAY = 250;
export const LENS_OSCILLATION_AMPLITUDE_MIN = 0.005;
export const LENS_OSCILLATION_AMPLITUDE_MAX_ADDITION = 0.045;
export const LENS_OSCILLATION_PERIOD_AT_THRESHOLD = 9.0;
export const LENS_OSCILLATION_PERIOD_AT_MAX_POWER = 1.8;

// --- Lens Gradient Configuration ---
export const LENS_HOTSPOT_HUE_OFFSET = 75.0;
export const LENS_GRADIENT_POSITION_SCALE = 0.85;

const BP1_POWER = 0.00; const BP2_POWER = 0.33; const BP3_POWER = 0.66; const BP4_POWER = 1.00; const BP5_POWER = 1.05;
const scaleStops = (stops, scale) => stops.map(stop => ({ ...stop, pos: stop.pos * scale }));
export const LENS_GRADIENT_BREAKPOINTS = [
  { power: BP1_POWER, stops: scaleStops([
      { l: 0.976, c: 0.079, type: 'hotspot',   pos: 0.00 }, { l: 0.941, c: 0.149, type: 'hotspot',   pos: 0.00 },
      { l: 0.604, c: 0.321, type: 'main',      pos: 0.00 }, { l: 0.551, c: 0.301, type: 'main',      pos: 0.0264 },
      { l: 0.461, c: 0.251, type: 'main',      pos: 0.0366 }, { l: 0.416, c: 0.226, type: 'main',      pos: 0.0425 },
      { l: 0.351, c: 0.191, type: 'main',      pos: 0.0594 }, { l: 0.291, c: 0.121, type: 'main',      pos: 0.0739 },
      { l: 0.074, c: 0.000, type: 'darkedge',  pos: 0.4266 }, { l: 0.000, c: 0.000, type: 'blackedge', pos: 1.00 }
    ], LENS_GRADIENT_POSITION_SCALE)},
  { power: BP2_POWER, stops: scaleStops([
      { l: 0.976, c: 0.079, type: 'hotspot',   pos: 0.00 }, { l: 0.941, c: 0.149, type: 'hotspot',   pos: 0.01 },
      { l: 0.604, c: 0.321, type: 'main',      pos: 0.0495 }, { l: 0.551, c: 0.301, type: 'main',      pos: 0.0943 },
      { l: 0.461, c: 0.251, type: 'main',      pos: 0.1503 }, { l: 0.416, c: 0.226, type: 'main',      pos: 0.1793 },
      { l: 0.351, c: 0.191, type: 'main',      pos: 0.2321 }, { l: 0.291, c: 0.121, type: 'main',      pos: 0.4470 },
      { l: 0.074, c: 0.000, type: 'darkedge',  pos: 0.8361 }, { l: 0.000, c: 0.000, type: 'blackedge', pos: 1.00 }
    ], LENS_GRADIENT_POSITION_SCALE)},
  { power: BP3_POWER, stops: scaleStops([
      { l: 0.976, c: 0.079, type: 'hotspot',   pos: 0.01 }, { l: 0.941, c: 0.149, type: 'hotspot',   pos: 0.04 },
      { l: 0.604, c: 0.321, type: 'main',      pos: 0.08 }, { l: 0.551, c: 0.301, type: 'main',      pos: 0.2533 },
      { l: 0.461, c: 0.251, type: 'main',      pos: 0.35 }, { l: 0.416, c: 0.226, type: 'main',      pos: 0.40 },
      { l: 0.351, c: 0.191, type: 'main',      pos: 0.57 }, { l: 0.291, c: 0.121, type: 'main',      pos: 0.67 },
      { l: 0.074, c: 0.000, type: 'darkedge',  pos: 0.93 }, { l: 0.000, c: 0.000, type: 'blackedge', pos: 1.00 }
    ], LENS_GRADIENT_POSITION_SCALE)},
  { power: BP4_POWER, stops: scaleStops([
      { l: 0.976, c: 0.079, type: 'hotspot',   pos: 0.01 }, { l: 0.941, c: 0.149, type: 'hotspot',   pos: 0.06 },
      { l: 0.604, c: 0.321, type: 'main',      pos: 0.1006 }, { l: 0.551, c: 0.301, type: 'main',      pos: 0.3011 },
      { l: 0.461, c: 0.251, type: 'main',      pos: 0.4498 }, { l: 0.416, c: 0.226, type: 'main',      pos: 0.5834 },
      { l: 0.351, c: 0.191, type: 'main',      pos: 0.7228 }, { l: 0.291, c: 0.121, type: 'main',      pos: 0.8371 },
      { l: 0.074, c: 0.000, type: 'darkedge',  pos: 0.9626 }, { l: 0.000, c: 0.000, type: 'blackedge', pos: 1.00 }
    ], LENS_GRADIENT_POSITION_SCALE)},
  { power: BP5_POWER, stops: scaleStops([
      { l: 0.976, c: 0.079, type: 'hotspot',   pos: 0.01 }, { l: 0.941, c: 0.149, type: 'hotspot',   pos: 0.0665 },
      { l: 0.604, c: 0.321, type: 'main',      pos: 0.1248 }, { l: 0.551, c: 0.301, type: 'main',      pos: 0.3302 },
      { l: 0.461, c: 0.251, type: 'main',      pos: 0.4823 }, { l: 0.416, c: 0.226, type: 'main',      pos: 0.6383 },
      { l: 0.351, c: 0.191, type: 'main',      pos: 0.7547 }, { l: 0.291, c: 0.121, type: 'main',      pos: 0.8908 },
      { l: 0.074, c: 0.000, type: 'darkedge',  pos: 0.9775 }, { l: 0.000, c: 0.000, type: 'blackedge', pos: 1.00 }
    ], LENS_GRADIENT_POSITION_SCALE)}
];
export const NUM_LENS_GRADIENT_STOPS = LENS_GRADIENT_BREAKPOINTS[0].stops.length;

// --- Terminal Configuration ---
export const TERMINAL_MAX_LINES_IN_DOM = 150;
export const TERMINAL_TYPING_SPEED_STATUS_MS_PER_CHAR = 40;
export const TERMINAL_TYPING_SPEED_BLOCK_MS_PER_CHAR = 15;
export const TERMINAL_TYPING_SPEED_STARTUP_MS_PER_CHAR = 20;
export const TERMINAL_NEW_LINE_DELAY_MIN_MS = 50;
export const TERMINAL_NEW_LINE_DELAY_MAX_MS = 150;
export const TERMINAL_CURSOR_BLINK_ON_MS = 530;
export const TERMINAL_CURSOR_BLINK_OFF_MS = 370;

// --- Standardized Visual State Characteristics ---
const VISUAL_STATES = {
    UNLIT: { amplitudeEnd: 0.05, glowFinalOpacity: 0.0, glowFinalSize: '0px' },
    DIMLY_LIT: { amplitudeEnd: 0.8, glowFinalOpacity: 0.2, glowFinalSize: '2px' },
    FULLY_LIT_UNSELECTED: { amplitudeEnd: 0.95, glowFinalOpacity: 0.6, glowFinalSize: '9px' },
    FULLY_LIT_SELECTED: { amplitudeEnd: 1.0, glowFinalOpacity: 0.8, glowFinalSize: '13px' },
};

// --- Advanced Flicker & Glow Profiles (Refactored for Semantics) ---
export const ADVANCED_FLICKER_PROFILES = {
    // --- Text Element Profiles ---
    textFlickerToDimlyLit: { // From Unlit
        numCycles: 8, periodStart: 0.15, periodEnd: 0.05, onDurationRatio: 0.45,
        amplitudeStart: 0.0, // Start from completely off
        amplitudeEnd: VISUAL_STATES.DIMLY_LIT.amplitudeEnd,
        glow: {
            initialOpacity: 0.0, // Start glow from off
            peakOpacity: 0.4,    // Peak during flicker
            finalOpacity: VISUAL_STATES.DIMLY_LIT.glowFinalOpacity,
            initialSize: '0px',  // Start glow from off
            peakSize: '3px',     // Peak during flicker
            finalSize: VISUAL_STATES.DIMLY_LIT.glowFinalSize,
            colorVar: '--terminal-text-glow-color',
            scaleWithAmplitude: true,
            animatedProperties: { opacity: '--terminal-text-glow-opacity', blur: '--terminal-text-bloom-size' }
        },
        targetProperty: 'text-shadow-opacity-and-blur'
    },

    // --- LCD Screen Element Profiles ---
    lcdScreenFlickerToDimlyLit: { // From Unlit
        numCycles: 8, periodStart: 0.15, periodEnd: 0.05, onDurationRatio: 0.45,
        amplitudeStart: 0.0, // Start from completely off
        amplitudeEnd: VISUAL_STATES.DIMLY_LIT.amplitudeEnd,
        glow: {
            initialOpacity: 0.0, // Start glow from off
            peakOpacity: 0.4,
            finalOpacity: VISUAL_STATES.DIMLY_LIT.glowFinalOpacity,
            initialSize: '0px',  // Start glow from off
            peakSize: '9px',
            finalSize: VISUAL_STATES.DIMLY_LIT.glowFinalSize,
            colorVar: '--lcd-glow-color',
            sizeVar: '--lcd-glow-size',
            opacityVar: '--lcd-glow-opacity',
            scaleWithAmplitude: true
        },
        targetProperty: 'element-opacity-and-box-shadow'
    },

    // --- Button Element Profiles ---
    buttonFlickerToDimlyLit: { // From Unlit to Dimly Lit (Unselected appearance)
        numCycles: 8, periodStart: 0.15, periodEnd: 0.05, onDurationRatio: 0.45,
        amplitudeStart: 0.0, // Start from completely off
        amplitudeEnd: VISUAL_STATES.DIMLY_LIT.amplitudeEnd,
        glow: {
            initialOpacity: 0.0, // Start glow from off
            peakOpacity: 0.35,
            finalOpacity: VISUAL_STATES.DIMLY_LIT.glowFinalOpacity,
            initialSize: '0px',  // Start glow from off
            peakSize: '6px',
            finalSize: VISUAL_STATES.DIMLY_LIT.glowFinalSize,
            colorVar: '--btn-dimly-lit-glow-color',
            sizeVar: '--btn-dimly-lit-glow-size',
            opacityVar: '--btn-dimly-lit-glow-opacity',
            scaleWithAmplitude: true
        },
        targetProperty: 'button-lights-and-frame'
    },
    buttonFlickerFromDimlyLitToFullyLitUnselected: {
        numCycles: 7, periodStart: 0.1, periodEnd: 0.04, onDurationRatio: 0.4,
        amplitudeStart: VISUAL_STATES.DIMLY_LIT.amplitudeEnd,
        amplitudeEnd: VISUAL_STATES.FULLY_LIT_UNSELECTED.amplitudeEnd,
        glow: {
            initialOpacity: VISUAL_STATES.DIMLY_LIT.glowFinalOpacity,
            peakOpacity: 0.8,
            finalOpacity: VISUAL_STATES.FULLY_LIT_UNSELECTED.glowFinalOpacity,
            initialSize: VISUAL_STATES.DIMLY_LIT.glowFinalSize,
            peakSize: '12px',
            finalSize: VISUAL_STATES.FULLY_LIT_UNSELECTED.glowFinalSize,
            colorVar: '--btn-glow-color',
            sizeVar: '--btn-glow-size',
            opacityVar: '--btn-glow-opacity',
            scaleWithAmplitude: false
        },
        targetProperty: 'button-lights-and-frame'
    },
    buttonFlickerFromDimlyLitToFullyLitSelected: {
        numCycles: 7, periodStart: 0.1, periodEnd: 0.04, onDurationRatio: 0.4,
        amplitudeStart: VISUAL_STATES.DIMLY_LIT.amplitudeEnd,
        amplitudeEnd: VISUAL_STATES.FULLY_LIT_SELECTED.amplitudeEnd,
        glow: {
            initialOpacity: VISUAL_STATES.DIMLY_LIT.glowFinalOpacity,
            peakOpacity: 1.0,
            finalOpacity: VISUAL_STATES.FULLY_LIT_SELECTED.glowFinalOpacity,
            initialSize: VISUAL_STATES.DIMLY_LIT.glowFinalSize,
            peakSize: '20px',
            finalSize: VISUAL_STATES.FULLY_LIT_SELECTED.glowFinalSize,
            colorVar: '--btn-glow-color',
            sizeVar: '--btn-glow-size',
            opacityVar: '--btn-glow-opacity',
            scaleWithAmplitude: false
        },
        targetProperty: 'button-lights-and-frame'
    },
    buttonFlickerFromDimlyLitToFullyLitUnselectedFast: { // New Fast Profile
        numCycles: 5, periodStart: 0.08, periodEnd: 0.03, onDurationRatio: 0.4,
        amplitudeStart: VISUAL_STATES.DIMLY_LIT.amplitudeEnd,
        amplitudeEnd: VISUAL_STATES.FULLY_LIT_UNSELECTED.amplitudeEnd,
        glow: {
            initialOpacity: VISUAL_STATES.DIMLY_LIT.glowFinalOpacity,
            peakOpacity: 0.8,
            finalOpacity: VISUAL_STATES.FULLY_LIT_UNSELECTED.glowFinalOpacity,
            initialSize: VISUAL_STATES.DIMLY_LIT.glowFinalSize,
            peakSize: '10px',
            finalSize: VISUAL_STATES.FULLY_LIT_UNSELECTED.glowFinalSize,
            colorVar: '--btn-glow-color',
            sizeVar: '--btn-glow-size',
            opacityVar: '--btn-glow-opacity',
            scaleWithAmplitude: false
        },
        targetProperty: 'button-lights-and-frame'
    },
    buttonFlickerFromDimlyLitToFullyLitSelectedFast: { // New Fast Profile
        numCycles: 5, periodStart: 0.08, periodEnd: 0.03, onDurationRatio: 0.4,
        amplitudeStart: VISUAL_STATES.DIMLY_LIT.amplitudeEnd,
        amplitudeEnd: VISUAL_STATES.FULLY_LIT_SELECTED.amplitudeEnd,
        glow: {
            initialOpacity: VISUAL_STATES.DIMLY_LIT.glowFinalOpacity,
            peakOpacity: 0.9,
            finalOpacity: VISUAL_STATES.FULLY_LIT_SELECTED.glowFinalOpacity,
            initialSize: VISUAL_STATES.DIMLY_LIT.glowFinalSize,
            peakSize: '18px',
            finalSize: VISUAL_STATES.FULLY_LIT_SELECTED.glowFinalSize,
            colorVar: '--btn-glow-color',
            sizeVar: '--btn-glow-size',
            opacityVar: '--btn-glow-opacity',
            scaleWithAmplitude: false
        },
        targetProperty: 'button-lights-and-frame'
    },
    buttonFlickerFromUnlitToFullyLitUnselected: {
        numCycles: 9, periodStart: 0.18, periodEnd: 0.07, onDurationRatio: 0.35,
        amplitudeStart: 0.0,
        amplitudeEnd: VISUAL_STATES.FULLY_LIT_UNSELECTED.amplitudeEnd,
        glow: {
            initialOpacity: 0.0,
            peakOpacity: 0.9,
            finalOpacity: VISUAL_STATES.FULLY_LIT_UNSELECTED.glowFinalOpacity,
            initialSize: '0px',
            peakSize: '16px',
            finalSize: VISUAL_STATES.FULLY_LIT_UNSELECTED.glowFinalSize,
            colorVar: '--btn-glow-color',
            sizeVar: '--btn-glow-size',
            opacityVar: '--btn-glow-opacity',
            scaleWithAmplitude: false
        },
        targetProperty: 'button-lights-and-frame'
    },
    buttonFlickerFromUnlitToFullyLitSelected: {
        numCycles: 9, periodStart: 0.18, periodEnd: 0.07, onDurationRatio: 0.35,
        amplitudeStart: 0.0,
        amplitudeEnd: VISUAL_STATES.FULLY_LIT_SELECTED.amplitudeEnd,
        glow: {
            initialOpacity: 0.0,
            peakOpacity: 1.0,
            finalOpacity: VISUAL_STATES.FULLY_LIT_SELECTED.glowFinalOpacity,
            initialSize: '0px',
            peakSize: '20px',
            finalSize: VISUAL_STATES.FULLY_LIT_SELECTED.glowFinalSize,
            colorVar: '--btn-glow-color',
            sizeVar: '--btn-glow-size',
            opacityVar: '--btn-glow-opacity',
            scaleWithAmplitude: false
        },
        targetProperty: 'button-lights-and-frame'
    }
};

export function estimateFlickerDuration(profileName) {
    const profile = ADVANCED_FLICKER_PROFILES[profileName];
    if (!profile) return 0.2;

    let totalDuration = 0;
    for (let i = 0; i < profile.numCycles; i++) {
        const cycleProgress = profile.numCycles > 1 ? i / (profile.numCycles - 1) : 1;
        const currentPeriod = profile.periodStart + cycleProgress * (profile.periodEnd - profile.periodStart);
        totalDuration += currentPeriod;
    }
    const finalSettleDuration = Math.max(0.15, profile.periodEnd * 1.5);
    totalDuration += finalSettleDuration;
    return totalDuration;
}