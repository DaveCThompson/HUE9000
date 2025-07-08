/**
 * @module barFillRenderer
 * @description A renderer for the scan sequence that displays progressive lines
 * with text and a filling bar.
 * @returns {Promise<void>} A promise that resolves when the animation is complete.
 */
export function renderBarFill(target, jobConfig, gsap) {
    return new Promise(resolve => {
        const mm = gsap.matchMedia();
        const timeline = gsap.timeline();

        const lineContainer = document.createElement('div');
        lineContainer.className = 'scan-progressive-line-container';
        target.appendChild(lineContainer);

        const createSegments = (parent) => {
            const segments = [];
            for (let i = 0; i < 20; i++) {
                const segment = document.createElement('div');
                segment.className = 'scan-progressive-bar-segment';
                parent.appendChild(segment);
                segments.push(segment);
            }
            return segments;
        };

        mm.add("(prefers-reduced-motion: no-preference)", () => {
            jobConfig.progressiveLines.forEach(lineData => {
                const textEl = document.createElement('span');
                textEl.className = 'scan-progressive-text';
                textEl.setAttribute('aria-hidden', 'true');
                textEl.textContent = ' ';

                const barWrapper = document.createElement('div');
                barWrapper.className = 'scan-progressive-bar-wrapper';
                barWrapper.setAttribute('aria-hidden', 'true');
                
                const segments = createSegments(barWrapper);
                
                const lineWrapper = document.createElement('div');
                lineWrapper.append(textEl, barWrapper);
                
                timeline.call(() => lineContainer.appendChild(lineWrapper));
                timeline.from(lineWrapper, { autoAlpha: 0, y: 5, duration: 0.2 }, '<');
                
                const lineAnimTl = gsap.timeline();
                lineAnimTl.to(textEl, {
                    text: `> ${lineData.text}`,
                    duration: lineData.duration * 0.5, // Faster text reveal
                    ease: 'none'
                }).to(segments, {
                    className: 'scan-progressive-bar-segment is-filled',
                    stagger: {
                        amount: lineData.duration,
                        ease: 'power1.inOut'
                    }
                }, '<');

                timeline.add(lineAnimTl);
            });
        });

        mm.add("(prefers-reduced-motion: reduce)", () => {
            jobConfig.progressiveLines.forEach(lineData => {
                const textEl = document.createElement('span');
                textEl.className = 'scan-progressive-text';
                textEl.textContent = `> ${lineData.text}`;

                const barWrapper = document.createElement('div');
                barWrapper.className = 'scan-progressive-bar-wrapper';

                const segments = createSegments(barWrapper);
                segments.forEach(seg => seg.classList.add('is-filled'));
                
                const lineWrapper = document.createElement('div');
                lineWrapper.append(textEl, barWrapper);
                lineContainer.appendChild(lineWrapper);
            });
        });

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
    return new Promise(resolve => {
        const mm = gsap.matchMedia();
        const timeline = gsap.timeline();

        const lineContainer = document.createElement('div');
        lineContainer.className = 'scan-progressive-line-container type-window-container';
        target.appendChild(lineContainer);
        
        // Create a single, persistent text element
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
            // Animate the container itself for clean setup/teardown
            timeline.from(lineContainer, { autoAlpha: 0, y: 5, duration: 0.2 });

            jobConfig.progressiveLines.forEach((lineData, index) => {
                const isFirst = index === 0;
                // REMOVED: Scramble-to-blank transition tween was here.
                
                // Write the actual line
                timeline.to(textEl, {
                    duration: lineData.duration * 0.7,
                    text: {
                        value: `> ${lineData.text}`,
                        scrambleText: { chars: "lowerCase", speed: 0.2 }
                    },
                    ease: `steps(${lineData.text.length})`,
                }, isFirst ? ">" : "+=0.3"); // Add a pause between lines
            });
            
            // Add a final pause and fade out the entire container
            timeline.to(lineContainer, { autoAlpha: 0, duration: 0.3 }, "+=0.5");
        });

        mm.add("(prefers-reduced-motion: reduce)", () => {
            const lastLine = jobConfig.progressiveLines[jobConfig.progressiveLines.length - 1];
            if (lastLine) {
                textEl.textContent = `> ${lastLine.text}`;
            }
            pulseBg.style.display = 'none';
        });
        
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