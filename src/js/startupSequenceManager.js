/**
 * @module startupSequenceManager
 * @description Manages the GSAP-driven multi-phase application startup sequence.
 * Orchestrates visual changes and state updates across various UI managers.
 */
import { ButtonStates } from './buttonManager.js'; 
import { shuffleArray } from './utils.js';
import { startupMessages as terminalStartupMessages } from './terminalMessages.js'; 

// createAdvancedFlicker will be called by component managers or directly if needed

// --- Module-level state for the startup sequence ---
let localGsap = null; // Store passed GSAP instance
let appStateService = null;
let managerInstances = {}; 
let domElementsRegistry = {}; 
let configModule = null; // Will store the configModule namespace object

let masterGsapTimeline = null;
let currentPhaseDebugIndex = -1; 
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

const selectorsForDimExitAnimation = [
    'body',
    '.panel-bezel',
    '.panel-section',
    '.control-block',
    '.button-unit',
    '.button-unit .light',
    '.button-unit .button-text',
    '#logo-container',
    '#logo-container svg.logo-svg',
    '#logo-container svg.logo-svg .logo-dynamic-bg',
    '#logo-container svg.logo-svg .logo-panel-bg-rect',
    '.dial-canvas-container',
    '.hue-lcd-display',
    '.actual-lcd-screen-element', 
    '#lens-container', 
    '#color-lens',
    '.grill-placeholder',
    '.color-chip',
    '.control-group-label',
    '.block-label-bottom'
];
let elementsAnimatedOnDimExit = []; 


function _notifyPhaseChange(phaseName, status) {
    let nextPhaseNameForDisplay, nextPhaseDescriptionForDisplay;
    let descriptionForCurrentPhase = phaseDescriptions[phaseName] || phaseName;

    if (status === 'starting') {
        const startingPhaseIndex = phaseOrder.indexOf(phaseName);
        nextPhaseNameForDisplay = phaseOrder[startingPhaseIndex + 1] || 'sequence_complete';
        nextPhaseDescriptionForDisplay = phaseDescriptions[nextPhaseNameForDisplay] || nextPhaseNameForDisplay;
    } else { 
        const completedPhaseIndex = phaseOrder.indexOf(phaseName);
        if (phaseName === 'sequence_complete') {
            nextPhaseNameForDisplay = 'N/A';
            nextPhaseDescriptionForDisplay = 'N/A';
        } else {
            let referenceIndex = currentPhaseDebugIndex;
            if (phaseName === 'Idle' && status === 'ready') {
                referenceIndex = -1;
            } else if (status === 'completed' && completedPhaseIndex !== -1) {
                referenceIndex = completedPhaseIndex;
            }
            
            nextPhaseNameForDisplay = phaseOrder[referenceIndex + 1] || 'sequence_complete';
            nextPhaseDescriptionForDisplay = phaseDescriptions[nextPhaseNameForDisplay] || nextPhaseNameForDisplay;
        }
        
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

    if (appStateService && typeof appStateService.emit === 'function') {
        appStateService.emit('startup:phaseChanged', phaseInfo);
    } else {
        console.error("[SSM _notifyPhaseChange] appStateService or emit method not available!");
    }
}


function GsapPhase0_Baseline() {
    const phaseName = "P0_Baseline";
    const tl = localGsap.timeline({ 
        onStart: () => { _notifyPhaseChange(phaseName, 'starting'); },
        onComplete: () => { _notifyPhaseChange(phaseName, 'completed'); }
    });
    
    tl.call(() => {
        // console.log(`[Startup P0 EXEC] Setting initial states. Terminal message requested.`);
        
        if (domElementsRegistry.terminalContainer) {
            localGsap.set(domElementsRegistry.terminalContainer, { clearProps: "all", opacity: 1, visibility: 'visible' });
        }
        if (domElementsRegistry.terminalContent) { 
            localGsap.set(domElementsRegistry.terminalContent, { clearProps: "all", opacity: 1, visibility: 'visible' });
        }

        appStateService.emit('requestTerminalMessage', { type: 'startup', source: 'P0_INITIALIZING', messageKey: 'P0_INITIALIZING' });
        
        domElementsRegistry.root.style.setProperty('--global-dim-attenuation', domElementsRegistry.initialCssAttenuationValue || '0.3');

        if (managerInstances.lensManager) managerInstances.lensManager.directUpdateLensVisuals(0);
        if (managerInstances.dialManager) managerInstances.dialManager.setDialsActiveState(false); 
        
        if (managerInstances.uiUpdater) {
            managerInstances.uiUpdater.setLcdState(domElementsRegistry.lcdA, 'lcd--unlit');
            managerInstances.uiUpdater.setLcdState(domElementsRegistry.lcdB, 'lcd--unlit');
            if (domElementsRegistry.terminalContainer) { 
                 managerInstances.uiUpdater.setLcdState(domElementsRegistry.terminalContainer, 'js-active-dim-lcd', {skipClassChange: false});
            }
        }
        if (managerInstances.dialManager) managerInstances.dialManager.resizeAllCanvases(true);
    });
    
    const p0FlickerProfile = configModule.ADVANCED_FLICKER_PROFILES?.terminalP0Flicker;
    let estimatedP0Duration = configModule.MIN_PHASE_DURATION_FOR_STEPPING;
    if (p0FlickerProfile) {
        const avgPeriod = (p0FlickerProfile.periodStart + p0FlickerProfile.periodEnd) / 2;
        estimatedP0Duration = Math.max(estimatedP0Duration, p0FlickerProfile.numCycles * avgPeriod + 0.1); 
    }
    const p0Message = terminalStartupMessages?.P0_INITIALIZING || "INITIALIZING..."; 
    const typingDuration = (p0Message.length * configModule.TERMINAL_TYPING_SPEED_STARTUP_MS_PER_CHAR) / 1000 * 0.75; 
    estimatedP0Duration = Math.max(estimatedP0Duration, typingDuration + 0.1); 

    tl.to({}, { duration: estimatedP0Duration }); 
    return tl;
}

function GsapPhase1_BodyFadeIn(dimAttenuationProxy) { 
    const phaseName = "P1_BodyFadeIn";
    const tl = localGsap.timeline({ 
        onStart: () => { _notifyPhaseChange(phaseName, 'starting'); },
        onComplete: () => { _notifyPhaseChange(phaseName, 'completed'); }
    });
    tl.call(() => { /* console.log(`[Startup P1 EXEC] Starting body fade-in and attenuation.`); */ }, null, 0);

    tl.to(domElementsRegistry.body, { 
        opacity: 1, 
        duration: configModule.BODY_FADE_IN_DURATION, 
        ease: "power1.inOut",
    }, "start_P1");

    if (getComputedStyle(domElementsRegistry.root).getPropertyValue('--global-dim-attenuation')) {
        tl.to(dimAttenuationProxy, { 
            value: 0.0, duration: configModule.ATTENUATION_DURATION, ease: "power1.inOut",
            onUpdate: () => {
                domElementsRegistry.root.style.setProperty('--global-dim-attenuation', dimAttenuationProxy.value.toFixed(2));
            },
            onComplete: () => {
                domElementsRegistry.root.style.setProperty('--global-dim-attenuation', '0.00');
                dimAttenuationProxy.value = 0.0;
            }
        }, `start_P1+=${Math.min(0.1, configModule.BODY_FADE_IN_DURATION * 0.1)}`);
    }
    return tl;
}

function GsapPhase2_MainPowerEnergized() {
    const phaseName = "P2_MainPwr";
    const tl = localGsap.timeline({ 
        onStart: () => { _notifyPhaseChange(phaseName, 'starting'); },
        onComplete: () => { _notifyPhaseChange(phaseName, 'completed'); }
    });
    
    tl.call(() => {
        appStateService.emit('requestTerminalMessage', { type: 'startup', source: 'P2_MAIN_POWER_RESTORED', messageKey: 'P2_MAIN_POWER_RESTORED' });
    }, null, 0); 

    if (domElementsRegistry.mainPwrOnButton && domElementsRegistry.mainPwrOffButton && managerInstances.buttonManager) {
        const pwrOnFlickerTimeline = managerInstances.buttonManager.playFlickerToState(
            domElementsRegistry.mainPwrOnButton, ButtonStates.ENERGIZED_SELECTED,
            { 
                profileName: 'buttonEnergizeP2P5', 
                phaseContext: `${phaseName}_ON_Flicker`,
                isButtonSelectedOverride: true 
            }
        );
        const pwrOffFlickerTimeline = managerInstances.buttonManager.playFlickerToState(
            domElementsRegistry.mainPwrOffButton, ButtonStates.ENERGIZED_UNSELECTED,
            { 
                profileName: 'buttonEnergizeP2P5', 
                phaseContext: `${phaseName}_OFF_Flicker`,
                isButtonSelectedOverride: false 
            }
        );
        if (pwrOnFlickerTimeline) tl.add(pwrOnFlickerTimeline, ">0.05"); 
        if (pwrOffFlickerTimeline) tl.add(pwrOffFlickerTimeline, "<"); 
    } else {
        tl.to({}, { duration: configModule.MIN_PHASE_DURATION_FOR_STEPPING }, ">0.05");
    }
    return tl;
}

function GsapPhase3_LensActivates() {
    const phaseName = "P3_Lens";
    const tl = localGsap.timeline({ 
        onStart: () => { _notifyPhaseChange(phaseName, 'starting'); },
        onComplete: () => { _notifyPhaseChange(phaseName, 'completed'); }
    });
    tl.call(() => { 
        appStateService.emit('requestTerminalMessage', { type: 'startup', source: 'P3_OPTICAL_CORE_ENERGIZING', messageKey: 'P3_OPTICAL_CORE_ENERGIZING' });
    }, null, 0);
    if (managerInstances.lensManager) {
        const lensAnimTimeline = managerInstances.lensManager.energizeLensCoreStartup(); 
        tl.add(lensAnimTimeline, ">");
    } else {
        tl.to({}, { duration: configModule.P3_LENS_RAMP_DURATION_S }, ">");
    }
    return tl;
}

function GsapPhase4_PreStartPriming() {
    const phaseName = "P4_PreStartPriming";
    const tl = localGsap.timeline({ 
        onStart: () => { _notifyPhaseChange(phaseName, 'starting'); },
        onComplete: () => { _notifyPhaseChange(phaseName, 'completed'); }
    });

    tl.call(() => {
        appStateService.emit('requestTerminalMessage', { type: 'startup', source: 'P4_SECONDARY_SYSTEMS_ONLINE', messageKey: 'P4_SECONDARY_SYSTEMS_ONLINE' });
        if (managerInstances.dialManager) managerInstances.dialManager.setDialsActiveState(true); 
        
        const logoSVG = domElementsRegistry.logoContainer.querySelector('svg.logo-svg');
        if (logoSVG && logoSVG.style.opacity !== '0.05') localGsap.set(logoSVG, { opacity: 0.05 }); 
    }, null, 0);

    const lcdFlickerMasterTl = localGsap.timeline(); 
    const lcdElementsToFlicker = [];
    if (domElementsRegistry.lcdA) lcdElementsToFlicker.push(domElementsRegistry.lcdA);
    if (domElementsRegistry.lcdB) lcdElementsToFlicker.push(domElementsRegistry.lcdB);
    
    lcdElementsToFlicker.forEach((lcdEl, index) => {
        if (managerInstances.uiUpdater) {
            const flickerSubTl = managerInstances.uiUpdater.setLcdState(lcdEl, 'lcd--dimly-lit', { 
                useP4Flicker: true,
            });
            if (flickerSubTl) lcdFlickerMasterTl.add(flickerSubTl, index * (configModule.P4_BUTTON_FADE_STAGGER * 0.5)); 
        }
    });

    if (managerInstances.terminalManager && domElementsRegistry.terminalContainer) {
        const terminalScreenFlickerTl = managerInstances.terminalManager.playScreenFlickerToDimlyLit(
            domElementsRegistry.terminalContainer, 
            () => { 
                if (managerInstances.uiUpdater) {
                    managerInstances.uiUpdater.setLcdState(domElementsRegistry.terminalContainer, 'lcd--dimly-lit', {skipClassChange: false});
                }
            }
        );
        if (terminalScreenFlickerTl) lcdFlickerMasterTl.add(terminalScreenFlickerTl, lcdElementsToFlicker.length * (configModule.P4_BUTTON_FADE_STAGGER * 0.5)); 
    }

    if (lcdFlickerMasterTl.duration() > 0) {
        tl.add(lcdFlickerMasterTl, ">0.05"); 
    } else {
        tl.to({}, { duration: configModule.MIN_PHASE_DURATION_FOR_STEPPING }, ">0.05");
    }

    if (managerInstances.buttonManager) {
        const buttonsToPrimeElements = [];
        managerInstances.buttonManager._buttons.forEach((buttonComponent, element) => { 
            const primeGroups = ['skill-scan-group', 'fit-eval-group', 'env', 'lcd', 'logo', 'btn', 'light'];
            if (primeGroups.includes(buttonComponent.getGroupId()) &&
                buttonComponent.getGroupId() !== 'system-power' && 
                !buttonComponent.getCurrentClasses().has('is-energized') &&
                !buttonComponent.getCurrentClasses().has(ButtonStates.DIMLY_LIT)) {
                buttonsToPrimeElements.push(element);
            }
        });

        if (buttonsToPrimeElements.length > 0) {
            shuffleArray(buttonsToPrimeElements);
            const buttonPrimeMasterTl = localGsap.timeline(); 
            buttonsToPrimeElements.forEach((btnEl, index) => {
                const buttonInstance = managerInstances.buttonManager._buttons.get(btnEl);
                if (buttonInstance) {
                    const flickerTl = managerInstances.buttonManager.playFlickerToState(
                        btnEl,
                        ButtonStates.DIMLY_LIT,
                        {
                            profileName: 'buttonP4DimlyLitFlicker',
                            phaseContext: `${phaseName}_BtnDimlyLit_${buttonInstance.getIdentifier()}`
                        }
                    );
                    buttonPrimeMasterTl.add(flickerTl, index * configModule.P4_BUTTON_FADE_STAGGER);
                }
            });
            tl.add(buttonPrimeMasterTl, `>${(configModule.P4_BUTTON_FADE_STAGGER || 0.03) * 1.5}`); 
        } else {
            tl.to({}, { duration: configModule.MIN_PHASE_DURATION_FOR_STEPPING }, ">");
        }
    } else {
        tl.to({}, { duration: configModule.MIN_PHASE_DURATION_FOR_STEPPING }, ">");
    }
    return tl;
}

function GsapPhase5_AuxLightsEnergizeOnly_Dim() {
    const phaseName = "P5_AuxLightsEnergize_Dim";
    const tl = localGsap.timeline({ 
        onStart: () => { _notifyPhaseChange(phaseName, 'starting'); },
        onComplete: () => { _notifyPhaseChange(phaseName, 'completed'); }
    });
    tl.call(() => {
        appStateService.emit('requestTerminalMessage', { type: 'startup', source: 'P5_AUX_LIGHTS_ONLINE', messageKey: 'P5_AUX_LIGHTS_ONLINE' });
    }, null, 0);

    if (managerInstances.buttonManager && domElementsRegistry.auxLightLowButton && domElementsRegistry.auxLightHighButton) {
        const flickerLowTimeline = managerInstances.buttonManager.playFlickerToState(
            domElementsRegistry.auxLightLowButton, ButtonStates.ENERGIZED_SELECTED,
            { 
                profileName: 'buttonEnergizeP2P5', 
                phaseContext: `${phaseName}_LOW_Flicker`,
                isButtonSelectedOverride: true 
            }
        );
        const flickerHighTimeline = managerInstances.buttonManager.playFlickerToState(
            domElementsRegistry.auxLightHighButton, ButtonStates.ENERGIZED_UNSELECTED,
            { 
                profileName: 'buttonEnergizeP2P5', 
                phaseContext: `${phaseName}_HIGH_Flicker`,
                isButtonSelectedOverride: false 
            }
        );
        if (flickerLowTimeline) tl.add(flickerLowTimeline, ">0.05");
        if (flickerHighTimeline) tl.add(flickerHighTimeline, "<"); 
    } else {
        tl.to({}, { duration: configModule.MIN_PHASE_DURATION_FOR_STEPPING }, ">0.05");
    }
    return tl;
}

function _performP6Cleanup() {
    if (p6CleanupPerformed) return;
    // console.log("[StartupSequenceManager _performP6Cleanup] Performing P6 cleanup.");

    elementsAnimatedOnDimExit.forEach(el => {
        el.classList.remove('animate-on-dim-exit');
    });
    elementsAnimatedOnDimExit = []; 

    domElementsRegistry.body.classList.remove('is-transitioning-from-dim');
    if (managerInstances.uiUpdater) managerInstances.uiUpdater.finalizeThemeTransition();
    p6CleanupPerformed = true;
}

function GsapPhase6_ThemeTransitionAndFinalEnergize() {
    const phaseName = "P6_ThemeTransitionAndFinalEnergize";
    const tl = localGsap.timeline({ 
        onStart: () => { _notifyPhaseChange(phaseName, 'starting'); },
        onComplete: () => {
            // This is the onComplete for the P6 phase itself
            _performP6Cleanup(); 
            _notifyPhaseChange(phaseName, 'completed');
        }
    });

    const themeSetupTl = localGsap.timeline(); 
    themeSetupTl.call(() => {
        appStateService.emit('requestTerminalMessage', { type: 'startup', source: 'P6_AMBIENT_THEME_ENGAGED', messageKey: 'P6_AMBIENT_THEME_ENGAGED' });
        if (managerInstances.uiUpdater) managerInstances.uiUpdater.prepareLogoForFullTheme();

        elementsAnimatedOnDimExit = []; 
        selectorsForDimExitAnimation.forEach(selector => {
            document.querySelectorAll(selector).forEach(el => {
                el.classList.add('animate-on-dim-exit');
                elementsAnimatedOnDimExit.push(el);
            });
        });
        
        domElementsRegistry.body.classList.add('is-transitioning-from-dim');

        if (managerInstances.uiUpdater) {
            managerInstances.uiUpdater.setLcdState(domElementsRegistry.lcdA, 'active');
            managerInstances.uiUpdater.setLcdState(domElementsRegistry.lcdB, 'active');
            if (domElementsRegistry.terminalContainer) {
                managerInstances.uiUpdater.setLcdState(domElementsRegistry.terminalContainer, 'active');
            }
        }
    })
    .call(() => {
        appStateService.setTheme('dark'); 
    }, null, `>${configModule.MIN_PHASE_DURATION_FOR_STEPPING * 0.1}`) 
    .to({}, { duration: configModule.P6_CSS_TRANSITION_DURATION }); // This pause allows CSS transitions to run

    tl.add(themeSetupTl, 0); 

    // Determine when the button flickers should start relative to the theme transition
    // Start them slightly after the theme change is initiated to ensure CSS variables are updated
    const energizeStartTime = (configModule.MIN_PHASE_DURATION_FOR_STEPPING * 0.1) + 0.1; 
    tl.addLabel("buttonFlickerInsertionPoint", energizeStartTime);

    // This call will create and add the flicker animations timeline to the main P6 timeline (tl)
    // at the 'buttonFlickerInsertionPoint'.
    tl.call(() => {
        const actualFlickerAnimationsTl = managerInstances.buttonManager.flickerDimlyLitToEnergizedStartup({
            profileName: 'buttonP6EnergizeFlicker', 
            stagger: configModule.P6_BUTTON_ENERGIZE_FLICKER_STAGGER,
            phaseContext: `${phaseName}_AllDimToEnergized`,
            specificGroups: ['skill-scan-group', 'fit-eval-group', 'env', 'lcd', 'logo', 'btn'],
            targetThemeContext: 'theme-dark' 
        });

        // Add the returned timeline of flickers to the main P6 timeline (tl)
        // This ensures tl's duration correctly reflects these added animations.
        if (actualFlickerAnimationsTl && actualFlickerAnimationsTl.duration() > 0.01) {
            tl.add(actualFlickerAnimationsTl, "buttonFlickerInsertionPoint");
        }
    }, null, energizeStartTime); // The call itself happens at energizeStartTime
    
    return tl;
}


function GsapPhase7_SystemReady() {
    const phaseName = "P7_SystemReady";
    const tl = localGsap.timeline({ 
        onStart: () => { _notifyPhaseChange(phaseName, 'starting'); },
        onComplete: () => {
            isFullStartupPlaying = false;
            _notifyPhaseChange(phaseName, 'completed'); 
            _notifyPhaseChange('sequence_complete', 'completed'); 
        }
    });
    tl.call(() => {
        appStateService.emit('requestTerminalMessage', { type: 'startup', source: 'P7_SYSTEM_READY', messageKey: 'P7_SYSTEM_READY' });
        if (managerInstances.buttonManager) {
            managerInstances.buttonManager.confirmGroupSelected('system-power', domElementsRegistry.mainPwrOnButton);
            managerInstances.buttonManager.confirmGroupSelected('light', domElementsRegistry.auxLightLowButton);
            Object.keys(configModule.DEFAULT_ASSIGNMENT_SELECTIONS).forEach(targetKey => {
                managerInstances.buttonManager.confirmGroupSelected(targetKey, configModule.DEFAULT_ASSIGNMENT_SELECTIONS[targetKey].toString());
            });
        }
        appStateService.setAppStatus('interactive'); 
    }, null, 0)
    .call(() => {
        if (managerInstances.dialManager) managerInstances.dialManager.resizeAllCanvases(true);
    }, null, "+=0.05")
    .to({}, { duration: configModule.P7_EFFECTIVE_DURATION }, ">");
    return tl;
}

export function init(config) { 
    localGsap = config.gsap; 
    appStateService = config.appState;
    managerInstances = config.managers;
    domElementsRegistry = config.domElements;
    configModule = config.configModule; 
    if (!configModule) {
        console.error("[StartupSequenceManager INIT] CRITICAL: configModule not provided in config!");
    }
}

function buildMasterTimeline(dimAttenuationProxy) {
    if (masterGsapTimeline) masterGsapTimeline.kill(); 
    masterGsapTimeline = localGsap.timeline({ 
        paused: true,
        onComplete: () => {
            if (isFullStartupPlaying) isFullStartupPlaying = false;
            if (!p6CleanupPerformed) _performP6Cleanup(); // Final catch-all for P6 cleanup
            
            let finalPhaseIndexToNotify = currentPhaseDebugIndex;
            if (appStateService.getAppStatus() === 'interactive') {
                finalPhaseIndexToNotify = phaseOrder.indexOf("P7_SystemReady");
            } else if (masterGsapTimeline.progress() === 1) {
                finalPhaseIndexToNotify = phaseOrder.indexOf("P7_SystemReady");
            }
            
            if (finalPhaseIndexToNotify < phaseOrder.indexOf("P7_SystemReady")) {
                 _notifyPhaseChange(phaseOrder[phaseOrder.indexOf("P7_SystemReady")], 'completed');
            }
            _notifyPhaseChange('sequence_complete', 'completed');
            if (managerInstances.debugManager) managerInstances.debugManager.setNextPhaseButtonEnabled(true);
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
    p6CleanupPerformed = false;
    if (masterGsapTimeline) masterGsapTimeline.pause(0).kill();
    masterGsapTimeline = null;
    localGsap.killTweensOf([domElementsRegistry.body, dimAttenuationProxy]); 
    const logoSVG = domElementsRegistry.logoContainer?.querySelector('svg.logo-svg');
    if (logoSVG) localGsap.killTweensOf(logoSVG); 

    appStateService.setAppStatus('starting-up'); 
    appStateService.setTheme('dim'); 

    if (managerInstances.buttonManager) managerInstances.buttonManager.setInitialDimStates();
    appStateService.setTrueLensPower(0);
    if (managerInstances.lensManager) managerInstances.lensManager.directUpdateLensVisuals(0);

    if (domElementsRegistry.logoContainer && managerInstances.uiUpdater) {
        managerInstances.uiUpdater.injectLogoSVG();
        const existingLogoSvg = domElementsRegistry.logoContainer.querySelector('svg.logo-svg');
        if (existingLogoSvg) localGsap.set(existingLogoSvg, { opacity: 0.05 }); 
    }

    domElementsRegistry.root.style.setProperty('--global-dim-attenuation', dimAttenuationProxy.value.toFixed(2));
    appStateService.updateDialState('A', { hue: configModule.DEFAULT_DIAL_A_HUE, targetHue: configModule.DEFAULT_DIAL_A_HUE, rotation: 0, targetRotation: 0 });
    appStateService.updateDialState('B', { hue: 0, targetHue: 0, rotation: 0, targetRotation: 0 });
    
    if (managerInstances.uiUpdater) {
        managerInstances.uiUpdater.setLcdState(domElementsRegistry.lcdA, 'lcd--unlit');
        managerInstances.uiUpdater.setLcdState(domElementsRegistry.lcdB, 'lcd--unlit');
        if (domElementsRegistry.terminalContainer) {
            managerInstances.uiUpdater.setLcdState(domElementsRegistry.terminalContainer, 'js-active-dim-lcd');
        }
    }
    if (domElementsRegistry.terminalContent) {
        domElementsRegistry.terminalContent.innerHTML = ''; 
        if (managerInstances.terminalManager) {
            managerInstances.terminalManager._initialMessageFlickered = false; 
            managerInstances.terminalManager._messageQueue = []; 
            managerInstances.terminalManager._isTyping = false; 
        }
    }

    localGsap.set(domElementsRegistry.body, { opacity: forStepping ? 1 : 0 }); 
    currentPhaseDebugIndex = -1;
}

export function start(stepMode = true, dimAttenuationProxyInstance) {
    isStepThroughMode = stepMode;
    isFullStartupPlaying = !isStepThroughMode;

    resetVisualsAndState(isStepThroughMode, dimAttenuationProxyInstance);
    buildMasterTimeline(dimAttenuationProxyInstance); 

    if (!isStepThroughMode) { 
        if (managerInstances.debugManager) managerInstances.debugManager.setNextPhaseButtonEnabled(false);
        localGsap.delayedCall(configModule.MIN_PHASE_DURATION_FOR_STEPPING, () => { 
            if (masterGsapTimeline) {
                masterGsapTimeline.restart(); 
            }
        });
    } else { 
        if (masterGsapTimeline) masterGsapTimeline.pause(0);
        if (managerInstances.debugManager) managerInstances.debugManager.setNextPhaseButtonEnabled(true);
    }
}

export function playNextPhase() {
    // console.log(`[SSM Stepper playNextPhase] currentPhaseDebugIndex: ${currentPhaseDebugIndex}`);
    if (!masterGsapTimeline) {
        console.warn("[StartupSequenceManager Stepper] Master timeline not built. Cannot step.");
        if (managerInstances.debugManager) managerInstances.debugManager.setNextPhaseButtonEnabled(true); // Re-enable if stuck
        return;
    }
    // if (masterGsapTimeline.labels) {
    //     console.log(`[SSM Stepper playNextPhase] Master timeline labels:`, Object.keys(masterGsapTimeline.labels));
    // }

    if (masterGsapTimeline.isActive()) {
        masterGsapTimeline.pause(); 
    }

    const targetPhaseIndex = currentPhaseDebugIndex + 1;

    // Handle P6 cleanup specifically if we are moving FROM P6 TO P7
    if (phaseOrder[currentPhaseDebugIndex] === "P6_ThemeTransitionAndFinalEnergize" &&
        phaseOrder[targetPhaseIndex] === "P7_SystemReady") {
        if (!p6CleanupPerformed) {
            _performP6Cleanup();
        }
    }

    if (targetPhaseIndex >= phaseOrder.length - 1) { // "sequence_complete" is the last item
        if (masterGsapTimeline.progress() < 1) {
            if (phaseOrder[currentPhaseDebugIndex] === "P6_ThemeTransitionAndFinalEnergize" && !p6CleanupPerformed) _performP6Cleanup();
            if (managerInstances.debugManager) managerInstances.debugManager.setNextPhaseButtonEnabled(false);
            masterGsapTimeline.play(); 
        } else {
             // Already at the end, ensure button is enabled if sequence was already complete
            if (managerInstances.debugManager) managerInstances.debugManager.setNextPhaseButtonEnabled(true);
        }
        isStepThroughMode = false; 
        return;
    }

    const startLabel = phaseOrder[targetPhaseIndex];
    const endLabel = phaseOrder[targetPhaseIndex + 1];
    
    if (typeof masterGsapTimeline.labels[startLabel] !== 'number') {
        console.error(`[SSM Stepper] Invalid start label or label not found: ${startLabel}. Available labels:`, Object.keys(masterGsapTimeline.labels));
        if (managerInstances.debugManager) managerInstances.debugManager.setNextPhaseButtonEnabled(true); // Re-enable if stuck
        return;
    }
    const startTime = masterGsapTimeline.labels[startLabel];
    let endTime = masterGsapTimeline.labels[endLabel];

    if (typeof endTime !== 'number') {
        if (endLabel === "sequence_complete") { 
            endTime = masterGsapTimeline.duration();
        } else {
            console.warn(`[SSM Stepper] End label '${endLabel}' not found. Using timeline duration. Available labels:`, Object.keys(masterGsapTimeline.labels));
            endTime = masterGsapTimeline.duration();
        }
    }
    
    if (typeof startTime !== 'number') {
        console.error(`[SSM Stepper] startTime for ${startLabel} is not a number. Cannot play.`)
        if (managerInstances.debugManager) managerInstances.debugManager.setNextPhaseButtonEnabled(true); // Re-enable
        return;
    }
    masterGsapTimeline.pause(startTime); 
    
    const actualSegmentTime = Math.max(0, endTime - startTime);
    const tweenDuration = Math.max(configModule.MIN_PHASE_DURATION_FOR_STEPPING || 0.05, actualSegmentTime);

    _notifyPhaseChange(startLabel, 'starting'); 
    if (managerInstances.debugManager) managerInstances.debugManager.setNextPhaseButtonEnabled(false);

    masterGsapTimeline.tweenFromTo(startTime, endTime, {
        duration: tweenDuration,
        ease: "none",
        overwrite: true, // Kill any previous tween controlling the master timeline's playhead
        onComplete: () => {
            // console.log(`[SSM Stepper playNextPhase ONCOMPLETE] Phase ${startLabel} tween completed. Updating currentPhaseDebugIndex from ${currentPhaseDebugIndex} to ${targetPhaseIndex}.`);
            if (masterGsapTimeline) masterGsapTimeline.pause(endTime); 
            currentPhaseDebugIndex = targetPhaseIndex; 
            
            // Specific cleanup for P6 if this step was P6
            if (startLabel === "P6_ThemeTransitionAndFinalEnergize" && !p6CleanupPerformed) {
                _performP6Cleanup();
            }
            _notifyPhaseChange(startLabel, 'completed'); 
            if (managerInstances.debugManager) managerInstances.debugManager.setNextPhaseButtonEnabled(true);
        }
    });
}

export function resetSequence(dimAttenuationProxyInstance) {
    start(true, dimAttenuationProxyInstance); 
    if (managerInstances.debugManager) managerInstances.debugManager.setNextPhaseButtonEnabled(true);
}

export function getCurrentPhaseInfo() {
    const currentName = currentPhaseDebugIndex < 0 ? "Idle" : phaseOrder[currentPhaseDebugIndex];
    const nextName = (currentPhaseDebugIndex + 1 < phaseOrder.length) ? phaseOrder[currentPhaseDebugIndex + 1] : "None";

    let status = 'ready'; 
    if (masterGsapTimeline && masterGsapTimeline.isActive() && !isFullStartupPlaying) { 
        status = 'starting'; 
    } else if (currentName === "sequence_complete" || (masterGsapTimeline && masterGsapTimeline.progress() === 1)) {
        status = 'completed';
    }

    return {
        currentPhaseName: currentName,
        status: status, 
        description: phaseDescriptions[currentName] || currentName,
        nextPhaseName: nextName,
        nextPhaseDescription: phaseDescriptions[nextName] || nextName,
    };
}