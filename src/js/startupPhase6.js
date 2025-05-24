/**
 * @module startupPhase6
 * @description Creates the GSAP timeline for Phase 6 (Initializing Mood and Intensity Controls)
 * of the HUE 9000 startup sequence (New P6).
 * This module is an XState service, returning a Promise.
 */
import { startupMessages } from './terminalMessages.js';

export async function createPhaseTimeline(dependencies) {
    const {
        gsap, appStateService, managerInstances, domElementsRegistry, configModule,
        LReductionProxy, opacityFactorProxy 
    } = dependencies;

    console.log(`[startupP6_moodIntensityControls EXEC] Start. Current L-factor: ${LReductionProxy.value.toFixed(3)}, O-factor: ${opacityFactorProxy.value.toFixed(3)}`);

    return new Promise((resolve, reject) => {
        try {
            const tl = gsap.timeline({
                onComplete: () => {
                    console.log(`[startupP6_moodIntensityControls EXEC] End. L-factor: ${LReductionProxy.value.toFixed(3)}, O-factor: ${opacityFactorProxy.value.toFixed(3)}. GSAP Duration: ${tl.duration().toFixed(3)}`);
                    resolve();
                }
            });

            const targetLFactor = configModule.STARTUP_L_REDUCTION_FACTORS.P6;
            const targetOFactor = 1.0 - targetLFactor;
            const factorAnimationDuration = configModule.STARTUP_DIM_FACTORS_ANIMATION_DURATION;

            if (Math.abs(LReductionProxy.value - targetLFactor) > 0.001) {
                tl.to(LReductionProxy, {
                    value: targetLFactor,
                    duration: factorAnimationDuration,
                    ease: "power1.inOut",
                    onUpdate: () => {
                        domElementsRegistry.root.style.setProperty('--startup-L-reduction-factor', LReductionProxy.value.toFixed(3));
                    }
                }, "start_P6_effects");
            }

            if (Math.abs(opacityFactorProxy.value - targetOFactor) > 0.001) {
                tl.to(opacityFactorProxy, {
                    value: targetOFactor,
                    duration: factorAnimationDuration,
                    ease: "power1.inOut",
                    onUpdate: () => {
                        domElementsRegistry.root.style.setProperty('--startup-opacity-factor', opacityFactorProxy.value.toFixed(3));
                    }
                }, "start_P6_effects");
            }
            if (tl.getChildren(true,true,true,0).length === 0) { 
                tl.to({}, {duration: 0.01}, "start_P6_effects"); 
            }

            const messageKey = 'P6_MOOD_INTENSITY_CONTROLS';
            const messageTextForDurationCalc = startupMessages[messageKey] || "";
            appStateService.emit('requestTerminalMessage', {
                type: 'startup',
                source: messageKey,
                messageKey: messageKey,
            });

            // Dial Canvases Fade-In & Activation
            let dialFadeInEndTime = tl.duration(); // Time after factor animations
            if (managerInstances.dialManager && domElementsRegistry.dialA && domElementsRegistry.dialB) {
                const dialCanvasContainers = [domElementsRegistry.dialA, domElementsRegistry.dialB];
                
                // Set initial opacity to 0 for fade-in, ensuring this happens before the .to tween
                tl.set(dialCanvasContainers, { opacity: 0 }, "start_P6_effects");

                tl.call(() => {
                    console.log(`[startupP6_moodIntensityControls EXEC] Calling dialManager.setDialsActiveState(true) to draw dial content.`);
                    managerInstances.dialManager.setDialsActiveState(true); 
                }, null, "start_P6_effects+=0.01") 
                .to(dialCanvasContainers, { 
                    opacity: 1, 
                    duration: configModule.DIAL_CANVAS_FADE_IN_DURATION || 0.5,
                    ease: "power1.out",
                    stagger: configModule.STARTUP_LCD_GROUP_APPEAR_STAGGER 
                }, "start_P6_effects+=0.05"); 
                dialFadeInEndTime = Math.max(dialFadeInEndTime, 0.05 + (configModule.DIAL_CANVAS_FADE_IN_DURATION || 0.5) + configModule.STARTUP_LCD_GROUP_APPEAR_STAGGER);
            }


            const lcdElementsToFlicker = [];
            if (domElementsRegistry.lcdA) lcdElementsToFlicker.push({el: domElementsRegistry.lcdA, phaseCtx: 'P6_LcdA_ToDim', profile: 'lcdScreenFlickerToDimlyLit'});
            if (domElementsRegistry.lcdB) lcdElementsToFlicker.push({el: domElementsRegistry.lcdB, phaseCtx: 'P6_LcdB_ToDim', profile: 'lcdScreenFlickerToDimlyLit'});
            if (domElementsRegistry.terminalContainer) lcdElementsToFlicker.push({el: domElementsRegistry.terminalContainer, phaseCtx: 'P6_TerminalScreen_ToDim', profile: 'terminalScreenFlickerToDimlyLit'}); // MODIFIED: Use new profile

            let maxLcdFlickerEndTime = dialFadeInEndTime;

            if (managerInstances.uiUpdater && lcdElementsToFlicker.length > 0) {
                lcdElementsToFlicker.forEach((item, index) => {
                    const {el, phaseCtx, profile} = item; // MODIFIED: Destructure profile
                    
                    let flickerOptions = {
                        useFlicker: true,
                        flickerProfileName: profile, // MODIFIED: Use profile from item
                        phaseContext: phaseCtx
                    };
                    if (el === domElementsRegistry.terminalContainer) {
                        console.log(`[startupP6_moodIntensityControls EXEC] Terminal screen flicker using profile: ${profile}. Text should persist.`);
                    } else {
                        console.log(`[startupP6_moodIntensityControls EXEC] Dial LCD ${el.id} to lcd--dimly-lit with flicker using profile: ${profile}.`);
                    }

                    const flickerResult = managerInstances.uiUpdater.setLcdState(
                        el,
                        'lcd--dimly-lit', 
                        flickerOptions
                    );
                    if (flickerResult && flickerResult.timeline) {
                        const flickerStartTime = dialFadeInEndTime * 0.2 + (index * configModule.STARTUP_LCD_GROUP_APPEAR_STAGGER);
                        tl.add(flickerResult.timeline, `start_P6_effects+=${flickerStartTime}`);
                        maxLcdFlickerEndTime = Math.max(maxLcdFlickerEndTime, flickerStartTime + flickerResult.timeline.duration());
                    }
                });
            } else {
                 console.warn(`[startupP6_moodIntensityControls EXEC] uiUpdater or LCD elements not available for flicker.`);
            }
            
            let phaseDurationSeconds = Math.max(configModule.MIN_PHASE_DURATION_FOR_STEPPING, factorAnimationDuration);
            if (messageTextForDurationCalc) {
                const typingDurationMs = messageTextForDurationCalc.length * configModule.TERMINAL_TYPING_SPEED_STARTUP_MS_PER_CHAR;
                phaseDurationSeconds = Math.max(phaseDurationSeconds, typingDurationMs / 1000 + 0.2);
            }
            phaseDurationSeconds = Math.max(phaseDurationSeconds, maxLcdFlickerEndTime);


            if (tl.duration() < phaseDurationSeconds) {
                tl.to({}, { duration: phaseDurationSeconds - tl.duration() });
            }
            if (tl.getChildren(true,true,true,0).length === 1 && tl.getChildren(true,true,true,0)[0].vars.duration === 0.01 && phaseDurationSeconds > 0.01) {
                 tl.to({}, { duration: Math.max(configModule.MIN_PHASE_DURATION_FOR_STEPPING, phaseDurationSeconds) });
            } else if (tl.duration() === 0) {
                 tl.to({}, { duration: configModule.MIN_PHASE_DURATION_FOR_STEPPING });
            }

            tl.play();

        } catch (error) {
            console.error("[startupP6_moodIntensityControls EXEC] Error:", error);
            reject(error);
        }
    });
}