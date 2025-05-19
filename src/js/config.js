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
export const APP_LOAD_FADE_IN_DURATION = 0.3; 
export const BODY_FADE_IN_DURATION = 0.3; // Alias for APP_LOAD_FADE_IN_DURATION or specific if different
export const ATTENUATION_DURATION = 0.5; // For P1 dim attenuation fade out
export const P2_MAINPWR_PRE_PRIME_DURATION = 0.2; // For P2 main power button dim priming
export const LENS_STARTUP_TARGET_POWER = 25;    // Target power percentage (0-100) for P3 lens glow
export const LENS_STARTUP_RAMP_DURATION = 1500; // Duration in ms for lens to ramp to target power (Phase 3)
export const P3_LENS_RAMP_DURATION_S = LENS_STARTUP_RAMP_DURATION / 1000; // P3 Lens ramp duration in seconds
export const P4_BUTTON_FADE_STAGGER = 0.03; // Stagger for P4 button priming
export const P6_BUTTON_ENERGIZE_FLICKER_STAGGER = 0.02; // Stagger for P6 button energizing
export const P6_CSS_TRANSITION_DURATION = 0.5; // Duration for P6 theme CSS transition
export const P7_EFFECTIVE_DURATION = 0.1; // Effective duration for P7 (System Ready) display
export const MIN_PHASE_DURATION_FOR_STEPPING = 0.05; // Minimum duration for a phase in step-through mode

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

// console.log("[Config] Configuration loaded (REFACTOR-V2.1)");