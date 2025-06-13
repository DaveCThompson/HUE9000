/**
 * @module startupSequenceManager
 * @description Manages the application startup sequence using XState.
 * Orchestrates visual changes and state updates across various UI managers.
 * (Project Decouple Refactor)
 */
import { interpret } from 'xstate';
import { startupMachine } from './startupMachine.js';
import { serviceLocator } from './serviceLocator.js';
import * as appState from './appState.js'; // ENSURE appState is imported

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

    serviceLocator.register('proxies', {
        LReductionProxy: this.LReductionProxy,
        opacityFactorProxy: this.opacityFactorProxy
    });
  }

  start(isStepThroughMode = true) {
    this._resetVisualsAndState(isStepThroughMode);

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
        this.fsmInterpreter.send({ type: 'SET_AUTO_PLAY' });
    }
  }

  pauseSequence() {
      if (this.fsmInterpreter) {
          this.fsmInterpreter.send({ type: 'PAUSE_SEQUENCE' });
          console.log("[SSM] Sequence auto-play paused.");
      }
  }

  resumeSequence() {
      if (this.fsmInterpreter) {
          this.playAllRemaining();
          console.log("[SSM] Sequence auto-play resumed.");
      }
  }

  resetSequence() {
    this.start(true);
  }

  jumpToPhase(phaseNumber) {
    if (this.fsmInterpreter) {
      this.fsmInterpreter.stop();
    }
    this._resetVisualsAndState(true); 
    this.fsmInterpreter = interpret(startupMachine);

    this.fsmInterpreter.subscribe(snapshot => {
      const currentValueString = JSON.stringify(snapshot.value);
      if (snapshot.changed || currentValueString !== this.previousFsmSnapshotValue) {
        this._notifyFsmTransition(snapshot);
        this.previousFsmSnapshotValue = currentValueString;
      }
    });

    this.fsmInterpreter.start();
    this.fsmInterpreter.send({
        type: 'JUMP_TO_PHASE',
        phase: phaseNumber,
        isStepThroughMode: false 
    });
  }

  _resetVisualsAndState(makeBodyVisible) {
    if (this.debug) console.log(`[SSM] _resetVisualsAndState called. Make Body Visible: ${makeBodyVisible}`);
    if (this.fsmInterpreter) {
      this.fsmInterpreter.stop();
      this.fsmInterpreter = null;
    }
    this.previousFsmSnapshotValue = null;

    const dom = serviceLocator.get('domElements');
    const gsap = serviceLocator.get('gsap');
    const config = serviceLocator.get('config');
    // REMOVE: const localAppStateRef = serviceLocator.get('appState'); // THIS WAS THE ERROR LINE (121)
    const lcdUpdater = serviceLocator.get('lcdUpdater');

    if (dom.body.classList.contains('pre-boot')) {
      dom.body.classList.remove('pre-boot');
    }
    
    gsap.killTweensOf([dom.body, this.LReductionProxy, this.opacityFactorProxy]);

    if (makeBodyVisible) {
        gsap.set(dom.body, { opacity: 1 });
    }

    this.LReductionProxy.value = config.STARTUP_L_REDUCTION_FACTORS.P0;
    this.opacityFactorProxy.value = 1.0 - this.LReductionProxy.value;
    dom.root.style.setProperty('--startup-L-reduction-factor', this.LReductionProxy.value.toFixed(3));
    dom.root.style.setProperty('--startup-opacity-factor', this.opacityFactorProxy.value.toFixed(3));
    dom.root.style.setProperty('--startup-opacity-factor-boosted', Math.min(1, this.opacityFactorProxy.value * 1.25).toFixed(3));
    if (this.debug) console.log(`[SSM Reset] Set L-reduction to ${this.LReductionProxy.value}`);

    // Use the imported appState module directly
    appState.setAppStatus('starting-up');
    appState.setCurrentStartupPhaseNumber(-1);
    appState.setTheme('dim');
    appState.setTrueLensPower(0);
    appState.updateDialState('A', { hue: config.DEFAULT_DIAL_A_HUE, targetHue: config.DEFAULT_DIAL_A_HUE, rotation: 0, targetRotation: 0, isDragging: false });
    appState.updateDialState('B', { hue: 0, targetHue: 0, rotation: 0, targetRotation: 0, isDragging: false });
    if (this.debug) console.log('[SSM Reset] App state reset (status, theme, lens, dials).');

    serviceLocator.get('buttonManager').setInitialDimStates();
    serviceLocator.get('lensManager').directUpdateLensVisuals(0);
    serviceLocator.get('terminalManager').reset();

    const allLcds = [dom.terminalContainer, dom.lcdA, dom.lcdB];
    allLcds.forEach(lcd => {
        if (lcd) {
            lcdUpdater.setLcdState(lcd, 'unlit', { phaseContext: 'Reset' });
        }
    });
    if (this.debug) console.log('[SSM Reset] All managers reset to initial state.');
  }

  _performThemeTransitionCleanup() {
    const dom = serviceLocator.get('domElements');
    dom.body.classList.remove('is-transitioning-from-dim');
    document.querySelectorAll('.animate-on-dim-exit').forEach(el => el.classList.remove('animate-on-dim-exit'));
    
    const dialContainers = [dom.dialA, dom.dialB];
    dialContainers.forEach(container => {
        if (container) {
            container.classList.remove('is-active-for-startup');
        }
    });

    if (this.debug) console.log("[SSM] Theme transition cleanup performed.");
  }

  _notifyFsmTransition(snapshot) {
    // Use the imported appState module directly
    const phaseInfo = this._getPhaseInfoFromSnapshot(snapshot);
    appState.emit('startup:phaseChanged', phaseInfo);
    appState.setCurrentStartupPhaseNumber(phaseInfo.numericPhase);
  }

  _getPhaseInfoFromSnapshot(snapshot) {
    const numericPhase = snapshot.context.currentPhase;
    const phaseConfigs = serviceLocator.get('config').phaseConfigs; // Config is fine from locator
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