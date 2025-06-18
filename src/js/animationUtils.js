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
    const profileNameForLog = typeof profileOrParams === 'string' ? profileOrParams : 'CustomProfile';
    const targetElementsForLog = Array.isArray(targets) ? targets : [targets];
    const targetIdForLog = targetElementsForLog && targetElementsForLog.length > 0 && targetElementsForLog[0] ? (targetElementsForLog[0].id || targetElementsForLog[0].ariaLabel || (targetElementsForLog[0].className && targetElementsForLog[0].className.split ? targetElementsForLog[0].className.split(' ')[0] : 'unknown') || targetElementsForLog[0].tagName) : 'unknownTarget';
    
    console.log(`[CAF_ENTRY | ${performance.now().toFixed(2)}ms] Flicker requested for: ${targetIdForLog}, Profile: ${profileNameForLog}, GSAP valid: ${!!(gsap && gsap.timeline)}`);
    if (!profileOrParams || (typeof profileOrParams === 'string' && !ADVANCED_FLICKER_PROFILES[profileOrParams])) {
        console.error(`[CAF_ERROR | ${performance.now().toFixed(2)}ms] Profile '${profileNameForLog}' NOT FOUND or invalid! For target: ${targetIdForLog}`);
    }

    if (!gsap || typeof gsap.timeline !== 'function') {
        console.error(`[CAF | ${performance.now().toFixed(2)}ms] GSAP instance is not valid! For ${targetIdForLog}`, {optionsGsap: options.gsapInstance, globalGsap});
        const dummyTimeline = globalGsap.timeline();
        dummyTimeline.to({}, {duration: 0.001});
        return { timeline: dummyTimeline, completionPromise: Promise.resolve() };
    }

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
            resolve();
        };
    });

    if (!profile || Object.keys(profile).length === 0) {
        console.warn(`[CAF | ${performance.now().toFixed(2)}ms] Profile '${profileNameForLog}' for ${targetIdForLog} not found or empty. Returning empty, resolved flicker.`);
        const tl = gsap.timeline();
        tl.eventCallback("onComplete", () => {
            if (config.onTimelineComplete) config.onTimelineComplete();
            config.gsapInternalOnComplete();
        });
        tl.to({}, { duration: 0.001 }); 
        console.log(`[CAF_RETURN_EMPTY_PROFILE | ${performance.now().toFixed(2)}ms] Flicker for ${targetIdForLog}, Profile: ${profileNameForLog}. Timeline duration: ${tl.duration().toFixed(3)}s.`);
        return { timeline: tl, completionPromise };
    }

    profile.glow = { ...(profile.glow || {}) };
    if (config.overrideGlowParams.hasOwnProperty('isButtonSelected')) {
        profile.glow.isButtonSelected = config.overrideGlowParams.isButtonSelected;
    }
    
    const elementsToAnimate = Array.isArray(targets) ? targets.filter(t => t) : (targets ? [targets] : []);
    if (elementsToAnimate.length === 0) {
        console.warn(`[CAF | ${performance.now().toFixed(2)}ms] Profile '${profileNameForLog}': No valid target elements. Returning empty, resolved flicker.`);
        const tl = gsap.timeline();
        tl.eventCallback("onComplete", () => { if (config.onTimelineComplete) config.onTimelineComplete(); config.gsapInternalOnComplete(); });
        tl.to({}, { duration: 0.001 });
        console.log(`[CAF_RETURN_NO_TARGETS | ${performance.now().toFixed(2)}ms] Flicker for ${targetIdForLog}, Profile: ${profileNameForLog}. Timeline duration: ${tl.duration().toFixed(3)}s.`);
        return { timeline: tl, completionPromise };
    }

    // Declare baseTargetsForOpacity here to be accessible in onUpdate
    let baseTargetsForOpacity = elementsToAnimate;
    let lightElements = []; 

    const tl = gsap.timeline({
        onStart: () => {
            console.log(`[CAF_TL_START | ${performance.now().toFixed(2)}ms] GSAP TL START for '${profileNameForLog}' on '${targetIdForLog}'`);
            if (config.onStart) config.onStart();
        },
        onComplete: () => {
            console.log(`[CAF_TL_COMPLETE | ${performance.now().toFixed(2)}ms] GSAP TL COMPLETE for '${profileNameForLog}' on '${targetIdForLog}'. Calling user's onTimelineComplete.`);
            if (config.onTimelineComplete) config.onTimelineComplete();
            config.gsapInternalOnComplete();
        },
        // **** NEW DEBUG: onUpdate ****
        onUpdate: function() {
            // Ensure elementsToAnimate and baseTargetsForOpacity are populated and valid before accessing.
            // This check is important because onUpdate can fire very early.
            if (!elementsToAnimate[0] || (baseTargetsForOpacity !== elementsToAnimate && !baseTargetsForOpacity[0])) {
                 // If baseTargetsForOpacity was changed to lightElements, it might not be populated yet on the very first tick.
                if (profile.targetProperty === 'button-lights-and-frame' && lightElements.length > 0 && lightElements[0]) {
                    // use lightElements if available and appropriate
                } else {
                    return; 
                }
            }

            const time = this.time().toFixed(3);
            const lightTarget = (profile.targetProperty === 'button-lights-and-frame' && lightElements.length > 0) ? lightElements[0] : baseTargetsForOpacity[0];
            const buttonElement = elementsToAnimate[0];

            if (!lightTarget || !buttonElement) return; // Extra safety

            const lightOpacity = gsap.getProperty(lightTarget, "opacity");
            const lightVisibility = gsap.getProperty(lightTarget, "visibility");
            
            let glowOpacityVal = "N/A";
            let glowSizeVal = "N/A";

            if (profile.glow) {
                if (profile.glow.opacityVar) {
                    glowOpacityVal = getComputedStyle(buttonElement).getPropertyValue(profile.glow.opacityVar).trim();
                } else if (profile.glow.animatedProperties?.opacity) {
                    glowOpacityVal = getComputedStyle(buttonElement).getPropertyValue(profile.glow.animatedProperties.opacity).trim();
                }

                if (profile.glow.sizeVar) {
                    glowSizeVal = getComputedStyle(buttonElement).getPropertyValue(profile.glow.sizeVar).trim();
                } else if (profile.glow.animatedProperties?.blur) {
                    glowSizeVal = getComputedStyle(buttonElement).getPropertyValue(profile.glow.animatedProperties.blur).trim();
                }
            }
            
            const duration = this.duration();
            // Log more frequently initially, then spread out
            if (time === "0.000" ||
                (duration > 0 && Math.abs(this.time() - duration * 0.01) < 0.016) || // Approx 1%
                (duration > 0 && Math.abs(this.time() - duration * 0.05) < 0.016) || // Approx 5%
                (duration > 0 && Math.abs(this.time() - duration * 0.15) < 0.016) || // Approx 15%
                (duration > 0 && Math.abs(this.time() - duration * 0.30) < 0.016) || // Approx 30%
                (duration > 0 && Math.abs(this.time() - duration * 0.50) < 0.016) || 
                (duration > 0 && Math.abs(this.time() - duration * 0.75) < 0.016)) { 
                console.log(`[CAF_ONUPDATE | ${performance.now().toFixed(2)}ms] ${targetIdForLog} @ ${time}s (of ${duration.toFixed(3)}s): Light Opacity=${Number(lightOpacity).toFixed(3)}, Vis=${lightVisibility}, Glow Opacity='${glowOpacityVal}', Glow Size='${glowSizeVal}'`);
            }
        }
        // **** END NEW DEBUG ****
    });

    if (profile.targetProperty === 'button-lights-and-frame') {
        elementsToAnimate.forEach(el => {
            const lights = el.querySelectorAll(config.lightTargetSelector);
            if (lights.length > 0) lightElements.push(...Array.from(lights));
        });

        if (lightElements.length > 0) {
            baseTargetsForOpacity = lightElements; // Now baseTargetsForOpacity refers to lightElements
            gsap.killTweensOf(baseTargetsForOpacity); 
            gsap.set(baseTargetsForOpacity, {clearProps: "all", overwrite: true}); 
        }
        gsap.killTweensOf(elementsToAnimate, "css");
    } else if (profile.targetProperty === 'text-shadow-opacity-and-blur' || profile.targetProperty === 'element-opacity-and-box-shadow') {
        baseTargetsForOpacity = elementsToAnimate; 
        gsap.killTweensOf(baseTargetsForOpacity); 
    }
    
    console.log(`[CAF_TARGETS | ${performance.now().toFixed(2)}ms] Profile: ${profileNameForLog}, TargetProp: ${profile.targetProperty} for ${targetIdForLog}`);
    if (profile.targetProperty === 'button-lights-and-frame') {
        console.log(`  Light elements for opacity: ${lightElements.length}`, lightElements.map(l => l.outerHTML.substring(0,50) + "..."));
        console.log(`  Main button elements for CSS vars: ${elementsToAnimate.length}`, elementsToAnimate.map(el => el.id || el.ariaLabel));
    } else {
        console.log(`  Base targets for opacity/effects: ${baseTargetsForOpacity.length}`, baseTargetsForOpacity.map(el => el.id || el.ariaLabel));
    }
    if (profile.glow) {
        console.log(`  Glow vars to be animated: OpacityVar='${profile.glow.opacityVar}', SizeVar='${profile.glow.sizeVar}', AnimatedProps=`, profile.glow.animatedProperties);
    }

    const isTransitioningFromEffectivelyUnlit = (profile.amplitudeStart !== undefined && profile.amplitudeStart <= 0.01) &&
                                             (!profile.glow || getGlowParam(profile.glow, 'initialOpacity', 0) <= 0.01);
    
    console.log(`[CAF_INITIAL_SET | ${performance.now().toFixed(2)}ms] For ${targetIdForLog}, isTransitioningFromEffectivelyUnlit: ${isTransitioningFromEffectivelyUnlit}. AmplitudeStart: ${profile.amplitudeStart}, GlowInitialOpacity: ${profile.glow ? getGlowParam(profile.glow, 'initialOpacity', 0) : 'N/A'}`);

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
            console.log(`[CAF_INITIAL_SET_ELSE | ${performance.now().toFixed(2)}ms] Setting baseTargetsForOpacity (${baseTargetsForOpacity.length}) to autoAlpha: ${initialAutoAlpha} for ${targetIdForLog}`);
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
                 console.log(`[CAF_INITIAL_SET_ELSE_GLOW | ${performance.now().toFixed(2)}ms] Setting initialGlowCSS on elementsToAnimate (${elementsToAnimate.length}) for ${targetIdForLog}:`, JSON.stringify(initialGlowCSS));
            }
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
        // **** NEW DEBUG: Log what GSAP is *tweening to* in the first "on" cycle ****
        if (i === 0) {
            console.log(`[CAF_CYCLE_0_ON_TARGETS | ${performance.now().toFixed(2)}ms] ${targetIdForLog} Cycle 0 "ON" targets: Light autoAlpha=${onState.autoAlpha.toFixed(3)}, GlowCSS=`, JSON.stringify(onGlowCSS));
        }
        // **** END NEW DEBUG ****

        currentTime += onDuration;

        if (i < profile.numCycles - 1) {
            let offStateAmplitude;
            if (profile.amplitudeStart > 0.01) {
                offStateAmplitude = profile.amplitudeStart * 0.1; // e.g., 0.25 * 0.1 = 0.025. Very dim.
            } else {
                offStateAmplitude = 0; 
            }
            const offState = { autoAlpha: offStateAmplitude, duration: offDuration, ease: "power1.inOut" };

            const offGlowCSS = {};
            const baseGlowOpacityOff = getGlowParam(profile.glow, 'initialOpacity', 0);
            const baseGlowSizeOff = getGlowParam(profile.glow, 'initialSize', '0px');

            if (profile.glow && (profile.glow.colorVar || profile.glow.animatedProperties)) {
                const offGlowOpacityTarget = offStateAmplitude > 0.01 && profile.amplitudeStart > 0.01 ? baseGlowOpacityOff * (offStateAmplitude / profile.amplitudeStart) : baseGlowOpacityOff;

                if (profile.glow.opacityVar) offGlowCSS[profile.glow.opacityVar] = offGlowOpacityTarget;
                if (profile.glow.sizeVar) offGlowCSS[profile.glow.sizeVar] = typeof baseGlowSizeOff === 'number' ? `${baseGlowSizeOff}px` : baseGlowSizeOff; 
                if (profile.glow.animatedProperties) {
                    if (profile.glow.animatedProperties.opacity) offGlowCSS[profile.glow.animatedProperties.opacity] = offGlowOpacityTarget;
                    if (profile.glow.animatedProperties.blur) offGlowCSS[profile.glow.animatedProperties.blur] = typeof baseGlowSizeOff === 'number' ? `${baseGlowSizeOff}px` : baseGlowSizeOff;
                }
            }
            if (baseTargetsForOpacity.length > 0) tl.to(baseTargetsForOpacity, offState, currentTime);
            if (Object.keys(offGlowCSS).length > 0) {
                tl.to(elementsToAnimate, { css: offGlowCSS, duration: offDuration, ease: "power1.inOut" }, currentTime);
            }
            // **** NEW DEBUG: Log what GSAP is *tweening to* in the first "off" cycle ****
             if (i === 0) {
                console.log(`[CAF_CYCLE_0_OFF_TARGETS | ${performance.now().toFixed(2)}ms] ${targetIdForLog} Cycle 0 "OFF" targets: Light autoAlpha=${offState.autoAlpha.toFixed(3)}, GlowCSS=`, JSON.stringify(offGlowCSS));
            }
            // **** END NEW DEBUG ****
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

    if (tl.duration() === 0 && profile.numCycles === 0) { 
        console.warn(`[CAF_WARN | ${performance.now().toFixed(2)}ms] Timeline for ${targetIdForLog} had 0 duration with 0 cycles. Adding minimal duration.`);
        tl.to({}, {duration: 0.001});
    }
    
    const finalDuration = tl.duration();
    console.log(`[CAF_RETURN | ${performance.now().toFixed(2)}ms] Flicker for ${targetIdForLog}, Profile: ${profileNameForLog}. Timeline duration: ${finalDuration.toFixed(3)}s. Timeline has children: ${tl.getChildren().length > 0}`);
    if (finalDuration <= 0.01 && profile.numCycles > 0) { 
        console.warn(`[CAF_WARN | ${performance.now().toFixed(2)}ms] Timeline for ${targetIdForLog} is very short or empty despite having cycles! Profile:`, JSON.stringify(profile));
    }
    return { timeline: tl, completionPromise };
}