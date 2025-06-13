/**
 * @module preloader
 * @description Handles the "Preloader V2 Enhanced" sequence.
 */
import { serviceLocator } from './serviceLocator.js';
import { PRELOADER_ASSETS, PRELOADER_CONFIG } from './config.js';

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
    
    body.classList.remove('pre-boot');
    gsap.to(preloaderRoot, { opacity: 1, duration: PRELOADER_CONFIG.preloaderInitialFadeInDurationMs / 1000, onComplete: () => {
        preloaderRoot.classList.add('is-visible');
    }});

    return new Promise(async (resolveMainPreloaderPromise) => {
        let successfulStreams = 0;
        const totalStreams = 3; 
        const streamIntervals = {};
        let criticalErrorOccurred = false;
        // preloaderSoundPlayed flag is removed, as we won't autoplay the sound.

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
                statusEl.textContent = assetConf.initialStatus;
                // DO NOT AUTOPLAY SOUND HERE to avoid browser restrictions
                streamIntervals[streamId] = setInterval(() => {
                    if (contentEl) contentEl.textContent = generateRandomChars(PRELOADER_CONFIG.streamTextLength);
                }, PRELOADER_CONFIG.streamCharScrollIntervalMs);
            } else {
                clearInterval(streamIntervals[streamId]);
                streamEl.classList.remove('is-active', 'is-inactive');
                streamEl.classList.add(isSuccess ? 'is-verified' : 'is-error');
                if(contentEl) contentEl.textContent = isSuccess ? assetConf.streamOutputSuccess : assetConf.streamOutputError;
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
                // No sound to stop here as we are not autoplaying
                return; 
            }

            if (successfulStreams === totalStreams) {
                 setTimeout(() => {
                    engageButton.disabled = false;
                    engageButton.classList.add('is-energized');
                    engageButtonContainer.classList.add('is-visible');
                    // No sound to fade out here
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
                            // This case should ideally be caught before calling loadStream for audio
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
                                // Timeout for individual sound loading
                                setTimeout(() => { 
                                    unsub(); 
                                    // Check again, as load might have just completed
                                    if (!audioManager.isSoundLoaded(audioAsset.keyInAudioManager)) {
                                        rejAsset(new Error(`Timeout loading ${audioAsset.name}`)); 
                                    } else {
                                        resAsset(audioAsset.name); // Loaded just in time
                                    }
                                }, 15000); 
                            });
                        });
                        try {
                            await Promise.all(audioPromises);
                            // Sound is loaded, but DO NOT play it here.
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
        
        updateOverallProgress();

        loadStream('fonts', PRELOADER_ASSETS.fonts, PRELOADER_CONFIG.staggerDelayMs.fonts, PRELOADER_CONFIG.baseDurationMs.fonts);
        loadStream('graphics', PRELOADER_ASSETS.graphics, PRELOADER_CONFIG.staggerDelayMs.graphics, PRELOADER_CONFIG.baseDurationMs.graphics);
        
        if (audioManager && audioManager.isReady()) {
            loadStream('audio', PRELOADER_ASSETS.audio, PRELOADER_CONFIG.staggerDelayMs.audio, PRELOADER_CONFIG.baseDurationMs.audio);
        } else {
            console.error("AudioManager not ready during preloader init, cannot load audio stream.");
            criticalErrorOccurred = true;
            // Ensure streamAudio element exists before trying to update it
            if(streamAudio) {
                updateStreamVisuals(streamAudio, 'audio', PRELOADER_ASSETS.audio, false, false, PRELOADER_ASSETS.audio.errorMessage);
            }
            updateOverallProgress();
        }

        engageButton.addEventListener('click', () => {
            if (engageButton.disabled || criticalErrorOccurred) return;
            
            audioManager.unlockAudioContext(); // Crucial for subsequent sounds
            // No preloader sound to stop or fade here
            
            preloaderRoot.classList.add('is-hiding');
            preloaderRoot.classList.remove('is-visible');

            setTimeout(() => {
                preloaderRoot.style.display = 'none';
                resolveMainPreloaderPromise();
            }, PRELOADER_CONFIG.preloaderFadeOutDurationMs);
        }, { once: true });
    });
}