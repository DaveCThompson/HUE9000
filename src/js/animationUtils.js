/**
 * @module animationUtils
 * @description Provides utility functions for creating complex animations,
 * such as advanced flicker and glow effects.
 */
import { gsap } from "gsap"; // Import gsap
import { ADVANCED_FLICKER_PROFILES } from './config.js';

/**
 * Helper function to retrieve a glow parameter, supporting selected/unselected differentiation.
 * @param {object} glowProfile - The glow sub-object from the main profile.
 * @param {string} paramName - The base name of the parameter (e.g., 'initialOpacity', 'finalSize').
 * @param {any} [defaultValue=0] - Default value if the parameter is not found.
 * @returns {any} The resolved parameter value.
 */
function getGlowParam(glowProfile, paramName, defaultValue = 0) {
    if (!glowProfile) return defaultValue;

    const baseValue = glowProfile[paramName];

    if (typeof baseValue === 'object' && baseValue !== null && (Object.prototype.hasOwnProperty.call(baseValue, 'selected') || Object.prototype.hasOwnProperty.call(baseValue, 'unselected'))) {
        // Differentiated parameter
        return glowProfile.isButtonSelected ? baseValue.selected : baseValue.unselected;
    }
    // Single value or not defined (will fallback to defaultValue if undefined)
    return baseValue !== undefined ? baseValue : defaultValue;
}


/**
 * Creates an advanced flicker and glow GSAP timeline.
 *
 * @param {HTMLElement | HTMLElement[]} targets - The DOM element(s) to animate.
 * @param {string | object} profileOrParams - The name of a profile from ADVANCED_FLICKER_PROFILES in config.js,
 *                                            or a parameter object matching the profile structure.
 * @param {object} [options={}] - Additional options.
 * @param {string} [options.lightTargetSelector='.light'] - Selector for light elements within button targets.
 * @param {object} [options.overrideGlowParams={}] - Object to override specific glow parameters from the profile.
 * @param {Function} [options.onStart] - Callback function when the timeline starts.
 * @param {Function} [options.onComplete] - Callback function when the timeline completes.
 * @param {Function} [options.onUpdate] - Callback function on every update.
 * @returns {gsap.core.Timeline} The created GSAP timeline.
 */
export function createAdvancedFlicker(targets, profileOrParams, options = {}) {
    // console.log(`[animationUtils createAdvancedFlicker] Called. Targets:`, targets, `Profile/Params:`, profileOrParams, `Options:`, options);

    const defaults = {
        lightTargetSelector: '.light',
        overrideGlowParams: {},
        onStart: null,
        onComplete: null,
        onUpdate: null,
    };
    const config = { ...defaults, ...options };

    let profile = typeof profileOrParams === 'string'
        ? ADVANCED_FLICKER_PROFILES[profileOrParams]
        : profileOrParams;

    if (!profile) {
        console.warn(`[animationUtils createAdvancedFlicker] Profile not found or invalid:`, profileOrParams, `. Using default empty timeline.`);
        const tl = gsap.timeline(); 
        if (config.onComplete) tl.eventCallback("onComplete", config.onComplete);
        return tl.to({}, { duration: 0.01 }); 
    }
    
    profile.glow = { ...(profile.glow || {}), ...config.overrideGlowParams };


    const elementsToAnimate = Array.isArray(targets) ? targets : [targets];
    if (elementsToAnimate.length === 0 || !elementsToAnimate[0]) {
        console.warn(`[animationUtils createAdvancedFlicker] No valid target elements provided.`);
        const tl = gsap.timeline(); 
        if (config.onComplete) tl.eventCallback("onComplete", config.onComplete);
        return tl.to({}, { duration: 0.01 });
    }

    const tl = gsap.timeline({ 
        onStart: config.onStart,
        onComplete: config.onComplete,
        onUpdate: config.onUpdate,
    });

    let baseTargetsForOpacity = elementsToAnimate;
    if (profile.targetProperty === 'button-lights-and-frame') {
        const lightElements = [];
        elementsToAnimate.forEach(el => {
            const lights = el.querySelectorAll(config.lightTargetSelector);
            if (lights.length > 0) lightElements.push(...Array.from(lights));
        });
        if (lightElements.length > 0) {
            baseTargetsForOpacity = lightElements;
        }
    } else if (profile.targetProperty === 'text-shadow-opacity-and-blur') {
        baseTargetsForOpacity = elementsToAnimate;
    }

    tl.set(baseTargetsForOpacity, { autoAlpha: 0, immediateRender: true });

    if (profile.glow && profile.glow.colorVar) {
        const initialGlowCSS = {};
        const initialGlowOpacity = getGlowParam(profile.glow, 'initialOpacity', 0);
        const initialGlowSize = getGlowParam(profile.glow, 'initialSize', '0px');

        if (profile.glow.opacityVar) initialGlowCSS[profile.glow.opacityVar] = initialGlowOpacity;
        if (profile.glow.sizeVar) initialGlowCSS[profile.glow.sizeVar] = typeof initialGlowSize === 'number' ? `${initialGlowSize}px` : initialGlowSize;
        
        if (profile.targetProperty === 'text-shadow-opacity-and-blur' && profile.glow.animatedProperties) {
            if (profile.glow.animatedProperties.opacity) initialGlowCSS[profile.glow.animatedProperties.opacity] = initialGlowOpacity;
            if (profile.glow.animatedProperties.blur) initialGlowCSS[profile.glow.animatedProperties.blur] = typeof initialGlowSize === 'number' ? `${initialGlowSize}px` : initialGlowSize;
        }
        
        if (Object.keys(initialGlowCSS).length > 0) {
             tl.set(elementsToAnimate, { css: initialGlowCSS, immediateRender: true });
        }
    }

    let currentTime = 0;

    for (let i = 0; i < profile.numCycles; i++) {
        const cycleProgress = profile.numCycles > 1 ? i / (profile.numCycles - 1) : 1;


        const currentPeriod = profile.periodStart + cycleProgress * (profile.periodEnd - profile.periodStart);
        const onDuration = currentPeriod * profile.onDurationRatio;
        const offDuration = currentPeriod * (1 - profile.onDurationRatio);

        const currentAmplitude = profile.amplitudeStart + cycleProgress * (profile.amplitudeEnd - profile.amplitudeStart);
        
        const glowPeakProgress = profile.numCycles > 1 ? Math.min(1, (i + 0.5) / (profile.numCycles -1)) : 1; // Ensure peak can be reached

        const currentInitialOpacity = getGlowParam(profile.glow, 'initialOpacity', 0);
        const currentPeakOpacity = getGlowParam(profile.glow, 'peakOpacity', 0);
        const currentGlowOpacityValue = currentInitialOpacity + glowPeakProgress * (currentPeakOpacity - currentInitialOpacity);

        const currentInitialSize = getGlowParam(profile.glow, 'initialSize', '0px');
        const currentPeakSize = getGlowParam(profile.glow, 'peakSize', '0px');
        const parseSize = (sizeStr) => typeof sizeStr === 'string' ? parseFloat(sizeStr) : (sizeStr || 0);
        const initialNumericSize = parseSize(currentInitialSize);
        const peakNumericSize = parseSize(currentPeakSize);
        const currentGlowSizeValue = initialNumericSize + glowPeakProgress * (peakNumericSize - initialNumericSize);

        const onState = { autoAlpha: currentAmplitude, duration: onDuration, ease: "power1.inOut" };
        const onGlowCSS = {};
        if (profile.glow && profile.glow.colorVar) {
            const glowOpacityForTween = profile.glow.scaleWithAmplitude ? currentGlowOpacityValue * currentAmplitude : currentGlowOpacityValue;
            if (profile.glow.opacityVar) onGlowCSS[profile.glow.opacityVar] = glowOpacityForTween;
            if (profile.glow.sizeVar) onGlowCSS[profile.glow.sizeVar] = `${currentGlowSizeValue}px`;
            
            if (profile.targetProperty === 'text-shadow-opacity-and-blur' && profile.glow.animatedProperties) {
                if (profile.glow.animatedProperties.opacity) onGlowCSS[profile.glow.animatedProperties.opacity] = glowOpacityForTween;
                if (profile.glow.animatedProperties.blur) onGlowCSS[profile.glow.animatedProperties.blur] = `${currentGlowSizeValue}px`;
            }
        }
        tl.to(baseTargetsForOpacity, onState, currentTime);
        if (Object.keys(onGlowCSS).length > 0) {
            tl.to(elementsToAnimate, { css: onGlowCSS, duration: onDuration, ease: "power1.inOut" }, currentTime); 
        }
        currentTime += onDuration;

        if (i < profile.numCycles - 1) {
            const offState = { autoAlpha: 0, duration: offDuration, ease: "power1.inOut" };
            const offGlowCSS = {};
             const initialGlowOpacityOff = getGlowParam(profile.glow, 'initialOpacity', 0);
             const initialGlowSizeOff = getGlowParam(profile.glow, 'initialSize', '0px');

            if (profile.glow && profile.glow.colorVar) {
                if (profile.glow.opacityVar) offGlowCSS[profile.glow.opacityVar] = initialGlowOpacityOff; 
                if (profile.glow.sizeVar) offGlowCSS[profile.glow.sizeVar] = typeof initialGlowSizeOff === 'number' ? `${initialGlowSizeOff}px` : initialGlowSizeOff;
                
                if (profile.targetProperty === 'text-shadow-opacity-and-blur' && profile.glow.animatedProperties) {
                    if (profile.glow.animatedProperties.opacity) offGlowCSS[profile.glow.animatedProperties.opacity] = initialGlowOpacityOff;
                    if (profile.glow.animatedProperties.blur) offGlowCSS[profile.glow.animatedProperties.blur] = typeof initialGlowSizeOff === 'number' ? `${initialGlowSizeOff}px` : initialGlowSizeOff;
                }
            }
            tl.to(baseTargetsForOpacity, offState, currentTime);
            if (Object.keys(offGlowCSS).length > 0) {
                tl.to(elementsToAnimate, { css: offGlowCSS, duration: offDuration, ease: "power1.inOut" }, currentTime); 
            }
            currentTime += offDuration;
        }
    }

    const finalSettleDuration = Math.max(0.1, profile.periodEnd); 
    const finalState = { autoAlpha: profile.amplitudeEnd, duration: finalSettleDuration, ease: "sine.out" };
    const finalGlowCSS = {};
    if (profile.glow && profile.glow.colorVar) {
        const finalGlowOpacityValue = getGlowParam(profile.glow, 'finalOpacity', 0);
        const finalGlowSizeValue = getGlowParam(profile.glow, 'finalSize', '0px');

        if (profile.glow.opacityVar) finalGlowCSS[profile.glow.opacityVar] = finalGlowOpacityValue;
        if (profile.glow.sizeVar) finalGlowCSS[profile.glow.sizeVar] = typeof finalGlowSizeValue === 'number' ? `${finalGlowSizeValue}px` : finalGlowSizeValue;
        
        if (profile.targetProperty === 'text-shadow-opacity-and-blur' && profile.glow.animatedProperties) {
            if (profile.glow.animatedProperties.opacity) finalGlowCSS[profile.glow.animatedProperties.opacity] = finalGlowOpacityValue;
            if (profile.glow.animatedProperties.blur) finalGlowCSS[profile.glow.animatedProperties.blur] = typeof finalGlowSizeValue === 'number' ? `${finalGlowSizeValue}px` : finalGlowSizeValue;
        }
    }
    tl.to(baseTargetsForOpacity, finalState, currentTime);
    if (Object.keys(finalGlowCSS).length > 0) {
        tl.to(elementsToAnimate, { css: finalGlowCSS, duration: finalSettleDuration, ease: "sine.out" }, currentTime); 
    }
    
    return tl;
}