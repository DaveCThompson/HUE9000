/**
 * @module config/flickerProfiles
 * @description Configuration for advanced flicker and glow animations, and related utilities.
 */

/**
 * @typedef {object} VisualState
 * @property {number} amplitudeEnd - The final amplitude (opacity) of the target element.
 * @property {number} glowFinalOpacity - The final opacity of the glow effect.
 * @property {string} glowFinalSize - The final size (blur radius) of the glow effect.
 */
const VISUAL_STATES = {
    UNLIT: { amplitudeEnd: 0.05, glowFinalOpacity: 0.0, glowFinalSize: '0px' },
    DIMLY_LIT: { amplitudeEnd: 0.8, glowFinalOpacity: 0.2, glowFinalSize: '2px' },
    FULLY_LIT_UNSELECTED: { amplitudeEnd: 0.95, glowFinalOpacity: 0.6, glowFinalSize: '9px' },
    FULLY_LIT_SELECTED: { amplitudeEnd: 1.0, glowFinalOpacity: 0.8, glowFinalSize: '13px' },
};

/**
 * @typedef {object} FlickerGlowProfile
 * @property {number} initialOpacity - The initial opacity of the glow.
 * @property {number} peakOpacity - The peak opacity during a flicker cycle.
 * @property {number} finalOpacity - The final opacity after the animation.
 * @property {string} initialSize - The initial size (blur).
 * @property {string} peakSize - The peak size during a flicker cycle.
 * @property {string} finalSize - The final size after the animation.
 * @property {string} colorVar - The CSS variable for the glow color.
 * @property {string} [sizeVar] - The CSS variable for the glow size (if applicable).
 * @property {string} [opacityVar] - The CSS variable for the glow opacity (if applicable).
 * @property {boolean} scaleWithAmplitude - Whether the glow opacity scales with the element's amplitude.
 * @property {object} [animatedProperties] - Alternative animated properties for text-based glows.
 */

/**
 * @typedef {object} FlickerProfile
 * @property {number} numCycles - The number of flicker cycles.
 * @property {number} periodStart - The duration of the first cycle.
 * @property {number} periodEnd - The duration of the last cycle.
 * @property {number} onDurationRatio - The ratio of the cycle spent in the 'on' state.
 * @property {number} amplitudeStart - The starting amplitude (opacity) of the element.
 * @property {number} amplitudeEnd - The final amplitude (opacity) of the element.
 * @property {FlickerGlowProfile} glow - The configuration for the associated glow effect.
 * @property {string} targetProperty - The type of properties to animate (e.g., 'button-lights-and-frame').
 */
export const ADVANCED_FLICKER_PROFILES = {
    textFlickerToDimlyLit: { 
        numCycles: 9, 
        periodStart: 0.12, 
        periodEnd: 0.04, 
        onDurationRatio: 0.45,
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
        numCycles: 8, 
        periodStart: 0.13, 
        periodEnd: 0.04, 
        onDurationRatio: 0.45,
        amplitudeStart: 0.0, amplitudeEnd: VISUAL_STATES.DIMLY_LIT.amplitudeEnd,
        glow: {
            initialOpacity: 0.0, peakOpacity: 0.4, finalOpacity: VISUAL_STATES.DIMLY_LIT.glowFinalOpacity,
            initialSize: '0px', peakSize: '9px', finalSize: VISUAL_STATES.DIMLY_LIT.glowFinalSize,
            colorVar: '--lcd-glow-color', sizeVar: '--lcd-glow-size',
            opacityVar: '--lcd-glow-opacity', scaleWithAmplitude: true
        }, targetProperty: 'element-opacity-and-box-shadow'
    },
    terminalScreenFlickerToDimlyLit: { 
        numCycles: 8, 
        periodStart: 0.13, 
        periodEnd: 0.04, 
        onDurationRatio: 0.45,
        amplitudeStart: 0.0, 
        amplitudeEnd: VISUAL_STATES.DIMLY_LIT.amplitudeEnd, 
        glow: { 
            initialOpacity: 0.0, peakOpacity: 0.4, finalOpacity: VISUAL_STATES.DIMLY_LIT.glowFinalOpacity,
            initialSize: '0px', peakSize: '9px', finalSize: VISUAL_STATES.DIMLY_LIT.glowFinalSize,
            colorVar: '--lcd-glow-color', sizeVar: '--lcd-glow-size',
            opacityVar: '--lcd-glow-opacity', scaleWithAmplitude: true
        }, targetProperty: 'element-opacity-and-box-shadow' 
    },
    buttonFlickerToDimlyLit: {
        numCycles: 7, 
        periodStart: 0.12, 
        periodEnd: 0.04, 
        onDurationRatio: 0.4, 
        amplitudeStart: 0.1, 
        amplitudeEnd: VISUAL_STATES.DIMLY_LIT.amplitudeEnd,
        glow: {
            initialOpacity: 0.0, 
            peakOpacity: 0.35,    
            finalOpacity: VISUAL_STATES.DIMLY_LIT.glowFinalOpacity,
            initialSize: '0px',   
            peakSize: '5px',     
            finalSize: VISUAL_STATES.DIMLY_LIT.glowFinalSize,
            colorVar: '--btn-dimly-lit-glow-color', 
            sizeVar: '--btn-dimly-lit-glow-size',
            opacityVar: '--btn-dimly-lit-glow-opacity', 
            scaleWithAmplitude: true
        }, 
        targetProperty: 'button-lights-and-frame'
    },
    buttonFlickerFromDimlyLitToFullyLitUnselected: { // Reverted to more complex, but faster
        numCycles: 10, // Was 12 originally, then 3, now 10 for more activity
        periodStart: 0.08, // Faster than original 0.1
        periodEnd: 0.03,   // Faster than original 0.04
        onDurationRatio: 0.55, // Slightly shorter on-time than original 0.6 for quicker feel
        amplitudeStart: VISUAL_STATES.DIMLY_LIT.amplitudeEnd, 
        amplitudeEnd: VISUAL_STATES.FULLY_LIT_UNSELECTED.amplitudeEnd,
        glow: {
            initialOpacity: VISUAL_STATES.DIMLY_LIT.glowFinalOpacity, 
            peakOpacity: 0.75, // Closer to original peak (0.8)
            finalOpacity: VISUAL_STATES.FULLY_LIT_UNSELECTED.glowFinalOpacity,
            initialSize: VISUAL_STATES.DIMLY_LIT.glowFinalSize, 
            peakSize: '11px', // Closer to original peak ('12px')
            finalSize: VISUAL_STATES.FULLY_LIT_UNSELECTED.glowFinalSize,
            colorVar: '--btn-glow-color', sizeVar: '--btn-glow-size', opacityVar: '--btn-glow-opacity', scaleWithAmplitude: false
        }, targetProperty: 'button-lights-and-frame'
    },
    buttonFlickerFromDimlyLitToFullyLitSelected: { // Reverted to more complex, but faster
        numCycles: 10, // Was 12 originally, then 3, now 10
        periodStart: 0.08, // Faster than original 0.1
        periodEnd: 0.03,   // Faster than original 0.04
        onDurationRatio: 0.55, // Slightly shorter on-time than original 0.6
        amplitudeStart: VISUAL_STATES.DIMLY_LIT.amplitudeEnd, 
        amplitudeEnd: VISUAL_STATES.FULLY_LIT_SELECTED.amplitudeEnd,
        glow: {
            initialOpacity: VISUAL_STATES.DIMLY_LIT.glowFinalOpacity, 
            peakOpacity: 0.9, // Closer to original peak (1.0)
            finalOpacity: VISUAL_STATES.FULLY_LIT_SELECTED.glowFinalOpacity,
            initialSize: VISUAL_STATES.DIMLY_LIT.glowFinalSize, 
            peakSize: '18px', // Closer to original peak ('20px')
            finalSize: VISUAL_STATES.FULLY_LIT_SELECTED.glowFinalSize,
            colorVar: '--btn-glow-color', sizeVar: '--btn-glow-size', opacityVar: '--btn-glow-opacity', scaleWithAmplitude: false
        }, targetProperty: 'button-lights-and-frame'
    },
    buttonFlickerFromDimlyLitToFullyLitUnselectedFast: { // Reverted to more complex, but faster
        numCycles: 8, // Was 12 originally, then 2, now 8
        periodStart: 0.06, // Faster than original 0.08
        periodEnd: 0.02, // Faster than original 0.03
        onDurationRatio: 0.55, // Slightly shorter on-time than original 0.6
        amplitudeStart: VISUAL_STATES.DIMLY_LIT.amplitudeEnd, 
        amplitudeEnd: VISUAL_STATES.FULLY_LIT_UNSELECTED.amplitudeEnd,
        glow: {
            initialOpacity: VISUAL_STATES.DIMLY_LIT.glowFinalOpacity, 
            peakOpacity: 0.75, // Closer to original peak (0.8)
            finalOpacity: VISUAL_STATES.FULLY_LIT_UNSELECTED.glowFinalOpacity,
            initialSize: VISUAL_STATES.DIMLY_LIT.glowFinalSize, 
            peakSize: '9px', // Closer to original peak ('10px')
            finalSize: VISUAL_STATES.FULLY_LIT_UNSELECTED.glowFinalSize,
            colorVar: '--btn-glow-color', sizeVar: '--btn-glow-size', opacityVar: '--btn-glow-opacity', scaleWithAmplitude: false
        }, targetProperty: 'button-lights-and-frame'
    },
    buttonFlickerFromDimlyLitToFullyLitSelectedFast: { // Reverted to more complex, but faster
        numCycles: 8, // Was 12 originally, then 2, now 8
        periodStart: 0.06, // Faster than original 0.08
        periodEnd: 0.02, // Faster than original 0.03
        onDurationRatio: 0.55, // Slightly shorter on-time than original 0.6
        amplitudeStart: VISUAL_STATES.DIMLY_LIT.amplitudeEnd, 
        amplitudeEnd: VISUAL_STATES.FULLY_LIT_SELECTED.amplitudeEnd,
        glow: {
            initialOpacity: VISUAL_STATES.DIMLY_LIT.glowFinalOpacity, 
            peakOpacity: 0.85, // Closer to original peak (0.9)
            finalOpacity: VISUAL_STATES.FULLY_LIT_SELECTED.glowFinalOpacity,
            initialSize: VISUAL_STATES.DIMLY_LIT.glowFinalSize, 
            peakSize: '16px', // Closer to original peak ('18px')
            finalSize: VISUAL_STATES.FULLY_LIT_SELECTED.glowFinalSize,
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
            finalOpacity: { selected: 0.8, unselected: 0.8 },
            initialSize: { selected: '10px', unselected: '10px' },
            peakSize: { selected: '16px', unselected: '16px' },
            finalSize: { selected: '10px', unselected: '10px' },
            colorVar: '--btn-glow-color', 
            sizeVar: '--btn-glow-size', opacityVar: '--btn-glow-opacity',
            scaleWithAmplitude: false
        }, targetProperty: 'button-lights-and-frame'
    }
};

/**
 * Estimates the total duration of a flicker animation profile.
 * Co-located with profiles for maintainability.
 * @param {string} profileName - The name of the profile in ADVANCED_FLICKER_PROFILES.
 * @returns {number} The estimated duration in seconds.
 */
export function estimateFlickerDuration(profileName) {
    const profile = ADVANCED_FLICKER_PROFILES[profileName];
    if (!profile) return 0.2; 
    if (profile.numCycles === 0) return Math.max(0.01, profile.periodStart || 0.01);

    let totalDuration = 0;
    for (let i = 0; i < profile.numCycles; i++) {
        const cycleProgress = profile.numCycles > 1 ? i / (profile.numCycles - 1) : 1; 
        const currentPeriod = profile.periodStart + cycleProgress * (profile.periodEnd - profile.periodStart);
        totalDuration += currentPeriod;
    }
    
    const finalSettleDuration = Math.max(0.15, (profile.periodEnd || 0.1) * 1.5); 
    return totalDuration + finalSettleDuration;
}