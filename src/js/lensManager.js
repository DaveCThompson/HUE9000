/**
 * @module lensManager (REFACTOR-V2.1)
 * @description Manages the visual lens power, including smoothing, oscillation,
 * and direct CSS variable updates for the lens gradient stops.
 * Reacts to changes in true lens power, Dial B interaction state, and Dial A hue from appState.
 * Includes console logging.
 */

// GSAP is accessed via window.gsap, which is populated by main.js import
import { 
    subscribe, 
    getTrueLensPower, 
    getDialBInteractionState, 
    getDialState, 
    getAppStatus, 
    setTrueLensPower as setTrueLensPowerInAppState,
    updateDialState as updateDialBStateInAppState 
} from './appState.js';
// Config constants will be accessed via configModule
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
let lensSuperGlowElement = null; 
let currentMasterHue = -1; 
let lastAppliedGradientString = ""; 
let lastVisualPowerForGradientRender = -1; 
let lastHueForGradientRender = -1; 
let lastSuperGlowHue = -1; 

let configModule = null; // Will store the configModule namespace object
let debouncedSetLegacyLensPowerVar = null; 
let localGsap = null; // Store passed GSAP instance


export function init(documentElement, colorLensGradientEl, cfgModule, gsapInstance) { 
    if (!documentElement || !colorLensGradientEl) {
        console.error("[LensManager INIT] CRITICAL ERROR: Missing documentElement or colorLensGradientEl.");
        return;
    }
    if (!cfgModule) { // Corrected check for cfgModule
        console.error("[LensManager INIT] CRITICAL ERROR: Missing configModule.");
        return;
    }
    if (!gsapInstance) {
        console.error("[LensManager INIT] CRITICAL ERROR: Missing GSAP instance.");
        return;
    }
    rootDocElement = documentElement;
    lensGradientElement = colorLensGradientEl;
    lensSuperGlowElement = document.getElementById('lens-super-glow'); 
    configModule = cfgModule; // Use cfgModule to avoid conflict with outer scope 'configModule'
    localGsap = gsapInstance;

    debouncedSetLegacyLensPowerVar = debounce((visualPower) => {
        if (!rootDocElement) return;
        const clampedPower = Math.max(0.0, Math.min(visualPower, 1.05)); 
        rootDocElement.style.setProperty('--lens-power', clampedPower.toFixed(3));
    }, configModule.DEBOUNCE_DELAY / 3);


    if (!lensSuperGlowElement) {
        console.warn("[LensManager INIT] Optional #lens-super-glow element not found.");
    }

    const initialPower01 = getTrueLensPower(); 
    const initialDialAState = getDialState('A');
    currentMasterHue = initialDialAState ? ((initialDialAState.hue % 360) + 360) % 360 : configModule.DEFAULT_DIAL_A_HUE;
    lastHueForGradientRender = currentMasterHue; 
    _updateSuperGlowHue(currentMasterHue); 

    smoothedTrueLensPower.value = initialPower01;
    trueLensPowerTarget = initialPower01;
    
    directUpdateLensVisuals(initialPower01);

    subscribe('trueLensPowerChanged', _handleTrueLensPowerChange);
    subscribe('dialBInteractionChange', _handleDialBInteractionChange);
    subscribe('dialUpdated', _handleDialAUpdateForLensHue); 
    subscribe('appStatusChanged', _handleAppStatusChangeForLens); 
    console.log(`[LensManager INIT] Initialized. Initial masterHue: ${currentMasterHue.toFixed(1)}`);
}

export function energizeLensCoreStartup(targetPowerPercent = null, rampDurationMs = null) {
    const effectiveTargetPower = targetPowerPercent !== null ? targetPowerPercent : configModule.LENS_STARTUP_TARGET_POWER;
    const effectiveRampDuration = rampDurationMs !== null ? rampDurationMs : configModule.LENS_STARTUP_RAMP_DURATION;

    const tl = localGsap.timeline(); 
    const initialPower01 = getTrueLensPower(); 
    const lensPowerProxy = { value: initialPower01 * 100 }; 

    if (initialPower01 <= 0.0001 && lensGradientElement) {
        _updateLensGradientVisuals(0.0); 
    }

    tl.to(lensPowerProxy, {
        value: effectiveTargetPower,
        duration: effectiveRampDuration / 1000, 
        ease: "sine.inOut",
        onStart: () => { 
            if (lensGradientElement && lensGradientElement.style.opacity !== '1' && getAppStatus() !== 'loading' && getAppStatus() !== 'error') {
                lensGradientElement.style.opacity = '1';
            }
        },
        onUpdate: function() { 
            setTrueLensPowerInAppState(this.targets()[0].value); 
        },
        onComplete: () => { 
            const finalPowerPercent = lensPowerProxy.value; 
            setTrueLensPowerInAppState(finalPowerPercent);
            
            const dialBHue = (finalPowerPercent / 100) * 359.999;
            const dialBRotation = dialBHue * configModule.DIAL_B_VISUAL_ROTATION_PER_HUE_DEGREE_CONFIG;
            
            const currentDialBState = getDialState('B') || {};
            updateDialBStateInAppState('B', {
                hue: dialBHue,
                targetHue: dialBHue,
                rotation: dialBRotation,
                targetRotation: dialBRotation,
                isDragging: currentDialBState.isDragging || false 
            });
        }
    });
    return tl;
}

export function directUpdateLensVisuals(visualPower01) {
    _updateLensGradientVisuals(visualPower01); 
    _setLegacyLensPowerVar(visualPower01, true); 
}

function _setLegacyLensPowerVar(visualPower01, forceImmediate = false) {
    if (!rootDocElement) return;
    if (forceImmediate) {
        const clampedPower = Math.max(0.0, Math.min(visualPower01, 1.05));
        rootDocElement.style.setProperty('--lens-power', clampedPower.toFixed(3));
    } else {
        if (debouncedSetLegacyLensPowerVar) { 
            debouncedSetLegacyLensPowerVar(visualPower01);
        } else { 
            const clampedPower = Math.max(0.0, Math.min(visualPower01, 1.05));
            rootDocElement.style.setProperty('--lens-power', clampedPower.toFixed(3));
            console.warn("[LensManager _setLegacyLensPowerVar] debouncedSetLegacyLensPowerVar not initialized, applying immediately.");
        }
    }
}

function _updateSuperGlowHue(hue) {
    if (!rootDocElement || !configModule) return;
    const normalizedHue = ((Number(hue) % 360) + 360) % 360;
    if (Math.abs(normalizedHue - lastSuperGlowHue) >= configModule.HUE_UPDATE_THRESHOLD || lastSuperGlowHue === -1) {
        rootDocElement.style.setProperty('--dynamic-lens-super-glow-hue', normalizedHue.toFixed(1));
        lastSuperGlowHue = normalizedHue;
    }
}

function _handleDialAUpdateForLensHue(payload) {
    if (getAppStatus() === 'loading' || getAppStatus() === 'error' || !configModule) return; 

    if (payload && payload.id === 'A' && payload.state) {
        const newMasterHue = ((payload.state.hue % 360) + 360) % 360;
        const hueDiff = Math.abs(newMasterHue - currentMasterHue);
        const effectiveHueDiff = Math.min(hueDiff, 360 - hueDiff); 

        if (effectiveHueDiff >= configModule.HUE_UPDATE_THRESHOLD) {
            currentMasterHue = newMasterHue;
            _updateSuperGlowHue(currentMasterHue); 
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
    if (!lensGradientElement || !configModule) return; 

    const appStatus = getAppStatus();
    const powerIsEffectivelyZero = currentVisualPower01 <= 0.0001;

    if (appStatus === 'loading' || (appStatus === 'starting-up' && powerIsEffectivelyZero && getDialState('B')?.hue <=0.0001) ) {
        if (lensGradientElement.style.opacity !== '0') lensGradientElement.style.opacity = '0';
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

    if (lensGradientElement.style.opacity !== '1') lensGradientElement.style.opacity = '1';

    const powerChangedSignificantly = Math.abs(currentVisualPower01 - lastVisualPowerForGradientRender) >= 0.0001;
    const hueChangedSignificantly = Math.abs(currentMasterHue - lastHueForGradientRender) >= configModule.HUE_UPDATE_THRESHOLD;
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

    const powerForBreakpointSelection = Math.max(configModule.LENS_GRADIENT_BREAKPOINTS[0].power, currentVisualPower01);
    let prevBreakpoint = configModule.LENS_GRADIENT_BREAKPOINTS[0]; 
    let nextBreakpoint = configModule.LENS_GRADIENT_BREAKPOINTS[0];

    for (let i = 0; i < configModule.LENS_GRADIENT_BREAKPOINTS.length; i++) {
        if (powerForBreakpointSelection <= configModule.LENS_GRADIENT_BREAKPOINTS[i].power) {
            nextBreakpoint = configModule.LENS_GRADIENT_BREAKPOINTS[i];
            prevBreakpoint = (i > 0) ? configModule.LENS_GRADIENT_BREAKPOINTS[i - 1] : configModule.LENS_GRADIENT_BREAKPOINTS[0];
            break;
        }
        if (i === configModule.LENS_GRADIENT_BREAKPOINTS.length - 1) { 
            prevBreakpoint = configModule.LENS_GRADIENT_BREAKPOINTS[i]; 
            nextBreakpoint = configModule.LENS_GRADIENT_BREAKPOINTS[i];
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
        prevBreakpoint = configModule.LENS_GRADIENT_BREAKPOINTS[0]; 
        nextBreakpoint = configModule.LENS_GRADIENT_BREAKPOINTS[0];
    }

    const gradientStopStrings = [];
    for (let i = 0; i < configModule.NUM_LENS_GRADIENT_STOPS; i++) {
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
        let stopHue = (prevStop.type === 'hotspot') ? (currentMasterHue + configModule.LENS_HOTSPOT_HUE_OFFSET) : (prevStop.type === 'main' ? currentMasterHue : 0);
        stopHue = ((stopHue % 360) + 360) % 360; 
        gradientStopStrings.push(`oklch(${l.toFixed(3)} ${c.toFixed(3)} ${stopHue.toFixed(1)}) ${(pos * 100).toFixed(2)}%`);
    }

    const lastDefinedPos = configModule.LENS_GRADIENT_BREAKPOINTS[0].stops[configModule.NUM_LENS_GRADIENT_STOPS - 1].pos * 100;
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
    if (!configModule || !localGsap) return;
    trueLensPowerTarget = newTruePower01Value; 
    if (powerSmoothingTween) powerSmoothingTween.kill(); 

    const appIsStartingUp = getAppStatus() === 'starting-up';
    const dialBIsIdle = getDialBInteractionState() === 'idle';

    if (appIsStartingUp || !dialBIsIdle) { 
        smoothedTrueLensPower.value = trueLensPowerTarget;
        if (!isOscillating) _updateLensVisualsWithCurrentState(true); 
    } else { 
        powerSmoothingTween = localGsap.to(smoothedTrueLensPower, { 
            value: trueLensPowerTarget, duration: configModule.LENS_OSCILLATION_SMOOTHING_DURATION, ease: "power1.out",
            onUpdate: () => { if (!isOscillating) _updateLensVisualsWithCurrentState(); },
            onComplete: () => {
                powerSmoothingTween = null;
                if (!isOscillating) _updateLensVisualsWithCurrentState(true); 
                if (getAppStatus() === 'interactive' && smoothedTrueLensPower.value >= configModule.LENS_OSCILLATION_THRESHOLD && !isOscillating) {
                    _startOscillation();
                }
            }
        });
    }
    if ((trueLensPowerTarget < configModule.LENS_OSCILLATION_THRESHOLD || !dialBIsIdle || appIsStartingUp) && isOscillating) {
        _stopOscillation();
    }
    if (getAppStatus() === 'interactive' && dialBIsIdle && smoothedTrueLensPower.value >= configModule.LENS_OSCILLATION_THRESHOLD && !isOscillating) {
        _startOscillation();
    }
}

function _handleDialBInteractionChange(newState) {
    if (!configModule) return;
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
    if (!configModule) return;
    if (newStatus === 'loading' || newStatus === 'error') {
        if (isOscillating) _stopOscillation();
        if (powerSmoothingTween) powerSmoothingTween.kill();
        smoothedTrueLensPower.value = 0; 
        trueLensPowerTarget = 0; 
        _updateLensGradientVisuals(0); 
        _setLegacyLensPowerVar(0, true); 
        if (lensSuperGlowElement) lensSuperGlowElement.style.opacity = '0'; 
        return;
    }
    
    _updateLensVisualsWithCurrentState(true);
    _updateSuperGlowHue(currentMasterHue); 

    if (newStatus === 'interactive') {
        if (getDialBInteractionState() === 'idle' && smoothedTrueLensPower.value >= configModule.LENS_OSCILLATION_THRESHOLD && !isOscillating) {
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
    if (!configModule) return;
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
    if (!isOscillating || !configModule) return 0;
    const elapsedTime = (timestamp - oscillationStartTime) / 1000; 
    const powerAboveThreshold = Math.max(0, smoothedTrueLensPower.value - configModule.LENS_OSCILLATION_THRESHOLD);
    const maxPowerRange = 1.0 - configModule.LENS_OSCILLATION_THRESHOLD; 
    const powerRatio = maxPowerRange > 0 ? Math.min(1, powerAboveThreshold / maxPowerRange) : 0;
    const amplitude = configModule.LENS_OSCILLATION_AMPLITUDE_MIN + powerRatio * configModule.LENS_OSCILLATION_AMPLITUDE_MAX_ADDITION;
    const period = mapRange(powerRatio, 0, 1, configModule.LENS_OSCILLATION_PERIOD_AT_THRESHOLD, configModule.LENS_OSCILLATION_PERIOD_AT_MAX_POWER);
    if (period <= 0.001) return 0; 
    return Math.sin((2 * Math.PI / period) * elapsedTime) * amplitude;
}
function _oscillationLoop(timestamp) {
    if (!isOscillating) return;
    _updateLensVisualsWithCurrentState(); 
    oscillationFrameId = requestAnimationFrame(_oscillationLoop); 
}