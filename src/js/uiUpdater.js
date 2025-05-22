/**
 * @module uiUpdater (REFACTOR-V2.1)
 * ...
 */

import {
    subscribe,
    getDialState,
    getTargetColorProperties,
    getTrueLensPower,
    getAppStatus
} from './appState.js';
import { createAdvancedFlicker } from './animationUtils.js';
// GSAP instance will be passed to init and stored

const uiElements = {
  root: document.documentElement,
  body: document.body,
  logoContainer: null,
  lcdA: null,
  lcdB: null,
  terminalLcdContentElement: null // This is #terminal-lcd-content (the div inside .actual-lcd-screen-element)
};
let lastLcdValues = { A: null, B: null };
// let dialLcdsActiveDim = false; // This state is now primarily managed by classes on LCD elements
let localConfigModule = null;
let localGsap = null;

const MANAGED_LCD_CLASSES = ['lcd--unlit', 'js-active-dim-lcd', 'lcd--dimly-lit'];

export function init(elements, configModuleParam, gsapInstance) {
  console.log("[UIUpdater INIT] Initializing...");
  Object.assign(uiElements, elements);
  localConfigModule = configModuleParam;
  localGsap = gsapInstance;

  if (!localGsap) console.error("[UIUpdater INIT] CRITICAL: GSAP instance not provided.");
  if (!localConfigModule) console.error("[UIUpdater INIT] CRITICAL: configModule not provided.");

  const requiredElementKeys = ['logoContainer', 'lcdA', 'lcdB', 'terminalLcdContentElement'];
  for (const key of requiredElementKeys) {
      if (!uiElements[key]) {
          console.error(`[UIUpdater INIT] CRITICAL ERROR: Required element reference "${key}" was not provided.`);
          return;
      }
  }

  try {
      subscribe('themeChanged', handleThemeChange);
      subscribe('dialUpdated', handleDialUpdateForLcdA); // For Mood LCD
      subscribe('dialUpdated', handleDialAUpdateForUIAccentAndLogoSwatch);
      subscribe('targetColorChanged', handleTargetColorChangeForDynamicCSSVars);
      subscribe('trueLensPowerChanged', handleTrueLensPowerChangeForLcdB); // For Intensity LCD
      subscribe('appStatusChanged', handleAppStatusChange);
  } catch (error) {
      console.error("[UIUpdater INIT] Error subscribing to appState events.", error);
      return;
  }

  injectLogoSVG();
  applyInitialDynamicCSSVars();
  applyInitialLcdStates(); // Sets initial text and classes
  console.log("[UIUpdater INIT] Initialization complete.");
}

export function setLcdState(lcdElementOrContainer, stateName, options = {}) {
    const { skipClassChange = false, useFlicker = false, flickerProfileName = 'lcdScreenFlickerToDimlyLit', onComplete } = options;

    if (!lcdElementOrContainer) {
        console.warn(`[UIUpdater setLcdState] Attempted to set state on null element. Requested state: ${stateName}`);
        if (onComplete && localGsap) localGsap.delayedCall(0, onComplete);
        return { timeline: localGsap ? localGsap.timeline().to({}, {duration: 0.001}) : null, completionPromise: Promise.resolve() };
    }

    let screenElement = lcdElementOrContainer;
    let textValueSpan = null;

    if (lcdElementOrContainer.classList.contains('hue-lcd-display')) { // For Dial LCDs
        textValueSpan = lcdElementOrContainer.querySelector('.lcd-value');
    } else if (lcdElementOrContainer.classList.contains('actual-lcd-screen-element')) { // For Terminal screen
        // For terminal, the screenElement IS the container. Text is inside #terminal-lcd-content.
        // We don't manage terminal's textValueSpan opacity here directly; terminalManager does.
    } else if (lcdElementOrContainer.id === 'terminal-lcd-content') {
        screenElement = lcdElementOrContainer.parentElement.classList.contains('actual-lcd-screen-element')
            ? lcdElementOrContainer.parentElement
            : lcdElementOrContainer;
        // Text is lcdElementOrContainer itself, but opacity managed by terminalManager.
    } else {
        console.warn(`[UIUpdater setLcdState] Unknown LCD element structure for:`, lcdElementOrContainer);
        textValueSpan = lcdElementOrContainer.querySelector('.lcd-value') || lcdElementOrContainer;
    }
    const targetIdForLog = screenElement.id || screenElement.classList[0] || 'UnknownLCDContainer';
    // console.log(`[UIUpdater setLcdState] Target Screen: ${targetIdForLog}, Text Span: ${textValueSpan ? 'found' : 'NOT found'}, Requested State: '${stateName}', useFlicker: ${useFlicker}`);


    let flickerResult = { timeline: localGsap ? localGsap.timeline().to({}, {duration: 0.001}) : null, completionPromise: Promise.resolve() };

    if (!skipClassChange) {
        MANAGED_LCD_CLASSES.forEach(cls => {
            if (stateName !== cls) screenElement.classList.remove(cls);
        });
        if (stateName && stateName !== 'active' && MANAGED_LCD_CLASSES.includes(stateName)) {
            if (!screenElement.classList.contains(stateName)) screenElement.classList.add(stateName);
        }
    }
    // console.log(`[UIUpdater setLcdState] Screen ${targetIdForLog} classes after pre-flicker set: ${screenElement.className}`);

    if (useFlicker && (stateName === 'lcd--dimly-lit' || stateName === 'js-active-dim-lcd')) {
        // console.log(`[UIUpdater setLcdState] Initiating flicker for screen ${targetIdForLog} to ${stateName} using profile ${flickerProfileName}.`);
        if (textValueSpan && (screenElement === uiElements.lcdA || screenElement === uiElements.lcdB)) { // Only hide Dial LCD text
            localGsap.set(textValueSpan, { opacity: 0, immediateRender: true });
            // console.log(`[UIUpdater setLcdState] Dial LCD Text span for ${targetIdForLog} opacity set to 0 before screen flicker.`);
        }

        flickerResult = createAdvancedFlicker(
            screenElement,
            flickerProfileName,
            {
                onTimelineComplete: () => {
                    // console.log(`[UIUpdater setLcdState - FlickerComplete] Screen flicker for ${targetIdForLog} to ${stateName} complete.`);
                    if (!skipClassChange) {
                        MANAGED_LCD_CLASSES.forEach(cls => screenElement.classList.remove(cls));
                        if (stateName && stateName !== 'active' && MANAGED_LCD_CLASSES.includes(stateName)) {
                            screenElement.classList.add(stateName);
                        }
                    }
                    // console.log(`[UIUpdater setLcdState - FlickerComplete] Screen ${targetIdForLog} classes after flicker: ${screenElement.className}`);

                    if (screenElement === uiElements.lcdA || screenElement === uiElements.lcdB) {
                        const dialId = screenElement === uiElements.lcdA ? 'A' : 'B';
                        let textContent = "";
                        if (dialId === 'A') {
                            const dialAState = getDialState('A');
                            textContent = dialAState ? Math.round(((dialAState.hue % 360) + 360) % 360).toString() : String(Math.round(localConfigModule.DEFAULT_DIAL_A_HUE));
                        } else if (dialId === 'B') {
                            textContent = `${Math.round(getTrueLensPower() * 100)}%`;
                        }
                        updateLcdDisplay(screenElement, textContent, dialId);

                        if (textValueSpan) {
                            // console.log(`[UIUpdater setLcdState - FlickerComplete] Fading IN text for Dial LCD ${targetIdForLog} to: '${textContent}'`);
                            localGsap.to(textValueSpan, {
                                opacity: 1,
                                duration: localConfigModule.LCD_TEXT_FADE_IN_DURATION || 0.3,
                                ease: "power1.inOut"
                            });
                        }
                    } else if (screenElement.classList.contains('actual-lcd-screen-element')) { // Terminal screen
                        // console.log(`[UIUpdater setLcdState - FlickerComplete] Terminal screen ${targetIdForLog} flicker complete. Text content managed by TerminalManager.`);
                        // Ensure terminal content area (#terminal-lcd-content) is visible if its parent screen is dimly-lit
                        if (uiElements.terminalLcdContentElement) {
                             localGsap.set(uiElements.terminalLcdContentElement, { opacity: 1, visibility: 'visible' });
                        }
                    }
                    if (onComplete) onComplete();
                }
            }
        );
    } else {
        if (stateName === 'active' || stateName === 'lcd--unlit') {
            if (screenElement === uiElements.lcdA || screenElement === uiElements.lcdB) { // Dial LCDs
                const dialId = screenElement === uiElements.lcdA ? 'A' : 'B';
                let textContent = "";
                if (stateName === 'active') {
                    if (dialId === 'A') textContent = Math.round(((getDialState('A')?.hue % 360) + 360) % 360).toString();
                    else if (dialId === 'B') textContent = `${Math.round(getTrueLensPower() * 100)}%`;
                    if (textValueSpan) localGsap.set(textValueSpan, { opacity: 1 });
                } else { // lcd--unlit
                    if (textValueSpan) localGsap.set(textValueSpan, { opacity: 0 });
                }
                updateLcdDisplay(screenElement, textContent, dialId);
            } else if (screenElement.classList.contains('actual-lcd-screen-element')) { // Terminal screen
                 if (uiElements.terminalLcdContentElement) { // Manage opacity of the content div
                    localGsap.set(uiElements.terminalLcdContentElement, { opacity: (stateName === 'active' ? 1: 0) });
                 }
            }
        }
        if (onComplete && localGsap) localGsap.delayedCall(0, onComplete);
    }
    return flickerResult;
}


export function setDialLcdActiveDimState(isActive) {
    // This function might be less relevant if setLcdState handles the 'lcd--dimly-lit' state with flicker.
    // console.log(`[UIUpdater setDialLcdActiveDimState] Called with isActive: ${isActive}`);
    const appStatus = getAppStatus();
    const currentPhase = getCurrentPhaseNumber(); // You'll need to implement or import this helper

    // For Dial A
    const dialAState = getDialState('A');
    const defaultDialAHue = localConfigModule.DEFAULT_DIAL_A_HUE;
    let dialAText = "";
    // Text should appear from P6 (new sequence) onwards when LCDs become dimly-lit
    if (isActive || appStatus === 'interactive' || (appStatus === 'starting-up' && currentPhase >= 6)) {
        dialAText = dialAState ? Math.round(((dialAState.hue % 360) + 360) % 360).toString() : String(Math.round(defaultDialAHue));
    }
    updateLcdDisplay(uiElements.lcdA, dialAText, 'A');
    if (uiElements.lcdA.querySelector('.lcd-value')) {
        uiElements.lcdA.querySelector('.lcd-value').style.opacity = (dialAText === "") ? '0' : '1';
    }


    // For Dial B
    let dialBText = "";
    if (isActive || appStatus === 'interactive' || (appStatus === 'starting-up' && currentPhase >= 6)) {
        dialBText = `${Math.round(getTrueLensPower() * 100)}%`;
    }
    updateLcdDisplay(uiElements.lcdB, dialBText, 'B');
    if (uiElements.lcdB.querySelector('.lcd-value')) {
        uiElements.lcdB.querySelector('.lcd-value').style.opacity = (dialBText === "") ? '0' : '1';
    }
}

function getCurrentPhaseNumber() { // Helper to map FSM state to a numeric phase for logic
    const phaseStatusEl = document.getElementById('debug-phase-status');
    if (phaseStatusEl) {
        const text = phaseStatusEl.textContent; // e.g., "Done: Phase 0: System Idle / Baseline Setup" or "Running: Phase 1: Initializing Emergency Subsystems"
        if (text.includes("Idle")) return -1; // Before P0 active
        if (text.includes("All Complete")) return 99;

        const phaseMatch = text.match(/Phase (\d+):/i); // Matches "Phase P<number>:"
        if (phaseMatch && phaseMatch[1]) {
            return parseInt(phaseMatch[1], 10);
        }
        // Fallback for descriptive names if the number isn't in the debug string
        if (text.includes("startupPhaseP0")) return 0;
        if (text.includes("startupPhaseP1")) return 1;
        // ... add more specific fallbacks if needed for P10, P11 etc.
    }
    const status = getAppStatus();
    if (status === 'interactive') return 99;
    if (status === 'loading') return -2;
    if (status === 'starting-up' && !phaseStatusEl?.textContent.includes("Phase")) return -0.5; // Very early
    return 0; // Default if no specific phase identified
}


export function prepareLogoForFullTheme() {
    const logoSVG = uiElements.logoContainer?.querySelector('svg.logo-svg');
    if (logoSVG) {
        logoSVG.style.opacity = '';
        // console.log("[UIUpdater prepareLogoForFullTheme] Logo opacity cleared for full theme.");
    }
}
export function finalizeThemeTransition() {
    applyInitialDynamicCSSVars();
    // console.log("[UIUpdater finalizeThemeTransition] Theme transition finalized, dynamic CSS vars re-applied.");
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
        // console.warn(`[UIUpdater updateLcdDisplay - ${lcdId}] lcdScreenElement is null.`);
        return;
    }
    if (lcdId === 'Terminal') return; // Terminal content is managed by TerminalManager typing

    const valueSpan = lcdScreenElement.querySelector('.lcd-value');
    if (!valueSpan) {
        // console.warn(`[UIUpdater updateLcdDisplay - ${lcdId}] .lcd-value span not found in`, lcdScreenElement);
        return;
    }

    const appStatus = getAppStatus();
    let shouldBeBlank = false;
    const currentPhase = getCurrentPhaseNumber();

    if (appStatus === 'loading') {
        shouldBeBlank = true;
    } else if (appStatus === 'starting-up') {
        // Text for Dial LCDs should appear from P6 (new sequence) onwards
        if (currentPhase < 6) {
            shouldBeBlank = true;
        } else {
            if (lcdScreenElement.classList.contains('lcd--unlit')) {
                 shouldBeBlank = true;
            }
        }
    }

    const finalTextContent = shouldBeBlank ? "" : textContent;
    // console.log(`[UIUpdater updateLcdDisplay - ${lcdId}] Screen: ${lcdScreenElement.id}, AppStatus: ${appStatus}, Phase: ${currentPhase}, Classes: ${lcdScreenElement.className}, shouldBeBlank: ${shouldBeBlank}, Input text: '${textContent}', Final Text: '${finalTextContent}'`);

    if (valueSpan.textContent !== finalTextContent) {
        valueSpan.textContent = finalTextContent;
    }
    if (!shouldBeBlank && valueSpan.style.opacity === '0' && appStatus === 'interactive') {
        valueSpan.style.opacity = '1';
    }
}
function handleDialUpdateForLcdA(payload) {
    if (!payload || payload.id !== 'A' || !payload.state) return;
    const { state } = payload; const normalizedHue = ((state.hue % 360) + 360) % 360;
    if (uiElements.lcdA) {
        updateLcdDisplay(uiElements.lcdA, Math.round(normalizedHue).toString(), 'A');
    }
}
function handleTargetColorChangeForDynamicCSSVars(payload) {
    if (!payload || !payload.targetKey || typeof payload.hue !== 'number' || typeof payload.isColorless !== 'boolean') return;
    updateDynamicCSSVar(payload.targetKey, payload.hue, payload.isColorless);
}
function handleThemeChange(newTheme) {
    if (!uiElements.body) return;
    // console.log(`[UIUpdater handleThemeChange] Changing theme to: ${newTheme}`);
    uiElements.body.classList.remove('theme-dim', 'theme-dark', 'theme-light');
    uiElements.body.classList.add(`theme-${newTheme}`);
}
function handleTrueLensPowerChangeForLcdB(newTruePower01) {
    if (uiElements.lcdB) {
        updateLcdDisplay(uiElements.lcdB, `${Math.round(newTruePower01 * 100)}%`, 'B');
    }
}
function handleAppStatusChange(newStatus) {
    // console.log(`[UIUpdater handleAppStatusChange] New status: ${newStatus}`);
    if (newStatus === 'interactive') {
        setLcdState(uiElements.lcdA, 'active');
        setLcdState(uiElements.lcdB, 'active');
        if (uiElements.terminalLcdContentElement?.parentElement && uiElements.terminalLcdContentElement.parentElement.classList.contains('actual-lcd-screen-element')) {
            setLcdState(uiElements.terminalLcdContentElement.parentElement, 'active');
        }
        applyInitialDynamicCSSVars();
    } else if (newStatus === 'starting-up') {
        const logoSVG = uiElements.logoContainer?.querySelector('svg.logo-svg');
        if (logoSVG && logoSVG.style.opacity !== '0.05') {
            logoSVG.style.opacity = '0.05';
        }
        applyInitialLcdStates();
    } else if (newStatus === 'loading') {
        applyInitialLcdStates();
    }
}
function applyInitialLcdStates() {
    const currentPhase = getCurrentPhaseNumber();
    // console.log(`[UIUpdater applyInitialLcdStates] AppStatus: ${getAppStatus()}, CurrentPhase: ${currentPhase}`);

    if (getAppStatus() === 'loading' || (getAppStatus() === 'starting-up' && currentPhase < 6)) { // Text appears from P6
        setLcdState(uiElements.lcdA, 'lcd--unlit', { skipClassChange: false });
        setLcdState(uiElements.lcdB, 'lcd--unlit', { skipClassChange: false });
    }
    // Terminal screen's initial state (e.g. 'lcd--unlit' or 'js-active-dim-lcd' for P6 flicker) is handled by its specific phase.

    const dialAState = getDialState('A');
    const defaultDialAHue = localConfigModule.DEFAULT_DIAL_A_HUE;
    const dialAText = dialAState ? Math.round(((dialAState.hue % 360) + 360) % 360).toString() : String(Math.round(defaultDialAHue));
    updateLcdDisplay(uiElements.lcdA, dialAText, 'A');

    const dialBText = `${Math.round(getTrueLensPower() * 100)}%`;
    updateLcdDisplay(uiElements.lcdB, dialBText, 'B');
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
    // console.log("[UIUpdater applyInitialDynamicCSSVars] Applying all dynamic CSS variables.");
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

  const logoPath = 'logo.svg';

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
            // console.log("[UIUpdater injectLogoSVG] Logo SVG injected and styled.");
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