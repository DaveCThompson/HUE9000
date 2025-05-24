/**
 * @module startupPhase5
 * @description Creates the GSAP timeline for Phase 5 (Initializing Diagnostic Control Interface)
 * of the HUE 9000 startup sequence (New P5).
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

    console.log(`[startupP5_diagnosticInterface EXEC] Start. Current L-factor: ${LReductionProxy.value.toFixed(3)}, O-factor: ${opacityFactorProxy.value.toFixed(3)}`);

    return new Promise((resolve, reject) => {
        try {
            const tl = gsap.timeline({
                onComplete: () => {
                    console.log(`[startupP5_diagnosticInterface EXEC] End. L-factor: ${LReductionProxy.value.toFixed(3)}, O-factor: ${opacityFactorProxy.value.toFixed(3)}. GSAP Duration: ${tl.duration().toFixed(3)}`);
                    resolve();
                }
            });

            // 1. Animate L-reduction and Opacity factors to P5 target values
            const targetLFactor = configModule.STARTUP_L_REDUCTION_FACTORS.P5;
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
                }, "start_P5_effects");
            }

            if (Math.abs(opacityFactorProxy.value - targetOFactor) > 0.001) {
                tl.to(opacityFactorProxy, {
                    value: targetOFactor,
                    duration: factorAnimationDuration,
                    ease: "power1.inOut",
                    onUpdate: () => {
                        domElementsRegistry.root.style.setProperty('--startup-opacity-factor', opacityFactorProxy.value.toFixed(3));
                    }
                }, "start_P5_effects");
            }
            if (tl.getChildren(true,true,true,0).length === 0) { 
                tl.to({}, {duration: 0.01}, "start_P5_effects"); 
            }

            // 2. Emit Terminal Message
            const messageKey = 'P5_DIAGNOSTIC_INTERFACE';
            const messageTextForDurationCalc = startupMessages[messageKey] || "";
            appStateService.emit('requestTerminalMessage', {
                type: 'startup',
                source: messageKey,
                messageKey: messageKey,
            });

            // 3. BTN1-4 (Scan/Fit Eval buttons) flicker to DIMLY_LIT
            const diagnosticButtons = [
                domElementsRegistry.scanButton1Element,
                domElementsRegistry.scanButton2Element,
                domElementsRegistry.scanButton3Element,
                domElementsRegistry.scanButton4Element
            ].filter(el => el);

            if (diagnosticButtons.length > 0 && managerInstances.buttonManager) {
                shuffleArray(diagnosticButtons);

                diagnosticButtons.forEach((btnEl, index) => {
                    const buttonInstance = managerInstances.buttonManager.getButtonInstance(btnEl);
                    if (buttonInstance) {
                        const { timeline: flickerTl } = managerInstances.buttonManager.playFlickerToState(
                            btnEl,
                            ButtonStates.DIMLY_LIT,
                            {
                                profileName: 'buttonFlickerToDimlyLit',
                                phaseContext: `P5_DiagBtn_${buttonInstance.getIdentifier()}_ToDim`
                            }
                        );
                        // Use new semantic stagger constant
                        if (flickerTl) tl.add(flickerTl, `start_P5_effects+=${index * configModule.STARTUP_BUTTON_GROUP_APPEAR_STAGGER}`);
                    }
                });
            } else {
                console.warn(`[startupP5_diagnosticInterface EXEC] Diagnostic buttons or buttonManager not available. Buttons found: ${diagnosticButtons.length}`);
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
            console.error("[startupP5_diagnosticInterface EXEC] Error:", error);
            reject(error);
        }
    });
}