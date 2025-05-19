/**
 * @module startupSequenceManager
 * @description Manages the GSAP-driven multi-phase application startup sequence.
 * Orchestrates visual changes and state updates across various UI managers.
 */
import { ButtonStates } from './buttonManager.js'; // Imported for use in phase logic
import { shuffleArray } from './utils.js';

// --- Module-level state for the startup sequence ---
let gsapInstance = null;
let appStateService = null;
let managerInstances = {}; // { buttonManager, lensManager, dialManager, uiUpdater, debugManager }
let domElementsRegistry = {}; // { body, root, logoContainer, mainPwrOnButton, mainPwrOffButton, auxLightLowButton, auxLightHighButton, lcdA, lcdB, terminalLcdContent, etc. }
let configService = null;

let masterGsapTimeline = null;
let currentPhaseDebugIndex = -1; // Represents the index of the phase that has *completed* or is *currently being processed by playNextPhase*
let isStepThroughMode = true;
let isFullStartupPlaying = false;
let p6CleanupPerformed = false;

const phaseOrder = [
    "P0_Baseline", "P1_BodyFadeIn", "P2_MainPwr", "P3_Lens",
    "P4_PreStartPriming", "P5_AuxLightsEnergize_Dim",
    "P6_ThemeTransitionAndFinalEnergize", "P7_SystemReady",
    "sequence_complete"
];

const phaseDescriptions = {
    "P0_Baseline": "P0: Baseline Setup",
    "P1_BodyFadeIn": "P1: Body Fade-In & Attenuation",
    "P2_MainPwr": "P2: Main Power Energized",
    "P3_Lens": "P3: Lens Activates",
    "P4_PreStartPriming": "P4: Pre-Start Priming (Buttons, Dials, LCDs)",
    "P5_AuxLightsEnergize_Dim": "P5: AUX Lights Energize (Dim Env)",
    "P6_ThemeTransitionAndFinalEnergize": "P6: Theme Transition & SCAN/HUE ASSN Energize",
    "P7_SystemReady": "P7: System Ready",
    "sequence_complete": "All Startup Phases Done"
};

/**
 * Notifies debug manager (and potentially other listeners) about phase changes.
 * @param {string} phaseName - The name of the phase.
 * @param {string} status - 'starting' or 'completed'.
 */
function _notifyPhaseChange(phaseName, status) {
    let nextPhaseNameForDisplay, nextPhaseDescriptionForDisplay;
    let descriptionForCurrentPhase = phaseDescriptions[phaseName] || phaseName;

    if (status === 'starting') {
        const startingPhaseIndex = phaseOrder.indexOf(phaseName);
        nextPhaseNameForDisplay = phaseOrder[startingPhaseIndex + 1] || 'sequence_complete';
        nextPhaseDescriptionForDisplay = phaseDescriptions[nextPhaseNameForDisplay] || nextPhaseNameForDisplay;
    } else { // 'completed' or 'ready'
        const completedPhaseIndex = phaseOrder.indexOf(phaseName);
        if (phaseName === 'sequence_complete') {
            nextPhaseNameForDisplay = 'N/A';
            nextPhaseDescriptionForDisplay = 'N/A';
        } else {
            // For 'completed' or 'ready', next is the one after the current phase.
            // currentPhaseDebugIndex should reflect the phase that just completed or is the current ready state.
            let referenceIndex = currentPhaseDebugIndex;
            if (phaseName === 'Idle' && status === 'ready') {
                referenceIndex = -1;
            } else if (status === 'completed' && completedPhaseIndex !== -1) {
                referenceIndex = completedPhaseIndex;
            }
            
            nextPhaseNameForDisplay = phaseOrder[referenceIndex + 1] || 'sequence_complete';
            nextPhaseDescriptionForDisplay = phaseDescriptions[nextPhaseNameForDisplay] || nextPhaseNameForDisplay;
        }
        
        // If auto-playing and a phase completes, update currentPhaseDebugIndex
        // This ensures that if the master timeline completes, currentPhaseDebugIndex is at P7.
        if (!isStepThroughMode && status === 'completed' && completedPhaseIndex > currentPhaseDebugIndex) {
            currentPhaseDebugIndex = completedPhaseIndex;
        }
    }

    const phaseInfo = {
        currentPhaseName: phaseName,
        status: status,
        nextPhaseName: nextPhaseNameForDisplay,
        description: descriptionForCurrentPhase,
        nextPhaseDescription: nextPhaseDescriptionForDisplay
    };

    console.log(`[SSM _notifyPhaseChange] Emitting 'startup:phaseChanged'. Phase: ${phaseInfo.description}, Status: ${status}, Next: ${phaseInfo.nextPhaseDescription || phaseInfo.nextPhaseName}`);
    if (appStateService && typeof appStateService.emit === 'function') {
        appStateService.emit('startup:phaseChanged', phaseInfo);
    } else {
        console.error("[SSM _notifyPhaseChange] appStateService or emit method not available!");
    }
}


// --- GSAP Startup Sequence Phase Functions (migrated from main.js) ---
function GsapPhase0_Baseline() {
    const phaseName = "P0_Baseline";
    const tl = gsapInstance.timeline({
        onStart: () => {
            _notifyPhaseChange(phaseName, 'starting');
        },
        onComplete: () => {
            _notifyPhaseChange(phaseName, 'completed');
        }
    });
    tl.call(() => {
        console.log(`[Startup P0 EXEC] Setting initial states.`);
        appStateService.setTerminalLcdMessage("INITIALIZING...");
        domElementsRegistry.root.style.setProperty('--global-dim-attenuation', domElementsRegistry.initialCssAttenuationValue || '0.3');

        if (managerInstances.lensManager && typeof managerInstances.lensManager.directUpdateLensVisuals === 'function') {
            managerInstances.lensManager.directUpdateLensVisuals(0);
        }
        if (managerInstances.dialManager && typeof managerInstances.dialManager.setDialsActiveState === 'function') {
            managerInstances.dialManager.setDialsActiveState(false); 
        }
        if (managerInstances.uiUpdater && typeof managerInstances.uiUpdater.setLcdState === 'function') {
            console.log(`[Startup P0 EXEC] Setting LCD States: lcdA->lcd--unlit, lcdB->lcd--unlit, terminal->js-active-dim-lcd`);
            managerInstances.uiUpdater.setLcdState(domElementsRegistry.lcdA, 'lcd--unlit');
            managerInstances.uiUpdater.setLcdState(domElementsRegistry.lcdB, 'lcd--unlit');
            managerInstances.uiUpdater.setLcdState(domElementsRegistry.terminalLcdContent, 'js-active-dim-lcd');
        } else {
            console.warn("[Startup P0 EXEC] uiUpdater or setLcdState not available.");
        }
        if (managerInstances.dialManager && typeof managerInstances.dialManager.resizeAllCanvases === 'function') {
            managerInstances.dialManager.resizeAllCanvases(true);
        }
    });
    tl.to({}, { duration: configService.MIN_PHASE_DURATION_FOR_STEPPING });
    return tl;
}

function GsapPhase1_BodyFadeIn(dimAttenuationProxy) { 
    const phaseName = "P1_BodyFadeIn";
    const tl = gsapInstance.timeline({
        onStart: () => {
            _notifyPhaseChange(phaseName, 'starting');
        },
        onComplete: () => {
            _notifyPhaseChange(phaseName, 'completed');
        }
    });
    tl.call(() => { console.log(`[Startup P1 EXEC] Starting body fade-in and attenuation.`); }, null, 0);

    tl.to(domElementsRegistry.body, { 
        opacity: 1, 
        duration: configService.BODY_FADE_IN_DURATION, 
        ease: "power1.inOut",
    }, "start_P1");

    if (getComputedStyle(domElementsRegistry.root).getPropertyValue('--global-dim-attenuation')) {
        tl.to(dimAttenuationProxy, { 
            value: 0.0, duration: configService.ATTENUATION_DURATION, ease: "power1.inOut",
            onUpdate: () => {
                domElementsRegistry.root.style.setProperty('--global-dim-attenuation', dimAttenuationProxy.value.toFixed(2));
            },
            onComplete: () => {
                domElementsRegistry.root.style.setProperty('--global-dim-attenuation', '0.00');
                dimAttenuationProxy.value = 0.0;
            }
        }, `start_P1+=${Math.min(0.1, configService.BODY_FADE_IN_DURATION * 0.1)}`);
    }
    return tl;
}

function GsapPhase2_MainPowerEnergized() {
    const phaseName = "P2_MainPwr";
    const tl = gsapInstance.timeline({
        onStart: () => { _notifyPhaseChange(phaseName, 'starting'); },
        onComplete: () => { _notifyPhaseChange(phaseName, 'completed'); }
    });
    console.log(`[Startup P2 EXEC] Main Power phase.`);
    if (domElementsRegistry.mainPwrOnButton && domElementsRegistry.mainPwrOffButton && managerInstances.buttonManager) {
        const prePrimeTimeline = managerInstances.buttonManager.smoothTransitionButtonsToState(
            [domElementsRegistry.mainPwrOnButton, domElementsRegistry.mainPwrOffButton],
            ButtonStates.DIMLY_LIT,
            { phaseContext: `${phaseName}_PrePrime`, stagger: 0 }
        );
        // Ensure prePrimeTimeline has some duration for stepping if it's otherwise instant
        const prePrimeDuration = prePrimeTimeline.duration() > 0 ? prePrimeTimeline.duration() : configService.P2_MAINPWR_PRE_PRIME_DURATION;
        prePrimeTimeline.duration(prePrimeDuration);
        tl.add(prePrimeTimeline);

    } else {
        tl.to({}, { duration: configService.P2_MAINPWR_PRE_PRIME_DURATION });
    }

    tl.call(() => {
        console.log(`[Startup P2 EXEC] Setting terminal message and button states for Main Pwr.`);
        appStateService.setTerminalLcdMessage("MAIN POWER RESTORED... STANDBY");
        if (domElementsRegistry.mainPwrOnButton && domElementsRegistry.mainPwrOffButton && managerInstances.buttonManager) {
            const phaseCtx = `${phaseName}_SetState_Energize`;
            managerInstances.buttonManager.setState(domElementsRegistry.mainPwrOnButton, ButtonStates.ENERGIZED_SELECTED, { skipAria: true, internalFlickerCall: true, phaseContext: phaseCtx, forceState: true });
            managerInstances.buttonManager.setState(domElementsRegistry.mainPwrOffButton, ButtonStates.ENERGIZED_UNSELECTED, { skipAria: true, internalFlickerCall: true, phaseContext: phaseCtx, forceState: true });
        }
    }, null, ">");

    if (domElementsRegistry.mainPwrOnButton && domElementsRegistry.mainPwrOffButton && managerInstances.buttonManager) {
        const pwrOnFlickerTimeline = managerInstances.buttonManager.playFlickerToState(
            domElementsRegistry.mainPwrOnButton, ButtonStates.ENERGIZED_SELECTED,
            { profile: 'intenseStartupFlicker', internalFlickerOnly: true, phaseContext: `${phaseName}_ON_Flicker` }
        );
        const pwrOffFlickerTimeline = managerInstances.buttonManager.playFlickerToState(
            domElementsRegistry.mainPwrOffButton, ButtonStates.ENERGIZED_UNSELECTED,
            { profile: 'intenseStartupFlicker', internalFlickerOnly: true, phaseContext: `${phaseName}_OFF_Flicker` }
        );
        if (pwrOnFlickerTimeline) tl.add(pwrOnFlickerTimeline, ">");
        if (pwrOffFlickerTimeline) tl.add(pwrOffFlickerTimeline, "<");
    } else {
        tl.to({}, { duration: configService.MIN_PHASE_DURATION_FOR_STEPPING }, ">");
    }
    return tl;
}

function GsapPhase3_LensActivates() {
    const phaseName = "P3_Lens";
    const tl = gsapInstance.timeline({
        onStart: () => { _notifyPhaseChange(phaseName, 'starting'); },
        onComplete: () => { _notifyPhaseChange(phaseName, 'completed'); }
    });
    tl.call(() => { console.log(`[Startup P3 EXEC] Lens activation.`); appStateService.setTerminalLcdMessage("OPTICAL CORE ENERGIZING..."); }, null, 0);
    if (managerInstances.lensManager && typeof managerInstances.lensManager.energizeLensCoreStartup === 'function') {
        const lensAnimTimeline = managerInstances.lensManager.energizeLensCoreStartup(
            configService.LENS_STARTUP_TARGET_POWER, configService.LENS_STARTUP_RAMP_DURATION
        );
        tl.add(lensAnimTimeline, ">");
    } else {
        tl.to({}, { duration: configService.P3_LENS_RAMP_DURATION_S }, ">");
    }
    return tl;
}

function GsapPhase4_PreStartPriming() {
    const phaseName = "P4_PreStartPriming";
    const tl = gsapInstance.timeline({
        onStart: () => { _notifyPhaseChange(phaseName, 'starting'); },
        onComplete: () => { _notifyPhaseChange(phaseName, 'completed'); }
    });

    tl.call(() => {
        console.log(`[Startup P4 EXEC] Initial calls: Terminal message, Dials active.`);
        appStateService.setTerminalLcdMessage("SECONDARY SYSTEMS ONLINE... STANDBY.");
        if (managerInstances.dialManager) managerInstances.dialManager.setDialsActiveState(true); 
        
        const logoSVG = domElementsRegistry.logoContainer.querySelector('svg.logo-svg');
        if (logoSVG && logoSVG.style.opacity !== '0.05') gsapInstance.set(logoSVG, { opacity: 0.05 });
    }, null, 0);

    // Staggered LCD Priming
    const lcdPrimingSubTl = gsapInstance.timeline();
    if (managerInstances.uiUpdater && typeof managerInstances.uiUpdater.setLcdState === 'function') {
        const lcdElements = [
            domElementsRegistry.lcdA,
            domElementsRegistry.lcdB,
            domElementsRegistry.terminalLcdContent
        ];
        // Optional: shuffleArray(lcdElements);
        lcdElements.forEach((lcdEl, index) => {
            lcdPrimingSubTl.call(() => {
                console.log(`[Startup P4 EXEC STAGGERED] Setting LCD State to 'lcd--dimly-lit' for: ${lcdEl.id || 'UnknownLCD'}`);
                managerInstances.uiUpdater.setLcdState(lcdEl, 'lcd--dimly-lit');
            }, null, index * (configService.P4_BUTTON_FADE_STAGGER || 0.03));
        });
    }
    if (lcdPrimingSubTl.duration() > 0) {
        tl.add(lcdPrimingSubTl, ">0.05"); // Start slightly after initial P4 calls
    } else {
        tl.to({}, { duration: configService.MIN_PHASE_DURATION_FOR_STEPPING }, ">0.05");
    }


    // Button Priming
    if (managerInstances.buttonManager) {
        const buttonsToPrime = [];
        managerInstances.buttonManager._buttons.forEach((buttonComponent, element) => { 
            const primeGroups = ['skill-scan-group', 'fit-eval-group', 'env', 'lcd', 'logo', 'btn', 'light'];
            if (primeGroups.includes(buttonComponent.getGroupId()) &&
                buttonComponent.getGroupId() !== 'system-power' &&
                !buttonComponent.getCurrentClasses().has('is-energized') &&
                !buttonComponent.getCurrentClasses().has(ButtonStates.DIMLY_LIT)) {
                buttonsToPrime.push(element);
            }
        });

        if (buttonsToPrime.length > 0) {
            shuffleArray(buttonsToPrime);
            const primeButtonsTimeline = managerInstances.buttonManager.smoothTransitionButtonsToState(
                buttonsToPrime, ButtonStates.DIMLY_LIT,
                { stagger: configService.P4_BUTTON_FADE_STAGGER, phaseContext: phaseName }
            );
            if (primeButtonsTimeline) tl.add(primeButtonsTimeline, `>${(configService.P4_BUTTON_FADE_STAGGER || 0.03) * 0.5}`); 
            else tl.to({}, { duration: configService.MIN_PHASE_DURATION_FOR_STEPPING }, ">");
        } else {
            tl.to({}, { duration: configService.MIN_PHASE_DURATION_FOR_STEPPING }, ">");
        }
    } else {
        tl.to({}, { duration: configService.MIN_PHASE_DURATION_FOR_STEPPING }, ">");
    }
    return tl;
}

function GsapPhase5_AuxLightsEnergizeOnly_Dim() {
    const phaseName = "P5_AuxLightsEnergize_Dim";
    const tl = gsapInstance.timeline({
        onStart: () => { _notifyPhaseChange(phaseName, 'starting'); },
        onComplete: () => { _notifyPhaseChange(phaseName, 'completed'); }
    });
    console.log(`[Startup P5 EXEC] Aux Lights Energize.`);
    tl.call(() => {
        appStateService.setTerminalLcdMessage("AUXILIARY LIGHTS ONLINE. DEFAULT: LOW.");
        if (managerInstances.buttonManager && domElementsRegistry.auxLightLowButton && domElementsRegistry.auxLightHighButton) {
            const phaseCtx = `${phaseName}_SetState`;
            managerInstances.buttonManager.setState(domElementsRegistry.auxLightLowButton, ButtonStates.ENERGIZED_SELECTED, { skipAria: true, internalFlickerCall: true, phaseContext: phaseCtx, forceState: true });
            managerInstances.buttonManager.setState(domElementsRegistry.auxLightHighButton, ButtonStates.ENERGIZED_UNSELECTED, { skipAria: true, internalFlickerCall: true, phaseContext: phaseCtx, forceState: true });
        }
    }, null, 0);

    if (managerInstances.buttonManager && domElementsRegistry.auxLightLowButton && domElementsRegistry.auxLightHighButton) {
        const flickerLowTimeline = managerInstances.buttonManager.playFlickerToState(
            domElementsRegistry.auxLightLowButton, ButtonStates.ENERGIZED_SELECTED,
            { profile: 'intenseStartupFlicker', internalFlickerOnly: true, phaseContext: `${phaseName}_LOW_Flicker` }
        );
        const flickerHighTimeline = managerInstances.buttonManager.playFlickerToState(
            domElementsRegistry.auxLightHighButton, ButtonStates.ENERGIZED_UNSELECTED,
            { profile: 'intenseStartupFlicker', internalFlickerOnly: true, phaseContext: `${phaseName}_HIGH_Flicker` }
        );
        if (flickerLowTimeline) tl.add(flickerLowTimeline, ">");
        if (flickerHighTimeline) tl.add(flickerHighTimeline, "<");
    } else {
        tl.to({}, { duration: configService.MIN_PHASE_DURATION_FOR_STEPPING }, ">");
    }
    return tl;
}

function _performP6Cleanup() {
    if (p6CleanupPerformed) return;
    console.log("[StartupSequenceManager _performP6Cleanup] Performing P6 cleanup (theme transition class removal).");
    domElementsRegistry.body.classList.remove('is-transitioning-from-dim');
    if (managerInstances.uiUpdater) managerInstances.uiUpdater.finalizeThemeTransition();
    p6CleanupPerformed = true;
}

function GsapPhase6_ThemeTransitionAndFinalEnergize() {
    const phaseName = "P6_ThemeTransitionAndFinalEnergize";
    const tl = gsapInstance.timeline({
        onStart: () => { _notifyPhaseChange(phaseName, 'starting'); },
        onComplete: () => {
            _performP6Cleanup(); // Ensure cleanup happens when P6 fully completes
            _notifyPhaseChange(phaseName, 'completed');
        }
    });

    // Sub-timeline for theme setup and CSS transition duration
    const themeSetupTl = gsapInstance.timeline();
    themeSetupTl.call(() => {
        console.log(`[Startup P6 EXEC] P6.A: Setting terminal message, preparing logo, adding 'is-transitioning-from-dim', setting LCDs to 'active'.`);
        appStateService.setTerminalLcdMessage("AMBIENT THEME ENGAGED. ALL SYSTEMS NOMINAL.");
        if (managerInstances.uiUpdater) managerInstances.uiUpdater.prepareLogoForFullTheme();
        domElementsRegistry.body.classList.add('is-transitioning-from-dim');

        if (managerInstances.uiUpdater && typeof managerInstances.uiUpdater.setLcdState === 'function') {
            managerInstances.uiUpdater.setLcdState(domElementsRegistry.lcdA, 'active');
            managerInstances.uiUpdater.setLcdState(domElementsRegistry.lcdB, 'active');
            managerInstances.uiUpdater.setLcdState(domElementsRegistry.terminalLcdContent, 'active');
        }
    })
    .call(() => {
        console.log(`[Startup P6 EXEC] P6.B: Calling appStateService.setTheme('dark')`);
        appStateService.setTheme('dark'); // This will trigger uiUpdater to change body class & toggleManager sync
    }, null, `>${configService.MIN_PHASE_DURATION_FOR_STEPPING * 0.1}`) // Small delay after P6.A
    .to({}, { duration: configService.P6_CSS_TRANSITION_DURATION }); // Ensures this timeline respects CSS transition time

    tl.add(themeSetupTl, 0); // Add theme setup at the beginning of P6

    // Sub-timeline for energizing buttons, deferred until theme change is processed
    const energizeButtonsSubTimeline = gsapInstance.timeline();
    energizeButtonsSubTimeline.call(() => {
        // This .call() ensures flickerDimlyLitToEnergizedStartup is invoked
        // when this part of the P6 timeline actually plays.
        console.log(`[Startup P6 EXEC] P6.C: (Deferred Call) Invoking buttonManager.flickerDimlyLitToEnergizedStartup.`);
        
        const actualFlickerAnimationsTl = managerInstances.buttonManager.flickerDimlyLitToEnergizedStartup({
            profile: 'energizeFlicker',
            stagger: configService.P6_BUTTON_ENERGIZE_FLICKER_STAGGER,
            phaseContext: `${phaseName}_AllDimToEnergized`,
            specificGroups: ['skill-scan-group', 'fit-eval-group', 'env', 'lcd', 'logo', 'btn'],
            targetThemeContext: 'theme-dark' // Explicitly pass the target theme
        });

        // Add the timeline returned by flickerDimlyLitToEnergizedStartup to this sub-timeline
        // This makes energizeButtonsSubTimeline effectively take on the duration of the flickers.
        if (actualFlickerAnimationsTl && actualFlickerAnimationsTl.duration() > 0.01) {
            // Add at the current position (0 relative to this sub-timeline's .call())
            energizeButtonsSubTimeline.add(actualFlickerAnimationsTl, 0); 
            console.log(`[Startup P6 EXEC] P6.D: Added actual flicker animations (duration: ${actualFlickerAnimationsTl.duration().toFixed(3)}s) to P6 energize sub-timeline.`);
        } else {
             console.warn(`[Startup P6 EXEC] P6.D: Button energize timeline (actualFlickerAnimationsTl) was instant or empty. Check buttonManager logs.`);
             // Add a minimal duration to ensure this sub-timeline isn't zero if no buttons found
             energizeButtonsSubTimeline.to({}, {duration: 0.01});
        }
    }); // End of .call()

    // Schedule the energizeButtonsSubTimeline to start after theme change has had a moment to propagate.
    const energizeStartTime = (configService.MIN_PHASE_DURATION_FOR_STEPPING * 0.1) + 0.1; // e.g., 0.105s
    
    // Add the energizeButtonsSubTimeline to the main P6 timeline 'tl'
    tl.add(energizeButtonsSubTimeline, energizeStartTime);
    
    return tl;
}


function GsapPhase7_SystemReady() {
    const phaseName = "P7_SystemReady";
    const tl = gsapInstance.timeline({
        onStart: () => { _notifyPhaseChange(phaseName, 'starting'); },
        onComplete: () => {
            console.log(`[Startup P7 COMPLETE] App status set to 'interactive'. Startup sequence fully complete.`);
            isFullStartupPlaying = false;
            _notifyPhaseChange(phaseName, 'completed'); 
            _notifyPhaseChange('sequence_complete', 'completed'); 
        }
    });
    tl.call(() => {
        console.log(`[Startup P7 EXEC] System Ready. Setting terminal message, confirming button groups, setting app status.`);
        appStateService.setTerminalLcdMessage("ALL SYSTEMS ONLINE. HUE 9000 READY.");
        if (managerInstances.buttonManager) {
            managerInstances.buttonManager.confirmGroupSelected('system-power', domElementsRegistry.mainPwrOnButton);
            managerInstances.buttonManager.confirmGroupSelected('light', domElementsRegistry.auxLightLowButton);
            Object.keys(configService.DEFAULT_ASSIGNMENT_SELECTIONS).forEach(targetKey => {
                managerInstances.buttonManager.confirmGroupSelected(targetKey, configService.DEFAULT_ASSIGNMENT_SELECTIONS[targetKey].toString());
            });
        }
        appStateService.setAppStatus('interactive'); 
    }, null, 0)
    .call(() => {
        if (managerInstances.dialManager) managerInstances.dialManager.resizeAllCanvases(true);
    }, null, "+=0.05")
    .to({}, { duration: configService.P7_EFFECTIVE_DURATION }, ">");
    return tl;
}

export function init(config) {
    console.log("[StartupSequenceManager INIT] Initializing...");
    gsapInstance = config.gsap;
    appStateService = config.appState;
    managerInstances = config.managers;
    domElementsRegistry = config.domElements;
    configService = config.configModule; 
    if (!configService) {
        console.error("[StartupSequenceManager INIT] CRITICAL: configModule not provided in config!");
    }
    const requiredConfigKeys = [
        'MIN_PHASE_DURATION_FOR_STEPPING', 'BODY_FADE_IN_DURATION', 'ATTENUATION_DURATION',
        'P2_MAINPWR_PRE_PRIME_DURATION', 'LENS_STARTUP_RAMP_DURATION', 'P3_LENS_RAMP_DURATION_S',
        'P4_BUTTON_FADE_STAGGER', 'P6_BUTTON_ENERGIZE_FLICKER_STAGGER', 
        'P6_CSS_TRANSITION_DURATION', 'P7_EFFECTIVE_DURATION'
    ];
    requiredConfigKeys.forEach(key => {
        if (typeof configService[key] === 'undefined') {
            console.warn(`[StartupSequenceManager INIT] Config key '${key}' is missing from configService. Defaulting or errors may occur.`);
        }
    });
    console.log("[StartupSequenceManager INIT] Initialization complete.");
}

function buildMasterTimeline(dimAttenuationProxy) {
    console.log("[StartupSequenceManager buildMasterTimeline] Building master GSAP timeline.");
    if (masterGsapTimeline) masterGsapTimeline.kill();
    masterGsapTimeline = gsapInstance.timeline({
        paused: true,
        onComplete: () => {
            console.log("[StartupSequenceManager TIMELINE COMPLETE] Master startup sequence finished.");
            if (isFullStartupPlaying) isFullStartupPlaying = false;
            if (!p6CleanupPerformed) _performP6Cleanup();
            
            if (currentPhaseDebugIndex < phaseOrder.indexOf("P7_SystemReady")) {
                currentPhaseDebugIndex = phaseOrder.indexOf("P7_SystemReady");
            }
            _notifyPhaseChange(phaseOrder[currentPhaseDebugIndex], 'completed'); 
            if (phaseOrder[currentPhaseDebugIndex] === "P7_SystemReady") {
                 _notifyPhaseChange('sequence_complete', 'completed');
            }
        }
    });

    masterGsapTimeline
        .addLabel(phaseOrder[0]).add(GsapPhase0_Baseline())
        .addLabel(phaseOrder[1], ">").add(GsapPhase1_BodyFadeIn(dimAttenuationProxy))
        .addLabel(phaseOrder[2], ">").add(GsapPhase2_MainPowerEnergized())
        .addLabel(phaseOrder[3], ">").add(GsapPhase3_LensActivates())
        .addLabel(phaseOrder[4], ">").add(GsapPhase4_PreStartPriming())
        .addLabel(phaseOrder[5], ">").add(GsapPhase5_AuxLightsEnergizeOnly_Dim())
        .addLabel(phaseOrder[6], ">").add(GsapPhase6_ThemeTransitionAndFinalEnergize())
        .addLabel(phaseOrder[7], ">").add(GsapPhase7_SystemReady())
        .addLabel(phaseOrder[8], ">"); 

    _notifyPhaseChange(currentPhaseDebugIndex < 0 ? 'Idle' : phaseOrder[currentPhaseDebugIndex], 'ready');
}

function resetVisualsAndState(forStepping = false, dimAttenuationProxy) {
    console.log(`[StartupSequenceManager resetVisualsAndState] Resetting. forStepping: ${forStepping}.`);
    p6CleanupPerformed = false;
    if (masterGsapTimeline) masterGsapTimeline.pause(0).kill();
    masterGsapTimeline = null;
    gsapInstance.killTweensOf([domElementsRegistry.body, dimAttenuationProxy]);
    const logoSVG = domElementsRegistry.logoContainer?.querySelector('svg.logo-svg');
    if (logoSVG) gsapInstance.killTweensOf(logoSVG);

    appStateService.setAppStatus('starting-up'); 
    appStateService.setTheme('dim'); 

    if (managerInstances.buttonManager) managerInstances.buttonManager.setInitialDimStates();
    appStateService.setTrueLensPower(0);
    if (managerInstances.lensManager) managerInstances.lensManager.directUpdateLensVisuals(0);

    if (domElementsRegistry.logoContainer && managerInstances.uiUpdater) {
        managerInstances.uiUpdater.injectLogoSVG();
        const existingLogoSvg = domElementsRegistry.logoContainer.querySelector('svg.logo-svg');
        if (existingLogoSvg) gsapInstance.set(existingLogoSvg, { opacity: 0.05 });
    }

    domElementsRegistry.root.style.setProperty('--global-dim-attenuation', dimAttenuationProxy.value.toFixed(2));
    appStateService.setTerminalLcdMessage("INITIALIZING...");
    appStateService.updateDialState('A', { hue: configService.DEFAULT_DIAL_A_HUE, targetHue: configService.DEFAULT_DIAL_A_HUE, rotation: 0, targetRotation: 0 });
    appStateService.updateDialState('B', { hue: 0, targetHue: 0, rotation: 0, targetRotation: 0 });
    
    if (managerInstances.uiUpdater && typeof managerInstances.uiUpdater.setLcdState === 'function') {
        console.log(`[StartupSequenceManager resetVisualsAndState] Setting P0 LCD States: lcdA->lcd--unlit, lcdB->lcd--unlit, terminal->js-active-dim-lcd`);
        managerInstances.uiUpdater.setLcdState(domElementsRegistry.lcdA, 'lcd--unlit');
        managerInstances.uiUpdater.setLcdState(domElementsRegistry.lcdB, 'lcd--unlit');
        managerInstances.uiUpdater.setLcdState(domElementsRegistry.terminalLcdContent, 'js-active-dim-lcd');
    }

    gsapInstance.set(domElementsRegistry.body, { opacity: forStepping ? 1 : 0 });
    currentPhaseDebugIndex = -1;
}

export function start(stepMode = true, dimAttenuationProxyInstance) {
    console.log(`[StartupSequenceManager start] Called. StepMode: ${stepMode}.`);
    isStepThroughMode = stepMode;
    isFullStartupPlaying = !isStepThroughMode;

    resetVisualsAndState(isStepThroughMode, dimAttenuationProxyInstance);
    buildMasterTimeline(dimAttenuationProxyInstance);
    _notifyPhaseChange('Idle', 'ready'); 

    if (!isStepThroughMode) { 
        console.log(`[StartupSequenceManager start] Auto-play mode. Starting timeline.`);
        gsapInstance.delayedCall(configService.MIN_PHASE_DURATION_FOR_STEPPING, () => {
            if (masterGsapTimeline) {
                masterGsapTimeline.restart(); 
            }
        });
    } else { 
        console.log(`[StartupSequenceManager start] Step-through mode. Timeline paused at 0.`);
        if (masterGsapTimeline) masterGsapTimeline.pause(0);
    }
}

export function playNextPhase() {
    const targetPhaseIndex = currentPhaseDebugIndex + 1;
    console.log(`[StartupSequenceManager playNextPhase] CurrentIndex (completed): ${currentPhaseDebugIndex}, TargetIndex (to play): ${targetPhaseIndex}`);

    if (!masterGsapTimeline) {
        console.warn("[StartupSequenceManager Stepper] Master timeline not built. Cannot step.");
        return;
    }
    if (masterGsapTimeline.isActive()) {
        console.log(`[StartupSequenceManager playNextPhase] Timeline is active, pausing it.`);
        masterGsapTimeline.pause();
    }

    if (phaseOrder[currentPhaseDebugIndex] === "P6_ThemeTransitionAndFinalEnergize" &&
        phaseOrder[targetPhaseIndex] === "P7_SystemReady") {
        if (!p6CleanupPerformed) {
            console.log(`[StartupSequenceManager playNextPhase] Performing P6 cleanup before P7.`);
            _performP6Cleanup();
        }
    }

    if (targetPhaseIndex >= phaseOrder.length - 1) { 
        console.log(`[StartupSequenceManager playNextPhase] Reached end of sequence or playing final phase.`);
        if (masterGsapTimeline.progress() < 1) {
            if (phaseOrder[currentPhaseDebugIndex] === "P6_ThemeTransitionAndFinalEnergize" && !p6CleanupPerformed) _performP6Cleanup();
            masterGsapTimeline.play(); 
        }
        currentPhaseDebugIndex = phaseOrder.indexOf("sequence_complete");
        if (phaseOrder[targetPhaseIndex-1] === "P7_SystemReady") {
             _notifyPhaseChange("P7_SystemReady", 'completed');
             _notifyPhaseChange('sequence_complete', 'completed');
        }
        isStepThroughMode = false; 
        return;
    }

    const startLabel = phaseOrder[targetPhaseIndex];
    const endLabel = phaseOrder[targetPhaseIndex + 1];
    const startTime = masterGsapTimeline.labels[startLabel];
    let endTime = masterGsapTimeline.labels[endLabel];

    if (typeof startTime !== 'number') { console.error(`[SSM Stepper] Invalid start label: ${startLabel}`); return; }
    if (typeof endTime !== 'number') endTime = masterGsapTimeline.duration();

    masterGsapTimeline.pause(startTime); 
    
    const actualSegmentTime = Math.max(0, endTime - startTime);
    const tweenDuration = Math.max(configService.MIN_PHASE_DURATION_FOR_STEPPING || 0.05, actualSegmentTime);

    console.log(`[SSM Stepper] Playing segment: ${startLabel} (from ${startTime.toFixed(3)}s) -> ${endLabel} (to ${endTime.toFixed(3)}s). ActualTime: ${actualSegmentTime.toFixed(3)}s, TweenDuration: ${tweenDuration.toFixed(3)}s.`);
    _notifyPhaseChange(startLabel, 'starting'); 

    masterGsapTimeline.tweenFromTo(startTime, endTime, {
        duration: tweenDuration,
        ease: "none",
        onComplete: () => {
            console.log(`[SSM Stepper] Segment ${startLabel} tween complete. Pausing at ${endTime.toFixed(3)}s.`);
            masterGsapTimeline.pause(endTime); 
            currentPhaseDebugIndex = targetPhaseIndex; 
            if (startLabel === "P6_ThemeTransitionAndFinalEnergize" && !p6CleanupPerformed) {
                 console.log(`[SSM Stepper] Performing P6 cleanup after segment ${startLabel} completion.`);
                _performP6Cleanup();
            }
            _notifyPhaseChange(startLabel, 'completed'); 
        }
    });
}

export function resetSequence(dimAttenuationProxyInstance) {
    console.log("[StartupSequenceManager resetSequence] called.");
    start(true, dimAttenuationProxyInstance); 
}

export function getCurrentPhaseInfo() {
    const currentName = currentPhaseDebugIndex < 0 ? "Idle" : phaseOrder[currentPhaseDebugIndex];
    const nextName = (currentPhaseDebugIndex + 1 < phaseOrder.length) ? phaseOrder[currentPhaseDebugIndex + 1] : "None";
    return {
        currentIndex: currentPhaseDebugIndex,
        currentPhaseName: currentName,
        currentPhaseDescription: phaseDescriptions[currentName] || currentName,
        nextPhaseName: nextName,
        nextPhaseDescription: phaseDescriptions[nextName] || nextName,
        isComplete: currentName === "sequence_complete"
    };
}