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
        LReductionProxy, opacityFactorProxy 
    } = dependencies;

    // Ensure all dependencies are valid, especially managerInstances
    if (!managerInstances || !managerInstances.buttonManager) {
        console.error("[startupP7_hueCorrectionSystems EXEC] CRITICAL: buttonManager is missing from managerInstances.");
        return Promise.reject(new Error("buttonManager not available in P7"));
    }
    if (!configModule) {
        console.error("[startupP7_hueCorrectionSystems EXEC] CRITICAL: configModule is missing.");
        return Promise.reject(new Error("configModule not available in P7"));
    }


    console.log(`[startupP7_hueCorrectionSystems EXEC] Start. Current L-factor: ${LReductionProxy.value.toFixed(3)}, O-factor: ${opacityFactorProxy.value.toFixed(3)}`);

    return new Promise((resolve, reject) => {
        try {
            const tl = gsap.timeline({
                onComplete: () => {
                    console.log(`[startupP7_hueCorrectionSystems EXEC] End. L-factor: ${LReductionProxy.value.toFixed(3)}, O-factor: ${opacityFactorProxy.value.toFixed(3)}. GSAP Duration: ${tl.duration().toFixed(3)}`);
                    resolve();
                },
                onError: (error) => { // Add onError to the timeline itself for GSAP errors
                    console.error("[startupP7_hueCorrectionSystems EXEC] GSAP Timeline Error:", error);
                    reject(error);
                }
            });

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
            
            // Ensure there's at least a tiny tween if factors don't animate, so label works
            if (tl.getChildren(true,true,true, "start_P7_effects").length === 0) { 
                tl.to({}, {duration: 0.001}, "start_P7_effects"); 
            }


            const messageKey = 'P7_HUE_CORRECTION_SYSTEMS';
            const messageTextForDurationCalc = startupMessages[messageKey] || "";
            // Emit message after a slight delay to ensure factors start animating
            tl.call(() => {
                appStateService.emit('requestTerminalMessage', {
                    type: 'startup',
                    source: messageKey,
                    messageKey: messageKey,
                });
            }, null, "start_P7_effects+=0.01");


            let maxFlickerCompletionTime = 0;
            const individualFlickerDuration = configModule.estimateFlickerDuration('buttonFlickerToDimlyLit');

            const hueAssignButtons = [];
            // Access buttonManager safely
            const localButtonManager = managerInstances.buttonManager;

            const hueGroupIds = ['env', 'lcd', 'logo', 'btn'];
            localButtonManager._buttons.forEach((buttonComponent, element) => {
                if (hueGroupIds.includes(buttonComponent.getGroupId())) {
                    hueAssignButtons.push(element);
                }
            });

            if (hueAssignButtons.length > 0) {
                shuffleArray(hueAssignButtons); // shuffleArray is from utils.js
                const stagger = configModule.STARTUP_HUE_ASSIGN_BUTTON_APPEAR_STAGGER;

                hueAssignButtons.forEach((btnEl, index) => {
                    const buttonInstance = localButtonManager.getButtonInstance(btnEl);
                    if (buttonInstance) {
                        const { timeline: flickerTl, completionPromise: flickerPromise } = localButtonManager.playFlickerToState(
                            btnEl,
                            ButtonStates.DIMLY_LIT,
                            {
                                profileName: 'buttonFlickerToDimlyLit',
                                phaseContext: `P7_HueBtn_${buttonInstance.getIdentifier()}_ToDim`,
                                gsapInstance: gsap // Pass gsap instance if createAdvancedFlicker needs it explicitly
                            }
                        );
                        if (flickerTl) {
                            const startTime = index * stagger;
                            tl.add(flickerTl, `start_P7_effects+=${startTime}`);
                        }
                    }
                });
                if (hueAssignButtons.length > 0) {
                    maxFlickerCompletionTime = ((hueAssignButtons.length -1) * stagger) + individualFlickerDuration;
                }

            } else {
                console.warn(`[startupP7_hueCorrectionSystems EXEC] No Hue Assignment buttons found.`);
            }
            
            let phaseDurationSeconds = Math.max(configModule.MIN_PHASE_DURATION_FOR_STEPPING, factorAnimationDuration);
            if (messageTextForDurationCalc) {
                const typingDurationMs = messageTextForDurationCalc.length * configModule.TERMINAL_TYPING_SPEED_STARTUP_MS_PER_CHAR;
                phaseDurationSeconds = Math.max(phaseDurationSeconds, typingDurationMs / 1000 + 0.2); 
            }
            phaseDurationSeconds = Math.max(phaseDurationSeconds, maxFlickerCompletionTime);
            
            if (tl.duration() < phaseDurationSeconds) {
                tl.to({}, { duration: phaseDurationSeconds - tl.duration() });
            }
            
            const isStepThrough = dependencies.dependencies?.isStepThroughMode || dependencies.isStepThroughMode;
            if (!isStepThrough) {
                tl.to({}, { duration: 0.5 }); // Add the pause
            }

            if (tl.duration() < configModule.MIN_PHASE_DURATION_FOR_STEPPING && isStepThrough) {
                 tl.to({}, { duration: configModule.MIN_PHASE_DURATION_FOR_STEPPING });
            } else if (tl.duration() < 0.5 && !isStepThrough) {
                 tl.to({}, { duration: 0.5 - tl.duration() });
            }

            tl.play();

        } catch (error) {
            console.error("[startupP7_hueCorrectionSystems EXEC] Outer Catch Error:", error);
            reject(error);
        }
    });
}