/**
 * @module typeWindowRenderer
 * @description A renderer for the scan sequence that displays a single-line "window"
 * cycling through text phrases with a scramble effect.
 * @returns {Promise<void>} A promise that resolves when the animation is complete.
 */
export function renderTypeWindow(target, jobConfig, gsap) {
    return new Promise(resolve => {
        const mm = gsap.matchMedia();
        const timeline = gsap.timeline({ onComplete: resolve });

        const lineContainer = document.createElement('div');
        lineContainer.className = 'scan-progressive-line-container type-window-container';
        target.appendChild(lineContainer);

        const textEl = document.createElement('span');
        textEl.className = 'scan-progressive-text type-window-text';
        textEl.setAttribute('aria-hidden', 'true');
        textEl.textContent = '...';

        const pulseBg = document.createElement('div');
        pulseBg.className = 'type-window-pulse';
        pulseBg.setAttribute('aria-hidden', 'true');
        pulseBg.style.setProperty('--_pulse-hue', jobConfig.hue);
        
        lineContainer.append(pulseBg, textEl);

        mm.add("(prefers-reduced-motion: no-preference)", () => {
            timeline.from(lineContainer, { autoAlpha: 0, y: 5, duration: 0.2 });

            jobConfig.progressiveLines.forEach((lineData, index) => {
                const isLast = index === jobConfig.progressiveLines.length - 1;
                timeline.to(textEl, {
                    duration: lineData.duration,
                    text: {
                        value: `> ${lineData.text}`,
                        scrambleText: {
                            chars: "lowerCase",
                            speed: 0.3
                        }
                    },
                    ease: `steps(${lineData.text.length})`,
                }, isLast ? "+=0.1" : ">");
            });

            timeline.to(pulseBg, { autoAlpha: 0, duration: 0.3 }, "<");
        });

        mm.add("(prefers-reduced-motion: reduce)", () => {
            const lastLine = jobConfig.progressiveLines[jobConfig.progressiveLines.length - 1];
            if (lastLine) {
                textEl.textContent = `> ${lastLine.text}`;
            }
            pulseBg.style.display = 'none';
        });

        timeline.play();
    });
}