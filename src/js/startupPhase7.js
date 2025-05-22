/**
 * @module startupPhase7
 * @description Creates the GSAP timeline for Phase 7 (Initializing Hue Correction Systems)
 * of the HUE 9000 startup sequence (New P7).
 * This module is an XState service, returning a Promise.
 */
import { ButtonStates } from './buttonManager.js';
import { shuffleArray } from './utils.js';
import { startupMessages } from './terminalMessages.js';

export async function createPhaseTimeline(dependencies) {
    const {
        gsap, appStateService, managerInstances, domElementsRegistry, configModule,
        LReductionProxy, opacityFactorProxy // Receive new proxies
    } = dependencies;

    console.log(`[startupP7_hueCorrectionSystems EXEC] Start. Current L-factor: ${LReductionProxy.value.toFixed(3)}, O-factor: ${opacityFactorProxy.value.toFixed(3)}`);

    return new Promise((resolve, reject) => { // Removed async
        try {
            const tl = gsap.timeline({
                onComplete: () => {
                    console.log(`[startupP7_hueCorrectionSystems EXEC] End. L-factor: ${LReductionProxy.value.toFixed(3)}, O-factor: ${opacityFactorProxy.value.toFixed(3)}. GSAP Duration: ${tl.duration().toFixed(3)}`);
                    resolve();
                }
            });
            // const completionPromises = []; // Removed

            // 1. Animate L-reduction and Opacity factors to P7 target values
            const targetLFactor = configModule.STARTUP_L_REDUCTION_FACTORS.P7;
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
                }, "start_P7_effects");
            }

            if (Math.abs(opacityFactorProxy.value - targetOFactor) > 0.001) {
                tl.to(opacityFactorProxy, {
                    value: targetOFactor,
                    duration: factorAnimationDuration,
                    ease: "power1.inOut",
                    onUpdate: () => {
                        domElementsRegistry.root.style.setProperty('--startup-opacity-factor', opacityFactorProxy.value.toFixed(3));
                    }
                }, "start_P7_effects");
            }
            if (tl.getChildren(true,true,true,0).length === 0) { 
                tl.to({}, {duration: 0.01}, "start_P7_effects"); 
            }

            // 2. Emit Terminal Message
            const messageKey = 'P7_HUE_CORRECTION_SYSTEMS';
            const messageTextForDurationCalc = startupMessages[messageKey] || "";
            appStateService.emit('requestTerminalMessage', {
                type: 'startup',
                source: messageKey,
                messageKey: messageKey,
            });

            // 3. Hue Assignment buttons flicker to DIMLY_LIT
            const hueAssignButtons = [];
            if (managerInstances.buttonManager) {
                const hueGroupIds = ['env', 'lcd', 'logo', 'btn'];
                managerInstances.buttonManager._buttons.forEach((buttonComponent, element) => {
                    if (hueGroupIds.includes(buttonComponent.getGroupId())) {
                        hueAssignButtons.push(element);
                    }
                });

                if (hueAssignButtons.length > 0) {
                    shuffleArray(hueAssignButtons);

                    hueAssignButtons.forEach((btnEl, index) => {
                        const buttonInstance = managerInstances.buttonManager.getButtonInstance(btnEl);
                        if (buttonInstance) {
                            const { timeline: flickerTl /*, completionPromise*/ } = managerInstances.buttonManager.playFlickerToState(
                                btnEl,
                                ButtonStates.DIMLY_LIT,
                                {
                                    profileName: 'buttonFlickerToDimlyLit',
                                    phaseContext: `P7_HueBtn_${buttonInstance.getIdentifier()}_ToDim`
                                }
                            );
                            if (flickerTl) tl.add(flickerTl, `start_P7_effects+=${index * (configModule.P4_BUTTON_FADE_STAGGER || 0.04)}`);
                            // completionPromises.push(completionPromise); // Removed
                        }
                    });
                } else {
                    console.warn(`[startupP7_hueCorrectionSystems EXEC] No Hue Assignment buttons found.`);
                }
            } else {
                console.warn(`[startupP7_hueCorrectionSystems EXEC] buttonManager not available.`);
            }
            
            // 4. Ensure Minimum Duration
            let phaseDurationSeconds = Math.max(configModule.MIN_PHASE_DURATION_FOR_STEPPING, factorAnimationDuration);
            if (messageTextForDurationCalc) {
                const typingDurationMs = messageTextForDurationCalc.length * configModule.TERMINAL_TYPING_SPEED_STARTUP_MS_PER_CHAR;
                phaseDurationSeconds = Math.max(phaseDurationSeconds, typingDurationMs / 1000 + 0.2);
            }
            phaseDurationSeconds = Math.max(phaseDurationSeconds, tl.duration());


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
            console.error("[startupP7_hueCorrectionSystems EXEC] Error:", error);
            reject(error);
        }
    });
}