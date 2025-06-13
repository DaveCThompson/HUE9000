/**
 * @module AudioManager
 * @description Manages all application audio using Howler.js.
 * It preloads sounds, handles playback for UI interactions and background music,
 * and responds to application state changes.
 */
import { Howl, Howler } from 'howler';
import { serviceLocator } from './serviceLocator.js';

// Import audio files - Vite will handle these paths
// Corrected to match screenshot filenames
import backgroundMusicUrl from '../assets/audio/background.mp3';
import dialLoopUrl from '../assets/audio/dial.mp3';
import buttonPressUrl from '../assets/audio/button-press.mp3';
import itemAppearUrl from '../assets/audio/itemAppear.mp3'; 
import terminalBootUrl from '../assets/audio/terminalBoot.mp3'; 
import lcdPowerOnUrl from '../assets/audio/lcdPowerOn.mp3'; 
import lensStartupUrl from '../assets/audio/lensStartup.mp3';
import powerOffUrl from '../assets/audio/off.mp3';
import buttonEnergizeUrl from '../assets/audio/buttonEnergize.mp3';
import themeEngageUrl from '../assets/audio/lights-on.mp3'; // Corrected: lights-on.mp3 for themeEngage
import auxModeChangeUrl from '../assets/audio/auxModeChange.mp3';


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

        this.activeLoops = {
            dial: null,
        };
        this.dialDragState = { A: false, B: false };

        const configModule = serviceLocator.get('config');
        this.config = configModule;

        if (configModule && configModule.AUDIO_CONFIG) {
            const audioConfigBase = configModule.AUDIO_CONFIG;
            const soundSettings = audioConfigBase.sounds;

            // Map conceptual keys to actual file URLs and settings
            this.sounds = {
                backgroundMusic: new Howl({ ...soundSettings.backgroundMusic, src: [backgroundMusicUrl] }),
                dialLoop: new Howl({ ...soundSettings.dialLoop, src: [dialLoopUrl] }),
                buttonPress: new Howl({ ...soundSettings.buttonPress, src: [buttonPressUrl] }),
                
                // Startup sequence sounds (using conceptual names)
                itemAppear: new Howl({ ...(soundSettings.itemAppear || soundSettings.flickerToDim), src: [itemAppearUrl] }),
                terminalBoot: new Howl({ ...(soundSettings.terminalBoot || soundSettings.terminalOn), src: [terminalBootUrl] }),
                lcdPowerOn: new Howl({ ...(soundSettings.lcdPowerOn || soundSettings.lcdOn), src: [lcdPowerOnUrl] }),
                lensStartup: new Howl({ ...(soundSettings.lensStartup), src: [lensStartupUrl] }),
                powerOff: new Howl({ ...(soundSettings.powerOff || soundSettings.off), src: [powerOffUrl] }),
                buttonEnergize: new Howl({ ...(soundSettings.buttonEnergize || soundSettings.bigOn), src: [buttonEnergizeUrl] }),
                themeEngage: new Howl({ ...(soundSettings.themeEngage || soundSettings.lightsOn), src: [themeEngageUrl] }),

                // Interactive sounds
                auxModeChange: new Howl({ ...(soundSettings.auxModeChange || soundSettings.buttonPress), src: [auxModeChangeUrl] })
            };
        } else {
            console.error('[AudioManager] AUDIO_CONFIG not found during construction. Sounds will not be loaded.');
        }
    }

    init() {
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
        const conceptualCooldownKey = soundKey; 
        const cooldown = cooldowns[conceptualCooldownKey];


        if (cooldown) {
            const lastPlayed = this.lastPlayedTimestamps[soundKey] || 0;
            if (now - lastPlayed < cooldown) {
                if (this.debug) console.log(`[AudioManager] Playback for '${soundKey}' throttled.`);
                return;
            }
        }

        const sound = this.sounds[soundKey];
        const soundConfigFromMain = this.config.AUDIO_CONFIG.sounds[soundKey] || 
                                    this.config.AUDIO_CONFIG.sounds[this._getOriginalKeyForConceptual(soundKey)];


        if (sound && this.isReady) {
            if (this.debug) console.log(`[AudioManager] Playing sound: '${soundKey}'`);
            const soundId = sound.play();
            this.lastPlayedTimestamps[soundKey] = now;

            if (soundKey === 'backgroundMusic') {
                 this.backgroundMusicStarted = true;
            }

            if (soundConfigFromMain && soundConfigFromMain.fadeOutDuration && soundId) {
                sound.fade(sound.volume(soundId), 0, soundConfigFromMain.fadeOutDuration, soundId);
            }
        } else if (this.debug) {
            const debugInfo = {
                soundKey,
                soundExists: !!sound,
                isManagerReady: this.isReady,
                soundState: sound ? sound.state() : 'N/A'
            };
            console.warn(`[AudioManager] Sound not found or not ready.`, debugInfo);
        }
    }
    
    _getOriginalKeyForConceptual(conceptualKey) {
        const map = {
            itemAppear: 'flickerToDim',
            terminalBoot: 'terminalOn',
            lcdPowerOn: 'lcdOn',
            buttonEnergize: 'bigOn',
            themeEngage: 'lightsOn', // This original key matches the corrected filename base
            powerOff: 'off',
        };
        return map[conceptualKey] || conceptualKey;
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
                    const originalSoundConfigKey = this._getOriginalKeyForConceptual(soundKey);
                    
                    let originalVolume = this.config.AUDIO_CONFIG.sounds[soundKey]?.volume;
                    if (typeof originalVolume !== 'number') {
                        originalVolume = this.config.AUDIO_CONFIG.sounds[originalSoundConfigKey]?.volume;
                    }
                     if (soundKey === 'auxModeChange' && typeof originalVolume !== 'number') {
                        originalVolume = this.config.AUDIO_CONFIG.sounds['buttonPress']?.volume; 
                    }


                    if (typeof originalVolume === 'number') {
                        this.sounds[soundKey].volume(originalVolume);
                    }
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
        if (!this.isReady) return;
    }

    handleDialUpdate({ id, state }) {
        if (!this.isReady || !this.appState || (id !== 'A' && id !== 'B')) return;

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