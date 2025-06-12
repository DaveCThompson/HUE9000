/**
 * @module sidePanelManager
 * @description Manages the UI and interactions for the left and right side panels.
 */
import { serviceLocator } from './serviceLocator.js';

export class SidePanelManager {
    constructor() {
        this.dom = null;
        this.appState = null;
        this.startupManager = null;
        this.audioManager = null;
        this.config = null;
        this.isMuted = false;
        this.isSequencePaused = false;
        this.debug = true;
    }

    init() {
        this.dom = serviceLocator.get('domElements');
        this.appState = serviceLocator.get('appState');
        this.startupManager = serviceLocator.get('startupSequenceManager');
        this.audioManager = serviceLocator.get('audioManager');
        this.config = serviceLocator.get('config');

        if (this.debug) console.log('[SidePanelManager] Initializing...');

        this._setupPanelToggles();
        this._setupTabControls();
        this._populateAudioTab();
        this._populateSequenceTab();
        this._populateStateTab(); // New call
        this._setupGlobalStateListeners();

        if (this.debug) console.log('[SidePanelManager] Initialization complete.');
    }

    _setupPanelToggles() {
        // Main panel toggle
        const deckToggle = document.getElementById('deck-toggle');
        if (deckToggle) {
            deckToggle.addEventListener('click', () => {
                this.dom.controlDeck.classList.toggle('is-expanded');
                this.dom.appWrapper.classList.toggle('left-panel-expanded');
                if (this.debug) console.log('[SidePanelManager] Control Deck toggled.');
            });
        }

        // Sequence controls
        const playPauseBtn = document.getElementById('seq-play-pause');
        if (playPauseBtn) {
            // Set initial state
            playPauseBtn.querySelector('.material-symbols-outlined').textContent = 'pause';

            playPauseBtn.addEventListener('click', () => {
                this.isSequencePaused = !this.isSequencePaused;
                const icon = playPauseBtn.querySelector('.material-symbols-outlined');
                if (this.isSequencePaused) {
                    this.startupManager.pauseSequence();
                    if(icon) icon.textContent = 'play_arrow';
                } else {
                    this.startupManager.resumeSequence();
                    if(icon) icon.textContent = 'pause';
                }
                if (this.debug) console.log(`[SidePanelManager] Sequence pause toggled to: ${this.isSequencePaused}`);
            });
        }

        const resetBtn = document.getElementById('seq-reset');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                this.startupManager.resetSequence();
                if (this.debug) console.log('[SidePanelManager] Sequence reset.');
            });
        }

        // Audio mute toggle
        const muteBtn = document.getElementById('audio-mute-toggle');
        if (muteBtn) {
            muteBtn.addEventListener('click', () => {
                this.isMuted = !this.isMuted;
                this.audioManager.toggleMute(this.isMuted);
                const icon = muteBtn.querySelector('.material-symbols-outlined');
                if(icon) icon.textContent = this.isMuted ? 'volume_off' : 'volume_up';
                if (this.debug) console.log(`[SidePanelManager] Mute toggled to: ${this.isMuted}`);
            });
        }
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
                if (contentEl) {
                    contentEl.classList.add('active');
                    if (this.debug) console.log(`[SidePanelManager] Switched to tab: ${contentId}`);
                }
            });
        });
    }

    _populateAudioTab() {
        const audioTab = document.getElementById('audio-tab');
        if (!audioTab) {
            if (this.debug) console.warn('[SidePanelManager] #audio-tab not found.');
            return;
        }
        let audioHtml = '<ul>';
        for (const key in this.config.AUDIO_CONFIG.sounds) {
            audioHtml += `<li><span>${key}</span> <button class="play-sound-btn" data-sound-key="${key}">Play</button></li>`;
        }
        audioHtml += '</ul>';
        audioTab.innerHTML = audioHtml;

        audioTab.querySelectorAll('.play-sound-btn').forEach(btn => {
            btn.addEventListener('click', () => this.audioManager.play(btn.dataset.soundKey));
        });
    }

    _populateSequenceTab() {
        const sequenceTab = document.getElementById('sequence-tab');
        if (!sequenceTab) {
            if (this.debug) console.warn('[SidePanelManager] #sequence-tab not found.');
            return;
        }
        let sequenceHtml = '<ul class="sequence-list">';
        this.config.phaseConfigs.forEach(phase => {
            sequenceHtml += `<li data-phase-num="${phase.phase}"><span>P${phase.phase}:</span> ${phase.name}</li>`;
        });
        sequenceHtml += '</ul>';
        sequenceTab.innerHTML = sequenceHtml;

        sequenceTab.querySelectorAll('li').forEach(item => {
            item.addEventListener('click', () => {
                const phaseNum = parseInt(item.dataset.phaseNum, 10);
                if (this.debug) console.log(`[SidePanelManager] Jump to phase requested: ${phaseNum}`);
                this.startupManager.jumpToPhase(phaseNum);
            });
        });
    }
    
    _populateStateTab() {
        const stateTab = document.getElementById('state-tab');
        if (!stateTab) {
            if (this.debug) console.warn('[SidePanelManager] #state-tab not found.');
            return;
        }
        
        const renderState = () => {
            const appStatus = this.appState.getAppStatus();
            const theme = this.appState.getCurrentTheme();
            const lensPower = this.appState.getTrueLensPower();
            const dialA = this.appState.getDialState('A');
            const dialB = this.appState.getDialState('B');

            stateTab.innerHTML = `
                <ul>
                    <li><span>App Status:</span> <span class="state-value">${appStatus}</span></li>
                    <li><span>Theme:</span> <span class="state-value">${theme}</span></li>
                    <li><span>Lens Power:</span> <span class="state-value">${(lensPower * 100).toFixed(2)}%</span></li>
                    <li><span>Dial A Hue:</span> <span class="state-value">${dialA.hue.toFixed(2)}°</span></li>
                    <li><span>Dial B Hue:</span> <span class="state-value">${dialB.hue.toFixed(2)}°</span></li>
                </ul>
            `;
        };

        // Render initially and subscribe to changes
        renderState();
        this.appState.subscribe('appStatusChanged', renderState);
        this.appState.subscribe('themeChanged', renderState);
        this.appState.subscribe('trueLensPowerChanged', renderState);
        this.appState.subscribe('dialUpdated', renderState);
    }

    _setupGlobalStateListeners() {
        this.appState.subscribe('startup:phaseChanged', ({ numericPhase }) => {
            const sequenceTab = document.getElementById('sequence-tab');
            if (!sequenceTab) return;
            sequenceTab.querySelectorAll('li').forEach(li => {
                const phaseNum = parseInt(li.dataset.phaseNum, 10);
                li.classList.remove('is-active', 'is-complete');
                if (phaseNum < numericPhase) {
                    li.classList.add('is-complete');
                } else if (phaseNum === numericPhase) {
                    li.classList.add('is-active');
                }
            });

            // Enable/disable sequence controls based on FSM state
            const playPauseBtn = document.getElementById('seq-play-pause');
            if(playPauseBtn) {
                 const isComplete = this.appState.getAppStatus() === 'interactive';
                 playPauseBtn.disabled = isComplete;
                 const icon = playPauseBtn.querySelector('.material-symbols-outlined');
                 if(isComplete) {
                     if(icon) icon.textContent = 'play_arrow';
                     this.isSequencePaused = true;
                 }
            }
        });
    }
}