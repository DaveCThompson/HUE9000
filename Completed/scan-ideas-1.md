**SCAN‑SEQUENCE EXPERIENCE & CODE IMPROVEMENT BRIEF**
*(structured, actionable, grade‑12 reading level, no filler)*

---

## 1 Experience Audit

| Layer                        | Current Strengths                                                                                | Gaps & Risks                                                                                                                                        |
| ---------------------------- | ------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Terminal → Scan hand‑off** | Shared chromatic‑aberration CSS keeps a unified look.                                            | Visual jump when `.scan-sequence-container` mounts; no “warming‑up” frame; cursor hides instantly—feels stitched.                                   |
| **Sub‑Job visualization**    | Bar‑fill widgets animate clearly and convey progress. Logic isolated in **ScanSequencePlayer**.  | Pattern rigidity: every sub‑job uses the same widget. Requested “type‑through window” not supported.                                                |
| **Responsiveness / Mobile**  | Dedicated drawer solves small‑screen layout.                                                     | Drawer buttons disabled via `pointer-events:none` during scans; no affordance to cancel mid‑scan; heavy GSAP timelines may jank on low‑end devices. |
| **Accessibility**            | `aria-live`, visually‑hidden region, keyboard roles.                                             | Missing *prefers‑reduced‑motion* handling; scan colors rely on hue only (WCAG contrast / color‑blind).                                              |

---

## 2 Interaction & Visual Concepts

### 2.1 “Window Typist” Sub‑Job Widget

**Goal:** Replace dual bar sliders with a single‑line typewriter that cycles phrases while a subtle horizontal gradient pulses behind.

| Element        | Spec                                                                                                                                                                                |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Host container | `<div class="scan-sub-job is-active" data-renderer="typeWindow">`                                                                                                                   |
| Dynamic text   | Rotate through `progressiveLines[*].text` array; change every *0.6–1 s* (configurable) with GSAP `text` plugin or custom per‑char tween.                                            |
| Pulse          | `background: linear-gradient(90deg, transparent 0%, oklch(0.8 0.18 var(--hue)) 40%, transparent 80%)`;<br/> animate `background-position` via GSAP’s `modifiers` for seamless loop. |
| Exit state     | Fade pulse → replace spinner icon with `check_circle`; freeze last phrase for continuity.                                                                                           |

### 2.2 “Pre‑charge” Bridge Frame

Before `.scan-sequence-container` mounts, play a 150 ms LCD sweep + cursor spark to hide mount jump. Use shared GSAP timeline so both Terminal and Scan own the same master root (see §3.3).

### 2.3 Interrupt & Recovery

Add *\[ESC]* key and on‑screen “Abort” button. Call `ScanSequencePlayer.kill()` and push a `status` message: `> EVALUATION ABORTED BY USER`.

---

## 3 Architecture Improvements

### 3.1 Renderer Registry (Open/Closed Principle)

```ts
// scanRenderers/index.ts
export type Renderer = (ctx: RenderContext) => gsap.core.Timeline;
const registry: Record<string, Renderer> = {};
export function register(id: string, fn: Renderer) { registry[id] = fn; }
export function get(id: string) { return registry[id]; }
```

* **ScanSequencePlayer** looks up `subJob.renderer || 'barFill'` and delegates, keeping core logic slim.
* New widgets (typeWindow, radialGauge, sparkline) drop in with `register()`.

### 3.2 Finite‑State Machine per Scan

Leverage existing XState dependency (already used during boot per comments in *index.html*). States: `idle → intro → subJob[n] → outro → completed → aborted`. Each sub‑job child state gets its own entry/exit which simplifies interrupt logic.

### 3.3 Root Timeline Orchestrator

Create one GSAP `context` bound to `<body>`; nest Terminal typing TL and Scan TL inside. Gains:

* Shared clock → smoother hand‑offs.
* Easy global `timeScale()` adjustment for debug / accessibility (“slow‑mo” switch).

### 3.4 Memory & DOM Hygiene

* Use `DocumentFragment` when adding many progressive‑line nodes to cut reflows.
* After `kill()` flush `registry` observers and call `gsap.context().revert()` to free tweens.
* Cap auto‑created nodes per scan (configurable limit); recycle where possible.

---

## 4 Performance

1. **Batch writes** inside `_buildMasterTimeline`—toggle classes first, then run a single `gsap.set` to colorize elements (now done 3× in loop).&#x20;
2. **Lazy‑load GSAP plugins**: split `TextPlugin` and custom renderers into separate chunks with dynamic `import()`; main bundle parses faster.
3. **Reduce RGB → OKLCH conversions**: pre‑compute HSLA strings in `scanSequences.js`; avoid `oklch()` in inline styles for each frame tick.&#x20;

---

## 5 Accessibility & Preferences

| Concern            | Action                                                                                                                                                    |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Reduced motion     | Wrap every timeline creation in `if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches)`; else skip animations and instant‑set final states. |
| Color contrast     | Add luminance boost when hue is ≥ 180 & chroma high; or overlay outline.                                                                                  |
| Screen reader flow | When a scan starts, send `aria-live="assertive"` message “Evaluation in progress” then switch back to `polite` on finish to avoid chatter.                |

---

## 6 Code Quality & Maintainability

* **Convert to TypeScript**—gives typed `scanConfig` and renderer contracts.
* **JSDoc** for public APIs (`play`, `kill`, renderer signatures).
* **Unit tests**: Jest + JSDOM to verify timeline labels & state machine transitions.
* Enforce **ESLint + Prettier** with a project‑wide `.editorconfig`.

---

## 7 Branding & Aesthetic Refinements

1. **Typography hierarchy**: push `.scan-main-title` to `font-weight:600`, letter‑spacing `0.02em` for brand authority.
2. **Pulse color palette**: derive from existing `HUE_ASSIGNMENT_ROW_HUES` ensuring the scan inherits current brand color context automatically.
3. **Background grid fade** behind Scan window echoes brand’s circuit motif—SVG mask at 4 % opacity, animated `stroke-dashoffset` for subtle tech vibe.

---

## 8 Road‑map (2‑week sprint sample)

| Day   | Deliverable                                                     |
| ----- | --------------------------------------------------------------- |
| 1‑2   | Implement renderer registry; migrate existing barFill renderer. |
| 3‑5   | Build **typeWindow** renderer + pulse CSS; QA desktop/mobile.   |
| 6     | Introduce pre‑charge bridge frame; polish hand‑off.             |
| 7‑8   | Add FSM layer; integrate Abort control; write unit tests.       |
| 9‑10  | Accessibility & reduced‑motion pass; performance profiling.     |
| 11‑12 | Branding tweaks, copy review, final demo.                       |

---

### Immediate Next Step

Stand up a *feature branch* `scan/refactor-renderers`, scaffold the registry, and port one current sub‑job as proof‑of‑concept before adding new widgets.

---

*This document dissects present UX and code, proposing concrete enhancements to deliver a best‑in‑class scan experience with a sustainable development architecture.*
