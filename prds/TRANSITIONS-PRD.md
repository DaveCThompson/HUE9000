Product Requirements Document: Startup Transition Refinement
1. Introduction
This document outlines the requirements for refactoring the CSS mechanism that handles the global visual transition when the HUE 9000 interface switches from "DIM mode" to its "Full Theme" (Dark or Light) during the startup sequence (Phase 6.A). The current implementation in _startup-transition.css uses a broad list of selectors, which needs to be made more targeted and maintainable.
2. Goals
Improve Maintainability: Reduce the need to manually update a long list of CSS selectors when new components are added or existing ones are restructured.
Increase Explicitness: Clearly define which elements are intended to participate in the synchronized 1-second global transition.
Enhance Performance (Minor): Potentially reduce browser rendering overhead by using more targeted selectors.
Maintain Visual Fidelity: Ensure the 1-second synchronized visual shift for key properties (opacity, background-color, color, border-color, box-shadow, fill, stroke, filter, background-image, text-shadow) remains smooth and consistent across all affected elements.
3. Current State & Problem
_startup-transition.css currently defines a rule with a very long list of selectors (e.g., body.is-transitioning-from-dim, body.is-transitioning-from-dim .panel-bezel, etc.).
This approach is fragile:
New components requiring this transition might be missed.
Restructuring existing components might break the selectors.
The list is hard to read and verify.
It applies a blanket transition to many elements, some of which might not actually change or need this specific override.
4. Proposed Solution: Dedicated Transition Class
Introduce a new CSS utility class: e.g., .animate-on-dim-exit.
JavaScript Orchestration (main.js - GsapPhase6_ThemeTransitionAndFinalEnergize):
Before adding body.is-transitioning-from-dim and switching theme classes:
Identify all DOM elements that genuinely need the synchronized 1-second transition due to CSS variable changes affecting their visual properties.
Programmatically add the .animate-on-dim-exit class to these identified elements.
Proceed with adding body.is-transitioning-from-dim and switching body.theme-dim to body.theme-dark (or body.theme-light).
After the 1-second transition period (managed by GSAP's onComplete for this phase):
Programmatically remove the .animate-on-dim-exit class from all elements it was added to.
Remove body.is-transitioning-from-dim.
CSS Modification (_startup-transition.css):
Replace the current long list of selectors with a single, more targeted rule:
body.is-transitioning-from-dim .animate-on-dim-exit {
    transition-property:
        opacity,
        background-color,
        color,
        border-color,
        box-shadow,
        fill, /* For SVG parts */
        stroke, /* For SVG parts */
        filter,
        background-image, /* For panel gradients, body background */
        text-shadow
        !important;
    transition-duration: 1s !important;
    transition-timing-function: ease-out !important;
    transition-delay: 0s !important;
}
Use code with caution.
Css
The body.is-transitioning-from-dim part of the selector ensures this rule is only active during the specific transition phase.
5. Scope
In Scope:
Modifying src/js/main.js to implement the class addition/removal logic.
Modifying src/css/animations/_startup-transition.css to use the new class.
Identifying the specific elements that require this transition (e.g., panel bezels, panel sections, control blocks, buttons, logo, dial housings, LCDs, lens container elements, grill, color chips, labels).
Out of Scope:
Changing the 1-second duration or the ease-out timing function.
Altering the list of transition-property values unless a property is found to be unnecessary for any element during this transition.
6. Success Criteria
The startup sequence (Phase 6.A) visually transitions smoothly from DIM to Full Theme over 1 second for all designated elements.
_startup-transition.css is significantly simplified, primarily targeting .animate-on-dim-exit.
The system is more robust to future additions/changes of UI components.
No visual regressions in the startup transition.
7. Assumptions & Dependencies
GSAP will continue to manage the timing of the overall startup phase.
JavaScript has access to all relevant DOM elements to add/remove the class.
8. Risks & Mitigation
Risk: Missing some elements that should have the .animate-on-dim-exit class.
Mitigation: Thorough visual testing of the startup sequence across all themes. Careful review of existing selectors in _startup-transition.css to create the initial list of elements for JS to target.
Risk: Performance impact of JS DOM manipulation (adding/removing classes).
Mitigation: This is expected to be minimal as it happens once per startup. The number of elements is manageable.
