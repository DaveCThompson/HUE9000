/**
 * @module dialManager (REFACTOR-V2.3 - Componentized)
 * @description Manages rotary dial controls: initialization and global operations.
 * Delegates individual dial logic, interaction, and rendering to Dial component instances.
 */
import Dial from './Dial.js'; // Import the new Dial component
// appState, config, gsap will be passed to Dial instances

const dialInstances = {}; // Stores { 'A': DialComponentInstanceA, 'B': DialComponentInstanceB }
// Removed: activeDragDialId, gsapTween, currentPointerX, dialBSettleTimer, dialsAreActiveDim (now in Dial component)
// Removed: _handleInternalThemeChange (Dial components subscribe directly)

// Dependencies to be injected from main.js
let appStateService = null;
let configService = null;
let gsapService = null;


export function init(dialContainerElements, appState, config, gsap) {
  if (!dialContainerElements || dialContainerElements.length === 0) {
    console.error("[DialManager INIT] No dial container elements provided.");
    return;
  }
  if (!appState || !config || !gsap) {
    console.error("[DialManager INIT] CRITICAL: Missing appState, config, or gsap dependencies.");
    return;
  }

  appStateService = appState;
  configService = config;
  gsapService = gsap;

  // Clear existing instances if re-initializing (unlikely for static dials)
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
    if (dialInstances[dialId]) { // Should not happen with current static setup
        dialInstances[dialId].destroy();
    }
    dialInstances[dialId] = new Dial(container, dialId, appStateService, configService, gsapService);
  });

  // No longer subscribes to appState events directly here. Dial components handle their own.
  // Initial resizeAllCanvases(true) is handled by Dial constructor's resizeCanvas(true)
  console.log("[DialManager INIT] Initialization complete. Dial instances created:", Object.keys(dialInstances));
}

export function setDialsActiveState(isActive) {
    // console.log(`[DialManager setDialsActiveState] Setting to: ${isActive} for all dials.`);
    for (const dialId in dialInstances) {
        if (dialInstances.hasOwnProperty(dialId) && dialInstances[dialId]) {
            dialInstances[dialId].setActiveDimState(isActive);
        }
    }
}

export function resizeAllCanvases(forceDraw = false) {
    // console.log(`[DialManager resizeAllCanvases] forceDraw: ${forceDraw}`);
    for (const dialId in dialInstances) {
        if (dialInstances.hasOwnProperty(dialId) && dialInstances[dialId]) {
            dialInstances[dialId].resizeCanvas(forceDraw);
        }
    }
}

// Removed: handleInteractionStart, handleInteractionMove, handleInteractionEnd
// Removed: addDragListeners, removeDragListeners
// Removed: updateAndCacheComputedDialStyles, drawDial, resizeDialCanvas (singular)
// Removed: handleExternalDialUpdate, handleAppStatusChangeForDials (now handled by Dial components)