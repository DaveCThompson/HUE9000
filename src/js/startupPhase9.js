/**
 * @module startupPhase9
 * @description Creates the GSAP timeline for Phase 9 (Activating Auxiliary Lighting: Low Intensity)
 * of the HUE 9000 startup sequence (New P9).
 * This module is an XState service, returning a Promise.
 */
import { ButtonStates } from './buttonManager.js';
import { startupMessages } from './terminalMessages.js';

export async function createPhaseTimeline(dependencies) {
    const {
        gsap, appStateService, managerInstances, domElementsRegistry, configModule
    } = dependencies;

    console.log(`[startupP9_auxLightingLow EXEC] Start`);

    return new Promise((resolve, reject) => { 
        try {
            const tl = gsap.timeline({
                onComplete: () => {
                    console.log(`[startupP9_auxLightingLow EXEC] End. GSAP Duration: ${tl.duration().toFixed(3)}`);
                    resolve();
                }
            });

            if (parseFloat(domElementsRegistry.root.style.getPropertyValue('--startup-L-reduction-factor')) !== 0.0) {
                tl.set(domElementsRegistry.root, { '--startup-L-reduction-factor': '0.000' }, 0);
            }
            if (parseFloat(domElementsRegistry.root.style.getPropertyValue('--startup-opacity-factor')) !== 1.0) {
                tl.set(domElementsRegistry.root, { '--startup-opacity-factor': '1.000' }, 0);
            }
             if (parseFloat(domElementsRegistry.root.style.getPropertyValue('--startup-opacity-factor-boosted')) !== 1.0) { 
                tl.set(domElementsRegistry.root, { '--startup-opacity-factor-boosted': '1.000' }, 0);
            }

            const messageKey = 'P9_AUX_LIGHTING_LOW';
            const messageTextForDurationCalc = startupMessages[messageKey] || "";
            appStateService.emit('requestTerminalMessage', {
                type: 'startup',
                source: messageKey,
                messageKey: messageKey,
            });

            let maxButtonFlickerDuration = 0;
            let flickerStartTime = tl.duration() > 0 ? tl.duration() + 0.05 : 0.05; // Ensure flickers start after any initial sets

            if (managerInstances.buttonManager && domElementsRegistry.auxLightLowButton && domElementsRegistry.auxLightHighButton) {
                const auxLowButtonInst = managerInstances.buttonManager.getButtonInstance(domElementsRegistry.auxLightLowButton);
                const auxHighButtonInst = managerInstances.buttonManager.getButtonInstance(domElementsRegistry.auxLightHighButton);

                if (auxLowButtonInst) {
                    // Explicitly set the final selection state BEFORE calling playFlickerToState
                    // This ensures buttonInstance._isSelected is correct when playFlickerToState's internal logic runs.
                    // auxLowButtonInst.setSelected(true, { skipAnimation: true, phaseContext: `P9_PreFlicker_AuxLow_SetSelectedTrue`});

                    const flickerLow = managerInstances.buttonManager.playFlickerToState(
                        domElementsRegistry.auxLightLowButton,
                        ButtonStates.ENERGIZED_SELECTED, // Target final state string
                        {
                            profileName: 'buttonFlickerFromDimlyLitToFullyLitSelected',
                            phaseContext: `P9_AuxLow_FlickerToEnergizedSel`,
                            isButtonSelectedOverride: true // For glow animation behavior
                        }
                    );
                    if (flickerLow.timeline) {
                        tl.add(flickerLow.timeline, flickerStartTime);
                        maxButtonFlickerDuration = Math.max(maxButtonFlickerDuration, flickerLow.timeline.duration());
                    }
                }

                if (auxHighButtonInst) {
                    // auxHighButtonInst.setSelected(false, { skipAnimation: true, phaseContext: `P9_PreFlicker_AuxHigh_SetSelectedFalse`});

                    const flickerHigh = managerInstances.buttonManager.playFlickerToState(
                        domElementsRegistry.auxLightHighButton,
                        ButtonStates.ENERGIZED_UNSELECTED, // Target final state string
                        {
                            profileName: 'buttonFlickerFromDimlyLitToFullyLitUnselected',
                            phaseContext: `P9_AuxHigh_FlickerToEnergizedUnsel`,
                            isButtonSelectedOverride: false // For glow animation behavior
                        }
                    );
                    if (flickerHigh.timeline) {
                        tl.add(flickerHigh.timeline, flickerStartTime); // Start concurrently with LOW
                        maxButtonFlickerDuration = Math.max(maxButtonFlickerDuration, flickerHigh.timeline.duration());
                    }
                }
            } else {
                console.warn(`[startupP9_auxLightingLow EXEC] AUX Light buttons or buttonManager not available.`);
            }
            
            let phaseDurationSeconds = configModule.MIN_PHASE_DURATION_FOR_STEPPING;
            if (messageTextForDurationCalc) {
                const typingDurationMs = messageTextForDurationCalc.length * configModule.TERMINAL_TYPING_SPEED_STARTUP_MS_PER_CHAR;
                phaseDurationSeconds = Math.max(phaseDurationSeconds, typingDurationMs / 1000 + 0.2);
            }
            phaseDurationSeconds = Math.max(phaseDurationSeconds, tl.duration()); // tl.duration() now includes flicker times

            if (tl.duration() < phaseDurationSeconds) {
                tl.to({}, { duration: phaseDurationSeconds - tl.duration() });
            }
            if (tl.duration() === 0 && phaseDurationSeconds > 0) {
                tl.to({}, { duration: phaseDurationSeconds });
            }

            tl.play();

        } catch (error) {
            console.error("[startupP9_auxLightingLow EXEC] Error:", error);
            reject(error);
        }
    });
}