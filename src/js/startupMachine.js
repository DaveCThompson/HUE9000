/**
 * @module startupMachine
 * @description Defines the XState machine for the HUE 9000 startup sequence.
 * (Project Decouple Refactor)
 */
import { createMachine, assign, fromPromise } from 'xstate';
import { raise } from 'xstate/actions';
import { serviceLocator } from './serviceLocator.js';

// Import all declarative phase configurations
import { phase0Config } from './startupPhase0.js';
import { phase1Config } from './startupPhase1.js';
import { phase2Config } from './startupPhase2.js';
import { phase3Config } from './startupPhase3.js';
import { phase4Config } from './startupPhase4.js';
import { phase5Config } from './startupPhase5.js';
import { phase6Config } from './startupPhase6.js';
import { phase7Config } from './startupPhase7.js';
import { phase8Config } from './startupPhase8.js';
import { phase9Config } from './startupPhase9.js';
import { phase10Config } from './startupPhase10.js';
import { phase11Config } from './startupPhase11.js';

export const phaseConfigs = [
  phase0Config, phase1Config, phase2Config, phase3Config, phase4Config,
  phase5Config, phase6Config, phase7Config, phase8Config, phase9Config,
  phase10Config, phase11Config
];

// A single, reusable service that runs a phase based on the config passed in its context.
const phaseRunnerService = fromPromise(async ({ input }) => {
  const phaseRunner = serviceLocator.get('phaseRunner');
  return phaseRunner.run(input.phaseConfig);
});

export const startupMachine = createMachine({
  id: 'hue9000Startup',
  initial: 'IDLE',
  predictableActionArguments: true,
  context: {
    currentPhase: -1,
    isStepThroughMode: true,
    errorInfo: null,
    themeTransitionCleanupPerformed: false,
  },
  states: {
    IDLE: {
      on: {
        START_SEQUENCE: {
          target: 'RUNNING_PHASE',
          actions: assign({
            isStepThroughMode: ({ event }) => event.isStepThroughMode,
            currentPhase: 0,
            themeTransitionCleanupPerformed: false,
            errorInfo: null,
          })
        }
      }
    },
    RUNNING_PHASE: {
      entry: [
        // Perform cleanup before P11 runs
        ({ context }) => {
            if (context.currentPhase === 11 && !context.themeTransitionCleanupPerformed) {
                serviceLocator.get('startupSequenceManager')._performThemeTransitionCleanup();
            }
        },
        assign({
            themeTransitionCleanupPerformed: ({context}) => context.currentPhase === 11 ? true : context.themeTransitionCleanupPerformed
        })
      ],
      invoke: {
        id: 'phaseRunnerService',
        src: phaseRunnerService,
        input: ({ context }) => ({
          phaseConfig: phaseConfigs[context.currentPhase]
        }),
        onDone: {
          // Simplified: Always increment the phase and let CHECK_SEQUENCE_STATUS decide what to do.
          actions: assign({
            currentPhase: ({ context }) => context.currentPhase + 1
          }),
          target: 'CHECK_SEQUENCE_STATUS'
        },
        onError: {
          target: 'ERROR',
          actions: assign({ errorInfo: ({ event }) => event.data })
        }
      },
      on: {
        SET_AUTO_PLAY: {
            actions: assign({ isStepThroughMode: false })
        }
      }
    },
    // New transient state to decide where to go next
    CHECK_SEQUENCE_STATUS: {
        always: [
            {
                // If we've incremented past the last valid phase index, we are done.
                target: 'COMPLETE',
                guard: ({ context }) => context.currentPhase >= phaseConfigs.length
            },
            {
                // If in auto-play mode, loop back to run the next phase.
                target: 'RUNNING_PHASE',
                guard: ({ context }) => !context.isStepThroughMode
            },
            {
                // Otherwise, we must be in step-through mode, so pause.
                target: 'PAUSED'
            }
        ]
    },
    PAUSED: {
      on: {
        NEXT_STEP_REQUESTED: {
          target: 'RUNNING_PHASE'
          // No action needed, RUNNING_PHASE will use the already-incremented currentPhase
        },
        SET_AUTO_PLAY: {
          actions: [
            assign({ isStepThroughMode: false }),
            raise({ type: 'NEXT_STEP_REQUESTED' })
          ]
        }
      }
    },
    COMPLETE: {
      type: 'final',
      entry: () => serviceLocator.get('appState').setAppStatus('interactive')
    },
    ERROR: {
      entry: [
        ({ context }) => console.error('[FSM Error]', context.errorInfo),
        () => serviceLocator.get('appState').setAppStatus('error'),
        ({ context }) => serviceLocator.get('appState').emit('requestTerminalMessage', {
          type: 'status',
          source: 'FSM_ERROR',
          messageKey: 'FSM_ERROR',
          data: { content: context.errorInfo?.message || 'Unknown error' }
        })
      ]
    }
  }
});