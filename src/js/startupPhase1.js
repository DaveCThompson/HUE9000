/**
 * @module startupPhase1
 * @description Creates the GSAP timeline for Phase 1 (Initializing Emergency Subsystems)
 * of the HUE 9000 startup sequence.
 * This module is an XState service, returning a Promise.
 */
import { startupMessages } from './terminalMessages.js';

export async function createPhaseTimeline(dependencies) {
    const {
        gsap, appStateService, domElementsRegistry, configModule,
        LReductionProxy, opacityFactorProxy
    } = dependencies;

    // Corrected log message for P1
    console.log(`[startupP1_emergencySubsystems EXEC] Start. Current L-factor: ${LReductionProxy.value.toFixed(3)}, O-factor: ${opacityFactorProxy.value.toFixed(3)}`);

    return new Promise((resolve, reject) => {
        try {
            const tl = gsap.timeline({
                onComplete: () => {
                    // Corrected log message for P1
                    console.log(`[startupP1_emergencySubsystems EXEC] End. L-factor: ${LReductionProxy.value.toFixed(3)}, O-factor: ${opacityFactorProxy.value.toFixed(3)}. GSAP Duration: ${tl.duration().toFixed(3)}`);
                    resolve();
                }
            });

            // 1. Animate L-reduction and Opacity factors to P1 target values
            const targetLFactor = configModule.STARTUP_L_REDUCTION_FACTORS.P1;
            const targetOFactor = 1.0 - targetLFactor;
            const factorAnimationDuration = configModule.STARTUP_DIM_FACTORS_ANIMATION_DURATION;

            let factorsTweened = false;
            if (Math.abs(LReductionProxy.value - targetLFactor) > 0.001) {
                tl.to(LReductionProxy, {
                    value: targetLFactor,
                    duration: factorAnimationDuration,
                    ease: "power1.inOut",
                    onUpdate: () => {
                        domElementsRegistry.root.style.setProperty('--startup-L-reduction-factor', LReductionProxy.value.toFixed(3));
                    }
                }, "start_P1_effects");
                factorsTweened = true;
            }

            if (Math.abs(opacityFactorProxy.value - targetOFactor) > 0.001) {
                tl.to(opacityFactorProxy, {
                    value: targetOFactor,
                    duration: factorAnimationDuration,
                    ease: "power1.inOut",
                    onUpdate: () => {
                        domElementsRegistry.root.style.setProperty('--startup-opacity-factor', opacityFactorProxy.value.toFixed(3));
                        const currentBoosted = parseFloat(domElementsRegistry.root.style.getPropertyValue('--startup-opacity-factor-boosted')) || 0;
                        const newBoosted = Math.min(1, opacityFactorProxy.value * 1.25);
                         if (Math.abs(currentBoosted - newBoosted) > 0.001) {
                           domElementsRegistry.root.style.setProperty('--startup-opacity-factor-boosted', newBoosted.toFixed(3));
                        }
                    }
                }, "start_P1_effects");
                factorsTweened = true;
            }

            // Check if 'isStepThroughMode' is correctly accessed from the full dependencies object
            const isStepThrough = dependencies.dependencies?.isStepThroughMode || dependencies.isStepThroughMode; // Adjust based on how it's nested

            const currentBodyOpacity = parseFloat(gsap.getProperty(domElementsRegistry.body, "opacity"));
            if (currentBodyOpacity < 1 && !isStepThrough) {
                tl.to(domElementsRegistry.body, {
                    opacity: 1,
                    duration: configModule.BODY_FADE_IN_DURATION,
                    ease: "power1.inOut"
                }, factorsTweened ? "<" : "start_P1_effects");
            } else if (tl.getChildren(true,true,true,0).length === 0 && !factorsTweened) {
                tl.to({}, {duration: 0.01}, "start_P1_effects");
            }

            // 3. Emit Terminal Message
            const messageKey = 'P1_EMERGENCY_SUBSYSTEMS'; // Corrected message key for P1
            appStateService.emit('requestTerminalMessage', {
                type: 'startup',
                source: messageKey,
                messageKey: messageKey,
            });

            // Phase 1 does NOT interact with main power buttons. Removed that logic.

            // 4. Ensure Minimum Duration & Add Pause for Auto-Play
            let phaseDurationSeconds = Math.max(configModule.MIN_PHASE_DURATION_FOR_STEPPING, factorAnimationDuration, configModule.BODY_FADE_IN_DURATION);

            // Calculate duration for multi-line messages
            const messageContent = startupMessages[messageKey];
            let totalCharactersToType = 0;
            let interLineDelayMs = 0;

            if (Array.isArray(messageContent)) {
                messageContent.forEach(line => {
                    totalCharactersToType += (line || "").length;
                });
                if (messageContent.length > 1) {
                    interLineDelayMs = (messageContent.length - 1) * (configModule.TERMINAL_NEW_LINE_DELAY_MIN_MS / 2);
                }
            } else {
                totalCharactersToType = (messageContent || "").length;
            }

            if (totalCharactersToType > 0) {
                const typingDurationMs = (totalCharactersToType * configModule.TERMINAL_TYPING_SPEED_STARTUP_MS_PER_CHAR) + interLineDelayMs;
                phaseDurationSeconds = Math.max(phaseDurationSeconds, typingDurationMs / 1000 + 0.2);
            }

            // Ensure the timeline runs at least as long as calculated phase-specific content
            if (tl.duration() < phaseDurationSeconds) {
                tl.to({}, { duration: phaseDurationSeconds - tl.duration() });
            }

            // Add the 0.5s pause only if not in step-through mode
            if (!isStepThrough) {
                tl.to({}, { duration: 0.5 }); // Add the pause
            }

            // Final safety net for empty timelines (should ideally not be hit if phases have content)
            // or if only pause was added.
            if (tl.duration() < configModule.MIN_PHASE_DURATION_FOR_STEPPING && isStepThrough) {
                 tl.to({}, { duration: configModule.MIN_PHASE_DURATION_FOR_STEPPING });
            } else if (tl.duration() < 0.5 && !isStepThrough) {
                 tl.to({}, { duration: 0.5 - tl.duration() }); // Ensure total is at least 0.5s for auto-play
            }


            tl.play();

        } catch (error) {
            console.error("[startupP1_emergencySubsystems EXEC] Error:", error); // Corrected log message
            reject(error);
        }
    });
}