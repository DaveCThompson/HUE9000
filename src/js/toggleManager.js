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
  // console.log(`[ToggleManager INIT] Initializing with ${staticToggleButtonElements?.length || 0} static toggle buttons.`);
  if (!buttonManagerInstance) {
      console.error("[ToggleManager INIT] CRITICAL: ButtonManager instance not provided.");
      return;
  }
  localButtonManager = buttonManagerInstance;

  if (!staticToggleButtonElements || staticToggleButtonElements.length === 0) {
    console.warn("[ToggleManager INIT] No static toggle button elements provided.");
  }

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
    
    if (!localButtonManager._buttons.has(button)) {
        // console.log(`[ToggleManager INIT] Adding button to ButtonManager: GroupID='${determinedGroupKey}', Value='${button.dataset.toggleValue}'`);
        localButtonManager.addButton(button, determinedGroupKey); 
    }

    if (!button.dataset.clickListenerAdded) {
        button.addEventListener('mousedown', (e) => { if (e.button === 0) localButtonManager.setPressedVisuals(e.currentTarget, true); });
        button.addEventListener('mouseup', (e) => { if (e.button === 0) localButtonManager.setPressedVisuals(e.currentTarget, false); });
        button.addEventListener('mouseleave', (e) => { if (e.currentTarget.classList.contains('is-pressing')) localButtonManager.setPressedVisuals(e.currentTarget, false);});
        button.addEventListener('touchstart', (e) => { localButtonManager.setPressedVisuals(e.currentTarget, true); }, { passive: true });
        button.addEventListener('touchend', (e) => { localButtonManager.setPressedVisuals(e.currentTarget, false); });
        button.addEventListener('touchcancel', (e) => { localButtonManager.setPressedVisuals(e.currentTarget, false); });

        button.addEventListener('click', function(event) {
            // console.log(`[ToggleManager Click Listener] Click event on button: Group='${determinedGroupKey}', Value='${this.dataset.toggleValue}'`);
            handleToggleClick(this, determinedGroupKey);
        });
        button.dataset.clickListenerAdded = 'true';
    }
  });

  subscribeToAppState('themeChanged', (newTheme) => {
    if (getAppStatus() === 'interactive' || document.body.classList.contains('is-transitioning-from-dim')) {
        syncLightToggleToThemeVisuals();
    }
  });

  if (getAppStatus() === 'interactive') {
    syncLightToggleToThemeVisuals();
  }
  // console.log("[ToggleManager INIT] Static initialization complete. Groups:", toggleGroups);
}

export function handleToggleClick(clickedButton, groupKey) {
    const currentAppStatus = getAppStatus();
    // console.log(`[ToggleManager handleToggleClick] Clicked: Group='${groupKey}', Value='${clickedButton.dataset.toggleValue}', AppStatus: '${currentAppStatus}'`);

    if (currentAppStatus !== 'interactive') {
        console.log(`[ToggleManager Click] Interaction blocked for group '${groupKey}', app not interactive. Status: ${currentAppStatus}`);
        return;
    }

    localButtonManager.setGroupSelected(groupKey, clickedButton.dataset.toggleValue);

    if (groupKey === 'system-power') {
        const isPoweringOn = clickedButton.dataset.toggleValue === 'on';
        // console.log(`[ToggleManager] System power toggled to: ${isPoweringOn ? 'ON' : 'OFF'}. (Visual only for now)`);
    } else if (groupKey === 'light') { 
        const currentThemeInState = getCurrentTheme();
        const newTheme = clickedButton.dataset.toggleValue === 'on' ? 'light' : 'dark';
        if (currentThemeInState !== newTheme) {
            // console.log(`[ToggleManager] AUX Light changing theme from '${currentThemeInState}' to '${newTheme}'.`);
            setTheme(newTheme); 
        }
    }
}

export function syncLightToggleToThemeVisuals() {
    const currentTheme = getCurrentTheme(); 
    const lightGroupKey = 'light';
    
    // console.log(`[ToggleManager syncLightToggleToThemeVisuals] Syncing AUX Light to theme: '${currentTheme}'. AppStatus: ${getAppStatus()}`);

    if (toggleGroups[lightGroupKey] && toggleGroups[lightGroupKey].length > 0) {
        const targetButtonValue = (currentTheme === 'light') ? 'on' : 'off';
        localButtonManager.setGroupSelected(lightGroupKey, targetButtonValue);
        // console.log(`[ToggleManager syncLightToggleToThemeVisuals] AUX Light group visuals set for value '${targetButtonValue}'.`);
    } else {
        // console.warn(`[ToggleManager syncLightToggleToThemeVisuals] AUX Light group ('${lightGroupKey}') not found or empty.`);
    }
}