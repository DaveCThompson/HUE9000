/**
 * @module scanFsm
 * @description Defines the hierarchical XState machine for managing a scan sequence.
 */
import { createMachine, fromPromise, assign } from 'xstate';
import { rendererRegistry } from './scanRenderers.js'; // MODIFIED: Corrected import path to fix build error
import { createDotGridSpinnerTimeline } from './animationUtils.js';

const RENDERER_TIMEOUT_MS = 15000; // 15 seconds

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
                    
                    if (jobUI.wrapper.classList.contains('is-queued')) {
                        jobUI.wrapper.classList.remove('is-queued');
                        jobUI.el.classList.add('is-active');

                        // MODIFIED: Create and play the dot-grid spinner animation
                        jobUI.spinnerTimeline = createDotGridSpinnerTimeline(jobUI.spinner, gsap);
                        jobUI.spinnerTimeline.play();
                        
                        gsap.set([ui.scanTargetName, jobUI.spinnerContainer, jobUI.title], { color: `oklch(0.85 0.20 ${subJobs[index].hue})` });
                    }
                }
            ],
            invoke: {
                id: `job-renderer-${index}`,
                src: fromPromise(({ input }) => {
                    const rendererFunc = rendererRegistry.get(input.job.renderer);
                    const rendererPromise = rendererFunc(input.target, input.job, gsap);
                    // ADDED: Timeout wrapper for robustness
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
                        // Action to update UI for the completed job
                        ({ context }) => {
                            const { ui, subJobs, subJobTargets } = context;
                            const jobUI = subJobTargets[index];
                            
                            if (jobUI.el.classList.contains('is-active')) {
                                jobUI.el.classList.remove('is-active');
                                jobUI.el.classList.add('is-complete');
                                
                                // MODIFIED: Animate transition from spinner to checkmark
                                const checkIcon = document.createElement('span');
                                checkIcon.className = 'material-symbols-outlined';
                                checkIcon.textContent = 'check_circle';
                                checkIcon.style.opacity = '0'; // Start hidden for animation

                                const transitionTl = gsap.timeline();
                                transitionTl.to(jobUI.spinnerContainer, {
                                    scale: 0.7,
                                    opacity: 0,
                                    duration: 0.2,
                                    ease: 'power2.in',
                                    onComplete: () => {
                                        if (jobUI.spinnerTimeline) jobUI.spinnerTimeline.kill();
                                        jobUI.spinnerContainer.replaceWith(checkIcon);
                                    }
                                })
                                .to(checkIcon, {
                                    scale: 1,
                                    opacity: 1,
                                    duration: 0.4,
                                    ease: 'back.out(1.7)'
                                }, ">-0.1")
                                .set([checkIcon, jobUI.title], { clearProps: 'color' }, "<");

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