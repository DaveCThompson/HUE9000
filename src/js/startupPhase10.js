/**
 * @module startupPhase10
 * @description Creates the GSAP timeline for Phase 10 (Theme Transition)
 * of the HUE 9000 startup sequence (New P10).
 * This module is an XState service, returning a Promise.
 */

export async function createPhaseTimeline(dependencies) {
    const {
        gsap, appStateService, managerInstances, domElementsRegistry, configModule
    } = dependencies;

    const debugLcd = managerInstances.uiUpdater?.debugLcd ?? true; // Access debugLcd if uiUpdater has it
    if (debugLcd) console.log(`[startupP10_themeTransition EXEC] Start. DebugLCD: ${debugLcd}`);


    return new Promise((resolve, reject) => { 
        try {
            const tl = gsap.timeline(); 
            
            if (parseFloat(domElementsRegistry.root.style.getPropertyValue('--startup-L-reduction-factor')) !== 0.0) {
                tl.set(domElementsRegistry.root, { '--startup-L-reduction-factor': '0.000' }, 0);
            }
            if (parseFloat(domElementsRegistry.root.style.getPropertyValue('--startup-opacity-factor')) !== 1.0) {
                tl.set(domElementsRegistry.root, { '--startup-opacity-factor': '1.000' }, 0);
            }
            if (parseFloat(domElementsRegistry.root.style.getPropertyValue('--startup-opacity-factor-boosted')) !== 1.0) {
                tl.set(domElementsRegistry.root, { '--startup-opacity-factor-boosted': '1.000' }, 0);
            }


            tl.call(() => {
                if (debugLcd) console.log("[startupP10_themeTransition EXEC] Preparing UI for theme transition to dark.");
                if (managerInstances.uiUpdater) managerInstances.uiUpdater.prepareLogoForFullTheme();

                domElementsRegistry.elementsAnimatedOnDimExit = [];
                if (configModule.selectorsForDimExitAnimation && Array.isArray(configModule.selectorsForDimExitAnimation)) {
                    configModule.selectorsForDimExitAnimation.forEach(selector => {
                        document.querySelectorAll(selector).forEach(el => {
                            if (el.id !== 'terminal-lcd-content') {
                                el.classList.add('animate-on-dim-exit');
                                domElementsRegistry.elementsAnimatedOnDimExit.push(el);
                            } else if (!el.closest('.actual-lcd-screen-element.animate-on-dim-exit')) {
                                el.classList.add('animate-on-dim-exit');
                                domElementsRegistry.elementsAnimatedOnDimExit.push(el);
                            }
                        });
                    });
                }
                domElementsRegistry.body.classList.add('is-transitioning-from-dim');

                if (managerInstances.uiUpdater) {
                    if (domElementsRegistry.lcdA) managerInstances.uiUpdater.setLcdState(domElementsRegistry.lcdA, 'active', { skipClassChange: false, phaseContext: 'P10_LcdA_ToActive_PreTheme' });
                    if (domElementsRegistry.lcdB) managerInstances.uiUpdater.setLcdState(domElementsRegistry.lcdB, 'active', { skipClassChange: false, phaseContext: 'P10_LcdB_ToActive_PreTheme' });
                    
                    if (domElementsRegistry.terminalContainer) {
                        if (debugLcd) console.log(`[startupP10_themeTransition EXEC] Setting terminalContainer to 'active' state PRE-THEME CHANGE.`);
                        managerInstances.uiUpdater.setLcdState(domElementsRegistry.terminalContainer, 'active', { skipClassChange: false, phaseContext: 'P10_Terminal_ToActive_PreTheme' });
                    }
                }
            })
            .call(() => {
                if (debugLcd) console.log("[startupP10_themeTransition EXEC] Setting theme to dark in appState.");
                appStateService.setTheme('dark'); 
            }, null, ">0.02")
            // MODIFIED: Added explicit call to applyInitialLcdStates after a delay
            .call(() => {
                if (managerInstances.uiUpdater && typeof managerInstances.uiUpdater.applyInitialLcdStates === 'function') {
                    if (debugLcd) console.log(`[startupP10_themeTransition EXEC] Explicitly calling uiUpdater.applyInitialLcdStates() POST theme set.`);
                    managerInstances.uiUpdater.applyInitialLcdStates();
                } else {
                    console.warn("[startupP10_themeTransition EXEC] uiUpdater or applyInitialLcdStates not available for explicit call.");
                }
            }, null, `>${(configModule.THEME_TRANSITION_DURATION || 1.0) * 0.1}`); // Delay slightly after theme change starts

            
            let buttonEnergizeMasterTlDuration = 0;
            let buttonEnergizeStartTimeOffset = (configModule.THEME_TRANSITION_DURATION || 1.0) * 0.05; 

            if (managerInstances.buttonManager) {
                if (debugLcd) console.log("[startupP10_themeTransition EXEC] Energizing HUE_ASSN, SCAN & FIT_EVAL buttons from DIMLY_LIT.");
                const groupsToEnergize = ['env', 'lcd', 'logo', 'btn', 'skill-scan-group', 'fit-eval-group'];

                const { masterTimeline: btnEnergizeTl } = 
                    managerInstances.buttonManager.flickerDimlyLitToEnergizedStartup({
                        profileNameUnselected: 'buttonFlickerFromDimlyLitToFullyLitUnselected',
                        profileNameSelected: 'buttonFlickerFromDimlyLitToFullyLitSelected',
                        stagger: configModule.STARTUP_BUTTON_ENERGIZE_STAGGER,
                        phaseContext: `P10_DimToEnergized`,
                        specificGroups: groupsToEnergize,
                    });

                if (btnEnergizeTl) {
                    tl.add(btnEnergizeTl, buttonEnergizeStartTimeOffset); 
                    buttonEnergizeMasterTlDuration = btnEnergizeTl.duration();
                }
            }
            
            const themeTransitionDuration = configModule.THEME_TRANSITION_DURATION || 1.0;
            const requiredGsapDuration = Math.max(themeTransitionDuration, buttonEnergizeStartTimeOffset + buttonEnergizeMasterTlDuration);

            if (tl.duration() < requiredGsapDuration) {
                tl.to({}, { duration: requiredGsapDuration - tl.duration() });
            }
            
            tl.eventCallback('onComplete', () => {
                if (debugLcd) console.log(`[startupP10_themeTransition EXEC] Main GSAP timeline part complete. Duration: ${tl.duration().toFixed(3)}`);
                resolve();
            });


            if (tl.duration() === 0) { 
                tl.to({}, {duration: configModule.MIN_PHASE_DURATION_FOR_STEPPING});
            }

            tl.play();

        } catch (error) {
            console.error("[startupP10_themeTransition EXEC] Outer error:", error);
            reject(error);
        }
    });
}