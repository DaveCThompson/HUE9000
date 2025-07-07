/**
 * @module ScanOrchestrator
 * @description Manages the entire lifecycle of a scan sequence, from user
 * input to completion, acting as the bridge between the UI (TerminalManager),
 * state (scanFsm), and user interaction.
 */
import { createActor } from 'xstate';
import { serviceLocator } from './serviceLocator.js';
import { createScanMachine } from './scanFsm.js';
import { renderBarFill } from './renderers/barFill.js';
import { renderTypeWindow } from './renderers/typeWindow.js';
import { rendererRegistry } from './renderers/index.js';
import { fromPromise } from 'xstate';

export class ScanOrchestrator {
    constructor() {
        this.gsap = serviceLocator.get('gsap');
        this.terminalManager = serviceLocator.get('terminalManager');
        this.activeScanActor = null;
        this.onCompleteCallback = null;

        this._registerRenderers();
        this._handleEscapeKey = this._handleEscapeKey.bind(this);
    }

    _registerRenderers() {
        rendererRegistry.register('barFill', renderBarFill);
        rendererRegistry.register('typeWindow', renderTypeWindow);
    }

    async startScan(scanConfig, onCompleteCallback) {
        if (this.activeScanActor) {
            console.warn("ScanOrchestrator: A scan is already in progress. Aborting new request.");
            return;
        }
        this.onCompleteCallback = onCompleteCallback;

        const scanContainer = await this.terminalManager.prepareForTakeover();
        if (!scanContainer) {
            console.error("ScanOrchestrator: Failed to get scan container from TerminalManager.");
            this._cleanup(false);
            return;
        }
        
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
            if (snapshot.event) {
                if (snapshot.event.type === 'xstate.done.actor.job-renderer-0') this._updateA11yRegion(`${snapshot.context.subJobs[0].title} complete.`);
                if (snapshot.event.type === 'xstate.done.actor.job-renderer-1') this._updateA11yRegion(`${snapshot.context.subJobs[1].title} complete.`);
                if (snapshot.event.type === 'xstate.done.actor.job-renderer-2') this._updateA11yRegion(`${snapshot.context.subJobs[2].title} complete.`);
            }
            
            if (snapshot.done) {
                this._cleanup(snapshot.value === 'aborted');
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

        container.append(
            elements.a11yLiveRegion,
            elements.mainTitleContainer,
            elements.scanTargetContainer,
            elements.progressContainer,
            elements.subJobsContainer
        );

        const subJobTargets = [];
        context.subJobs.forEach(job => {
            const jobWrapper = this._createStyledElement('div', 'scan-job-wrapper');
            const jobEl = this._createStyledElement('div', 'scan-sub-job is-queued');
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
        return new Promise(resolve => {
            const headerElements = [
                ui.mainTitleContainer,
                ui.scanTargetContainer,
                ui.progressContainer,
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

    async _cleanup(wasAborted) {
        document.removeEventListener('keydown', this._handleEscapeKey);
        
        await this.terminalManager.cleanupAfterScan(wasAborted);

        // This must be called AFTER the UI has been cleaned up.
        document.body.classList.remove('is-scan-active');

        if (this.onCompleteCallback) {
            this.onCompleteCallback(wasAborted);
        }
        
        this.activeScanActor = null;
        this.onCompleteCallback = null;
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