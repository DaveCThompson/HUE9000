/**
 * @module AudioManager
 * @description Manages all application audio using Howler.js.
 * It preloads sounds, handles playback for UI interactions and background music,
 * and responds to application state changes.
 */
import { Howl, Howler } from 'howler';
import { serviceLocator } from './serviceLocator.js';

export class AudioManager {
    constructor() {
        this.config = null;
        this.appState = null;
        this.sounds = {}; // Will hold the Howl instances
        this.isReady = false;
        this.isUnlocked = false; // State to track if user has interacted
        this.backgroundMusicStarted = false; // Guard against multiple plays
        this.debug = true;
        this.lastPlayedTimestamps = {}; // For sound throttling

        // Internal state for managing loops
        this.activeLoops = {
            dial: null, // Will store the playback ID for the dial sound
        };
        // Track dragging state for both dials to prevent redundant sound triggers
        this.dialDragState = { A: false, B: false };

        const configModule = serviceLocator.get('config');
        this.config = configModule;
        if (configModule && configModule.AUDIO_CONFIG) {
            const audioConfig = configModule.AUDIO_CONFIG.sounds;
            for (const key in audioConfig) {
                this.sounds[key] = new Howl(audioConfig[key]);
            }
        } else {
            console.error('[AudioManager] AUDIO_CONFIG not found during construction. Sounds will not be loaded.');
        }
    }

    init() {
        // This method is now safe to call early, as it has no dependencies.
        if (this.isReady) return;

        if (!this.config) {
            this.config = serviceLocator.get('config');
        }
        
        Howler.volume(this.config.AUDIO_CONFIG.masterVolume);
        
        if (this.debug) console.log('[AudioManager] Pre-initialized.');
        this.isReady = true;

        document.addEventListener('click', () => this._unlockAudio(), { once: true });
        document.addEventListener('touchstart', () => this._unlockAudio(), { once: true });
    }

    /**
     * Subscribes to appState events. This MUST be called after appState is registered.
     */
    postInitSubscribe() {
        this.appState = serviceLocator.get('appState');
        this.appState.subscribe('appStatusChanged', this.handleAppStatusChange.bind(this));
        this.appState.subscribe('dialUpdated', this.handleDialUpdate.bind(this));
        if (this.debug) console.log('[AudioManager] Subscribed to appState events.');
    }

    _unlockAudio() {
        if (this.isUnlocked) return;
        this.isUnlocked = true;

        if (Howler.ctx && Howler.ctx.state !== 'running') {
            Howler.ctx.resume().then(() => {
                if (this.debug) console.log('[AudioManager] Audio context resumed successfully.');
            }).catch(e => console.error('[AudioManager] Error resuming audio context:', e));
        }

        if (this.debug) console.log('[AudioManager] Audio context unlocked by user interaction.');
        
        // Play background music immediately upon unlock if it hasn't started.
        if (!this.backgroundMusicStarted) {
            this.play('backgroundMusic');
        }
    }

    play(soundKey) {
        if (!this.isUnlocked) {
            if (this.debug) console.log(`[AudioManager] Playback for '${soundKey}' BLOCKED, audio not yet unlocked.`);
            return;
        }

        const now = Date.now();
        const cooldowns = this.config.AUDIO_CONFIG.soundCooldowns || {};
        const cooldown = cooldowns[soundKey];

        if (cooldown) {
            const lastPlayed = this.lastPlayedTimestamps[soundKey] || 0;
            if (now - lastPlayed < cooldown) {
                if (this.debug) console.log(`[AudioManager] Playback for '${soundKey}' throttled.`);
                return;
            }
        }

        const soundConfig = this.config.AUDIO_CONFIG.sounds[soundKey];
        const sound = this.sounds[soundKey];

        // Add detailed debugging for playback failures.
        if (sound && soundConfig && this.isReady) {
            if (this.debug) console.log(`[AudioManager] Playing sound: '${soundKey}'`);
            const soundId = sound.play();
            this.lastPlayedTimestamps[soundKey] = now;

            if (soundKey === 'backgroundMusic') {
                 this.backgroundMusicStarted = true;
            }

            if (soundConfig.fadeOutDuration && soundId) {
                sound.fade(sound.volume(soundId), 0, soundConfig.fadeOutDuration, soundId);
            }
        } else if (this.debug) {
            const debugInfo = {
                soundKey,
                soundExists: !!sound,
                soundConfigExists: !!soundConfig,
                isManagerReady: this.isReady,
                soundState: sound ? sound.state() : 'N/A'
            };
            console.warn(`[AudioManager] Sound not found or not ready.`, debugInfo);
        }
    }

    startLoop(soundKey) {
        if (!this.isUnlocked) return;

        if (this.sounds[soundKey] && this.isReady && !this.activeLoops[soundKey]) {
            if (this.debug) console.log(`[AudioManager] Starting loop: ${soundKey}`);
            this.activeLoops[soundKey] = this.sounds[soundKey].play();
        }
    }

    stopLoop(soundKey) {
        if (!this.isUnlocked) return;

        if (this.sounds[soundKey] && this.isReady && this.activeLoops[soundKey]) {
            if (this.debug) console.log(`[AudioManager] Stopping loop: ${soundKey}`);
            this.sounds[soundKey].fade(this.sounds[soundKey].volume(), 0, 100, this.activeLoops[soundKey]);
            
            setTimeout(() => {
                if (this.activeLoops[soundKey]) {
                    this.sounds[soundKey].stop(this.activeLoops[soundKey]);
                    this.sounds[soundKey].volume(this.config.AUDIO_CONFIG.sounds[soundKey].volume);
                    this.activeLoops[soundKey] = null;
                }
            }, 100);
        }
    }

    toggleMute(isMuted) {
        Howler.mute(isMuted);
        if (this.debug) console.log(`[AudioManager] Global mute set to: ${isMuted}`);
    }

    handleAppStatusChange(newStatus) {
        // This function is kept for potential future use, but the background music
        // logic has been moved to _unlockAudio for more immediate playback.
        if (!this.isReady) return;
    }

    handleDialUpdate({ id, state }) {
        if (!this.isReady || !this.appState || (id !== 'A' && id !== 'B')) return;

        if (this.debug) {
            // console.log(`[AudioManager handleDialUpdate] ID: ${id}, isDragging: ${state.isDragging}, wasDragging: ${this.dialDragState[id]}`);
        }

        const wasDragging = this.dialDragState[id];
        const isDragging = state.isDragging;

        if (isDragging && !wasDragging) {
            this.startLoop('dialLoop');
        } else if (!isDragging && wasDragging) {
            const otherDialId = id === 'A' ? 'B' : 'A';
            if (!this.dialDragState[otherDialId]) {
                this.stopLoop('dialLoop');
            }
        }
        this.dialDragState[id] = isDragging;
    }
}