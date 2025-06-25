/**
 * @module PhaseRunner
 * @description A generic executor for declarative startup phase configuration objects.
 * It parses a phase config, builds a GSAP timeline dynamically, and returns a promise.
 */
import { serviceLocator } from './serviceLocator.js';
import * as appStateModule from './appState.js'; 
import { MIN_PHASE_DURATION_FOR_STEPPING } from './config/index.js';

export class PhaseRunner {
  constructor() {
    this.gsap = null;
    this.managers = {};
    this.dom = {};
    this.proxies = {};
    this.debug = false;
  }

  init() {
    this.gsap = serviceLocator.get('gsap');
    this.dom = serviceLocator.get('domElements');
    this.proxies = serviceLocator.get('proxies');

    // CORRECTED: Only initialize managers that are guaranteed to exist for both mobile and desktop.
    // Desktop-only managers like buttonManager will be retrieved on-demand.
    this.managers = {
      dialManager: serviceLocator.get('dialManager'),
      lensManager: serviceLocator.get('lensManager'),
      lcdUpdater: serviceLocator.get('lcdUpdater'),
      audioManager: serviceLocator.get('audioManager'),
    };
    // if (this.debug) console.log('[PhaseRunner INIT]');
  }

  run(phaseConfig) {
    return new Promise(async (resolve, reject) => {
      const phaseIdForRunLog = `P${phaseConfig.phase}_${phaseConfig.name}`;
      // console.log(`[PhaseRunner | ${performance.now().toFixed(2)}ms] Phase ${phaseConfig.phase} (${phaseConfig.name}): RUN METHOD ENTRY.`);

      // if (this.debug) {
        // console.groupCollapsed(`[PhaseRunner] Executing Phase ${phaseConfig.phase}: ${phaseConfig.name}`);
        // console.log(`[PhaseRunner | ${performance.now().toFixed(2)}ms] Config for Phase ${phaseConfig.phase}:`, JSON.parse(JSON.stringify(phaseConfig)));
      // }
      try {
        const masterTl = this.gsap.timeline({
          onComplete: () => {
            // if (this.debug) {
            //   console.log(`[PhaseRunner | ${performance.now().toFixed(2)}ms] <<<< MASTER TL COMPLETED >>>> Phase ${phaseConfig.phase}: ${phaseConfig.name}. Actual duration: ${masterTl.duration().toFixed(3)}s`);
            //   if(console.groupEnd) console.groupEnd(); 
            // }
            resolve();
          },
          onError: (error) => {
            // if (this.debug) {
                console.error(`[PhaseRunner | ${performance.now().toFixed(2)}ms] <<<< FAILED >>>> Phase ${phaseConfig.phase}: ${phaseConfig.name}`, error);
                // if(console.groupEnd) console.groupEnd();
            // }
            reject(error);
          }
        });
        // console.log(`[PhaseRunner | ${performance.now().toFixed(2)}ms] Phase ${phaseConfig.phase} (${phaseConfig.name}): MASTER TL CREATED. Will populate.`);


        if (phaseConfig.terminalMessageKey) {
            // console.log(`[${phaseIdForRunLog} | ${performance.now().toFixed(2)}ms] PhaseRunner: Scheduling terminalMessageKey '${phaseConfig.terminalMessageKey}' at GSAP_pos 0.`);
            masterTl.call(() => {
                // console.log(`[${phaseIdForRunLog} | ${performance.now().toFixed(2)}ms] PhaseRunner: EXECUTING emit requestTerminalMessage for '${phaseConfig.terminalMessageKey}' (Master TL time: ${masterTl.time().toFixed(3)}s)`);
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
        
        let calculatedMaxAnimationEndTime = 0;
        const children = masterTl.getChildren(); 
        children.forEach(child => {
            const endTime = child.startTime() + child.duration();
            if (endTime > calculatedMaxAnimationEndTime) {
                calculatedMaxAnimationEndTime = endTime;
            }
        });

        let phaseConfiguredDuration = phaseConfig.duration || MIN_PHASE_DURATION_FOR_STEPPING;
        let effectiveMinDuration = Math.max(phaseConfiguredDuration, calculatedMaxAnimationEndTime);

        if (masterTl.duration() < effectiveMinDuration) {
            // console.log(`[PhaseRunner | ${performance.now().toFixed(2)}ms] Phase ${phaseConfig.phase} (${phaseConfig.name}): Padding masterTl. Current_GSAP_Calc_Duration ${masterTl.duration().toFixed(3)}, Target_EffectiveMinDuration ${effectiveMinDuration.toFixed(3)} (calcMaxChildEnd: ${calculatedMaxAnimationEndTime.toFixed(3)}, configPhaseDur: ${phaseConfiguredDuration.toFixed(3)})`);
            masterTl.to({}, { duration: effectiveMinDuration - masterTl.duration() }, ">"); 
        } else {
            //  console.log(`[PhaseRunner | ${performance.now().toFixed(2)}ms] Phase ${phaseConfig.phase} (${phaseConfig.name}): No padding needed for masterTl. Current_GSAP_Calc_Duration ${masterTl.duration().toFixed(3)} >= EffectiveMinDuration ${effectiveMinDuration.toFixed(3)}`);
        }
        
        // console.log(`[PhaseRunner_MasterTL_PrePlay | ${performance.now().toFixed(2)}ms] Phase ${phaseConfig.phase} (${phaseConfig.name}): Master TL duration before play: ${masterTl.duration().toFixed(3)}s. Children count: ${masterTl.getChildren().length}`);
        // masterTl.getChildren().forEach((child, idx) => {
        //     const childId = child.vars?.id || child.vars?.name || `child_${idx}`;
        //     console.log(`  Child ${idx} (${childId}): StartTime=${child.startTime().toFixed(3)}, Duration=${child.duration().toFixed(3)}s`);
        // });

        // console.log(`[PhaseRunner | ${performance.now().toFixed(2)}ms] Phase ${phaseConfig.phase} (${phaseConfig.name}): Master Timeline Final Effective Duration: ${masterTl.duration().toFixed(3)}, calling PLAY.`);
        masterTl.play();

      } catch (error) {
        console.error(`[PhaseRunner RUN | ${performance.now().toFixed(2)}ms] Error setting up Phase ${phaseConfig.phase}:`, error);
        // if (this.debug && console.groupEnd) console.groupEnd();
        reject(error);
      }
    });
  }

  _buildAnimation(tl, anim, currentPhaseConfig) { 
    const position = anim.position !== undefined ? anim.position : '>'; 
    const phaseIdForLog = `P${currentPhaseConfig.phase}_${currentPhaseConfig.name}`;

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
                // Special case for 'config' dependency to pass the whole resolved config object
                if (depName === 'config') {
                    return serviceLocator.get('config');
                }
                return serviceLocator.get(depName);
            } catch (e) {
                console.error(`[PhaseRunner | ${performance.now().toFixed(2)}ms] Error resolving dependency "${depName}" for 'call' animation in phase ${currentPhaseConfig.name}:`, e.message);
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
            // console.log(`[${phaseIdForLog} | ${performance.now().toFixed(2)}ms] PhaseRunner: Scheduling audio '${anim.soundKey}' at GSAP_pos ${position}`);
            tl.call(() => {
                // console.log(`[${phaseIdForLog} | ${performance.now().toFixed(2)}ms] PhaseRunner: EXECUTING AudioManager.play for '${anim.soundKey}' (Master TL time: ${tl.time().toFixed(3)}s)`);
                this.managers.audioManager.play(anim.soundKey, anim.forceRestart || false); 
            }, [], position);
        }
        break;
      default:
        console.warn(`[PhaseRunner | ${performance.now().toFixed(2)}ms] Unknown animation type: ${anim.type}`);
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
    let buttonManager; // Will be retrieved only if needed

    if (anim.target === 'buttonGroup') {
      buttonManager = serviceLocator.get('buttonManager');
      elements = buttonManager.getButtonsByGroupIds(anim.groups);
      isButtonFlicker = true;
    } else if (typeof anim.target === 'string') {
        buttonManager = serviceLocator.get('buttonManager');
        const buttonInstance = buttonManager.getButtonByAriaLabel(anim.target);
        if (buttonInstance) {
            elements.push(buttonInstance.getElement()); // Get the DOM element
            isButtonFlicker = true;
        } else {
             // Maybe it's a DOM element ID from domElementsRegistry?
            const domElement = this.dom[anim.target];
            if (domElement) {
                elements.push(domElement);
                // isButtonFlicker remains false unless we can confirm it's a button
            }
        }
    } else if (Array.isArray(anim.target)) { // Assume array of DOM element keys
        elements = anim.target.map(id => this.dom[id]).filter(Boolean);
    }


    if (elements.length === 0) {
        // if(this.debug) console.warn(`[PhaseRunner _handleSimpleFlicker | ${performance.now().toFixed(2)}ms] No elements found for anim target:`, anim.target, `in phase ${currentPhaseConfig.name}`);
        return;
    }

    const stagger = anim.stagger || 0;
    elements.forEach((el, index) => {
        if (isButtonFlicker) {
            // buttonManager is guaranteed to be defined here due to the logic above
            const buttonInstance = buttonManager.getButtonInstance(el);
            if (!buttonInstance) {
                console.warn(`[PhaseRunner _handleSimpleFlicker | ${performance.now().toFixed(2)}ms] No button instance found for element:`, el, `in phase ${currentPhaseConfig.name}`);
                return;
            }

            let effectiveProfile = anim.profile;
            // ... (profile selection logic, seems okay) ...
            
            const flickerOptions = {
              profileName: effectiveProfile,
              phaseContext: `PhaseRunner_P${currentPhaseConfig.phase}_${effectiveProfile}` 
            };

            const flickerResult = buttonManager.playFlickerToState(el, anim.state, flickerOptions);

            if (flickerResult && flickerResult.timeline) {
                const childTlDuration = flickerResult.timeline.duration();
                const buttonId = buttonInstance.getIdentifier();
                // console.log(`[PhaseRunner_FlickerAdd | ${performance.now().toFixed(2)}ms] Adding flicker timeline for ${buttonId} to master. Child TL Duration: ${childTlDuration.toFixed(3)}s. Position: ${position}+=${index * stagger}`);
                if (childTlDuration <= 0.01 && (!flickerResult.timeline.getChildren || flickerResult.timeline.getChildren().length === 0)) { // More robust check for empty
                    //  console.warn(`[PhaseRunner_FlickerAdd_WARN | ${performance.now().toFixed(2)}ms] Child flicker timeline for ${buttonId} is very short or empty!`);
                }
                tl.add(flickerResult.timeline, `${position}+=${index * stagger}`);
            } else {
                console.error(`[PhaseRunner_FlickerAdd_ERROR | ${performance.now().toFixed(2)}ms] No timeline returned from playFlickerToState for ${buttonInstance.getIdentifier()}`);
            }

        } else { // For non-button flickers
            const flickerTl = this.managers.lcdUpdater.getLcdPowerOnTimeline(el, { 
                profileName: anim.profile,
                state: anim.state
            });
            if (flickerTl) {
                const childTlDuration = flickerTl.duration();
                const elId = el.id || el.className.split(' ')[0] || 'unknownElement';
                // console.log(`[PhaseRunner_FlickerAdd_NonButton | ${performance.now().toFixed(2)}ms] Adding LCD flicker timeline for ${elId} to master. Child TL Duration: ${childTlDuration.toFixed(3)}s. Position: ${position}+=${index * stagger}`);
                if (childTlDuration <= 0.01 && (!flickerTl.getChildren || flickerTl.getChildren().length === 0)) {
                    //  console.warn(`[PhaseRunner_FlickerAdd_NonButton_WARN | ${performance.now().toFixed(2)}ms] Child LCD flicker for ${elId} is very short or empty!`);
                }
                tl.add(flickerTl, `${position}+=${index * stagger}`);
            } else {
                 console.error(`[PhaseRunner_FlickerAdd_NonButton_ERROR | ${performance.now().toFixed(2)}ms] No timeline returned from getLcdPowerOnTimeline for ${el.id || 'unknownElement'}`);
            }
        }
    });
  }
}