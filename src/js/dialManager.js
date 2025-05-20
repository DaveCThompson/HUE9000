/**
 * @module dialManager (REFACTOR-V2.3 - Componentized)
 * @description Manages rotary dial controls: initialization and global operations.
 * Delegates individual dial logic, interaction, and rendering to Dial component instances.
 */
import Dial from './Dial.js'; 

const dialInstances = {}; 

// Dependencies to be injected from main.js
let appStateService = null;
let configServiceModule = null; // Will store the configModule namespace object
let gsapService = null;


export function init(dialContainerElements, appState, configModule, gsap) { // configModule is the namespace
  if (!dialContainerElements || dialContainerElements.length === 0) {
    console.error("[DialManager INIT] No dial container elements provided.");
    return;
  }
  if (!appState || !configModule || !gsap) { // Check configModule
    console.error("[DialManager INIT] CRITICAL: Missing appState, configModule, or gsap dependencies.");
    return;
  }

  appStateService = appState;
  configServiceModule = configModule; // Store the namespace object
  gsapService = gsap;

  for (const dialId in dialInstances) {
    if (dialInstances[dialId] && typeof dialInstances[dialId].destroy === 'function') {
      dialInstances[dialId].destroy();
    }
    delete dialInstances[dialId];
  }
  
  dialContainerElements.forEach(container => {
    const dialId = container.dataset.dialId;
    if (!dialId) {
      console.error(`[DialManager INIT] Could not find dialId for container:`, container);
      return;
    }
    if (dialInstances[dialId]) { 
        dialInstances[dialId].destroy();
    }
    // Pass the entire configServiceModule to the Dial constructor
    dialInstances[dialId] = new Dial(container, dialId, appStateService, configServiceModule, gsapService);
  });

  console.log("[DialManager INIT] Initialization complete. Dial instances created:", Object.keys(dialInstances));
}

export function setDialsActiveState(isActive) {
    for (const dialId in dialInstances) {
        if (dialInstances.hasOwnProperty(dialId) && dialInstances[dialId]) {
            dialInstances[dialId].setActiveDimState(isActive);
        }
    }
}

export function resizeAllCanvases(forceDraw = false) {
    for (const dialId in dialInstances) {
        if (dialInstances.hasOwnProperty(dialId) && dialInstances[dialId]) {
            dialInstances[dialId].resizeCanvas(forceDraw);
        }
    }
}