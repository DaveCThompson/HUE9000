/**
 * @module preloader
 * @description Handles the "Preloader V2 Enhanced" sequence.
 */
import { serviceLocator } from './serviceLocator.js';
import { PRELOADER_ASSETS, PRELOADER_CONFIG } from './config/index.js';

// Helper function to fetch assets (text-based like SVG, or image)
async function fetchAsset(assetConfig) {
    try {
        const response = await fetch(assetConfig.url); // Vite provides correct URL via import
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status} for ${assetConfig.name}`);
        }
        if (assetConfig.type === 'fetchImage') {
            const blob = await response.blob();
            return new Promise((resolve, reject) => {
                const img = new Image();
                img.onload = () => { URL.revokeObjectURL(img.src); resolve(assetConfig.name); };
                img.onerror = (errEvent) => { 
                    URL.revokeObjectURL(img.src); 
                    console.error(`Image.onerror for ${assetConfig.name}:`, errEvent);
                    reject(new Error(`Image load error for ${assetConfig.name}`));
                };
                img.src = URL.createObjectURL(blob);
            });
        }
        // For SVGs (type: 'fetch'), we expect text content
        const textContent = await response.text(); 
        if (!textContent.trim().startsWith('<svg')) { // Basic validation for SVGs
            // console.warn(`Fetched content for ${assetConfig.name} does not look like an SVG.`);
        }
        return assetConfig.name; 
    } catch (error) {
        console.error(`Failed to load asset ${assetConfig.name}:`, error);
        throw error; 
    }
}


/**
 * Runs the "Preloader V2 Enhanced" sequence.
 * @param {object} preloaderDomElements - DOM elements specific to the preloader.
 * @param {object} gsap - The GSAP instance.
 * @returns {Promise<void>} A promise that resolves when the user clicks "Engage".
 */
export function runPreloader(preloaderDomElements, gsap) {
    const {
        body,
        preloaderRoot, 
        streamFonts, streamGraphics, streamAudio,
        overallProgressPercentage, overallProgressBar,
        engageButton, engageButtonContainer, criticalErrorMessageElement
    } = preloaderDomElements;

    const audioManager = serviceLocator.get('audioManager');
    
    // Add the isolation class
    body.classList.add('preloader-active');
    
    body.classList.remove('pre-boot');
    gsap.to(preloaderRoot, { opacity: 1, duration: PRELOADER_CONFIG.preloaderInitialFadeInDurationMs / 1000, onComplete: () => {
        preloaderRoot.classList.add('is-visible');
    }});

    return new Promise(async (resolveMainPreloaderPromise) => {
        let successfulStreams = 0;
        const totalStreams = 3; 
        const streamIntervals = {};
        let criticalErrorOccurred = false;

        const generateRandomChars = (length) => {
            const chars = PRELOADER_CONFIG.randomCharSet;
            let result = '';
            for (let i = 0; i < length; i++) {
                result += chars[Math.floor(Math.random() * chars.length)];
            }
            const lines = Math.floor(length / (PRELOADER_CONFIG.streamTextLength / 5)); 
            for (let i = 0; i < lines; i++) {
                if (result.length < 2) continue;
                const insertPos = Math.floor(Math.random() * (result.length -1));
                result = result.slice(0, insertPos) + '\n' + result.slice(insertPos);
            }
            return result.slice(0, length);
        };

        const updateStreamVisuals = (streamEl, streamId, assetConf, isActive, isSuccess, message) => {
            const contentEl = streamEl.querySelector('.preloader-stream-output-text');
            const statusEl = streamEl.querySelector('.preloader-stream-status');

            if (isActive) {
                streamEl.classList.remove('is-inactive');
                streamEl.classList.add('is-active');
                if (statusEl) statusEl.textContent = assetConf.initialStatus;
                streamIntervals[streamId] = setInterval(() => {
                    if (contentEl) contentEl.textContent = generateRandomChars(PRELOADER_CONFIG.streamTextLength);
                }, PRELOADER_CONFIG.streamCharScrollIntervalMs);
            } else {
                clearInterval(streamIntervals[streamId]);
                streamEl.classList.remove('is-active', 'is-inactive');
                streamEl.classList.add(isSuccess ? 'is-verified' : 'is-error');
                if(contentEl) {
                    // Use shortened success message from config
                    const successText = isSuccess ? PRELOADER_ASSETS[streamId].streamOutputSuccess : assetConf.streamOutputError;
                    contentEl.textContent = successText;
                }
                if(statusEl) statusEl.textContent = message;
            }
        };
        
        const updateOverallProgress = () => {
            const percentage = Math.round((successfulStreams / totalStreams) * 100);
            overallProgressPercentage.textContent = `${percentage}%`;
            overallProgressBar.style.width = `${percentage}%`;

            if (criticalErrorOccurred) {
                engageButton.disabled = true;
                engageButtonContainer.classList.remove('is-visible');
                gsap.to(criticalErrorMessageElement, { autoAlpha: 1, duration: 0.3 });
                return; 
            }

            if (successfulStreams === totalStreams) {
                 setTimeout(() => {
                    engageButton.disabled = false;
                    engageButton.classList.add('is-energized');
                    engageButtonContainer.classList.add('is-visible');
                 }, PRELOADER_CONFIG.engageButtonAppearDelayMs);
            }
        };

        const loadStream = async (streamId, assetConfig, delay, baseDuration) => {
            const streamEl = preloaderDomElements[`stream${streamId.charAt(0).toUpperCase() + streamId.slice(1)}`];
            if (!streamEl) {
                console.error(`Preloader DOM element for stream "${streamId}" not found.`);
                criticalErrorOccurred = true;
                updateOverallProgress();
                return;
            }
            await new Promise(res => setTimeout(res, delay));
            updateStreamVisuals(streamEl, streamId, assetConfig, true);

            let loadPromise;
            const startTime = Date.now();

            switch (assetConfig.type) {
                case 'fontsDocumentReady':
                    loadPromise = Promise.race([
                        document.fonts.ready,
                        new Promise((_, reject) => setTimeout(() => reject(new Error('Fonts timeout')), assetConfig.timeout))
                    ]).then(() => {
                        const duration = Date.now() - startTime;
                        return new Promise(res => setTimeout(res, Math.max(0, baseDuration - duration)));
                    }).then(() => assetConfig.successMessage)
                    .catch(err => {
                        console.warn(err.message.includes('timeout') ? assetConfig.timeoutMessage : assetConfig.errorMessage, err);
                        throw new Error(err.message.includes('timeout') ? assetConfig.timeoutMessage : assetConfig.errorMessage);
                    });
                    break;
                case 'fetch': 
                    loadPromise = Promise.all(assetConfig.assets.map(asset => fetchAsset(asset)))
                        .then(() => {
                            const duration = Date.now() - startTime;
                            return new Promise(res => setTimeout(res, Math.max(0, baseDuration - duration)));
                        })
                        .then(() => assetConfig.successMessage);
                    break;
                case 'audioManager': 
                    loadPromise = new Promise(async (resolveAudio, rejectAudio) => {
                        if (!audioManager || !audioManager.isReady()) {
                            return rejectAudio(new Error("AudioManager not ready for audio stream."));
                        }
                        const audioPromises = assetConfig.assets.map(audioAsset => {
                            return new Promise((resAsset, rejAsset) => {
                                if (audioManager.isSoundLoaded(audioAsset.keyInAudioManager)) {
                                    resAsset(audioAsset.name); return;
                                }
                                const unsub = audioManager.subscribeToSoundLoad(audioAsset.keyInAudioManager, (loadedKey) => {
                                    if (loadedKey === audioAsset.keyInAudioManager) { unsub(); resAsset(audioAsset.name); }
                                });
                                setTimeout(() => { 
                                    unsub(); 
                                    if (!audioManager.isSoundLoaded(audioAsset.keyInAudioManager)) {
                                        rejAsset(new Error(`Timeout loading ${audioAsset.name}`)); 
                                    } else {
                                        resAsset(audioAsset.name);
                                    }
                                }, 15000); 
                            });
                        });
                        try {
                            await Promise.all(audioPromises);
                            const duration = Date.now() - startTime;
                            setTimeout(() => resolveAudio(assetConfig.successMessage), Math.max(0, baseDuration - duration));
                        } catch (audioError) { rejectAudio(audioError); }
                    });
                    break;
                default:
                    loadPromise = Promise.reject(new Error(`Unknown asset type for ${streamId}`));
            }
            
            try {
                const successMsg = await loadPromise;
                successfulStreams++;
                updateStreamVisuals(streamEl, streamId, assetConfig, false, true, successMsg);
            } catch (error) {
                console.error(`Error loading stream ${streamId}:`, error.message || error);
                criticalErrorOccurred = true; 
                updateStreamVisuals(streamEl, streamId, assetConfig, false, false, error.message || assetConfig.errorMessage || '[LOAD_ERROR]');
            }
            updateOverallProgress();
        };
        
        // Shorten the success messages in the config object before starting
        PRELOADER_ASSETS.fonts.streamOutputSuccess = '[SYS_FONTS: CACHE VALIDATED ✓]';
        PRELOADER_ASSETS.graphics.streamOutputSuccess = '[GFX_PIPELINE: ASSETS LOADED ✓]';
        PRELOADER_ASSETS.audio.streamOutputSuccess = '[AUDIO_IO: SYNC CONFIRMED ✓]';

        updateOverallProgress();

        loadStream('fonts', PRELOADER_ASSETS.fonts, PRELOADER_CONFIG.staggerDelayMs.fonts, PRELOADER_CONFIG.baseDurationMs.fonts);
        loadStream('graphics', PRELOADER_ASSETS.graphics, PRELOADER_CONFIG.staggerDelayMs.graphics, PRELOADER_CONFIG.baseDurationMs.graphics);
        
        if (audioManager && audioManager.isReady()) {
            loadStream('audio', PRELOADER_ASSETS.audio, PRELOADER_CONFIG.staggerDelayMs.audio, PRELOADER_CONFIG.baseDurationMs.audio);
        } else {
            console.error("AudioManager not ready during preloader init, cannot load audio stream.");
            criticalErrorOccurred = true;
            if(streamAudio) {
                updateStreamVisuals(streamAudio, 'audio', PRELOADER_ASSETS.audio, false, false, PRELOADER_ASSETS.audio.errorMessage);
            }
            updateOverallProgress();
        }

        engageButton.addEventListener('click', () => {
            if (engageButton.disabled || criticalErrorOccurred) return;
            
            audioManager.unlockAudioContext();
            
            preloaderRoot.classList.add('is-hiding');
            preloaderRoot.classList.remove('is-visible');

            gsap.to(preloaderRoot, {
                opacity: 0,
                duration: PRELOADER_CONFIG.preloaderFadeOutDurationMs / 1000,
                onComplete: () => {
                    preloaderRoot.style.display = 'none';
                    // FIX: Add the "bridge" class to hide the terminal before handing off to main.js
                    body.classList.add('post-preload-hiding');
                    body.classList.remove('preloader-active');
                    resolveMainPreloaderPromise();
                }
            });
        }, { once: true });
    });
}