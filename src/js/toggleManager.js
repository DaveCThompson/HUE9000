/**
 * @module toggleManager (REFACTOR-V2.1)
 * @description Manages toggle buttons (MAIN PWR, AUX LIGHT).
 * Updates appState (e.g., theme for AUX LIGHT) and delegates visual state changes to buttonManager.
 * Includes console logging.
 */
import { setTheme, getCurrentTheme, getAppStatus, subscribe as subscribeToAppState } from './appState.js';
// ButtonStates are managed by buttonManager

let toggleGroups = {}; // Stores { [groupId]: [{element, value}, ...] }
let localButtonManager = null;

export function init(staticToggleButtonElements, buttonManagerInstance) {
  console.log(`[ToggleManager INIT] Initializing with ${staticToggleButtonElements?.length || 0} static toggle buttons.`);
  if (!buttonManagerInstance) {
      console.error("[ToggleManager INIT] CRITICAL: ButtonManager instance not provided.");
      return;
  }
  localButtonManager = buttonManagerInstance;

  if (!staticToggleButtonElements || staticToggleButtonElements.length === 0) {
    console.warn("[ToggleManager INIT] No static toggle button elements provided.");
  }

  // Clear existing groups for potential re-init (though unlikely for static toggles)
  toggleGroups = {};

  staticToggleButtonElements.forEach(button => {
    const groupContainerEl = button.closest('[data-group-id]');
    const determinedGroupKey = groupContainerEl?.dataset.groupId || button.dataset.groupId;

    if (!determinedGroupKey) {
        console.warn("[ToggleManager INIT] Button found without a group ID:", button);
        return; 
    }

    if (!toggleGroups[determinedGroupKey]) toggleGroups[determinedGroupKey] = [];
    if (!toggleGroups[determinedGroupKey].find(b => b.element === button)) {
        toggleGroups[determinedGroupKey].push({ element: button, value: button.dataset.toggleValue });
    }
    
    // Ensure button is managed by buttonManager if not already (e.g. if added after main BM init)
    if (!localButtonManager._buttons.has(button)) {
        console.log(`[ToggleManager INIT] Adding button to ButtonManager: GroupID='${determinedGroupKey}', Value='${button.dataset.toggleValue}'`);
        localButtonManager.addButton(button, determinedGroupKey); // Pass explicit group ID
    }

    // Add event listeners if not already added
    if (!button.dataset.clickListenerAdded) {
        button.addEventListener('mousedown', (e) => { if (e.button === 0) localButtonManager.setPressedVisuals(e.currentTarget, true); });
        button.addEventListener('mouseup', (e) => { if (e.button === 0) localButtonManager.setPressedVisuals(e.currentTarget, false); });
        button.addEventListener('mouseleave', (e) => { if (e.currentTarget.classList.contains('is-pressing')) localButtonManager.setPressedVisuals(e.currentTarget, false);});
        button.addEventListener('touchstart', (e) => { localButtonManager.setPressedVisuals(e.currentTarget, true); }, { passive: true });
        button.addEventListener('touchend', (e) => { localButtonManager.setPressedVisuals(e.currentTarget, false); });
        button.addEventListener('touchcancel', (e) => { localButtonManager.setPressedVisuals(e.currentTarget, false); });

        button.addEventListener('click', function(event) {
            handleToggleClick(this, determinedGroupKey);
        });
        button.dataset.clickListenerAdded = 'true';
    }
  });

  subscribeToAppState('themeChanged', (newTheme) => {
    // Only sync if app is interactive or transitioning, startup handles initial dim states
    if (getAppStatus() === 'interactive' || document.body.classList.contains('is-transitioning-from-dim')) {
        syncLightToggleToThemeVisuals();
    }
  });

  // Initial visual sync for AUX LIGHT based on current theme (if app already interactive, unlikely here)
  // Startup sequence (P5) will handle the initial energized state for AUX.
  // This call ensures if app somehow starts interactive with a theme, AUX matches.
  if (getAppStatus() === 'interactive') {
    syncLightToggleToThemeVisuals();
  }
  console.log("[ToggleManager INIT] Static initialization complete. Groups:", toggleGroups);
}

export function handleToggleClick(clickedButton, groupKey) {
    if (getAppStatus() !== 'interactive') {
        console.log(`[ToggleManager Click] Interaction blocked for group '${groupKey}', app not interactive.`);
        return;
    }
    console.log(`[ToggleManager Click] Clicked: Group='${groupKey}', Value='${clickedButton.dataset.toggleValue}'`);

    // Let buttonManager handle visual selection based on current theme
    localButtonManager.setGroupSelected(groupKey, clickedButton.dataset.toggleValue);

    if (groupKey === 'system-power') {
        const isPoweringOn = clickedButton.dataset.toggleValue === 'on';
        console.log(`[ToggleManager] System power toggled to: ${isPoweringOn ? 'ON' : 'OFF'}. (Visual only for now)`);
        // Future: Add logic for actual power state changes in appState if needed
    } else if (groupKey === 'light') { // AUX Light controls theme
        const currentThemeInState = getCurrentTheme();
        // 'on' is HIGH (light theme), 'off' is LOW (dark theme)
        const newTheme = clickedButton.dataset.toggleValue === 'on' ? 'light' : 'dark';
        if (currentThemeInState !== newTheme) {
            console.log(`[ToggleManager] AUX Light changing theme from '${currentThemeInState}' to '${newTheme}'.`);
            setTheme(newTheme); // appState change will trigger uiUpdater to change body class
        }
    }
}

// Syncs the AUX LIGHT button visuals to the current theme in appState
// Called on 'themeChanged' event when app is interactive.
export function syncLightToggleToThemeVisuals() {
    const currentTheme = getCurrentTheme(); // 'dark' or 'light' (not 'dim' at this stage)
    const lightGroupKey = 'light';
    
    console.log(`[ToggleManager syncLightToggleToThemeVisuals] Syncing AUX Light to theme: '${currentTheme}'. AppStatus: ${getAppStatus()}`);

    if (toggleGroups[lightGroupKey] && toggleGroups[lightGroupKey].length > 0) {
        // 'on' value for light theme (HIGH), 'off' value for dark theme (LOW)
        const targetButtonValue = (currentTheme === 'light') ? 'on' : 'off';
        
        // Let buttonManager set the correct energized selected/unselected state
        // based on the new theme context.
        localButtonManager.setGroupSelected(lightGroupKey, targetButtonValue);
        console.log(`[ToggleManager syncLightToggleToThemeVisuals] AUX Light group visuals set for value '${targetButtonValue}'.`);
    } else {
        // console.warn(`[ToggleManager syncLightToggleToThemeVisuals] AUX Light group ('${lightGroupKey}') not found or empty.`);
    }
}