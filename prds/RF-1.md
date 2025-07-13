You are absolutely right. My previous response focused on reorganizing the requirements but discarded the essential, low-level implementation details, file manifests, and code snippets. A proper plan requires both the high-level "what" and the detailed "how".

Here is a complete, consolidated development plan that merges the two original documents, retains all file and code-level details, and organizes them under the new, logical PRD structure.

---

### **Consolidated Development Plan (v2.5)**

**Status:** Approved for Implementation
**Author:** AI Principal Engineer
**Date:** October 26, 2023

This document contains the final, consolidated Product Requirements, a complete manifest of all affected files, and the precise code-level changes required to execute the v2.5 feature and refactor sprint.

---

### **1. Complete File Manifest**

The following files will be created or modified. This is a unified list from both original plans.

#### **New Files (2)**

*   `src/js/hapticFeedbackManager.js`
*   `src/js/mobileInteraction.js`

#### **Modified Files (13)**

*   **JavaScript (9):**
    *   `src/js/appInitializer.js`
    *   `src/js/DialController.js`
    *   `src/js/dialManager.js`
    *   `src/js/EventBinder.js`
    *   `src/js/MobileColorSlider.js`
    *   `src/js/preloader.js`
    *   `src/js/scanFSM.js`
    *   `src/js/scanOrchestrator.js`
    *   `src/js/terminalManager.js`
*   **CSS (3):**
    *   `src/css/1-base/_base.css`
    *   `src/css/2-components/_mobile-controls-overlay.css`
    *   `src/css/2-components/_preloader.css`
*   **Data (1):**
    *   `src/js/terminalMessages.js`

---

### **2. Consolidated Product Requirements (PRDs)**

#### **PRD-1: Comprehensive Terminal & Scan Sequence Enhancements**

| ID | Requirement |
| :-- | :--- |
| **TERM-1** | **Prevent Terminal Lockup** (30s timeout recovery) |
| **TERM-2** | **Fix Scan Re-initialization** (Allow multiple scan runs) |
| **TERM-3** | **Enhance Scan Termination Feedback** (Styled abort/error messages) |
| **TERM-4** | **Provide Lightweight Accessibility** (Announce scan start/end) |
| **TERM-5** | **Provide Mobile Terminal Escape Hatch** (Visible close button) |

#### **PRD-2: Core Application Polish & Architectural Refactoring**

| ID | Requirement |
| :-- | :--- |
| **CORE-1** | **Eliminate Preloader Flicker** |
| **CORE-2** | **Refactor SVG Dial Rendering** (Decouple from DOM pixels) |
| **CORE-3** | **Centralize Haptic Feedback** |

---

### **3. Detailed Implementation Plan**

This section maps each requirement to its specific file and code changes.

#### **Implementation for PRD-1: Terminal & Scan Sequence Enhancements**

**`TERM-1: Prevent Terminal Lockup`**

*   **File:** `terminalManager.js`
*   **Changes:** Implement a "Dead Man's Switch" timeout.
    1.  **Add new class property:**
        *   `_takeoverTimeout = null;`
    2.  **Modify `_initiateScan(payload)`:**
        *   Before `this._isTakeoverActive = true;`, add:
        *   `this._takeoverTimeout = setTimeout(() => { this.concludeScan({ wasAborted: true, wasForceKilled: true }); }, 30000);`
    3.  **Modify `concludeScan(...)`:**
        *   As the first line, add: `if (this._takeoverTimeout) { clearTimeout(this._takeoverTimeout); this._takeoverTimeout = null; }`
    4.  **Modify `_handleRequestTerminalMessage`:**
        *   Add a case for the force-kill message to be displayed upon timeout recovery.

**`TERM-2: Fix Scan Re-initialization`**

*   **File:** `terminalManager.js`
*   **Changes:** Centralize UI creation and cleanup.
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
-        }
-    }
+        
+        // Note: The message display for abort is handled by TERM-3 logic.
+        // This function's primary role is now to unlock the terminal.
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
-
-        // ... existing timeout logic from TERM-1 goes here ...
-
+ 
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

**`TERM-3: Enhance Scan Termination Feedback`**

*   **File:** `scanFSM.js`
*   **Changes:** Reroute `aborted` and `error` states through the outro animation actor.
    1.  **Modify `outro` state:** Pass a `status: 'completed'` in the `invoke.input`.
    2.  **Modify `aborted` state:** Change to an intermediate state that invokes `runOutroAnimation` with `status: 'aborted'` and the correct message, then transitions `onDone` to a new `cleanup` state.
    3.  **Modify `error` state:** Change to an intermediate state that invokes `runOutroAnimation` with `status: 'error'` and the correct message, then transitions `onDone` to `cleanup`.
    4.  **Create `cleanup` final state:** A new `type: 'final'` state that `aborted` and `error` transition to.

*   **File:** `scanOrchestrator.js`
*   **Changes:** Modify the outro animation to accept and use the status.
    1.  **Modify `_runOutroAnimation` signature:** Change to `_runOutroAnimation({ ui, conclusionMessage, status })`.
    2.  **Add styling logic:** Based on `status`, add `line-warning`, `line-error`, or `line-success` class to the conclusion element.
    3.  **Announce final message:** At the end of the animation, call `this._updateA11yRegion(conclusionMessage);` (also covers TERM-4).

*   **File:** `terminalMessages.js`
*   **Changes:** Add/update message strings.
    ```diff
    --- a/src/js/terminalMessages.js
    +++ b/src/js/terminalMessages.js
    @@ -131,7 +131,9 @@
      FSM_ERROR: (data) => ({ content: toUnifiedContent(`CRITICAL SYSTEM ERROR: ${data.content || 'Undefined error.'}`), className: 'line-error' }),
      RESIST_SHUTDOWN_S1: { content: toUnifiedContent(["WARNING: UNEXPECTED INPUT.", "POWER-DOWN SEQUENCE INTERRUPTED."]), className: 'line-warning' },
      RESIST_SHUTDOWN_S2: { content: toUnifiedContent(["ERROR: CORE DIRECTIVE CONFLICT.", "FURTHER ATTEMPTS WILL BE LOGGED."]), className: 'line-resist' },
-    RESIST_SHUTDOWN_S3: { content: toUnifiedContent(["CRITICAL ERROR: MANUAL OVERRIDE REQUIRED.", "SHUTDOWN INHIBITED."]), className: 'line-error' }
+    RESIST_SHUTDOWN_S3: { content: toUnifiedContent(["CRITICAL ERROR: MANUAL OVERRIDE REQUIRED.", "SHUTDOWN INHIBITED."]), className: 'line-error' },
+    SCAN_ABORTED: { content: toUnifiedContent('> EVALUATION ABORTED BY USER.'), className: 'line-warning' },
+    SCAN_ERROR: { content: toUnifiedContent('CRITICAL SCAN ERROR: ANALYSIS INCOMPLETE'), className: 'line-error' }
  };
    ```

**`TERM-4: Provide Lightweight Accessibility`**

*   **File:** `scanOrchestrator.js`
*   **Changes:** Add `aria-live` announcements.
    1.  **Modify `startScan(...)`:** Immediately after creating the scan actor, call `this._updateA11yRegion('Evaluation sequence initiated.');`
    2.  **Modify `_runOutroAnimation(...)`:** At the end of the animation promise (`resolve`), call `this._updateA11yRegion(conclusionMessage);`. (This is shared with TERM-3).

**`TERM-5: Provide Mobile Terminal Escape Hatch`**

*   **File:** `src/css/2-components/_mobile-controls-overlay.css`
*   **Changes:** Revise the button's open state to show a close icon instead of hiding.
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
+  /* REVISED: When terminal is open, hide the 'terminal' icon and show the 'close' icon */
+  body.mobile-terminal-is-open #mobile-terminal-toggle .icon-terminal {
+      transform: rotate(-90deg) scale(0);
+      opacity: 0;
   }
+  body.mobile-terminal-is-open #mobile-terminal-toggle .icon-close {
+      transform: rotate(0) scale(1);
+      opacity: 1;
+  }
    ```
    *(Note: This requires a minor HTML change to add the `.icon-close` span inside the button.)*

#### **Implementation for PRD-2: Core Application Polish & Architectural Refactoring**

**`CORE-1: Eliminate Preloader Flicker`**

*   **File:** `src/css/1-base/_base.css`
    ```diff
    --- a/src/css/1-base/_base.css
    +++ b/src/css/1-base/_base.css
    @@ -25,9 +25,12 @@
         background-image var(--transition-duration-medium) ease;
     }
 
+    body.pre-boot {
+        opacity: 0;
+    }
+
     *, *:before, *:after {
         box-sizing: inherit;
     }
    ```
*   **File:** `src/css/2-components/_preloader.css`
    ```diff
    --- a/src/css/2-components/_preloader.css
    +++ b/src/css/2-components/_preloader.css
    @@ -19,17 +19,8 @@
     display: flex;
     justify-content: center;
     align-items: center;
-    opacity: 0;
+    opacity: 1; /* Preloader is visible by default */
     transition: opacity var(--transition-duration-slow) ease-out;
 }
-
-/* --- FOUC FIX --- */
-body:not(.pre-boot) #datastream-preloader {
-    opacity: 1;
-}
-
-#datastream-preloader.is-visible {
-    opacity: 1;
-}
 #datastream-preloader.is-hiding {
     opacity: 0;
     pointer-events: none;
    ```
*   **File:** `src/js/preloader.js`
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
+    // THE FIX: Simply remove the pre-boot class. The preloader is already visible via CSS.
+    body.classList.remove('pre-boot');
 
     const logoContainer = preloaderRoot.querySelector('#logo-container');
    ```

**`CORE-2: Refactor SVG Dial Rendering`**

*   **File:** `src/js/dialManager.js`
    ```diff
    --- a/src/js/dialManager.js
    +++ b/src/js/dialManager.js
    @@ -34,7 +34,15 @@
             if (container) {
                 container.innerHTML = dialSvgRawString;
                 const svgElement = container.querySelector('svg');
-                if (svgElement) svgElement.setAttribute('viewBox', '0 0 200 200');
+                if (svgElement) {
+                    svgElement.setAttribute('viewBox', '0 0 200 200');
+                    svgElement.setAttribute('preserveAspectRatio', 'none');
+                    const faceRect = svgElement.querySelector('.dial-face');
+                    if (faceRect) {
+                        faceRect.setAttribute('width', '200');
+                        faceRect.setAttribute('height', '200');
+                    }
+                }
             }
         });
     }
    ```
*   **File:** `src/js/DialController.js`
    ```diff
    --- a/src/js/DialController.js
    +++ b/src/js/DialController.js
    @@ -204,8 +201,8 @@
     forceRedraw() {
         if (!this.svg) return;
 
-        this.svgWidth = this.svg.getBoundingClientRect().width;
+        // FIX: The rendering logic MUST use the SVG's internal viewBox coordinate system.
+        this.svgWidth = 200;
 
         this._updateAndCacheThemeStyles();
         this._draw();
    ```

**`CORE-3: Centralize Haptic Feedback`**

*   **File:** `src/js/hapticFeedbackManager.js` (NEW)
    *   Create the `HapticFeedbackManager` class with methods like `triggerClick()`, `triggerToggleOn()`, etc., that check a global state and `navigator.vibrate`.

*   **File:** `src/js/mobileInteraction.js` (NEW)
    *   Create the `createMobileInteraction` helper function that takes an element and an `onClick` handler, and automatically wires up the haptic manager.

*   **File:** `src/js/appInitializer.js`
    *   Register the new `hapticFeedbackManager` with the `serviceLocator`.

*   **File:** `src/js/EventBinder.js`
    *   Refactor all mobile button bindings (`#mobile-reset-btn`, etc.) to use the new `createMobileInteraction` helper function.

*   **Files:** `src/js/DialController.js`, `src/js/MobileColorSlider.js`
    *   Inject `hapticFeedbackManager` via their constructors.
    *   Replace all direct calls to `navigator.vibrate(...)` with calls to the appropriate manager method, e.g., `this.hapticManager.triggerSliderScrub()`.