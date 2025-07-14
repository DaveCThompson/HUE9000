// src/js/infoPanelContent.js
/**
 * @module infoPanelContent
 * @description Serves as an asset manifest for the side info panel.
 * It imports all necessary images and exports their Vite-processed paths,
 * allowing them to be dynamically injected into the DOM.
 */

// Import image assets to let Vite handle the paths
import halLensImg from '../assets/images/HAL9000-lens.png';
import dramaticLightingImg from '../assets/images/dramatic-lighting.png';
import backlitButtonsImg from '../assets/images/backlit-buttons.png';
import minimalControlsImg from '../assets/images/minimal-controls.png';

/**
 * A map of image filenames (used as keys in the HTML `data-src-key` attribute)
 * to their final, Vite-processed paths.
 */
export const panelImagePaths = {
    'HAL9000-lens.png': halLensImg,
    'dramatic-lighting.png': dramaticLightingImg,
    'backlit-buttons.png': backlitButtonsImg,
    'minimal-controls.png': minimalControlsImg,
};