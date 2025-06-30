/**
 * @module startupMachine
 * @description Defines the XState machine for the HUE 9000 startup sequence.
 * (Project Decouple Refactor)
 */
import { createMachine, assign, fromPromise } from 'xstate';
import { raise } from 'xstate/actions';
import { serviceLocator } from './serviceLocator.js';
import * as appState from './appState.js'; // IMPORT appState directly

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

export const desktopPhaseConfigs = [
  phase0Config, phase1Config, phase2Config, phase3Config, phase4Config,
  phase5Config, phase6Config, phase7Config, phase8Config, phase9Config,
  phase10Config, phase11Config, phase12Config
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
    // The FSM will now hold its own set of phases.
    activePhaseConfigs: [], 
  },
  states: {
    IDLE: {
      on: {
        START_SEQUENCE: {
          target: 'RUNNING_PHASE',
          // The event now provides the phase configs.
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
                // CORRECTED: This transition must also set the active phase list.
                // It's a desktop-only feature, so we use the desktop configs.
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
        // Get the config directly from the FSM's own context.
        input: ({ context }) => ({
          phaseConfig: context.activePhaseConfigs[context.currentPhase]
        }),
        onDone: {
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
        },
        PAUSE_SEQUENCE: {
            actions: assign({ isStepThroughMode: true })
        }
      }
    },
    CHECK_SEQUENCE_STATUS: {
        always: [
            {
                target: 'COMPLETE',
                guard: ({ context }) => context.currentPhase >= context.activePhaseConfigs.length
            },
            {
                target: 'RUNNING_PHASE',
                guard: ({ context }) => !context.isStepThroughMode
            },
            {
                target: 'PAUSED'
            }
        ]
    },
    PAUSED: {
      on: {
        NEXT_STEP_REQUESTED: {
          target: 'RUNNING_PHASE'
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
      entry: [
        // Perform all visual cleanup before setting app status to interactive.
        () => {
            const dom = serviceLocator.get('domElements');
            // FIX: Remove the startup-state class from the body.
            dom.body.classList.remove('is-starting-up');
            if (dom.body.classList.contains('is-transitioning-from-dim')) {
                dom.body.classList.remove('is-transitioning-from-dim');
                document.querySelectorAll('.animate-on-dim-exit').forEach(el => el.classList.remove('animate-on-dim-exit'));
            }
        },
        // Now that cleanup is done, it is safe to emit the event that
        // triggers the ambient animations.
        () => appState.setAppStatus('interactive')
      ]
    },
    ERROR: {
      entry: [
        ({ context, event }) => {
            console.error('[FSM Error] An error occurred in the startup sequence.');
            console.error('Error Details from event:', event.data);
            console.error('Full FSM Context at time of error:', context);
        },
        () => appState.setAppStatus('error'), // Use imported appState
        ({ context }) => appState.emit('requestTerminalMessage', { // Use imported appState
          type: 'status',
          source: 'FSM_ERROR',
          messageKey: 'FSM_ERROR',
          data: { content: context.errorInfo?.message || 'Unknown error' }
        })
      ]
    }
  }
});