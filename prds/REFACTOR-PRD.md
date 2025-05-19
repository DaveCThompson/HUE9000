## Product Requirements Document: HUE 9000 Interface Refactor (Post-V2.3)

**Version:** 1.0
**Date:** October 26, 2023
**Author:** AI Assistant (based on user request)
**Project:** HUE 9000 Interface

### 1. Introduction

This document outlines the requirements and architectural changes implemented in the HUE 9000 Interface refactor (Post-V2.3). The primary goal of this refactor was to improve project organization, clarify naming conventions related to theming, and standardize asset management. This PRD serves as a guide, especially for future Large Language Models (LLMs), to understand the updated structure and conventions, ensuring consistency and maintainability.

### 2. Goals of this Refactor

*   **Improve Project Organization:** Simplify the root directory structure by relocating JavaScript and CSS source files.
*   **Enhance Clarity of Theme-Related Naming:** Rename "dark mode" and "light mode" theme identifiers to more descriptive terms (`auxLow`, `auxHigh`) that reflect their functional origin (AUX LIGHT control state), avoiding confusion with potential future global UI dark/light modes.
*   **Standardize Asset Management:** Consolidate all static assets into a single, clearly defined root-level directory.
*   **Provide a Clear, Consistent Structure for LLM Comprehension:** Ensure that the changes make the codebase easier for LLMs to parse, understand, and modify accurately.

### 3. Target Audience (for this PRD & the refactored code)

*   **Primary:** Future Large Language Models (LLMs) tasked with understanding, maintaining, or extending this codebase.
*   **Secondary:** Human developers onboarding to the project or referencing its structure.

### 4. Scope of Changes

#### 4.1. In Scope:

*   **Directory Structure Modification:**
    *   Relocation of all JavaScript files from `src/js/` to `js/` (project root).
    *   Relocation of all CSS files and subdirectories from `src/css/` to `css/` (project root).
*   **Asset Management Consolidation:**
    *   Relocation of all assets from `public/` to `assets/` (project root).
    *   Consolidation of the existing `assets/logo.svg` into the new root `assets/` directory.
*   **Theme Naming Convention Update:**
    *   Systematic renaming of "dark mode" theme identifiers to `auxLow`.
    *   Systematic renaming of "light mode" theme identifiers to `auxHigh`.
*   **Codebase Updates:**
    *   Updating all internal code references (HTML links, CSS imports, CSS asset URLs, JavaScript imports, JavaScript logic, and comments) to reflect the new directory structure and theme naming conventions.
    *   Updating all markdown documentation files (`PROJECT STRUCTURE.md`, `THEMING_GUIDELINES.md`, `STARTUP_SEQUENCE.md`, `PROJECT_OVERVIEW.md`, `TROUBLESHOOTING_AND_FIXES_LOG.md`) to reflect these changes.

#### 4.2. Out of Scope:

*   Changes to core application logic or functional behavior (beyond what's necessary to accommodate path/name changes).
*   Addition of new features or UI elements.
*   Modification of the `theme-dim` naming or its associated logic.

### 5. Architectural Changes & Guidelines for LLMs

This section details the specific changes and provides explicit guidance for LLMs interacting with the codebase.

#### 5.1. Directory Structure

*   **Previous Structure (Relevant Snippet):**
    ```
    HUE9000_Project/
    ├── public/
    ├── src/
    │   ├── js/
    │   └── css/
    ├── assets/ (contained only logo.svg)
    └── index.html
    ```
*   **New Structure (Relevant Snippet):**
    ```
    HUE9000_Project/
    ├── js/
    ├── css/
    ├── assets/ (contains all static assets)
    └── index.html
    ```
*   **Guidance for LLM:**
    *   All JavaScript source files are now located directly in the `js/` directory at the project root.
    *   All CSS source files (including subdirectories like `core/`, `themes/`, `components/`) are now located directly in the `css/` directory at the project root.
    *   When generating or modifying file paths for HTML links, CSS imports, or JavaScript module imports, adhere to this new root-level placement of `js/` and `css/` directories.

#### 5.2. Asset Management

*   **Change:** All static assets (e.g., `.png`, `.svg` images, textures) previously in `public/` and the standalone `assets/logo.svg` are now consolidated into a single `assets/` directory at the project root.
*   **Guidance for LLM:**
    *   Reference all static assets using root-relative paths starting with `/assets/`. For example, a noise texture previously at `/public/noise.svg` is now at `/assets/noise.svg`.
    *   The main application logo is now at `/assets/logo.svg`.
    *   This applies to CSS `url()` paths and any potential JavaScript-driven asset loading.

#### 5.3. Theme Naming Conventions

*   **Change:**
    *   The theme previously identified as "dark mode" (e.g., `theme-dark.css`, `body.theme-dark`) is now identified as `auxLow` (e.g., `theme-auxLow.css`, `body.theme-auxLow`).
    *   The theme previously identified as "light mode" (e.g., `theme-light.css`, `body.theme-light`) is now identified as `auxHigh` (e.g., `theme-auxHigh.css`, `body.theme-auxHigh`).
    *   The `theme-dim` identifier remains unchanged.
*   **Rationale:** This change was made to more accurately reflect that these two themes are directly controlled by the "AUX LIGHT" toggle states ("LOW" and "HIGH" respectively) and to avoid potential naming conflicts if a global UI dark/light mode preference (independent of the AUX LIGHT) were to be introduced in the future.
*   **Guidance for LLM:**
    *   Consistently use `theme-auxLow` and `theme-auxHigh` in all contexts:
        *   CSS selectors (e.g., `body.theme-auxLow {...}`).
        *   CSS filenames (e.g., `css/themes/theme-auxLow.css`).
        *   JavaScript logic involving theme names (e.g., `appState.setTheme('auxLow')`).
        *   Comments and documentation.
    *   Understand that `auxLow` corresponds to the AUX LIGHT "LOW" state and `auxHigh` to the "HIGH" state.

#### 5.4. Impacted File Types & Update Strategy

*   **Affected Files:** `index.html`, all `.css` files, all `.js` files, and all `.md` documentation files.
*   **Strategy:** All internal references to file paths and the specified theme names have been systematically updated across the entire codebase and documentation to reflect these changes.
*   **Guidance for LLM:**
    *   When modifying existing code or generating new code that involves file paths or theme references, ensure strict adherence to the new conventions outlined in sections 5.1, 5.2, and 5.3.
    *   Pay close attention to relative vs. root-relative paths:
        *   HTML: `<link href="./css/main.css">`, `<script type="module" src="./js/main.js">` (relative to `index.html`).
        *   CSS: `url('/assets/noise.svg')` (root-relative for assets), `@import url('./core/_layout.css')` (relative within `css/` directory).
        *   JS: `import ... from './utils.js'` (relative within `js/` directory), `fetch('/assets/logo.svg')` (root-relative for assets).

### 6. Guiding Principles for LLM Interaction with the Refactored Codebase

*   **Strict Adherence:** The LLM must strictly follow the new directory structure (5.1), asset management paths (5.2), and theme naming conventions (5.3) in any code it generates or modifies.
*   **Consistency:** If new theme-related logic or file path references are introduced, they must be consistent with these established refactor guidelines.
*   **Path Resolution Context:** The LLM should be aware of the context when resolving paths (HTML base, CSS file location, JS module location, web server root for `/` prefixed paths).
*   **Documentation Updates:** If the LLM makes significant changes that would impact the architectural understanding outlined here or in other project markdown files, it should flag the need for documentation updates or attempt to update them using the new conventions.
*   **Rationale Understanding:** The LLM should, where possible, incorporate the rationale behind the theme renaming (linking `auxLow`/`auxHigh` to the AUX LIGHT control) into its understanding to make more informed decisions if extending theme-related functionality.

### 7. Success Metrics for this Refactor (from an LLM's perspective)

*   **Reduced Ambiguity:** Clearer and less ambiguous file paths and theme identifiers.
*   **Improved Accuracy:** Higher accuracy in LLM-generated code or modifications related to file structure and theming.
*   **Simplified Parsing:** A more standardized and flatter root project structure that is easier for an LLM to parse and navigate.
*   **Error Reduction:** Fewer errors stemming from incorrect path assumptions or misinterpretation of "dark/light mode" terminology.

### 8. Glossary

*   **`auxLow`:** The theme state previously referred to as "dark mode." Activated when the AUX LIGHT control is set to "LOW." Represented by `body.theme-auxLow` and `css/themes/theme-auxLow.css`.
*   **`auxHigh`:** The theme state previously referred to as "light mode." Activated when the AUX LIGHT control is set to "HIGH." Represented by `body.theme-auxHigh` and `css/themes/theme-auxHigh.css`.
*   **`theme-dim`:** The initial, low-power startup theme. Its naming and functionality are unchanged by this specific refactor.
*   **`/assets/`:** The root-level directory now containing all static project assets (images, SVGs).

---