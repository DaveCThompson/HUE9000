/**
 * @module preloader
 * @description Handles the thematic "cold boot" preloader sequence.
 */
import { serviceLocator } from './serviceLocator.js';
import dialSvgUrl from '../assets/svgs/dial.svg'; // Vite will handle this path
import logoSvgUrl from '../assets/svgs/logo.svg'; // Vite will handle this path

/**
 * Runs the preloader sequence, handling asset loading and user interaction.
 * @param {object} dom - A reference to the domElements object from main.js.
 * @param {object} gsap - The GSAP instance.
 * @returns {Promise<void>} A promise that resolves when the user clicks the engage button.
 */
export function runPreloader(dom, gsap) {
    dom.body.classList.remove('pre-boot');
    gsap.to(dom.body, { opacity: 1, duration: 0.3 });

    return new Promise(async (resolve) => {
        const { preloader, bootSeqList, engageButton, engageButtonContainer, progressBar } = dom;
        const checks = Array.from(bootSeqList.querySelectorAll('li[data-check]'));
        const typingDelayMs = 60;
        const checkDelayMs = 200;
        const audioManager = serviceLocator.get('audioManager');

        const typeLine = async (checkElement) => {
            checkElement.classList.add('visible');
            const text = checkElement.textContent;
            checkElement.innerHTML = '> <span class="text"></span><span class="cursor">_</span>';
            const textSpan = checkElement.querySelector('.text');
            const cursorSpan = checkElement.querySelector('.cursor');

            gsap.to(cursorSpan, { opacity: 0, repeat: -1, yoyo: true, duration: 0.4, ease: 'steps(1)' });

            await gsap.to(textSpan, {
                duration: text.length * (typingDelayMs / 1000),
                text: { value: text, delimiter: '' },
                ease: 'none'
            });

            await gsap.to({}, { duration: checkDelayMs / 1000 });

            checkElement.innerHTML += ' <span class="status">[PENDING]</span>';
            return checkElement.querySelector('.status');
        };

        const updateStatus = (statusSpan, isOk, error) => {
            if (isOk) {
                statusSpan.textContent = '[OK]';
                statusSpan.classList.add('ok');
            } else {
                console.error(`Preloader check failed for '${statusSpan.parentElement.dataset.check}':`, error);
                statusSpan.textContent = '[FAIL]';
                statusSpan.classList.add('fail');
            }
        };

        const assetPromises = [
            (async () => {
                const statusSpan = await typeLine(checks[0]);
                try {
                    await document.fonts.ready;
                    updateStatus(statusSpan, true);
                    gsap.to(progressBar, { width: '33.3%' });
                } catch (e) { updateStatus(statusSpan, false, e); }
            })(),
            (async () => {
                const statusSpan = await typeLine(checks[1]);
                try {
                    await Promise.all([
                        fetch(dialSvgUrl).then(res => res.ok ? res.text() : Promise.reject('dial.svg failed')),
                        fetch(logoSvgUrl).then(res => res.ok ? res.text() : Promise.reject('logo.svg failed'))
                    ]);
                    updateStatus(statusSpan, true);
                    gsap.to(progressBar, { width: '66.6%' });
                } catch (e) { updateStatus(statusSpan, false, e); }
            })(),
            (async () => {
                const statusSpan = await typeLine(checks[2]);
                try {
                    await new Promise((res, rej) => {
                        const timeout = setTimeout(() => rej(new Error("Audio loading timed out.")), 15000);
                        const checkAudioReady = () => {
                            const allSounds = Object.values(audioManager.sounds);
                            const loadedSounds = allSounds.filter(s => s.state() === 'loaded');
                            
                            if (loadedSounds.length === allSounds.length && allSounds.length > 0) { // Ensure sounds object is populated
                                clearTimeout(timeout);
                                res();
                            } else if (allSounds.length === 0 && audioManager.isReady) { // If no sounds defined but manager is ready
                                clearTimeout(timeout);
                                console.warn("[Preloader] No audio sounds defined in AudioManager, proceeding.");
                                res();
                            }
                            else {
                                setTimeout(checkAudioReady, 100);
                            }
                        };
                        setTimeout(checkAudioReady, 50);
                    });
                    updateStatus(statusSpan, true);
                    gsap.to(progressBar, { width: '100%' });
                } catch (e) { updateStatus(statusSpan, false, e); }
            })(),
        ];

        Promise.all(assetPromises).then(() => {
            engageButtonContainer.classList.remove('hidden');
            gsap.fromTo(engageButtonContainer, { opacity: 0 }, { opacity: 1, duration: 0.5 });
            
            checks[3].classList.add('visible');
             gsap.to({}, { duration: 0.5 }).then(() => {
                 checks[4].classList.add('visible');
             });
        }).catch(err => {
            console.error("[Preloader] Error during asset loading phase:", err);
            // Potentially show an error message to the user or allow bypass
            engageButtonContainer.classList.remove('hidden');
            gsap.fromTo(engageButtonContainer, { opacity: 0 }, { opacity: 1, duration: 0.5 });
            checks[3].classList.add('visible');
            checks[4].classList.add('visible');
        });

        engageButton.addEventListener('click', () => {
            audioManager._unlockAudio();
            gsap.to(preloader, {
                opacity: 0,
                duration: 0.5,
                onComplete: () => {
                    preloader.style.display = 'none';
                    resolve();
                }
            });
        }, { once: true });
    });
}