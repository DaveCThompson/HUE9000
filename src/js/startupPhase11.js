/**
 * @module startupPhase11
 * @description Creates the GSAP timeline for Phase 11 (All Systems Restored. HUE 9000 Operational)
 * of the HUE 9000 startup sequence (New P11).
 * This module is an XState service, returning a Promise.
 */
import { startupMessages } from './terminalMessages.js'; // Import startupMessages directly

export async function createPhaseTimeline(dependencies) {
    const {
        gsap, appStateService, managerInstances, domElementsRegistry, configModule
        // performThemeTransitionCleanup is called by FSM action on entry to this phase's FSM state
    } = dependencies;

    console.log(`[startupP11_systemOperational EXEC] Start`);

    return new Promise(async (resolve, reject) => {
        try {
            const tl = gsap.timeline();

            // 1. Emit Terminal Message
            const messageKey = 'P11_SYSTEM_OPERATIONAL';
            const messageTextForDurationCalc = startupMessages[messageKey] || ""; // Use imported
            appStateService.emit('requestTerminalMessage', {
                type: 'startup',
                source: messageKey,
                messageKey: messageKey,
            });

            // 2. Theme transition cleanup is handled by FSM action `performThemeTransitionCleanupIfNeeded`
            //    which calls `_performThemeTransitionCleanupLocal` in startupSequenceManager.js
            //    upon entry to the FSM state for this phase.

            // 3. Set default selected states for button groups
            tl.call(() => {
                console.log("[startupP11_systemOperational EXEC] Setting default button group selections.");
                if (managerInstances.buttonManager) {
                    if (domElementsRegistry.mainPwrOnButton) {
                        managerInstances.buttonManager.setGroupSelected('system-power', domElementsRegistry.mainPwrOnButton);
                    }
                    if (domElementsRegistry.auxLightLowButton) {
                        managerInstances.buttonManager.setGroupSelected('light', domElementsRegistry.auxLightLowButton);
                    }
                    Object.keys(configModule.DEFAULT_ASSIGNMENT_SELECTIONS).forEach(targetKey => {
                        managerInstances.buttonManager.setGroupSelected(targetKey, configModule.DEFAULT_ASSIGNMENT_SELECTIONS[targetKey].toString());
                    });
                }
            }, null, 0.01); // Small delay

            // 4. Set app status to interactive
            tl.call(() => {
                console.log("[startupP11_systemOperational EXEC] Setting app status to interactive.");
                appStateService.setAppStatus('interactive');
            }, null, ">0.02"); // After button selections

            // 5. Resize dial canvases (ensures they are drawn correctly in the new theme)
            tl.call(() => {
                if (managerInstances.dialManager) {
                    managerInstances.dialManager.resizeAllCanvases(true);
                }
            }, null, ">0.01");


            // 6. Ensure Minimum Duration
            let phaseDurationSeconds = configModule.SYSTEM_READY_PHASE_DURATION || 0.1;
            if (messageTextForDurationCalc) {
                const typingDurationMs = messageTextForDurationCalc.length * configModule.TERMINAL_TYPING_SPEED_STARTUP_MS_PER_CHAR;
                phaseDurationSeconds = Math.max(phaseDurationSeconds, typingDurationMs / 1000 + 0.2);
            }
            phaseDurationSeconds = Math.max(phaseDurationSeconds, configModule.MIN_PHASE_DURATION_FOR_STEPPING);


            if (tl.duration() < phaseDurationSeconds) {
                tl.to({}, { duration: phaseDurationSeconds - tl.duration() });
            }
            if (tl.duration() === 0 && phaseDurationSeconds > 0) {
                tl.to({}, { duration: phaseDurationSeconds });
            }

            tl.eventCallback('onComplete', () => {
                console.log(`[startupP11_systemOperational EXEC] End. GSAP Duration: ${tl.duration().toFixed(3)}`);
                resolve();
            }).play();

        } catch (error) {
            console.error("[startupP11_systemOperational EXEC] Error:", error);
            reject(error);
        }
    });
}