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
  terminalLcdContentElement: null 
};
let lastLcdValues = { A: null, B: null }; 
let dialLcdsActiveDim = false; 
let localConfigModule = null; 
let localGsap = null; // To store the passed GSAP instance

const MANAGED_LCD_CLASSES = ['lcd--unlit', 'js-active-dim-lcd', 'lcd--dimly-lit'];

export function init(elements, configModuleParam, gsapInstance) { // Added gsapInstance
  console.log("[UIUpdater INIT] Initializing...");
  Object.assign(uiElements, elements);
  localConfigModule = configModuleParam; 
  localGsap = gsapInstance; // Store passed GSAP

  if (!localGsap) {
    console.error("[UIUpdater INIT] CRITICAL: GSAP instance not provided.");
    // Potentially fallback or throw, but main.js should always pass it.
  }
  if (!localConfigModule) {
    console.error("[UIUpdater INIT] CRITICAL: configModule not provided.");
  }


  const requiredElementKeys = ['logoContainer', 'lcdA', 'lcdB', 'terminalLcdContentElement'];
  for (const key of requiredElementKeys) {
      if (!uiElements[key]) {
          console.error(`[UIUpdater INIT] CRITICAL ERROR: Required element reference "${key}" was not provided.`);
          return; 
      }
  }

  try {
      subscribe('themeChanged', handleThemeChange); 
      subscribe('dialUpdated', handleDialUpdateForLcdA); 
      subscribe('dialUpdated', handleDialAUpdateForUIAccentAndLogoSwatch); 
      subscribe('targetColorChanged', handleTargetColorChangeForDynamicCSSVars); 
      subscribe('trueLensPowerChanged', handleTrueLensPowerChangeForLcdB); 
      subscribe('appStatusChanged', handleAppStatusChange);
  } catch (error) {
      console.error("[UIUpdater INIT] Error subscribing to appState events.", error);
      return;
  }

  injectLogoSVG(); 

  console.log("[UIUpdater INIT] Applying initial UI states based on appState values.");
  applyInitialDynamicCSSVars(); 
  applyInitialLcdStates(); 
  console.log("[UIUpdater INIT] Initialization complete.");
}

export function setLcdState(lcdElement, stateName, options = {}) {
    const { skipClassChange = false, useP4Flicker = false, onComplete } = options;

    if (!lcdElement) {
        console.warn(`[UIUpdater setLcdState] Attempted to set state on null element. Requested state: ${stateName}`);
        if (onComplete && localGsap) localGsap.delayedCall(0, onComplete); 
        return null; 
    }
    
    let targetElementForClass = lcdElement;
    let targetIdForLog = lcdElement.id || 'UnknownLCD';

    // If the content element of the terminal is passed, target its parent for classes
    if (lcdElement.id === 'terminal-lcd-content' && lcdElement.parentElement && lcdElement.parentElement.classList.contains('actual-lcd-screen-element')) {
        targetElementForClass = lcdElement.parentElement;
        targetIdForLog = targetElementForClass.id || targetElementForClass.classList[0] || 'TerminalContainer'; 
    } else if (lcdElement.classList.contains('actual-lcd-screen-element')) {
        // If the container itself is passed (e.g. from startupSequenceManager for terminalContainer)
        targetElementForClass = lcdElement;
        targetIdForLog = lcdElement.id || 'TerminalContainer';
    }
    
    const oldClasses = targetElementForClass.className; 
    let animationTimeline = null;

    if (!skipClassChange) {
        MANAGED_LCD_CLASSES.forEach(cls => {
            if (stateName !== cls) { 
                targetElementForClass.classList.remove(cls);
            }
        });

        if (stateName && stateName !== 'active' && MANAGED_LCD_CLASSES.includes(stateName)) {
            if (!targetElementForClass.classList.contains(stateName)) {
                targetElementForClass.classList.add(stateName);
            }
        }
    }
    
    // console.log(`[UIUpdater setLcdState] Target: ${targetIdForLog}, Requested State: '${stateName || 'active'}', SkipClassChange: ${skipClassChange}, UseP4Flicker: ${useP4Flicker}. OldDOMClasses: '${oldClasses}', NewDOMClasses: '${targetElementForClass.className}'`);

    if (useP4Flicker && stateName === 'lcd--dimly-lit') { 
        // console.log(`[UIUpdater setLcdState] Initiating P4 flicker for ${targetIdForLog} to lcd--dimly-lit.`);
        animationTimeline = createAdvancedFlicker(
            targetElementForClass,
            'lcdP4Flicker', // Profile name from config
            {
                onStart: () => {
                    if (!skipClassChange && !targetElementForClass.classList.contains('lcd--dimly-lit')) {
                        targetElementForClass.classList.add('lcd--dimly-lit');
                    }
                },
                onComplete: () => {
                    // console.log(`[UIUpdater setLcdState] P4 Flicker complete for ${targetIdForLog}.`);
                    if (!targetElementForClass.classList.contains('lcd--dimly-lit')) {
                         targetElementForClass.classList.add('lcd--dimly-lit');
                    }
                    MANAGED_LCD_CLASSES.forEach(cls => { 
                        if (cls !== 'lcd--dimly-lit') targetElementForClass.classList.remove(cls);
                    });
                    if (onComplete) onComplete();
                }
            }
        );
    } else {
        if (onComplete && localGsap) localGsap.delayedCall(0, onComplete); 
    }
    return animationTimeline; 
}


export function setDialLcdActiveDimState(isActive) { 
    if (dialLcdsActiveDim !== isActive) {
        dialLcdsActiveDim = isActive;
        
        if (getAppStatus() === 'starting-up' && getCurrentPhaseNumber() < 4) {
            setLcdState(uiElements.lcdA, isActive ? 'js-active-dim-lcd' : 'lcd--unlit');
            setLcdState(uiElements.lcdB, isActive ? 'js-active-dim-lcd' : 'lcd--unlit');
        }
        
        const dialAState = getDialState('A');
        const defaultDialAHue = localConfigModule ? localConfigModule.DEFAULT_DIAL_A_HUE : 40.6;


        if (isActive || getAppStatus() === 'interactive' || (getAppStatus() === 'starting-up' && getCurrentPhaseNumber() >= 4) ) { 
            dialAText = dialAState ? Math.round(((dialAState.hue % 360) + 360) % 360).toString() : String(Math.round(defaultDialAHue));
        }
        updateLcdDisplay(uiElements.lcdA, dialAText, 'A');
        
        let dialBText = "";
        if(isActive || getAppStatus() === 'interactive' || (getAppStatus() === 'starting-up' && getCurrentPhaseNumber() >= 4)) { 
            dialBText = `${Math.round(getTrueLensPower() * 100)}%`;
        }
        updateLcdDisplay(uiElements.lcdB, dialBText, 'B');
    }
}

function getCurrentPhaseNumber() {
    const phaseStatusEl = document.getElementById('debug-phase-status');
    if (phaseStatusEl) {
        const text = phaseStatusEl.textContent;
        if (text.includes("Idle")) return -1; 
        if (text.includes("All Complete")) return 99; 
        const match = text.match(/P(\d+)/);
        if (match) return parseInt(match[1], 10);
    }
    const status = getAppStatus();
    if (status === 'interactive') return 99;
    if (status === 'loading') return -2; 
    return 0; 
}


export function prepareLogoForFullTheme() { 
    const logoSVG = uiElements.logoContainer?.querySelector('svg.logo-svg'); 
    if (logoSVG) { 
        logoSVG.style.opacity = ''; 
    }
}
export function finalizeThemeTransition() { 
    applyInitialDynamicCSSVars(); 
}

function updateDynamicCSSVar(targetKey, hueValue, isColorless) {
    const root = uiElements.root;
    if (!root) return;

    const normalizedHue = ((Number(hueValue) % 360) + 360) % 360;
    let chromaToSet;
    
    const contractDefaultChromaVarName = `--dynamic-${targetKey}-chroma`;
    
    let intendedActiveChroma;
    const getCssVar = (varName, fallback) => {
        try {
            const val = getComputedStyle(root).getPropertyValue(varName).trim();
            return parseFloat(val) || fallback; 
        } catch (e) {
            return fallback;
        }
    };

    switch (targetKey) {
        case 'env': intendedActiveChroma = getCssVar('--dynamic-env-chroma-base', 0.039); break;
        case 'logo': intendedActiveChroma = getCssVar('--dynamic-logo-chroma-base', 0.099); break;
        case 'ui-accent': intendedActiveChroma = getCssVar('--dynamic-ui-accent-chroma-base', 0.20); break;
        case 'btn': intendedActiveChroma = getCssVar('--dynamic-btn-chroma-base', 0.15); break; 
        case 'lcd': intendedActiveChroma = getCssVar('--dynamic-lcd-chroma-base', 0.08); break; 
        default: intendedActiveChroma = 0.1; 
    }
    
    chromaToSet = isColorless ? 0 : intendedActiveChroma;

    const hueVarName = `--dynamic-${targetKey}-hue`;

    const oldHue = root.style.getPropertyValue(hueVarName);
    const oldChroma = root.style.getPropertyValue(contractDefaultChromaVarName);
    const newHueStr = normalizedHue.toFixed(1);
    const newChromaStr = chromaToSet.toFixed(4);

    if (oldHue !== newHueStr || oldChroma !== newChromaStr) {
        root.style.setProperty(hueVarName, newHueStr);
        root.style.setProperty(contractDefaultChromaVarName, newChromaStr); 
    }
}

function updateLcdDisplay(lcdElement, textContent, lcdId) { 
    if (!lcdElement) return;
    if (lcdId === 'Terminal') return; // Terminal content is handled by TerminalManager

    const valueSpan = lcdElement.querySelector('.lcd-value') || lcdElement;
    
    const appStatus = getAppStatus();
    let shouldBeBlank = false;
    if (appStatus === 'starting-up') {
        // Check the class of the LCD element itself, not its parent for this logic
        if (lcdElement.classList.contains('lcd--unlit')) { 
            shouldBeBlank = true;
        }
    } else if (appStatus === 'loading') {
        shouldBeBlank = true; 
    }
    
    if (shouldBeBlank) {
        textContent = "";
    }

    const currentText = valueSpan.textContent;

    if (currentText !== textContent) {
        valueSpan.textContent = textContent;
        lastLcdValues[lcdId] = textContent;
    }
}
function handleDialUpdateForLcdA(payload) { 
    if (!payload || payload.id !== 'A' || !payload.state) return;
    const { state } = payload; const normalizedHue = ((state.hue % 360) + 360) % 360;
    if (uiElements.lcdA) updateLcdDisplay(uiElements.lcdA, Math.round(normalizedHue).toString(), 'A');
}
function handleTargetColorChangeForDynamicCSSVars(payload) { 
    if (!payload || !payload.targetKey || typeof payload.hue !== 'number' || typeof payload.isColorless !== 'boolean') return;
    updateDynamicCSSVar(payload.targetKey, payload.hue, payload.isColorless);
}
function handleThemeChange(newTheme) { 
    if (!uiElements.body) return;
    // console.log(`[UIUpdater handleThemeChange] Received: ${newTheme}. Updating body class. Old: ${Array.from(uiElements.body.classList).filter(c => c.startsWith('theme-')).join(' ')}`);
    uiElements.body.classList.remove('theme-dim', 'theme-dark', 'theme-light');
    uiElements.body.classList.add(`theme-${newTheme}`);
    // console.log(`[UIUpdater handleThemeChange] New body classes: ${uiElements.body.className}`);
}
function handleTrueLensPowerChangeForLcdB(newTruePower01) { 
    if (uiElements.lcdB) updateLcdDisplay(uiElements.lcdB, `${Math.round(newTruePower01 * 100)}%`, 'B');
}
function handleAppStatusChange(newStatus) { 
    // console.log(`[UIUpdater handleAppStatusChange] Transitioning to: ${newStatus}.`);
    
    if (newStatus === 'interactive') {
        // console.log(`[UIUpdater handleAppStatusChange] App is interactive. Ensuring Dial LCDs are 'active'.`);
        setLcdState(uiElements.lcdA, 'active');
        setLcdState(uiElements.lcdB, 'active');
        // For terminal, its parent '.actual-lcd-screen-element' gets the 'active' state
        if (uiElements.terminalLcdContentElement?.parentElement && uiElements.terminalLcdContentElement.parentElement.classList.contains('actual-lcd-screen-element')) {
            setLcdState(uiElements.terminalLcdContentElement.parentElement, 'active');
        }
        
        const dialAState = getDialState('A');
        const defaultDialAHue = localConfigModule ? localConfigModule.DEFAULT_DIAL_A_HUE : 40.6;
        const dialAText = dialAState ? Math.round(((dialAState.hue % 360) + 360) % 360).toString() : String(Math.round(defaultDialAHue));
        updateLcdDisplay(uiElements.lcdA, dialAText, 'A');
        updateLcdDisplay(uiElements.lcdB, `${Math.round(getTrueLensPower() * 100)}%`, 'B');
        
        applyInitialDynamicCSSVars(); 
    } else if (newStatus === 'starting-up') {
        const logoSVG = uiElements.logoContainer?.querySelector('svg.logo-svg'); 
        if (logoSVG && logoSVG.style.opacity !== '0.05') { 
            logoSVG.style.opacity = '0.05'; 
        }
        // console.log(`[UIUpdater handleAppStatusChange] App is starting-up. LCD states will be managed by startupSequenceManager.`);
    } else if (newStatus === 'loading') {
        // console.log(`[UIUpdater handleAppStatusChange] App is loading. Applying initial LCD states.`);
        applyInitialLcdStates(); 
    }
}
function applyInitialLcdStates() { 
    // console.log(`[UIUpdater applyInitialLcdStates] AppStatus: ${getAppStatus()}, CurrentPhase: P${getCurrentPhaseNumber()}`);
    // Terminal message is handled by terminalManager
    
    const dialAState = getDialState('A');
    const defaultDialAHue = localConfigModule ? localConfigModule.DEFAULT_DIAL_A_HUE : 40.6;
    const dialAText = dialAState ? Math.round(((dialAState.hue % 360) + 360) % 360).toString() : ""; 
    updateLcdDisplay(uiElements.lcdA, dialAText, 'A');
    
    const dialBText = (getAppStatus() === 'loading' || (getAppStatus() === 'starting-up' && getCurrentPhaseNumber() < 4)) ? "" : `${Math.round(getTrueLensPower() * 100)}%`;
    updateLcdDisplay(uiElements.lcdB, dialBText, 'B');

    if (getAppStatus() === 'loading' || (getAppStatus() === 'starting-up' && getCurrentPhaseNumber() < 0 )) { 
        // console.log(`[UIUpdater applyInitialLcdStates] Setting P0 LCD states.`);
        setLcdState(uiElements.lcdA, 'lcd--unlit');
        setLcdState(uiElements.lcdB, 'lcd--unlit');
        // For terminal, its parent '.actual-lcd-screen-element' gets the 'js-active-dim-lcd' state
        if (uiElements.terminalLcdContentElement?.parentElement && uiElements.terminalLcdContentElement.parentElement.classList.contains('actual-lcd-screen-element')) {
            setLcdState(uiElements.terminalLcdContentElement.parentElement, 'js-active-dim-lcd'); 
        }
    }
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
    const defaultDialAHue = localConfigModule ? localConfigModule.DEFAULT_DIAL_A_HUE : 40.6;
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
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status} for ${response.url}`);
        } 
        return response.text(); 
    })
    .then(svgData => {
        if (!svgData) {
            console.error("[UIUpdater injectLogoSVG] Empty SVG data received.");
            throw new Error("Empty SVG data received.");
        }
        if (!svgData.trim().startsWith('<svg')) {
            console.warn("[UIUpdater injectLogoSVG] Fetched data doesn't look like an SVG:", svgData.substring(0,100));
            throw new Error("Invalid SVG data format.");
        }
        
        uiElements.logoContainer.innerHTML = svgData; 
        const logoSVGElement = uiElements.logoContainer.querySelector('svg.logo-svg'); 
        
        if (logoSVGElement) {
            if (document.body.classList.contains('theme-dim') || getAppStatus() === 'starting-up') {
                logoSVGElement.style.opacity = '0.05'; 
            }
            const logoProps = getTargetColorProperties('logo');
            if (logoProps) {
                updateDynamicCSSVar('logo', logoProps.hue, logoProps.isColorless);
            }
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