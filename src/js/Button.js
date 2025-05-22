/**
 * @module Button
 * @description Represents a single UI button component, managing its state,
 * appearance (CSS classes, ARIA attributes), and specific animations.
 */
import { ButtonStates }  from './buttonManager.js'; // Import from buttonManager
// createAdvancedFlicker is not directly used here, but by buttonManager

class Button {
    /**
     * @param {HTMLElement} domElement - The HTMLElement for this button.
     * @param {object} config - Configuration object for the button.
     * @param {string} config.type - Type of button ('action', 'toggle', 'radio').
     * @param {string} config.groupId - The group ID this button belongs to.
     * @param {string} [config.value] - The value of the button, used for selection in groups.
     * @param {boolean} config.isSelectedByDefault - Initial selected state from DOM.
     * @param {object} gsapInstance - Passed GSAP instance.
     * @param {object} appStateService - Reference to appState.
     * @param {object} configModule - Reference to config.js.
     * @param {object} uiUpdaterService - Reference to uiUpdater.
     */
    constructor(domElement, config, gsapInstance, appStateService, configModule, uiUpdaterService) {
        this.element = domElement;
        this.config = config;
        this.gsap = gsapInstance;
        this.appState = appStateService;
        this.configModule = configModule;
        this.uiUpdater = uiUpdaterService;

        if (!this.gsap) {
            throw new Error(`[Button CONSTRUCTOR ${this.getIdentifier()}] GSAP instance is not available.`);
        }

        this.currentClasses = new Set(); // Will be populated by setState
        this.currentFlickerAnim = null;
        this._pressTimeoutId = null;
        this._isSelected = config.isSelectedByDefault || false;

        console.log(`[Button CONSTRUCTOR - ${this.getIdentifier()}] ID: ${this.element.id}, AriaLabel: ${this.element.ariaLabel}, Group: ${this.config.groupId}, Value: ${this.config.value}, isSelectedByDefault: ${config.isSelectedByDefault}, Initial _isSelected: ${this._isSelected}`);

        // Initial ARIA update based on internal _isSelected
        this._updateAriaAttributes();
        // Initial class state is set by buttonManager's setInitialDimStates -> setState(UNLIT)
    }

    getIdentifier() {
        return this.element.ariaLabel || this.element.id || this.config.value || `UnnamedButton_${this.config.groupId}_${this.config.type}`;
    }

    setState(newStateClassesStr, options = {}) {
        const { skipAria = false, internalFlickerCall = false, forceState = false, phaseContext } = options;
        const effectivePhaseContext = phaseContext || 'UnknownPhase_ButtonSetState';
        const buttonId = this.getIdentifier();

        const newClassesArray = newStateClassesStr ? newStateClassesStr.split(' ').filter(c => c) : [];
        const newClassesSet = new Set(newClassesArray);

        console.log(`[Button setState - ${buttonId}] ENTER. Requested state string: '${newStateClassesStr}'. Current _isSelected: ${this._isSelected}. PhaseContext: ${effectivePhaseContext}. Current DOM classes: '${this.element.className}'`);

        // Determine if a visual update is truly needed
        let stateChanged = forceState;
        if (!stateChanged) {
            const currentManagedClassesOnElement = new Set();
            Object.values(ButtonStates).flatMap(s => s.split(' ')).forEach(cls => {
                if (this.element.classList.contains(cls)) {
                    currentManagedClassesOnElement.add(cls);
                }
            });

            const targetManagedClasses = new Set(newClassesArray);
            if (this._isSelected) targetManagedClasses.add('is-selected'); else targetManagedClasses.delete('is-selected');


            if (currentManagedClassesOnElement.size !== targetManagedClasses.size) {
                stateChanged = true;
            } else {
                for (const cls of targetManagedClasses) {
                    if (!currentManagedClassesOnElement.has(cls)) {
                        stateChanged = true;
                        break;
                    }
                }
            }
        }

        if (!stateChanged && !forceState) {
            console.log(`[Button setState - ${buttonId}] No actual class change needed for '${newStateClassesStr}', _isSelected: ${this._isSelected}. DOM classes already reflect target. Skipping full update.`);
            if (!skipAria) this._updateAriaAttributes();
            return;
        }
        console.log(`[Button setState - ${buttonId}] Proceeding with state update. stateChanged: ${stateChanged}, forceState: ${forceState}`);


        if (!internalFlickerCall && this.currentFlickerAnim && this.currentFlickerAnim.isActive()) {
            console.log(`[Button setState - ${buttonId}] Killing active flicker animation.`);
            this.currentFlickerAnim.kill();
            this.currentFlickerAnim = null;
        }

        if (!internalFlickerCall) { // Only clear props if not part of an ongoing flicker's onComplete
            this.element.classList.remove(ButtonStates.FLICKERING);
            const lights = Array.from(this.element.querySelectorAll('.light'));
            if (lights.length > 0) {
                this.gsap.set(lights, { clearProps: "all" });
            }
            this.gsap.set(this.element, { clearProps: "css" }); // Clear inline styles set by GSAP
            console.log(`[Button setState - ${buttonId}] Cleared GSAP props (not internal flicker call).`);
        }

        // Define all possible state classes managed by ButtonStates (excluding 'is-selected' initially)
        const allPossibleStateClasses = Object.values(ButtonStates)
            .flatMap(s => s.split(' '))
            .filter(c => c && c !== 'is-selected');
        const uniqueStateClasses = [...new Set(allPossibleStateClasses)];

        // Remove all managed state classes from the element
        uniqueStateClasses.forEach(cls => {
            if (this.element.classList.contains(cls)) {
                this.element.classList.remove(cls);
            }
        });

        // Add the new base state classes (those not 'is-selected')
        newClassesSet.forEach(cls => {
            if (cls !== 'is-selected') {
                this.element.classList.add(cls);
            }
        });

        // Explicitly manage 'is-selected' based on the button's internal _isSelected state
        console.log(`[Button setState - ${buttonId}] BEFORE managing 'is-selected' class. _isSelected: ${this._isSelected}. Element has 'is-selected': ${this.element.classList.contains('is-selected')}`);
        if (this._isSelected) {
            this.element.classList.add('is-selected');
        } else {
            this.element.classList.remove('is-selected');
        }
        console.log(`[Button setState - ${buttonId}] AFTER managing 'is-selected' class. Element has 'is-selected': ${this.element.classList.contains('is-selected')}`);

        // Update internal currentClasses set from the DOM to ensure it's the source of truth
        this.currentClasses.clear();
        this.element.classList.forEach(cls => this.currentClasses.add(cls));

        console.log(`[Button setState - ${buttonId}] Final DOM classes: '${this.element.className}'. Final internal currentClasses: '${Array.from(this.currentClasses).join(' ')}'`);

        if (!skipAria) this._updateAriaAttributes();
    }

    _updateAriaAttributes() {
        const isEffectivelySelected = this._isSelected;

        if (this.config.type === 'toggle') {
            this.element.setAttribute('aria-pressed', isEffectivelySelected.toString());
        } else if (this.config.type === 'radio') {
            this.element.setAttribute('aria-checked', isEffectivelySelected.toString());
        }

        const isVisuallyInteractive = Array.from(this.currentClasses).some(cls =>
            cls === ButtonStates.ENERGIZED_UNSELECTED.split(' ')[0] ||
            cls === ButtonStates.DIMLY_LIT.split(' ')[0]
        );

        this.element.setAttribute('tabindex', isVisuallyInteractive ? '0' : '-1');
    }

    getElement() { return this.element; }
    getGroupId() { return this.config.groupId; }
    getValue() { return this.config.value; }
    getCurrentClasses() { return new Set(this.element.classList); } // Read directly from DOM for most current
    getCurrentStateClasses() {
        return Array.from(this.element.classList).join(' ');
    }

    isSelected() {
        return this._isSelected;
    }

    setSelected(selected, options = {}) {
        const { skipAnimation = false, themeContext = 'theme-dark', phaseContext = 'ButtonSetSelected' } = options;
        const buttonId = this.getIdentifier();
        console.log(`[Button setSelected - ${buttonId}] ENTER. Target selected: ${selected}. Current _isSelected: ${this._isSelected}. PhaseContext: ${phaseContext}. Current DOM classes: '${this.element.className}'`);

        if (this._isSelected === selected) {
            console.log(`[Button setSelected - ${buttonId}] _isSelected already matches target (${selected}). Checking if DOM class 'is-selected' needs update.`);
            // Even if _isSelected matches, the DOM might not reflect it if setState was called with a generic state.
            let domNeedsUpdate = false;
            if (selected && !this.element.classList.contains('is-selected')) {
                domNeedsUpdate = true;
                console.log(`[Button setSelected - ${buttonId}] DOM needs 'is-selected' added.`);
            }
            if (!selected && this.element.classList.contains('is-selected')) {
                domNeedsUpdate = true;
                console.log(`[Button setSelected - ${buttonId}] DOM needs 'is-selected' removed.`);
            }

            if (!domNeedsUpdate) {
                console.log(`[Button setSelected - ${buttonId}] No change to _isSelected or DOM 'is-selected' class needed. Returning.`);
                return;
            }
            // If DOM needs update, proceed to setState, but _isSelected itself doesn't change.
        } else {
            this._isSelected = selected;
            console.log(`[Button setSelected - ${buttonId}] Updated _isSelected to: ${this._isSelected}`);
        }


        // Determine the base classes (e.g., 'is-dimly-lit', 'is-energized') currently on the element,
        // excluding 'is-selected' to preserve the base visual state.
        let baseStateClass = ButtonStates.ENERGIZED_UNSELECTED; // Default if no other base found
        if (this.element.classList.contains(ButtonStates.DIMLY_LIT.split(' ')[0])) {
            baseStateClass = ButtonStates.DIMLY_LIT_UNSELECTED; // Use the unselected variant
        } else if (this.element.classList.contains(ButtonStates.UNLIT.split(' ')[0])) {
            baseStateClass = ButtonStates.UNLIT;
        } else if (this.element.classList.contains(ButtonStates.ENERGIZED_UNSELECTED.split(' ')[0])) {
            baseStateClass = ButtonStates.ENERGIZED_UNSELECTED;
        }
        // If it was 'is-energized is-selected', baseStateClass becomes 'is-energized'

        // Construct the new full state string
        let targetStateClasses = baseStateClass;
        if (this._isSelected) {
            // If baseStateClass already implies selection (e.g. from a faulty definition), don't double add.
            // But our ButtonStates are defined such that base states are unselected.
            if (baseStateClass === ButtonStates.DIMLY_LIT_UNSELECTED) targetStateClasses = ButtonStates.DIMLY_LIT_SELECTED;
            else if (baseStateClass === ButtonStates.ENERGIZED_UNSELECTED) targetStateClasses = ButtonStates.ENERGIZED_SELECTED;
            else if (baseStateClass === ButtonStates.UNLIT) targetStateClasses = ButtonStates.ENERGIZED_SELECTED; // Or UNLIT if selected unlit is a thing
            // else it's already a selected state string, or we default to ENERGIZED_SELECTED
        } else {
            // If unselecting, ensure we revert to the unselected version of the base state.
            if (baseStateClass === ButtonStates.DIMLY_LIT_SELECTED) targetStateClasses = ButtonStates.DIMLY_LIT_UNSELECTED;
            else if (baseStateClass === ButtonStates.ENERGIZED_SELECTED) targetStateClasses = ButtonStates.ENERGIZED_UNSELECTED;
            // else it's already an unselected state string or UNLIT.
        }


        console.log(`[Button setSelected - ${buttonId}] Determined targetStateClasses for setState: '${targetStateClasses}' based on new _isSelected: ${this._isSelected} and base: '${baseStateClass}'`);
        this.setState(targetStateClasses, { skipAnimation, themeContext, phaseContext, forceState: true }); // forceState to ensure DOM update
    }


    handleInteraction(eventType) {
        const buttonId = this.getIdentifier();
        console.log(`[Button handleInteraction - ${buttonId}] Event: ${eventType}, Type: ${this.config.type}, Current _isSelected: ${this._isSelected}`);
        if (this.config.type === 'toggle') {
            this.setSelected(!this._isSelected, { themeContext: this.appState.getCurrentTheme(), phaseContext: `ToggleInteract_${buttonId}` });
        } else if (this.config.type === 'radio') {
            if (!this._isSelected) {
                this.setSelected(true, { themeContext: this.appState.getCurrentTheme(), phaseContext: `RadioInteract_${buttonId}` });
            }
        } else if (this.config.type === 'action') {
            console.log(`[Button handleInteraction - ${buttonId}] Action triggered.`);
        }
    }


    setPressedVisuals(isPressed) {
        const buttonId = this.getIdentifier();
        // console.log(`[Button setPressedVisuals - ${buttonId}] isPressed: ${isPressed}`);
        if (this._pressTimeoutId && this.element.classList.contains(ButtonStates.PRESSING) && !isPressed) {
            clearTimeout(this._pressTimeoutId);
            this._pressTimeoutId = null;
        }

        if (isPressed) {
            this.element.classList.add(ButtonStates.PRESSING);
            const pressAnimationDurationString = getComputedStyle(this.element).getPropertyValue('--button-unit-pressed-effect-duration-css').trim() || '0.12s';
            const pressAnimationDurationMs = parseFloat(pressAnimationDurationString) * (pressAnimationDurationString.endsWith('ms') ? 1 : 1000);

            this._pressTimeoutId = setTimeout(() => {
                this.element.classList.remove(ButtonStates.PRESSING);
                this._pressTimeoutId = null;
            }, pressAnimationDurationMs + 50);
        } else {
            this.element.classList.remove(ButtonStates.PRESSING);
        }
    }

    destroy() {
        const buttonId = this.getIdentifier();
        if (this.currentFlickerAnim && this.currentFlickerAnim.isActive()) {
            this.currentFlickerAnim.kill();
        }
        if (this._pressTimeoutId) {
            clearTimeout(this._pressTimeoutId);
        }
        console.log(`[Button DESTROY - ${buttonId}] Destroyed.`);
    }
}

export default Button;