/**
 * @module startupPhase0
 * @description Creates the GSAP timeline for Phase 0 (System Idle / Baseline Setup)
 * of the HUE 9000 startup sequence (New P0).
 */
// No specific imports like ButtonStates or startupMessages needed for P0's minimal logic

export async function createPhaseTimeline(dependencies) {
    const { 
        gsap, 
        appStateService, 
        configModule,
        // LReductionProxy, opacityFactorProxy // Not strictly needed here as resetVisualsAndState handles P0 values
    } = dependencies;

    console.log(`[startupP0_idle EXEC] Start`); 

    return new Promise((resolve) => {
        const tl = gsap.timeline({
            onComplete: () => {
                console.log(`[startupP0_idle EXEC] End. GSAP Duration: ${tl.duration().toFixed(3)}`);
                resolve();
            }
        });
        
        if (appStateService.getAppStatus() !== 'starting-up') {
            appStateService.setAppStatus('starting-up');
        }

        // resetVisualsAndState in startupSequenceManager already sets the P0 values for
        // --startup-L-reduction-factor and --startup-opacity-factor.
        // No animation of these factors is needed for P0 itself.

        tl.to({}, { duration: configModule.MIN_PHASE_DURATION_FOR_STEPPING });
        
        if (tl.duration() > 0) {
            tl.play();
        } else {
            console.log(`[startupP0_idle EXEC] End. No GSAP timeline (duration was 0). Resolving immediately.`);
            resolve();
        }
    });
}