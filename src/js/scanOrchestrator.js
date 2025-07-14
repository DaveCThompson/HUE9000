/**
 * @module ScanOrchestrator
 * @description Manages the entire lifecycle of a scan sequence, from user
 * input to completion, acting as the bridge between the UI (TerminalManager),
 * state (scanFsm), and user interaction.
 */
import { createActor } from 'xstate';
import { serviceLocator } from './serviceLocator.js';
import { appState } from './state/index.js';
import { createScanMachine } from './scanFsm.js';
import { rendererRegistry } from './scanRenderers.js';
import { createDotGridSpinnerTimeline } from './animationUtils.js';
import { fromPromise } from 'xstate';
import dotSpinnerSvg from '../assets/svgs/dot-spinner.svg?raw';

export class ScanOrchestrator {
    constructor() {
        this.gsap = serviceLocator.get('gsap');
        this.activeScanActor = null;
        this.activeSpinnerTimeline = null; // To hold the spinner's GSAP timeline
        this._handleEscapeKey = this._handleEscapeKey.bind(this);
    }

    /**
     * @method startScan
     * @description Simplified method that receives a container and orchestrates the scan within it.
     * This is now a fire-and-forget method that signals completion via a global event.
     * @param {object} scanConfig - The configuration for the scan sequence.
     * @param {HTMLElement} scanContainer - The DOM element to render the scan UI into.
     */
    async startScan(scanConfig, scanContainer) {
        if (this.activeScanActor) {
            console.warn("ScanOrchestrator: A scan is already in progress. Aborting new request.");
            return;
        }
        if (!scanContainer) {
            console.error("Scan container not provided to ScanOrchestrator.");
            appState.emit('scanComplete', { status: 'error' });
            return;
        }
        
        if (!this._validateScanConfig(scanConfig)) {
            console.error("ScanOrchestrator: Invalid scan configuration provided. Aborting.", scanConfig);
            appState.emit('scanComplete', { status: 'error' });
            return;
        }
        
        try {
            const { uiElements, subJobTargets } = this._createUI(scanContainer, scanConfig);

            const machineImplementation = {
                actors: {
                    gsap: this.gsap,
                    runIntroAnimation: fromPromise(({ input }) => this._runIntroAnimation(input)),
                    runOutroAnimation: fromPromise(({ input }) => this._runOutroAnimation(input))
                },
                actions: {
                    logError: ({ context, event }) => {
                        console.error("Scan FSM Error:", event.data, "Context:", context);
                    },
                    prepareActiveJob: ({ context }) => {
                        const index = context.activeJobIndex;
                        const { ui, subJobs, subJobTargets } = context;
                        const jobUI = subJobTargets[index];
                        
                        jobUI.wrapper.classList.remove('is-queued');
                        jobUI.el.classList.add('is-active');
                        
                        this.gsap.set([ui.scanTargetName, jobUI.spinnerContainer, jobUI.title], { color: `oklch(0.85 0.20 ${subJobs[index].hue})` });
                        
                        this.gsap.to(jobUI.wrapper, { autoAlpha: 1, duration: 0.3, ease: 'power2.out' });
                        this.gsap.set(jobUI.wrapper, { pointerEvents: 'auto' });
                    },
                    markJobAsComplete: ({ context }) => {
                        const index = context.activeJobIndex;
                        const jobUI = context.subJobTargets[index];
                        
                        if (!jobUI.el.classList.contains('is-active')) return;

                        jobUI.el.classList.remove('is-active');
                        jobUI.el.classList.add('is-complete');
                        
                        const checkIcon = this._createStyledElement('span', 'material-symbols-outlined', 'check');

                        if (jobUI.spinnerContainer) {
                            jobUI.spinnerContainer.innerHTML = '';
                            jobUI.spinnerContainer.appendChild(checkIcon);
                        }
                        
                        this.gsap.from(checkIcon, {
                            scale: 0,
                            opacity: 0,
                            duration: 0.4,
                            ease: 'back.out(1.7)'
                        });
                        
                        this.gsap.set([jobUI.spinnerContainer, jobUI.title], { clearProps: 'color' });
                    },
                    markJobAsFailed: ({ context }) => {
                        const index = context.activeJobIndex;
                        const jobUI = context.subJobTargets[index];

                        if (!jobUI.el.classList.contains('is-active')) return;

                        jobUI.el.classList.remove('is-active');
                        
                        const failureIcon = this._createStyledElement('span', 'material-symbols-outlined icon-failure', 'close');
                        
                        if (jobUI.spinnerContainer) {
                            jobUI.spinnerContainer.innerHTML = '';
                            jobUI.spinnerContainer.appendChild(failureIcon);
                        }

                        this.gsap.from(failureIcon, {
                            scale: 0,
                            opacity: 0,
                            duration: 0.4,
                            ease: 'back.out(1.7)'
                        });
                    },
                    updateOverallProgress: ({ context }) => {
                        const index = context.activeJobIndex;
                        const { ui, subJobs } = context;
                        
                        const newProgress = ((index + 1) / subJobs.length) * 100;
                        const progressProxy = { value: parseFloat(ui.progressValue.textContent) || 0 }; 

                        this.gsap.to(progressProxy, {
                            value: newProgress,
                            duration: 0.5,
                            ease: 'power2.out',
                            onUpdate: () => {
                                ui.progressValue.textContent = `${progressProxy.value.toFixed(1)}%`;
                            }
                        });
                    },
                    fadeCompletedJobWrapper: ({ context }) => {
                        const index = context.activeJobIndex;
                        const jobUI = context.subJobTargets[index];
                        this.gsap.to(jobUI.wrapper, { autoAlpha: 0.5, duration: 0.3, ease: 'power2.out' });
                        this.gsap.set(jobUI.wrapper, { pointerEvents: 'none' });
                    }
                }
            };

            const scanMachine = createScanMachine(scanConfig, machineImplementation);
            this.activeScanActor = createActor(scanMachine);
            
            this.activeScanActor.subscribe(snapshot => {
                const isDone = snapshot.done || snapshot.matches('completed') || snapshot.matches('aborted') || snapshot.matches('error');

                if (isDone) {
                    if (!this.activeScanActor) return;
                    
                    let status = 'completed';
                    if (snapshot.matches('aborted')) status = 'aborted';
                    if (snapshot.matches('error')) status = 'error';
                    
                    this._cleanup();
                    appState.emit('scanComplete', { status });
                }
            });

            document.addEventListener('keydown', this._handleEscapeKey);
            this._updateA11yRegion(`Evaluation started for ${scanConfig.scanTarget}.`);

            this.activeScanActor.start();
            this.activeScanActor.send({
                type: 'START',
                input: {
                    ui: uiElements,
                    subJobTargets: subJobTargets
                }
            });
        } catch (error) {
            console.error('CRITICAL ERROR in ScanOrchestrator.startScan:', error);
            this._cleanup();
            appState.emit('scanComplete', { status: 'error' }); // Ensure UI unlocks on any failure
        }
    }

    _handleEscapeKey(event) {
        if (event.key === 'Escape' && this.activeScanActor) {
            this.activeScanActor.send({ type: 'ABORT' });
        }
    }
    
    _validateScanConfig(config) {
        if (!config) return false;
        if (typeof config.mainTitle !== 'string' || typeof config.scanTarget !== 'string' || typeof config.conclusionMessage !== 'string') {
            console.error("[Scan Validator] Missing or invalid top-level properties (mainTitle, scanTarget, conclusionMessage).");
            return false;
        }
        if (!Array.isArray(config.subJobs) || config.subJobs.length === 0) {
            console.error("[Scan Validator] `subJobs` must be a non-empty array.");
            return false;
        }
        for (const job of config.subJobs) {
            if (typeof job.title !== 'string' || typeof job.renderer !== 'string' || typeof job.hue !== 'number') {
                console.error("[Scan Validator] A subJob is missing required properties (title, renderer, hue).", job);
                return false;
            }
            try {
                rendererRegistry.get(job.renderer)
            } catch(e) {
                 console.error(`[Scan Validator] Renderer "${job.renderer}" is not registered.`);
                 return false;
            }
        }
        return true;
    }

    _createUI(container, context) {
        document.body.classList.add('is-scan-active');
        container.innerHTML = ''; // Clear previous content
        container.classList.add('scan-sequence-container');

        const elements = {
            container,
            headerGroup: this._createStyledElement('div', 'scan-header-group'),
            mainTitleContainer: this._createStyledElement('div', 'scan-main-title-container'),
            progressContainer: this._createStyledElement('div', 'scan-progress-container'),
            scanTargetContainer: this._createStyledElement('div', 'scan-target-container'),
            subJobsContainer: this._createStyledElement('div', 'scan-sub-jobs-container'),
            a11yLiveRegion: this._createStyledElement('div', 'visually-hidden')
        };
        elements.a11yLiveRegion.setAttribute('aria-live', 'polite');
        elements.a11yLiveRegion.setAttribute('aria-atomic', 'true');

        // DEFINITIVE FIX: Use a robust two-layer structure.
        // Outer box is for layout and alignment.
        const mainSpinnerLayoutBox = this._createStyledElement('div', 'scan-spinner');
        // Inner box is for the animation target.
        const mainSpinnerAnimTarget = this._createStyledElement('div', 'dot-grid-spinner');
        mainSpinnerAnimTarget.innerHTML = dotSpinnerSvg;
        mainSpinnerLayoutBox.appendChild(mainSpinnerAnimTarget);
        // The reference for animation is the inner container.
        elements.mainSpinner = mainSpinnerAnimTarget;

        elements.mainTitle = this._createStyledElement('span', 'scan-main-title', context.mainTitle);
        elements.mainTitleContainer.append(mainSpinnerLayoutBox, elements.mainTitle);

        elements.progressLabel = this._createStyledElement('span', 'scan-progress-label', 'SCANNING SEGMENTS: ');
        elements.progressValue = this._createStyledElement('span', 'scan-progress-value', '0.0%');
        elements.progressContainer.append(elements.progressLabel, elements.progressValue);

        elements.scanTargetLabel = this._createStyledElement('span', 'scan-target-label', 'Scan Target:');
        elements.scanTargetName = this._createStyledElement('span', 'scan-target-name', context.scanTarget);
        elements.scanTargetContainer.append(elements.scanTargetLabel, elements.scanTargetName);

        elements.headerGroup.append(
            elements.mainTitleContainer,
            elements.scanTargetContainer,
            elements.progressContainer
        );

        container.append(
            elements.a11yLiveRegion,
            elements.headerGroup,
            elements.subJobsContainer
        );

        const subJobTargets = [];
        context.subJobs.forEach(job => {
            const jobWrapper = this._createStyledElement('div', 'scan-job-wrapper');
            const jobEl = this._createStyledElement('div', 'scan-sub-job');

            const subSpinnerContainer = this._createStyledElement('div', 'scan-spinner is-sub-job-spinner');

            const title = this._createStyledElement('span', 'scan-sub-job-title', job.title);
            jobEl.append(subSpinnerContainer, title);
            jobWrapper.appendChild(jobEl);
            elements.subJobsContainer.appendChild(jobWrapper);
            
            subJobTargets.push({ 
                wrapper: jobWrapper, 
                el: jobEl, 
                spinnerContainer: subSpinnerContainer,
                title,
            });
        });
        
        return { uiElements: elements, subJobTargets };
    }
    
    _runIntroAnimation({ ui }) {
        try {
            return new Promise(resolve => {
                const headerElements = [
                    ui.headerGroup,
                    ui.subJobsContainer
                ];
                this.gsap.from(headerElements, {
                    autoAlpha: 0,
                    y: 10,
                    stagger: 0.15,
                    duration: 0.4,
                    delay: 0.1,
                    onComplete: resolve
                });

                if (ui.mainSpinner) {
                    this.activeSpinnerTimeline = createDotGridSpinnerTimeline(ui.mainSpinner, this.gsap);
                    this.activeSpinnerTimeline.play();
                }
            });
        } catch (e) {
            console.error('FATAL: Synchronous error in _runIntroAnimation', e);
            return Promise.reject(e);
        }
    }

    _runOutroAnimation({ ui, conclusionMessage }) {
        this._updateA11yRegion(`Conclusion: ${conclusionMessage}`);
        return new Promise(resolve => {
            if (this.activeSpinnerTimeline) {
                this.activeSpinnerTimeline.kill();
                this.activeSpinnerTimeline = null;
            }

            const mainSpinnerContainer = ui.mainTitleContainer.querySelector('.scan-spinner');
            const checkIcon = this._createStyledElement('span', 'material-symbols-outlined', 'check');

            if (mainSpinnerContainer) {
                mainSpinnerContainer.innerHTML = '';
                mainSpinnerContainer.appendChild(checkIcon);
                this.gsap.from(checkIcon, { scale: 0, opacity: 0, duration: 0.4, ease: 'back.out(1.7)' });
            }

            const tl = this.gsap.timeline({ onComplete: resolve });

            tl.to(ui.scanTargetName, { 
                color: 'oklch(var(--terminal-text-color-success-l) var(--terminal-text-color-success-c) var(--terminal-text-color-success-h))',
                duration: 0.4 
            }, 0)
            .call(() => {
                const conclusionEl = this._createStyledElement('div', 'scan-conclusion', ' ');
                conclusionEl.classList.add('line-success');
                ui.container.appendChild(conclusionEl);
                this.gsap.from(conclusionEl, { autoAlpha: 0, duration: 0.5 });
                
                this.gsap.to(conclusionEl, {
                    duration: conclusionMessage.length * 0.04,
                    text: conclusionMessage,
                    ease: 'none'
                });
            }, [], '+=0.2')
            .to({}, { duration: 1.5 });
        });
    }

    _cleanup() {
        document.removeEventListener('keydown', this._handleEscapeKey);
        document.body.classList.remove('is-scan-active');
        
        if (this.activeSpinnerTimeline) {
            this.activeSpinnerTimeline.kill();
            this.activeSpinnerTimeline = null;
        }
        
        if (this.activeScanActor) {
            this.activeScanActor.stop();
        }
        this.activeScanActor = null;
    }

    _createStyledElement(tag, className, textContent = '') {
        const el = document.createElement(tag);
        el.className = className;
        if (textContent) el.textContent = textContent;
        el.setAttribute('aria-hidden', 'true');
        return el;
    }

    _updateA11yRegion(text) {
        if (this.activeScanActor) {
            const snapshot = this.activeScanActor.getSnapshot();
            if (snapshot && snapshot.context && snapshot.context.ui && snapshot.context.ui.a11yLiveRegion) {
                snapshot.context.ui.a11yLiveRegion.textContent = text;
            }
        }
    }
}