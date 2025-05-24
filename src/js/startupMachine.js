/**
 * @module startupMachine
 * @description Defines the XState machine for the HUE 9000 startup sequence.
 */
import { createMachine, assign, fromPromise } from 'xstate'; 

const createPhaseService = (importPath) => {
    return fromPromise(async ({ input }) => { 
        const phaseModule = await import(importPath);
        if (!phaseModule || typeof phaseModule.createPhaseTimeline !== 'function') {
            console.error(`Error importing or finding createPhaseTimeline in ${importPath}`);
            throw new Error(`Failed to load phase module: ${importPath}`);
        }
        return phaseModule.createPhaseTimeline(input.dependencies);
    });
};

export const startupMachine = createMachine({ 
    id: 'hue9000Startup',
    initial: 'IDLE',
    predictableActionArguments: true,
    context: {
        dependencies: null, // Initialized as null
        isStepThroughMode: true,
        currentPhaseNameForResume: '', 
        errorInfo: null,
        themeTransitionCleanupPerformed: false, 
    },
    states: {
        IDLE: {
            // REMOVED entry action that caused the error.
            // setCurrentStartupPhaseNumber(-1) is handled by startupSequenceManager.resetVisualsAndState()
            // before the FSM is started or when reset.
            on: {
                START_SEQUENCE: {
                    target: 'RUNNING_SEQUENCE.PHASE_0_IDLE', 
                    actions: [
                        assign({
                            isStepThroughMode: ({ event }) => event.isStepThroughMode,
                            dependencies: ({ event }) => event.dependencies, // Dependencies are assigned here
                            themeTransitionCleanupPerformed: false, 
                            errorInfo: null,
                        }),
                        // Ensure phase number is set to 0 when starting the sequence,
                        // if not already handled by PHASE_0_IDLE entry.
                        // This is now handled by PHASE_0_IDLE's entry action.
                        'logStartSequence'
                    ]
                }
            }
        },
        RUNNING_SEQUENCE: {
            initial: 'PHASE_0_IDLE',
            states: {
                PHASE_0_IDLE: { 
                    entry: ['setPhaseNumberActionP0', 'notifyPhaseChangeAction'],
                    invoke: {
                        id: 'phaseP0Service',
                        src: createPhaseService('./startupPhase0.js'), 
                        input: ({ context }) => ({ dependencies: context.dependencies }),
                        onDone: [
                            { target: '#hue9000Startup.PAUSED_AWAITING_NEXT_STEP', guard: 'isStepThrough', actions: assign({ currentPhaseNameForResume: 'PHASE_1_EMERGENCY_SUBSYSTEMS' }) },
                            { target: 'PHASE_1_EMERGENCY_SUBSYSTEMS' }
                        ],
                        onError: { target: '#hue9000Startup.ERROR_STATE', actions: 'assignError' }
                    },
                    exit: 'notifyPhaseChangeAction' 
                },
                PHASE_1_EMERGENCY_SUBSYSTEMS: { 
                    entry: ['setPhaseNumberActionP1', 'notifyPhaseChangeAction'],
                    invoke: {
                        id: 'phaseP1Service',
                        src: createPhaseService('./startupPhase1.js'), 
                        input: ({ context }) => ({ dependencies: context.dependencies }),
                        onDone: [
                            { target: '#hue9000Startup.PAUSED_AWAITING_NEXT_STEP', guard: 'isStepThrough', actions: assign({ currentPhaseNameForResume: 'PHASE_2_BACKUP_POWER' }) },
                            { target: 'PHASE_2_BACKUP_POWER' }
                        ],
                        onError: { target: '#hue9000Startup.ERROR_STATE', actions: 'assignError' }
                    },
                    exit: 'notifyPhaseChangeAction'
                },
                PHASE_2_BACKUP_POWER: { 
                    entry: ['setPhaseNumberActionP2', 'notifyPhaseChangeAction'],
                    invoke: {
                        id: 'phaseP2Service',
                        src: createPhaseService('./startupPhase2.js'), 
                        input: ({ context }) => ({ dependencies: context.dependencies }),
                        onDone: [
                            { target: '#hue9000Startup.PAUSED_AWAITING_NEXT_STEP', guard: 'isStepThrough', actions: assign({ currentPhaseNameForResume: 'PHASE_3_MAIN_POWER_ONLINE' }) },
                            { target: 'PHASE_3_MAIN_POWER_ONLINE' }
                        ],
                        onError: { target: '#hue9000Startup.ERROR_STATE', actions: 'assignError' }
                    },
                    exit: 'notifyPhaseChangeAction'
                },
                PHASE_3_MAIN_POWER_ONLINE: { 
                    entry: ['setPhaseNumberActionP3', 'notifyPhaseChangeAction'],
                    invoke: {
                        id: 'phaseP3Service',
                        src: createPhaseService('./startupPhase3.js'), 
                        input: ({ context }) => ({ dependencies: context.dependencies }),
                        onDone: [
                            { target: '#hue9000Startup.PAUSED_AWAITING_NEXT_STEP', guard: 'isStepThrough', actions: assign({ currentPhaseNameForResume: 'PHASE_4_OPTICAL_CORE_REACTIVATE' }) },
                            { target: 'PHASE_4_OPTICAL_CORE_REACTIVATE' }
                        ],
                        onError: { target: '#hue9000Startup.ERROR_STATE', actions: 'assignError' }
                    },
                    exit: 'notifyPhaseChangeAction'
                },
                PHASE_4_OPTICAL_CORE_REACTIVATE: { 
                    entry: ['setPhaseNumberActionP4', 'notifyPhaseChangeAction'],
                    invoke: {
                        id: 'phaseP4Service',
                        src: createPhaseService('./startupPhase4.js'), 
                        input: ({ context }) => ({ dependencies: context.dependencies }),
                        onDone: [
                            { target: '#hue9000Startup.PAUSED_AWAITING_NEXT_STEP', guard: 'isStepThrough', actions: assign({ currentPhaseNameForResume: 'PHASE_5_DIAGNOSTIC_INTERFACE' }) },
                            { target: 'PHASE_5_DIAGNOSTIC_INTERFACE' }
                        ],
                        onError: { target: '#hue9000Startup.ERROR_STATE', actions: 'assignError' }
                    },
                    exit: 'notifyPhaseChangeAction'
                },
                PHASE_5_DIAGNOSTIC_INTERFACE: { 
                    entry: ['setPhaseNumberActionP5', 'notifyPhaseChangeAction'],
                    invoke: {
                        id: 'phaseP5Service',
                        src: createPhaseService('./startupPhase5.js'), 
                        input: ({ context }) => ({ dependencies: context.dependencies }),
                        onDone: [
                            { target: '#hue9000Startup.PAUSED_AWAITING_NEXT_STEP', guard: 'isStepThrough', actions: assign({ currentPhaseNameForResume: 'PHASE_6_MOOD_INTENSITY_CONTROLS' }) },
                            { target: 'PHASE_6_MOOD_INTENSITY_CONTROLS' }
                        ],
                        onError: { target: '#hue9000Startup.ERROR_STATE', actions: 'assignError' }
                    },
                    exit: 'notifyPhaseChangeAction'
                },
                PHASE_6_MOOD_INTENSITY_CONTROLS: { 
                    entry: ['setPhaseNumberActionP6', 'notifyPhaseChangeAction'],
                    invoke: {
                        id: 'phaseP6Service',
                        src: createPhaseService('./startupPhase6.js'), 
                        input: ({ context }) => ({ dependencies: context.dependencies }),
                        onDone: [
                            { target: '#hue9000Startup.PAUSED_AWAITING_NEXT_STEP', guard: 'isStepThrough', actions: assign({ currentPhaseNameForResume: 'PHASE_7_HUE_CORRECTION_SYSTEMS' }) },
                            { target: 'PHASE_7_HUE_CORRECTION_SYSTEMS' }
                        ],
                        onError: { target: '#hue9000Startup.ERROR_STATE', actions: 'assignError' }
                    },
                    exit: 'notifyPhaseChangeAction'
                },
                PHASE_7_HUE_CORRECTION_SYSTEMS: { 
                    entry: ['setPhaseNumberActionP7', 'notifyPhaseChangeAction'],
                    invoke: {
                        id: 'phaseP7Service',
                        src: createPhaseService('./startupPhase7.js'), 
                        input: ({ context }) => ({ dependencies: context.dependencies }),
                        onDone: [
                            { target: '#hue9000Startup.PAUSED_AWAITING_NEXT_STEP', guard: 'isStepThrough', actions: assign({ currentPhaseNameForResume: 'PHASE_8_EXTERNAL_LIGHTING_CONTROLS' }) },
                            { target: 'PHASE_8_EXTERNAL_LIGHTING_CONTROLS' }
                        ],
                        onError: { target: '#hue9000Startup.ERROR_STATE', actions: 'assignError' }
                    },
                    exit: 'notifyPhaseChangeAction'
                },
                PHASE_8_EXTERNAL_LIGHTING_CONTROLS: { 
                    entry: ['setPhaseNumberActionP8', 'notifyPhaseChangeAction'],
                    invoke: {
                        id: 'phaseP8Service',
                        src: createPhaseService('./startupPhase8.js'), 
                        input: ({ context }) => ({ dependencies: context.dependencies }),
                        onDone: [
                            { target: '#hue9000Startup.PAUSED_AWAITING_NEXT_STEP', guard: 'isStepThrough', actions: assign({ currentPhaseNameForResume: 'PHASE_9_AUX_LIGHTING_LOW' }) },
                            { target: 'PHASE_9_AUX_LIGHTING_LOW' }
                        ],
                        onError: { target: '#hue9000Startup.ERROR_STATE', actions: 'assignError' }
                    },
                    exit: 'notifyPhaseChangeAction'
                },
                PHASE_9_AUX_LIGHTING_LOW: { 
                    entry: ['setPhaseNumberActionP9', 'notifyPhaseChangeAction'],
                    invoke: {
                        id: 'phaseP9Service',
                        src: createPhaseService('./startupPhase9.js'), 
                        input: ({ context }) => ({ dependencies: context.dependencies }),
                        onDone: [
                            { target: '#hue9000Startup.PAUSED_AWAITING_NEXT_STEP', guard: 'isStepThrough', actions: assign({ currentPhaseNameForResume: 'PHASE_10_THEME_TRANSITION' }) },
                            { target: 'PHASE_10_THEME_TRANSITION' }
                        ],
                        onError: { target: '#hue9000Startup.ERROR_STATE', actions: 'assignError' }
                    },
                    exit: 'notifyPhaseChangeAction'
                },
                PHASE_10_THEME_TRANSITION: { 
                    entry: ['setPhaseNumberActionP10', 'notifyPhaseChangeAction'],
                    invoke: {
                        id: 'phaseP10Service',
                        src: createPhaseService('./startupPhase10.js'), 
                        input: ({ context }) => ({ dependencies: context.dependencies }),
                        onDone: [
                            { target: '#hue9000Startup.PAUSED_AWAITING_NEXT_STEP', guard: 'isStepThrough', actions: assign({ currentPhaseNameForResume: 'PHASE_11_SYSTEM_OPERATIONAL' }) },
                            { target: 'PHASE_11_SYSTEM_OPERATIONAL' }
                        ],
                        onError: { target: '#hue9000Startup.ERROR_STATE', actions: 'assignError' }
                    },
                    exit: 'notifyPhaseChangeAction'
                },
                PHASE_11_SYSTEM_OPERATIONAL: { 
                    entry: ['setPhaseNumberActionP11', 'performThemeTransitionCleanupIfNeeded', 'notifyPhaseChangeAction'], 
                    invoke: {
                        id: 'phaseP11Service',
                        src: createPhaseService('./startupPhase11.js'), 
                        input: ({ context }) => ({ dependencies: context.dependencies }),
                        onDone: [
                            { target: '#hue9000Startup.PAUSED_AWAITING_NEXT_STEP', guard: 'isStepThrough', actions: assign({ currentPhaseNameForResume: 'SYSTEM_READY_TARGET' }) },
                            { target: '#hue9000Startup.SYSTEM_READY' }
                        ],
                        onError: { target: '#hue9000Startup.ERROR_STATE', actions: 'assignError' }
                    },
                    exit: ['markThemeTransitionCleanupPerformed', 'notifyPhaseChangeAction']
                }
            }
        },
        PAUSED_AWAITING_NEXT_STEP: {
            entry: ['enableNextStepButtonAction', 'notifyPhaseChangeAction'], 
            on: {
                NEXT_STEP_REQUESTED: [
                    { target: 'SYSTEM_READY', guard: ({ context }) => context.currentPhaseNameForResume === 'SYSTEM_READY_TARGET', actions: 'disableNextStepButtonAction' },
                    ...[0,1,2,3,4,5,6,7,8,9,10,11].map(num => ({
                        target: `RUNNING_SEQUENCE.PHASE_${num}_${ (num === 0) ? 'IDLE' : (num === 1) ? 'EMERGENCY_SUBSYSTEMS' : (num === 2) ? 'BACKUP_POWER' : (num === 3) ? 'MAIN_POWER_ONLINE' : (num === 4) ? 'OPTICAL_CORE_REACTIVATE' : (num === 5) ? 'DIAGNOSTIC_INTERFACE' : (num === 6) ? 'MOOD_INTENSITY_CONTROLS' : (num === 7) ? 'HUE_CORRECTION_SYSTEMS' : (num === 8) ? 'EXTERNAL_LIGHTING_CONTROLS' : (num === 9) ? 'AUX_LIGHTING_LOW' : (num === 10) ? 'THEME_TRANSITION' : 'SYSTEM_OPERATIONAL'}`,
                        guard: ({ context }) => context.currentPhaseNameForResume === `PHASE_${num}_${ (num === 0) ? 'IDLE' : (num === 1) ? 'EMERGENCY_SUBSYSTEMS' : (num === 2) ? 'BACKUP_POWER' : (num === 3) ? 'MAIN_POWER_ONLINE' : (num === 4) ? 'OPTICAL_CORE_REACTIVATE' : (num === 5) ? 'DIAGNOSTIC_INTERFACE' : (num === 6) ? 'MOOD_INTENSITY_CONTROLS' : (num === 7) ? 'HUE_CORRECTION_SYSTEMS' : (num === 8) ? 'EXTERNAL_LIGHTING_CONTROLS' : (num === 9) ? 'AUX_LIGHTING_LOW' : (num === 10) ? 'THEME_TRANSITION' : 'SYSTEM_OPERATIONAL'}`,
                        actions: 'disableNextStepButtonAction'
                    }))
                ]
            }
        },
        SYSTEM_READY: {
            type: 'final',
            entry: ['setPhaseNumberActionReady', 'setAppStatusInteractive', 'notifySystemReadyToDebugManager', 'enableNextStepButtonAction']
        },
        ERROR_STATE: {
            entry: ['setPhaseNumberActionError', 'logError', 'setAppStatusError', 'displayErrorInTerminal', 'enableNextStepButtonAction', 'notifyPhaseChangeAction']
        }
    }
}, {
    actions: {
        logStartSequence: ({ context, event }) => {
            console.log('[FSM Action] Startup sequence initiated. Step-through:', context.isStepThroughMode);
        },
        assignError: assign({
            errorInfo: ({ event }) => {
                return event.data || new Error('Unknown error from invoked service');
            }
        }),
        logError: ({ context }) => {
            console.error('[FSM Error]', context.errorInfo);
            if (context.dependencies && context.dependencies.appStateService) {
                context.dependencies.appStateService.emit('startup:error', context.errorInfo);
            }
        },
        setAppStatusInteractive: ({ context }) => {
            if (context.dependencies && context.dependencies.appStateService) {
                context.dependencies.appStateService.setAppStatus('interactive');
            }
        },
        setAppStatusError: ({ context }) => {
            if (context.dependencies && context.dependencies.appStateService) {
                context.dependencies.appStateService.setAppStatus('error');
            }
        },
        displayErrorInTerminal: ({ context }) => {
            if (context.dependencies && context.dependencies.appStateService) {
                const errorMessage = context.errorInfo instanceof Error ? context.errorInfo.message : String(context.errorInfo);
                context.dependencies.appStateService.emit('requestTerminalMessage', {
                    type: 'status',
                    source: 'FSM_ERROR',
                    messageKey: 'FSM_ERROR',
                    content: [`CRITICAL SYSTEM ERROR: ${errorMessage}`]
                });
            }
        },
        // Specific actions to set phase number on entry to each phase state
        setPhaseNumberActionP0: ({context}) => context.dependencies?.appStateService?.setCurrentStartupPhaseNumber(0),
        setPhaseNumberActionP1: ({context}) => context.dependencies?.appStateService?.setCurrentStartupPhaseNumber(1),
        setPhaseNumberActionP2: ({context}) => context.dependencies?.appStateService?.setCurrentStartupPhaseNumber(2),
        setPhaseNumberActionP3: ({context}) => context.dependencies?.appStateService?.setCurrentStartupPhaseNumber(3),
        setPhaseNumberActionP4: ({context}) => context.dependencies?.appStateService?.setCurrentStartupPhaseNumber(4),
        setPhaseNumberActionP5: ({context}) => context.dependencies?.appStateService?.setCurrentStartupPhaseNumber(5),
        setPhaseNumberActionP6: ({context}) => context.dependencies?.appStateService?.setCurrentStartupPhaseNumber(6),
        setPhaseNumberActionP7: ({context}) => context.dependencies?.appStateService?.setCurrentStartupPhaseNumber(7),
        setPhaseNumberActionP8: ({context}) => context.dependencies?.appStateService?.setCurrentStartupPhaseNumber(8),
        setPhaseNumberActionP9: ({context}) => context.dependencies?.appStateService?.setCurrentStartupPhaseNumber(9),
        setPhaseNumberActionP10: ({context}) => context.dependencies?.appStateService?.setCurrentStartupPhaseNumber(10),
        setPhaseNumberActionP11: ({context}) => context.dependencies?.appStateService?.setCurrentStartupPhaseNumber(11),
        setPhaseNumberActionReady: ({context}) => context.dependencies?.appStateService?.setCurrentStartupPhaseNumber(99),
        setPhaseNumberActionError: ({context}) => context.dependencies?.appStateService?.setCurrentStartupPhaseNumber(-2),

        notifyPhaseChangeAction: ({ context, event, _event }) => {
            // This is now primarily for XState inspector. Actual notification to debugManager
            // happens via startupSequenceManager's subscription to the FSM state.
        },
        enableNextStepButtonAction: ({ context }) => {
            context.dependencies?.managerInstances?.debugManager?.setNextPhaseButtonEnabled(true);
        },
        disableNextStepButtonAction: ({ context }) => {
            context.dependencies?.managerInstances?.debugManager?.setNextPhaseButtonEnabled(false);
        },
        performThemeTransitionCleanupIfNeeded: ({ context }) => { 
            if (context.dependencies?.performThemeTransitionCleanup && !context.themeTransitionCleanupPerformed) {
                context.dependencies.performThemeTransitionCleanup();
            }
        },
        markThemeTransitionCleanupPerformed: assign({ 
            themeTransitionCleanupPerformed: true
        })
    },
    guards: {
        isStepThrough: ({ context }) => context.isStepThroughMode,
    }
});