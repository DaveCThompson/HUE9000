/**
 * @module PhaseRunner
 * @description A generic executor for declarative startup phase configuration objects.
 * It parses a phase config, builds a GSAP timeline dynamically, and returns a promise.
 */
import { serviceLocator } from './serviceLocator.js';

export class PhaseRunner {
  constructor() {
    this.gsap = null;
    this.appState = null;
    this.config = null;
    this.managers = {};
    this.dom = {};
    this.proxies = {};
    this.debug = true;
  }

  init() {
    this.gsap = serviceLocator.get('gsap');
    this.appState = serviceLocator.get('appState');
    this.config = serviceLocator.get('config');
    this.dom = serviceLocator.get('domElements');
    this.proxies = serviceLocator.get('proxies');

    this.managers = {
      buttonManager: serviceLocator.get('buttonManager'),
      dialManager: serviceLocator.get('dialManager'),
      lensManager: serviceLocator.get('lensManager'),
      lcdUpdater: serviceLocator.get('lcdUpdater'),
    };
    if (this.debug) console.log('[PhaseRunner INIT]');
  }

  run(phaseConfig) {
    return new Promise((resolve, reject) => {
      try {
        if (this.debug) console.log(`[PhaseRunner RUN] Executing Phase ${phaseConfig.phase}: ${phaseConfig.name}`);
        const tl = this.gsap.timeline({
          onComplete: () => {
            if (this.debug) console.log(`[PhaseRunner RUN] <<<< COMPLETED >>>> Phase ${phaseConfig.phase}`);
            resolve();
          },
          onError: (error) => reject(error)
        });

        if (phaseConfig.terminalMessageKey) {
          this.appState.emit('requestTerminalMessage', {
            type: 'startup',
            source: phaseConfig.name,
            messageKey: phaseConfig.terminalMessageKey,
          });
        }

        if (phaseConfig.animations && Array.isArray(phaseConfig.animations)) {
          phaseConfig.animations.forEach(anim => this._buildAnimation(tl, anim));
        }

        let minDuration = phaseConfig.duration || this.config.MIN_PHASE_DURATION_FOR_STEPPING;
        if (tl.duration() < minDuration) {
          tl.to({}, { duration: minDuration - tl.duration() });
        }

        tl.play();
      } catch (error) {
        console.error(`[PhaseRunner RUN] Error setting up Phase ${phaseConfig.phase}:`, error);
        reject(error);
      }
    });
  }

  _buildAnimation(tl, anim) {
    const position = anim.position || '>';

    switch (anim.type) {
      case 'tween':
        this._handleTween(tl, anim, position);
        break;
      case 'flicker':
        this._handleFlicker(tl, anim, position);
        break;
      case 'call':
        const deps = anim.deps ? anim.deps.map(dep => serviceLocator.get(dep)) : [];
        tl.call(anim.function, deps, position);
        break;
      case 'lensEnergize':
        const lensTl = this.managers.lensManager.energizeLensCoreStartup(anim.targetPower, anim.durationMs);
        if (lensTl) tl.add(lensTl, position);
        break;
      default:
        console.warn(`[PhaseRunner] Unknown animation type: ${anim.type}`);
    }
  }

  _handleTween(tl, anim, position) {
    let targets = [];
    if (anim.target === 'dimmingFactors') {
      targets.push(this.proxies.LReductionProxy);
      const originalOnUpdate = anim.vars.onUpdate;
      anim.vars.onUpdate = () => {
        this.dom.root.style.setProperty('--startup-L-reduction-factor', this.proxies.LReductionProxy.value.toFixed(3));
        if (originalOnUpdate) {
          originalOnUpdate();
        }
      };
    } else if (Array.isArray(anim.target)) {
      targets = anim.target.map(t => this.dom[t]).filter(Boolean);
    } else if (this.dom[anim.target]) {
      targets.push(this.dom[anim.target]);
    }

    if (targets.length > 0) {
      tl.to(targets, anim.vars, position);
    }
  }

  _handleFlicker(tl, anim, position) {
    let elements = [];
    if (anim.target === 'buttonGroup') {
      elements = this.managers.buttonManager.getButtonsByGroupIds(anim.groups);
    } else if (anim.target === 'button' && anim.selector) {
      elements = Array.from(document.querySelectorAll(anim.selector));
    } else if (Array.isArray(anim.target)) {
      elements = anim.target.map(t => this.dom[t]).filter(Boolean);
    } else if (this.dom[anim.target]) {
      elements.push(this.dom[anim.target]);
    } else if (typeof anim.target === 'string') {
        // New: Handle targeting by aria-label
        const buttonInstance = this.managers.buttonManager.getButtonByAriaLabel(anim.target);
        if (buttonInstance) {
            elements.push(buttonInstance.getElement());
        }
    }

    if (elements.length === 0) {
        if(this.debug) console.warn(`[PhaseRunner _handleFlicker] No elements found for animation target:`, anim.target);
        return;
    }

    const stagger = anim.stagger || 0;
    elements.forEach((el, index) => {
      const isButton = el.classList.contains('button-unit');
      let flickerResult;

      if (isButton) {
        const buttonInstance = this.managers.buttonManager.getButtonInstance(el);
        if (!buttonInstance) {
            if (this.debug) console.warn(`[PhaseRunner _handleFlicker] Could not get button instance for element:`, el);
            return;
        }

        let effectiveState = anim.state;
        let effectiveProfile = anim.profile;

        // Generalize flicker logic for all buttons transitioning from dimly lit to fully lit.
        if (anim.profile && anim.profile.startsWith('buttonFlickerFromDimlyLitToFullyLit')) {
            let shouldBeSelected;
            
            if (anim.target === 'buttonGroup') {
                shouldBeSelected = this.config.DEFAULT_ASSIGNMENT_SELECTIONS[buttonInstance.getGroupId()]?.toString() === buttonInstance.getValue();
            } else {
                // For single-button animations (Phases 3, 9), trust the state in the config.
                shouldBeSelected = anim.state.includes('is-selected');
            }

            const isFast = anim.profile.includes('Fast');
            
            if (shouldBeSelected) {
                effectiveProfile = isFast ? 'buttonFlickerFromDimlyLitToFullyLitSelectedFast' : 'buttonFlickerFromDimlyLitToFullyLitSelected';
                effectiveState = 'is-energized is-selected';
            } else {
                effectiveProfile = isFast ? 'buttonFlickerFromDimlyLitToFullyLitUnselectedFast' : 'buttonFlickerFromDimlyLitToFullyLitUnselected';
                effectiveState = 'is-energized';
            }
        }
        
        flickerResult = this.managers.buttonManager.playFlickerToState(el, effectiveState, {
          profileName: effectiveProfile,
          phaseContext: `PhaseRunner_${effectiveProfile}`
        });

      } else { // Assume LCD
        flickerResult = this.managers.lcdUpdater.setLcdState(el, anim.state, {
          useFlicker: true,
          flickerProfileName: anim.profile,
          phaseContext: `PhaseRunner_${anim.profile}`
        });
      }

      if (flickerResult && flickerResult.timeline) {
        tl.add(flickerResult.timeline, `${position}+=${index * stagger}`);
      }
    });
  }
}