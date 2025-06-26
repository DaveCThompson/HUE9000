Excellent. The feedback has been integrated. The following is the updated and definitive plan for the HUE 9000 Interface Update v2.2. This plan is now considered the source of truth for development.

---

### **Product Requirements Document: HUE 9000 Interface Update v2.2 (Revised)**

**Document Information:**
*   **Title:** PRD: HUE 9000 Interface Update v2.2 - Streamlined UX & Mobile Enhancements
*   **Author:** System Analyst (Revised by Principal Engineer)
*   **Version:** 2.0 (Approved Plan)
*   **Date:** October 26, 2023

### 1. Overview

This document outlines the requirements for version 2.2 of the HUE 9000 interface. The primary goals of this update are to **streamline the desktop user experience** by removing superfluous controls and to **significantly enhance mobile usability** by introducing essential, non-intrusive UI controls. This update will pivot the desktop experience from a developer-focused debug tool to a polished, automated "showcase" mode, while making the mobile experience more interactive and complete.

### 2. Goals & Objectives

*   **Simplify Desktop Interaction:** Automate the startup sequence to remove the need for manual step-through controls, creating a more cinematic and accessible initial experience.
*   **Improve Mobile Usability:** Provide mobile users with core functionality (Reset, Mute, Info) that is currently absent, bringing the mobile experience closer to feature parity with the desktop.
*   **Refine Informational Content:** Re-purpose the desktop side panel into a dedicated "About" section, providing context, technical highlights, and contact information.
*   **Enhance Robustness:** Implement a reliable, in-app reset function that correctly reverts **all** system states to their initial post-preloader values without requiring a page reload.

### 3. User Stories

*   **As a first-time desktop user,** I want the full startup sequence to play automatically after the preloader so I can immediately appreciate the intended visual and audio experience.
*   **As a curious desktop user,** I want to click an "Info" button to learn more about the project's purpose, the technologies used, and how to contact the creator.
*   **As a mobile user,** I want to be able to restart the visual startup sequence to watch it again without reloading the page.
*   **As a mobile user,** I want a simple way to mute and unmute all application audio.
*   **As a mobile user,** I want to be able to access the "About" information in a format optimized for my screen.

### 4. Design & UX Requirements

#### 4.1 Desktop Experience Changes

1.  **Automated Startup Sequence:**
    *   Upon successful completion of the preloader, the main application startup sequence shall begin automatically.
    *   The sequence will play through all phases without requiring user interaction. The ability to pause the sequence will be removed to simplify the UI.

2.  **Compact Control Panel Simplification:**
    *   The compact control panel on the left shall be simplified.
    *   The "AUTO," "NEXT," and "PLAY" buttons shall be **removed**.
    *   The "RST" (Reset) and "AUD" (Audio Mute) buttons shall be retained.
    *   The "CTRL" (Control) button shall be redesigned to be an "INFO" button.
        *   **Icon:** `info` (Material Symbols Outlined)
        *   **Label Text:** `INFO`

3.  **"Info" Side Panel Rework:**
    *   The expandable side panel (`#control-deck`) will now function as an informational drawer.
    *   **Header:** A new header section shall be added at the top of the panel.
        *   It will contain the title "About HUE 9000" and a close "X" button (`close` icon).
    *   **Tabs:** The existing tabs will be replaced with: `About` (Default), `Highlights`, `Contact`.
    *   **Content:**
        *   **About Tab:** Briefing text about the project.
        *   **Highlights Tab:** Bulleted list of key technical achievements.
        *   **Contact Tab:** Links for Email, LinkedIn, Web, and GitHub.

#### 4.2 Mobile Experience Changes

1.  **Mobile Controls Overlay:**
    *   A new, non-intrusive UI overlay shall be present **only on mobile viewports**.
    *   **Layout:** Top-Left: "Reset" (`replay`) and "Mute/Unmute" (`volume_up`/`volume_off`). Top-Right: "Info" (`info`).
    *   **Functionality:** These buttons trigger the same core logic as their desktop counterparts.

2.  **Mobile Info Panel:**
    *   When the "Info" button is tapped, the Info Panel shall appear as a **full-screen overlay**, covering the main interface. Its internal layout will adapt responsively. The "X" close button dismisses this overlay.

#### 4.3 Reset Functionality (Cross-Platform)

*   The "Reset" button must trigger a fast, seamless, in-app reset.
*   This function must **fully and correctly** revert all application states to their initial post-preloader values without requiring a page reload. This includes, but is not limited to: dial positions, theme, lens power, and the resistive shutdown state.

### 5. Technical Requirements & Implementation Plan

#### 5.1 Key Architectural Changes

1.  **Centralized State Reset:**
    *   A new function, `resetAppStateToDefaults()`, will be created within `appState.js`.
    *   This function is the **single source of truth** for resetting the application's state. It must reset all mutable state variables to their initial values as defined in `appState.js` and `config.js`. This includes `dials`, `targetColorProps`, `currentTheme`, `currentTrueLensPower`, `dialBInteractionState`, `appStatus`, `currentStartupPhaseNumber`, `resistiveShutdownStage`, and `isMainPowerOffButtonDisabled`.
    *   The `startupSequenceManager.js` `_resetVisualsAndState()` method will be modified to call this new `appState.resetAppStateToDefaults()` function, ensuring a complete and reliable reset.

2.  **Unified Info Panel Logic:**
    *   `sidePanelManager.js` will be refactored to be a generic manager for the info panel (`#control-deck`). It will manage the panel's state (open/closed) and provide `toggle()` and `close()` methods.
    *   Event listeners for both the desktop "INFO" button and the new mobile "Info" button will call methods on this single, unified manager, eliminating duplicate logic.

#### 5.2 Key Code Changes
*   **`main.js`:**
    *   `initializeApp()`: Call `startupSequenceManager.start(false)` to enable autoplay.
    *   Add new event listeners for the mobile overlay controls (`#mobile-controls-overlay`). These listeners will delegate actions to the appropriate managers (e.g., `audioManager.toggleMute()`, `sidePanelManager.toggle()`, `startupManager.resetSequence()`).
*   **`index.html`:**
    *   Remove the old desktop sequence control buttons (`#seq-autoplay-toggle`, etc.).
    *   Rework the `#control-deck` DOM structure with the new header and tab content.
    *   Add the new `<div id="mobile-controls-overlay">...</div>` for mobile controls.
*   **`appState.js`:**
    *   Implement the new `resetAppStateToDefaults()` function as described in 5.1.
*   **`sidePanelManager.js`:**
    *   Remove event listeners and logic for the deleted sequence control buttons.
    *   Refactor the `_setupPanelToggles` method to handle only the new "INFO" button and the panel "Close" button.
    *   Expose `toggle()` and `close()` methods for use by external callers (`main.js`).
*   **`startupSequenceManager.js`:**
    *   In `_resetVisualsAndState()`, replace the surgical reset of `resistiveShutdownStage` with a single call to the new comprehensive reset function in `appState`.

#### 5.3 New CSS Requirements
*   **`_variables-structural.css`:**
    *   Define a global `z-index` contract to prevent stacking issues.
        ```css
        :root {
          /* ... other variables ... */
          --z-index-lens-glow: 100;
          --z-index-modal-overlay: 200; 
        }
        ```
*   **`_mobile.css`:**
    *   Add styles for `#mobile-controls-overlay`: `display: none;` by default, `display: flex;` within the mobile media query. It should have a `z-index` that places it above the main UI but below the info panel overlay.
    *   Add styles for when the info panel is expanded on mobile (`#control-deck.is-mobile-expanded`): `position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: var(--z-index-modal-overlay);`.
*   **`_side-panels.css`:**
    *   Add styles for the new panel header (`.panel-header`) and contact list (`.contact-list`).

#### 5.4 Pitfalls to Avoid
*   **Incomplete State Reset:** The #1 risk is failing to implement a complete state reset. The `resetAppStateToDefaults()` function in `appState.js` is mission-critical and must be comprehensive.
*   **Logic Duplication:** Adhere strictly to the unified panel manager plan to avoid creating separate logic paths for mobile and desktop controls.
*   **CSS Specificity & Stacking:** Use the new `z-index` variables to manage stacking order explicitly. Ensure new mobile styles are cleanly encapsulated within the mobile media query to avoid side effects.

---

### **File Manifest for Development LLM**

#### A) Files for CONTEXT

*   **JavaScript:**
    *   `DOMManager.js` (To identify element IDs and structure)
    *   `resistiveShutdownController.js` (Context for the original reset bug)
    *   `startupMachine.js` (To understand startup sequence structure)
    *   `startupMobile.js` (To see the mobile sequence definition)
    *   `config/index.js` (To get default state values for the reset function)

#### B) Files for MODIFICATION

*   **HTML:**
    *   `index.html` (Major DOM structure changes for controls and panels)
*   **CSS:**
    *   `src/css/1-base/_variables-structural.css` (Add z-index contract)
    *   `src/css/1-base/_mobile.css` (Add styles for mobile overlay and expanded panel)
    *   `src/css/2-components/_side-panels.css` (Style new panel header and content)
*   **JavaScript:**
    *   **`appState.js` (CRITICAL):** Add the new `resetAppStateToDefaults()` function.
    *   **`main.js`:** Implement autoplay and add mobile event listeners that call unified managers.
    *   **`sidePanelManager.js`:** Refactor to remove old controls and unify info panel logic.
    *   **`startupSequenceManager.js`:** Modify `_resetVisualsAndState` to call the new comprehensive reset function.