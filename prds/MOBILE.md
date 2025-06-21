### **PRD: HUE 9000 Mobile Interface (v4.1 - Mockup Aligned)**

#### **1. Overview & Vision**

This document specifies the creation of a dedicated, non-scrolling, single-panel mobile interface for HUE 9000. The vision is to deliver a focused, high-fidelity experience that is aesthetically aligned with the brand and ergonomically designed for portrait touch interaction, abandoning all previous multi-panel or responsive concepts.

#### **2. Goals & Success Metrics**

| Goal                      | Success Metric                                                                                               |
| :------------------------ | :----------------------------------------------------------------------------------------------------------- |
| **Focused Interaction**   | The essential controls (Lens, Hue, Mood, Intensity) are presented and fully functional. Non-core desktop controls are correctly omitted. |
| **Superior Mobile UX**    | The interface feels deliberate and optimized for touch, not like a compromised desktop view.                 |
| **Preserve Core Aesthetic** | The mobile layout retains the high-fidelity, diegetic "hardware" feel of the HUE 9000 brand.                 |
| **Ergonomic Controls**    | All tap targets (e.g., Hue Assignment buttons) are large and easy to press without error.                      |

#### **3. Functional Requirements & Visual Specifications**

*   **FR-1: Layout Activation**
    *   MUST activate on viewports with a `max-width` of `800px` and `orientation: portrait`.
    *   MUST hide the desktop-specific three-panel layout.
    *   The compact sidebar for debug controls MUST remain visible and functional.

*   **FR-2: Panel Structure (The "One Panel" Layout)**
    *   The entire mobile UI MUST be contained within a single `panel-bezel`.
    *   This panel MUST be offset from the left edge of the screen to accommodate the compact sidebar.
    *   The panel's content MUST be structured into a top row and a bottom section.
        *   **Top Row:** Contains two side-by-side `panel-section`s.
            *   The left section contains the Logo (top-aligned) and Lens (bottom-aligned).
            *   The right section contains the Grill.
        *   **Bottom Section:** A single `panel-section` containing all controls.
            *   The `hue-assignment-block` is at the top.
            *   A `joined-block-pair` containing the Mood and Intensity dials is at the bottom.

*   **FR-3: Controls**
    *   **Hue Assignment:** The `ControlSheetManager` is **eliminated**. Hue assignment buttons are directly tappable.
    *   **Excluded Controls:** The Main Power (`ON`/`OFF`), BTN 1-4, and Auxiliary Light (`LOW`/`HIGH`) controls are **not** present in the mobile UI.

*   **FR-4: Mobile Startup Sequence**
    *   MUST be a new, faster sequence, separate from the desktop version.
    *   **Sequence Flow:**
        1.  Start in `theme-dim`.
        2.  **Phase 1:** Lens energizes. Mood & Intensity LCDs flicker on to a `dimly-lit` state.
        3.  **Phase 2:** Hue Assignment buttons flicker on to `dimly-lit` state.
        4.  **Phase 3:** Hue Assignment buttons flicker from `dimly-lit` to `is-energized`, with default selections applied.
        5.  **Phase 4:** On completion of the previous animation, the application transitions to `theme-dark`.

### **Development Plan & Specification**

#### **Step 1: Cleanup**

1.  **Delete Obsolete Files:**
    *   `src/js/ControlSheetManager.js`
    *   `src/css/2-components/_control-sheet.css`
2.  **Update CSS Imports:**
    *   In `src/css/main.css`, remove the line `@import url('./2-components/_control-sheet.css');`.

#### **Step 2: HTML (`index.html`)**

1.  **Wrap Desktop Layout:** Wrap the three desktop panels (`left-panel`, `center-panel`, `right-panel`) in a single div: `<div class="main-content-area desktop-only">`.
2.  **Tag Desktop Drawer:** Add the class `desktop-only` to the `#control-deck`.
3.  **Create Mobile UI Container:** Add the new structure for the mobile UI. **All interactive elements must have new, unique IDs.**

    ```html
    <!-- index.html -->
    <!-- After the desktop-only .main-content-area -->
    <div id="mobile-ui-container" class="panel-bezel mobile-only">
        <div class="mobile-top-row">
            <div class="panel-section mobile-eye-section">
                <div id="mobile-logo-container"></div>
                <div id="mobile-lens-container">
                    <div id="mobile-color-lens"><div id="mobile-color-lens-gradient"></div></div>
                    <div id="mobile-outer-glow"></div>
                </div>
            </div>
            <div class="panel-section mobile-grill-section">
                <div class="placeholder grill-placeholder"></div>
            </div>
        </div>
        <div class="panel-section mobile-controls-section">
            <div class="control-block hue-assignment-block">
                <!-- JS will populate these columns -->
                <div class="hue-assignment-column color-chips-column"></div>
                <div class="hue-assignment-column" data-assignment-target="env"><div class="control-group-label label-top">ENV</div></div>
                <div class="hue-assignment-column" data-assignment-target="lcd"><div class="control-group-label label-top">LCD</div></div>
                <div class="hue-assignment-column" data-assignment-target="logo"><div class="control-group-label label-top">LOGO</div></div>
                <div class="hue-assignment-column" data-assignment-target="btn"><div class="control-group-label label-top">BTN</div></div>
                <div class="hue-assignment-column color-chips-column"></div>
                <div class="block-label-bottom block-label-bottom--descriptor">HUE ASSN</div>
            </div>
            <div class="mobile-dial-row">
                <div class="control-block hue-control-block joined-block-pair__item--left">
                    <div id="mobile-dial-canvas-container-A" class="dial-canvas-container" data-dial-id="A"></div>
                    <div class="hue-lcd-display lcd-container" id="mobile-hue-lcd-A"></div>
                    <div class="block-label-bottom">MOOD</div>
                </div>
                <div class="control-block hue-control-block joined-block-pair__item--right">
                    <div id="mobile-dial-canvas-container-B" class="dial-canvas-container" data-dial-id="B"></div>
                    <div class="hue-lcd-display lcd-container" id="mobile-hue-lcd-B"></div>
                    <div class="block-label-bottom">INTENSITY</div>
                </div>
            </div>
        </div>
    </div>
    ```

#### **Step 3: CSS**

1.  **`src/css/1-base/_layout.css`:** Hide mobile UI by default.
    ```css
    .desktop-only { /* Be more specific than just mobile-only */ display: flex; }
    .mobile-only { display: none; }
    ```
2.  **Create `src/css/1-base/_mobile.css`:**
    ```css
    /* NEW FILE: src/css/1-base/_mobile.css */
    @media (max-width: 800px) and (orientation: portrait) {
        .desktop-only { display: none !important; }
        .mobile-only { display: flex !important; }

        .app-wrapper { padding: var(--space-md); }
        #mobile-ui-container {
            width: 100%;
            max-width: 500px;
            height: 100%;
            flex-direction: column;
            gap: var(--space-md);
            padding: var(--space-md);
            margin-left: 48px; /* Offset for the visible compact sidebar */
        }
        .mobile-top-row { display: flex; gap: var(--space-md); flex: 0 1 40%; }
        .mobile-controls-section { flex: 1 1 60%; display: flex; flex-direction: column; gap: var(--space-lg); }
        .mobile-eye-section { flex: 1; display: flex; flex-direction: column; justify-content: space-between; }
        .mobile-grill-section { flex: 1; }
        .mobile-eye-section #mobile-lens-container { width: 80%; margin: 0 auto; }
        .mobile-dial-row { display: flex; gap: 0; }
    }
    ```
3.  **`src/css/main.css`:** Import the new mobile styles file at the end.
    ```css
    /* ADD to end of main.css */
    @import url('./1-base/_mobile.css');
    ```
4.  **`src/css/2-components/_side-panels.css`:** Ensure the compact sidebar is not hidden by any existing media queries. The `desktop-only` class on `#control-deck` is sufficient to hide the drawer.

#### **Step 4: JavaScript**

1.  **`main.js`:**
    *   **`collectDomElements()`:** Add queries for all new `mobile-*` element IDs.
    *   **`initializeApp()`:** Detect `isMobile`, define a `rootContainer` (`#mobile-ui-container` or `document`), and pass it to manager `init()` calls.
    *   **`createGridButtons()`:** Modify to accept the `rootContainer`.
2.  **Manager Scoping:**
    *   **`dialManager.js`:** Modify `init()` and `injectDialSVGs()` to accept an optional `containerElement` to scope their DOM queries.
    *   **`DynamicStyleManager.js`:** Modify `injectLogoSVG()` to accept a container to target either `#logo-container` or `#mobile-logo-container`.
    *   All other managers (`buttonManager`, `lensManager`, etc.) that query the DOM should be similarly updated to accept a `containerElement`.
3.  **Startup Logic:**
    *   **File Naming:** Rename existing `startupPhase*.js` files to `startupPhaseDesktop*.js`. Create new, simplified `startupPhaseMobile*.js` files targeting the new mobile element IDs.
    *   **`startupSequenceManager.js`:** Modify `init(isMobile)` to choose the correct array of phase configs (desktop or mobile) and pass it to the XState machine's context.
    *   **`startupMachine.js`:** Modify the machine to be agnostic by reading the `phaseConfigs` array from its own `context`, making it fully reusable.