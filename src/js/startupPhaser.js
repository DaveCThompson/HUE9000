/**
 * @module startupPhase3
 * @description Creates the GSAP timeline for Phase 3 (Subsystem Priming)
 * of the HUE 9000 startup sequence. (Formerly P4)
 * This module is now designed to be an XState service, returning a Promise.
 */
import { ButtonStates } from './buttonManager.js';
import { shuffleArray } from './utils.js';

export async function createPhaseTimeline(dependencies) {
    const {
        gsap, appStateService, managerInstances, domElementsRegistry, configModule
    } = dependencies;

    // console.log("[startupPhase3] EXEC Start");

    return new Promise(async (resolve, reject) => {
        try {
            const phaseInternalGsapTimeline = gsap.timeline({
                onUpdate: function() {
                    // console.log(`[startupPhase3] phaseInternalGsapTimeline progress: ${this.progress().toFixed(3)}`);
                }
            });

            appStateService.emit('requestTerminalMessage', { type: 'startup', source: 'P4_SECONDARY_SYSTEMS_ONLINE', messageKey: 'P4_SECONDARY_SYSTEMS_ONLINE' });

            phaseInternalGsapTimeline.call(() => {
                // console.log("[startupPhase3] Setting dials active, logo opacity.");
                if (managerInstances.dialManager) managerInstances.dialManager.setDialsActiveState(true);
                const logoSVG = domElementsRegistry.logoContainer?.querySelector('svg.logo-svg');
                if (logoSVG && logoSVG.style.opacity !== '0.05') { // Keep logo very dim until P5/P6
                    gsap.set(logoSVG, { opacity: 0.05 });
                }
            }, null, 0);

            // LCD Flickering
            const lcdFlickerMasterTl = gsap.timeline();
            const lcdElementsToFlicker = [];
            if (domElementsRegistry.lcdA) lcdElementsToFlicker.push(domElementsRegistry.lcdA);
            if (domElementsRegistry.lcdB) lcdElementsToFlicker.push(domElementsRegistry.lcdB);
            const lcdFlickerCompletionPromises = [];

            lcdElementsToFlicker.forEach((lcdEl, index) => {
                if (managerInstances.uiUpdater) {
                    const flickerResult = managerInstances.uiUpdater.setLcdState(lcdEl, 'lcd--dimly-lit', {
                        useFlicker: true, // Generic flag to use flicker
                        flickerProfileName: 'lcdScreenFlickerToDimlyLit', // Specify new profile
                    });
                    if (flickerResult && flickerResult.timeline) {
                         lcdFlickerMasterTl.add(flickerResult.timeline, index * (configModule.P4_LCD_FADE_STAGGER || 0.05)); // Stagger can be kept or adjusted
                    }
                    if (flickerResult && flickerResult.completionPromise) {
                        lcdFlickerCompletionPromises.push(flickerResult.completionPromise);
                    } else {
                        lcdFlickerCompletionPromises.push(Promise.resolve());
                    }
                }
            });

            if (managerInstances.terminalManager && domElementsRegistry.terminalContainer) {
                const terminalScreenFlickerResult = managerInstances.terminalManager.playScreenFlickerToState(
                    domElementsRegistry.terminalContainer,
                    'lcdScreenFlickerToDimlyLit', // Use new profile
                    () => { // onComplete for the flicker itself
                        if (managerInstances.uiUpdater) {
                            // Ensure final class is set by uiUpdater after flicker
                            managerInstances.uiUpdater.setLcdState(domElementsRegistry.terminalContainer, 'lcd--dimly-lit', { skipClassChange: false });
                        }
                    }
                );
                if (terminalScreenFlickerResult && terminalScreenFlickerResult.timeline) {
                    lcdFlickerMasterTl.add(terminalScreenFlickerResult.timeline, lcdElementsToFlicker.length * (configModule.P4_LCD_FADE_STAGGER || 0.05));
                }
                if (terminalScreenFlickerResult && terminalScreenFlickerResult.completionPromise) {
                    lcdFlickerCompletionPromises.push(terminalScreenFlickerResult.completionPromise);
                } else {
                     lcdFlickerCompletionPromises.push(Promise.resolve());
                }
            }

            // Button Priming (Flicker to Dimly Lit)
            const buttonPrimeMasterTl = gsap.timeline();
            const buttonFlickerPromises = [];

            if (managerInstances.buttonManager) {
                const buttonsToPrimeElements = [];
                const primeGroups = ['skill-scan-group', 'fit-eval-group', 'env', 'lcd', 'logo', 'btn', 'light'];

                managerInstances.buttonManager._buttons.forEach((buttonComponent, element) => {
                    const groupId = buttonComponent.getGroupId();
                    const currentClasses = buttonComponent.getCurrentClasses();

                    if (primeGroups.includes(groupId) &&
                        groupId !== 'system-power' && // Exclude main power
                        !currentClasses.has(ButtonStates.ENERGIZED_UNSELECTED.split(' ')[0]) && // Not already energized
                        !currentClasses.has(ButtonStates.ENERGIZED_SELECTED.split(' ')[0]) &&   // Not already energized selected
                        !currentClasses.has(ButtonStates.DIMLY_LIT.split(' ')[0])) { // Not already dimly-lit
                        buttonsToPrimeElements.push(element);
                    }
                });

                // console.log(`[startupPhase3] Found ${buttonsToPrimeElements.length} buttons to prime to dimly-lit.`);
                if (buttonsToPrimeElements.length > 0) {
                    shuffleArray(buttonsToPrimeElements);
                    buttonsToPrimeElements.forEach((btnEl, index) => {
                        const buttonInstance = managerInstances.buttonManager._buttons.get(btnEl);
                        if (buttonInstance) {
                            const { timeline: flickerTl, completionPromise } = managerInstances.buttonManager.playFlickerToState(
                                btnEl,
                                ButtonStates.DIMLY_LIT,
                                {
                                    profileName: 'buttonFlickerToDimlyLit', // Use new semantic profile
                                    phaseContext: `startupPhase3_BtnDimlyLit_${buttonInstance.getIdentifier()}`
                                }
                            );
                            if (flickerTl) buttonPrimeMasterTl.add(flickerTl, index * (configModule.P4_BUTTON_FADE_STAGGER || 0.04));
                            if (completionPromise) {
                                buttonFlickerPromises.push(completionPromise);
                            } else {
                                buttonFlickerPromises.push(Promise.resolve());
                            }
                        }
                    });
                }
            } else {
                console.warn(`[startupPhase3] buttonManager not available for button priming.`);
            }

            if (lcdFlickerMasterTl.duration() > 0 || lcdFlickerCompletionPromises.length > 0) {
                if(lcdFlickerMasterTl.duration() > 0) lcdFlickerMasterTl.play();
                await Promise.all(lcdFlickerCompletionPromises);
            }

            if (buttonPrimeMasterTl.duration() > 0 || buttonFlickerPromises.length > 0) {
                if(buttonPrimeMasterTl.duration() > 0) buttonPrimeMasterTl.play();
                await Promise.all(buttonFlickerPromises);
            }

            if (lcdFlickerMasterTl.getChildren().length > 0) {
                phaseInternalGsapTimeline.add(lcdFlickerMasterTl, ">0.05");
            } else if (lcdFlickerCompletionPromises.length === 0) { // Only add placeholder if no promises either
                phaseInternalGsapTimeline.to({}, { duration: configModule.MIN_PHASE_DURATION_FOR_STEPPING || 0.05 }, ">0.05");
            }

            const buttonStartTime = (lcdFlickerMasterTl.getChildren().length > 0) ? (0.05 + (configModule.P4_LCD_FADE_STAGGER || 0.05) * 0.5) : 0.05;
            if (buttonPrimeMasterTl.getChildren().length > 0) {
                phaseInternalGsapTimeline.add(buttonPrimeMasterTl, buttonStartTime);
            } else if (buttonFlickerPromises.length === 0) { // Only add placeholder if no promises either
                phaseInternalGsapTimeline.to({}, { duration: configModule.MIN_PHASE_DURATION_FOR_STEPPING || 0.05 }, buttonStartTime);
            }


            if (phaseInternalGsapTimeline.duration() > 0) {
                await new Promise(timelineResolve => {
                    phaseInternalGsapTimeline.eventCallback('onComplete', timelineResolve).play();
                });
            }

            // console.log("[startupPhase3] EXEC End - Resolving Promise.");
            resolve();

        } catch (error) {
            console.error("[startupPhase3] Outer error creating or executing phase timeline:", error);
            reject(error);
        }
    });
}