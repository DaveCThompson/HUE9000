/**
 * @module startupSequenceManager
 * @description Manages the application startup sequence using XState.
 * Orchestrates visual changes and state updates across various UI managers.
 * (Project Decouple Refactor)
 */
import { interpret } from 'xstate';
import { startupMachine } from './startupMachine.js';
import { serviceLocator } from './serviceLocator.js';

export class StartupSequenceManager {
  constructor() {
    this.fsmInterpreter = null;
    this.previousFsmSnapshotValue = null;
    this.debug = true;

    // Proxies for animating CSS variables
    this.LReductionProxy = { value: 0.85 };
    this.opacityFactorProxy = { value: 0.15 };
  }

  init() {
    if (this.debug) console.log('[StartupSequenceManager INIT]');
    const config = serviceLocator.get('config');
    this.LReductionProxy.value = config.STARTUP_L_REDUCTION_FACTORS.P0;
    this.opacityFactorProxy.value = 1.0 - this.LReductionProxy.value;

    // Register proxies so PhaseRunner can access them during its own init
    serviceLocator.register('proxies', {
        LReductionProxy: this.LReductionProxy,
        opacityFactorProxy: this.opacityFactorProxy
    });
  }

  start(isStepThroughMode = true) {
    this._resetVisualsAndState(isStepThroughMode);

    // Interpret the machine directly. The initial context is defined in the machine,
    // and the START_SEQUENCE event payload will set the mode.
    this.fsmInterpreter = interpret(startupMachine);

    this.fsmInterpreter.subscribe(snapshot => {
      const currentValueString = JSON.stringify(snapshot.value);
      if (snapshot.changed || currentValueString !== this.previousFsmSnapshotValue) {
        this._notifyFsmTransition(snapshot);
        this.previousFsmSnapshotValue = currentValueString;
      }
    });

    this.fsmInterpreter.start();
    this.fsmInterpreter.send({ type: 'START_SEQUENCE', isStepThroughMode });
  }

  playNextPhase() {
    if (this.fsmInterpreter) {
      this.fsmInterpreter.send({ type: 'NEXT_STEP_REQUESTED' });
    }
  }

  playAllRemaining() {
    if (this.fsmInterpreter) {
        // This event is handled by the machine to switch to auto-play mode.
        this.fsmInterpreter.send({ type: 'SET_AUTO_PLAY' });
    }
  }

  resetSequence() {
    this.start(true);
  }

  _resetVisualsAndState(forStepping) {
    if (this.fsmInterpreter) {
      this.fsmInterpreter.stop();
      this.fsmInterpreter = null;
    }
    this.previousFsmSnapshotValue = null;

    const dom = serviceLocator.get('domElements');
    const gsap = serviceLocator.get('gsap');
    const config = serviceLocator.get('config');
    const appState = serviceLocator.get('appState');
    const lcdUpdater = serviceLocator.get('lcdUpdater'); // Get the LcdUpdater

    if (dom.body.classList.contains('pre-boot')) {
      dom.body.classList.remove('pre-boot');
    }

    // Reverted: Do not kill tweens of logoContainer or set its opacity here.
    // Let it be controlled by the global opacity factors like other elements.
    gsap.killTweensOf([dom.body, this.LReductionProxy, this.opacityFactorProxy]);

    this.LReductionProxy.value = config.STARTUP_L_REDUCTION_FACTORS.P0;
    this.opacityFactorProxy.value = 1.0 - this.LReductionProxy.value;
    dom.root.style.setProperty('--startup-L-reduction-factor', this.LReductionProxy.value.toFixed(3));
    dom.root.style.setProperty('--startup-opacity-factor', this.opacityFactorProxy.value.toFixed(3));
    dom.root.style.setProperty('--startup-opacity-factor-boosted', Math.min(1, this.opacityFactorProxy.value * 1.25).toFixed(3));

    appState.setAppStatus('starting-up');
    appState.setCurrentStartupPhaseNumber(-1);
    appState.setTheme('dim');
    appState.setTrueLensPower(0);
    appState.updateDialState('A', { hue: config.DEFAULT_DIAL_A_HUE, targetHue: config.DEFAULT_DIAL_A_HUE, rotation: 0, targetRotation: 0, isDragging: false });
    appState.updateDialState('B', { hue: 0, targetHue: 0, rotation: 0, targetRotation: 0, isDragging: false });

    serviceLocator.get('buttonManager').setInitialDimStates();
    serviceLocator.get('lensManager').directUpdateLensVisuals(0);
    serviceLocator.get('terminalManager').reset();

    // --- THE FIX ---
    // Explicitly set all LCDs to the 'unlit' state at the very beginning.
    // This ensures their content wrappers are hidden before any animations start.
    const allLcds = [dom.terminalContainer, dom.lcdA, dom.lcdB];
    allLcds.forEach(lcd => {
        if (lcd) {
            lcdUpdater.setLcdState(lcd, 'unlit', { phaseContext: 'Reset' });
        }
    });

    // Set body opacity based on mode. Step-through starts visible, auto-play fades in.
    gsap.set(dom.body, { opacity: forStepping ? 1 : 0 });
  }

  _performThemeTransitionCleanup() {
    const dom = serviceLocator.get('domElements');
    dom.body.classList.remove('is-transitioning-from-dim');
    document.querySelectorAll('.animate-on-dim-exit').forEach(el => el.classList.remove('animate-on-dim-exit'));
    // REMOVED: This call was causing the LCDs to turn off prematurely.
    // serviceLocator.get('lcdUpdater').applyCurrentStateToAllLcds();
    if (this.debug) console.log("[SSM] Theme transition cleanup performed.");
  }

  _notifyFsmTransition(snapshot) {
    const appState = serviceLocator.get('appState');
    const debugManager = serviceLocator.get('debugManager');

    const phaseInfo = this._getPhaseInfoFromSnapshot(snapshot);
    appState.emit('startup:phaseChanged', phaseInfo);
    appState.setCurrentStartupPhaseNumber(phaseInfo.numericPhase);

    const isPaused = snapshot.matches('PAUSED') || snapshot.matches('IDLE') || snapshot.done;
    debugManager.setNextPhaseButtonEnabled(isPaused);
  }

  _getPhaseInfoFromSnapshot(snapshot) {
    const numericPhase = snapshot.context.currentPhase;
    const phaseConfigs = serviceLocator.get('config').phaseConfigs;
    const phaseConfig = (phaseConfigs && numericPhase >= 0 && numericPhase < phaseConfigs.length) ? phaseConfigs[numericPhase] : null;
    
    let currentPhaseName = "N/A";
    if (snapshot.matches('IDLE')) currentPhaseName = 'IDLE';
    else if (snapshot.matches('COMPLETE')) currentPhaseName = 'COMPLETE';
    else if (snapshot.matches('ERROR')) currentPhaseName = 'ERROR';
    else if (phaseConfig) currentPhaseName = phaseConfig.name;
    else if (typeof snapshot.value === 'string') currentPhaseName = snapshot.value;
    else currentPhaseName = JSON.stringify(snapshot.value);

    const nextPhaseConfig = (phaseConfigs && (numericPhase + 1) < phaseConfigs.length) ? phaseConfigs[numericPhase + 1] : null;

    // Defensively check for snapshot.nextEvents before calling .join()
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