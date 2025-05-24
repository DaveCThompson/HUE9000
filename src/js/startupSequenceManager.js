/**
 * @module startupSequenceManager (SSR-V1.0 Refactor -> XState Refactor)
 * @description Manages the application startup sequence using XState.
 * Orchestrates visual changes and state updates across various UI managers.
 */
import { interpret } from 'xstate';
import { startupMachine } from './startupMachine.js'; // Import the machine definition

// --- Module-level state for the startup sequence ---
let localGsap = null;
let appStateService = null;
let managerInstances = {};
let domElementsRegistry = {};
let configModule = null;

let fsmInterpreter = null;
let previousFsmSnapshotValue = null; // To help detect actual changes

let LReductionProxy = { value: 0.85 }; 
let opacityFactorProxy = { value: 0.15 }; 


const fsmStateToPhaseNameMap = {
    'IDLE': 'Idle',
    'RUNNING_SEQUENCE.PHASE_0_IDLE': 'startupPhaseP0_idle',
    'RUNNING_SEQUENCE.PHASE_1_EMERGENCY_SUBSYSTEMS': 'startupPhaseP1_emergency',
    'RUNNING_SEQUENCE.PHASE_2_BACKUP_POWER': 'startupPhaseP2_backupPower',
    'RUNNING_SEQUENCE.PHASE_3_MAIN_POWER_ONLINE': 'startupPhaseP3_mainPowerOnline',
    'RUNNING_SEQUENCE.PHASE_4_OPTICAL_CORE_REACTIVATE': 'startupPhaseP4_opticalCoreReactivate',
    'RUNNING_SEQUENCE.PHASE_5_DIAGNOSTIC_INTERFACE': 'startupPhaseP5_diagnosticInterface',
    'RUNNING_SEQUENCE.PHASE_6_MOOD_INTENSITY_CONTROLS': 'startupPhaseP6_moodIntensityControls',
    'RUNNING_SEQUENCE.PHASE_7_HUE_CORRECTION_SYSTEMS': 'startupPhaseP7_hueCorrectionSystems',
    'RUNNING_SEQUENCE.PHASE_8_EXTERNAL_LIGHTING_CONTROLS': 'startupPhaseP8_externalLightingControls',
    'RUNNING_SEQUENCE.PHASE_9_AUX_LIGHTING_LOW': 'startupPhaseP9_auxLightingLow',
    'RUNNING_SEQUENCE.PHASE_10_THEME_TRANSITION': 'startupPhaseP10_themeTransition',
    'RUNNING_SEQUENCE.PHASE_11_SYSTEM_OPERATIONAL': 'startupPhaseP11_systemOperational',
    'PAUSED_AWAITING_NEXT_STEP': 'PAUSED',
    'SYSTEM_READY': 'sequence_complete',
    'ERROR_STATE': 'ERROR'
};

const phaseDescriptionsForFSM = {
    "Idle": "System Idle, awaiting startup.",
    "startupPhaseP0_idle": "Phase 0: System Idle / Baseline Setup",
    "startupPhaseP1_emergency": "Phase 1: Initializing Emergency Subsystems",
    "startupPhaseP2_backupPower": "Phase 2: Activating Backup Power Systems",
    "startupPhaseP3_mainPowerOnline": "Phase 3: Main Power Online",
    "startupPhaseP4_opticalCoreReactivate": "Phase 4: Reactivating Optical Core",
    "startupPhaseP5_diagnosticInterface": "Phase 5: Initializing Diagnostic Control Interface",
    "startupPhaseP6_moodIntensityControls": "Phase 6: Initializing Mood and Intensity Controls",
    "startupPhaseP7_hueCorrectionSystems": "Phase 7: Initializing Hue Correction Systems",
    "startupPhaseP8_externalLightingControls": "Phase 8: Initializing External Lighting Controls",
    "startupPhaseP9_auxLightingLow": "Phase 9: Activating Auxiliary Lighting: Low Intensity",
    "startupPhaseP10_themeTransition": "Phase 10: Engaging Ambient Theme",
    "startupPhaseP11_systemOperational": "Phase 11: HUE 9000 Operational",
    "PAUSED": "Paused, awaiting next step.",
    "sequence_complete": "All Startup Phases Done",
    "ERROR": "Startup Error Occurred"
};

const fsmPhaseSequence = [
    'PHASE_0_IDLE',
    'PHASE_1_EMERGENCY_SUBSYSTEMS',
    'PHASE_2_BACKUP_POWER',
    'PHASE_3_MAIN_POWER_ONLINE',
    'PHASE_4_OPTICAL_CORE_REACTIVATE',
    'PHASE_5_DIAGNOSTIC_INTERFACE',
    'PHASE_6_MOOD_INTENSITY_CONTROLS',
    'PHASE_7_HUE_CORRECTION_SYSTEMS',
    'PHASE_8_EXTERNAL_LIGHTING_CONTROLS',
    'PHASE_9_AUX_LIGHTING_LOW',
    'PHASE_10_THEME_TRANSITION',
    'PHASE_11_SYSTEM_OPERATIONAL'
];

// Helper to extract numeric phase from FSM state name string
function getNumericPhaseFromFsmStateName(fsmStateName) {
    if (!fsmStateName || typeof fsmStateName !== 'string') return -1; // Default for unknown/idle
    const match = fsmStateName.match(/PHASE_(\d+)_/i);
    if (match && match[1]) {
        return parseInt(match[1], 10);
    }
    if (fsmStateName === 'IDLE') return -1;
    if (fsmStateName === 'SYSTEM_READY' || fsmStateName === 'sequence_complete') return 99; // Arbitrary number for complete
    return -1; // Default for non-numbered states
}


function _getPhaseNameFromFsmState(fsmStateValue) {
    if (typeof fsmStateValue === 'string') return fsmStateToPhaseNameMap[fsmStateValue] || fsmStateValue;
    if (typeof fsmStateValue === 'object') {
        const parent = Object.keys(fsmStateValue)[0];
        const child = fsmStateValue[parent];
        return fsmStateToPhaseNameMap[`${parent}.${child}`] || `${parent}.${child}`;
    }
    return 'UnknownState';
}

function _notifyFsmTransition(snapshot) {
    if (!appStateService || !snapshot) return;

    const currentPhaseKey = _getPhaseNameFromFsmState(snapshot.value); 
    const numericPhase = getNumericPhaseFromFsmStateName(typeof snapshot.value === 'string' ? snapshot.value : Object.values(snapshot.value)[0]);
    appStateService.setCurrentStartupPhaseNumber(numericPhase);


    let status = 'unknown';
    if (snapshot.matches('IDLE')) status = 'ready';
    else if (snapshot.matches('PAUSED_AWAITING_NEXT_STEP')) status = 'paused';
    else if (snapshot.matches('SYSTEM_READY') || snapshot.matches('ERROR_STATE')) status = 'completed';
    else if (snapshot.event && (snapshot.event.type.startsWith('done.invoke') || snapshot.event.type.startsWith('error.platform'))) status = 'completed';
    else if (snapshot.changed) status = 'starting';

    let nextPhaseKey = 'N/A';
    let nextPhaseDescription = 'N/A';

    if (snapshot.matches('PAUSED_AWAITING_NEXT_STEP')) {
        const resumeTargetFsmStateName = snapshot.context.currentPhaseNameForResume; 
        if (resumeTargetFsmStateName === 'SYSTEM_READY_TARGET') {
            nextPhaseKey = 'sequence_complete';
        } else {
            const fullResumePath = `RUNNING_SEQUENCE.${resumeTargetFsmStateName}`;
            nextPhaseKey = fsmStateToPhaseNameMap[fullResumePath] || resumeTargetFsmStateName;
        }
        nextPhaseDescription = phaseDescriptionsForFSM[nextPhaseKey] || nextPhaseKey;
    } else if (!snapshot.done && !snapshot.matches('ERROR_STATE')) {
        const currentFsmStateName = typeof snapshot.value === 'string' ? snapshot.value.split('.').pop() : Object.values(snapshot.value)[0];
        const currentIndex = fsmPhaseSequence.indexOf(currentFsmStateName);

        if (currentIndex !== -1 && currentIndex < fsmPhaseSequence.length - 1) {
            const nextFsmStateName = fsmPhaseSequence[currentIndex + 1];
            const fullNextPath = `RUNNING_SEQUENCE.${nextFsmStateName}`;
            nextPhaseKey = fsmStateToPhaseNameMap[fullNextPath] || nextFsmStateName;
            nextPhaseDescription = phaseDescriptionsForFSM[nextPhaseKey] || nextPhaseKey;
        } else if (currentIndex === fsmPhaseSequence.length - 1) { 
            nextPhaseKey = 'sequence_complete';
            nextPhaseDescription = phaseDescriptionsForFSM[nextPhaseKey];
        }
    }


    const phaseInfo = {
        currentPhaseName: currentPhaseKey,
        status: status,
        description: phaseDescriptionsForFSM[currentPhaseKey] || currentPhaseKey,
        nextPhaseName: nextPhaseKey,
        nextPhaseDescription: nextPhaseDescription,
        fsmStateValue: snapshot.value,
        fsmContext: snapshot.context
    };
    appStateService.emit('startup:phaseChanged', phaseInfo);

    if (managerInstances.debugManager) {
        if (snapshot.matches('PAUSED_AWAITING_NEXT_STEP') || snapshot.matches('IDLE') || snapshot.matches('SYSTEM_READY') || snapshot.matches('ERROR_STATE')) {
            managerInstances.debugManager.setNextPhaseButtonEnabled(true);
        } else {
            managerInstances.debugManager.setNextPhaseButtonEnabled(false);
        }
    }
}


export function init(config) {
    localGsap = config.gsap;
    appStateService = config.appState;
    managerInstances = config.managers;
    domElementsRegistry = config.domElements;
    configModule = config.configModule;

    if (!domElementsRegistry.elementsAnimatedOnDimExit) {
        domElementsRegistry.elementsAnimatedOnDimExit = [];
    }
    if (!configModule) {
        console.error("[StartupSequenceManager INIT] CRITICAL: configModule not provided!");
    }

    if (configModule && configModule.STARTUP_L_REDUCTION_FACTORS) {
        LReductionProxy.value = configModule.STARTUP_L_REDUCTION_FACTORS.P0;
        opacityFactorProxy.value = 1.0 - LReductionProxy.value;
    } else {
        console.warn("[StartupSequenceManager INIT] STARTUP_L_REDUCTION_FACTORS not found in config. Using default proxy values: L=0.85, O=0.15.");
        LReductionProxy.value = 0.85;
        opacityFactorProxy.value = 0.15;
    }
}

function _performThemeTransitionCleanupLocal() { 
    if (domElementsRegistry.elementsAnimatedOnDimExit && domElementsRegistry.elementsAnimatedOnDimExit.length > 0) {
        domElementsRegistry.elementsAnimatedOnDimExit.forEach(el => {
            el.classList.remove('animate-on-dim-exit');
        });
        domElementsRegistry.elementsAnimatedOnDimExit = []; 
    }
    domElementsRegistry.body.classList.remove('is-transitioning-from-dim');
    if (managerInstances.uiUpdater) managerInstances.uiUpdater.finalizeThemeTransition();
    console.log("[SSM _performThemeTransitionCleanupLocal] Theme transition classes removed.");
}

function resetVisualsAndState(forStepping = false) {
    console.log("[SSM resetVisualsAndState] Resetting visuals and state for P0 (Idle).");
    if (fsmInterpreter) {
        fsmInterpreter.stop();
        fsmInterpreter = null;
    }
    previousFsmSnapshotValue = null;

    // MODIFIED: Remove pre-boot class at the very start
    if (domElementsRegistry.body.classList.contains('pre-boot')) {
        domElementsRegistry.body.classList.remove('pre-boot');
        console.log("[SSM resetVisualsAndState] 'pre-boot' class removed from body.");
    }

    localGsap.killTweensOf([domElementsRegistry.body, LReductionProxy, opacityFactorProxy]);

    LReductionProxy.value = configModule.STARTUP_L_REDUCTION_FACTORS.P0;
    opacityFactorProxy.value = 1.0 - LReductionProxy.value;
    domElementsRegistry.root.style.setProperty('--startup-L-reduction-factor', LReductionProxy.value.toFixed(3));
    domElementsRegistry.root.style.setProperty('--startup-opacity-factor', opacityFactorProxy.value.toFixed(3));
    // Update boosted factor as well
    const initialBoostedOpacity = Math.min(1, opacityFactorProxy.value * 1.25);
    domElementsRegistry.root.style.setProperty('--startup-opacity-factor-boosted', initialBoostedOpacity.toFixed(3));

    console.log(`[SSM resetVisualsAndState] Initial CSS vars set: L-factor: ${LReductionProxy.value.toFixed(3)}, O-factor: ${opacityFactorProxy.value.toFixed(3)}, O-boosted: ${initialBoostedOpacity.toFixed(3)}`);


    const logoSVG = domElementsRegistry.logoContainer?.querySelector('svg.logo-svg');
    if (logoSVG) localGsap.killTweensOf(logoSVG);

    appStateService.setAppStatus('starting-up'); 
    appStateService.setCurrentStartupPhaseNumber(-1); // Reset to pre-P0 state
    appStateService.setTheme('dim'); 

    if (managerInstances.buttonManager) managerInstances.buttonManager.setInitialDimStates(); 
    appStateService.setTrueLensPower(0);
    if (managerInstances.lensManager) managerInstances.lensManager.directUpdateLensVisuals(0);

    if (domElementsRegistry.logoContainer && managerInstances.uiUpdater) {
        managerInstances.uiUpdater.injectLogoSVG(); 
    }

    appStateService.updateDialState('A', { hue: configModule.DEFAULT_DIAL_A_HUE, targetHue: configModule.DEFAULT_DIAL_A_HUE, rotation: 0, targetRotation: 0, isDragging: false });
    appStateService.updateDialState('B', { hue: 0, targetHue: 0, rotation: 0, targetRotation: 0, isDragging: false });

    if (managerInstances.uiUpdater) {
        // setLcdState will apply 'lcd--unlit' which uses theme-dim's --lcd-unlit-text-a (now 0.85)
        managerInstances.uiUpdater.setLcdState(domElementsRegistry.lcdA, 'lcd--unlit', { skipClassChange: false });
        managerInstances.uiUpdater.setLcdState(domElementsRegistry.lcdB, 'lcd--unlit', { skipClassChange: false });
        if (domElementsRegistry.terminalContainer) { 
            managerInstances.uiUpdater.setLcdState(domElementsRegistry.terminalContainer, 'lcd--unlit', { skipClassChange: false });
        }
    }
    if (domElementsRegistry.terminalContent) { 
        domElementsRegistry.terminalContent.innerHTML = ''; 
        // Opacity 1 for content area, visibility of text controlled by line flickers / typing
        localGsap.set(domElementsRegistry.terminalContent, { opacity: 1, visibility: 'visible' }); 
        if (managerInstances.terminalManager) {
            managerInstances.terminalManager._initialMessageFlickered = false;
            managerInstances.terminalManager._messageQueue = [];
            managerInstances.terminalManager._isTyping = false;
            if (managerInstances.terminalManager._cursorElement && managerInstances.terminalManager._cursorElement.parentNode) {
                managerInstances.terminalManager._cursorElement.parentNode.removeChild(managerInstances.terminalManager._cursorElement);
            }
        }
    }

    localGsap.set(domElementsRegistry.body, { opacity: forStepping ? 1 : 0 }); 
    console.log("[SSM resetVisualsAndState] P0 Idle state setup complete.");
}

export function start(stepMode = true) {
    resetVisualsAndState(stepMode); 

    const initialFsmContext = {
        dependencies: {
            gsap: localGsap,
            appStateService,
            managerInstances,
            domElementsRegistry,
            configModule,
            LReductionProxy, 
            opacityFactorProxy, 
            performThemeTransitionCleanup: _performThemeTransitionCleanupLocal,
        },
        isStepThroughMode: stepMode,
        currentPhaseNameForResume: '', 
        errorInfo: null,
        themeTransitionCleanupPerformed: false 
    };

    fsmInterpreter = interpret(startupMachine);

    fsmInterpreter.subscribe(snapshot => {
        const currentValueString = JSON.stringify(snapshot.value);
        if (snapshot.changed ||
            currentValueString !== previousFsmSnapshotValue ||
            snapshot.matches('ERROR_STATE') ||
            snapshot.matches('SYSTEM_READY')) {
            _notifyFsmTransition(snapshot);
            previousFsmSnapshotValue = currentValueString;
        }
    });

    fsmInterpreter.start();
    fsmInterpreter.send({
        type: 'START_SEQUENCE',
        isStepThroughMode: stepMode,
        dependencies: initialFsmContext.dependencies
    });
}

export function playNextPhase() {
    if (fsmInterpreter) {
        const currentState = fsmInterpreter.getSnapshot();
        if (!currentState.done && !currentState.matches('ERROR_STATE')) {
            fsmInterpreter.send({ type: 'NEXT_STEP_REQUESTED' });
        } else {
            console.log("[SSM playNextPhase] Sequence already complete or in error state. Reset to run again.");
            if (managerInstances.debugManager) managerInstances.debugManager.setNextPhaseButtonEnabled(true);
        }
    }
}

export function resetSequence() {
    start(true); 
}

export function getCurrentPhaseInfo() {
    if (fsmInterpreter) {
        const state = fsmInterpreter.getSnapshot();
        const currentPhaseKey = _getPhaseNameFromFsmState(state.value);
        let nextPhaseKey = 'N/A';
        let nextPhaseDescription = 'N/A';

        if (state.matches('PAUSED_AWAITING_NEXT_STEP')) {
            const resumeTargetFsmStateName = state.context.currentPhaseNameForResume;
            if (resumeTargetFsmStateName === 'SYSTEM_READY_TARGET') {
                nextPhaseKey = 'sequence_complete';
            } else {
                const fullResumePath = `RUNNING_SEQUENCE.${resumeTargetFsmStateName}`;
                nextPhaseKey = fsmStateToPhaseNameMap[fullResumePath] || resumeTargetFsmStateName;
            }
            nextPhaseDescription = phaseDescriptionsForFSM[nextPhaseKey] || nextPhaseKey;
        } else if (!state.done && !state.matches('ERROR_STATE')) {
            const currentFsmStateName = typeof state.value === 'string' ? state.value.split('.').pop() : Object.values(state.value)[0];
            const currentIndex = fsmPhaseSequence.indexOf(currentFsmStateName);
            if (currentIndex !== -1 && currentIndex < fsmPhaseSequence.length - 1) {
                const nextFsmStateName = fsmPhaseSequence[currentIndex + 1];
                const fullNextPath = `RUNNING_SEQUENCE.${nextFsmStateName}`;
                nextPhaseKey = fsmStateToPhaseNameMap[fullNextPath] || nextFsmStateName;
                nextPhaseDescription = phaseDescriptionsForFSM[nextPhaseKey] || nextPhaseKey;
            } else if (currentIndex === fsmPhaseSequence.length - 1) {
                nextPhaseKey = 'sequence_complete';
                nextPhaseDescription = phaseDescriptionsForFSM[nextPhaseKey];
            }
        }

        return {
            currentPhaseName: currentPhaseKey,
            status: state.matches('PAUSED_AWAITING_NEXT_STEP') ? 'paused' : (state.done ? 'completed' : 'starting'),
            description: phaseDescriptionsForFSM[currentPhaseKey] || currentPhaseKey,
            nextPhaseName: nextPhaseKey,
            nextPhaseDescription: nextPhaseDescription,
        };
    }
    const initialNextFsmStateName = fsmPhaseSequence[0]; 
    const initialNextPath = `RUNNING_SEQUENCE.${initialNextFsmStateName}`;
    const initialNextPhaseKey = fsmStateToPhaseNameMap[initialNextPath] || initialNextFsmStateName;

    return {
        currentPhaseName: 'Idle',
        status: 'ready',
        description: phaseDescriptionsForFSM.Idle,
        nextPhaseName: initialNextPhaseKey,
        nextPhaseDescription: phaseDescriptionsForFSM[initialNextPhaseKey] || initialNextPhaseKey
    };
}