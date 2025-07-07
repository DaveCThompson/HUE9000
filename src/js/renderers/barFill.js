/**
 * @module barFillRenderer
 * @description A renderer for the scan sequence that displays progressive lines
 * with text and a filling bar.
 * @returns {Promise<void>} A promise that resolves when the animation is complete.
 */
export function renderBarFill(target, jobConfig, gsap) {
    return new Promise(resolve => {
        const mm = gsap.matchMedia();
        const timeline = gsap.timeline({ onComplete: resolve });

        const lineContainer = document.createElement('div');
        lineContainer.className = 'scan-progressive-line-container';
        target.appendChild(lineContainer);

        mm.add("(prefers-reduced-motion: no-preference)", () => {
            jobConfig.progressiveLines.forEach(lineData => {
                const textEl = document.createElement('span');
                textEl.className = 'scan-progressive-text';
                textEl.setAttribute('aria-hidden', 'true');
                textEl.textContent = ' '; // Start with a non-empty space for layout

                const barWrapper = document.createElement('div');
                barWrapper.className = 'scan-progressive-bar-wrapper';
                barWrapper.setAttribute('aria-hidden', 'true');

                const barFill = document.createElement('div');
                barFill.className = 'scan-progressive-bar-fill';
                barFill.style.backgroundColor = `oklch(0.85 0.20 ${jobConfig.hue})`;
                
                barWrapper.appendChild(barFill);
                const lineWrapper = document.createElement('div');
                lineWrapper.append(textEl, barWrapper);
                
                timeline.call(() => lineContainer.appendChild(lineWrapper));
                timeline.from(lineWrapper, { autoAlpha: 0, y: 5, duration: 0.2 }, '<');
                
                const lineAnimTl = gsap.timeline();
                lineAnimTl.to(textEl, {
                    text: `> ${lineData.text}`,
                    duration: lineData.duration * 0.8,
                    ease: 'none'
                }).to(barFill, {
                    width: '100%',
                    duration: lineData.duration,
                    ease: 'power1.inOut'
                }, '<');

                timeline.add(lineAnimTl);
            });
        });

        mm.add("(prefers-reduced-motion: reduce)", () => {
             // Instantly display the final state
            jobConfig.progressiveLines.forEach(lineData => {
                const textEl = document.createElement('span');
                textEl.className = 'scan-progressive-text';
                textEl.textContent = `> ${lineData.text}`;

                const barWrapper = document.createElement('div');
                barWrapper.className = 'scan-progressive-bar-wrapper';

                const barFill = document.createElement('div');
                barFill.className = 'scan-progressive-bar-fill';
                barFill.style.backgroundColor = `oklch(0.85 0.20 ${jobConfig.hue})`;
                barFill.style.width = '100%';
                
                barWrapper.appendChild(barFill);
                const lineWrapper = document.createElement('div');
                lineWrapper.append(textEl, barWrapper);
                lineContainer.appendChild(lineWrapper);
            });
        });

        timeline.play();
    });
}