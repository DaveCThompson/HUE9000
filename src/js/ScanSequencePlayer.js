import { serviceLocator } from './serviceLocator.js';

export class ScanSequencePlayer {
    constructor(renderTarget, config) {
        this.renderTarget = renderTarget;
        this.config = config;
        this.gsap = serviceLocator.get('gsap');

        this.elements = {
            container: null,
            mainTitle: null,
            progressContainer: null,
            progressLabel: null,
            progressValue: null,
            scanTargetContainer: null,
            scanTargetLabel: null,
            scanTargetName: null,
            subJobsContainer: null,
            subJobElements: [], // Will now store { wrapper, el, spinner, title }
            a11yLiveRegion: null,
        };
        this.masterTimeline = null;
        this.playPromise = null;
        this.resolvePromise = null;
        this.rejectPromise = null;
    }

    play() {
        this.playPromise = new Promise((resolve, reject) => {
            this.resolvePromise = resolve;
            this.rejectPromise = reject;
        });

        this._setupDOM();
        this._buildMasterTimeline();
        this.masterTimeline.play();

        return this.playPromise;
    }

    kill() {
        if (this.masterTimeline) {
            this.masterTimeline.kill();
        }
        this._cleanupDOM();
        if (this.rejectPromise) {
            this.rejectPromise(new Error("Scan sequence was interrupted."));
        }
    }

    _setupDOM() {
        document.body.classList.add('is-scan-active');

        this.elements.container = document.createElement('div');
        this.elements.container.className = 'scan-sequence-container';
        this.renderTarget.appendChild(this.elements.container);

        this.elements.a11yLiveRegion = this._createStyledElement('div', 'visually-hidden');
        this.elements.a11yLiveRegion.setAttribute('aria-live', 'polite');
        this.elements.a11yLiveRegion.setAttribute('aria-atomic', 'true');
        this.elements.container.appendChild(this.elements.a11yLiveRegion);

        const mainTitleContainer = this._createStyledElement('div', 'scan-main-title-container');
        const mainSpinner = this._createStyledElement('span', 'material-symbols-outlined scan-spinner main-processing', 'autorenew');
        this.elements.mainTitle = this._createStyledElement('span', 'scan-main-title', this.config.mainTitle);
        mainTitleContainer.append(mainSpinner, this.elements.mainTitle);

        this.elements.progressContainer = this._createStyledElement('div', 'scan-progress-container');
        this.elements.progressLabel = this._createStyledElement('span', 'scan-progress-label', 'SCANNING SEGMENTS: ');
        this.elements.progressValue = this._createStyledElement('span', 'scan-progress-value', '0%');
        this.elements.progressContainer.append(this.elements.progressLabel, this.elements.progressValue);

        this.elements.scanTargetContainer = this._createStyledElement('div', 'scan-target-container');
        this.elements.scanTargetLabel = this._createStyledElement('span', 'scan-target-label', 'Scan Target:');
        this.elements.scanTargetName = this._createStyledElement('span', 'scan-target-name', this.config.scanTarget);
        this.elements.scanTargetContainer.append(this.elements.scanTargetLabel, this.elements.scanTargetName);

        this.elements.subJobsContainer = this._createStyledElement('div', 'scan-sub-jobs-container');

        // Append all created elements to the main container
        this.elements.container.append(mainTitleContainer, this.elements.scanTargetContainer, this.elements.progressContainer, this.elements.subJobsContainer);

        this.config.subJobs.forEach(job => {
            const jobWrapper = this._createStyledElement('div', 'scan-job-wrapper');
            const jobEl = this._createStyledElement('div', 'scan-sub-job is-queued');
            const spinner = this._createStyledElement('span', 'material-symbols-outlined scan-spinner', 'radio_button_unchecked');
            const title = this._createStyledElement('span', 'scan-sub-job-title', job.title);
            jobEl.append(spinner, title);
            jobWrapper.appendChild(jobEl);
            this.elements.subJobsContainer.appendChild(jobWrapper);
            this.elements.subJobElements.push({ wrapper: jobWrapper, el: jobEl, spinner, title });
        });

        this._updateA11yRegion(`Evaluation started for ${this.config.scanTarget}.`);
    }

    _createStyledElement(tag, className, textContent = '') {
        const el = document.createElement(tag);
        el.className = className;
        if (textContent) el.textContent = textContent;
        el.setAttribute('aria-hidden', 'true');
        return el;
    }

    _buildMasterTimeline() {
        this.masterTimeline = this.gsap.timeline({
            onComplete: () => {
                if (this.resolvePromise) this.resolvePromise();
            },
        });

        // REVISED: Sequential reveal of header elements
        const headerElements = [
            this.elements.mainTitle.parentElement,
            this.elements.scanTargetContainer,
            this.elements.progressContainer,
            this.elements.subJobsContainer
        ];
        this.masterTimeline.from(headerElements, {
            autoAlpha: 0,
            y: 10,
            stagger: 0.2, // Stagger their appearance
            duration: 0.4,
            delay: 0.1
        });


        this.config.subJobs.forEach((job, index) => {
            const jobElements = this.elements.subJobElements[index];
            const jobTimeline = this.gsap.timeline();

            jobTimeline.call(() => {
                jobElements.el.classList.remove('is-queued');
                jobElements.el.classList.add('is-active');
                jobElements.spinner.textContent = 'progress_activity';
                this.gsap.set([this.elements.scanTargetName, jobElements.spinner, jobElements.title], { color: `oklch(0.85 0.20 ${job.hue})` });
            }, [], `+=${job.timings.introDelayMs / 1000}`);

            if (job.progressiveLines) {
                job.progressiveLines.forEach(lineData => {
                    const lineContainer = this._createStyledElement('div', 'scan-progressive-line-container');
                    const textEl = this._createStyledElement('span', 'scan-progressive-text', ' ');
                    const barWrapper = this._createStyledElement('div', 'scan-progressive-bar-wrapper');
                    const barFill = this._createStyledElement('div', 'scan-progressive-bar-fill');
                    barFill.style.backgroundColor = `oklch(0.85 0.20 ${job.hue})`;
                    barWrapper.appendChild(barFill);
                    lineContainer.append(textEl, barWrapper);

                    jobTimeline.call(() => {
                        jobElements.wrapper.appendChild(lineContainer);
                    }, [], '>');

                    jobTimeline.from(lineContainer, { autoAlpha: 0, y: 5, duration: 0.2 }, '<');
                    
                    const lineAnimTl = this.gsap.timeline();
                    lineAnimTl.to(textEl, {
                        text: `> ${lineData.text}`,
                        duration: lineData.duration * 0.8,
                        ease: 'none'
                    }).to(barFill, {
                        width: '100%',
                        duration: lineData.duration,
                        ease: 'power1.inOut'
                    }, '<');

                    jobTimeline.add(lineAnimTl);
                });
            }

            jobTimeline.call(() => {
                jobElements.el.classList.remove('is-active');
                jobElements.el.classList.add('is-complete');
                jobElements.spinner.textContent = 'check_circle';
                this.gsap.set([jobElements.spinner, jobElements.title], { clearProps: 'color' });
                this._updateA11yRegion(`${job.title} complete.`);
            }, [], `+=${job.timings.outroDelayMs / 1000}`);

            const newProgress = Math.round(((index + 1) / this.config.subJobs.length) * 100);
            jobTimeline.to(this.elements.progressValue, {
                innerText: newProgress,
                duration: 0.5,
                snap: { innerText: 1 },
                ease: 'power2.out',
                onUpdate: () => {
                    this.elements.progressValue.textContent += '%';
                }
            }, '<');

            this.masterTimeline.add(jobTimeline);
        });

        this.masterTimeline.call(() => {
            this.gsap.set(this.elements.scanTargetName, { clearProps: 'color' });
        });
        
        this.masterTimeline.call(() => {
            this._updateA11yRegion('Evaluation complete.');
            const conclusionEl = this._createStyledElement('div', 'scan-conclusion', this.config.conclusionMessage);
            this.elements.container.appendChild(conclusionEl);
            this.gsap.from(conclusionEl, { autoAlpha: 0, duration: 0.5 });
        });
        
        this.masterTimeline.call(() => {
            document.body.classList.remove('is-scan-active');
        }, [], '+=0.5');
    }

    _cleanupDOM() {
        document.body.classList.remove('is-scan-active');
        if (this.elements.container && this.elements.container.parentNode) {
            this.elements.container.parentNode.removeChild(this.elements.container);
        }
    }
    
    _updateA11yRegion(text) {
        if (this.elements.a11yLiveRegion) {
            this.elements.a11yLiveRegion.textContent = text;
        }
    }
}