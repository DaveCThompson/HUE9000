/**
 * @module scanFsm
 * @description Defines the hierarchical XState machine for managing a scan sequence.
 */
import { createMachine, fromPromise, assign } from 'xstate';
import { rendererRegistry } from './scanRenderers.js';
import { createDotGridSpinnerTimeline } from './animationUtils.js';

const RENDERER_TIMEOUT_MS = 15000; // 15 seconds for a single sub-job
const FSM_OVERALL_TIMEOUT_MS = 60000; // 60 seconds for the entire sequence

/**
 * Creates and in-configures the scan sequence finite state machine.
 * @param {object} config - The specific scan sequence configuration.
 * @param {object} implementation - An object containing implementations for actions, actors (services), etc.
 * @returns {object} An XState machine instance.
 */
export function createScanMachine(config, implementation) {
    const { gsap } = implementation.actors; // Actors (services) are passed in the implementation object

    // Dynamically generate the states for the sub-jobs
    const jobStates = {};
    config.subJobs.forEach((job, index) => {
        const jobStateName = `job_${index}`;
        const nextJobStateName = `job_${index + 1}`;
        const isLastJob = index === config.subJobs.length - 1;

        jobStates[jobStateName] = {
            // DEFINITIVE FIX: Use `assign` to put the current index into context,
            // then call the action by name. This is more robust than passing parameters.
            entry: [
                assign({ activeJobIndex: index }),
                'prepareActiveJob'
            ],
            invoke: {
                id: `job-renderer-${index}`,
                src: fromPromise(({ input }) => {
                    const rendererFunc = rendererRegistry.get(input.job.renderer);
                    const rendererPromise = rendererFunc(input.target, input.job, gsap);
                    const timeoutPromise = new Promise((_, reject) =>
                        setTimeout(() => reject(new Error(`Renderer "${input.job.renderer}" timed out after ${RENDERER_TIMEOUT_MS}ms.`)), RENDERER_TIMEOUT_MS)
                    );
                    return Promise.race([rendererPromise, timeoutPromise]);
                }),
                input: ({ context }) => ({
                    job: context.subJobs[index],
                    target: context.subJobTargets[index].wrapper
                }),
                onDone: {
                    target: isLastJob ? '#scan.outro' : `#scan.running.${nextJobStateName}`,
                    actions: [
                        assign({ activeJobIndex: index }),
                        'markJobAsComplete',
                        'updateOverallProgress',
                        'fadeCompletedJobWrapper',
                    ]
                },
                onError: {
                    target: '#scan.error',
                    actions: [
                        assign({ activeJobIndex: index }),
                        'markJobAsFailed',
                        'fadeCompletedJobWrapper',
                        'logError'
                    ]
                }
            }
        };
    });

    return createMachine({
        id: 'scan',
        initial: 'idle',
        predictableActionArguments: true,
        context: {
            ...config,
            error: null,
            ui: null,
            subJobTargets: [],
            activeJobIndex: null // Add to initial context
        },
        states: {
            idle: {
                on: {
                    START: {
                        target: 'intro',
                        actions: assign({
                            ui: ({ event }) => event.input.ui,
                            subJobTargets: ({ event }) => event.input.subJobTargets
                        })
                    }
                }
            },
            intro: {
                invoke: {
                    id: 'intro-animation',
                    src: 'runIntroAnimation',
                    input: ({ context }) => ({ ui: context.ui }),
                    onDone: 'running',
                    onError: { target: 'error', actions: 'logError' }
                }
            },
            running: {
                initial: 'job_0',
                states: jobStates,
                on: { ABORT: 'aborted' },
                after: {
                    [FSM_OVERALL_TIMEOUT_MS]: { target: 'error', actions: 'logError' }
                }
            },
            outro: {
                invoke: {
                    id: 'outro-animation',
                    src: 'runOutroAnimation',
                    input: ({ context }) => ({
                        ui: context.ui,
                        conclusionMessage: context.conclusionMessage
                    }),
                    onDone: 'completed',
                    onError: { target: 'error', actions: 'logError' }
                }
            },
            aborted: {
                type: 'final'
            },
            completed: {
                type: 'final'
            },
            error: {
                type: 'final'
            }
        }
    }, implementation);
}