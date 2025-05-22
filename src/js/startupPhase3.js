/**
 * @module startupPhase3
 * @description Creates the GSAP timeline for Phase 3 (Main Power Online)
 * of the HUE 9000 startup sequence (New P3).
 * This module is an XState service, returning a Promise.
 */
import { ButtonStates } from './buttonManager.js';
import { startupMessages } from './terminalMessages.js';

export async function createPhaseTimeline(dependencies) {
    const {
        gsap, appStateService, managerInstances, domElementsRegistry, configModule,
        LReductionProxy, opacityFactorProxy // Receive new proxies
    } = dependencies;

    console.log(`[startupP3_mainPowerOnline EXEC] Start. Current L-factor: ${LReductionProxy.value.toFixed(3)}, O-factor: ${opacityFactorProxy.value.toFixed(3)}`);

    return new Promise(async (resolve, reject) => {
        try {
            const tl = gsap.timeline();
            const completionPromises = [];

            // 1. Animate L-reduction and Opacity factors to P3 target values
            const targetLFactor = configModule.STARTUP_L_REDUCTION_FACTORS.P3;
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
                }, "start_P3_effects");
            }

            if (Math.abs(opacityFactorProxy.value - targetOFactor) > 0.001) {
                tl.to(opacityFactorProxy, {
                    value: targetOFactor,
                    duration: factorAnimationDuration,
                    ease: "power1.inOut",
                    onUpdate: () => {
                        domElementsRegistry.root.style.setProperty('--startup-opacity-factor', opacityFactorProxy.value.toFixed(3));
                    }
                }, "start_P3_effects");
            }
            if (tl.getChildren(true,true,true,0).length === 0) { 
                tl.to({}, {duration: 0.01}, "start_P3_effects"); 
            }

            // 2. Emit Terminal Message
            const messageKey = 'P3_MAIN_POWER_ONLINE';
            const messageTextForDurationCalc = startupMessages[messageKey] || "";
            appStateService.emit('requestTerminalMessage', {
                type: 'startup',
                source: messageKey,
                messageKey: messageKey,
            });

            // 3. Main Pwr ON/OFF buttons flicker to ENERGIZED
            if (domElementsRegistry.mainPwrOnButton && domElementsRegistry.mainPwrOffButton && managerInstances.buttonManager) {
                const pwrOnFlicker = managerInstances.buttonManager.playFlickerToState(
                    domElementsRegistry.mainPwrOnButton,
                    ButtonStates.ENERGIZED_SELECTED,
                    {
                        profileName: 'buttonFlickerFromDimlyLitToFullyLitSelectedFast',
                        phaseContext: `P3_MainPwrOn_ToEnergizedSel`,
                        isButtonSelectedOverride: true
                    }
                );
                completionPromises.push(pwrOnFlicker.completionPromise);
                if (pwrOnFlicker.timeline) tl.add(pwrOnFlicker.timeline, "start_P3_effects+=0.05");


                const pwrOffFlicker = managerInstances.buttonManager.playFlickerToState(
                    domElementsRegistry.mainPwrOffButton,
                    ButtonStates.ENERGIZED_UNSELECTED,
                    {
                        profileName: 'buttonFlickerFromDimlyLitToFullyLitUnselectedFast',
                        phaseContext: `P3_MainPwrOff_ToEnergizedUnsel`,
                        isButtonSelectedOverride: false
                    }
                );
                completionPromises.push(pwrOffFlicker.completionPromise);
                if (pwrOffFlicker.timeline) tl.add(pwrOffFlicker.timeline, "<"); 

            } else {
                console.warn(`[startupP3_mainPowerOnline EXEC] Main power buttons or buttonManager not available.`);
            }

            // 4. Await flicker completions
            if (completionPromises.length > 0) {
                await Promise.all(completionPromises);
                console.log(`[startupP3_mainPowerOnline EXEC] All button flickers complete.`);
            }

            // 5. Ensure Minimum Duration
            let phaseDurationSeconds = Math.max(configModule.MIN_PHASE_DURATION_FOR_STEPPING, factorAnimationDuration);
            if (messageTextForDurationCalc) {
                const typingDurationMs = messageTextForDurationCalc.length * configModule.TERMINAL_TYPING_SPEED_STARTUP_MS_PER_CHAR;
                phaseDurationSeconds = Math.max(phaseDurationSeconds, typingDurationMs / 1000 + 0.2);
            }
            const estimatedFlickerDur = configModule.estimateFlickerDuration('buttonFlickerFromDimlyLitToFullyLitSelectedFast') + 0.05;
            phaseDurationSeconds = Math.max(phaseDurationSeconds, estimatedFlickerDur);


            if (tl.duration() < phaseDurationSeconds) {
                tl.to({}, { duration: phaseDurationSeconds - tl.duration() });
            }
            if (tl.duration() === 0 && phaseDurationSeconds > 0) {
                tl.to({}, { duration: phaseDurationSeconds });
            }

            tl.eventCallback('onComplete', () => {
                console.log(`[startupP3_mainPowerOnline EXEC] End. L-factor: ${LReductionProxy.value.toFixed(3)}, O-factor: ${opacityFactorProxy.value.toFixed(3)}. GSAP Duration: ${tl.duration().toFixed(3)}`);
                resolve();
            }).play();

        } catch (error) {
            console.error("[startupP3_mainPowerOnline EXEC] Error:", error);
            reject(error);
        }
    });
}