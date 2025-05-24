/**
 * @module startupPhase2
 * @description Creates the GSAP timeline for Phase 2 (Activating Backup Power Systems)
 * of the HUE 9000 startup sequence (New P2).
 * This module is an XState service, returning a Promise.
 */
import { ButtonStates } from './buttonManager.js';
import { startupMessages } from './terminalMessages.js';

export async function createPhaseTimeline(dependencies) {
    const {
        gsap, appStateService, managerInstances, domElementsRegistry, configModule,
        LReductionProxy, opacityFactorProxy // Receive new proxies
    } = dependencies;

    console.log(`[startupP2_backupPower EXEC] Start. Current L-factor: ${LReductionProxy.value.toFixed(3)}, O-factor: ${opacityFactorProxy.value.toFixed(3)}`);

    return new Promise((resolve, reject) => {
        try {
            const tl = gsap.timeline({
                onComplete: () => { 
                    console.log(`[startupP2_backupPower EXEC] End. L-factor: ${LReductionProxy.value.toFixed(3)}, O-factor: ${opacityFactorProxy.value.toFixed(3)}. GSAP Duration: ${tl.duration().toFixed(3)}`);
                    resolve();
                }
            });

            // 1. Animate L-reduction and Opacity factors to P2 target values
            const targetLFactor = configModule.STARTUP_L_REDUCTION_FACTORS.P2;
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
                }, "start_P2_effects");
            }

            if (Math.abs(opacityFactorProxy.value - targetOFactor) > 0.001) {
                tl.to(opacityFactorProxy, {
                    value: targetOFactor,
                    duration: factorAnimationDuration,
                    ease: "power1.inOut",
                    onUpdate: () => {
                        domElementsRegistry.root.style.setProperty('--startup-opacity-factor', opacityFactorProxy.value.toFixed(3));
                         // Also update boosted factor
                        const currentBoosted = parseFloat(domElementsRegistry.root.style.getPropertyValue('--startup-opacity-factor-boosted')) || 0;
                        const newBoosted = Math.min(1, opacityFactorProxy.value * 1.25);
                         if (Math.abs(currentBoosted - newBoosted) > 0.001) {
                           domElementsRegistry.root.style.setProperty('--startup-opacity-factor-boosted', newBoosted.toFixed(3));
                        }
                    }
                }, "start_P2_effects");
            }
            if (tl.getChildren(true,true,true,0).length === 0) { 
                tl.to({}, {duration: 0.01}, "start_P2_effects"); 
            }


            // 2. Emit Terminal Message
            const messageKey = 'P2_BACKUP_POWER';
            const messageTextForDurationCalc = startupMessages[messageKey] || "";
            appStateService.emit('requestTerminalMessage', {
                type: 'startup',
                source: messageKey,
                messageKey: messageKey,
            });

            // 3. Main Pwr ON/OFF buttons flicker to DIMLY_LIT
            if (domElementsRegistry.mainPwrOnButton && domElementsRegistry.mainPwrOffButton && managerInstances.buttonManager) {
                const pwrOnFlicker = managerInstances.buttonManager.playFlickerToState(
                    domElementsRegistry.mainPwrOnButton,
                    ButtonStates.DIMLY_LIT,
                    {
                        profileName: 'buttonFlickerToDimlyLit',
                        phaseContext: `P2_MainPwrOn_ToDim`
                    }
                );
                if (pwrOnFlicker.timeline) {
                    tl.add(pwrOnFlicker.timeline, "start_P2_effects+=0.05"); 
                }

                const pwrOffFlicker = managerInstances.buttonManager.playFlickerToState(
                    domElementsRegistry.mainPwrOffButton,
                    ButtonStates.DIMLY_LIT,
                    {
                        profileName: 'buttonFlickerToDimlyLit',
                        phaseContext: `P2_MainPwrOff_ToDim`
                    }
                );
                if (pwrOffFlicker.timeline) {
                    tl.add(pwrOffFlicker.timeline, "<+0.05"); 
                }

            } else {
                console.warn(`[startupP2_backupPower EXEC] Main power buttons or buttonManager not available.`);
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
            console.error("[startupP2_backupPower EXEC] Error:", error);
            reject(error);
        }
    });
}