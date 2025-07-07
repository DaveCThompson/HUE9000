/**
 * @module scanFsm
 * @description Defines the hierarchical XState machine for managing a scan sequence.
 */
import { createMachine, fromPromise, assign } from 'xstate';
import { rendererRegistry } from './scanRenderers.js'; // MODIFIED: Corrected import path to fix build error

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
            entry: [
                // Action to update UI for the starting job
                ({ context }) => {
                    const { ui, subJobs, subJobTargets } = context;
                    const jobUI = subJobTargets[index];
                    // MODIFIED: Check the wrapper for 'is-queued' and reveal it.
                    if (jobUI.wrapper.classList.contains('is-queued')) {
                        jobUI.wrapper.classList.remove('is-queued');
                        // MODIFIED: Add 'is-active' to the title element for styling.
                        jobUI.el.classList.add('is-active');
                        jobUI.spinner.textContent = 'progress_activity';
                        gsap.set([ui.scanTargetName, jobUI.spinner, jobUI.title], { color: `oklch(0.85 0.20 ${subJobs[index].hue})` });
                    }
                }
            ],
            invoke: {
                id: `job-renderer-${index}`,
                src: fromPromise(({ input }) => {
                    const rendererFunc = rendererRegistry.get(input.job.renderer);
                    return rendererFunc(input.target, input.job, gsap);
                }),
                input: ({ context }) => ({
                    job: context.subJobs[index],
                    target: context.subJobTargets[index].wrapper
                }),
                onDone: {
                    target: isLastJob ? '#scan.outro' : `#scan.running.${nextJobStateName}`,
                    actions: [
                        // Action to update UI for the completed job
                        ({ context }) => {
                            const { ui, subJobs, subJobTargets } = context;
                            const jobUI = subJobTargets[index];
                            // MODIFIED: Check the title element for 'is-active' state.
                            if (jobUI.el.classList.contains('is-active')) {
                                jobUI.el.classList.remove('is-active');
                                jobUI.el.classList.add('is-complete');
                                jobUI.spinner.textContent = 'check_circle';
                                gsap.set([jobUI.spinner, jobUI.title], { clearProps: 'color' });

                                const newProgress = Math.round(((index + 1) / subJobs.length) * 100);
                                gsap.to(ui.progressValue, {
                                    innerText: newProgress,
                                    duration: 0.5,
                                    snap: { innerText: 1 },
                                    ease: 'power2.out',
                                    onUpdate: () => { ui.progressValue.textContent += '%'; }
                                });
                            }
                        }
                    ]
                },
                onError: {
                    target: '#scan.error',
                    actions: 'logError'
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
            subJobTargets: []
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
                on: { ABORT: 'aborted' }
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