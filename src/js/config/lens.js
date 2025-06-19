/**
 * @module config/lens
 * @description Configuration constants for the main visual lens, including
 * oscillation behavior and gradient definitions.
 */

// --- Lens Visuals & Oscillation Configuration ---

/** @const {number} The power threshold (0-1) at which oscillation effects begin. */
export const LENS_OSCILLATION_THRESHOLD = 0.7;

/** @const {number} The default smoothing duration in seconds for lens power changes. */
export const LENS_OSCILLATION_SMOOTHING_DURATION = 0.2;

/** @const {number} The default smoothing duration in seconds for lens hue changes. */
export const LENS_OSCILLATION_HUE_SMOOTHING_DURATION = 0.2;

/** @const {number} The delay in milliseconds before restarting oscillation after interaction. */
export const LENS_OSCILLATION_RESTART_DELAY = 250;

/** @const {number} The minimum amplitude of the power oscillation. */
export const LENS_OSCILLATION_AMPLITUDE_MIN = 0.005;

/** @const {number} The additional amplitude added at maximum power. */
export const LENS_OSCILLATION_AMPLITUDE_MAX_ADDITION = 0.045;

/** @const {number} The oscillation period in seconds at the threshold power. */
export const LENS_OSCILLATION_PERIOD_AT_THRESHOLD = 9.0;

/** @const {number} The oscillation period in seconds at maximum power. */
export const LENS_OSCILLATION_PERIOD_AT_MAX_POWER = 1.8;

/** @const {number} The hue offset in degrees for the lens hotspot color. */
export const LENS_HOTSPOT_HUE_OFFSET = 75.0;

/** @const {number} A scaling factor for the position of gradient stops. */
export const LENS_GRADIENT_POSITION_SCALE = 0.85;

const BP1_POWER = 0.00; const BP2_POWER = 0.33; const BP3_POWER = 0.66; const BP4_POWER = 1.00; const BP5_POWER = 1.05;
const scaleStops = (stops, scale) => stops.map(stop => ({ ...stop, pos: stop.pos * scale }));

/** @const {object[]} The breakpoints for the lens color gradient, defining stops at different power levels. */
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

/** @const {number} The number of stops in each lens gradient breakpoint. */
export const NUM_LENS_GRADIENT_STOPS = LENS_GRADIENT_BREAKPOINTS[0].stops.length;

// --- Startup Sequence Specific Lens Config ---

/** @const {number} The target power percentage for the lens during the startup sequence. */
export const LENS_STARTUP_TARGET_POWER = 25;

/** @const {number} The duration in milliseconds for the lens ramp-up during startup. */
export const LENS_STARTUP_RAMP_DURATION_MS = 1500;