/**
 * @module startupPhase1
 * @description Creates the GSAP timeline for Phase 1 (Initializing Emergency Subsystems)
 * of the HUE 9000 startup sequence (New P1).
 * This module is an XState service, returning a Promise.
 */
import { startupMessages } from './terminalMessages.js';

export async function createPhaseTimeline(dependencies) {
    const {
        gsap, appStateService, domElementsRegistry, configModule,
        LReductionProxy, opacityFactorProxy // Receive new proxies
    } = dependencies;

    console.log(`[startupP1_emergency EXEC] Start. Current L-factor: ${LReductionProxy.value.toFixed(3)}, O-factor: ${opacityFactorProxy.value.toFixed(3)}`);

    return new Promise((resolve, reject) => {
        try {
            const tl = gsap.timeline({
                onComplete: () => {
                    console.log(`[startupP1_emergency EXEC] End. L-factor: ${LReductionProxy.value.toFixed(3)}, O-factor: ${opacityFactorProxy.value.toFixed(3)}. GSAP Duration: ${tl.duration().toFixed(3)}`);
                    resolve();
                }
            });

            // 1. Emit Terminal Message
            const messageKey = 'P1_EMERGENCY_SUBSYSTEMS';
            const messageTextForDurationCalc = startupMessages[messageKey] || "";
            
            if (domElementsRegistry.terminalContent) { 
                gsap.set(domElementsRegistry.terminalContent, { opacity: 1, visibility: 'visible' });
            }
            
            appStateService.emit('requestTerminalMessage', {
                type: 'startup',
                source: messageKey,
                messageKey: messageKey,
                flickerProfile: 'textFlickerToDimlyLit'
            });

            // 2. Body Fade-In (if not step-through and opacity is 0)
            if (parseFloat(gsap.getProperty(domElementsRegistry.body, "opacity")) < 1) {
                tl.to(domElementsRegistry.body, {
                    opacity: 1,
                    duration: configModule.BODY_FADE_IN_DURATION,
                    ease: "power1.inOut",
                }, "start_P1_effects");
            } else {
                 tl.to({}, {duration: 0.01}, "start_P1_effects"); // Ensure label exists
            }

            // 3. Animate L-reduction and Opacity factors to P1 target values
            const targetLFactor = configModule.STARTUP_L_REDUCTION_FACTORS.P1;
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
                }, "start_P1_effects"); 
            }

            if (Math.abs(opacityFactorProxy.value - targetOFactor) > 0.001) {
                tl.to(opacityFactorProxy, {
                    value: targetOFactor,
                    duration: factorAnimationDuration,
                    ease: "power1.inOut",
                    onUpdate: () => {
                        domElementsRegistry.root.style.setProperty('--startup-opacity-factor', opacityFactorProxy.value.toFixed(3));
                    }
                }, "start_P1_effects"); 
            }

            // 4. Ensure Minimum Duration
            let phaseDurationSeconds = Math.max(configModule.BODY_FADE_IN_DURATION, factorAnimationDuration);
            if (messageTextForDurationCalc) {
                const typingDurationMs = messageTextForDurationCalc.length * configModule.TERMINAL_TYPING_SPEED_STARTUP_MS_PER_CHAR;
                const estimatedFlickerDurText = configModule.estimateFlickerDuration('textFlickerToDimlyLit');
                phaseDurationSeconds = Math.max(phaseDurationSeconds, (typingDurationMs / 1000) + estimatedFlickerDurText + 0.2);
            }
            phaseDurationSeconds = Math.max(phaseDurationSeconds, configModule.MIN_PHASE_DURATION_FOR_STEPPING);
            
            if (tl.duration() < phaseDurationSeconds) {
                tl.to({}, { duration: phaseDurationSeconds - tl.duration() });
            }
            if (tl.duration() === 0 && phaseDurationSeconds > 0) {
                tl.to({}, { duration: phaseDurationSeconds });
            }

            if (tl.duration() > 0) {
                tl.play();
            } else {
                console.log(`[startupP1_emergency EXEC] End. No GSAP timeline (duration was 0). Manually setting factors.`);
                // Manually set final values if no animation happened but values should change
                if (LReductionProxy.value !== targetLFactor) {
                    LReductionProxy.value = targetLFactor;
                    domElementsRegistry.root.style.setProperty('--startup-L-reduction-factor', LReductionProxy.value.toFixed(3));
                }
                if (opacityFactorProxy.value !== targetOFactor) {
                    opacityFactorProxy.value = targetOFactor;
                    domElementsRegistry.root.style.setProperty('--startup-opacity-factor', opacityFactorProxy.value.toFixed(3));
                }
                resolve();
            }

        } catch (error) {
            console.error("[startupP1_emergency EXEC] Error:", error);
            reject(error);
        }
    });
}