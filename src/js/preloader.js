/**
 * @module preloader
 * @description Handles the thematic "cold boot" preloader sequence.
 */
import { serviceLocator } from './serviceLocator.js';

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
        const { preloader, bootSeqList, engageButton, engageButtonContainer } = dom;
        const checks = Array.from(bootSeqList.querySelectorAll('li[data-check]'));
        const typingDelayMs = 60;
        const checkDelayMs = 200;
        const audioManager = serviceLocator.get('audioManager');

        const assetPromises = {
            memory: document.fonts.ready,
            logic: Promise.all([
                fetch('./dial.svg').then(res => res.ok ? res.text() : Promise.reject()),
                fetch('./logo.svg').then(res => res.ok ? res.text() : Promise.reject())
            ]),
            core: new Promise(res => {
                const checkAudioReady = () => {
                    const allLoaded = Object.values(audioManager.sounds).every(s => s.state() === 'loaded' || s.state() === 'loading');
                    if (allLoaded) {
                        res();
                    } else {
                        setTimeout(checkAudioReady, 100);
                    }
                };
                checkAudioReady();
            })
        };

        for (const check of checks) {
            if (check.dataset.check === 'complete' || check.dataset.check === 'ready') continue;

            check.classList.add('visible');
            const text = check.textContent;
            check.innerHTML = '> <span class="text"></span><span class="cursor">_</span>';
            const textSpan = check.querySelector('.text');
            const cursorSpan = check.querySelector('.cursor');

            gsap.to(cursorSpan, { opacity: 0, repeat: -1, yoyo: true, duration: 0.4, ease: 'steps(1)' });

            await gsap.to(textSpan, {
                duration: text.length * (typingDelayMs / 1000),
                text: { value: text, delimiter: '' },
                ease: 'none'
            });

            await gsap.to({}, { duration: checkDelayMs / 1000 });

            check.innerHTML += ' <span class="status">[PENDING]</span>';
            const statusSpan = check.querySelector('.status');

            try {
                await assetPromises[check.dataset.check];
                statusSpan.textContent = '[OK]';
                statusSpan.classList.add('ok');
            } catch (error) {
                console.error(`Preloader check failed for '${check.dataset.check}':`, error);
                statusSpan.textContent = '[FAIL]';
                statusSpan.classList.add('fail');
            }
        }

        // FIX: Make engage button available as soon as assets are loaded.
        engageButtonContainer.classList.remove('hidden');
        gsap.fromTo(engageButtonContainer, { opacity: 0 }, { opacity: 1, duration: 0.5 });
        
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

        // FIX: Type out final messages concurrently, not blocking the engage button.
        bootSeqList.querySelector('[data-check="complete"]').classList.remove('hidden');
        gsap.to({}, { duration: 0.5 }).then(() => {
             bootSeqList.querySelector('[data-check="ready"]').classList.remove('hidden');
        });
    });
}