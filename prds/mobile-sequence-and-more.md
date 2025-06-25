Of course. This is a superb set of requirements that moves beyond a simple feature addition and into a holistic architectural improvement. By combining the original plan with these new concepts, we can create a truly robust, performant, and stable mobile experience.

Here is the comprehensive, integrated development plan.

---

### **File Manifest**

This plan will involve modifying several core files and creating one new file.

*   **Files for Context:**
    *   `index.html`: The main application structure.
    *   `appState.js`: The central state management module.
    *   `serviceLocator.js`: The dependency injection container.
    *   `config/index.js` & `config/ui.js`: Application configuration.
    *   `PhaseRunner.js`: The engine that executes startup phase animations.

*   **Files to be Modified:**
    *   `main.js`: **(Major Changes)** Will become the primary decision point for mobile vs. desktop initialization.
    *   `startupSequenceManager.js`: Will be simplified to orchestrate the start of the correct sequence.
    *   `startupMachine.js`: Will be decoupled to accept the active sequence configuration via its context.
    *   `config/ui.js`: Will be updated to provide a single source of truth for the mobile breakpoint.

*   **Files to be Created:**
    *   `src/js/startupMobile.js`: A new, dedicated configuration file for the streamlined mobile startup sequence.

### **Executive Summary**

The primary goal is to implement a unique, streamlined startup sequence for mobile viewports. The initial plan was strong but revealed potential fragility in the mobile experience due to running unnecessary desktop-centric JavaScript. This fortified plan addresses those issues head-on by implementing **true conditional initialization**, preventing desktop-only managers from ever running on mobile. This will result in a more stable, performant, and polished mobile interface while simultaneously improving the overall application architecture.

### **Critical Evaluation of the System**

A deep analysis of the application reveals several areas that must be addressed to ensure a high-quality implementation.

1.  **Architectural Fragility & Performance:**
    *   **The Problem:** The most significant risk is running desktop-specific logic (like the terminal and side debug panels) on a mobile device where those UI elements are hidden. This consumes CPU and memory for no benefit and creates a large surface area for bugs, race conditions, and state conflicts, leading to a "fragile" experience.
    *   **The Solution:** We will prevent the JavaScript managers for desktop-only features (`terminalManager`, `sidePanelManager`) from being initialized on mobile viewports. For optimal performance, we will use dynamic `import()` to prevent the code for these managers from even being downloaded on mobile devices.

2.  **State Management Purity:**
    *   **The Problem:** The initial concept had the XState Finite State Machine (FSM) depending on an external manager to know which sequence to run. This inverts control, making the FSM impure and harder to test.
    *   **The Solution:** We will refactor the FSM to be self-contained. The `startupSequenceManager` will determine the correct sequence (desktop or mobile) and pass that configuration *into* the FSM's context upon initialization.

3.  **Visual Glitches & User Experience:**
    *   **The Problem:** A direct theme change from `dim` to `dark` can conflict with ongoing GSAP animations, causing a visual "pop" instead of a smooth transition. Additionally, LCDs could be left in a static, "un-alive" state after their startup animation.
    *   **The Solution:** We will implement a controlled theme transition using dedicated CSS classes. The mobile sequence will also be updated to ensure all components, like LCDs, end in their correct ambient animation state (e.g., `is-resonating`).

4.  **Maintainability & Code Health:**
    *   **The Problem:** Using the same string literal (e.g., `'(max-width: 768px)'`) in both CSS and JavaScript creates "magic strings" that are a common source of bugs if one is updated and the other is not.
    *   **The Solution:** We will define the mobile breakpoint in a single, canonical location within the application's configuration (`config/ui.js`) and reference it in both CSS (via comments) and JavaScript.

5.  **Edge Cases:**
    *   **The Problem:** A user resizing their browser from desktop to mobile (or vice-versa) during the startup sequence could see a mismatched UI.
    *   **The Solution:** We will implement a debounced `resize` event listener that gracefully handles this edge case by reloading the application, ensuring the correct UI and logic are always loaded for the current viewport.

---

### **Fortified Development Plan**

This plan is structured in phases, starting with the most critical architectural changes and progressing to performance and UX enhancements.

#### **Phase 1: Foundational & Architectural Fixes**

This phase establishes the core components and architectural patterns needed for the mobile sequence.

**Step 1.1: Create a Single Source of Truth for the Breakpoint**

*   **File:** `src/js/config/ui.js`
*   **Action:** Add and export a constant for the mobile breakpoint to eliminate magic strings.

```javascript
// src/js/config/ui.js

// ... other exports ...

/** @const {string} The CSS media query string for mobile viewports. */
export const MOBILE_BREAKPOINT = '(max-width: 768px)';
```

**Step 1.2: Create the Mobile Sequence Configuration**

*   **File:** `src/js/startupMobile.js` (New File)
*   **Action:** Create a new, self-contained configuration file for the mobile startup sequence. This sequence is shorter and includes the logic for a smooth, controlled theme transition.

```javascript
// src/js/startupMobile.js

/**
 * @module startupMobile
 * @description Declarative configuration for the unique, consolidated mobile startup sequence.
 */
import { selectorsForDimExitAnimation } from './config/index.js';
import { serviceLocator } from './serviceLocator.js';

export const mobileStartupPhase = {
  phase: 0,
  name: "MOBILE_SYSTEM_START",
  duration: 4.0, 
  animations: [
    { type: 'tween', target: 'dimmingFactors', vars: { value: 0.0, duration: 2.5, ease: 'power2.inOut' }, position: 0 },
    { type: 'lensEnergize', targetPower: 35, durationMs: 2000, position: 0.2 },
    { type: 'audio', soundKey: 'lensStartup', position: 0.2 },
    { type: 'lcdPowerOn', target: ['lcdA', 'lcdB'], state: 'dimly-lit', profile: 'lcdScreenFlickerToDimlyLit', stagger: 0.15, position: 0.5 },
    { type: 'audio', soundKey: 'lcdPowerOn', forceRestart: true, position: 0.5 },
    // REVISED: Initiate a controlled theme transition.
    {
      type: 'call',
      function: (dom, appState) => {
        document.querySelectorAll(selectorsForDimExitAnimation).forEach(el => el.classList.add('animate-on-dim-exit'));
        dom.body.classList.add('is-transitioning-from-dim');
        appState.setTheme('dark');
        serviceLocator.get('audioManager').play('themeEngage');
      },
      deps: ['domElements', 'appState'],
      position: 1.8 
    },
    // REVISED: Set the final, correct state for the LCDs, including resonance.
    {
        type: 'call',
        function: (lcdUpdater, dom) => {
            [dom.lcdA, dom.lcdB].forEach(lcd => {
                if (lcd) {
                    lcdUpdater.setLcdState(lcd, 'active');
                    lcd.classList.add('is-resonating'); // Ensure ambient animation is active
                }
            });
        },
        deps: ['lcdUpdater', 'domElements'],
        position: 1.8
    }
  ]
};
```

**Step 1.3: Decouple the FSM from the Manager**

*   **File:** `src/js/startupMachine.js`
*   **Action:** Modify the FSM to accept the list of phase configurations via its context. This makes the FSM a pure, self-contained state utility.

```javascript
// src/js/startupMachine.js

import { createMachine, assign, fromPromise } from 'xstate';
import { serviceLocator } from './serviceLocator.js';
import * as appState from './appState.js';
import { phaseConfigs as desktopPhaseConfigs } from './startupPhaseAll.js'; // Assuming you have a file that exports all desktop phases

const phaseRunnerService = fromPromise(async ({ input }) => {
  const phaseRunner = serviceLocator.get('phaseRunner');
  return phaseRunner.run(input.phaseConfig);
});

export const startupMachine = createMachine({
  id: 'hue9000Startup',
  initial: 'IDLE',
  predictableActionArguments: true,
  context: {
    currentPhase: -1,
    isStepThroughMode: true,
    errorInfo: null,
    // NEW: The FSM will now hold its own set of phases.
    activePhaseConfigs: [], 
    themeTransitionCleanupPerformed: false,
  },
  states: {
    IDLE: {
      on: {
        START_SEQUENCE: {
          target: 'RUNNING_PHASE',
          // REVISED: The event now provides the phase configs.
          actions: assign({
            isStepThroughMode: ({ event }) => event.isStepThroughMode,
            activePhaseConfigs: ({ event }) => event.phaseConfigs,
            currentPhase: 0,
            themeTransitionCleanupPerformed: false,
            errorInfo: null,
          })
        },
      }
    },
    RUNNING_PHASE: {
      invoke: {
        id: 'phaseRunnerService',
        src: phaseRunnerService,
        // REVISED: Get the config directly from the FSM's own context.
        input: ({ context }) => ({
          phaseConfig: context.activePhaseConfigs[context.currentPhase]
        }),
        onDone: { 
          actions: assign({ currentPhase: ({ context }) => context.currentPhase + 1 }),
          target: 'CHECK_SEQUENCE_STATUS'
        },
        onError: {
          target: 'ERROR',
          actions: assign({ errorInfo: ({ event }) => event.data })
        }
      },
      // ... on PAUSE_SEQUENCE etc. unchanged ...
    },
    CHECK_SEQUENCE_STATUS: {
        always: [
            {
                target: 'COMPLETE',
                guard: ({ context }) => context.currentPhase >= context.activePhaseConfigs.length
            },
            {
                target: 'RUNNING_PHASE',
                guard: ({ context }) => !context.isStepThroughMode
            },
            { target: 'PAUSED' }
        ]
    },
    PAUSED: { /* ... unchanged ... */ },
    COMPLETE: {
      type: 'final',
      entry: [
        // REVISED: Perform cleanup explicitly before setting to interactive.
        () => {
            const dom = serviceLocator.get('domElements');
            dom.body.classList.remove('is-transitioning-from-dim');
            document.querySelectorAll('.animate-on-dim-exit').forEach(el => el.classList.remove('animate-on-dim-exit'));
        },
        assign({ themeTransitionCleanupPerformed: true }),
        () => appState.setAppStatus('interactive')
      ]
    },
    ERROR: { /* ... unchanged ... */ }
  }
});
```

#### **Phase 2: True Conditional Initialization**

This phase implements the core logic for a stable and performant mobile experience.

**Step 2.1: Implement Conditional Initialization and Dynamic Imports in `main.js`**

*   **File:** `src/js/main.js`
*   **Action:** Convert the main initialization logic to an `async` function. Use `window.matchMedia` to check for the mobile breakpoint. Based on the result, conditionally and dynamically `import()` the desktop-only managers.

```javascript
// src/js/main.js

// ... other imports ...
import { MOBILE_BREAKPOINT } from './config/index.js'; // Import the breakpoint
// ... other manager imports that are ALWAYS needed ...
import { StartupSequenceManager } from './startupSequenceManager.js';

// ... collectDomElements() and other setup functions ...

// REVISED: The main initialization logic is now async
async function initializeApp() {
    if (window.HUE9000_INITIALIZED) return;
    window.HUE9000_INITIALIZED = true;

    console.log('[Main INIT] HUE 9000 Initializing...');
    
    // --- Determine Viewport ---
    const isMobile = window.matchMedia(MOBILE_BREAKPOINT).matches;
    console.log(`[Main INIT] Viewport detected as: ${isMobile ? 'Mobile' : 'Desktop'}`);

    // --- Always-on Managers ---
    const audioManager = serviceLocator.get('audioManager');
    const themeManager = new ThemeManager();
    const lcdUpdater = new LcdUpdater();
    const dynamicStyleManager = new DynamicStyleManager();
    const buttonManager = new ButtonManager();
    const dialManager = new DialManager();
    const lensManager = new LensManager();
    const ambientAnimationManager = new AmbientAnimationManager();
    const phaseRunner = new PhaseRunner();
    const startupSequenceManager = new StartupSequenceManager();
    const moodMatrixManager = new MoodMatrixManager();
    const intensityDisplayManager = new IntensityDisplayManager();
    
    // Register always-on services
    serviceLocator.register('themeManager', themeManager);
    // ... register all other always-on managers ...
    serviceLocator.register('startupSequenceManager', startupSequenceManager);

    // --- Conditional Desktop-Only Managers ---
    if (!isMobile) {
        console.log('[Main INIT] Initializing Desktop-only managers...');
        // Use dynamic import() for code splitting and performance
        const { default: terminalManagerInstance } = await import('./terminalManager.js');
        const { SidePanelManager } = await import('./sidePanelManager.js');

        const sidePanelManager = new SidePanelManager();
        
        serviceLocator.register('terminalManager', terminalManagerInstance);
        serviceLocator.register('sidePanelManager', sidePanelManager);

        // Initialize them after registering
        terminalManagerInstance.init();
        sidePanelManager.init();
    } else {
        // On mobile, hide the static HTML for the side panels
        const controlDeck = document.getElementById('control-deck');
        const compactView = document.querySelector('.compact-view-wrapper');
        if (controlDeck) controlDeck.style.display = 'none';
        if (compactView) compactView.style.display = 'none';
    }
    
    // --- Initialize remaining managers ---
    appState.setAppStatus('loading');
    audioManager.postInitSubscribe();
    startupSequenceManager.init();
    phaseRunner.init();
    // Initialize all other always-on managers
    [ themeManager, lcdUpdater, /* ...etc... */ ].forEach(manager => {
        if (typeof manager.init === 'function') manager.init();
    });

    createGridButtons(buttonManager);
    buttonManager.discoverButtons(domElements.allButtons);
    setupEventListeners(); // Ensure this doesn't depend on desktop-only managers

    new MusicController(audioManager, appState, config);

    startupSequenceManager.start(true); // Let manager decide on step-through mode
    console.log('[Main INIT] HUE 9000 Initialization Complete.');
}

// ... DOMContentLoaded listener remains the same, but it calls the new async initializeApp ...
document.addEventListener('DOMContentLoaded', () => {
    // ... setup preloader ...
    runPreloader(preloaderDomForRun, gsap).then(initializeApp).catch(err => {
        console.error("Initialization failed after preloader:", err);
    });
});
```

**Step 2.2: Simplify `startupSequenceManager.js`**

*   **File:** `src/js/startupSequenceManager.js`
*   **Action:** The manager no longer needs to know about mobile vs. desktop internally. Its `start` method becomes the orchestrator that detects the viewport and sends the correct sequence configuration to the FSM.

```javascript
// src/js/startupSequenceManager.js

import { interpret } from 'xstate';
import { startupMachine } from './startupMachine.js';
import { phaseConfigs as desktopPhaseConfigs } from './startupPhaseAll.js'; // Your desktop phases
import { mobileStartupPhase } from './startupMobile.js'; // The new mobile phase
import { serviceLocator } from './serviceLocator.js';
import * as appState from './appState.js';
import { MOBILE_BREAKPOINT } from './config/index.js'; // The breakpoint constant

export class StartupSequenceManager {
  // ... constructor and init are fine ...

  start(isStepThroughMode = true) {
    // REVISED: This is the new decision point.
    const isMobile = window.matchMedia(MOBILE_BREAKPOINT).matches;
    const activePhaseList = isMobile ? [mobileStartupPhase] : desktopPhaseConfigs;
    
    // On mobile, we never want step-through mode for the user, but allow dev override.
    const effectiveStepThroughMode = isMobile ? false : isStepThroughMode;
    
    this._resetVisualsAndState();

    this.fsmInterpreter = interpret(startupMachine).start();
    this.fsmInterpreter.subscribe(/* ... unchanged ... */);

    // REVISED: Send the chosen config list to the FSM.
    this.fsmInterpreter.send({ 
        type: 'START_SEQUENCE', 
        isStepThroughMode: effectiveStepThroughMode,
        phaseConfigs: activePhaseList 
    });
  }

  // ... other methods like playNextPhase, resetSequence are fine ...
  
  _notifyFsmTransition(snapshot) {
    // This method must also be aware of which config is active to display debug info correctly.
    const isMobile = window.matchMedia(MOBILE_BREAKPOINT).matches;
    const activeCfgs = isMobile ? [mobileStartupPhase] : desktopPhaseConfigs;
    
    const numericPhase = snapshot.context.currentPhase;
    // ... rest of the logic to build phaseInfo remains, but uses `activeCfgs` ...
    // ...
    
    appState.emit('startup:phaseChanged', phaseInfo);
    appState.setCurrentStartupPhaseNumber(phaseInfo.numericPhase);
  }

  // ... rest of the file ...
}
```

#### **Phase 3: Robustness and UX Polish**

**Step 3.1: Implement Viewport Resize Handler**

*   **File:** `src/js/main.js`
*   **Action:** Add a debounced event listener to handle viewport resizing by reloading the page, ensuring the correct JS and UI are always active.

```javascript
// src/js/main.js

// ... at the top with other imports
import { debounce } from './utils.js';
import { MOBILE_BREAKPOINT } from './config/index.js';

// ... inside the DOMContentLoaded event listener, after collecting elements ...
function setupResizeListener() {
    let wasMobile = window.matchMedia(MOBILE_BREAKPOINT).matches;
    
    const handleResize = debounce(() => {
        const isNowMobile = window.matchMedia(MOBILE_BREAKPOINT).matches;
        if (isNowMobile !== wasMobile) {
            console.log(`[Resize Handler] Viewport changed across breakpoint. Reloading...`);
            // Add a class to fade out before reload for a smoother experience
            document.body.classList.add('is-reloading');
            setTimeout(() => {
                location.reload();
            }, 300); // Wait for fade-out
        }
    }, 250); // 250ms debounce delay

    window.addEventListener('resize', handleResize);
}

document.addEventListener('DOMContentLoaded', () => {
    collectDomElements();
    setupResizeListener(); // Call the new setup function
    // ... rest of the DOMContentLoaded logic ...
});

// Add this simple CSS to your main.css or a utilities file
/*
body.is-reloading {
    transition: opacity 0.3s ease-in-out;
    opacity: 0;
}
*/
```