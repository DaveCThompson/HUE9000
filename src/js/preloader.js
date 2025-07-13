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
    
    // --- Segmented Progress Bar Setup ---
    const NUM_SEGMENTS = 40;
    const progressBarContainer = overallProgressBar;
    const segments = [];
    if (progressBarContainer) {
        progressBarContainer.innerHTML = ''; // Clear existing content
        for (let i = 0; i < NUM_SEGMENTS; i++) {
            const segment = document.createElement('div');
            segment.className = 'preloader-bar-segment';
            progressBarContainer.appendChild(segment);
            segments.push(segment);
        }
    }
    
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
        
        const progressProxy = { value: 0 };
        let activeTween = null;

        const updateUiFromProxy = () => {
            const currentPercentage = Math.floor(progressProxy.value);
            overallProgressPercentage.textContent = `${currentPercentage}%`;

            const segmentsToFill = Math.round((progressProxy.value / 100) * NUM_SEGMENTS);
            segments.forEach((segment, index) => {
                segment.classList.toggle('is-filled', index < segmentsToFill);
            });
        };

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
                if (statusEl) statusEl.textContent = assetConf.loadingStatusWord;
                streamIntervals[streamId] = setInterval(() => {
                    if (contentEl) contentEl.textContent = generateRandomChars(PRELOADER_CONFIG.streamTextLength);
                }, PRELOADER_CONFIG.streamCharScrollIntervalMs);
            } else {
                clearInterval(streamIntervals[streamId]);
                if (isSuccess) {
                    streamEl.classList.add('is-verified');
                    if (contentEl) contentEl.textContent = assetConf.streamOutputSuccess;
                    if (statusEl) statusEl.textContent = ''; // Clear status on success
                } else {
                    streamEl.classList.remove('is-active', 'is-inactive');
                    streamEl.classList.add('is-error');
                    if (contentEl) contentEl.textContent = assetConf.streamOutputError;
                    if (statusEl) statusEl.textContent = message; // Show error message
                }
            }
        };
        
        const checkCompletion = () => {
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

                    // --- UPDATED: Activate SYNCHRONIZED idle light drift ---
                    engageButton.classList.add('css-idle-drifting');
                    const lights = engageButton.querySelectorAll('.light');
                    lights.forEach((light) => {
                        light.style.setProperty('--light-idle-base-opacity', '0.45');
                        light.style.setProperty('--light-idle-variation', '0.2');
                        light.style.setProperty('--light-idle-duration', '2.5s'); // Use a fixed duration for all
                        light.style.setProperty('--light-idle-delay', '0s');      // Use zero delay for all
                    });
                    // --- END OF UPDATE ---

                 }, PRELOADER_CONFIG.engageButtonAppearDelayMs);
            }
        };

        const loadStream = async (streamId, assetConfig, streamIndex, delay, baseDuration) => {
            const streamEl = preloaderDomElements[`stream${streamId.charAt(0).toUpperCase() + streamId.slice(1)}`];
            if (!streamEl) {
                console.error(`Preloader DOM element for stream "${streamId}" not found.`);
                criticalErrorOccurred = true;
                checkCompletion();
                return;
            }
            await new Promise(res => setTimeout(res, delay));
            updateStreamVisuals(streamEl, streamId, assetConfig, true);
            
            const targetProgress = ((streamIndex + 1) / totalStreams) * 100;
            
            if (activeTween) activeTween.kill();
            activeTween = gsap.to(progressProxy, {
                value: targetProgress,
                duration: baseDuration / 1000,
                ease: 'power1.out',
                onUpdate: updateUiFromProxy,
            });

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
                if (activeTween) activeTween.kill();
                console.error(`Error loading stream ${streamId}:`, error.message || error);
                criticalErrorOccurred = true; 
                updateStreamVisuals(streamEl, streamId, assetConfig, false, false, error.message || assetConfig.errorMessage);
            }
            checkCompletion();
        };
        
        updateUiFromProxy(); // Set initial 0% state
        
        const streamsToLoad = [
            { id: 'fonts', config: PRELOADER_ASSETS.fonts },
            { id: 'graphics', config: PRELOADER_ASSETS.graphics },
            { id: 'audio', config: PRELOADER_ASSETS.audio }
        ];

        streamsToLoad.forEach((stream, index) => {
            const { id, config } = stream;
            if (id === 'audio' && (!audioManager || !audioManager.isReady())) {
                console.error("AudioManager not ready during preloader init, cannot load audio stream.");
                if (activeTween) activeTween.kill();
                criticalErrorOccurred = true;
                if (streamAudio) {
                    updateStreamVisuals(streamAudio, 'audio', config, false, false, config.errorMessage);
                }
                checkCompletion();
            } else {
                loadStream(id, config, index, PRELOADER_CONFIG.staggerDelayMs[id], PRELOADER_CONFIG.baseDurationMs[id]);
            }
        });

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
                    body.classList.add('post-preload-hiding');
                    body.classList.remove('preloader-active');
                    resolveMainPreloaderPromise();
                }
            });
        }, { once: true });
    });
}