/**
 * @module startupMachine
 * @description Defines the XState machine for the HUE 9000 startup sequence.
 */
import { createMachine, assign, fromPromise } from 'xstate';
import { raise } from 'xstate/actions';
import { serviceLocator } from './serviceLocator.js';
import { appState } from './state/index.js'

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
import { phase12Config } from './startupPhase12.js';
import { phase13Config } from './startupPhase13.js';

export const desktopPhaseConfigs = [
  phase0Config, phase1Config, phase2Config, phase3Config, phase4Config,
  phase5Config, phase6Config, phase7Config, phase8Config, phase9Config,
  phase10Config, phase11Config, phase12Config, phase13Config
];

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
    activePhaseConfigs: [], 
  },
  states: {
    IDLE: {
      on: {
        START_SEQUENCE: {
          target: 'RUNNING_PHASE',
          actions: assign({
            isStepThroughMode: ({ event }) => event.isStepThroughMode,
            activePhaseConfigs: ({ event }) => event.phaseConfigs,
            currentPhase: 0,
            errorInfo: null,
          })
        },
        JUMP_TO_PHASE: {
            target: 'RUNNING_PHASE',
            actions: assign({
                isStepThroughMode: ({ event }) => event.isStepThroughMode,
                currentPhase: ({ event }) => event.phase,
                activePhaseConfigs: desktopPhaseConfigs,
                errorInfo: null,
            })
        }
      }
    },
    RUNNING_PHASE: {
      invoke: {
        id: 'phaseRunnerService',
        src: phaseRunnerService,
        input: ({ context }) => ({
          phaseConfig: context.activePhaseConfigs[context.currentPhase]
        }),
        onDone: {
          actions: assign({ currentPhase: ({ context }) => context.currentPhase + 1 }),
          target: 'CHECK_SEQUENCE_STATUS'
        },
        onError: {
          target: 'ERROR',
          actions: assign({ errorInfo: ({ event }) => event.data })
        }
      },
      on: {
        SET_AUTO_PLAY: { actions: assign({ isStepThroughMode: false }) },
        PAUSE_SEQUENCE: { actions: assign({ isStepThroughMode: true }) }
      }
    },
    CHECK_SEQUENCE_STATUS: {
        always: [
            { target: 'COMPLETE', guard: ({ context }) => context.currentPhase >= context.activePhaseConfigs.length },
            { target: 'RUNNING_PHASE', guard: ({ context }) => !context.isStepThroughMode },
            { target: 'PAUSED' }
        ]
    },
    PAUSED: {
      on: {
        NEXT_STEP_REQUESTED: { target: 'RUNNING_PHASE' },
        SET_AUTO_PLAY: {
          actions: [ assign({ isStepThroughMode: false }), raise({ type: 'NEXT_STEP_REQUESTED' }) ]
        }
      }
    },
    COMPLETE: {
      type: 'final',
      entry: [
        () => {
          const ssm = serviceLocator.get('startupSequenceManager');
          if (ssm) ssm._performSequenceCompletion();
        },
        () => appState.setAppStatus('interactive')
      ]
    },
    ERROR: {
      entry: [
        ({ context, event }) => {
            console.error('[FSM Error] An error occurred in the startup sequence.', { error: event.data, context });
        },
        () => appState.setAppStatus('error'),
        ({ context }) => appState.emit('requestTerminalMessage', {
          type: 'status', source: 'FSM_ERROR', messageKey: 'FSM_ERROR',
          data: { content: context.errorInfo?.message || 'Unknown error' }
        })
      ]
    }
  }
});