/**
 * @module startupSequenceManager
 * @description Manages the application startup sequence using XState.
 * Orchestrates visual changes and state updates across various UI managers.
 * (Project Decouple Refactor)
 */
import { interpret } from 'xstate';
import { startupMachine, desktopPhaseConfigs } from './startupMachine.js';
import { mobileStartupPhase } from './startupMobile.js';
import { serviceLocator } from './serviceLocator.js';
import * as appState from './appState.js'; // ENSURE appState is imported
import { STARTUP_L_REDUCTION_FACTORS, MOBILE_BREAKPOINT, HUE_ASSIGNMENT_ROW_HUES, THEME_TRANSITION_DURATION } from './config/index.js';

export class StartupSequenceManager {
  constructor() {
    this.fsmInterpreter = null;
    this.previousFsmSnapshotValue = null;
    this.debug = false;

    // Proxies for animating CSS variables
    this.LReductionProxy = { value: 0.85 };
    this.opacityFactorProxy = { value: 0.15 };
  }

  init() {
    // if (this.debug) console.log('[StartupSequenceManager INIT]');
    this.LReductionProxy.value = STARTUP_L_REDUCTION_FACTORS.P0;
    this.opacityFactorProxy.value = 1.0 - this.LReductionProxy.value;

    serviceLocator.register('proxies', {
        LReductionProxy: this.LReductionProxy,
        opacityFactorProxy: this.opacityFactorProxy
    });
  }

  start(isStepThroughMode = true) {
    const isMobile = window.matchMedia(MOBILE_BREAKPOINT).matches;
    const activePhaseList = isMobile ? [mobileStartupPhase] : desktopPhaseConfigs;
    
    // On mobile, the user experience should always be auto-play.
    const effectiveStepThroughMode = isMobile ? false : isStepThroughMode;
    
    this._resetVisualsAndState();

    this.fsmInterpreter = interpret(startupMachine);

    this.fsmInterpreter.subscribe(snapshot => {
      const currentValueString = JSON.stringify(snapshot.value);
      if (snapshot.changed || currentValueString !== this.previousFsmSnapshotValue) {
        this._notifyFsmTransition(snapshot);
        this.previousFsmSnapshotValue = currentValueString;
      }
    });

    this.fsmInterpreter.start();
    // Send the chosen config list to the FSM.
    this.fsmInterpreter.send({ 
        type: 'START_SEQUENCE', 
        isStepThroughMode: effectiveStepThroughMode,
        phaseConfigs: activePhaseList 
    });
  }

  playNextPhase() {
    if (this.fsmInterpreter) {
      this.fsmInterpreter.send({ type: 'NEXT_STEP_REQUESTED' });
    }
  }

  playAllRemaining() {
    if (this.fsmInterpreter) {
        this.fsmInterpreter.send({ type: 'SET_AUTO_PLAY' });
    }
  }

  pauseSequence() {
      if (this.fsmInterpreter) {
          this.fsmInterpreter.send({ type: 'PAUSE_SEQUENCE' });
        //   console.log("[SSM] Sequence auto-play paused.");
      }
  }

  resumeSequence() {
      if (this.fsmInterpreter) {
          this.playAllRemaining();
        //   console.log("[SSM] Sequence auto-play resumed.");
      }
  }

  resetSequence() {
    // PRD v2.2: Reset should always trigger a new, autoplaying sequence.
    this.start(false);
  }

  /**
   * Instantly applies the final state of all startup phases up to a target point.
   * This is the new engine for the "skip startup" developer feature.
   * @param {string} targetPhaseName - The name of the target state (e.g., 'COMPLETE').
   * @param {object} context - Context for initialization, e.g., { isMobile: boolean }.
   */
  jumpToState(targetPhaseName, context) {
    const { isMobile } = context;

    // Step 1: Reset everything to a known baseline.
    this._resetVisualsAndState();

    const configsToParse = isMobile ? [mobileStartupPhase] : desktopPhaseConfigs;

    // Step 2: Synchronously build the entire final static state of the UI by
    // iterating through all phase configurations and applying their final states.
    configsToParse.forEach(phaseConfig => {
      if (phaseConfig.terminalMessageKey) {
        appState.emit('requestTerminalMessage', {
          type: 'startup',
          source: phaseConfig.name,
          messageKey: phaseConfig.terminalMessageKey,
          instant: true,
        });
      }

      if (phaseConfig.animations && Array.isArray(phaseConfig.animations)) {
        phaseConfig.animations.forEach(animConfig => {
          if (typeof animConfig.applyFinalState === 'function') {
            try {
              const deps = (animConfig.deps || []).map(depName => serviceLocator.get(depName));
              animConfig.applyFinalState(deps, animConfig);
            } catch (e) {
              console.error(`Error applying final state for animation in phase "${phaseConfig.name}":`, { animConfig, error: e });
            }
          }
        });
      }
    });

    // Step 3: Perform the final, centralized cleanup.
    this._performSequenceCompletion();

    // Step 4: Defer the 'interactive' state change to the next animation frame.
    // This prevents a race condition where managers (like AmbientAnimationManager)
    // would react to the state change before the browser had painted the DOM updates from Step 2.
    requestAnimationFrame(() => {
        appState.setAppStatus('interactive');
    });
  }

  _resetVisualsAndState() {
    // if (this.debug) console.log(`[SSM] _resetVisualsAndState called.`);
    if (this.fsmInterpreter) {
      this.fsmInterpreter.stop();
      this.fsmInterpreter = null;
    }
    this.previousFsmSnapshotValue = null;

    const dom = serviceLocator.get('domElements');
    const gsap = serviceLocator.get('gsap');
    const lcdUpdater = serviceLocator.get('lcdUpdater');
    const isMobile = window.matchMedia(MOBILE_BREAKPOINT).matches;

    // FIX: Add a dedicated class to manage startup visibility states.
    dom.body.classList.add('is-starting-up');
    if (dom.body.classList.contains('pre-boot')) {
      dom.body.classList.remove('pre-boot');
    }
    // FIX: Remove the temporary "bridge" class now that JS has taken over.
    if (dom.body.classList.contains('post-preload-hiding')) {
        dom.body.classList.remove('post-preload-hiding');
    }
    
    gsap.killTweensOf([dom.body, this.LReductionProxy, this.opacityFactorProxy]);

    gsap.set(dom.body, { opacity: 1 });

    this.LReductionProxy.value = STARTUP_L_REDUCTION_FACTORS.P0;
    this.opacityFactorProxy.value = 1.0 - this.LReductionProxy.value;
    dom.root.style.setProperty('--startup-L-reduction-factor', this.LReductionProxy.value.toFixed(3));
    dom.root.style.setProperty('--startup-opacity-factor', this.opacityFactorProxy.value.toFixed(3));
    dom.root.style.setProperty('--startup-opacity-factor-boosted', Math.min(1, this.opacityFactorProxy.value * 1.25).toFixed(3));

    // PRD v2.2: Use the new single source of truth for resetting all application state.
    // This replaces all the individual appState.set... calls.
    appState.resetAppStateToDefaults();
    
    // CORRECTED LOGIC: Apply mobile-specific overrides AFTER the global reset.
    if (isMobile) {
        // On mobile, the color slider controls env, logo, and lcd.
        // We want it to start at the "colorless" position.
        const colorlessHue = HUE_ASSIGNMENT_ROW_HUES[0]; // This is `null` in the config
        appState.setTargetColorProperties('env', colorlessHue);
        appState.setTargetColorProperties('logo', colorlessHue);
        appState.setTargetColorProperties('lcd', colorlessHue);
    }
    
    // The functions below are still needed for visual/manager-specific resets.
    serviceLocator.get('lensManager').directUpdateLensVisuals(0);

    // Reset background music by calling the method on the registered controller.
    const musicController = serviceLocator.get('musicController', true);
    if (musicController && typeof musicController.reset === 'function') {
        musicController.reset();
    }

    // Desktop-only manager resets
    const buttonManager = serviceLocator.get('buttonManager', true);
    if (buttonManager) {
        buttonManager.setInitialDimStates();
    }
    
    const terminalManager = serviceLocator.get('terminalManager', true);
    if (terminalManager) {
        terminalManager.reset();
    }

    const allLcds = [dom.terminalContainer, dom.lcdA, dom.lcdB];
    allLcds.forEach(lcd => {
        if (lcd) {
            lcdUpdater.setLcdState(lcd, 'unlit', { phaseContext: 'Reset' });
        }
    });

    // Ensure the info panel is closed on reset.
    const sidePanelManager = serviceLocator.get('sidePanelManager', true);
    if(sidePanelManager && typeof sidePanelManager.close === 'function') {
      sidePanelManager.close();
    }
  }

  /**
   * Centralized cleanup logic called at the end of any startup sequence (animated or skipped).
   * This is now the single source of truth for post-startup cleanup.
   */
  _performSequenceCompletion() {
    const dom = serviceLocator.get('domElements');
    dom.body.classList.remove('is-starting-up');
    
    if (dom.body.classList.contains('is-transitioning-from-dim')) {
        dom.body.classList.remove('is-transitioning-from-dim');
        document.querySelectorAll('.animate-on-dim-exit').forEach(el => el.classList.remove('animate-on-dim-exit'));
    }
  }

  _notifyFsmTransition(snapshot) {
    // Use the imported appState module directly
    const phaseInfo = this._getPhaseInfoFromSnapshot(snapshot);
    appState.emit('startup:phaseChanged', phaseInfo);
    appState.setCurrentStartupPhaseNumber(phaseInfo.numericPhase);
  }

  _getPhaseInfoFromSnapshot(snapshot) {
    const numericPhase = snapshot.context.currentPhase;
    const phaseConfigs = snapshot.context.activePhaseConfigs || [];
    const phaseConfig = (phaseConfigs && numericPhase >= 0 && numericPhase < phaseConfigs.length) ? phaseConfigs[numericPhase] : null;
    
    let currentPhaseName = "N/A";
    if (snapshot.matches('IDLE')) currentPhaseName = 'IDLE';
    else if (snapshot.matches('COMPLETE')) currentPhaseName = 'COMPLETE';
    else if (snapshot.matches('ERROR')) currentPhaseName = 'ERROR';
    else if (phaseConfig) currentPhaseName = phaseConfig.name;
    else if (typeof snapshot.value === 'string') currentPhaseName = snapshot.value;
    else currentPhaseName = JSON.stringify(snapshot.value);

    const nextPhaseConfig = (phaseConfigs && (numericPhase + 1) < phaseConfigs.length) ? phaseConfigs[numericPhase + 1] : null;
    const nextEventsString = snapshot.nextEvents ? snapshot.nextEvents.join(', ') : 'N/A';

    return {
        numericPhase: numericPhase ?? -1,
        currentPhaseName: currentPhaseName,
        status: snapshot.done ? 'completed' : (snapshot.matches('PAUSED') ? 'paused' : 'running'),
        description: `FSM State: ${JSON.stringify(snapshot.value)}`,
        nextPhaseName: snapshot.matches('PAUSED') && nextPhaseConfig ? nextPhaseConfig.name : (nextEventsString || 'N/A'),
        nextPhaseDescription: 'N/A'
    };
  }
}