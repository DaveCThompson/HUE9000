/**
 * @module lensManager (REFACTOR-V2.1)
 * @description Manages the visual lens power, including smoothing, oscillation,
 * and direct CSS variable updates for the lens gradient stops.
 * Reacts to changes in true lens power, Dial B interaction state, and Dial A hue from appState.
 * Includes console logging.
 */

import gsap from 'gsap';
import { 
    subscribe, 
    getTrueLensPower, 
    getDialBInteractionState, 
    getDialState, 
    getAppStatus, 
    setTrueLensPower as setTrueLensPowerInAppState,
    updateDialState as updateDialBStateInAppState // Import for updating Dial B
} from './appState.js';
import {
    LENS_OSCILLATION_THRESHOLD, LENS_OSCILLATION_SMOOTHING_DURATION,
    LENS_OSCILLATION_AMPLITUDE_MIN, LENS_OSCILLATION_AMPLITUDE_MAX_ADDITION,
    LENS_OSCILLATION_PERIOD_AT_THRESHOLD, LENS_OSCILLATION_PERIOD_AT_MAX_POWER,
    LENS_GRADIENT_BREAKPOINTS, NUM_LENS_GRADIENT_STOPS,
    LENS_HOTSPOT_HUE_OFFSET, HUE_UPDATE_THRESHOLD, DEBOUNCE_DELAY,
    LENS_STARTUP_TARGET_POWER, LENS_STARTUP_RAMP_DURATION, DEFAULT_DIAL_A_HUE,
    DIAL_B_VISUAL_ROTATION_PER_HUE_DEGREE_CONFIG // Import for Dial B rotation calculation
} from './config.js';
import { debounce, mapRange } from './utils.js'; 

// --- Module Scope Variables ---
let isOscillating = false;
let oscillationStartTime = 0;
let smoothedTrueLensPower = { value: 0.0 }; 
let trueLensPowerTarget = 0.0; 
let oscillationFrameId = null;
let powerSmoothingTween = null;
let rootDocElement = null; 
let lensGradientElement = null; 
let currentMasterHue = DEFAULT_DIAL_A_HUE; 
let lastAppliedGradientString = ""; 
let lastVisualPowerForGradientRender = -1; 
let lastHueForGradientRender = -1; 

const debouncedSetLegacyLensPowerVar = debounce((visualPower) => {
    if (!rootDocElement) return;
    const clampedPower = Math.max(0.0, Math.min(visualPower, 1.05)); 
    rootDocElement.style.setProperty('--lens-power', clampedPower.toFixed(3));
}, DEBOUNCE_DELAY / 3); 


export function init(documentElement, colorLensGradientEl) {
    if (!documentElement || !colorLensGradientEl) {
        console.error("[LensManager INIT] CRITICAL ERROR: Missing documentElement or colorLensGradientEl.");
        return;
    }
    rootDocElement = documentElement;
    lensGradientElement = colorLensGradientEl;

    const initialPower01 = getTrueLensPower(); 
    const initialDialAState = getDialState('A');
    currentMasterHue = initialDialAState ? ((initialDialAState.hue % 360) + 360) % 360 : DEFAULT_DIAL_A_HUE;
    lastHueForGradientRender = currentMasterHue; 

    smoothedTrueLensPower.value = initialPower01;
    trueLensPowerTarget = initialPower01;
    
    directUpdateLensVisuals(initialPower01);

    subscribe('trueLensPowerChanged', _handleTrueLensPowerChange);
    subscribe('dialBInteractionChange', _handleDialBInteractionChange);
    subscribe('dialUpdated', _handleDialAUpdateForLensHue); 
    subscribe('appStatusChanged', _handleAppStatusChangeForLens); 
}

export function energizeLensCoreStartup(targetPowerPercent = LENS_STARTUP_TARGET_POWER, rampDurationMs = LENS_STARTUP_RAMP_DURATION) {
    const tl = gsap.timeline();
    const initialPower01 = getTrueLensPower(); 
    const lensPowerProxy = { value: initialPower01 * 100 }; // This is the object being tweened

    if (initialPower01 <= 0.0001 && lensGradientElement) {
        _updateLensGradientVisuals(0.0); 
    }

    tl.to(lensPowerProxy, {
        value: targetPowerPercent,
        duration: rampDurationMs / 1000, 
        ease: "sine.inOut",
        onStart: () => { 
            if (lensGradientElement && lensGradientElement.style.opacity !== '1' && getAppStatus() !== 'loading' && getAppStatus() !== 'error') {
                lensGradientElement.style.opacity = '1';
            }
        },
        onUpdate: function() { // 'this' refers to the tween here
            setTrueLensPowerInAppState(this.targets()[0].value); 
        },
        onComplete: () => { // Arrow function, 'this' is lexically scoped (lensManager instance)
                           // OR, if it were a function(), 'this' would be the tween.
                           // The key is to access lensPowerProxy directly.
            const finalPowerPercent = lensPowerProxy.value; // Access the proxy directly
            setTrueLensPowerInAppState(finalPowerPercent);
            
            const dialBHue = (finalPowerPercent / 100) * 359.999;
            const dialBRotation = dialBHue * DIAL_B_VISUAL_ROTATION_PER_HUE_DEGREE_CONFIG;
            
            // Ensure we don't overwrite isDragging if it somehow changed
            const currentDialBState = getDialState('B') || {};
            updateDialBStateInAppState('B', {
                hue: dialBHue,
                targetHue: dialBHue,
                rotation: dialBRotation,
                targetRotation: dialBRotation,
                isDragging: currentDialBState.isDragging || false 
            });
            // console.log(`[LensManager energizeLensCoreStartup] Complete. Lens Power: ${finalPowerPercent}%. Dial B hue synced to: ${dialBHue.toFixed(1)}`);
        }
    });
    return tl;
}

export function directUpdateLensVisuals(visualPower01) {
    _updateLensGradientVisuals(visualPower01); 
    _setLegacyLensPowerVar(visualPower01, true); 
}

function _setLegacyLensPowerVar(visualPower01, forceImmediate = false) {
    if (forceImmediate) {
        if (!rootDocElement) return;
        const clampedPower = Math.max(0.0, Math.min(visualPower01, 1.05));
        rootDocElement.style.setProperty('--lens-power', clampedPower.toFixed(3));
    } else {
        debouncedSetLegacyLensPowerVar(visualPower01);
    }
}

function _handleDialAUpdateForLensHue(payload) {
    if (getAppStatus() === 'loading' || getAppStatus() === 'error') return; 

    if (payload && payload.id === 'A' && payload.state) {
        const newMasterHue = ((payload.state.hue % 360) + 360) % 360;
        const hueDiff = Math.abs(newMasterHue - currentMasterHue);
        const effectiveHueDiff = Math.min(hueDiff, 360 - hueDiff); 

        if (effectiveHueDiff >= HUE_UPDATE_THRESHOLD) {
            currentMasterHue = newMasterHue;
            const currentVisualPower = smoothedTrueLensPower.value + (isOscillating ? calculateOscillationOffset(performance.now()) : 0);
            directUpdateLensVisuals(currentVisualPower); 
        }
    }
}

function _updateLensVisualsWithCurrentState(forceLegacyUpdate = false) {
    const currentVisualPower01 = smoothedTrueLensPower.value + (isOscillating ? calculateOscillationOffset(performance.now()) : 0);
    _setLegacyLensPowerVar(currentVisualPower01, forceLegacyUpdate);
    _updateLensGradientVisuals(currentVisualPower01);
}

function _updateLensGradientVisuals(currentVisualPower01) {
    if (!lensGradientElement) return;

    const appStatus = getAppStatus();
    const powerIsEffectivelyZero = currentVisualPower01 <= 0.0001;

    if (appStatus === 'loading' || (appStatus === 'starting-up' && powerIsEffectivelyZero && getDialState('B')?.hue <=0.0001) ) {
        if (lensGradientElement.style.opacity !== '0') {
            lensGradientElement.style.opacity = '0';
        }
        if (lensGradientElement.style.background !== 'none') {
            lensGradientElement.style.background = 'none';
            lastAppliedGradientString = "none";
        }
        lastVisualPowerForGradientRender = currentVisualPower01;
        return;
    }
    if (appStatus === 'error') {
        if (lensGradientElement.style.opacity !== '0') lensGradientElement.style.opacity = '0';
        if (lensGradientElement.style.background !== 'none') {
            lensGradientElement.style.background = 'none';
            lastAppliedGradientString = "none";
        }
        lastVisualPowerForGradientRender = currentVisualPower01;
        return;
    }

    if (lensGradientElement.style.opacity !== '1') {
        lensGradientElement.style.opacity = '1';
    }

    const powerChangedSignificantly = Math.abs(currentVisualPower01 - lastVisualPowerForGradientRender) >= 0.0001;
    const hueChangedSignificantly = Math.abs(currentMasterHue - lastHueForGradientRender) >= HUE_UPDATE_THRESHOLD;
    let needsGradientStringUpdate = powerChangedSignificantly || hueChangedSignificantly;

    if (powerIsEffectivelyZero) {
        if (lastAppliedGradientString === "none" || lastVisualPowerForGradientRender > 0.0001) {
            needsGradientStringUpdate = true;
        }
    }
    
    if (!needsGradientStringUpdate && lastAppliedGradientString !== "" && lastAppliedGradientString !== "none") {
        lastVisualPowerForGradientRender = currentVisualPower01;
        return;
    }

    const powerForBreakpointSelection = Math.max(LENS_GRADIENT_BREAKPOINTS[0].power, currentVisualPower01);
    let prevBreakpoint = LENS_GRADIENT_BREAKPOINTS[0]; 
    let nextBreakpoint = LENS_GRADIENT_BREAKPOINTS[0];

    for (let i = 0; i < LENS_GRADIENT_BREAKPOINTS.length; i++) {
        if (powerForBreakpointSelection <= LENS_GRADIENT_BREAKPOINTS[i].power) {
            nextBreakpoint = LENS_GRADIENT_BREAKPOINTS[i];
            prevBreakpoint = (i > 0) ? LENS_GRADIENT_BREAKPOINTS[i - 1] : LENS_GRADIENT_BREAKPOINTS[0];
            break;
        }
        if (i === LENS_GRADIENT_BREAKPOINTS.length - 1) { 
            prevBreakpoint = LENS_GRADIENT_BREAKPOINTS[i]; 
            nextBreakpoint = LENS_GRADIENT_BREAKPOINTS[i];
        }
    }

    let t = 0; 
    if (nextBreakpoint.power > prevBreakpoint.power) {
        const clampedVisualPower = Math.max(prevBreakpoint.power, Math.min(currentVisualPower01, nextBreakpoint.power));
        t = (clampedVisualPower - prevBreakpoint.power) / (nextBreakpoint.power - prevBreakpoint.power);
        t = Math.max(0, Math.min(t, 1));
    } else if (currentVisualPower01 <= prevBreakpoint.power) { 
        t = 0; 
    } else { 
        t = 1;
    }
    
    if (powerIsEffectivelyZero) { 
        t = 0;
        prevBreakpoint = LENS_GRADIENT_BREAKPOINTS[0]; 
        nextBreakpoint = LENS_GRADIENT_BREAKPOINTS[0];
    }

    const gradientStopStrings = [];
    for (let i = 0; i < NUM_LENS_GRADIENT_STOPS; i++) {
        const prevStop = prevBreakpoint.stops[i]; 
        const nextStop = nextBreakpoint.stops[i];
        if (!prevStop || !nextStop) { 
            console.warn(`[LensManager] Missing stop data at index ${i} for power ${currentVisualPower01}`);
            gradientStopStrings.push(`oklch(0 0 0) 0%`); 
            continue; 
        }
        const l = prevStop.l + t * (nextStop.l - prevStop.l); 
        const c = prevStop.c + t * (nextStop.c - prevStop.c); 
        const pos = prevStop.pos + t * (nextStop.pos - prevStop.pos);
        let stopHue = (prevStop.type === 'hotspot') ? (currentMasterHue + LENS_HOTSPOT_HUE_OFFSET) : (prevStop.type === 'main' ? currentMasterHue : 0);
        stopHue = ((stopHue % 360) + 360) % 360; 
        gradientStopStrings.push(`oklch(${l.toFixed(3)} ${c.toFixed(3)} ${stopHue.toFixed(1)}) ${(pos * 100).toFixed(2)}%`);
    }

    const lastDefinedPos = LENS_GRADIENT_BREAKPOINTS[0].stops[NUM_LENS_GRADIENT_STOPS - 1].pos * 100;
    if (lastDefinedPos < 99.9) {
         gradientStopStrings.push(`oklch(0 0 0 / 0) 100%`);
    }
    
    const finalGradientString = `radial-gradient(circle at 50% 50%, ${gradientStopStrings.join(", ")})`;

    if (lensGradientElement.style.background !== finalGradientString) {
        lensGradientElement.style.background = finalGradientString;
    }
    lastAppliedGradientString = finalGradientString;
    lastVisualPowerForGradientRender = currentVisualPower01; 
    lastHueForGradientRender = currentMasterHue;
}


function _handleTrueLensPowerChange(newTruePower01Value) {
    trueLensPowerTarget = newTruePower01Value; 
    if (powerSmoothingTween) powerSmoothingTween.kill(); 

    const appIsStartingUp = getAppStatus() === 'starting-up';
    const dialBIsIdle = getDialBInteractionState() === 'idle';

    if (appIsStartingUp || !dialBIsIdle) { 
        smoothedTrueLensPower.value = trueLensPowerTarget;
        if (!isOscillating) _updateLensVisualsWithCurrentState(true); 
    } else { 
        powerSmoothingTween = gsap.to(smoothedTrueLensPower, {
            value: trueLensPowerTarget, duration: LENS_OSCILLATION_SMOOTHING_DURATION, ease: "power1.out",
            onUpdate: () => { if (!isOscillating) _updateLensVisualsWithCurrentState(); },
            onComplete: () => {
                powerSmoothingTween = null;
                if (!isOscillating) _updateLensVisualsWithCurrentState(true); 
                if (getAppStatus() === 'interactive' && smoothedTrueLensPower.value >= LENS_OSCILLATION_THRESHOLD && !isOscillating) {
                    _startOscillation();
                }
            }
        });
    }
    if ((trueLensPowerTarget < LENS_OSCILLATION_THRESHOLD || !dialBIsIdle || appIsStartingUp) && isOscillating) {
        _stopOscillation();
    }
    if (getAppStatus() === 'interactive' && dialBIsIdle && smoothedTrueLensPower.value >= LENS_OSCILLATION_THRESHOLD && !isOscillating) {
        _startOscillation();
    }
}

function _handleDialBInteractionChange(newState) {
    if (newState === 'dragging' || newState === 'settling') {
        if (isOscillating) _stopOscillation();
        if (powerSmoothingTween) powerSmoothingTween.kill();
        smoothedTrueLensPower.value = getTrueLensPower(); 
        _updateLensVisualsWithCurrentState(true); 
    } else if (newState === 'idle') { 
        _handleTrueLensPowerChange(getTrueLensPower()); 
    }
}

function _handleAppStatusChangeForLens(newStatus) {
    if (newStatus === 'loading' || newStatus === 'error') {
        if (isOscillating) _stopOscillation();
        if (powerSmoothingTween) powerSmoothingTween.kill();
        smoothedTrueLensPower.value = 0; 
        trueLensPowerTarget = 0; 
        _updateLensGradientVisuals(0); 
        _setLegacyLensPowerVar(0, true); 
        return;
    }
    
    _updateLensVisualsWithCurrentState(true);

    if (newStatus === 'interactive') {
        if (getDialBInteractionState() === 'idle' && smoothedTrueLensPower.value >= LENS_OSCILLATION_THRESHOLD && !isOscillating) {
            _startOscillation();
        }
    } else { 
        if (isOscillating) _stopOscillation();
        if (newStatus === 'starting-up' && powerSmoothingTween) {
             powerSmoothingTween.kill(); 
        }
    }
}

function _startOscillation() { 
    if (isOscillating || getAppStatus() !== 'interactive' || getDialBInteractionState() !== 'idle') return;
    isOscillating = true; oscillationStartTime = performance.now();
    _oscillationLoop(performance.now()); 
}
function _stopOscillation() { 
    if (!isOscillating) return;
    isOscillating = false; if (oscillationFrameId) cancelAnimationFrame(oscillationFrameId);
    oscillationFrameId = null; 
    _updateLensVisualsWithCurrentState(true); 
}
function calculateOscillationOffset(timestamp) { 
    if (!isOscillating) return 0;
    const elapsedTime = (timestamp - oscillationStartTime) / 1000; 
    const powerAboveThreshold = Math.max(0, smoothedTrueLensPower.value - LENS_OSCILLATION_THRESHOLD);
    const maxPowerRange = 1.0 - LENS_OSCILLATION_THRESHOLD; 
    const powerRatio = maxPowerRange > 0 ? Math.min(1, powerAboveThreshold / maxPowerRange) : 0;
    const amplitude = LENS_OSCILLATION_AMPLITUDE_MIN + powerRatio * LENS_OSCILLATION_AMPLITUDE_MAX_ADDITION;
    const period = mapRange(powerRatio, 0, 1, LENS_OSCILLATION_PERIOD_AT_THRESHOLD, LENS_OSCILLATION_PERIOD_AT_MAX_POWER);
    if (period <= 0.001) return 0; 
    return Math.sin((2 * Math.PI / period) * elapsedTime) * amplitude;
}
function _oscillationLoop(timestamp) {
    if (!isOscillating) return;
    _updateLensVisualsWithCurrentState(); 
    oscillationFrameId = requestAnimationFrame(_oscillationLoop); 
}