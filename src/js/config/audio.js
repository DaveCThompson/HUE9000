/**
 * @module config/audio
 * @description Configuration constants for the AudioManager, including all sound
 * sources and playback settings.
 */

// Asset Imports (Vite will handle these paths)
import backgroundMusicDimSrc from '../../assets/audio/bg-dim.mp3';
import backgroundMusicLightSrc from '../../assets/audio/bg-light.mp3';
import backgroundMusicResistiveSrc from '../../assets/audio/bg-resistive.mp3';
import dialLoopSrc from '../../assets/audio/dial.mp3';
import buttonPressSrc from '../../assets/audio/button-press.mp3';
import itemAppearSrc from '../../assets/audio/itemAppear.mp3'; 
import terminalBootSrc from '../../assets/audio/terminalBoot.mp3'; 
import lcdPowerOnSrc from '../../assets/audio/lcdPowerOn.mp3';   
import lensStartupSrc from '../../assets/audio/lensStartup.mp3'; 
import powerOff1Src from '../../assets/audio/off1.mp3';          
import powerOff2Src from '../../assets/audio/off2.mp3';          
import powerOff3Src from '../../assets/audio/off3.mp3';          
import buttonEnergizeSrc from '../../assets/audio/buttonEnergize.mp3'; 
import themeEngageSrc from '../../assets/audio/lights-on.mp3'; 
import auxModeLowSrc from '../../assets/audio/auxModeLow.mp3';
import auxModeHighSrc from '../../assets/audio/auxModeHigh.mp3';
import powerDownSrc from '../../assets/audio/powerDown.mp3';

/**
 * @typedef {object} SoundConfig
 * @property {string} src - The imported source of the audio file.
 * @property {boolean} loop - Whether the sound should loop.
 * @property {number} volume - The default playback volume (0.0 to 1.0).
 * @property {boolean} html5 - If true, forces HTML5 Audio. Useful for streaming large files like music.
 * @property {boolean} [isMusic] - Marks the sound as background music for crossfading.
 * @property {number} [fadeOutDuration] - Optional fade-out duration for specific sounds.
 */

/**
 * @typedef {object} AudioConfig
 * @property {number} masterVolume - The global master volume for all sounds.
 * @property {number} musicCrossfadeDuration - The duration in seconds for crossfading between music tracks.
 * @property {object.<string, number>} soundCooldowns - Cooldowns in milliseconds for frequently triggered sounds.
 * @property {object.<string, SoundConfig>} sounds - Configuration for each individual sound.
 */
export const AUDIO_CONFIG = {
  masterVolume: 1.0, 
  musicCrossfadeDuration: 2.5,
  soundCooldowns: {
    itemAppear: 250,      
    terminalBoot: 4000,   
    lcdPowerOn: 6000,     
  },
  sounds: { 
    bgDim:           { src: backgroundMusicDimSrc, loop: true, volume: 0.35, html5: true, isMusic: true },
    bgLight:         { src: backgroundMusicLightSrc, loop: true, volume: 0.45, html5: true, isMusic: true },
    bgResistive:     { src: backgroundMusicResistiveSrc, loop: true, volume: 0.40, html5: true, isMusic: true },
    dialLoop:        { src: dialLoopSrc, loop: true, volume: 0.35, html5: false },
    buttonPress:     { src: buttonPressSrc,loop: false, volume: 0.8, html5: false },
    itemAppear:      { src: itemAppearSrc, loop: false, volume: 0.6, html5: false },
    terminalBoot:    { src: terminalBootSrc, loop: false, volume: 0.9, fadeOutDuration: 4000, html5: false },
    lcdPowerOn:      { src: lcdPowerOnSrc, loop: false, volume: 0.8, fadeOutDuration: 6000, html5: false },
    lensStartup:     { src: lensStartupSrc, loop: false, volume: 0.9, html5: false },       
    powerOff1:       { src: powerOff1Src, loop: false, volume: 1.0, html5: false },
    powerOff2:       { src: powerOff2Src, loop: false, volume: 1.0, html5: false },
    powerOff3:       { src: powerOff3Src, loop: false, volume: 1.0, html5: false },
    buttonEnergize:  { src: buttonEnergizeSrc, loop: false, volume: 0.2, html5: false }, 
    themeEngage:     { src: themeEngageSrc, loop: false, volume: 0.9, html5: false },
    auxModeLow:      { src: auxModeLowSrc, loop: false, volume: 0.7, html5: false },
    auxModeHigh:     { src: auxModeHighSrc, loop: false, volume: 0.7, html5: false },
    powerDown:       { src: powerDownSrc, loop: false, volume: 0.9, html5: false },
  },
};