/**
 * @module lensManager
 * @description Manages the visual lens power, including smoothing, oscillation,
 * and direct CSS variable updates for the lens gradient stops.
 * Reacts to changes in true lens power, Dial B interaction state, and Dial A hue from appState.
 * (Project Decouple Refactor)
 */
import { serviceLocator } from './serviceLocator.js';
import { debounce, mapRange } from './utils.js';

export class LensManager {
  constructor() {
    this.gsap = null;
    this.appState = null;
    this.config = null;
    this.dom = {};

    this.isOscillating = false;
    this.smoothedTrueLensPower = { value: 0.0 };
    this.trueLensPowerTarget = 0.0;
    this.powerSmoothingTween = null;
    this.currentMasterHue = -1;
    this.lastAppliedGradientString = "";
    this.lastVisualPowerForGradientRender = -1;
    this.lastHueForGradientRender = -1;
    this.lastSuperGlowHue = -1;
    this.currentLensHueProxy = { value: -1 };
    this.debouncedSetLegacyLensPowerVar = null;
    this.debug = true;
  }

  init() {
    this.gsap = serviceLocator.get('gsap');
    this.appState = serviceLocator.get('appState');
    this.config = serviceLocator.get('config');
    this.dom = serviceLocator.get('domElements');

    if (this.debug) console.log('[LensManager INIT]');

    this.debouncedSetLegacyLensPowerVar = debounce((visualPower) => {
      const clampedPower = Math.max(0.0, Math.min(visualPower, 1.05));
      this.dom.root.style.setProperty('--lens-power', clampedPower.toFixed(3));
    }, this.config.DEBOUNCE_DELAY / 3);

    const initialPower01 = this.appState.getTrueLensPower();
    const initialDialAState = this.appState.getDialState('A');
    this.currentMasterHue = initialDialAState ? ((initialDialAState.hue % 360) + 360) % 360 : this.config.DEFAULT_DIAL_A_HUE;
    this.currentLensHueProxy.value = this.currentMasterHue;
    this.lastHueForGradientRender = this.currentMasterHue;
    this._updateSuperGlowHue(this.currentMasterHue);

    this.smoothedTrueLensPower.value = initialPower01;
    this.trueLensPowerTarget = initialPower01;
    this.directUpdateLensVisuals(initialPower01);

    this.appState.subscribe('trueLensPowerChanged', (p) => this._handleTrueLensPowerChange(p));
    this.appState.subscribe('dialBInteractionChange', (s) => this._handleDialBInteractionChange(s));
    this.appState.subscribe('dialUpdated', (p) => this._handleDialAUpdateForLensHue(p));
    this.appState.subscribe('appStatusChanged', (s) => this._handleAppStatusChangeForLens(s));
    // Subscribe to the master ambient pulse for synchronized oscillation
    this.appState.subscribe('ambientPulse', ({ progress }) => this._applyOscillationVisuals(progress));
  }

  energizeLensCoreStartup(targetPowerPercent = null, rampDurationMs = null) {
    const effectiveTargetPower = targetPowerPercent ?? this.config.LENS_STARTUP_TARGET_POWER;
    const effectiveRampDuration = rampDurationMs ?? this.config.LENS_STARTUP_RAMP_DURATION;

    const tl = this.gsap.timeline();
    const initialPower01 = this.appState.getTrueLensPower();
    const lensPowerProxy = { value: initialPower01 * 100 };

    if (initialPower01 <= 0.0001) this._updateLensGradientVisuals(0.0);

    tl.to(lensPowerProxy, {
      value: effectiveTargetPower,
      duration: effectiveRampDuration / 1000,
      ease: "sine.inOut",
      onStart: () => {
        if (this.dom.colorLensGradient.style.opacity !== '1' && this.appState.getAppStatus() !== 'loading') {
          this.dom.colorLensGradient.style.opacity = '1';
        }
      },
      onUpdate: () => this.appState.setTrueLensPower(lensPowerProxy.value),
      onComplete: () => {
        const finalPowerPercent = lensPowerProxy.value;
        this.appState.setTrueLensPower(finalPowerPercent);
        const dialBHue = (finalPowerPercent / 100) * 359.999;
        const dialBRotation = dialBHue * this.config.DIAL_B_VISUAL_ROTATION_PER_HUE_DEGREE_CONFIG;
        this.appState.updateDialState('B', {
          hue: dialBHue,
          targetHue: dialBHue,
          rotation: dialBRotation,
          targetRotation: dialBRotation,
        });
      }
    });
    return tl;
  }

  directUpdateLensVisuals(visualPower01) {
    this._updateLensGradientVisuals(visualPower01);
    this._setLegacyLensPowerVar(visualPower01, true);
  }

  _setLegacyLensPowerVar(visualPower01, forceImmediate = false) {
    if (forceImmediate) {
      const clampedPower = Math.max(0.0, Math.min(visualPower01, 1.05));
      this.dom.root.style.setProperty('--lens-power', clampedPower.toFixed(3));
    } else {
      this.debouncedSetLegacyLensPowerVar(visualPower01);
    }
  }

  _updateSuperGlowHue(hue) {
    const normalizedHue = ((Number(hue) % 360) + 360) % 360;
    if (Math.abs(normalizedHue - this.lastSuperGlowHue) >= this.config.HUE_UPDATE_THRESHOLD || this.lastSuperGlowHue === -1) {
      this.dom.root.style.setProperty('--dynamic-lens-super-glow-hue', normalizedHue.toFixed(1));
      this.lastSuperGlowHue = normalizedHue;
    }
  }

  _handleDialAUpdateForLensHue(payload) {
    if (this.appState.getAppStatus() === 'loading' || !payload || payload.id !== 'A' || !payload.state) return;

    const dialAState = payload.state;
    const newMasterHueTarget = ((dialAState.hue % 360) + 360) % 360;

    if (this.gsap.isTweening(this.currentLensHueProxy)) this.gsap.killTweensOf(this.currentLensHueProxy);

    if (dialAState.isDragging) {
      this.currentMasterHue = newMasterHueTarget;
      this.currentLensHueProxy.value = newMasterHueTarget;
      this._updateSuperGlowHue(this.currentMasterHue);
      this._updateLensVisualsWithCurrentState();
      return;
    }

    const hueDiff = Math.abs(newMasterHueTarget - this.currentMasterHue);
    if (Math.min(hueDiff, 360 - hueDiff) < this.config.HUE_UPDATE_THRESHOLD && this.currentMasterHue !== -1) return;

    let duration = this.config.LENS_OSCILLATION_HUE_SMOOTHING_DURATION;
    let ease = "power1.out";
    const shutdownStage = this.appState.getResistiveShutdownStage();
    if (shutdownStage > 0) {
      const stageParams = this.config.RESISTIVE_SHUTDOWN_PARAMS[`STAGE_${shutdownStage}`];
      if (stageParams) {
        duration = stageParams.LENS_ANIM_DURATION_S;
        ease = stageParams.LENS_ANIM_EASING || this.config.RESISTIVE_SHUTDOWN_PARAMS.LENS_ANIMATION_EASING_DEFAULT;
      }
    }

    let targetForTween = newMasterHueTarget;
    if (Math.abs(targetForTween - this.currentLensHueProxy.value) > 180) {
      targetForTween += (targetForTween > this.currentLensHueProxy.value) ? -360 : 360;
    }

    this.gsap.to(this.currentLensHueProxy, {
      value: targetForTween,
      duration: duration,
      ease: ease,
      onUpdate: () => {
        this.currentMasterHue = this.gsap.utils.wrap(0, 360)(this.currentLensHueProxy.value);
        this._updateSuperGlowHue(this.currentMasterHue);
        this._updateLensVisualsWithCurrentState();
      },
      onComplete: () => {
        this.currentMasterHue = this.gsap.utils.wrap(0, 360)(this.currentLensHueProxy.value);
      }
    });
  }

  _updateLensVisualsWithCurrentState(forceLegacyUpdate = false) {
    // This method now only updates based on the base (smoothed) power.
    // The oscillation is additive and handled by _applyOscillationVisuals.
    const baseVisualPower01 = this.smoothedTrueLensPower.value;
    this._setLegacyLensPowerVar(baseVisualPower01, forceLegacyUpdate);
    this._updateLensGradientVisuals(baseVisualPower01);
  }

  _updateLensGradientVisuals(visualPower) {
    const lensEl = this.dom.colorLensGradient;
    if (!lensEl) return;

    const appStatus = this.appState.getAppStatus();
    const powerIsZero = visualPower <= 0.0001;

    if (appStatus === 'loading' || appStatus === 'error' || (appStatus === 'starting-up' && powerIsZero)) {
      if (lensEl.style.opacity !== '0') lensEl.style.opacity = '0';
      return;
    }
    if (lensEl.style.opacity !== '1') lensEl.style.opacity = '1';

    const powerChanged = Math.abs(visualPower - this.lastVisualPowerForGradientRender) >= 0.0001;
    const hueChanged = Math.abs(this.currentMasterHue - this.lastHueForGradientRender) >= this.config.HUE_UPDATE_THRESHOLD;
    if (!powerChanged && !hueChanged) return;

    const breakpoints = this.config.LENS_GRADIENT_BREAKPOINTS;
    const powerForSelection = Math.max(breakpoints[0].power, visualPower);
    let prevBreakpoint = breakpoints[0], nextBreakpoint = breakpoints[0];

    for (let i = 0; i < breakpoints.length; i++) {
      if (powerForSelection <= breakpoints[i].power) {
        nextBreakpoint = breakpoints[i];
        prevBreakpoint = i > 0 ? breakpoints[i - 1] : breakpoints[0];
        break;
      }
      if (i === breakpoints.length - 1) {
        prevBreakpoint = nextBreakpoint = breakpoints[i];
      }
    }

    let t = 0;
    if (nextBreakpoint.power > prevBreakpoint.power) {
      t = (Math.max(prevBreakpoint.power, Math.min(visualPower, nextBreakpoint.power)) - prevBreakpoint.power) / (nextBreakpoint.power - prevBreakpoint.power);
    }

    const gradientStops = [];
    for (let i = 0; i < this.config.NUM_LENS_GRADIENT_STOPS; i++) {
      const prev = prevBreakpoint.stops[i];
      const next = nextBreakpoint.stops[i];
      const l = prev.l + t * (next.l - prev.l);
      const c = prev.c + t * (next.c - prev.c);
      const pos = prev.pos + t * (next.pos - prev.pos);
      let stopHue = (prev.type === 'hotspot') ? (this.currentMasterHue + this.config.LENS_HOTSPOT_HUE_OFFSET) : this.currentMasterHue;
      if (prev.type === 'darkedge' || prev.type === 'blackedge') stopHue = 0;
      stopHue = ((stopHue % 360) + 360) % 360;
      gradientStops.push(`oklch(${l.toFixed(3)} ${c.toFixed(3)} ${stopHue.toFixed(1)}) ${(pos * 100).toFixed(2)}%`);
    }

    const finalGradient = `radial-gradient(circle at 50% 50%, ${gradientStops.join(", ")})`;
    if (lensEl.style.background !== finalGradient) lensEl.style.background = finalGradient;

    this.lastAppliedGradientString = finalGradient;
    this.lastVisualPowerForGradientRender = visualPower;
    this.lastHueForGradientRender = this.currentMasterHue;
  }

  _handleTrueLensPowerChange(newTruePower01) {
    this.trueLensPowerTarget = newTruePower01;
    if (this.powerSmoothingTween) this.powerSmoothingTween.kill();

    const isStartingUp = this.appState.getAppStatus() === 'starting-up';
    const isDialIdle = this.appState.getDialBInteractionState() === 'idle';
    const shutdownStage = this.appState.getResistiveShutdownStage();

    let duration = this.config.LENS_OSCILLATION_SMOOTHING_DURATION;
    let ease = "power1.out";
    if (shutdownStage > 0) {
      const stageParams = this.config.RESISTIVE_SHUTDOWN_PARAMS[`STAGE_${shutdownStage}`];
      if (stageParams) {
        duration = stageParams.LENS_ANIM_DURATION_S;
        ease = stageParams.LENS_ANIM_EASING || this.config.RESISTIVE_SHUTDOWN_PARAMS.LENS_ANIMATION_EASING_DEFAULT;
      }
    }

    if (isStartingUp || !isDialIdle) {
      this.smoothedTrueLensPower.value = this.trueLensPowerTarget;
      this._updateLensVisualsWithCurrentState(true);
    } else {
      this.powerSmoothingTween = this.gsap.to(this.smoothedTrueLensPower, {
        value: this.trueLensPowerTarget, duration: duration, ease: ease,
        onUpdate: () => this._updateLensVisualsWithCurrentState(),
        onComplete: () => {
          this.powerSmoothingTween = null;
          this._updateLensVisualsWithCurrentState(true);
          if (this.appState.getAppStatus() === 'interactive' && this.smoothedTrueLensPower.value >= this.config.LENS_OSCILLATION_THRESHOLD && !this.isOscillating) {
            this._startOscillation();
          }
        }
      });
    }

    if ((this.trueLensPowerTarget < this.config.LENS_OSCILLATION_THRESHOLD || !isDialIdle || isStartingUp) && this.isOscillating) {
      this._stopOscillation();
    }
    if (this.appState.getAppStatus() === 'interactive' && isDialIdle && this.smoothedTrueLensPower.value >= this.config.LENS_OSCILLATION_THRESHOLD && !this.isOscillating) {
      this._startOscillation();
    }
  }

  _handleDialBInteractionChange(newState) {
    if (newState !== 'idle') {
      if (this.isOscillating) this._stopOscillation();
      if (this.powerSmoothingTween) this.powerSmoothingTween.kill();
      this.smoothedTrueLensPower.value = this.appState.getTrueLensPower();
      this._updateLensVisualsWithCurrentState(true);
    } else {
      this._handleTrueLensPowerChange(this.appState.getTrueLensPower());
    }
  }

  _handleAppStatusChangeForLens(newStatus) {
    if (newStatus === 'loading' || newStatus === 'error') {
      if (this.isOscillating) this._stopOscillation();
      if (this.powerSmoothingTween) this.powerSmoothingTween.kill();
      this.smoothedTrueLensPower.value = 0;
      this.trueLensPowerTarget = 0;
      this._updateLensGradientVisuals(0);
      this._setLegacyLensPowerVar(0, true);
      if (this.dom.lensSuperGlow) this.dom.lensSuperGlow.style.opacity = '0';
      return;
    }

    this._updateLensVisualsWithCurrentState(true);
    this._updateSuperGlowHue(this.currentMasterHue);

    if (newStatus === 'interactive') {
      if (this.appState.getDialBInteractionState() === 'idle' && this.smoothedTrueLensPower.value >= this.config.LENS_OSCILLATION_THRESHOLD && !this.isOscillating) {
        this._startOscillation();
      }
    } else {
      if (this.isOscillating) this._stopOscillation();
    }
  }

  _startOscillation() {
    const canOscillate = this.appState.getAppStatus() === 'interactive' && 
                         this.appState.getDialBInteractionState() === 'idle';

    if (this.debug) {
        console.log(`[LensManager _startOscillation] Attempting to start. Conditions: isOscillating=${this.isOscillating}, canOscillate=${canOscillate} (appStatus: ${this.appState.getAppStatus()}, dialBState: ${this.appState.getDialBInteractionState()}, shutdownStage: ${this.appState.getResistiveShutdownStage()})`);
    }

    if (this.isOscillating || !canOscillate) return;
    
    this.isOscillating = true;
    if (this.debug) console.log('[LensManager _startOscillation] Oscillation STARTED.');
  }

  _stopOscillation() {
    if (!this.isOscillating) return;
    if (this.debug) console.log('[LensManager _stopOscillation] Oscillation STOPPED.');
    this.isOscillating = false;
    // Reset the visuals to the non-oscillated base power
    this._updateLensVisualsWithCurrentState(true);
  }

  /**
   * Applies the visual oscillation based on the global ambient pulse.
   * @param {number} progress - The global pulse progress (0 to 1).
   */
  _applyOscillationVisuals(progress) {
    if (!this.isOscillating) return;

    const powerAboveThreshold = Math.max(0, this.smoothedTrueLensPower.value - this.config.LENS_OSCILLATION_THRESHOLD);
    const powerRatio = Math.min(1, powerAboveThreshold / (1.0 - this.config.LENS_OSCILLATION_THRESHOLD));
    const amplitude = this.config.LENS_OSCILLATION_AMPLITUDE_MIN + powerRatio * this.config.LENS_OSCILLATION_AMPLITUDE_MAX_ADDITION;

    // Use the centrally-driven progress to calculate the lens-specific visual offset
    const oscillationOffset = this.gsap.utils.interpolate(-amplitude, amplitude, progress);
    const currentVisualPower01 = this.smoothedTrueLensPower.value + oscillationOffset;
    
    this._updateLensGradientVisuals(currentVisualPower01);
    this._setLegacyLensPowerVar(currentVisualPower01);
  }
}