/**
 * @module animationUtils
 * @description Provides utility functions for creating complex, reusable animations,
 * decoupling the animation logic from the components that use them.
 */
import { serviceLocator } from './serviceLocator.js';

/**
 * Creates a sophisticated flicker animation timeline for a target element.
 * @param {HTMLElement} target - The DOM element to apply the flicker to.
 * @param {object} options - Configuration for the flicker effect.
 * @param {string} options.profileKey - The key for the flicker profile in the config.
 * @param {object} options.flickerProfiles - The flicker profiles configuration object.
 * @param {object} options.proxies - A proxy object for animating CSS variables.
 * @param {object} options.gsap - The GSAP instance.
 * @returns {object} A GSAP timeline instance.
 */
export function createAdvancedFlicker(target, { profileKey, flickerProfiles, proxies, gsap }) {
    const profile = flickerProfiles[profileKey];
    if (!profile) {
        console.warn(`Flicker profile "${profileKey}" not found.`);
        return gsap.timeline();
    }

    const tl = gsap.timeline({
        defaults: { duration: 0.04, ease: 'none' },
    });

    const initialGlow = profile.glowStates.initial || 0;
    const finalGlow = profile.glowStates.final || 0;

    // Set initial state
    tl.set(target, { '--flicker-opacity': profile.opacityStates.initial })
      .set(proxies.glow, { value: initialGlow });

    // Build flicker sequence
    profile.sequence.forEach(step => {
        const opacity = profile.opacityStates[step.o];
        const glow = profile.glowStates[step.g];

        tl.to(target, { '--flicker-opacity': opacity }, '>')
          .to(proxies.glow, { value: glow }, '<');
    });

    // Animate to final state
    tl.to(target, { '--flicker-opacity': profile.opacityStates.final, duration: 0.2, ease: 'power2.out' }, '>')
      .to(proxies.glow, { value: finalGlow, duration: 0.2, ease: 'power2.out' }, '<');

    return tl;
}

/**
 * Creates a GSAP timeline for the 9-dot grid spinner animation.
 * @param {HTMLElement} spinnerEl - The container for the spinner's SVG (e.g., .dot-grid-spinner).
 * @param {object} gsap - The GSAP instance.
 * @returns {object} A GSAP timeline instance.
 */
export function createDotGridSpinnerTimeline(spinnerEl, gsap) {
    // The spinnerEl is the direct container of the SVG.
    const dots = spinnerEl.querySelectorAll('svg .dot');

    // DEFINITIVE FIX: Imperatively set the transform origin on each dot using GSAP.
    // This overrides the SVG default of `0 0` and ensures scaling happens from
    // the center of each dot, preventing them from flying in from the top-left.
    // Using '50% 50%' is the most robust value for SVG elements.
    gsap.set(dots, { transformOrigin: '50% 50%' });

    const tl = gsap.timeline({
        repeat: -1,
        repeatDelay: 0.5,
        defaults: { ease: 'power2.inOut', duration: 0.4 }
    });

    const stagger = {
        each: 0.1,
        from: 'center',
        grid: 'auto'
    };

    tl.fromTo(dots, {
        scale: 0,
        opacity: 0
    }, {
        scale: 0.5, // MODIFIED: Reduced scale from 1 to 0.75 for a smaller appearance.
        opacity: 1,
        stagger
    }).to(dots, {
        scale: 0,
        opacity: 0,
        stagger
    }, '+=0.5');

    return tl;
}