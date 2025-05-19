/**
 * @module gridManager (REFACTOR-V2.1 -> V2.3 update)
 * @description Manages dynamic generation of Hue Assignment Grid buttons and their interactions.
 * Delegates visual state changes to buttonManager.
 * Includes console logging.
 */

import { HUE_ASSIGNMENT_ROW_HUES, DEFAULT_ASSIGNMENT_SELECTIONS } from './config.js';
import { setTargetColorProperties, getAppStatus } from './appState.js';
// ButtonStates will be imported by buttonManager itself

let localButtonManager = null; 

export function init(hueAssignmentColumns, buttonManagerInstance) {
    console.log("[GridManager INIT] Initializing...");
    if (!buttonManagerInstance) {
      console.error("[GridManager INIT] CRITICAL: ButtonManager instance not provided.");
      return;
    }
    localButtonManager = buttonManagerInstance;

    if (!hueAssignmentColumns || hueAssignmentColumns.length === 0) {
        console.error("[GridManager INIT] No hue assignment column elements provided.");
        return;
    }

    hueAssignmentColumns.forEach(columnElement => {
        const assignmentTarget = columnElement.dataset.assignmentTarget;
        if (!assignmentTarget) {
            console.warn("[GridManager INIT] Column found without 'data-assignment-target'. Skipping.", columnElement);
            return;
        }
        console.log(`[GridManager INIT] Processing column for target: '${assignmentTarget}'`);

        const defaultSelectedRowIndex = DEFAULT_ASSIGNMENT_SELECTIONS[assignmentTarget];

        // Clear existing buttons but preserve label
        const labelEl = columnElement.querySelector('.control-group-label.label-top');
        columnElement.innerHTML = ''; 
        if (labelEl) columnElement.appendChild(labelEl);

        for (let i = 0; i < 12; i++) { // 12 rows/chips
            const button = document.createElement('div');
            button.classList.add('button-unit', 'button-unit--toggle', 'button-unit--s'); 
            button.dataset.toggleValue = i.toString(); // Value for group selection (used by buttonManager)
            button.dataset.rowIndex = i.toString();    // Index for hue lookup AND as value for Button component
            button.setAttribute('role', 'radio');      
            button.setAttribute('aria-label', `Assign ${assignmentTarget.toUpperCase()} to Hue from Row ${i + 1}`);
            
            const lightContainer = document.createElement('div');
            lightContainer.classList.add('light-container');
            lightContainer.setAttribute('aria-hidden', 'true');
            const light = document.createElement('div');
            light.classList.add('light');
            lightContainer.appendChild(light);
            button.appendChild(lightContainer);

            const bgFrame = document.createElement('div'); 
            bgFrame.classList.add('button-bg-frame');
            button.appendChild(bgFrame);

            columnElement.appendChild(button);

            localButtonManager.addButton(button, assignmentTarget); 

            button.addEventListener('mousedown', (e) => { if (e.button === 0) localButtonManager.setPressedVisuals(e.currentTarget, true); });
            button.addEventListener('mouseup', (e) => { if (e.button === 0) localButtonManager.setPressedVisuals(e.currentTarget, false); });
            button.addEventListener('mouseleave', (e) => { if (e.currentTarget.classList.contains('is-pressing')) localButtonManager.setPressedVisuals(e.currentTarget, false); });
            button.addEventListener('touchstart', (e) => { localButtonManager.setPressedVisuals(e.currentTarget, true); }, { passive: true });
            button.addEventListener('touchend', (e) => { localButtonManager.setPressedVisuals(e.currentTarget, false); });
            button.addEventListener('touchcancel', (e) => { localButtonManager.setPressedVisuals(e.currentTarget, false); });

            button.addEventListener('click', (event) => {
                const clickedBtn = event.currentTarget;
                if (getAppStatus() !== 'interactive') {
                    console.log(`[GridManager Click] Interaction blocked for ${assignmentTarget}-${i}, app not interactive.`);
                    return;
                }
                
                const buttonInstance = localButtonManager._buttons.get(clickedBtn); // Get the Button component instance
                if (!buttonInstance) {
                    console.error("[GridManager Click] Clicked button not managed by ButtonManager:", clickedBtn);
                    return;
                }
                const buttonGroupId = buttonInstance.getGroupId(); // Use getter
                if (!buttonGroupId) {
                     console.error("[GridManager Click] Clicked button instance missing groupId:", clickedBtn);
                    return;
                }

                console.log(`[GridManager Click] Button clicked: Target='${buttonGroupId}', RowIndex='${clickedBtn.dataset.rowIndex}'`);

                localButtonManager.setGroupSelected(buttonGroupId, clickedBtn.dataset.toggleValue); // toggleValue is used for selection matching

                const hueIndex = parseInt(clickedBtn.dataset.rowIndex, 10);
                const hueToSet = HUE_ASSIGNMENT_ROW_HUES[hueIndex];
                setTargetColorProperties(buttonGroupId, hueToSet); 
            });
        }
        if (defaultSelectedRowIndex >= 0 && defaultSelectedRowIndex < HUE_ASSIGNMENT_ROW_HUES.length) {
            setTargetColorProperties(assignmentTarget, HUE_ASSIGNMENT_ROW_HUES[defaultSelectedRowIndex]);
        }
    });
    console.log("[GridManager INIT] Hue assignment buttons generated and registered.");
}