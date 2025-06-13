/**
 * @module AudioManager
 * @description Manages all application audio using Howler.js.
 * Ensures audio context is unlocked and handles loading, playback, and state events.
 */
import { Howl, Howler } from 'howler';
import { serviceLocator } from './serviceLocator.js';
import { EventEmitter } from './EventEmitter.js'; // Simple event emitter

export class AudioManager extends EventEmitter {
    constructor() {
        super(); // Call EventEmitter constructor
        this.config = null;
        this.sounds = {};
        this.isAudioUnlocked = false;
        this.isReadyState = false; // Tracks if AudioManager init is complete
        this.soundLoadStates = {}; // Tracks individual sound load states: 'loading', 'loaded', 'error'
        this.queuedPlayCalls = [];
        this.debug = true; // ENABLED for detailed sound logging
    }

    /**
     * Initializes AudioManager: sets config, global volume, loads sounds.
     * This is called BEFORE the preloader visual sequence typically starts.
     */
    init() {
        this.config = serviceLocator.get('config');
        if (!this.config || !this.config.AUDIO_CONFIG) {
            console.error('[AudioManager INIT] Audio config not found!');
            this.isReadyState = true; // Mark as ready but with errors
            return;
        }

        Howler.volume(this.config.AUDIO_CONFIG.masterVolume);
        this._loadAllSounds();
        this.isReadyState = true;
        if (this.debug) console.log('[AudioManager INIT] Initialized and loading sounds.');
    }

    postInitSubscribe() {
        // Example: appState.subscribe('someEvent', (payload) => this.handleSomeEvent(payload));
    }

    isReady() {
        return this.isReadyState;
    }

    _loadAllSounds() {
        const soundConfigs = this.config.AUDIO_CONFIG.sounds;
        for (const key in soundConfigs) {
            if (Object.prototype.hasOwnProperty.call(soundConfigs, key) && soundConfigs[key].src) {
                this.soundLoadStates[key] = 'loading';
                if (this.debug) console.log(`[AudioManager] Attempting to load sound: ${key}, src: ${soundConfigs[key].src}, html5: ${!!soundConfigs[key].html5}`);
                
                if (key === 'itemAppear') {
                    console.warn(`[A_LOAD_INIT P7_SOUND] itemAppear: Howl instance creation initiated. Time: ${performance.now().toFixed(2)}`);
                }
                if (key === 'lcdPowerOn') { // P6 logging for lcdPowerOn
                    console.warn(`[A_LOAD_INIT P6_SOUND_LCDPOWERON] lcdPowerOn: Howl instance creation initiated. Time: ${performance.now().toFixed(2)}`);
                }


                this.sounds[key] = new Howl({
                    src: [soundConfigs[key].src],
                    loop: soundConfigs[key].loop || false,
                    volume: soundConfigs[key].volume !== undefined ? soundConfigs[key].volume : 1.0,
                    html5: soundConfigs[key].html5 || false, 
                    onload: () => {
                        if (key === 'itemAppear') {
                            console.warn(`[A_LOAD_DONE P7_SOUND] itemAppear: LOADED and READY. Time: ${performance.now().toFixed(2)}`);
                        }
                        if (key === 'lcdPowerOn') { // P6 logging for lcdPowerOn
                            console.warn(`[A_LOAD_DONE P6_SOUND_LCDPOWERON] lcdPowerOn: LOADED and READY. Time: ${performance.now().toFixed(2)}`);
                        }
                        this.soundLoadStates[key] = 'loaded';
                        if (this.debug) console.log(`[AudioManager] Sound LOADED and READY: ${key}`);
                        this.emit('soundLoaded', key); 
                        this._processQueuedPlayCalls(key);
                    },
                    onloaderror: (id, err) => {
                        if (key === 'itemAppear') {
                            console.error(`[A_LOAD_ERR P7_SOUND] itemAppear: FAILED to load. Error: `, err, `Time: ${performance.now().toFixed(2)}`);
                        }
                        if (key === 'lcdPowerOn') { // P6 logging for lcdPowerOn
                            console.error(`[A_LOAD_ERR P6_SOUND_LCDPOWERON] lcdPowerOn: FAILED to load. Error: `, err, `Time: ${performance.now().toFixed(2)}`);
                        }
                        this.soundLoadStates[key] = 'error';
                        console.error(`[AudioManager] Error loading sound ${key}:`, err);
                        this.emit('soundLoadError', { key, error: err });
                    },
                    onplayerror: (id, err) => {
                        console.error(`[AudioManager] Error playing sound ${key} (id: ${id}):`, err);
                        this.unlockAudioContext(); 
                    },
                    onplay: (id) => { // Added id parameter
                        if (this.debug) console.log(`[AudioManager] Playing sound: ${key} (ID: ${id}, Current Volume: ${this.sounds[key].volume(id)})`);
                    },
                    onstop: (id) => { // Added id parameter
                        if (this.debug) console.log(`[AudioManager] Stopped sound: ${key} (ID: ${id})`);
                    },
                    onfade: (id) => { // Added id parameter
                        if (this.debug) console.log(`[AudioManager] Fade complete for sound: ${key} (ID: ${id})`);
                    }
                });
            } else {
                 console.warn(`[AudioManager] Sound config for "${key}" is missing 'src'. Skipping.`);
            }
        }
    }

    _processQueuedPlayCalls(soundKey) {
        if (this.debug && this.queuedPlayCalls.some(call => call.key === soundKey)) {
            console.log(`[AudioManager] Processing queued play calls for just loaded sound: ${soundKey}`);
        }
        this.queuedPlayCalls = this.queuedPlayCalls.filter(call => {
            if (call.key === soundKey) {
                if (this.debug) console.log(`[AudioManager] Executing queued play for: ${soundKey}`);
                if (call.key === 'itemAppear') {
                    console.warn(`[A_QUEUE_PROC P7_SOUND] itemAppear: Processing queued play call. App Time: ${performance.now().toFixed(2)}`);
                }
                if (call.key === 'lcdPowerOn') { // P6 logging
                    console.warn(`[A_QUEUE_PROC P6_SOUND_LCDPOWERON] lcdPowerOn: Processing queued play call. App Time: ${performance.now().toFixed(2)}`);
                }
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
            if (this.debug && Howler.ctx && Howler.ctx.state !== 'suspended' && !this.isAudioUnlocked) {
                // console.log('[AudioManager] AudioContext already running, marking as unlocked.');
                this.isAudioUnlocked = true;
            }
            return;
        }
        if (this.debug) console.log('[AudioManager] Attempting to unlock AudioContext...');
        Howler.ctx.resume().then(() => {
            this.isAudioUnlocked = true;
            if (this.debug) console.log('[AudioManager] AudioContext resumed successfully.');
        }).catch(e => console.error('[AudioManager] Error resuming AudioContext:', e));
    }

    play(key, forceRestart = false, specificVolume = null) {
        // P7 itemAppear logging
        if (key === 'itemAppear') {
            const loadState = this.soundLoadStates[key] || 'UNKNOWN';
            const isQueued = this.queuedPlayCalls.some(call => call.key === key);
            console.warn(`[A_PLAY_ATTEMPT P7_SOUND] itemAppear: Play called. LoadState: ${loadState}. IsAlreadyQueued: ${isQueued}. App Time: ${performance.now().toFixed(2)}`);
        }
        // P6 lcdPowerOn logging
        if (key === 'lcdPowerOn') {
            const loadState = this.soundLoadStates[key] || 'UNKNOWN';
            const isQueued = this.queuedPlayCalls.some(call => call.key === key);
            console.warn(`[A_PLAY_ATTEMPT P6_SOUND_LCDPOWERON] lcdPowerOn: Play called. LoadState: ${loadState}. IsAlreadyQueued: ${isQueued}. App Time: ${performance.now().toFixed(2)}`);
        }

        this.unlockAudioContext(); 

        if (!this.sounds[key]) {
            console.warn(`[AudioManager PLAY] Sound key "${key}" not found.`);
            return null;
        }

        if (this.debug) {
            console.log(`[AudioManager PLAY Attempt] Key: '${key}', LoadState: ${this.soundLoadStates[key]}, ForceRestart: ${forceRestart}, Volume: ${specificVolume === null ? 'default' : specificVolume}`);
        }

        if (this.soundLoadStates[key] === 'loading') {
            if (key === 'itemAppear') {
                console.warn(`[A_PLAY_QUEUE P7_SOUND] itemAppear: Queuing play because LoadState is 'loading'. App Time: ${performance.now().toFixed(2)}`);
            }
            if (key === 'lcdPowerOn') { // P6 logging
                console.warn(`[A_PLAY_QUEUE P6_SOUND_LCDPOWERON] lcdPowerOn: Queuing play because LoadState is 'loading'. App Time: ${performance.now().toFixed(2)}`);
            }
            if (!this.queuedPlayCalls.find(call => call.key === key && call.forceRestart === forceRestart && call.specificVolume === specificVolume)) {
                 if (this.debug) console.log(`[AudioManager PLAY] Sound "${key}" is still loading. Queuing play call.`);
                 this.queuedPlayCalls.push({ key, forceRestart, specificVolume });
            } else {
                if (this.debug) console.log(`[AudioManager PLAY] Sound "${key}" is loading, identical play call already queued.`);
            }
            return null;
        }
        if (this.soundLoadStates[key] === 'error') {
            console.error(`[AudioManager PLAY] Cannot play sound "${key}", it failed to load.`);
            return null;
        }

        if (forceRestart && this.sounds[key].playing()) {
            if (this.debug) console.log(`[AudioManager PLAY] Force stopping sound "${key}" before replay.`);
            this.sounds[key].stop();
        }

        if (!this.sounds[key].playing() || forceRestart) {
            if (key === 'itemAppear') {
                console.warn(`[A_HOWLER_PLAY P7_SOUND] itemAppear: Calling Howler's .play(). App Time: ${performance.now().toFixed(2)}`);
            }
             if (key === 'lcdPowerOn') { // P6 logging
                console.warn(`[A_HOWLER_PLAY P6_SOUND_LCDPOWERON] lcdPowerOn: Calling Howler's .play(). App Time: ${performance.now().toFixed(2)}`);
            }
            const soundId = this.sounds[key].play();
            // Check if play returned a valid ID (it might not if context is locked, etc.)
            if (typeof soundId === 'number') {
                if (specificVolume !== null && typeof specificVolume === 'number') {
                    this.sounds[key].volume(specificVolume, soundId);
                    if (this.debug) console.log(`[AudioManager PLAY] Setting specific volume ${specificVolume} for "${key}" (ID: ${soundId})`);
                } else {
                    const defaultConfigVolume = this.config.AUDIO_CONFIG.sounds[key]?.volume;
                    if (defaultConfigVolume !== undefined) {
                        this.sounds[key].volume(defaultConfigVolume, soundId);
                    }
                }
            } else {
                 if (this.debug) console.warn(`[AudioManager PLAY] Howler.play did not return a soundId for "${key}". Audio might be locked or another issue occurred.`);
            }
            return soundId;
        }
        if (this.debug) console.log(`[AudioManager PLAY] Sound "${key}" is already playing and forceRestart is false. No action taken.`);
        return null; 
    }

    stop(key, soundId = null) {
        if (this.sounds[key]) {
            if (this.debug) console.log(`[AudioManager STOP] Sound: ${key}, ID: ${soundId || 'all'}`);
            if (soundId) this.sounds[key].stop(soundId);
            else this.sounds[key].stop();
        } else console.warn(`[AudioManager STOP] Sound key "${key}" not found.`);
    }

    fadeOut(key, durationSeconds, soundId = null) {
        if (this.sounds[key] && this.sounds[key].playing(soundId)) {
            if (this.debug) console.log(`[AudioManager FADEOUT] Sound: ${key}, Duration: ${durationSeconds}s, ID: ${soundId || 'all'}`);
            const targetVolume = 0; 
            const durationMs = durationSeconds * 1000;
            if (soundId) this.sounds[key].fade(this.sounds[key].volume(undefined, soundId), targetVolume, durationMs, soundId);
            else this.sounds[key].fade(this.sounds[key].volume(), targetVolume, durationMs);
        } else if (this.debug && this.sounds[key]) {
             console.log(`[AudioManager FADEOUT] Sound "${key}" not playing or not found, cannot fadeOut.`);
        }
    }
    
    fadeIn(key, durationSeconds, targetVolume = null, soundIdToPlayOn = null) { // Renamed soundId to soundIdToPlayOn for clarity
        if (this.sounds[key]) {
            const finalVolume = targetVolume !== null ? targetVolume : (this.config.AUDIO_CONFIG.sounds[key]?.volume || 1.0);
            const durationMs = durationSeconds * 1000;
            if (this.debug) console.log(`[AudioManager FADEIN] Sound: ${key}, Duration: ${durationSeconds}s, TargetVol: ${finalVolume}, ID: ${soundIdToPlayOn || 'new/all'}`);
            
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
            } else { 
                 const currentVol = this.sounds[key].volume(undefined, soundIdToPlayOn); 
                 this.sounds[key].fade(currentVol, finalVolume, durationMs, soundIdToPlayOn);
            }
        } else console.warn(`[AudioManager FADEIN] Sound key "${key}" not found.`);
    }

    isPlaying(key, soundId = null) {
        if (this.sounds[key]) {
            return this.sounds[key].playing(soundId);
        }
        return false;
    }

    setVolume(key, volume, soundId = null) {
        if (this.sounds[key]) {
            if (this.debug) console.log(`[AudioManager SETVOLUME] Sound: ${key}, Volume: ${volume}, ID: ${soundId || 'all'}`);
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
        if (this.debug) console.log(`[AudioManager] Toggling global mute: ${mute}`);
        Howler.mute(mute);
    }
}