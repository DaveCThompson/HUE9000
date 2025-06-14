/**
 * @module sidePanelManager
 * @description Manages the UI and interactions for the left and right side panels.
 */
import { serviceLocator } from './serviceLocator.js';
import * as appState from './appState.js'; // IMPORT appState directly

export class SidePanelManager {
    constructor() {
        this.dom = null;
        // this.appState = null; // REMOVED
        this.startupManager = null;
        this.audioManager = null;
        this.config = null;
        this.isMuted = false;
        this.isAutoplayOn = false; 
        this.debug = true;
    }

    init() {
        this.dom = serviceLocator.get('domElements');
        // this.appState = serviceLocator.get('appState'); // REMOVED
        this.startupManager = serviceLocator.get('startupSequenceManager');
        this.audioManager = serviceLocator.get('audioManager');
        this.config = serviceLocator.get('config');

        if (this.debug) console.log('[SidePanelManager] Initializing...');

        this._setupPanelToggles();
        this._setupTabControls();
        this._populateSequenceTab();
        this._populateStateTab();
        this._setupGlobalStateListeners();
        
        this._updateManualControlsVisibility();

        if (this.debug) console.log('[SidePanelManager] Initialization complete.');
    }

    _setupPanelToggles() {
        const deckToggle = document.getElementById('deck-toggle');
        if (deckToggle) {
            deckToggle.addEventListener('click', () => {
                this.dom.controlDeck.classList.toggle('is-expanded');
                this.dom.appWrapper.classList.toggle('left-panel-expanded');
            });
        }

        const autoplayBtn = document.getElementById('seq-autoplay-toggle');
        const nextStepBtn = document.getElementById('seq-next-step');
        const playAllBtn = document.getElementById('seq-play-all');
        const resetBtn = document.getElementById('seq-reset');
        
        if (autoplayBtn) {
            autoplayBtn.addEventListener('click', () => {
                this.isAutoplayOn = !this.isAutoplayOn;
                this._updateManualControlsVisibility();
                
                const icon = autoplayBtn.querySelector('.material-symbols-outlined');
                if (icon) icon.textContent = this.isAutoplayOn ? 'fast_forward' : 'rule';
                autoplayBtn.classList.toggle('is-active', this.isAutoplayOn);

                if (this.isAutoplayOn) {
                    this.startupManager.playAllRemaining();
                    if (this.debug) console.log('[SidePanelManager] Autoplay toggled ON.');
                } else {
                    this.startupManager.pauseSequence();
                    if (this.debug) console.log('[SidePanelManager] Autoplay toggled OFF.');
                }
            });
        }

        if (nextStepBtn) {
            nextStepBtn.addEventListener('click', () => this.startupManager.playNextPhase());
        }

        if (playAllBtn) {
            playAllBtn.addEventListener('click', () => {
                this.isAutoplayOn = true; 
                this._updateManualControlsVisibility();
                 const icon = autoplayBtn.querySelector('.material-symbols-outlined');
                if (icon) icon.textContent = 'fast_forward';
                autoplayBtn.classList.add('is-active');
                this.startupManager.playAllRemaining();
            });
        }

        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                this.startupManager.resetSequence();
                if (this.debug) console.log('[SidePanelManager] Sequence reset.');
            });
        }

        const muteBtn = document.getElementById('audio-mute-toggle');
        if (muteBtn) {
            muteBtn.addEventListener('click', () => {
                this.isMuted = !this.isMuted;
                this.audioManager.toggleMute(this.isMuted); // Assuming toggleMute exists in AudioManager
                const icon = muteBtn.querySelector('.material-symbols-outlined');
                if(icon) icon.textContent = this.isMuted ? 'volume_off' : 'volume_up';
            });
        }
    }

    _updateManualControlsVisibility() {
        const nextStepBtn = document.getElementById('seq-next-step');
        const playAllBtn = document.getElementById('seq-play-all');
        if (nextStepBtn) nextStepBtn.classList.toggle('hidden', this.isAutoplayOn);
        if (playAllBtn) playAllBtn.classList.toggle('hidden', this.isAutoplayOn);
    }

    _setupTabControls() {
        const allTabs = document.querySelectorAll('.panel-tab-button');
        allTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const parentPanel = tab.closest('.expanded-view');
                if (!parentPanel) return;
                parentPanel.querySelectorAll('.panel-tab-button').forEach(t => t.classList.remove('active'));
                parentPanel.querySelectorAll('.panel-tab-content').forEach(c => c.classList.remove('active'));
                tab.classList.add('active');
                const contentId = tab.dataset.tab;
                const contentEl = parentPanel.querySelector(`#${contentId}`);
                if (contentEl) contentEl.classList.add('active');
            });
        });
    }

    _populateSequenceTab() {
        const sequenceTab = document.getElementById('sequence-tab');
        if (!sequenceTab) return;
        let sequenceHtml = '<ul class="sequence-list">';
        this.config.phaseConfigs.forEach(phase => {
            sequenceHtml += `<li data-phase-num="${phase.phase}"><span>P${phase.phase}:</span> ${phase.name}</li>`;
        });
        sequenceHtml += '</ul>';
        sequenceTab.innerHTML = sequenceHtml;
    }
    
    _populateStateTab() {
        const stateTab = document.getElementById('state-tab');
        if (!stateTab) return;
        
        const renderState = () => {
            const currentAppStatus = appState.getAppStatus();
            const theme = appState.getCurrentTheme();
            const lensPower = appState.getTrueLensPower();
            const dialA = appState.getDialState('A');
            const dialB = appState.getDialState('B');
            const shutdownStage = appState.getResistiveShutdownStage();

            stateTab.innerHTML = `
                <ul>
                    <li><span>App Status:</span> <span class="state-value">${currentAppStatus}</span></li>
                    <li><span>Theme:</span> <span class="state-value">${theme}</span></li>
                    <li><span>Lens Power:</span> <span class="state-value">${(lensPower * 100).toFixed(2)}%</span></li>
                    <li><span>Mood Hue:</span> <span class="state-value">${dialA.hue.toFixed(2)}°</span></li>
                    <li><span>Intensity:</span> <span class="state-value">${(dialB.hue / 3.6).toFixed(2)}%</span></li>
                    <li><span>Resist Stage:</span> <span class="state-value">${shutdownStage}</span></li>
                </ul>
            `;
        };

        renderState();
        appState.subscribe('appStatusChanged', renderState);
        appState.subscribe('themeChanged', renderState);
        appState.subscribe('trueLensPowerChanged', renderState);
        appState.subscribe('dialUpdated', renderState);
        appState.subscribe('resistiveShutdownStageChanged', renderState);
    }

    _setupGlobalStateListeners() {
        appState.subscribe('startup:phaseChanged', ({ numericPhase }) => {
            const sequenceTab = document.getElementById('sequence-tab');
            if (sequenceTab) {
                sequenceTab.querySelectorAll('li').forEach(li => {
                    const phaseNum = parseInt(li.dataset.phaseNum, 10);
                    li.classList.remove('is-active', 'is-complete');
                    if (phaseNum < numericPhase) li.classList.add('is-complete');
                    else if (phaseNum === numericPhase) li.classList.add('is-active');
                });
            }

            const isComplete = appState.getAppStatus() === 'interactive';
            
            const autoplayBtn = document.getElementById('seq-autoplay-toggle');
            const nextStepBtn = document.getElementById('seq-next-step');
            const playAllBtn = document.getElementById('seq-play-all');
            const resetBtn = document.getElementById('seq-reset');

            if (autoplayBtn) autoplayBtn.disabled = isComplete;
            if (nextStepBtn) nextStepBtn.disabled = isComplete;
            if (playAllBtn) playAllBtn.disabled = isComplete;
            if (resetBtn) resetBtn.disabled = isComplete;

            if (isComplete && autoplayBtn) {
                autoplayBtn.classList.remove('is-active');
                const icon = autoplayBtn.querySelector('.material-symbols-outlined');
                if (icon) icon.textContent = 'rule';
                this.isAutoplayOn = false;
                this._updateManualControlsVisibility();
            }
        });

        appState.subscribe('appStatusChanged', (status) => {
            if (status === 'starting-up') {
                document.querySelectorAll('.panel-control-button').forEach(btn => btn.disabled = false);
                const autoplayBtn = document.getElementById('seq-autoplay-toggle');
                if (autoplayBtn) {
                    autoplayBtn.classList.remove('is-active');
                    const icon = autoplayBtn.querySelector('.material-symbols-outlined');
                    if (icon) icon.textContent = 'rule';
                }
                this.isAutoplayOn = false;
                this._updateManualControlsVisibility();
            }
        });
    }
}