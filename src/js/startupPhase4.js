/**
 * @module startupPhase4
 * @description Creates the GSAP timeline for Phase 4 (Reactivating Optical Core)
 * of the HUE 9000 startup sequence (New P4).
 * This module is an XState service, returning a Promise.
 */
import { startupMessages } from './terminalMessages.js';

export async function createPhaseTimeline(dependencies) {
    const {
        gsap, appStateService, managerInstances, domElementsRegistry, configModule,
        LReductionProxy, opacityFactorProxy // Receive new proxies
    } = dependencies;

    console.log(`[startupP4_opticalCoreReactivate EXEC] Start. Current L-factor: ${LReductionProxy.value.toFixed(3)}, O-factor: ${opacityFactorProxy.value.toFixed(3)}`);

    return new Promise((resolve, reject) => {
        try {
            const tl = gsap.timeline({
                onComplete: () => {
                    console.log(`[startupP4_opticalCoreReactivate EXEC] End. L-factor: ${LReductionProxy.value.toFixed(3)}, O-factor: ${opacityFactorProxy.value.toFixed(3)}. GSAP Duration: ${tl.duration().toFixed(3)}`);
                    resolve();
                }
            });

            // 1. Animate L-reduction and Opacity factors to P4 target values
            const targetLFactor = configModule.STARTUP_L_REDUCTION_FACTORS.P4;
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
                }, "start_P4_effects");
            }

            if (Math.abs(opacityFactorProxy.value - targetOFactor) > 0.001) {
                tl.to(opacityFactorProxy, {
                    value: targetOFactor,
                    duration: factorAnimationDuration,
                    ease: "power1.inOut",
                    onUpdate: () => {
                        domElementsRegistry.root.style.setProperty('--startup-opacity-factor', opacityFactorProxy.value.toFixed(3));
                    }
                }, "start_P4_effects");
            }
            if (tl.getChildren(true,true,true,0).length === 0) { 
                tl.to({}, {duration: 0.01}, "start_P4_effects"); 
            }

            // 2. Emit Terminal Message
            const messageKey = 'P4_OPTICAL_CORE_REACTIVATE';
            const messageTextForDurationCalc = startupMessages[messageKey] || "";
            appStateService.emit('requestTerminalMessage', {
                type: 'startup',
                source: messageKey,
                messageKey: messageKey,
            });

            // 3. Energize Lens Core
            if (managerInstances.lensManager) {
                const lensAnimTimeline = managerInstances.lensManager.energizeLensCoreStartup(
                    configModule.LENS_STARTUP_TARGET_POWER,
                    configModule.LENS_STARTUP_RAMP_DURATION
                );
                if (lensAnimTimeline) {
                    tl.add(lensAnimTimeline, "start_P4_effects+=0.05"); 
                } else {
                    console.warn(`[startupP4_opticalCoreReactivate EXEC] lensManager.energizeLensCoreStartup() returned null timeline.`);
                    // Add a placeholder duration if lens animation fails but factors still need to animate
                    tl.to({}, { duration: Math.max(0, (configModule.LENS_STARTUP_RAMP_DURATION / 1000) - factorAnimationDuration) }, "start_P4_effects+=" + factorAnimationDuration);
                }
            } else {
                console.warn(`[startupP4_opticalCoreReactivate EXEC] lensManager not available.`);
                tl.to({}, { duration: Math.max(0, (configModule.LENS_STARTUP_RAMP_DURATION / 1000) - factorAnimationDuration) }, "start_P4_effects+=" + factorAnimationDuration);
            }

            // 4. Ensure Minimum Duration & Add Pause for Auto-Play
            let phaseDurationSeconds = Math.max(configModule.LENS_STARTUP_RAMP_DURATION / 1000 + 0.05, factorAnimationDuration);
            if (messageTextForDurationCalc) {
                const typingDurationMs = messageTextForDurationCalc.length * configModule.TERMINAL_TYPING_SPEED_STARTUP_MS_PER_CHAR;
                phaseDurationSeconds = Math.max(phaseDurationSeconds, typingDurationMs / 1000 + 0.2);
            }
            phaseDurationSeconds = Math.max(phaseDurationSeconds, configModule.MIN_PHASE_DURATION_FOR_STEPPING);
            
            // Ensure the timeline runs at least as long as calculated phase-specific content
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
            console.error("[startupP4_opticalCoreReactivate EXEC] Error:", error);
            reject(error);
        }
    });
}