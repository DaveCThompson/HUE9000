/**
 * @module PhaseRunner
 * @description A generic executor for declarative startup phase configuration objects.
 * It parses a phase config, builds a GSAP timeline dynamically, and returns a promise.
 */
import { serviceLocator } from './serviceLocator.js';
import * as appStateModule from './appState.js'; 
import { getMessage } from './terminalMessages.js';
import { createAdvancedFlicker } from './animationUtils.js';

export class PhaseRunner {
  constructor() {
    this.gsap = null;
    this.config = null;
    this.managers = {};
    this.dom = {};
    this.proxies = {};
    this.debug = true;
  }

  init() {
    this.gsap = serviceLocator.get('gsap');
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
        console.groupCollapsed(`[PhaseRunner] Executing Phase ${phaseConfig.phase}: ${phaseConfig.name}`);
        console.log(`[PhaseRunner] Config for Phase ${phaseConfig.phase}:`, JSON.parse(JSON.stringify(phaseConfig)));
      }
      try {
        const masterTl = this.gsap.timeline({
          onComplete: () => {
            if (this.debug) {
              if (phaseConfig.phase === 6) {
                console.warn(`[P_RUNNER_P6_TL_DEBUG] P6 Master Timeline COMPLETED. Final duration: ${masterTl.duration().toFixed(3)}s. AppTime: ${performance.now().toFixed(2)}`);
              }
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

        if (phaseConfig.specialTerminalFlicker && phaseConfig.message) {
            const terminalFlickerTl = this.managers.terminalManager.playStartupFlicker(phaseConfig.message);
            masterTl.add(terminalFlickerTl, 0); 
        } else if (phaseConfig.terminalMessageKey) {
            masterTl.call(() => {
                appStateModule.emit('requestTerminalMessage', { 
                    type: 'startup',
                    source: phaseConfig.name,
                    messageKey: phaseConfig.terminalMessageKey,
                });
            }, [], 0); 
        }

        if (phaseConfig.animations && Array.isArray(phaseConfig.animations)) {
          phaseConfig.animations.forEach(anim => this._buildAnimation(masterTl, anim, phaseConfig));
        }

        let minDuration = phaseConfig.duration || this.config.MIN_PHASE_DURATION_FOR_STEPPING;
        if (masterTl.duration() < minDuration) {
          masterTl.to({}, { duration: minDuration - masterTl.duration() });
        }
        
        if (phaseConfig.phase === 6) {
            console.warn(`[P_RUNNER_P6_TL_DEBUG] P6 Master Timeline Duration BEFORE PLAY (after potential padding): ${masterTl.duration().toFixed(3)}s. Configured Phase Duration: ${minDuration.toFixed(3)}s. AppTime: ${performance.now().toFixed(2)}`);
            // Optional: Sparsely log timeline updates for P6 if still debugging its timing.
            // masterTl.eventCallback("onUpdate", function() { 
            //     if (this.progress() > 0.01 && this.progress() < 0.99 && Math.random() < 0.05) { // Log very sparsely
            //          console.log(`[P_RUNNER_P6_TL_UPDATE] P6 Time: ${this.time().toFixed(3)}s / ${this.duration().toFixed(3)}s`);
            //     }
            // });
        }

        if (this.debug) console.log(`[PhaseRunner] Phase ${phaseConfig.phase} Master Timeline Duration (final): ${masterTl.duration()}`);
        console.groupEnd(); 
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
    const position = anim.position !== undefined ? anim.position : '>'; 

    if (currentPhaseConfig.phase === 6 && anim.type === 'audio') {
        console.warn(`[P_RUNNER_P6_AUDIO_BUILD_ENTRY] Processing P6 audio anim:`, JSON.stringify(anim), `at GSAP pos: ${position}. AppTime: ${performance.now().toFixed(2)}`);
    } else if (this.debug) { 
        console.log(`[PhaseRunner _buildAnimation] Anim:`, anim, `at effective position: ${position} (Phase: ${currentPhaseConfig.name})`);
    }


    switch (anim.type) {
      case 'tween':
        this._handleTween(tl, anim, position);
        break;
      case 'flicker':
        this._handleSimpleFlicker(tl, anim, position, currentPhaseConfig); 
        break;
      case 'lcdPowerOn':
        this._handleLcdPowerOn(tl, anim, position);
        break;
      case 'call':
        const deps = anim.deps ? anim.deps.map(depName => {
            if (depName === 'self') {
                return currentPhaseConfig; 
            }
            if (depName === 'appState') {
                return appStateModule; 
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
        if (currentPhaseConfig.phase === 6) { 
            console.warn(`[P_RUNNER_P6_AUDIO_IN_SWITCH] IN-SWITCH for P6 - SoundKey: ${anim.soundKey}. Manager exists: ${!!this.managers.audioManager}. SoundKey exists: ${!!anim.soundKey}. AppTime: ${performance.now().toFixed(2)}`);
        }
        if (this.managers.audioManager && anim.soundKey) {
            if (this.debug && !(currentPhaseConfig.phase === 6 && anim.type === 'audio')) { 
                console.log(`[PhaseRunner _buildAnimation] Scheduling audio: ${anim.soundKey} at timeline position: ${position}`);
            }
            tl.call(() => {
                if (anim.soundKey === 'itemAppear' && currentPhaseConfig.phase === 7) {
                    console.warn(`[P_RUNNER_SCHED P7_SOUND] itemAppear: Call to play scheduled in P7 timeline at GSAP position ${position}. App Time: ${performance.now().toFixed(2)}`);
                }
                if (currentPhaseConfig.phase === 6) {
                    if (anim.soundKey === 'itemAppear') {
                        console.warn(`[P_RUNNER_SCHED P6_SOUND_ITEMAPPEAR] itemAppear: Call to play scheduled in P6 at GSAP pos ${position}. App Time: ${performance.now().toFixed(2)}`);
                    } else if (anim.soundKey === 'lcdPowerOn') {
                         console.warn(`[P_RUNNER_SCHED P6_SOUND_LCDPOWERON] lcdPowerOn: Call to play scheduled in P6 at GSAP pos ${position}. App Time: ${performance.now().toFixed(2)}`);
                    }
                }

                if (this.debug) console.log(`[PhaseRunner AUDIO PLAY] Playing: ${anim.soundKey} (Phase: ${currentPhaseConfig.name}, Current Timeline Time: ${tl.time().toFixed(3)})`);
                this.managers.audioManager.play(anim.soundKey, anim.forceRestart || false); 
            }, [], position);
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

  _handleSimpleFlicker(tl, anim, position, currentPhaseConfig) { 
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
        if (isButtonFlicker && currentPhaseConfig.phase === 7) { 
            const buttonId = el.ariaLabel || el.id || 'UnknownButton';
            console.log(`[P_RUNNER_FLICK_INIT P7_VISUALS] Button: ${buttonId}. Scheduling flicker to '${anim.state}'. Profile: '${anim.profile}'. StaggeredPos: ${position}+=${index * stagger}. AppTime: ${performance.now().toFixed(2)}`);
        }

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
              phaseContext: `PhaseRunner_P${currentPhaseConfig.phase}_${effectiveProfile}` 
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