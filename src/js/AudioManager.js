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

        // Internal state for managing loops
        this.activeLoops = {
            dial: null, // Will store the playback ID for the dial sound
        };
        // Track dragging state for both dials to prevent redundant sound triggers
        this.dialDragState = { A: false, B: false };
    }

    init() {
        this.config = serviceLocator.get('config');
        this.appState = serviceLocator.get('appState');
        
        // 1. Load ALL sounds from config immediately.
        const audioConfig = this.config.AUDIO_CONFIG.sounds;
        for (const key in audioConfig) {
            this.sounds[key] = new Howl(audioConfig[key]);
        }

        // 2. Set global volume
        Howler.volume(this.config.AUDIO_CONFIG.masterVolume);

        // 3. Subscribe to application events
        this.appState.subscribe('appStatusChanged', this.handleAppStatusChange.bind(this));
        this.appState.subscribe('dialUpdated', this.handleDialUpdate.bind(this));
        
        if (this.debug) console.log('[AudioManager] Initialized and sounds are preloading.');
        this.isReady = true;

        // 4. Set up a one-time listener to unlock the audio context on first user interaction.
        document.addEventListener('click', () => this._unlockAudio(), { once: true });
        document.addEventListener('touchstart', () => this._unlockAudio(), { once: true });
    }

    _unlockAudio() {
        if (this.isUnlocked) return;
        this.isUnlocked = true;

        // Manually resume the AudioContext. Howler attempts this automatically on play,
        // but being explicit is more robust.
        if (Howler.ctx && Howler.ctx.state !== 'running') {
            Howler.ctx.resume();
        }

        if (this.debug) console.log('[AudioManager] Audio context unlocked by user interaction.');
        
        // Play music immediately on unlock, if it hasn't started.
        if (!this.backgroundMusicStarted) {
            this.play('backgroundMusic');
            this.backgroundMusicStarted = true;
        }
    }

    /**
     * Plays a one-shot sound.
     * @param {string} soundKey - The key of the sound in the config (e.g., 'buttonPress').
     */
    play(soundKey) {
        if (!this.isUnlocked) {
            if (this.debug) console.log(`[AudioManager] Playback for '${soundKey}' blocked, audio not yet unlocked.`);
            return;
        }

        if (this.sounds[soundKey] && this.isReady) {
            this.sounds[soundKey].play();
        } else if (this.debug) {
            console.warn(`[AudioManager] Sound not found or not ready: ${soundKey}`);
        }
    }

    /**
     * Starts a looping sound if it's not already playing.
     * @param {string} soundKey - The key of the looping sound (e.g., 'dialLoop').
     */
    startLoop(soundKey) {
        if (!this.isUnlocked) return;

        if (this.sounds[soundKey] && this.isReady && !this.activeLoops[soundKey]) {
            if (this.debug) console.log(`[AudioManager] Starting loop: ${soundKey}`);
            this.activeLoops[soundKey] = this.sounds[soundKey].play();
        }
    }

    /**
     * Stops a looping sound.
     * @param {string} soundKey - The key of the looping sound to stop.
     */
    stopLoop(soundKey) {
        if (!this.isUnlocked) return;

        if (this.sounds[soundKey] && this.isReady && this.activeLoops[soundKey]) {
            if (this.debug) console.log(`[AudioManager] Stopping loop: ${soundKey}`);
            // Fade out for a smoother stop
            this.sounds[soundKey].fade(this.sounds[soundKey].volume(), 0, 100, this.activeLoops[soundKey]);
            
            // After fade, stop it and reset volume for next play
            setTimeout(() => {
                if (this.activeLoops[soundKey]) { // Check if it hasn't been started again
                    this.sounds[soundKey].stop(this.activeLoops[soundKey]);
                    // Reset volume to its original value
                    this.sounds[soundKey].volume(this.config.AUDIO_CONFIG.sounds[soundKey].volume);
                    this.activeLoops[soundKey] = null;
                }
            }, 100);
        }
    }

    // --- Event Handlers ---

    handleAppStatusChange(newStatus) {
        if (!this.isReady) return;

        // This is now just a fallback in case unlock happens after interactive state is reached,
        // which is unlikely in the current flow but safe to keep.
        if (newStatus === 'interactive' && this.isUnlocked && !this.backgroundMusicStarted) {
            if (this.debug) console.log('[AudioManager] App is interactive and audio is unlocked, starting background music.');
            this.play('backgroundMusic');
            this.backgroundMusicStarted = true;
        }
    }

    handleDialUpdate({ id, state }) {
        if (!this.isReady || (id !== 'A' && id !== 'B')) return;

        const wasDragging = this.dialDragState[id];
        const isDragging = state.isDragging;

        if (isDragging && !wasDragging) {
            // Drag started for this specific dial
            this.startLoop('dialLoop');
        } else if (!isDragging && wasDragging) {
            // Drag ended for this specific dial
            // Check if the other dial is also not dragging before stopping the sound
            const otherDialId = id === 'A' ? 'B' : 'A';
            if (!this.dialDragState[otherDialId]) {
                this.stopLoop('dialLoop');
            }
        }
        this.dialDragState[id] = isDragging;
    }
}