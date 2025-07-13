/**
 * @module config/preloader
 * @description Configuration constants for the application preloader.
 */

import logoSvgSrc from '../../assets/svgs/logo.svg';
import dialSvgSrc from '../../assets/svgs/dial.svg';
import grillTextureSrc from '../../assets/textures/metal-grill.png';

/**
 * @typedef {object} PreloaderAsset
 * @property {string} id - A unique identifier for the asset group.
 * @property {string} name - The display name for the asset group.
 * @property {string} type - The loading strategy ('fontsDocumentReady', 'fetch', 'audioManager').
 * @property {number} [timeout] - Timeout in ms for font loading.
 * @property {object[]} [assets] - Array of individual assets to load.
 * @property {string} loadingStatusWord - The simplified status word during loading.
 * @property {string} successMessage - The final success message for promise resolution (not for UI).
 * @property {string} timeoutMessage - The message to display on timeout.
 * @property {string} errorMessage - The message to display on error.
 * @property {string} streamOutputSuccess - The single word to display in the main output area on success.
 * @property {string} streamOutputError - The text to display in the main output area on error.
 */
export const PRELOADER_ASSETS = {
    fonts: { 
        id: 'systemFonts',
        name: 'SYS_FONTS',
        type: 'fontsDocumentReady', 
        timeout: 7000, 
        loadingStatusWord: '[ANALYZING...]',
        successMessage: '[SYS_FONTS: CACHE VALIDATED ✓]',
        timeoutMessage: '[SYS_FONTS: CACHE TIMEOUT X]',
        errorMessage: '[SYS_FONTS: LOAD FAILURE X]',
        streamOutputSuccess: 'VALIDATED',
        streamOutputError: 'ERROR',
    },
    graphics: {
        id: 'coreGraphics',
        name: 'GFX_PIPELINE',
        type: 'fetch', 
        assets: [ 
            { id: 'logoSvg', name: 'logo.svg', url: logoSvgSrc, type: 'fetch' }, 
            { id: 'dialSvg', name: 'dial.svg', url: dialSvgSrc, type: 'fetch' }, 
            { id: 'grillTexture', name: 'metal-grill.png', url: grillTextureSrc, type: 'fetchImage' } 
        ],
        loadingStatusWord: '[INITIALIZING...]',
        successMessage: '[GFX_PIPELINE: CORE ASSETS LOADED ✓]',
        errorMessage: '[GFX_PIPELINE: ASSET LOAD FAILURE X]', 
        streamOutputSuccess: 'LOADED',
        streamOutputError: 'CORRUPTED',
    },
    audio: { 
        id: 'coreAudio',
        name: 'AUDIO_IO_BUFFER',
        type: 'audioManager', 
        assets: [ 
            { id: 'buttonPressSfx', keyInAudioManager: 'buttonPress', name: 'button-press.mp3' },
        ],
        loadingStatusWord: '[SYNCHRONIZING...]',
        successMessage: '[AUDIO_IO_BUFFER: SYNC CONFIRMED ✓]',
        errorMessage: '[AUDIO_IO_BUFFER: SYNC FAILED X]',
        streamOutputSuccess: 'CONFIRMED',
        streamOutputError: 'DESYNC',
    }
};

/**
 * @typedef {object} PreloaderConfig
 * @property {number} streamCharScrollIntervalMs - Interval for scrolling random characters.
 * @property {string} randomCharSet - The set of characters to use for the random scroll.
 * @property {number} streamTextLength - The length of the random character stream.
 * @property {object} staggerDelayMs - Stagger delays for starting each stream.
 * @property {object} baseDurationMs - Base durations for each stream's loading animation.
 * @property {number} engageButtonAppearDelayMs - Delay before the engage button appears after loading.
 * @property {number} preloaderFadeOutDurationMs - Duration of the preloader fade-out.
 * @property {number} preloaderInitialFadeInDurationMs - Duration of the preloader initial fade-in.
 * @property {number} preloaderSoundFadeOutMs - Duration for fading out any preloader sounds.
 */
export const PRELOADER_CONFIG = {
    streamCharScrollIntervalMs: 75, 
    randomCharSet: '0123456789ABCDEF*/%?$#@!&<>()[]{}|-_+=:.',
    streamTextLength: 250, 
    staggerDelayMs: { 
        fonts: 50,
        graphics: 150,
        audio: 250
    },
    baseDurationMs: { 
        fonts: 700,
        graphics: 1000, 
        audio: 900    
    },
    engageButtonAppearDelayMs: 300, 
    preloaderFadeOutDurationMs: 500, 
    preloaderInitialFadeInDurationMs: 300,
    preloaderSoundFadeOutMs: 750, 
};