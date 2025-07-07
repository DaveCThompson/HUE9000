/**
 * @module ScanOrchestrator
 * @description Manages the entire lifecycle of a scan sequence, from user
 * input to completion, acting as the bridge between the UI (TerminalManager),
 * state (scanFsm), and user interaction.
 */
import { createActor } from 'xstate';
import { serviceLocator } from './serviceLocator.js';
import * as appState from './appState.js'; // ADDED: Import appState for event emitting
import { createScanMachine } from './scanFsm.js';
import { rendererRegistry } from './scanRenderers.js';
import { fromPromise } from 'xstate';

export class ScanOrchestrator {
    constructor() {
        this.gsap = serviceLocator.get('gsap');
        this.activeScanActor = null;
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
        console.log('%c[DEBUG] Entered ScanOrchestrator.startScan()', 'color: lightblue');
        if (this.activeScanActor) {
            console.warn("ScanOrchestrator: A scan is already in progress. Aborting new request.");
            return;
        }
        if (!scanContainer) {
            console.error("Scan container not provided to ScanOrchestrator.");
            appState.emit('scanComplete', { wasAborted: true }); // Emit event to unlock UI on error
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
                    }
                }
            };

            const scanMachine = createScanMachine(scanConfig, machineImplementation);
            this.activeScanActor = createActor(scanMachine);
            
            this.activeScanActor.subscribe(snapshot => {
                // MODIFIED: More detailed logging to diagnose the deadlock.
                console.log(`%c[FSM_SUB] Snapshot received. Value:`, 'color: cyan;', snapshot.value);
                console.log(`%c[FSM_SUB] Is snapshot.done? ->`, 'color: cyan; font-weight: bold;', snapshot.done);
                // console.log('%c[FSM_SUB] Full snapshot object:', 'color: cyan;', snapshot);

                // ROBUSTNESS FIX: Check for final state using .matches() as a fallback to .done
                const isDone = snapshot.done || snapshot.matches('completed') || snapshot.matches('aborted') || snapshot.matches('error');

                if (isDone) {
                    console.log('%c[Orchestrator] ✅ Final state detected. Entering cleanup.', 'color: green; font-weight: bold;');
                    const wasAborted = snapshot.matches('aborted');
                    
                    this._cleanup();
                    
                    console.log(`%c[Orchestrator] Emitting 'scanComplete' event with payload: { wasAborted: ${wasAborted} }`, 'color: orange; font-weight: bold;');
                    appState.emit('scanComplete', { wasAborted });
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
            console.log('%c[DEBUG] Exiting ScanOrchestrator.startScan() after starting actor.', 'color: lightblue');
        } catch (error) {
            console.error('%c[DEBUG] CRITICAL ERROR in ScanOrchestrator.startScan:', 'color: red; font-weight: bold;', error);
            this._cleanup();
            appState.emit('scanComplete', { wasAborted: true }); // Ensure UI unlocks on any failure
        }
    }

    _handleEscapeKey(event) {
        if (event.key === 'Escape' && this.activeScanActor) {
            this.activeScanActor.send({ type: 'ABORT' });
        }
    }

    _createUI(container, context) {
        document.body.classList.add('is-scan-active');
        container.innerHTML = ''; // Clear previous content

        const elements = {
            container,
            // NEW: Wrapper for the header elements
            headerGroup: this._createStyledElement('div', 'scan-header-group'),
            mainTitleContainer: this._createStyledElement('div', 'scan-main-title-container'),
            progressContainer: this._createStyledElement('div', 'scan-progress-container'),
            scanTargetContainer: this._createStyledElement('div', 'scan-target-container'),
            subJobsContainer: this._createStyledElement('div', 'scan-sub-jobs-container'),
            a11yLiveRegion: this._createStyledElement('div', 'visually-hidden')
        };
        elements.a11yLiveRegion.setAttribute('aria-live', 'polite');
        elements.a11yLiveRegion.setAttribute('aria-atomic', 'true');

        const mainSpinner = this._createStyledElement('span', 'material-symbols-outlined scan-spinner main-processing', 'autorenew');
        elements.mainTitle = this._createStyledElement('span', 'scan-main-title', context.mainTitle);
        elements.mainTitleContainer.append(mainSpinner, elements.mainTitle);

        elements.progressLabel = this._createStyledElement('span', 'scan-progress-label', 'SCANNING SEGMENTS: ');
        elements.progressValue = this._createStyledElement('span', 'scan-progress-value', '0%');
        elements.progressContainer.append(elements.progressLabel, elements.progressValue);

        elements.scanTargetLabel = this._createStyledElement('span', 'scan-target-label', 'Scan Target:');
        elements.scanTargetName = this._createStyledElement('span', 'scan-target-name', context.scanTarget);
        elements.scanTargetContainer.append(elements.scanTargetLabel, elements.scanTargetName);

        // Append header elements to the new group
        elements.headerGroup.append(
            elements.mainTitleContainer,
            elements.scanTargetContainer,
            elements.progressContainer
        );

        container.append(
            elements.a11yLiveRegion,
            elements.headerGroup, // Append the group instead of individual elements
            elements.subJobsContainer
        );

        const subJobTargets = [];
        context.subJobs.forEach(job => {
            const jobWrapper = this._createStyledElement('div', 'scan-job-wrapper is-queued');
            const jobEl = this._createStyledElement('div', 'scan-sub-job');
            const spinner = this._createStyledElement('span', 'material-symbols-outlined scan-spinner', 'radio_button_unchecked');
            const title = this._createStyledElement('span', 'scan-sub-job-title', job.title);
            jobEl.append(spinner, title);
            jobWrapper.appendChild(jobEl);
            elements.subJobsContainer.appendChild(jobWrapper);
            subJobTargets.push({ wrapper: jobWrapper, el: jobEl, spinner, title });
        });
        
        return { uiElements: elements, subJobTargets };
    }
    
    _runIntroAnimation({ ui }) {
        // ADDED: Diagnostic logging and error handling
        console.log('%c[FSM_ACTOR] >>>> _runIntroAnimation INVOKED', 'color: magenta; font-weight: bold;');
        try {
            return new Promise(resolve => {
                // MODIFIED: Target the new header group for a smoother animation
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
            });
        } catch (e) {
            console.error('%c[FSM_ACTOR] >>>> FATAL: Synchronous error in _runIntroAnimation', 'color: red; font-weight: bold;', e);
            return Promise.reject(e); // Ensure the actor receives a rejection
        }
    }

    _runOutroAnimation({ ui, conclusionMessage }) {
        return new Promise(resolve => {
            const mainSpinner = ui.mainTitleContainer.querySelector('.main-processing');
            if (mainSpinner) {
                mainSpinner.classList.remove('main-processing');
                mainSpinner.textContent = 'check_circle';
            }

            const tl = this.gsap.timeline();

            tl.to([mainSpinner, ui.mainTitle], {
                color: 'oklch(var(--terminal-text-color-success-l) var(--terminal-text-color-success-c) var(--terminal-text-color-success-h))',
                duration: 0.3
            }, 0)
            .set(ui.scanTargetName, { clearProps: 'color' }, 0)
            .call(() => {
                const conclusionEl = this._createStyledElement('div', 'scan-conclusion', conclusionMessage);
                ui.container.appendChild(conclusionEl);
                this.gsap.from(conclusionEl, { autoAlpha: 0, duration: 0.5 });
            }, [], '+=0.2')
            .to({}, { duration: 2.0 }) // Linger for 2 seconds
            .call(resolve); // Resolve the promise at the end of the timeline
        });
    }

    _cleanup() {
        console.log('%c[DEBUG] Entered ScanOrchestrator._cleanup()', 'color: lightblue');
        document.removeEventListener('keydown', this._handleEscapeKey);
        document.body.classList.remove('is-scan-active');
        if (this.activeScanActor) {
            // Unsubscribe all listeners before stopping to prevent race conditions on the final snapshot
            this.activeScanActor.stop();
        }
        this.activeScanActor = null;
        console.log('%c[DEBUG] Exited ScanOrchestrator._cleanup()', 'color: lightblue');
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