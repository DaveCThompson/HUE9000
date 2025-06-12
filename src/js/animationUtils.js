/**
 * @module animationUtils
 * @description Provides utility functions for creating complex animations,
 * such as advanced flicker and glow effects.
 */
import { gsap as globalGsap } from "gsap"; // Import gsap, but we'll prefer injected if available
import { ADVANCED_FLICKER_PROFILES, PERCEPTUAL_AUDIO_OFFSET_MS } from './config.js';
import { serviceLocator } from './serviceLocator.js'; // Import serviceLocator

/**
 * Helper function to retrieve a glow parameter.
 * @param {object} glowProfile - The glow sub-object from the main profile.
 * @param {string} paramName - The base name of the parameter (e.g., 'initialOpacity', 'finalSize').
 * @param {any} [defaultValue=0] - Default value if the parameter is not found.
 * @returns {any} The resolved parameter value.
 */
function getGlowParam(glowProfile, paramName, defaultValue = 0) {
    if (!glowProfile) return defaultValue;
    const baseValue = glowProfile[paramName];

    if (typeof baseValue === 'object' && baseValue !== null &&
        glowProfile.hasOwnProperty('isButtonSelected') && 
        (Object.prototype.hasOwnProperty.call(baseValue, 'selected') || Object.prototype.hasOwnProperty.call(baseValue, 'unselected'))) {
        return glowProfile.isButtonSelected ? baseValue.selected : baseValue.unselected;
    }
    return baseValue !== undefined ? baseValue : defaultValue;
}


export function createAdvancedFlicker(targets, profileOrParams, options = {}) {
    // Prefer options.gsap if provided (from a manager that has the main instance), else use imported globalGsap
    const gsap = options.gsapInstance || globalGsap; 
    if (!gsap || typeof gsap.timeline !== 'function') {
        console.error("[CAF] GSAP instance is not valid!", {optionsGsap: options.gsapInstance, globalGsap});
        // Fallback to a dummy timeline to prevent crashes, though animation won't work
        const dummyTimeline = globalGsap.timeline();
        dummyTimeline.to({}, {duration: 0.001});
        return { timeline: dummyTimeline, completionPromise: Promise.resolve() };
    }


    const profileNameForLog = typeof profileOrParams === 'string' ? profileOrParams : 'CustomProfile';
    const targetIdForLog = targets && targets.length > 0 && targets[0] ? (targets[0].id || targets[0].ariaLabel || targets[0].className.split(' ')[0] || targets[0].tagName) : 'unknownTarget';
    const debugFlicker = false; // Set to true to enable detailed logging for this function

    if (debugFlicker) console.log(`[CAF START - ${profileNameForLog} for ${targetIdForLog}]`);


    const defaults = {
        lightTargetSelector: '.light',
        overrideGlowParams: {},
        onStart: null,
        onTimelineComplete: null,
        onUpdate: null,
    };
    const config = { ...defaults, ...options };

    let profile = typeof profileOrParams === 'string'
        ? { ...ADVANCED_FLICKER_PROFILES[profileOrParams] } 
        : { ...profileOrParams }; 

    const completionPromise = new Promise(resolve => {
        config.gsapInternalOnComplete = () => {
            if (debugFlicker) console.log(`[CAF INTERNAL PROMISE RESOLVED - ${profileNameForLog} for ${targetIdForLog}]`);
            resolve();
        };
    });

    if (!profile || Object.keys(profile).length === 0) {
        console.warn(`[CAF - ${profileNameForLog} for ${targetIdForLog}] Profile not found or empty. Returning empty, resolved flicker.`);
        const tl = gsap.timeline();
        tl.eventCallback("onComplete", () => {
            if (config.onTimelineComplete) config.onTimelineComplete();
            config.gsapInternalOnComplete();
        });
        tl.to({}, { duration: 0.001 });
        return { timeline: tl, completionPromise };
    }

    profile.glow = { ...(profile.glow || {}) };
    if (config.overrideGlowParams.hasOwnProperty('isButtonSelected')) {
        profile.glow.isButtonSelected = config.overrideGlowParams.isButtonSelected;
    }
    
    const elementsToAnimate = Array.isArray(targets) ? targets.filter(t => t) : (targets ? [targets] : []);
    if (elementsToAnimate.length === 0) {
        console.warn(`[CAF - ${profileNameForLog}] No valid target elements. Returning empty, resolved flicker.`);
        const tl = gsap.timeline();
        tl.eventCallback("onComplete", () => { if (config.onTimelineComplete) config.onTimelineComplete(); config.gsapInternalOnComplete(); });
        tl.to({}, { duration: 0.001 });
        return { timeline: tl, completionPromise };
    }

    const tl = gsap.timeline({
        onStart: () => {
            if (debugFlicker) console.log(`[CAF GSAP TL START - ${profileNameForLog} for ${targetIdForLog}]`);
            if (config.onStart) config.onStart();
        },
        onComplete: () => {
            if (debugFlicker) console.log(`[CAF GSAP TL COMPLETE - ${profileNameForLog} for ${targetIdForLog}]. Calling user's onTimelineComplete and resolving promise.`);
            if (config.onTimelineComplete) config.onTimelineComplete();
            config.gsapInternalOnComplete();
        },
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
            gsap.killTweensOf(baseTargetsForOpacity);
            gsap.set(baseTargetsForOpacity, {clearProps: "all", overwrite: true});
        }
    } else if (profile.targetProperty === 'text-shadow-opacity-and-blur' || profile.targetProperty === 'element-opacity-and-box-shadow') {
        baseTargetsForOpacity = elementsToAnimate; 
        gsap.killTweensOf(baseTargetsForOpacity);
    }

    const isTransitioningFromEffectivelyUnlit = (profile.amplitudeStart !== undefined && profile.amplitudeStart <= 0.01) &&
                                             (!profile.glow || getGlowParam(profile.glow, 'initialOpacity', 0) <= 0.01);

    if (isTransitioningFromEffectivelyUnlit) {
        if (baseTargetsForOpacity.length > 0) {
            tl.set(baseTargetsForOpacity, { autoAlpha: 0, immediateRender: true });
        }
        if (profile.glow && (profile.glow.opacityVar || profile.glow.animatedProperties?.opacity)) {
            const initialGlowCSS = {};
            if (profile.glow.opacityVar) initialGlowCSS[profile.glow.opacityVar] = 0;
            if (profile.glow.animatedProperties?.opacity) initialGlowCSS[profile.glow.animatedProperties.opacity] = 0;
            if (profile.glow.sizeVar) initialGlowCSS[profile.glow.sizeVar] = '0px';
            if (profile.glow.animatedProperties?.blur) initialGlowCSS[profile.glow.animatedProperties.blur] = '0px';
            if (Object.keys(initialGlowCSS).length > 0) {
                tl.set(elementsToAnimate, { css: initialGlowCSS, immediateRender: true });
            }
        }
    } else {
        if (baseTargetsForOpacity.length > 0) {
            const initialAutoAlpha = profile.amplitudeStart !== undefined ? profile.amplitudeStart : 0;
            tl.set(baseTargetsForOpacity, { autoAlpha: initialAutoAlpha, immediateRender: true });
        }
        if (profile.glow && (profile.glow.colorVar || profile.glow.animatedProperties)) {
            const initialGlowCSS = {};
            const initialGlowOpacity = getGlowParam(profile.glow, 'initialOpacity', 0);
            const initialGlowSize = getGlowParam(profile.glow, 'initialSize', '0px');

            if (profile.glow.opacityVar) initialGlowCSS[profile.glow.opacityVar] = initialGlowOpacity;
            if (profile.glow.sizeVar) initialGlowCSS[profile.glow.sizeVar] = typeof initialGlowSize === 'number' ? `${initialGlowSize}px` : initialGlowSize;
            if (profile.glow.animatedProperties?.opacity) initialGlowCSS[profile.glow.animatedProperties.opacity] = initialGlowOpacity;
            if (profile.glow.animatedProperties?.blur) initialGlowCSS[profile.glow.animatedProperties.blur] = typeof initialGlowSize === 'number' ? `${initialGlowSize}px` : initialGlowSize;

            if (Object.keys(initialGlowCSS).length > 0) {
                tl.set(elementsToAnimate, { css: initialGlowCSS, immediateRender: true });
            }
        }
    }

    let currentTime = 0;
    let lastOnDuration = 0.01;

    for (let i = 0; i < profile.numCycles; i++) {
        const cycleProgress = profile.numCycles > 1 ? i / (profile.numCycles - 1) : 1;
        const currentPeriod = profile.periodStart + cycleProgress * (profile.periodEnd - profile.periodStart);
        const onDuration = Math.max(0.01, currentPeriod * profile.onDurationRatio);
        const offDuration = Math.max(0.01, currentPeriod * (1 - profile.onDurationRatio));
        const currentAmplitude = profile.amplitudeStart + cycleProgress * (profile.amplitudeEnd - profile.amplitudeStart);

        lastOnDuration = onDuration;

        const currentPeakOpacity = getGlowParam(profile.glow, 'peakOpacity', 1);
        const currentPeakSize = getGlowParam(profile.glow, 'peakSize', '5px');

        const onState = { autoAlpha: currentAmplitude, duration: onDuration, ease: "power1.inOut" };
        const onGlowCSS = {};
        if (profile.glow && (profile.glow.colorVar || profile.glow.animatedProperties)) {
            const glowOpacityForTween = profile.glow.scaleWithAmplitude ? currentPeakOpacity * currentAmplitude : currentPeakOpacity;
            if (profile.glow.opacityVar) onGlowCSS[profile.glow.opacityVar] = glowOpacityForTween;
            if (profile.glow.sizeVar) onGlowCSS[profile.glow.sizeVar] = typeof currentPeakSize === 'number' ? `${currentPeakSize}px` : currentPeakSize;
            if (profile.glow.animatedProperties) {
                if (profile.glow.animatedProperties.opacity) onGlowCSS[profile.glow.animatedProperties.opacity] = glowOpacityForTween;
                if (profile.glow.animatedProperties.blur) onGlowCSS[profile.glow.animatedProperties.blur] = typeof currentPeakSize === 'number' ? `${currentPeakSize}px` : currentPeakSize;
            }
        }
        if (baseTargetsForOpacity.length > 0) tl.to(baseTargetsForOpacity, onState, currentTime);
        if (Object.keys(onGlowCSS).length > 0) {
            tl.to(elementsToAnimate, { css: onGlowCSS, duration: onDuration, ease: "power1.inOut" }, currentTime);
        }

        currentTime += onDuration;

        if (i < profile.numCycles - 1) {
            const offStateAmplitude = profile.amplitudeStart > 0 ? profile.amplitudeStart * 0.3 : 0;
            const offState = { autoAlpha: offStateAmplitude, duration: offDuration, ease: "power1.inOut" };

            const offGlowCSS = {};
            const baseGlowOpacityOff = getGlowParam(profile.glow, 'initialOpacity', 0);
            const baseGlowSizeOff = getGlowParam(profile.glow, 'initialSize', '0px');

            if (profile.glow && (profile.glow.colorVar || profile.glow.animatedProperties)) {
                if (profile.glow.opacityVar) offGlowCSS[profile.glow.opacityVar] = baseGlowOpacityOff;
                if (profile.glow.sizeVar) offGlowCSS[profile.glow.sizeVar] = typeof baseGlowSizeOff === 'number' ? `${baseGlowSizeOff}px` : baseGlowSizeOff;
                if (profile.glow.animatedProperties) {
                    if (profile.glow.animatedProperties.opacity) offGlowCSS[profile.glow.animatedProperties.opacity] = baseGlowOpacityOff;
                    if (profile.glow.animatedProperties.blur) offGlowCSS[profile.glow.animatedProperties.blur] = typeof baseGlowSizeOff === 'number' ? `${baseGlowSizeOff}px` : baseGlowSizeOff;
                }
            }
            if (baseTargetsForOpacity.length > 0) tl.to(baseTargetsForOpacity, offState, currentTime);
            if (Object.keys(offGlowCSS).length > 0) {
                tl.to(elementsToAnimate, { css: offGlowCSS, duration: offDuration, ease: "power1.inOut" }, currentTime);
            }
            currentTime += offDuration;
        }
    }

    const finalSettleDuration = Math.max(0.15, profile.periodEnd * 1.5);
    const finalState = { autoAlpha: profile.amplitudeEnd, duration: finalSettleDuration, ease: "sine.out" };
    const finalGlowCSS = {};
    if (profile.glow && (profile.glow.colorVar || profile.glow.animatedProperties)) {
        const finalGlowOpacityValue = getGlowParam(profile.glow, 'finalOpacity', 0);
        const finalGlowSizeValue = getGlowParam(profile.glow, 'finalSize', '0px');

        if (profile.glow.opacityVar) finalGlowCSS[profile.glow.opacityVar] = finalGlowOpacityValue;
        if (profile.glow.sizeVar) finalGlowCSS[profile.glow.sizeVar] = typeof finalGlowSizeValue === 'number' ? `${finalGlowSizeValue}px` : finalGlowSizeValue;
        if (profile.glow.animatedProperties) {
            if (profile.glow.animatedProperties.opacity) finalGlowCSS[profile.glow.animatedProperties.opacity] = finalGlowOpacityValue;
            if (profile.glow.animatedProperties.blur) finalGlowCSS[profile.glow.animatedProperties.blur] = typeof finalGlowSizeValue === 'number' ? `${finalGlowSizeValue}px` : finalGlowSizeValue;
        }
    }

    const overlapTime = lastOnDuration * 0.3; 
    if (baseTargetsForOpacity.length > 0) tl.to(baseTargetsForOpacity, finalState, `>-=${overlapTime}`);
    if (Object.keys(finalGlowCSS).length > 0) {
        tl.to(elementsToAnimate, { css: finalGlowCSS, duration: finalSettleDuration, ease: "sine.out" }, "<"); 
    }

    if (tl.duration() === 0) { 
        tl.to({}, {duration: 0.001});
    }
    return { timeline: tl, completionPromise };
}