/**
 * @module startupMachine
 * @description Defines the XState machine for the HUE 9000 startup sequence.
 */
import { createMachine, assign, fromPromise } from 'xstate'; // Import fromPromise

// Helper to create the promise logic for invoking phase modules
const createPhaseService = (importPath) => {
    return fromPromise(async ({ input }) => { // The function for fromPromise is async
        const phaseModule = await import(importPath);
        if (!phaseModule || typeof phaseModule.createPhaseTimeline !== 'function') {
            console.error(`Error importing or finding createPhaseTimeline in ${importPath}`);
            throw new Error(`Failed to load phase module: ${importPath}`);
        }
        return phaseModule.createPhaseTimeline(input.dependencies);
    });
};

// इंश्योर 'export' is present before 'const startupMachine'
export const startupMachine = createMachine({ 
    id: 'hue9000Startup',
    initial: 'IDLE',
    predictableActionArguments: true,
    context: {
        dependencies: null,
        isStepThroughMode: true,
        currentPhaseNameForResume: '',
        errorInfo: null,
        themeTransitionCleanupPerformed: false, 
    },
    states: {
        IDLE: {
            on: {
                START_SEQUENCE: {
                    target: 'RUNNING_SEQUENCE.PHASE_0_IDLE', 
                    actions: [
                        assign({
                            isStepThroughMode: ({ event }) => event.isStepThroughMode,
                            dependencies: ({ event }) => event.dependencies,
                            themeTransitionCleanupPerformed: false, 
                            errorInfo: null,
                        }),
                        'logStartSequence'
                    ]
                }
            }
        },
        RUNNING_SEQUENCE: {
            initial: 'PHASE_0_IDLE',
            states: {
                PHASE_0_IDLE: { 
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
                    entry: 'notifyPhaseChangeAction',
                    exit: 'notifyPhaseChangeAction'
                },
                PHASE_1_EMERGENCY_SUBSYSTEMS: { 
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
                    entry: 'notifyPhaseChangeAction',
                    exit: 'notifyPhaseChangeAction'
                },
                PHASE_2_BACKUP_POWER: { 
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
                    entry: 'notifyPhaseChangeAction',
                    exit: 'notifyPhaseChangeAction'
                },
                PHASE_3_MAIN_POWER_ONLINE: { 
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
                    entry: 'notifyPhaseChangeAction',
                    exit: 'notifyPhaseChangeAction'
                },
                PHASE_4_OPTICAL_CORE_REACTIVATE: { 
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
                    entry: 'notifyPhaseChangeAction',
                    exit: 'notifyPhaseChangeAction'
                },
                PHASE_5_DIAGNOSTIC_INTERFACE: { 
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
                    entry: 'notifyPhaseChangeAction',
                    exit: 'notifyPhaseChangeAction'
                },
                PHASE_6_MOOD_INTENSITY_CONTROLS: { 
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
                    entry: 'notifyPhaseChangeAction',
                    exit: 'notifyPhaseChangeAction'
                },
                PHASE_7_HUE_CORRECTION_SYSTEMS: { 
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
                    entry: 'notifyPhaseChangeAction',
                    exit: 'notifyPhaseChangeAction'
                },
                PHASE_8_EXTERNAL_LIGHTING_CONTROLS: { 
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
                    entry: 'notifyPhaseChangeAction',
                    exit: 'notifyPhaseChangeAction'
                },
                PHASE_9_AUX_LIGHTING_LOW: { 
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
                    entry: 'notifyPhaseChangeAction',
                    exit: 'notifyPhaseChangeAction'
                },
                PHASE_10_THEME_TRANSITION: { 
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
                    entry: 'notifyPhaseChangeAction',
                    exit: 'notifyPhaseChangeAction'
                },
                PHASE_11_SYSTEM_OPERATIONAL: { 
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
                    entry: ['notifyPhaseChangeAction', 'performThemeTransitionCleanupIfNeeded'], 
                    exit: ['notifyPhaseChangeAction', 'markThemeTransitionCleanupPerformed']
                }
            }
        },
        PAUSED_AWAITING_NEXT_STEP: {
            entry: 'enableNextStepButtonAction',
            on: {
                NEXT_STEP_REQUESTED: [
                    { target: 'SYSTEM_READY', guard: ({ context }) => context.currentPhaseNameForResume === 'SYSTEM_READY_TARGET', actions: 'disableNextStepButtonAction' },
                    {
                        target: 'RUNNING_SEQUENCE.PHASE_0_IDLE',
                        guard: ({ context }) => context.currentPhaseNameForResume === 'PHASE_0_IDLE',
                        actions: 'disableNextStepButtonAction'
                    },
                    {
                        target: 'RUNNING_SEQUENCE.PHASE_1_EMERGENCY_SUBSYSTEMS',
                        guard: ({ context }) => context.currentPhaseNameForResume === 'PHASE_1_EMERGENCY_SUBSYSTEMS',
                        actions: 'disableNextStepButtonAction'
                    },
                    {
                        target: 'RUNNING_SEQUENCE.PHASE_2_BACKUP_POWER',
                        guard: ({ context }) => context.currentPhaseNameForResume === 'PHASE_2_BACKUP_POWER',
                        actions: 'disableNextStepButtonAction'
                    },
                    {
                        target: 'RUNNING_SEQUENCE.PHASE_3_MAIN_POWER_ONLINE',
                        guard: ({ context }) => context.currentPhaseNameForResume === 'PHASE_3_MAIN_POWER_ONLINE',
                        actions: 'disableNextStepButtonAction'
                    },
                    {
                        target: 'RUNNING_SEQUENCE.PHASE_4_OPTICAL_CORE_REACTIVATE',
                        guard: ({ context }) => context.currentPhaseNameForResume === 'PHASE_4_OPTICAL_CORE_REACTIVATE',
                        actions: 'disableNextStepButtonAction'
                    },
                    {
                        target: 'RUNNING_SEQUENCE.PHASE_5_DIAGNOSTIC_INTERFACE',
                        guard: ({ context }) => context.currentPhaseNameForResume === 'PHASE_5_DIAGNOSTIC_INTERFACE',
                        actions: 'disableNextStepButtonAction'
                    },
                    {
                        target: 'RUNNING_SEQUENCE.PHASE_6_MOOD_INTENSITY_CONTROLS',
                        guard: ({ context }) => context.currentPhaseNameForResume === 'PHASE_6_MOOD_INTENSITY_CONTROLS',
                        actions: 'disableNextStepButtonAction'
                    },
                    {
                        target: 'RUNNING_SEQUENCE.PHASE_7_HUE_CORRECTION_SYSTEMS',
                        guard: ({ context }) => context.currentPhaseNameForResume === 'PHASE_7_HUE_CORRECTION_SYSTEMS',
                        actions: 'disableNextStepButtonAction'
                    },
                    {
                        target: 'RUNNING_SEQUENCE.PHASE_8_EXTERNAL_LIGHTING_CONTROLS',
                        guard: ({ context }) => context.currentPhaseNameForResume === 'PHASE_8_EXTERNAL_LIGHTING_CONTROLS',
                        actions: 'disableNextStepButtonAction'
                    },
                    {
                        target: 'RUNNING_SEQUENCE.PHASE_9_AUX_LIGHTING_LOW',
                        guard: ({ context }) => context.currentPhaseNameForResume === 'PHASE_9_AUX_LIGHTING_LOW',
                        actions: 'disableNextStepButtonAction'
                    },
                    {
                        target: 'RUNNING_SEQUENCE.PHASE_10_THEME_TRANSITION',
                        guard: ({ context }) => context.currentPhaseNameForResume === 'PHASE_10_THEME_TRANSITION',
                        actions: 'disableNextStepButtonAction'
                    },
                    {
                        target: 'RUNNING_SEQUENCE.PHASE_11_SYSTEM_OPERATIONAL',
                        guard: ({ context }) => context.currentPhaseNameForResume === 'PHASE_11_SYSTEM_OPERATIONAL',
                        actions: 'disableNextStepButtonAction'
                    }
                ]
            }
        },
        SYSTEM_READY: {
            type: 'final',
            entry: ['setAppStatusInteractive', 'notifySystemReadyToDebugManager', 'enableNextStepButtonAction']
        },
        ERROR_STATE: {
            entry: ['logError', 'setAppStatusError', 'displayErrorInTerminal', 'enableNextStepButtonAction']
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
        notifyPhaseChangeAction: ({ context, event, _event }) => {
            // This is a placeholder, actual notification to debugManager is in startupSequenceManager
        },
        enableNextStepButtonAction: ({ context }) => {
            if (context.dependencies && context.dependencies.managerInstances && context.dependencies.managerInstances.debugManager) {
                context.dependencies.managerInstances.debugManager.setNextPhaseButtonEnabled(true);
            }
        },
        disableNextStepButtonAction: ({ context }) => {
            if (context.dependencies && context.dependencies.managerInstances && context.dependencies.managerInstances.debugManager) {
                context.dependencies.managerInstances.debugManager.setNextPhaseButtonEnabled(false);
            }
        },
        performThemeTransitionCleanupIfNeeded: ({ context }) => { 
            console.log("[FSM Action] Attempting performThemeTransitionCleanupIfNeeded. Cleanup performed context:", context.themeTransitionCleanupPerformed);
            if (context.dependencies && context.dependencies.performThemeTransitionCleanup && !context.themeTransitionCleanupPerformed) {
                console.log("[FSM Action] Calling performThemeTransitionCleanup.");
                context.dependencies.performThemeTransitionCleanup();
            } else if (!context.dependencies || !context.dependencies.performThemeTransitionCleanup) {
                console.warn("[FSM Action] performThemeTransitionCleanup dependency not found!");
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