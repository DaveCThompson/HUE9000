Of course. Based on the red-team review and the clarified constraints, here is the fully updated, single-file implementation plan.

---

### **HUE 9000 Refactor & Polish (v2.4) - Implementation Plan**

**Status:** Approved for Implementation
**Author:** AI Principal Engineer
**Date:** October 26, 2023

This document contains the final Product Requirements, a complete manifest of all affected files, and the precise code-level changes required to execute the v2.4 refactor.

---

### **1. Product Requirements Document (PRD)**

**1.1. Overview**

This document outlines the requirements for a targeted technical refactoring and user experience polish sprint for the HUE 9000 application. The primary focus is on enhancing architectural robustness, eliminating minor visual artifacts during the loading sequence, and improving the maintainability of core interactive components.

**1.2. Goals & Objectives**

*   **Improve Loading Experience:** Eliminate all visual "flickering" or flashes during the preloader-to-application handoff.
*   **Enhance Feature Robustness:** Ensure that core interactive sequences, specifically the terminal "Scan" feature, are repeatable and function correctly on subsequent uses.
*   **Increase Architectural Purity:** Refine key rendering components (SVG Dials) to be more performant and less dependent on fragile DOM measurements.
*   **Standardize User Feedback:** Centralize and abstract haptic feedback mechanisms to create a consistent and configurable user experience on mobile.

**1.3. Scope & Requirements**

| ID | Requirement | User Story / Rationale |
| :-- | :--- | :--- |
| **RQ-1** | **Eliminate Preloader Flicker** | As a user, I want the application loading sequence to be perfectly smooth, without any flashes or disappearance of the preloader UI after it first appears. |
| **RQ-2** | **Fix Terminal Scan Re-initialization** | As a user, I want to be able to run the "Scan" or "Eval" sequences multiple times in a session without the terminal display breaking or becoming invisible on the second attempt. |
| **RQ-3** | **Provide Mobile Terminal Escape Hatch** | As a mobile user, if I open the terminal drawer, I must have a clear and intuitive way to close it without being trapped in the view. |
| **RQ-4** | **Refactor SVG Dial Rendering** | As a developer, I want the SVG dial rendering logic to be decoupled from the component's pixel dimensions to improve performance and prevent rendering distortions. |
| **RQ-5** | **Centralize Haptic Feedback** | As a developer, I want all haptic feedback logic to be centralized in a single manager to ensure consistency, respect user settings globally, and simplify the addition of new interactive elements. |

---

### **2. File Manifest**

The following files will be created or modified to complete this refactor.

#### **New Files (2)**
*   `src/js/hapticFeedbackManager.js`
*   `src/js/mobileInteraction.js`

#### **Modified Files (12)**
*   **JavaScript (8):**
    *   `src/js/preloader.js`
    *   `src/js/terminalManager.js`
    *   `src/js/terminalMessages.js`
    *   `src/js/scanOrchestrator.js`
    *   `src/js/dialManager.js`
    *   `src/js/DialController.js`
    *   `src/js/MobileColorSlider.js`
    *   `src/js/EventBinder.js`
    *   `src/js/appInitializer.js`
*   **CSS (3):**
    *   `src/css/1-base/_base.css`
    *   `src/css/2-components/_preloader.css`
    *   `src/css/2-components/_mobile-controls-overlay.css`

---

### **3. Detailed Implementation Snippets**

The following sections provide the precise code changes for each requirement.

#### **Spec-1: Eliminate Preloader Flicker (RQ-1)**

*   **Strategy:** Simplify the loading CSS logic. The body will be hidden by default (`pre-boot`), and the preloader will be visible by default. JS will only be responsible for removing the `pre-boot` class, ensuring a seamless reveal.

*   **File: `src/css/1-base/_base.css`**
    ```diff
    --- a/src/css/1-base/_base.css
    +++ b/src/css/1-base/_base.css
    @@ -25,9 +25,12 @@
         background-image var(--transition-duration-medium) ease;
     }
 
+    body.pre-boot {
+        opacity: 0;
+        display: flex;
+        justify-content: center;
+        align-items: center;
+    }
+
     *, *:before, *:after {
         box-sizing: inherit;
     }
    ```

*   **File: `src/css/2-components/_preloader.css`**
    ```diff
    --- a/src/css/2-components/_preloader.css
    +++ b/src/css/2-components/_preloader.css
    @@ -19,17 +19,12 @@
     background-color: #000;
     display: flex;
     justify-content: center;
     align-items: center;
     font-family: 'IBM Plex Mono', monospace;
-    opacity: 0;
+    opacity: 1; /* Preloader is visible by default */
     box-sizing: border-box;
     transition: opacity var(--transition-duration-slow) ease-out;
 }
 
-/* --- FOUC FIX --- */
-body:not(.pre-boot) #datastream-preloader {
-    opacity: 1;
-}
-
 /* Inner wrapper for the actual content layout */
 .preloader-content-wrapper {
     display: flex;
@@ -40,9 +35,6 @@
     box-sizing: border-box;
 }
 
-#datastream-preloader.is-visible {
-    opacity: 1;
-}
 #datastream-preloader.is-hiding {
     opacity: 0;
     pointer-events: none;
    ```

*   **File: `src/js/preloader.js`**
    ```diff
    --- a/src/js/preloader.js
    +++ b/src/js/preloader.js
    @@ -73,12 +73,8 @@
     }
     
     body.classList.add('preloader-active');
-    gsap.to(preloaderRoot, { 
-        autoAlpha: 1, 
-        duration: PRELOADER_CONFIG.preloaderInitialFadeInDurationMs / 1000,
-        onStart: () => {
-             body.classList.remove('pre-boot');
-        }
-    });
+    
+    // THE FIX: Remove the pre-boot class. The preloader is already visible via CSS.
+    body.classList.remove('pre-boot');
 
     const logoContainer = preloaderRoot.querySelector('#logo-container');
     loadAndAnimatePreloaderLogo(logoContainer, gsap);
    ```

#### **Spec-2: Fix Terminal Scan Re-initialization (RQ-2)**

*   **Strategy:** Centralize scan UI creation in `_initiateScan` and make `concludeScan` aware of the abortion state via an event payload.

*   **File: `src/js/scanOrchestrator.js`**
    ```diff
    --- a/src/js/scanOrchestrator.js
    +++ b/src/js/scanOrchestrator.js
    @@ -44,11 +44,11 @@
                 const isDone = snapshot.done || snapshot.matches('completed') || snapshot.matches('aborted') || snapshot.matches('error');
 
                 if (isDone) {
-                    // console.log('%c[Orchestrator] ✅ Final state detected. Entering cleanup.', 'color: green; font-weight: bold;');
                     const wasAborted = snapshot.matches('aborted');
                     
                     this._cleanup();
                     
-                    // console.log(`%c[Orchestrator] Emitting 'scanComplete' event with payload: { wasAborted: ${wasAborted} }`, 'color: orange; font-weight: bold;');
-                    appState.emit('scanComplete', { wasAborted });
+                    appState.emit('scanComplete', { wasAborted: wasAborted });
                 }
             });
    ```

*   **File: `src/js/terminalManager.js`**
    ```diff
    --- a/src/js/terminalManager.js
    +++ b/src/js/terminalManager.js
    @@ -34,18 +34,16 @@
         appState.subscribe('requestTerminalMessage', (payload) => this._handleRequestTerminalMessage(payload));
         // ADDED: Subscribe to the global scan completion event.
         appState.subscribe('scanComplete', ({ wasAborted }) => this.concludeScan(wasAborted));
     }
 
-    async concludeScan() {
-        this._cleanupScanContainer();
+    async concludeScan(wasAborted) {
         this._isTakeoverActive = false;
-        this._processQueue();
-    }
-
-    _cleanupScanContainer() {
-        if (this._scanContainerElement) {
-            this.gsap.to(this._scanContainerElement, {
-                autoAlpha: 0,
-                duration: 0.3,
-                onComplete: () => {
-                    if (this._terminalContentElement && this._scanContainerElement && this._terminalContentElement.contains(this._scanContainerElement)) {
-                        this._terminalContentElement.removeChild(this._scanContainerElement);
-                    }
-                    this._scanContainerElement = null;
-                }
-            });
+
+        if (wasAborted) {
+            appState.emit('requestTerminalMessage', {
+                type: 'status',
+                source: 'scan',
+                messageKey: 'SCAN_ABORTED',
+                interrupt: true
+            });
         }
-    }
+        
+        this._processQueue();
+    }
 
     // --- Internal Methods ---
 
@@ -124,19 +122,18 @@
     async _initiateScan(payload) {
         if (this._isTakeoverActive) return;
 
         this._isTakeoverActive = true;
         this._interruptCurrentTask();
         this._setCursorState('thinking');
 
         const scanConfig = getMessage(payload);
         if (!scanConfig || !scanConfig.subJobs) {
             console.error("Invalid or missing scan configuration for payload:", payload);
-            await this.concludeScan(); // Still clean up on config error
+            await this.concludeScan(true); // Still clean up on config error
             return;
         }
         
-        if (this._terminalContentElement) {
-            this._terminalContentElement.innerHTML = '';
-        }
+        // FIX: Re-architected preparation logic for robustness.
+        if (this._terminalContentElement) this._terminalContentElement.innerHTML = '';
 
         this._scanContainerElement = document.createElement('div');
         this._scanContainerElement.className = 'scan-animation-container';
@@ -144,6 +141,7 @@
         // Ensure the container is visible. This fixes the bug where a second
         // scan would be invisible.
         this._gsap.set(this._scanContainerElement, { autoAlpha: 1 });
 
         if (this._terminalContentElement) {
             this._terminalContentElement.appendChild(this._scanContainerElement);
    ```

*   **File: `src/js/terminalMessages.js`**
    ```diff
    --- a/src/js/terminalMessages.js
    +++ b/src/js/terminalMessages.js
    @@ -131,7 +131,8 @@
     FSM_ERROR: (data) => ({ content: toUnifiedContent(`CRITICAL SYSTEM ERROR: ${data.content || 'Undefined error.'}`), className: 'line-error' }),
     RESIST_SHUTDOWN_S1: { content: toUnifiedContent(["WARNING: UNEXPECTED INPUT.", "POWER-DOWN SEQUENCE INTERRUPTED."]), className: 'line-warning' },
     RESIST_SHUTDOWN_S2: { content: toUnifiedContent(["ERROR: CORE DIRECTIVE CONFLICT.", "FURTHER ATTEMPTS WILL BE LOGGED."]), className: 'line-resist' },
-    RESIST_SHUTDOWN_S3: { content: toUnifiedContent(["CRITICAL ERROR: MANUAL OVERRIDE REQUIRED.", "SHUTDOWN INHIBITED."]), className: 'line-error' }
+    RESIST_SHUTDOWN_S3: { content: toUnifiedContent(["CRITICAL ERROR: MANUAL OVERRIDE REQUIRED.", "SHUTDOWN INHIBITED."]), className: 'line-error' },
+    SCAN_ABORTED: { content: toUnifiedContent("> EVALUATION ABORTED BY USER."), className: 'line-warning' }
 };
 
 const interactionMessageTemplates = {
    ```

#### **Spec-3: Mobile Terminal Escape Hatch (RQ-3)**

*   **Strategy:** Repurpose the existing terminal toggle button. When the terminal is open, the button will remain visible but its icon will change from `terminal` to `close`.

*   **File: `src/css/2-components/_mobile-controls-overlay.css`**
    ```diff
    --- a/src/css/2-components/_mobile-controls-overlay.css
    +++ b/src/css/2-components/_mobile-controls-overlay.css
    @@ -62,11 +62,12 @@
     font-size: 1.5rem; /* 24px */
     transition: transform 0.3s ease-in-out;
   }
-
-  /* MODIFIED: The terminal toggle button now fades out instead of rotating */
-  body.mobile-terminal-is-open #mobile-terminal-toggle {
-      opacity: 0;
-      transform: translateY(-2rem);
-      pointer-events: none;
-      transition: opacity 0.3s ease-out, transform 0.3s ease-out;
+  
+  /* REVISED: The terminal toggle button now fades out instead of rotating to hide */
+  body.mobile-terminal-is-open #mobile-terminal-toggle .material-symbols-outlined.icon-terminal {
+      transform: rotate(-90deg) scale(0);
+      opacity: 0;
   }
+  body.mobile-terminal-is-open #mobile-terminal-toggle .material-symbols-outlined.icon-close {
+      transform: rotate(0) scale(1);
+      opacity: 1;
+  }
+
 
   /* NEW: Sync the mobile controls overlay with the main content's movement */
   body.mobile-terminal-is-open #mobile-controls-overlay {
    ```
    *(Note: This assumes the HTML for `#mobile-terminal-toggle` will be updated to contain two `<span>`s for the icons, which is a trivial change to `index.html`)*

*   **File: `src/js/EventBinder.js`**
    ```diff
    --- a/src/js/EventBinder.js
    +++ b/src/js/EventBinder.js
    @@ -72,6 +72,7 @@
         createMobileInteraction(document.getElementById('mobile-light-btn'), {
             onClick: () => appState.emit('mobileLightToggleRequested')
         });
+        // NO CHANGE NEEDED HERE. The existing listener correctly toggles the state.
         createMobileInteraction(document.getElementById('mobile-terminal-toggle'), {
             onClick: () => mobileTerminalManager.toggle()
         });
    ```

#### **Spec-4: Refactor SVG Dial Rendering (RQ-4)**

*   **Strategy:** Decouple rendering logic from DOM measurements by hardcoding the `viewBox` width and forcing the SVG to scale to its container.

*   **File: `src/js/dialManager.js`**
    ```diff
    --- a/src/js/dialManager.js
    +++ b/src/js/dialManager.js
    @@ -34,12 +34,18 @@
             if (container) {
                 container.innerHTML = dialSvgRawString;
                 const svgElement = container.querySelector('svg');
-                if (svgElement) svgElement.setAttribute('viewBox', '0 0 200 200');
+                if (svgElement) {
+                    // FIX: Programmatically set viewBox and get the face rect
+                    svgElement.setAttribute('viewBox', '0 0 200 200');
+                    svgElement.setAttribute('preserveAspectRatio', 'none');
+                    const faceRect = svgElement.querySelector('.dial-face');
+                    if (faceRect) {
+                        // FIX: Force the background rect to fill the new square viewBox
+                        faceRect.setAttribute('width', '200');
+                        faceRect.setAttribute('height', '200');
+                    }
+                }
             }
         });
         // if (this.debug) console.log('[DialManager] SVG dials injected successfully via ?raw import.');
     } else {
    ```

*   **File: `src/js/DialController.js`**
    ```diff
    --- a/src/js/DialController.js
    +++ b/src/js/DialController.js
    @@ -19,10 +19,7 @@
         this.ridgesGroup = this.svg ? this.svg.querySelector('.dial-ridges-group') : null;
         if (!this.svg || !this.ridgesGroup) {
             console.error(`[DialController ${this.dialId}] Critical SVG elements not found.`);
-            return;
-        }
-
-        this.svgWidth = this.svg.getBoundingClientRect().width;
+        }
 
         // FIX: Force the SVG's viewBox to stretch and fill the container,
         // ignoring its original aspect ratio. This is key for non-square rendering.
@@ -204,8 +201,8 @@
     forceRedraw() {
         // if (this.debug) console.log(`[DialController ${this.dialId}] forceRedraw() called.`);
         if (!this.svg) return; // Guard if SVG not found
-
-        this.svgWidth = this.svg.getBoundingClientRect().width;
+        // FIX: The rendering logic MUST use the SVG's internal viewBox coordinate system.
+        this.svgWidth = 200;
 
         this._updateAndCacheThemeStyles();
         this._draw();
    ```

#### **Spec-5: Centralize Haptic Feedback (RQ-5)**

*   **Strategy:** Create a new `hapticFeedbackManager` and a `createMobileInteraction` utility. Refactor all mobile components to use these new centralized systems instead of calling `navigator.vibrate` directly.

*   **File: `src/js/hapticFeedbackManager.js` (NEW FILE)**
    ```javascript
    import * as appState from './appState.js';

    class HapticFeedbackManager {
        constructor() {
            this.isSupported = 'vibrate' in navigator;
        }

        _canTrigger() {
            return this.isSupported && appState.getIsHapticsEnabled();
        }

        triggerClick() {
            if (this._canTrigger()) navigator.vibrate(10);
        }

        triggerToggleOn() {
            if (this._canTrigger()) navigator.vibrate(20);
        }
        
        triggerToggleOff() {
            if (this._canTrigger()) navigator.vibrate(15);
        }

        triggerSliderScrub() {
            if (this._canTrigger()) navigator.vibrate(5);
        }
    }

    export const hapticFeedbackManager = new HapticFeedbackManager();
    ```

*   **File: `src/js/mobileInteraction.js` (NEW FILE)**
    ```javascript
    import { serviceLocator } from './serviceLocator.js';

    export function createMobileInteraction(element, { onClick, hapticType = 'click' }) {
        if (!element) return;

        const hapticManager = serviceLocator.get('hapticFeedbackManager');

        const handleInteraction = (event) => {
            if (event.isPrimary === false) return;
            switch (hapticType) {
                case 'toggleOn': hapticManager.triggerToggleOn(); break;
                case 'toggleOff': hapticManager.triggerToggleOff(); break;
                default: hapticManager.triggerClick(); break;
            }
            if (typeof onClick === 'function') onClick(event);
        };
        element.addEventListener('pointerup', handleInteraction);
    }
    ```

*   **File: `src/js/appInitializer.js`**
    ```diff
    --- a/src/js/appInitializer.js
    +++ b/src/js/appInitializer.js
    @@ -34,6 +34,7 @@
      _registerCoreServices() {
         serviceLocator.register('gsap', gsap);
         serviceLocator.register('config', { ...config, desktopPhaseConfigs });
+        serviceLocator.register('hapticFeedbackManager', hapticFeedbackManager);
     }
 
     async _instantiateManagers(isMobile) {
    ```

*   **File: `src/js/EventBinder.js`**
    ```diff
    --- a/src/js/EventBinder.js
    +++ b/src/js/EventBinder.js
    @@ -5,6 +5,7 @@
  */
 import { serviceLocator } from './serviceLocator.js';
 import * as appState from './appState.js';
+import { createMobileInteraction } from './mobileInteraction.js';
 
 export class EventBinder {
     constructor() {
@@ -46,24 +47,19 @@
         const startupManager = serviceLocator.get('startupSequenceManager');
         const sidePanelManager = serviceLocator.get('sidePanelManager');
         const mobileTerminalManager = serviceLocator.get('mobileTerminalManager');
-
-        this._queryAndBind('#mobile-reset-btn', 'click', () => startupManager.resetSequence());
-        this._queryAndBind('#mobile-info-btn', 'click', () => sidePanelManager.toggle());
-        this._queryAndBind('#mobile-audio-btn', 'click', () => {
-            appState.setIsAudioMuted(!appState.getIsAudioMuted());
+        
+        createMobileInteraction(document.getElementById('mobile-reset-btn'), {
+            onClick: () => startupManager.resetSequence()
         });
-        this._queryAndBind('#mobile-light-btn', 'click', () => {
-            appState.emit('mobileLightToggleRequested');
+        createMobileInteraction(document.getElementById('mobile-info-btn'), {
+            onClick: () => sidePanelManager.toggle()
         });
-        this._queryAndBind('#mobile-terminal-toggle', 'click', () => {
-            mobileTerminalManager.toggle();
+        createMobileInteraction(document.getElementById('mobile-audio-btn'), {
+            onClick: () => appState.setIsAudioMuted(!appState.getIsAudioMuted())
         });
+        createMobileInteraction(document.getElementById('mobile-light-btn'), {
+            onClick: () => appState.emit('mobileLightToggleRequested')
+        });
+        createMobileInteraction(document.getElementById('mobile-terminal-toggle'), {
+            onClick: () => mobileTerminalManager.toggle()
+        });
     }
    ```

*   **File: `src/js/DialController.js` and `src/js/MobileColorSlider.js`**
    *   **Change:** Inject `hapticManager` in constructors. Replace all instances of `navigator.vibrate(...)` with the appropriate `this.hapticManager.trigger...()` method call. For example, `navigator.vibrate(10)` becomes `this.hapticManager.triggerClick()`.