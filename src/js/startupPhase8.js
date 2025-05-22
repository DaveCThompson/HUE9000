/**
 * @module startupPhase8
 * @description Creates the GSAP timeline for Phase 8 (Initializing External Lighting Controls)
 * of the HUE 9000 startup sequence (New P8).
 * This module is an XState service, returning a Promise.
 */
import { startupMessages } from './terminalMessages.js';
import { ButtonStates } from './buttonManager.js'; // Import ButtonStates

export async function createPhaseTimeline(dependencies) {
    const {
        gsap, appStateService, managerInstances, domElementsRegistry, configModule,
        LReductionProxy, opacityFactorProxy 
    } = dependencies;

    console.log(`[startupP8_externalLightingControls EXEC] Start. Current L-factor: ${LReductionProxy.value.toFixed(3)}, O-factor: ${opacityFactorProxy.value.toFixed(3)}`);

    return new Promise((resolve, reject) => { 
        try {
            const tl = gsap.timeline({
                onComplete: () => {
                    console.log(`[startupP8_externalLightingControls EXEC] End. L-factor: ${LReductionProxy.value.toFixed(3)}, O-factor: ${opacityFactorProxy.value.toFixed(3)}. GSAP Duration: ${tl.duration().toFixed(3)}`);
                    resolve();
                }
            });

            // 1. Animate L-reduction and Opacity factors to P8 target values (L=0, O=1)
            const targetLFactor = configModule.STARTUP_L_REDUCTION_FACTORS.P8; 
            const targetOFactor = 1.0 - targetLFactor; 
            const factorAnimationDuration = configModule.STARTUP_DIM_FACTORS_ANIMATION_DURATION;

            let currentTimelinePosition = 0;

            if (Math.abs(LReductionProxy.value - targetLFactor) > 0.001) {
                tl.to(LReductionProxy, {
                    value: targetLFactor,
                    duration: factorAnimationDuration,
                    ease: "power1.inOut",
                    onUpdate: () => {
                        domElementsRegistry.root.style.setProperty('--startup-L-reduction-factor', LReductionProxy.value.toFixed(3));
                    }
                }, "start_P8_effects");
                currentTimelinePosition = factorAnimationDuration;
            }

            if (Math.abs(opacityFactorProxy.value - targetOFactor) > 0.001) {
                tl.to(opacityFactorProxy, {
                    value: targetOFactor,
                    duration: factorAnimationDuration,
                    ease: "power1.inOut",
                    onUpdate: () => {
                        domElementsRegistry.root.style.setProperty('--startup-opacity-factor', opacityFactorProxy.value.toFixed(3));
                        // Also update boosted factor if it's not yet 1.0
                        const currentBoosted = parseFloat(domElementsRegistry.root.style.getPropertyValue('--startup-opacity-factor-boosted')) || 0;
                        const newBoosted = Math.min(1, opacityFactorProxy.value * 1.25);
                        if (Math.abs(currentBoosted - newBoosted) > 0.001) {
                           domElementsRegistry.root.style.setProperty('--startup-opacity-factor-boosted', newBoosted.toFixed(3));
                        }
                    }
                }, "start_P8_effects");
                currentTimelinePosition = Math.max(currentTimelinePosition, factorAnimationDuration);
            }
            
            if (tl.getChildren(true,true,true,0).length === 0) { 
                tl.to({}, {duration: 0.01}, "start_P8_effects");
                currentTimelinePosition = 0.01;
            }

            // 2. Emit Terminal Message
            const messageKey = 'P8_EXTERNAL_LIGHTING_CONTROLS';
            const messageTextForDurationCalc = startupMessages[messageKey] || "";
            appStateService.emit('requestTerminalMessage', {
                type: 'startup',
                source: messageKey,
                messageKey: messageKey,
            });

            // 3. Flicker AUX LOW and HIGH buttons to DIMLY_LIT
            let auxFlickerOffset = currentTimelinePosition > 0 ? currentTimelinePosition * 0.1 : 0.05; // Start after factors begin animating
            if (managerInstances.buttonManager && domElementsRegistry.auxLightLowButton && domElementsRegistry.auxLightHighButton) {
                const auxLowFlicker = managerInstances.buttonManager.playFlickerToState(
                    domElementsRegistry.auxLightLowButton,
                    ButtonStates.DIMLY_LIT,
                    {
                        profileName: 'buttonFlickerToDimlyLit',
                        phaseContext: `P8_AuxLow_ToDim`
                    }
                );
                if (auxLowFlicker.timeline) tl.add(auxLowFlicker.timeline, auxFlickerOffset);

                const auxHighFlicker = managerInstances.buttonManager.playFlickerToState(
                    domElementsRegistry.auxLightHighButton,
                    ButtonStates.DIMLY_LIT,
                    {
                        profileName: 'buttonFlickerToDimlyLit',
                        phaseContext: `P8_AuxHigh_ToDim`
                    }
                );
                if (auxHighFlicker.timeline) tl.add(auxHighFlicker.timeline, auxFlickerOffset + 0.03); // Stagger slightly
            } else {
                console.warn(`[startupP8_externalLightingControls EXEC] AUX Light buttons or buttonManager not available for DIMLY_LIT flicker.`);
            }
            
            // 4. Ensure Minimum Duration
            let phaseDurationSeconds = Math.max(configModule.MIN_PHASE_DURATION_FOR_STEPPING, factorAnimationDuration);
            if (messageTextForDurationCalc) {
                const typingDurationMs = messageTextForDurationCalc.length * configModule.TERMINAL_TYPING_SPEED_STARTUP_MS_PER_CHAR;
                phaseDurationSeconds = Math.max(phaseDurationSeconds, typingDurationMs / 1000 + 0.2);
            }
            // Account for the AUX button flickers if they were added
            const estimatedAuxFlickerDur = configModule.estimateFlickerDuration('buttonFlickerToDimlyLit') + 0.03;
            phaseDurationSeconds = Math.max(phaseDurationSeconds, auxFlickerOffset + estimatedAuxFlickerDur);
            
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
            console.error("[startupP8_externalLightingControls EXEC] Error:", error);
            reject(error);
        }
    });
}