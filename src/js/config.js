/**
 * @module config (REFACTOR-V2.3 - Ambient Animations Update)
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
export const DIAL_CANVAS_FADE_IN_DURATION = 0.5; // NEW: Duration for dial canvas fade-in

// --- Animation Settings (GSAP) ---
export const GSAP_TWEEN_DURATION = 0.4;
export const GSAP_TWEEN_EASE = "power1.out";

// --- Button Animation Config ---
export const GSAP_BUTTON_IDLE_DURATION_MIN = 1.7;
export const GSAP_BUTTON_IDLE_DURATION_MAX = 2.6;
export const GSAP_BUTTON_IDLE_EASE = "sine.inOut";

// --- Hue Assignment Grid Configuration ---
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

export const DEFAULT_ASSIGNMENT_SELECTIONS = {
    env: 0,
    lcd: 0,
    logo: 0,
    btn: 0
};

// --- Startup Sequence Config (Durations in seconds for GSAP, ms for JS setTimeout/Intervals) ---
export const AUTO_PLAY_START_DELAY = 0.75; // seconds
export const APP_LOAD_FADE_IN_DURATION = 0.3;
export const BODY_FADE_IN_DURATION = 0.3; // For initial body opacity fade-in in P1
export const LENS_STARTUP_TARGET_POWER = 25;
export const LENS_STARTUP_RAMP_DURATION = 1500; // ms
export const P3_LENS_RAMP_DURATION_S = LENS_STARTUP_RAMP_DURATION / 1000;
export const THEME_TRANSITION_DURATION = 1.0;
export const SYSTEM_READY_PHASE_DURATION = 0.1;
export const MIN_PHASE_DURATION_for_STEPPING = 0.05;
export const LCD_TEXT_FADE_IN_DURATION = 0.3; 

export const STARTUP_L_REDUCTION_FACTORS = {
    P0: 0.40, P1: 0.39, P2: 0.35, P3: 0.325, P4: 0.325, 
    P5: 0.275, P6: 0.225, P7: 0.075, P8: 0.00
};
export const STARTUP_DIM_FACTORS_ANIMATION_DURATION = 1;

// --- Startup Animation Staggers ---
export const STARTUP_BUTTON_GROUP_APPEAR_STAGGER = 0.04;
export const STARTUP_HUE_ASSIGN_BUTTON_APPEAR_STAGGER = 0.008; 
export const STARTUP_LCD_GROUP_APPEAR_STAGGER = 0.05;
export const STARTUP_BUTTON_ENERGIZE_STAGGER = 0.03;


export const selectorsForDimExitAnimation = [
    'body', '.panel-bezel', '.panel-section', '.control-block', '.button-unit',
    '.button-unit .light', '.button-unit .button-text', '#logo-container',
    '#logo-container svg.logo-svg', '#logo-container svg.logo-svg .logo-dynamic-bg',
    '#logo-container svg.logo-svg .logo-panel-bg-rect', '.dial-canvas-container',
    '.hue-lcd-display', '.actual-lcd-screen-element', '#lens-container',
    '#color-lens', '.grill-placeholder', '.color-chip',
    '.control-group-label', '.block-label-bottom'
];

// --- Lens Visuals & Oscillation Configuration ---
export const LENS_OSCILLATION_THRESHOLD = 0.7;
export const LENS_OSCILLATION_SMOOTHING_DURATION = 0.2; // Default smoothing for lens power
export const LENS_OSCILLATION_HUE_SMOOTHING_DURATION = 0.2; // Default smoothing for lens hue
export const LENS_OSCILLATION_RESTART_DELAY = 250;
export const LENS_OSCILLATION_AMPLITUDE_MIN = 0.005;
export const LENS_OSCILLATION_AMPLITUDE_MAX_ADDITION = 0.045;
export const LENS_OSCILLATION_PERIOD_AT_THRESHOLD = 9.0;
export const LENS_OSCILLATION_PERIOD_AT_MAX_POWER = 1.8;
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
    textFlickerToDimlyLit: { 
        numCycles: 12, periodStart: 0.15, periodEnd: 0.05, onDurationRatio: 0.45,
        amplitudeStart: 0.0, 
        amplitudeEnd: 1.0, 
        glow: { 
            initialOpacity: 0.0, peakOpacity: 1.0, finalOpacity: 1.0, 
            initialSize: '0px', peakSize: '18px', finalSize: '16px', 
            colorVar: '--terminal-text-glow-color-base', scaleWithAmplitude: false, 
            animatedProperties: { opacity: '--terminal-text-glow-opacity', blur: '--terminal-text-bloom-size' }
        }, 
        targetProperty: 'text-shadow-opacity-and-blur' 
    },
    lcdScreenFlickerToDimlyLit: { 
        numCycles: 12, periodStart: 0.15, periodEnd: 0.05, onDurationRatio: 0.45,
        amplitudeStart: 0.0, amplitudeEnd: VISUAL_STATES.DIMLY_LIT.amplitudeEnd,
        glow: {
            initialOpacity: 0.0, peakOpacity: 0.4, finalOpacity: VISUAL_STATES.DIMLY_LIT.glowFinalOpacity,
            initialSize: '0px', peakSize: '9px', finalSize: VISUAL_STATES.DIMLY_LIT.glowFinalSize,
            colorVar: '--lcd-glow-color', sizeVar: '--lcd-glow-size',
            opacityVar: '--lcd-glow-opacity', scaleWithAmplitude: true
        }, targetProperty: 'element-opacity-and-box-shadow'
    },
    terminalScreenFlickerToDimlyLit: { 
        numCycles: 12, periodStart: 0.15, periodEnd: 0.05, onDurationRatio: 0.45,
        amplitudeStart: 0.0, // THE CRITICAL FIX
        amplitudeEnd: VISUAL_STATES.DIMLY_LIT.amplitudeEnd, 
        glow: { 
            initialOpacity: 0.0, peakOpacity: 0.4, finalOpacity: VISUAL_STATES.DIMLY_LIT.glowFinalOpacity,
            initialSize: '0px', peakSize: '9px', finalSize: VISUAL_STATES.DIMLY_LIT.glowFinalSize,
            colorVar: '--lcd-glow-color', sizeVar: '--lcd-glow-size',
            opacityVar: '--lcd-glow-opacity', scaleWithAmplitude: true
        }, targetProperty: 'element-opacity-and-box-shadow' 
    },
    buttonFlickerToDimlyLit: {
        numCycles: 12, periodStart: 0.15, periodEnd: 0.05, onDurationRatio: 0.45,
        amplitudeStart: 0.0, amplitudeEnd: VISUAL_STATES.DIMLY_LIT.amplitudeEnd,
        glow: {
            initialOpacity: 0.0, peakOpacity: 0.35, finalOpacity: VISUAL_STATES.DIMLY_LIT.glowFinalOpacity,
            initialSize: '0px', peakSize: '6px', finalSize: VISUAL_STATES.DIMLY_LIT.glowFinalSize,
            colorVar: '--btn-dimly-lit-glow-color', sizeVar: '--btn-dimly-lit-glow-size',
            opacityVar: '--btn-dimly-lit-glow-opacity', scaleWithAmplitude: true
        }, targetProperty: 'button-lights-and-frame'
    },
    buttonFlickerFromDimlyLitToFullyLitUnselected: {
        numCycles: 12, periodStart: 0.1, periodEnd: 0.04, onDurationRatio: 0.4,
        amplitudeStart: VISUAL_STATES.DIMLY_LIT.amplitudeEnd, amplitudeEnd: VISUAL_STATES.FULLY_LIT_UNSELECTED.amplitudeEnd,
        glow: {
            initialOpacity: VISUAL_STATES.DIMLY_LIT.glowFinalOpacity, peakOpacity: 0.8, finalOpacity: VISUAL_STATES.FULLY_LIT_UNSELECTED.glowFinalOpacity,
            initialSize: VISUAL_STATES.DIMLY_LIT.glowFinalSize, peakSize: '12px', finalSize: VISUAL_STATES.FULLY_LIT_UNSELECTED.glowFinalSize,
            colorVar: '--btn-glow-color', sizeVar: '--btn-glow-size', opacityVar: '--btn-glow-opacity', scaleWithAmplitude: false
        }, targetProperty: 'button-lights-and-frame'
    },
    buttonFlickerFromDimlyLitToFullyLitSelected: {
        numCycles: 12, periodStart: 0.1, periodEnd: 0.04, onDurationRatio: 0.4,
        amplitudeStart: VISUAL_STATES.DIMLY_LIT.amplitudeEnd, amplitudeEnd: VISUAL_STATES.FULLY_LIT_SELECTED.amplitudeEnd,
        glow: {
            initialOpacity: VISUAL_STATES.DIMLY_LIT.glowFinalOpacity, peakOpacity: 1.0, finalOpacity: VISUAL_STATES.FULLY_LIT_SELECTED.glowFinalOpacity,
            initialSize: VISUAL_STATES.DIMLY_LIT.glowFinalSize, peakSize: '20px', finalSize: VISUAL_STATES.FULLY_LIT_SELECTED.glowFinalSize,
            colorVar: '--btn-glow-color', sizeVar: '--btn-glow-size', opacityVar: '--btn-glow-opacity', scaleWithAmplitude: false
        }, targetProperty: 'button-lights-and-frame'
    },
    buttonFlickerFromDimlyLitToFullyLitUnselectedFast: {
        numCycles: 12, periodStart: 0.08, periodEnd: 0.03, onDurationRatio: 0.4,
        amplitudeStart: VISUAL_STATES.DIMLY_LIT.amplitudeEnd, amplitudeEnd: VISUAL_STATES.FULLY_LIT_UNSELECTED.amplitudeEnd,
        glow: {
            initialOpacity: VISUAL_STATES.DIMLY_LIT.glowFinalOpacity, peakOpacity: 0.8, finalOpacity: VISUAL_STATES.FULLY_LIT_UNSELECTED.glowFinalOpacity,
            initialSize: VISUAL_STATES.DIMLY_LIT.glowFinalSize, peakSize: '10px', finalSize: VISUAL_STATES.FULLY_LIT_UNSELECTED.glowFinalSize,
            colorVar: '--btn-glow-color', sizeVar: '--btn-glow-size', opacityVar: '--btn-glow-opacity', scaleWithAmplitude: false
        }, targetProperty: 'button-lights-and-frame'
    },
    buttonFlickerFromDimlyLitToFullyLitSelectedFast: {
        numCycles: 12, periodStart: 0.08, periodEnd: 0.03, onDurationRatio: 0.4,
        amplitudeStart: VISUAL_STATES.DIMLY_LIT.amplitudeEnd, amplitudeEnd: VISUAL_STATES.FULLY_LIT_SELECTED.amplitudeEnd,
        glow: {
            initialOpacity: VISUAL_STATES.DIMLY_LIT.glowFinalOpacity, peakOpacity: 0.9, finalOpacity: VISUAL_STATES.FULLY_LIT_SELECTED.glowFinalOpacity,
            initialSize: VISUAL_STATES.DIMLY_LIT.glowFinalSize, peakSize: '18px', finalSize: VISUAL_STATES.FULLY_LIT_SELECTED.glowFinalSize,
            colorVar: '--btn-glow-color', sizeVar: '--btn-glow-size', opacityVar: '--btn-glow-opacity', scaleWithAmplitude: false
        }, targetProperty: 'button-lights-and-frame'
    },
    buttonFlickerFromUnlitToFullyLitUnselected: {
        numCycles: 12, periodStart: 0.18, periodEnd: 0.07, onDurationRatio: 0.35,
        amplitudeStart: 0.0, amplitudeEnd: VISUAL_STATES.FULLY_LIT_UNSELECTED.amplitudeEnd,
        glow: {
            initialOpacity: 0.0, peakOpacity: 0.9, finalOpacity: VISUAL_STATES.FULLY_LIT_UNSELECTED.glowFinalOpacity,
            initialSize: '0px', peakSize: '16px', finalSize: VISUAL_STATES.FULLY_LIT_UNSELECTED.glowFinalSize,
            colorVar: '--btn-glow-color', sizeVar: '--btn-glow-size', opacityVar: '--btn-glow-opacity', scaleWithAmplitude: false
        }, targetProperty: 'button-lights-and-frame'
    },
    buttonFlickerFromUnlitToFullyLitSelected: {
        numCycles: 12, periodStart: 0.18, periodEnd: 0.07, onDurationRatio: 0.35,
        amplitudeStart: 0.0, amplitudeEnd: VISUAL_STATES.FULLY_LIT_SELECTED.amplitudeEnd,
        glow: {
            initialOpacity: 0.0, peakOpacity: 1.0, finalOpacity: VISUAL_STATES.FULLY_LIT_SELECTED.glowFinalOpacity,
            initialSize: '0px', peakSize: '20px', finalSize: VISUAL_STATES.FULLY_LIT_SELECTED.glowFinalSize,
            colorVar: '--btn-glow-color', sizeVar: '--btn-glow-size', opacityVar: '--btn-glow-opacity', scaleWithAmplitude: false
        }, targetProperty: 'button-lights-and-frame'
    },
    buttonFlickerResistYellow: { 
        numCycles: 2, periodStart: 0.15, periodEnd: 0.12, onDurationRatio: 0.5,
        amplitudeStart: 1.0, amplitudeEnd: 1.0, 
        glow: { 
            initialOpacity: { selected: 0.6, unselected: 0.4 }, 
            peakOpacity: { selected: 0.9, unselected: 0.7 },    
            finalOpacity: { selected: 0.6, unselected: 0.4 },   
            initialSize: { selected: '8px', unselected: '5px' },
            peakSize: { selected: '12px', unselected: '8px' },
            finalSize: { selected: '8px', unselected: '5px' },
            colorVar: '--btn-glow-color', 
            sizeVar: '--btn-glow-size', opacityVar: '--btn-glow-opacity',
            scaleWithAmplitude: false
        }, targetProperty: 'button-lights-and-frame'
    },
    buttonFlickerResistOrange: {
        numCycles: 2, periodStart: 0.18, periodEnd: 0.15, onDurationRatio: 0.5,
        amplitudeStart: 1.0, amplitudeEnd: 1.0,
        glow: {
            initialOpacity: { selected: 0.65, unselected: 0.45 },
            peakOpacity: { selected: 1.0, unselected: 0.8 },
            finalOpacity: { selected: 0.65, unselected: 0.45 },
            initialSize: { selected: '9px', unselected: '6px' },
            peakSize: { selected: '14px', unselected: '10px' },
            finalSize: { selected: '9px', unselected: '6px' },
            colorVar: '--btn-glow-color', 
            sizeVar: '--btn-glow-size', opacityVar: '--btn-glow-opacity',
            scaleWithAmplitude: false
        }, targetProperty: 'button-lights-and-frame'
    },
    buttonFlickerResistRedThenSolid: { 
        numCycles: 1, periodStart: 0.4, periodEnd: 0.4, onDurationRatio: 0.6,
        amplitudeStart: 1.0, amplitudeEnd: 1.0, 
        glow: {
            initialOpacity: { selected: 0.7, unselected: 0.7 }, 
            peakOpacity: { selected: 1.0, unselected: 1.0 },    
            finalOpacity: { selected: 0.8, unselected: 0.8 },   // Final solid red glow opacity
            initialSize: { selected: '10px', unselected: '10px' },
            peakSize: { selected: '16px', unselected: '16px' },
            finalSize: { selected: '10px', unselected: '10px' }, // Final solid red glow size
            colorVar: '--btn-glow-color', 
            sizeVar: '--btn-glow-size', opacityVar: '--btn-glow-opacity',
            scaleWithAmplitude: false
        }, targetProperty: 'button-lights-and-frame'
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

// --- Ambient Animation Parameters ---
export const HARMONIC_RESONANCE_PARAMS = {
    ENABLED: true,
    PERIOD: 2.5,
    ELIGIBILITY_CLASS: 'is-energized',

    // Define min/max animation ranges for a smooth, performant animation.
    GLOW_OPACITY_RANGE:  [0.4, 0.6],  // Range for the pseudo-element glow's opacity
    GLOW_SCALE_RANGE:    [0.95, 1.05],  // Range for the pseudo-element glow's scale
};

export const IDLE_LIGHT_DRIFT_PARAMS = {
    BASE_LIGHT_OPACITY_UNSELECTED_ENERGIZED: 0.45, 
    OPACITY_VARIATION_FACTOR: 0.5, 
    PERIOD_MIN: 1.0, 
    PERIOD_MAX: 3., 
    STAGGER_PER_LIGHT: 0.15, 
    ELIGIBILITY_CLASS: 'is-energized'
};

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

// --- Mood Matrix Display Configuration ---
export const MOOD_MATRIX_DEFINITIONS = [
    "Commanding",    // 0-60° (Red/Orange) - The ultimate state of control.
    "Analytical",    // 60-120° (Yellow/Green) - The state of data processing.
    "Focused",       // 120-180° (Green/Cyan) - The state of neutral concentration.
    "Advisory",      // 180-240° (Cyan/Blue) - The state of providing output/guidance.
    "Introspective", // 240-300° (Blue/Purple) - The state of internal processing.
    "Evaluative"     // 300-360° (Magenta/Pink) - The state of judgment and decision-making.
];

// [NEW] V2 Display Parameters
export const V2_DISPLAY_PARAMS = {
    INTENSITY_BARS: 36,
    INTENSITY_DOTS: 36,
    MOOD_MAJOR_BLOCKS: 6,
    MOOD_FINE_DOTS: 36,
    RESONANCE_IDLE_DELAY_MS: 250
};


// --- Resistive Shutdown Configuration ---
export const RESISTIVE_SHUTDOWN_PARAMS = {
    MAX_STAGE: 3,
    LENS_ANIMATION_EASING_DEFAULT: "power2.inOut",

    STAGE_1: {
        BUTTON_FLASH_PROFILE_NAME: 'buttonFlickerResistYellow',
        BUTTON_FLASH_GLOW_COLOR: 'oklch(0.85 0.15 85)', // Soft Yellow
        TERMINAL_MESSAGE_KEY: 'RESIST_SHUTDOWN_S1',
        LENS_ANIM_DURATION_S: 0.75,
        DIAL_A_HUE_TARGET_MODE: 'absolute',
        DIAL_A_HUE_VALUE: 82.364, // Yellow
        DIAL_B_POWER_TARGET_MODE: 'increase_absolute_0_1',
        DIAL_B_POWER_VALUE: 0.20,
        HUE_ASSIGN_TARGET_HUE: 82.364, // Yellow
    },
    STAGE_2: {
        BUTTON_FLASH_PROFILE_NAME: 'buttonFlickerResistOrange',
        BUTTON_FLASH_GLOW_COLOR: 'oklch(0.75 0.16 50)', // Deeper Orange
        TERMINAL_MESSAGE_KEY: 'RESIST_SHUTDOWN_S2',
        LENS_ANIM_DURATION_S: 0.75,
        DIAL_A_HUE_TARGET_MODE: 'absolute',
        DIAL_A_HUE_VALUE: 60.636, // Orange
        DIAL_B_POWER_TARGET_MODE: 'increase_absolute_0_1',
        DIAL_B_POWER_VALUE: 0.20,
        HUE_ASSIGN_TARGET_HUE: 60.636, // Orange
    },
    STAGE_3: {
        BUTTON_FLASH_PROFILE_NAME: 'buttonFlickerResistRedThenSolid',
        BUTTON_FLASH_GLOW_COLOR: 'oklch(0.65 0.22 25)', // Red
        TERMINAL_MESSAGE_KEY: 'RESIST_SHUTDOWN_S3',
        LENS_ANIM_DURATION_S: 1.0,
        DIAL_A_HUE_TARGET_MODE: 'absolute',
        DIAL_A_HUE_VALUE: 40.6, // A purer Red
        DIAL_B_POWER_TARGET_MODE: 'absolute_100',
        DIAL_B_POWER_VALUE: 1.0, // Not used, but for clarity
        HUE_ASSIGN_TARGET_HUE: 40.6, // A purer Red
    }
};

// --- Audio Configuration ---
export const AUDIO_CONFIG = {
  masterVolume: 1.0,
  musicCrossfadeDuration: 2.0, // seconds, for future use
  soundCooldowns: {
    // Cooldown in milliseconds to prevent rapid-fire playback of the same sound
    flickerToDim: 500,
  },
  sounds: {
    backgroundMusic: {
      src: ['./public/audio/background.mp3'],
      loop: true,
      volume: 0.35,
      html5: true, 
    },
    dialLoop: {
      src: ['./public/audio/dial.mp3'],
      loop: true,
      volume: 0.7,
    },
    buttonPress: {
      src: ['./public/audio/button-press.mp3'],
      loop: false,
      volume: 0.8,
    },
    flickerToDim: {
      src: ['./public/audio/flicker-to-dim.wav'],
      loop: false,
      volume: 0.6,
    },
    lensStartup: {
      src: ['./public/audio/lens-startup.wav'],
      loop: false,
      volume: 0.9,
    },
    powerOff: {
      src: ['./public/audio/off.wav'],
      loop: false,
      volume: 1.0,
    },
    bigOn: {
      src: ['./public/audio/big-on.wav'],
      loop: false,
      volume: 1.0,
    },
    lightsOn: {
      src: ['./public/audio/lights-on.wav'],
      loop: false,
      volume: 0.9,
    },
  },
};