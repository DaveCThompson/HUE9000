/**
 * @module barFillRenderer
 * @description A renderer for the scan sequence that displays progressive lines
 * with text and a filling bar.
 * @returns {Promise<void>} A promise that resolves when the animation is complete.
 */
export function renderBarFill(target, jobConfig, gsap) {
    // REFACTORED: Wrap in a new Promise and use the GSAP timeline's 'thenable' nature.
    return new Promise(resolve => {
        const mm = gsap.matchMedia();
        const timeline = gsap.timeline(); // No onComplete here

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

        // Use the timeline's promise-like behavior to resolve the outer promise.
        timeline.play().then(resolve);
    });
}


/**
 * @module typeWindowRenderer
 * @description A renderer for the scan sequence that displays a single-line "window"
 * cycling through text phrases with a scramble effect.
 * @returns {Promise<void>} A promise that resolves when the animation is complete.
 */
export function renderTypeWindow(target, jobConfig, gsap) {
    // REFACTORED: Wrap in a new Promise and use the GSAP timeline's 'thenable' nature.
    return new Promise(resolve => {
        const mm = gsap.matchMedia();
        const timeline = gsap.timeline(); // No onComplete here

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
        
        // Use the timeline's promise-like behavior to resolve the outer promise.
        timeline.play().then(resolve);
    });
}

/**
 * @module rendererRegistry
 * @description A simple registry for storing and retrieving scan sequence
 * sub-job renderer functions. This decouples the FSM from the animation
 * implementations.
 */
const renderers = new Map();

export const rendererRegistry = {
  /**
   * Registers a renderer function with a given name.
   * @param {string} name - The name of the renderer (e.g., 'barFill', 'typeWindow').
   * @param {Function} rendererFunction - The function to execute for rendering.
   */
  register(name, rendererFunction) {
    if (renderers.has(name)) {
      console.warn(`[RendererRegistry] Renderer "${name}" is being overwritten.`);
    }
    renderers.set(name, rendererFunction);
  },

  /**
   * Retrieves a registered renderer function by name.
   * @param {string} name - The name of the renderer to retrieve.
   * @returns {Function} The requested renderer function.
   * @throws {Error} If the renderer is not found.
   */
  get(name) {
    if (!renderers.has(name)) {
      throw new Error(`[RendererRegistry] Renderer "${name}" not found. Ensure it was registered before being accessed.`);
    }
    return renderers.get(name);
  }
};

// --- Register the renderers immediately on module load ---
rendererRegistry.register('barFill', renderBarFill);
rendererRegistry.register('typeWindow', renderTypeWindow);