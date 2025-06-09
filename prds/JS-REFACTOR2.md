Of course. Here is a Product Requirements Document (PRD) detailing the planned refactoring. This document is structured to be clear for developers, project managers, and QA testers, outlining the what, why, and how of the proposed changes.

PRD: HUE 9000 JavaScript Codebase Refactoring (v2.1-Refactor)

Document Owner: System Architect
Date: October 26, 2023
Status: Proposed

1. Overview & Introduction

This document outlines a planned refactoring of the HUE 9000 user interface's JavaScript codebase. The current architecture is functionally sound but has grown complex, with a flat file structure that hinders developer velocity and maintainability. This initiative will not introduce new user-facing features but will significantly improve the codebase's organization, clarity, and robustness, setting a stronger foundation for future development.

2. Problem Statement

As the HUE 9000 project has evolved, the number of JavaScript files has increased significantly. The current flat directory structure in src/js/ makes it difficult to:

Quickly locate files based on their function (e.g., UI component vs. application logic manager).

Understand the relationships and dependencies between different parts of the system.

Onboard new developers efficiently.

Maintain a clean separation of concerns.

Additionally, minor code duplication and vestigial configuration variables have accumulated, creating technical debt that should be addressed proactively.

3. Goals & Objectives

The primary goals of this refactoring are:

Improve Maintainability: Make the codebase easier to read, understand, and modify.

Enhance Developer Experience: Reduce the cognitive load required to navigate the project and find relevant code.

Increase Robustness: Eliminate silent-failure points and reduce duplicated logic.

Establish Clear Conventions: Solidify the architectural patterns for future feature development.

This refactoring will be considered successful if it achieves these goals without introducing any regressions in existing application functionality.

4. Scope
In Scope:

File & Directory Restructuring: Reorganizing JavaScript files into a logical directory structure.

Code Cleanup: Removing unused or commented-out code and configuration variables.

Logic Consolidation: Refactoring duplicated logic into shared, reusable utility functions.

Path Updates: Updating all import and export statements to reflect the new file structure.

Out of Scope:

New User-Facing Features: No changes will be made to the UI's appearance or behavior from an end-user's perspective.

Major Architectural Changes: The core architecture (Service Locator, App State, GSAP) will remain unchanged.

HTML/CSS Changes: This refactoring is confined to the JavaScript files within the src/js/ directory.

5. Detailed Requirements & Implementation Plan

This refactoring will be executed in three distinct parts.

5.1. File System Reorganization

Requirement: Group JavaScript files into directories based on their architectural role to improve discoverability and separation of concerns.

Implementation:
Three new directories will be created within src/js/:

components/: For presentational component classes that manage their own DOM and state based on props.

managers/: For higher-level controllers that manage application logic and orchestrate components.

startup/: For all files related to the application's boot sequence.

File Migration Plan:

Source File (src/js/)	Destination Directory (src/js/...)
Button.js	components/
Dial.js	components/
IntensityDisplay.js	components/
MoodMatrix.js	components/
AmbientAnimationManager.js	managers/
buttonManager.js	managers/
dialManager.js	managers/
DynamicStyleManager.js	managers/
IntensityDisplayManager.js	managers/
LcdUpdater.js	managers/
lensManager.js	managers/
MoodMatrixManager.js	managers/
ThemeManager.js	managers/
PhaseRunner.js	startup/
startupMachine.js	startup/
startupPhase[0-11].js	startup/
startupSequenceManager.js	startup/

Files remaining in src/js/ will be core services and utilities (main.js, appState.js, config.js, utils.js, etc.).

5.2. Code & Configuration Cleanup

Requirement: Remove vestigial code and configuration to reduce clutter and prevent confusion.

Implementation:

config.js: The following unused constants will be removed:

GSAP_BUTTON_IDLE_DURATION_MIN

GSAP_BUTTON_IDLE_DURATION_MAX

GSAP_BUTTON_IDLE_EASE

HARMONIC_RESONANCE_PARAMS.LIGHT_OPACITY_RANGE

HARMONIC_RESONANCE_PARAMS.DISPLAY_LIGHTNESS_FACTOR_RANGE

startup/PhaseRunner.js: The deprecated else block within the _handleSimpleFlicker method, which handled non-button flickers, will be removed. This logic is now correctly managed by the lcdPowerOn animation type.

5.3. Logic Consolidation (DRY Principle)

Requirement: Abstract duplicated logic into a single, reusable utility function to improve maintainability and reduce code volume.

Implementation:

Identify Duplication: The MoodMatrixManager.js and IntensityDisplayManager.js files contain nearly identical code for managing the "resonance" CSS class on their respective LCD elements after a period of user inactivity.

Create Utility Function: A new function, manageCssStateOnInteraction, will be created in src/js/utils.js. This function will encapsulate the logic of starting/clearing a timeout to add/remove a CSS class based on an isInteracting flag.

Function Signature: manageCssStateOnInteraction({ isInteracting, element, timerRef, className, delay, condition })

Refactor Managers: Both MoodMatrixManager.js and IntensityDisplayManager.js will be updated to import and use this new utility, replacing their duplicated handleInteractionChange logic with a single call to the new function.

6. Technical Considerations

Import Paths: The most critical task is ensuring all import paths across all JavaScript files are correctly updated to reflect the new directory structure. This will require a careful, file-by-file review.

Testing: Since this is a pure refactoring effort, the existing functionality provides a clear baseline for testing. The primary testing method will be regression testing.

7. Testing & Validation Plan

QA Strategy: No new automated tests will be written. Validation will be performed through manual regression testing of all user interactions and system behaviors.

Test Cases:

Startup Sequence:

Verify that the startup sequence (both step-through and auto-play) completes successfully without any visual or console errors.

Confirm all animations in all 12 phases execute as before.

Dial Interaction:

Confirm that both Dial A (Mood) and Dial B (Intensity) are interactive.

Verify that the Mood Matrix and Intensity Display update correctly during interaction.

Verify that the "resonance" effect on the LCDs activates after a period of inactivity and deactivates immediately upon interaction.

Button Interaction:

Test every button on the interface (Power, Aux Light, Skill Scan, Fit Eval, Hue Assignment Grid).

Confirm that all buttons provide visual feedback and correctly update the application state.

Resistive Shutdown:

Verify that repeatedly clicking the "MAIN PWR OFF" button triggers the multi-stage resistive shutdown sequence as expected.

Confirm that clicking "MAIN PWR ON" cancels the sequence.

Terminal:

Confirm that all startup, status, and button-triggered messages appear correctly in the terminal.

8. Rollout Plan

This refactoring will be performed on a dedicated feature branch (refactor/js-codebase-v2.1). The changes will be merged into the main development branch after a thorough code review and successful completion of the validation plan. This is a low-risk, non-user-facing change and can be deployed as part of the next scheduled release.