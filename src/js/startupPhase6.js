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
        LReductionProxy, opacityFactorProxy // Receive new proxies
    } = dependencies;

    console.log(`[startupP6_moodIntensityControls EXEC] Start. Current L-factor: ${LReductionProxy.value.toFixed(3)}, O-factor: ${opacityFactorProxy.value.toFixed(3)}`);

    return new Promise((resolve, reject) => { // Removed async
        try {
            const tl = gsap.timeline({
                onComplete: () => {
                    console.log(`[startupP6_moodIntensityControls EXEC] End. L-factor: ${LReductionProxy.value.toFixed(3)}, O-factor: ${opacityFactorProxy.value.toFixed(3)}. GSAP Duration: ${tl.duration().toFixed(3)}`);
                    resolve();
                }
            });
            // const completionPromises = []; // Removed

            // 1. Animate L-reduction and Opacity factors to P6 target values
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

            // 2. Emit Terminal Message
            const messageKey = 'P6_MOOD_INTENSITY_CONTROLS';
            const messageTextForDurationCalc = startupMessages[messageKey] || "";
            appStateService.emit('requestTerminalMessage', {
                type: 'startup',
                source: messageKey,
                messageKey: messageKey,
            });

            // 3. Dials become active (visuals appear)
            if (managerInstances.dialManager) {
                tl.call(() => managerInstances.dialManager.setDialsActiveState(true), null, "start_P6_effects+=0.01");
            }

            // 4. LCDs A, B, and Terminal Screen flicker to DIMLY_LIT
            const lcdElementsToFlicker = [];
            if (domElementsRegistry.lcdA) lcdElementsToFlicker.push({el: domElementsRegistry.lcdA, phaseCtx: 'P6_LcdA_ToDim'});
            if (domElementsRegistry.lcdB) lcdElementsToFlicker.push({el: domElementsRegistry.lcdB, phaseCtx: 'P6_LcdB_ToDim'});
            if (domElementsRegistry.terminalContainer) lcdElementsToFlicker.push({el: domElementsRegistry.terminalContainer, phaseCtx: 'P6_TerminalScreen_ToDim'});


            if (managerInstances.uiUpdater && lcdElementsToFlicker.length > 0) {
                lcdElementsToFlicker.forEach((item, index) => {
                    const {el, phaseCtx} = item;
                    const flickerResult = managerInstances.uiUpdater.setLcdState(
                        el,
                        'lcd--dimly-lit',
                        {
                            useFlicker: true,
                            flickerProfileName: 'lcdScreenFlickerToDimlyLit',
                            phaseContext: phaseCtx
                        }
                    );
                    if (flickerResult && flickerResult.timeline) {
                        tl.add(flickerResult.timeline, `start_P6_effects+=${index * (configModule.P4_LCD_FADE_STAGGER || 0.05)}`);
                    }
                    // completionPromises.push(flickerResult.completionPromise); // Removed
                });
            } else {
                 console.warn(`[startupP6_moodIntensityControls EXEC] uiUpdater or LCD elements not available for flicker.`);
            }

            // REMOVED: await Promise.all(completionPromises);
            // console.log(`[startupP6_moodIntensityControls EXEC] All LCD flickers ADDED to timeline.`);
            

            // 5. Ensure Minimum Duration
            let phaseDurationSeconds = Math.max(configModule.MIN_PHASE_DURATION_FOR_STEPPING, factorAnimationDuration);
            if (messageTextForDurationCalc) {
                const typingDurationMs = messageTextForDurationCalc.length * configModule.TERMINAL_TYPING_SPEED_STARTUP_MS_PER_CHAR;
                phaseDurationSeconds = Math.max(phaseDurationSeconds, typingDurationMs / 1000 + 0.2);
            }
            // if (lcdElementsToFlicker.length > 0) {
            //     const estimatedFlickerDur = configModule.estimateFlickerDuration('lcdScreenFlickerToDimlyLit') + (lcdElementsToFlicker.length -1) * (configModule.P4_LCD_FADE_STAGGER || 0.05);
            //     phaseDurationSeconds = Math.max(phaseDurationSeconds, estimatedFlickerDur);
            // }
            phaseDurationSeconds = Math.max(phaseDurationSeconds, tl.duration());


            if (tl.duration() < phaseDurationSeconds) {
                tl.to({}, { duration: phaseDurationSeconds - tl.duration() });
            }
            if (tl.duration() === 0 && phaseDurationSeconds > 0) {
                tl.to({}, { duration: phaseDurationSeconds });
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