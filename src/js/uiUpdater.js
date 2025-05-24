/**
 * @module uiUpdater (REFACTOR-V2.1)
 * ...
 */

import {
    subscribe,
    getDialState,
    getTargetColorProperties,
    getTrueLensPower,
    getAppStatus,
    getCurrentStartupPhaseNumber 
} from './appState.js';
import { createAdvancedFlicker } from './animationUtils.js';

const uiElements = {
  root: document.documentElement,
  body: document.body,
  logoContainer: null,
  lcdA: null,
  lcdB: null,
  terminalLcdContentElement: null,
  terminalContainer: null 
};
let lastLcdValues = { A: null, B: null };
let localConfigModule = null;
let localGsap = null;
let debugLcd = true; 

const MANAGED_LCD_CLASSES = ['lcd--unlit', 'js-active-dim-lcd', 'lcd--dimly-lit'];

export function init(elements, configModuleParam, gsapInstance) {
  if (debugLcd) console.log("[UIUpdater INIT] Initializing...");
  Object.assign(uiElements, elements);
  localConfigModule = configModuleParam;
  localGsap = gsapInstance;

  if (!localGsap) console.error("[UIUpdater INIT] CRITICAL: GSAP instance not provided.");
  if (!localConfigModule) console.error("[UIUpdater INIT] CRITICAL: configModule not provided.");

  const requiredElementKeys = ['logoContainer', 'lcdA', 'lcdB', 'terminalLcdContentElement', 'terminalContainer'];
  for (const key of requiredElementKeys) {
      if (!uiElements[key]) {
          console.warn(`[UIUpdater INIT] Warning: Optional element reference "${key}" was not provided.`);
      }
  }

  try {
      subscribe('themeChanged', handleThemeChange);
      subscribe('dialUpdated', handleDialUpdateForLcdA); 
      subscribe('dialUpdated', handleDialAUpdateForUIAccentAndLogoSwatch);
      subscribe('targetColorChanged', handleTargetColorChangeForDynamicCSSVars);
      subscribe('trueLensPowerChanged', handleTrueLensPowerChangeForLcdB); 
      subscribe('appStatusChanged', handleAppStatusChange);
      subscribe('startupPhaseNumberChanged', handleStartupPhaseNumberChange); 
  } catch (error) {
      console.error("[UIUpdater INIT] Error subscribing to appState events.", error);
      return;
  }

  injectLogoSVG();
  applyInitialDynamicCSSVars();
  applyInitialLcdStates(); 
  if (debugLcd) console.log("[UIUpdater INIT] Initialization complete.");
}

export function setLcdState(lcdElementOrContainer, stateName, options = {}) {
    const { skipClassChange = false, useFlicker = false, flickerProfileName = 'lcdScreenFlickerToDimlyLit', onComplete, phaseContext = "UnknownPhase" } = options;

    const targetIdForLog = lcdElementOrContainer ? (lcdElementOrContainer.id || lcdElementOrContainer.classList[0] || 'UnknownLCDContainer') : 'NullElement';
    if (debugLcd) console.log(`[UIUpdater setLcdState - ${targetIdForLog} - ${phaseContext}] Called. Target State: '${stateName}', Flicker: ${useFlicker}, Profile: '${flickerProfileName}'. Current classes: '${lcdElementOrContainer?.className}'`);

    if (!localGsap) { 
        console.error(`[UIUpdater setLcdState - ${targetIdForLog} - ${phaseContext}] localGsap not initialized.`);
        if (onComplete) setTimeout(onComplete, 0); 
        return { timeline: null, completionPromise: Promise.resolve() };
    }

    if (!lcdElementOrContainer) {
        console.warn(`[UIUpdater setLcdState - ${targetIdForLog} - ${phaseContext}] Attempted to set state on null element. Requested state: ${stateName}`);
        if (onComplete) localGsap.delayedCall(0, onComplete);
        return { timeline: localGsap.timeline().to({}, {duration: 0.001}), completionPromise: Promise.resolve() };
    }

    let screenElement = lcdElementOrContainer;
    let textValueSpan = null; 
    let contentAreaElement = null; 

    if (lcdElementOrContainer.classList.contains('hue-lcd-display')) { 
        textValueSpan = lcdElementOrContainer.querySelector('.lcd-value');
    } else if (lcdElementOrContainer.classList.contains('actual-lcd-screen-element')) { 
        contentAreaElement = uiElements.terminalLcdContentElement;
    } else if (lcdElementOrContainer.id === 'terminal-lcd-content') { 
        screenElement = uiElements.terminalContainer; 
        contentAreaElement = lcdElementOrContainer;
    } else {
        console.warn(`[UIUpdater setLcdState - ${targetIdForLog} - ${phaseContext}] Unknown LCD element structure.`);
        textValueSpan = lcdElementOrContainer.querySelector('.lcd-value') || lcdElementOrContainer;
    }

    let flickerResult = { timeline: localGsap.timeline().to({}, {duration: 0.001}), completionPromise: Promise.resolve() };

    if (!skipClassChange) {
        const oldClasses = Array.from(screenElement.classList);
        let classesActuallyChanged = false;
        MANAGED_LCD_CLASSES.forEach(cls => {
            if (screenElement.classList.contains(cls)) {
                screenElement.classList.remove(cls);
                classesActuallyChanged = true;
            }
        });
        if (debugLcd && classesActuallyChanged) console.log(`[UIUpdater setLcdState - ${targetIdForLog} - ${phaseContext}] Cleared managed classes. Was: '${oldClasses.join(' ')}', Now: '${screenElement.className}'`);
    }
    
    const profile = localConfigModule.ADVANCED_FLICKER_PROFILES[flickerProfileName];
    const profileStartsFromUnlit = profile?.amplitudeStart === 0.0;

    if (useFlicker && profileStartsFromUnlit) {
        if (debugLcd) console.log(`[UIUpdater setLcdState - ${targetIdForLog} - ${phaseContext}] Profile ${flickerProfileName} starts from unlit. Setting autoAlpha:0 and text opacity:0 PRE-FLICKER.`);
        localGsap.set(screenElement, { autoAlpha: 0, immediateRender: true });
        if (textValueSpan) {
            localGsap.set(textValueSpan, { opacity: 0, immediateRender: true });
        }
    }


    if (useFlicker && (stateName === 'lcd--dimly-lit' || stateName === 'js-active-dim-lcd')) {
        if (debugLcd) console.log(`[UIUpdater setLcdState - ${targetIdForLog} - ${phaseContext}] Using flicker.`);
        
        if (!skipClassChange && stateName && stateName !== 'active' && MANAGED_LCD_CLASSES.includes(stateName)) {
            if (!screenElement.classList.contains(stateName)) {
                screenElement.classList.add(stateName);
                 if (debugLcd) console.log(`[UIUpdater setLcdState - ${targetIdForLog} - ${phaseContext}] Added class '${stateName}' for flicker.`);
            }
        }
        screenElement.classList.add('is-flickering'); 

        flickerResult = createAdvancedFlicker(
            screenElement,
            flickerProfileName,
            {
                gsapInstance: localGsap, 
                onStart: () => {
                    if (debugLcd) console.log(`[UIUpdater setLcdState Flicker - ${targetIdForLog} - ${phaseContext}] Flicker timeline START. Screen autoAlpha: ${localGsap.getProperty(screenElement, "autoAlpha")}`);
                },
                onTimelineComplete: () => {
                    screenElement.classList.remove('is-flickering'); 
                    if (debugLcd) console.log(`[UIUpdater setLcdState Flicker - ${targetIdForLog} - ${phaseContext}] Flicker timeline COMPLETE. Screen autoAlpha: ${localGsap.getProperty(screenElement, "autoAlpha")}`);
                    if (!skipClassChange) { 
                        MANAGED_LCD_CLASSES.forEach(cls => { if (stateName !== cls && screenElement.classList.contains(cls)) screenElement.classList.remove(cls); });
                        if (stateName && stateName !== 'active' && MANAGED_LCD_CLASSES.includes(stateName)) {
                           if(!screenElement.classList.contains(stateName)) screenElement.classList.add(stateName);
                        }
                         if (debugLcd) console.log(`[UIUpdater setLcdState Flicker - ${targetIdForLog} - ${phaseContext}] Screen classes post-flicker: '${screenElement.className}'`);
                    }
                    updateLcdTextAndVisibility(screenElement, textValueSpan, contentAreaElement, phaseContext, stateName, true); 
                    if (onComplete) onComplete();
                }
            }
        );
    } else { 
        if (!skipClassChange && stateName && stateName !== 'active' && MANAGED_LCD_CLASSES.includes(stateName)) {
            if (!screenElement.classList.contains(stateName)) {
                screenElement.classList.add(stateName);
                if (debugLcd) console.log(`[UIUpdater setLcdState - ${targetIdForLog} - ${phaseContext}] Added class '${stateName}' (no flicker).`);
            }
        }
        if (stateName === 'active' && localGsap.getProperty(screenElement, "autoAlpha") < 1) {
            localGsap.set(screenElement, {autoAlpha: 1});
            if (debugLcd) console.log(`[UIUpdater setLcdState - ${targetIdForLog} - ${phaseContext}] Set autoAlpha:1 for 'active' state.`);
        }

        if (debugLcd) console.log(`[UIUpdater setLcdState - ${targetIdForLog} - ${phaseContext}] Not using flicker. State: ${stateName}`);
        updateLcdTextAndVisibility(screenElement, textValueSpan, contentAreaElement, phaseContext, stateName, true); 
        if (onComplete) localGsap.delayedCall(0, onComplete);
    }
    return flickerResult;
}

function updateLcdTextAndVisibility(screenElement, textValueSpan, contentAreaElement, phaseContext, targetStateName, forceGsapSet = false) {
    const targetIdForLog = screenElement.id || screenElement.classList[0] || 'UnknownLCDContainer';
    if (debugLcd) console.log(`[UIUpdater updateLcdTextAndVisibility - ${targetIdForLog} - ${phaseContext}] Called. TargetState: '${targetStateName}', forceGsapSet: ${forceGsapSet}`);

    const appStatus = getAppStatus();
    const currentPhase = getCurrentStartupPhaseNumber();
    let shouldTextBeVisible = false; 
    let shouldContentAreaBeVisible = false; 

    if (targetStateName === 'active') {
        shouldTextBeVisible = true;
        shouldContentAreaBeVisible = true;
    } else if (targetStateName === 'lcd--dimly-lit' || targetStateName === 'js-active-dim-lcd') {
        const isReadyForDimlyLit = (appStatus === 'interactive' || (appStatus === 'starting-up' && currentPhase >= 6));
        shouldTextBeVisible = isReadyForDimlyLit;
        shouldContentAreaBeVisible = isReadyForDimlyLit;
    } else if (targetStateName === 'lcd--unlit') {
        if (screenElement === uiElements.terminalContainer && contentAreaElement && contentAreaElement.childElementCount > 0) {
            shouldContentAreaBeVisible = true; 
            if (debugLcd) console.log(`[UIUpdater updateLcdTextAndVisibility - TERMINAL - ${phaseContext}] Screen is 'lcd--unlit' but content has children. Forcing contentArea visible.`);
        } else {
            shouldContentAreaBeVisible = false;
        }
        shouldTextBeVisible = false; 
    } else if (appStatus === 'starting-up' && currentPhase >= 6) { 
         shouldTextBeVisible = true;
         shouldContentAreaBeVisible = true;
    }

    if (textValueSpan) { // Dial LCDs
        const dialId = screenElement === uiElements.lcdA ? 'A' : 'B';
        let textContent = "";
        if (shouldTextBeVisible) {
            if (dialId === 'A') {
                const dialAState = getDialState('A');
                textContent = dialAState ? Math.round(((dialAState.hue % 360) + 360) % 360).toString() : String(Math.round(localConfigModule.DEFAULT_DIAL_A_HUE));
            } else if (dialId === 'B') {
                textContent = `${Math.round(getTrueLensPower() * 100)}%`;
            }
        }
        if (debugLcd) console.log(`[UIUpdater updateLcdTextAndVisibility - DIAL ${dialId} - ${phaseContext}] shouldTextBeVisible: ${shouldTextBeVisible}, textContent: "${textContent}"`);
        updateLcdDisplay(screenElement, textContent, dialId); 

        const targetOpacity = shouldTextBeVisible ? 1 : 0;
        const currentOpacity = parseFloat(localGsap.getProperty(textValueSpan, "opacity"));

        if (forceGsapSet || Math.abs(currentOpacity - targetOpacity) > 0.01) {
            if (debugLcd) console.log(`[UIUpdater updateLcdTextAndVisibility - DIAL ${dialId} - ${phaseContext}] ${forceGsapSet ? 'Forcing GSAP set' : 'Animating'} .lcd-value opacity to: ${targetOpacity}`);
            localGsap.set(textValueSpan, { 
                opacity: targetOpacity,
            });
        }
    }
    
    if (contentAreaElement && screenElement === uiElements.terminalContainer) { // Terminal
        const targetOpacity = shouldContentAreaBeVisible ? 1 : 0;
        localGsap.set(contentAreaElement, { opacity: targetOpacity, visibility: targetOpacity > 0 ? 'visible' : 'hidden' });
        if (debugLcd) console.log(`[UIUpdater updateLcdTextAndVisibility - TERMINAL - ${phaseContext}] Set #terminal-lcd-content opacity to ${targetOpacity}.`);
    }
}


export function setDialLcdActiveDimState(isActive) {
    const phaseCtx = `setDialLcdActiveDimState_isActive_${isActive}`;
    if (debugLcd) console.log(`[UIUpdater setDialLcdActiveDimState] Called with isActive: ${isActive}. PhaseContext: ${phaseCtx}`);
    const targetState = isActive ? 'js-active-dim-lcd' : 'lcd--unlit';
    
    if (uiElements.lcdA) {
        updateLcdTextAndVisibility(uiElements.lcdA, uiElements.lcdA.querySelector('.lcd-value'), null, phaseCtx, targetState, true);
    }
    if (uiElements.lcdB) {
        updateLcdTextAndVisibility(uiElements.lcdB, uiElements.lcdB.querySelector('.lcd-value'), null, phaseCtx, targetState, true);
    }
}


export function prepareLogoForFullTheme() {
    const logoSVG = uiElements.logoContainer?.querySelector('svg.logo-svg');
    if (logoSVG) {
        logoSVG.style.opacity = '';
    }
}
export function finalizeThemeTransition() {
    applyInitialDynamicCSSVars();
    if (getAppStatus() === 'interactive') {
        if (debugLcd) console.log("[UIUpdater finalizeThemeTransition] App is interactive. Setting LCDs to 'active'.");
        if (uiElements.lcdA) setLcdState(uiElements.lcdA, 'active', { phaseContext: 'FinalizeTheme_LcdA' });
        if (uiElements.lcdB) setLcdState(uiElements.lcdB, 'active', { phaseContext: 'FinalizeTheme_LcdB' });
        if (uiElements.terminalContainer) setLcdState(uiElements.terminalContainer, 'active', { phaseContext: 'FinalizeTheme_Terminal' });
    }
}

function updateDynamicCSSVar(targetKey, hueValue, isColorless) {
    const root = uiElements.root;
    if (!root) return;

    const normalizedHue = ((Number(hueValue) % 360) + 360) % 360;
    let chromaToSet;

    const contractDefaultChromaVarName = `--dynamic-${targetKey}-chroma`;
    const baseChromas = { env: 0.039, logo: 0.099, 'ui-accent': 0.20, btn: 0.15, lcd: 0.08 }; 
    const getCssVar = (varName, fallback) => {
        try {
            const val = getComputedStyle(root).getPropertyValue(varName).trim();
            return (val === "") ? fallback : (parseFloat(val) || fallback);
        } catch (e) { return fallback; }
    };
    const intendedActiveChroma = getCssVar(`--dynamic-${targetKey}-chroma-base`, baseChromas[targetKey] || 0.1);

    chromaToSet = isColorless ? 0 : intendedActiveChroma;

    const hueVarName = `--dynamic-${targetKey}-hue`;
    root.style.setProperty(hueVarName, normalizedHue.toFixed(1));
    root.style.setProperty(contractDefaultChromaVarName, chromaToSet.toFixed(4));
}

function updateLcdDisplay(lcdScreenElement, textContent, lcdId) {
    if (!lcdScreenElement) {
        if (debugLcd) console.warn(`[UIUpdater updateLcdDisplay] Attempted to update null LCD screen element for ID: ${lcdId}`);
        return;
    }
    if (lcdId === 'Terminal') return; 

    const valueSpan = lcdScreenElement.querySelector('.lcd-value');
    if (!valueSpan) {
        if (debugLcd) console.warn(`[UIUpdater updateLcdDisplay] .lcd-value span not found in LCD: ${lcdId}`);
        return;
    }
    
    if (valueSpan.textContent !== textContent) {
        valueSpan.textContent = textContent;
        if (debugLcd) console.log(`[UIUpdater updateLcdDisplay - ${lcdId}] Text content set to: "${textContent}"`);
    }
}

function handleDialUpdateForLcdA(payload) {
    if (!payload || payload.id !== 'A' || !payload.state) return;
    if (uiElements.lcdA) {
        const currentStateClass = getCurrentLcdStateClass(uiElements.lcdA);
        updateLcdTextAndVisibility(uiElements.lcdA, uiElements.lcdA.querySelector('.lcd-value'), null, 'DialAUpdate', currentStateClass);
    }
}
function handleTargetColorChangeForDynamicCSSVars(payload) {
    if (!payload || !payload.targetKey || typeof payload.hue !== 'number' || typeof payload.isColorless !== 'boolean') return;
    updateDynamicCSSVar(payload.targetKey, payload.hue, payload.isColorless);
}
function handleThemeChange(newTheme) {
    if (!uiElements.body) return;
    const currentPhase = getCurrentStartupPhaseNumber();
    const appStatus = getAppStatus();
    if (debugLcd) console.log(`[UIUpdater handleThemeChange] Theme changing to '${newTheme}'. CurrentPhase: ${currentPhase}, AppStatus: ${appStatus}`);

    uiElements.body.classList.remove('theme-dim', 'theme-dark', 'theme-light');
    uiElements.body.classList.add(`theme-${newTheme}`);
    
    // MODIFIED: Only call applyInitialLcdStates if not in the middle of P10 theme transition
    // and not when appStatus is 'loading' (initial setup).
    const isP10Transition = appStatus === 'starting-up' && currentPhase === 10 && uiElements.body.classList.contains('is-transitioning-from-dim');
    
    if (!isP10Transition && appStatus !== 'loading') {
        if (debugLcd) console.log(`[UIUpdater handleThemeChange] Calling applyInitialLcdStates after theme change to '${newTheme}'.`);
        applyInitialLcdStates(); 
    } else {
        if (debugLcd) console.log(`[UIUpdater handleThemeChange] Deferring applyInitialLcdStates for theme '${newTheme}'. P10 Transition: ${isP10Transition}, AppStatus: ${appStatus}`);
    }
}
function handleTrueLensPowerChangeForLcdB(newTruePower01) {
    if (uiElements.lcdB) {
        const currentStateClass = getCurrentLcdStateClass(uiElements.lcdB);
        updateLcdTextAndVisibility(uiElements.lcdB, uiElements.lcdB.querySelector('.lcd-value'), null, 'DialBUpdate_TrueLensPower', currentStateClass);
    }
}

function getCurrentLcdStateClass(screenElement) {
    if (!screenElement) return 'lcd--unlit';
    if (screenElement.classList.contains('lcd--unlit')) return 'lcd--unlit';
    if (screenElement.classList.contains('js-active-dim-lcd')) return 'js-active-dim-lcd'; 
    if (screenElement.classList.contains('lcd--dimly-lit')) return 'lcd--dimly-lit';
    
    const appStatus = getAppStatus();
    const currentPhase = getCurrentStartupPhaseNumber();
    if (appStatus === 'interactive' || (appStatus === 'starting-up' && currentPhase >=10)) return 'active';
    if (appStatus === 'starting-up' && currentPhase >=6) return 'lcd--dimly-lit'; 

    return 'lcd--unlit'; 
}


function handleAppStatusChange(newStatus) {
    if (debugLcd) console.log(`[UIUpdater handleAppStatusChange] New status: ${newStatus}`);
    // MODIFIED: Avoid calling applyInitialLcdStates if status is 'loading' as it's called at end of init.
    if (newStatus !== 'loading') {
        applyInitialLcdStates(); 
    }
    if (newStatus === 'starting-up') {
        const logoSVG = uiElements.logoContainer?.querySelector('svg.logo-svg');
        if (logoSVG && logoSVG.style.opacity !== '0.05') { 
            logoSVG.style.opacity = '0.05';
        }
    } else if (newStatus === 'interactive') {
        applyInitialDynamicCSSVars(); 
    }
}

function handleStartupPhaseNumberChange(newPhaseNumber) {
    if (debugLcd) console.log(`[UIUpdater handleStartupPhaseNumberChange] New phase number: ${newPhaseNumber}. AppStatus: ${getAppStatus()}`);
    if (newPhaseNumber >= 0 || (newPhaseNumber === -1 && getAppStatus() === 'loading')) { 
        applyInitialLcdStates(); 
    } else if (newPhaseNumber === -1 && getAppStatus() === 'starting-up') {
        if (debugLcd) console.log(`[UIUpdater handleStartupPhaseNumberChange] Phase is -1 during 'starting-up'. Deferring applyInitialLcdStates.`);
    }
}

// Exporting applyInitialLcdStates for explicit call in P10
export function applyInitialLcdStates() {
    const currentPhase = getCurrentStartupPhaseNumber();
    const appStatus = getAppStatus();
    if (debugLcd) console.log(`[UIUpdater applyInitialLcdStates] AppStatus: ${appStatus}, CurrentPhase: ${currentPhase}`);

    if (currentPhase === -1 && appStatus === 'starting-up') {
        if (debugLcd) console.log(`[UIUpdater applyInitialLcdStates] CurrentPhase is -1 during 'starting-up'. Deferring state changes.`);
        return;
    }

    const lcdsToUpdate = [
        { el: uiElements.lcdA, id: 'LcdA_ApplyInitial' },
        { el: uiElements.lcdB, id: 'LcdB_ApplyInitial' },
        { el: uiElements.terminalContainer, id: 'Terminal_ApplyInitial'}
    ];

    lcdsToUpdate.forEach(item => {
        if (!item.el) return;
        
        let targetStateKey = 'lcd--unlit'; 
        if (appStatus === 'interactive' || (appStatus === 'starting-up' && currentPhase >= 10)) { 
            targetStateKey = 'active';
        } else if (appStatus === 'starting-up' && currentPhase >= 6) { 
            // MODIFIED for P6 fix: Do not set Dial LCDs to 'lcd--dimly-lit' here if it's P6.
            // Let startupPhase6.js handle their flicker initiation.
            if (currentPhase === 6 && (item.el === uiElements.lcdA || item.el === uiElements.lcdB)) {
                if (debugLcd) console.log(`[UIUpdater applyInitialLcdStates - ${item.id}] Phase 6, deferring Dial LCD state. Current class: ${item.el.className}`);
                // If it's already unlit or active-dim, leave it. If it's dimly-lit from a previous P6 run (e.g. reset), clear it.
                if (item.el.classList.contains('lcd--dimly-lit')) {
                    item.el.classList.remove('lcd--dimly-lit');
                    if (debugLcd) console.log(`[UIUpdater applyInitialLcdStates - ${item.id}] Phase 6, removed lcd--dimly-lit for deferral.`);
                }
                // Ensure text is hidden if we are reverting to an unlit-like visual before P6 flicker
                const textValueSpan = item.el.querySelector('.lcd-value');
                if (textValueSpan && localGsap.getProperty(textValueSpan, "opacity") > 0) {
                    localGsap.set(textValueSpan, {opacity: 0});
                }
                return; // Skip calling setLcdState for Dial LCDs in P6 from here
            }
            targetStateKey = 'lcd--dimly-lit';
        } else if (appStatus === 'starting-up' && currentPhase >=0 && currentPhase < 6) { 
            targetStateKey = 'lcd--unlit';
        } else if (appStatus === 'loading' && currentPhase === -1) { 
            targetStateKey = 'lcd--unlit';
        }
        
        if (debugLcd) console.log(`[UIUpdater applyInitialLcdStates - ${item.id}] Target state for phase ${currentPhase}: ${targetStateKey}`);
        
        if (item.el.classList.contains('is-flickering')) {
            if (debugLcd) console.log(`[UIUpdater applyInitialLcdStates - ${item.id}] Flicker in progress for ${item.el.id || item.el.className}. Text/content visibility will be handled by flicker onComplete.`);
        } else {
            setLcdState(item.el, targetStateKey, { skipClassChange: false, phaseContext: `ApplyInitial_P${currentPhase}_${item.id}` });
        }
    });
}

function handleDialAUpdateForUIAccentAndLogoSwatch(payload) {
    if (payload && payload.id === 'A' && payload.state) {
        const newHue = ((payload.state.hue % 360) + 360) % 360;
        if (uiElements.root) {
            const defaultChromaStr = getComputedStyle(uiElements.root).getPropertyValue(`--dynamic-ui-accent-chroma-base`).trim();
            const defaultChroma = parseFloat(defaultChromaStr) || 0.20; 
            updateDynamicCSSVar('ui-accent', newHue, defaultChroma === 0);
        }
    }
}

function applyInitialDynamicCSSVars() {
    const dynamicTargets = ['env', 'lcd', 'logo', 'btn'];
    dynamicTargets.forEach(key => {
        const props = getTargetColorProperties(key);
        if (props) {
            updateDynamicCSSVar(key, props.hue, props.isColorless);
        }
    });
    const dialAState = getDialState('A');
    const defaultDialAHue = localConfigModule.DEFAULT_DIAL_A_HUE;
    const initialDialAHue = dialAState ? dialAState.hue : defaultDialAHue;
    if (uiElements.root) {
        const defaultChromaStr = getComputedStyle(uiElements.root).getPropertyValue(`--dynamic-ui-accent-chroma-base`).trim();
        const defaultChroma = parseFloat(defaultChromaStr) || 0.20;
        updateDynamicCSSVar('ui-accent', initialDialAHue, defaultChroma === 0);
    }
}

export function injectLogoSVG() {
  if (!uiElements.logoContainer) {
    console.error("[UIUpdater] logoContainer element not found for SVG injection.");
    return;
  }
  const existingLogoSvg = uiElements.logoContainer.querySelector('svg.logo-svg');
  if (existingLogoSvg) {
    if (document.body.classList.contains('theme-dim') || getAppStatus() === 'starting-up') {
        if (existingLogoSvg.style.opacity === '' || parseFloat(existingLogoSvg.style.opacity) > 0.05) {
             existingLogoSvg.style.opacity = '0.05';
        }
    } else if (existingLogoSvg.style.opacity === '0.05') {
        existingLogoSvg.style.opacity = '';
    }
    return;
  }

  const logoPath = './logo.svg'; 

  fetch(logoPath)
    .then(response => {
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status} for ${response.url}`);
        return response.text();
    })
    .then(svgData => {
        if (!svgData || !svgData.trim().startsWith('<svg')) throw new Error("Invalid or empty SVG data.");
        uiElements.logoContainer.innerHTML = svgData;
        const logoSVGElement = uiElements.logoContainer.querySelector('svg.logo-svg');
        if (logoSVGElement) {
            if (document.body.classList.contains('theme-dim') || getAppStatus() === 'starting-up') {
                logoSVGElement.style.opacity = '0.05';
            }
            const logoProps = getTargetColorProperties('logo');
            if (logoProps) updateDynamicCSSVar('logo', logoProps.hue, logoProps.isColorless);
        } else {
            console.error("[UIUpdater injectLogoSVG] SVG element NOT found after innerHTML set.");
            uiElements.logoContainer.innerHTML = '<p style="color:var(--theme-text-secondary-l, #ccc);text-align:center;font-size:0.8em;">Logo Element Not Found Post-Inject</p>';
        }
    })
    .catch(error => {
        console.error('[UIUpdater] Error fetching/injecting SVG logo:', error);
        uiElements.logoContainer.innerHTML = `<p style="color:var(--theme-text-secondary-l, #ccc);text-align:center;font-size:0.8em;">Logo Load Error: ${error.message}</p>`;
    });
}