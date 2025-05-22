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

    console.log(`[startupP10_themeTransition EXEC] Start`);

    return new Promise((resolve, reject) => { // Removed async
        try {
            const tl = gsap.timeline(); 
            // const asyncButtonEnergizePromises = []; // Not needed if masterTimeline from buttonManager is reliable

            // Ensure L/O factors are at their final state (0.0 / 1.0)
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
                console.log("[startupP10_themeTransition EXEC] Preparing UI for theme transition to dark.");
                if (managerInstances.uiUpdater) managerInstances.uiUpdater.prepareLogoForFullTheme();

                domElementsRegistry.elementsAnimatedOnDimExit = [];
                if (configModule.selectorsForDimExitAnimation && Array.isArray(configModule.selectorsForDimExitAnimation)) {
                    configModule.selectorsForDimExitAnimation.forEach(selector => {
                        document.querySelectorAll(selector).forEach(el => {
                            el.classList.add('animate-on-dim-exit');
                            domElementsRegistry.elementsAnimatedOnDimExit.push(el);
                        });
                    });
                }
                domElementsRegistry.body.classList.add('is-transitioning-from-dim');

                if (managerInstances.uiUpdater) {
                    if (domElementsRegistry.lcdA) managerInstances.uiUpdater.setLcdState(domElementsRegistry.lcdA, 'active', { skipClassChange: false });
                    if (domElementsRegistry.lcdB) managerInstances.uiUpdater.setLcdState(domElementsRegistry.lcdB, 'active', { skipClassChange: false });
                    if (domElementsRegistry.terminalContainer) managerInstances.uiUpdater.setLcdState(domElementsRegistry.terminalContainer, 'active', { skipClassChange: false });
                }
            })
            .call(() => {
                console.log("[startupP10_themeTransition EXEC] Setting theme to dark in appState.");
                appStateService.setTheme('dark'); 
            }, null, `>${(configModule.MIN_PHASE_DURATION_FOR_STEPPING || 0.05) * 0.1}`);

            
            let buttonEnergizeMasterTlDuration = 0;
            let buttonEnergizeStartTimeOffset = (configModule.THEME_TRANSITION_DURATION || 1.0) * 0.1; 

            if (managerInstances.buttonManager) {
                console.log("[startupP10_themeTransition EXEC] Energizing HUE_ASSN, SCAN & FIT_EVAL buttons from DIMLY_LIT.");
                const groupsToEnergize = ['env', 'lcd', 'logo', 'btn', 'skill-scan-group', 'fit-eval-group'];

                const { masterTimeline: btnEnergizeTl /*, masterCompletionPromise: btnEnergizePromise*/ } = // Removed masterCompletionPromise usage here
                    managerInstances.buttonManager.flickerDimlyLitToEnergizedStartup({
                        profileNameUnselected: 'buttonFlickerFromDimlyLitToFullyLitUnselected',
                        profileNameSelected: 'buttonFlickerFromDimlyLitToFullyLitSelected',
                        stagger: configModule.P6_BUTTON_ENERGIZE_FLICKER_STAGGER || 0.03,
                        phaseContext: `P10_DimToEnergized`,
                        specificGroups: groupsToEnergize,
                    });

                if (btnEnergizeTl) {
                    tl.add(btnEnergizeTl, buttonEnergizeStartTimeOffset); 
                    buttonEnergizeMasterTlDuration = btnEnergizeTl.duration();
                }
                // if (btnEnergizePromise) { // Removed
                //     asyncButtonEnergizePromises.push(btnEnergizePromise);
                // }
            }
            
            const themeTransitionDuration = configModule.THEME_TRANSITION_DURATION || 1.0;
            const totalButtonEnergizeVisualDuration = buttonEnergizeStartTimeOffset + buttonEnergizeMasterTlDuration;
            const requiredGsapDuration = Math.max(themeTransitionDuration, totalButtonEnergizeVisualDuration);

            if (tl.duration() < requiredGsapDuration) {
                tl.to({}, { duration: requiredGsapDuration - tl.duration() });
            }
            
            // The main promise for this phase resolves when the GSAP timeline `tl` completes.
            tl.eventCallback('onComplete', () => {
                console.log(`[startupP10_themeTransition EXEC] Main GSAP timeline part complete. Duration: ${tl.duration().toFixed(3)}`);
                // The FSM action 'performThemeTransitionCleanupIfNeeded' will be called on *entry* to P11.
                // So, we don't need to explicitly call cleanup here if the FSM handles it.
                // However, if there were other async operations not tied to GSAP, we'd await them.
                // Since buttonManager.flickerDimlyLitToEnergizedStartup returns a GSAP timeline, it's part of `tl`.
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