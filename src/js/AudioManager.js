/**
 * @module AudioManager
 * @description Manages all application audio using Howler.js.
 * Ensures audio context is unlocked and handles loading, playback, and state events.
 */
import { Howl, Howler } from 'howler';
import { serviceLocator } from './serviceLocator.js';
import { EventEmitter } from './EventEmitter.js'; // Simple event emitter
import { AUDIO_CONFIG } from './config/index.js';
import * as appState from './appState.js'; // IMPORT appState

export class AudioManager extends EventEmitter {
    constructor() {
        super(); // Call EventEmitter constructor
        this.sounds = {};
        this.isAudioUnlocked = false;
        this.isReadyState = false; // Tracks if AudioManager init is complete
        this.soundLoadStates = {}; // Tracks individual sound load states: 'loading', 'loaded', 'error'
        this.queuedPlayCalls = [];
        this.debug = false; // ENABLED for detailed sound logging
        this.currentMusicKey = null; // Track current background music
        this.currentMusicId = null; // Track the ID of the playing music
    }

    /**
     * Initializes AudioManager: sets config, global volume, loads sounds.
     * This is called BEFORE the preloader visual sequence typically starts.
     */
    init() {
        if (!AUDIO_CONFIG) {
            console.error('[AudioManager INIT] Audio config not found!');
            this.isReadyState = true; // Mark as ready but with errors
            return;
        }

        Howler.volume(AUDIO_CONFIG.masterVolume);
        // console.log(`[AM] AudioManager INIT. MasterVol: ${AUDIO_CONFIG.masterVolume}`);
        this._loadAllSounds();
        this._setupVisibilityChangeHandler();
        this.isReadyState = true;
    }

    /**
     * Handles the Page Visibility API to automatically mute audio when the
     * page is not visible (e.g., tab backgrounded, screen off on mobile).
     */
    _setupVisibilityChangeHandler() {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden') {
                // Mute all audio when the page is not visible.
                Howler.mute(true);
            } else {
                // When the page becomes visible again, restore the mute state
                // to the user's preference stored in appState.
                Howler.mute(appState.getIsAudioMuted());
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
    }

    postInitSubscribe() {
        // Example: appState.subscribe('someEvent', (payload) => this.handleSomeEvent(payload));
    }

    isReady() {
        return this.isReadyState;
    }

    _loadAllSounds() {
        const soundConfigs = AUDIO_CONFIG.sounds;
        for (const key in soundConfigs) {
            if (Object.prototype.hasOwnProperty.call(soundConfigs, key) && soundConfigs[key].src) {
                this.soundLoadStates[key] = 'loading';
                
                this.sounds[key] = new Howl({
                    src: [soundConfigs[key].src],
                    loop: soundConfigs[key].loop || false,
                    volume: soundConfigs[key].volume !== undefined ? soundConfigs[key].volume : 1.0,
                    html5: soundConfigs[key].html5 || false, 
                    onload: () => {
                        this.soundLoadStates[key] = 'loaded';
                        // console.log(`[AM] Sound LOADED and READY: ${key}`);
                        this.emit('soundLoaded', key); 
                        this._processQueuedPlayCalls(key);
                    },
                    onloaderror: (id, err) => {
                        this.soundLoadStates[key] = 'error';
                        console.error(`[AM] Error loading sound ${key} (id: ${id}):`, err);
                        this.emit('soundLoadError', { key, error: err });
                    },
                    onplayerror: (id, err) => {
                        console.error(`[AudioManager] Error playing sound ${key} (id: ${id}):`, err);
                        this.unlockAudioContext(); 
                    },
                    onplay: (id) => { // Added id parameter
                        // console.log(`[AM] Howler ONPLAY for sound: ${key} (ID: ${id}, Vol: ${this.sounds[key].volume(id)})`);
                    },
                    onstop: (id) => {
                        // if (this.debug) console.log(`[AudioManager] Stopped sound: ${key} (ID: ${id})`);
                        // If the stopped music track was the one we were tracking, clear it
                        if (AUDIO_CONFIG.sounds[key]?.isMusic && id === this.currentMusicId) {
                            // if (this.debug) console.log(`[AM Music] Clearing currentMusicKey/Id because ${key} (ID: ${id}) stopped.`);
                            this.currentMusicKey = null;
                            this.currentMusicId = null;
                        }
                    },
                    onfade: (id) => { // Added id parameter
                        // if (this.debug) console.log(`[AudioManager] Fade complete for sound: ${key} (ID: ${id})`);
                    }
                });
            } else {
                 console.warn(`[AudioManager] Sound config for "${key}" is missing 'src'. Skipping.`);
            }
        }
    }

    _processQueuedPlayCalls(soundKey) {
        // if (this.debug && this.queuedPlayCalls.some(call => call.key === soundKey)) {
        //     console.log(`[AudioManager] Processing queued play calls for just loaded sound: ${soundKey}`);
        // }
        this.queuedPlayCalls = this.queuedPlayCalls.filter(call => {
            if (call.key === soundKey) {
                // if (this.debug) console.log(`[AudioManager] Executing queued play for: ${soundKey}`);
                this.play(call.key, call.forceRestart, call.specificVolume);
                return false; 
            }
            return true; 
        });
    }
    
    isSoundLoaded(key) {
        return this.soundLoadStates[key] === 'loaded';
    }

    subscribeToSoundLoad(key, callback) {
        const eventName = 'soundLoaded';
        const specificListener = (loadedKey) => {
            if (loadedKey === key) {
                callback(loadedKey);
            }
        };
        return this.subscribe(eventName, specificListener);
    }
    
    subscribeToSoundLoadError(key, callback) {
        const eventName = 'soundLoadError';
        const specificListener = (errorData) => {
            if (errorData.key === key) {
                callback(errorData);
            }
        };
        return this.subscribe(eventName, specificListener);
    }


    unlockAudioContext() {
        if (this.isAudioUnlocked || !Howler.ctx || Howler.ctx.state !== 'suspended') {
            if (Howler.ctx && Howler.ctx.state !== 'suspended' && !this.isAudioUnlocked) {
                this.isAudioUnlocked = true;
            }
            return;
        }
        // if (this.debug) console.log('[AudioManager] Attempting to unlock AudioContext...');
        Howler.ctx.resume().then(() => {
            this.isAudioUnlocked = true;
            // if (this.debug) console.log('[AudioManager] AudioContext resumed successfully.');
        }).catch(e => console.error('[AudioManager] Error resuming AudioContext:', e));
    }

    play(key, forceRestart = false, specificVolume = null) {
        // console.log(`[AM] Play: '${key}', Force: ${forceRestart}, Vol: ${specificVolume === null ? 'default' : specificVolume}`);

        this.unlockAudioContext(); 

        if (!this.sounds[key]) {
            console.warn(`[AudioManager PLAY] Sound key "${key}" not found.`);
            return null;
        }

        if (this.soundLoadStates[key] === 'loading') {
            if (!this.queuedPlayCalls.find(call => call.key === key && call.forceRestart === forceRestart && call.specificVolume === specificVolume)) {
                 this.queuedPlayCalls.push({ key, forceRestart, specificVolume });
            }
            return null;
        }
        if (this.soundLoadStates[key] === 'error') {
            console.error(`[AudioManager PLAY] Cannot play sound "${key}", it failed to load.`);
            return null;
        }

        if (forceRestart && this.sounds[key].playing()) {
            this.sounds[key].stop();
        }

        if (!this.sounds[key].playing() || forceRestart) {
            const soundId = this.sounds[key].play();
            if (typeof soundId === 'number') {
                if (specificVolume !== null && typeof specificVolume === 'number') {
                    this.sounds[key].volume(specificVolume, soundId);
                } else {
                    const defaultConfigVolume = AUDIO_CONFIG.sounds[key]?.volume;
                    if (defaultConfigVolume !== undefined) {
                        this.sounds[key].volume(defaultConfigVolume, soundId);
                    }
                }
            }
            return soundId;
        }
        return null; 
    }

    stop(key, soundId = null) {
        if (this.sounds[key]) {
            // console.log(`[AM] Stop: ${key}, ID: ${soundId || 'all'}`);
            if (soundId) this.sounds[key].stop(soundId);
            else this.sounds[key].stop();
        } else console.warn(`[AudioManager STOP] Sound key "${key}" not found.`);
    }

    fadeOut(key, durationSeconds, soundId = null) {
        const sound = this.sounds[key];
        if (sound && this.isPlaying(key, soundId)) {
            // console.log(`[AM] FadeOut: ${key}, Duration: ${durationSeconds}s, ID: ${soundId || 'all'}`);
            const targetVolume = 0;
            const durationMs = durationSeconds * 1000;
    
            const onFadeComplete = (id) => {
                this.stop(key, id); // Explicitly stop the sound
                sound.off('fade', onFadeComplete, id);
            };
    
            if (soundId) {
                sound.once('fade', onFadeComplete, soundId);
                sound.fade(sound.volume(undefined, soundId), targetVolume, durationMs, soundId);
            } else {
                const playingIds = sound._getSoundIds ? sound._getSoundIds() : [null];
                playingIds.forEach(id => {
                    if (this.isPlaying(key, id)) {
                        sound.once('fade', onFadeComplete, id);
                        sound.fade(sound.volume(undefined, id), targetVolume, durationMs, id);
                    }
                });
            }
        }
    }
    
    fadeIn(key, durationSeconds, targetVolume = null, soundIdToPlayOn = null) { // Renamed soundId to soundIdToPlayOn for clarity
        if (this.sounds[key]) {
            const finalVolume = targetVolume !== null ? targetVolume : (AUDIO_CONFIG.sounds[key]?.volume || 1.0);
            const durationMs = durationSeconds * 1000;
            // console.log(`[AM] FadeIn: ${key}, Duration: ${durationSeconds}s, TargetVol: ${finalVolume}, ID: ${soundIdToPlayOn || 'new/all'}`);
            
            // If a specific soundId is provided, operate on that. Otherwise, operate on the sound generally.
            const currentPlayingId = soundIdToPlayOn || (this.sounds[key].playing() ? true : null); // Need a way to get a general playing ID if not specified, or just check if *any* instance is playing. Howler's `playing()` without ID checks if *any* instance is playing.

            if (!this.sounds[key].playing(soundIdToPlayOn)) { 
                let idToFade;
                if (soundIdToPlayOn) { // This case is tricky if soundIdToPlayOn doesn't exist or isn't playing
                    console.warn(`[AudioManager FADEIN] Specified soundId ${soundIdToPlayOn} for ${key} is not playing. Attempting to play new instance.`);
                    idToFade = this.sounds[key].play(); // Play new instance
                    this.sounds[key].volume(0, idToFade); // Start it at 0
                } else {
                    idToFade = this.sounds[key].play(); // Play new instance if no specific ID and not playing
                    this.sounds[key].volume(0, idToFade); // Start it at 0
                }
                if(typeof idToFade === 'number') {
                    this.sounds[key].fade(0, finalVolume, durationMs, idToFade);
                }
                return idToFade; // Return the new ID
            } else { 
                 const currentVol = this.sounds[key].volume(undefined, soundIdToPlayOn); 
                 this.sounds[key].fade(currentVol, finalVolume, durationMs, soundIdToPlayOn);
                 return soundIdToPlayOn;
            }
        } else console.warn(`[AudioManager FADEIN] Sound key "${key}" not found.`);
        return null;
    }

    isPlaying(key, soundId = null) {
        if (this.sounds[key]) {
            return this.sounds[key].playing(soundId);
        }
        return false;
    }

    setVolume(key, volume, soundId = null) {
        if (this.sounds[key]) {
            // console.log(`[AM] SetVolume: ${key}, Volume: ${volume}, ID: ${soundId || 'all'}`);
            this.sounds[key].volume(volume, soundId);
        } else console.warn(`[AudioManager SETVOLUME] Sound key "${key}" not found.`);
    }

    getVolume(key, soundId = null) {
        if (this.sounds[key]) {
            return this.sounds[key].volume(undefined, soundId);
        }
        console.warn(`[AudioManager GETVOLUME] Sound key "${key}" not found.`);
        return 0;
    }

    toggleMute(mute) { // Assumes global mute for now
        // console.log(`[AM] Toggling global mute: ${mute}`);
        Howler.mute(mute);
    }

    playMusic(key) {
        if (!this.sounds[key] || !AUDIO_CONFIG.sounds[key]?.isMusic) {
            console.warn(`[AM Music] Music key "${key}" not found or not configured as music.`);
            return;
        }

        if (this.currentMusicKey === key && this.isPlaying(this.currentMusicKey, this.currentMusicId)) {
            // if (this.debug) console.log(`[AM Music] Music key "${key}" is already playing.`);
            return;
        }

        const crossfadeDuration = AUDIO_CONFIG.musicCrossfadeDuration;
        // console.log(`[AM Music] Playing music "${key}" with a ${crossfadeDuration}s crossfade.`);

        // Fade out the old music if it's playing
        if (this.currentMusicKey && this.currentMusicId && this.isPlaying(this.currentMusicKey, this.currentMusicId)) {
            // console.log(`[AM Music] Fading out old music: ${this.currentMusicKey}`);
            this.fadeOut(this.currentMusicKey, crossfadeDuration, this.currentMusicId);
        }

        // Play and fade in the new music
        const newMusicId = this.fadeIn(key, crossfadeDuration);
        if (newMusicId) {
            this.currentMusicKey = key;
            this.currentMusicId = newMusicId;
            // console.log(`[AM Music] Fading in new music: ${key} (ID: ${newMusicId})`);
        }
    }
}