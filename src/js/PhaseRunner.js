/**
 * @module PhaseRunner
 * @description A generic executor for declarative startup phase configuration objects.
 * It parses a phase config, builds a GSAP timeline dynamically, and returns a promise.
 */
import { serviceLocator } from './serviceLocator.js';
import { getMessage } from './terminalMessages.js';
import { createAdvancedFlicker } from './animationUtils.js';

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
      terminalManager: serviceLocator.get('terminalManager'),
      audioManager: serviceLocator.get('audioManager'),
    };
    if (this.debug) console.log('[PhaseRunner INIT]');
  }

  run(phaseConfig) {
    return new Promise(async (resolve, reject) => {
      if (this.debug) {
        console.group(`[PhaseRunner] Executing Phase ${phaseConfig.phase}: ${phaseConfig.name}`);
      }
      try {
        const masterTl = this.gsap.timeline({
          onComplete: () => {
            if (this.debug) {
              console.log(`[PhaseRunner] <<<< COMPLETED >>>> Phase ${phaseConfig.phase}: ${phaseConfig.name}`);
              console.groupEnd();
            }
            resolve();
          },
          onError: (error) => {
            if (this.debug) {
                console.error(`[PhaseRunner] <<<< FAILED >>>> Phase ${phaseConfig.phase}: ${phaseConfig.name}`, error);
                console.groupEnd();
            }
            reject(error);
          }
        });

        // --- REVERTED P1 DELAY LOGIC ---
        // specialTerminalFlicker visual will now be added at position 0 by default.
        if (phaseConfig.specialTerminalFlicker && phaseConfig.message) {
            const terminalFlickerTl = this.managers.terminalManager.playStartupFlicker(phaseConfig.message);
            masterTl.add(terminalFlickerTl, 0); // Add at T=0
        } else if (phaseConfig.terminalMessageKey) {
            masterTl.call(() => {
                this.appState.emit('requestTerminalMessage', {
                    type: 'startup',
                    source: phaseConfig.name,
                    messageKey: phaseConfig.terminalMessageKey,
                });
            }, [], 0); 
        }
        // --- END REVERTED P1 DELAY LOGIC ---

        if (phaseConfig.animations && Array.isArray(phaseConfig.animations)) {
          phaseConfig.animations.forEach(anim => this._buildAnimation(masterTl, anim, phaseConfig));
        }

        let minDuration = phaseConfig.duration || this.config.MIN_PHASE_DURATION_FOR_STEPPING;
        if (masterTl.duration() < minDuration) {
          masterTl.to({}, { duration: minDuration - masterTl.duration() });
        }

        masterTl.play();
      } catch (error)
      {
        console.error(`[PhaseRunner RUN] Error setting up Phase ${phaseConfig.phase}:`, error);
        if (this.debug) console.groupEnd();
        reject(error);
      }
    });
  }

  _buildAnimation(tl, anim, currentPhaseConfig) { 
    const position = anim.position || '>'; // Default to '>', but phase configs should be explicit.
    if (this.debug) console.log(`[PhaseRunner] Building animation:`, anim, `at position: ${position}`);

    switch (anim.type) {
      case 'tween':
        this._handleTween(tl, anim, position);
        break;
      case 'flicker':
        this._handleSimpleFlicker(tl, anim, position);
        break;
      case 'lcdPowerOn':
        this._handleLcdPowerOn(tl, anim, position);
        break;
      case 'call':
        const deps = anim.deps ? anim.deps.map(depName => {
            if (depName === 'self') {
                return currentPhaseConfig; 
            }
            try {
                return serviceLocator.get(depName);
            } catch (e) {
                console.error(`[PhaseRunner] Error resolving dependency "${depName}" for 'call' animation in phase ${currentPhaseConfig.name}:`, e.message);
                return null; 
            }
        }).filter(Boolean) : []; 
        tl.call(anim.function, deps, position);
        break;
      case 'lensEnergize':
        const lensTl = this.managers.lensManager.energizeLensCoreStartup(anim.targetPower, anim.durationMs);
        if (lensTl) tl.add(lensTl, position);
        break;
      case 'audio':
        if (this.managers.audioManager && anim.soundKey) {
            // --- REVERTED P1 SOUND POSITION OVERRIDE ---
            // Sound will now play at its defined anim.position from the phase config.
            tl.call(() => this.managers.audioManager.play(anim.soundKey), [], position);
            // --- END REVERTED ---
        }
        break;
      default:
        console.warn(`[PhaseRunner] Unknown animation type: ${anim.type}`);
    }
  }

  _handleLcdPowerOn(tl, anim, position) {
    const elements = Array.isArray(anim.target) ? anim.target.map(t => this.dom[t]) : [this.dom[anim.target]];
    const stagger = anim.stagger || 0;

    elements.forEach((el, index) => {
        if (el) {
            const powerOnTl = this.managers.lcdUpdater.getLcdPowerOnTimeline(el, {
                profileName: anim.profile,
                state: anim.state
            });
            tl.add(powerOnTl, `${position}+=${index * stagger}`);
        }
    });
  }

  _handleTween(tl, anim, position) {
    let targets = [];
    if (anim.target === 'dimmingFactors') {
      targets.push(this.proxies.LReductionProxy);
      anim.vars.onUpdate = () => {
        this.dom.root.style.setProperty('--startup-L-reduction-factor', this.proxies.LReductionProxy.value.toFixed(3));
      };
    } else {
      targets = Array.isArray(anim.target) ? anim.target.map(t => this.dom[t]).filter(Boolean) : [this.dom[anim.target]];
    }

    if (targets.length > 0) {
      tl.to(targets, anim.vars, position);
    }
  }

  _handleSimpleFlicker(tl, anim, position) {
    let elements = [];
    let isButtonFlicker = false;

    if (anim.target === 'buttonGroup') {
      elements = this.managers.buttonManager.getButtonsByGroupIds(anim.groups);
      isButtonFlicker = true;
    } else if (typeof anim.target === 'string') {
        const buttonInstance = this.managers.buttonManager.getButtonByAriaLabel(anim.target);
        if (buttonInstance) {
            elements.push(buttonInstance.getElement());
            isButtonFlicker = true;
        }
    } else if (Array.isArray(anim.target)) {
        elements = anim.target.map(id => this.dom[id]).filter(Boolean);
    }

    if (elements.length === 0) {
        if(this.debug) console.warn(`[PhaseRunner _handleSimpleFlicker] No elements found for:`, anim.target);
        return;
    }

    const stagger = anim.stagger || 0;
    elements.forEach((el, index) => {
        if (isButtonFlicker) {
            const buttonInstance = this.managers.buttonManager.getButtonInstance(el);
            if (!buttonInstance) return;

            let effectiveProfile = anim.profile;
            if (anim.profile.startsWith('buttonFlickerFromDimlyLitToFullyLit')) {
                const shouldBeSelected = (anim.target === 'buttonGroup')
                    ? this.config.DEFAULT_ASSIGNMENT_SELECTIONS[buttonInstance.getGroupId()]?.toString() === buttonInstance.getValue()
                    : anim.state.includes('is-selected');
                const isFast = anim.profile.includes('Fast');
                effectiveProfile = shouldBeSelected
                    ? (isFast ? 'buttonFlickerFromDimlyLitToFullyLitSelectedFast' : 'buttonFlickerFromDimlyLitToFullyLitSelected')
                    : (isFast ? 'buttonFlickerFromDimlyLitToFullyLitUnselectedFast' : 'buttonFlickerFromDimlyLitToFullyLitUnselected');
            }
            
            const flickerOptions = {
              profileName: effectiveProfile,
              phaseContext: `PhaseRunner_${effectiveProfile}`
            };

            const flickerResult = this.managers.buttonManager.playFlickerToState(el, anim.state, flickerOptions);

            if (flickerResult && flickerResult.timeline) {
                tl.add(flickerResult.timeline, `${position}+=${index * stagger}`);
            }
        } else {
            const flickerTl = this.managers.lcdUpdater.getLcdPowerOnTimeline(el, {
                profileName: anim.profile,
                state: anim.state
            });
            tl.add(flickerTl, `${position}+=${index * stagger}`);
        }
    });
  }
}