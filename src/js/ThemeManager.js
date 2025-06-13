/**
 * @module ThemeManager
 * @description Manages global UI theme changes by updating the <body> class.
 * Replaces the theme-handling portion of the old uiUpdater.js.
 */
import { serviceLocator } from './serviceLocator.js';
import * as appState from './appState.js'; // IMPORT appState directly

export class ThemeManager {
  constructor() {
    this.body = document.body;
    // this.appState = null; // REMOVED
    this.debug = false;
  }

  /**
   * Initializes the ThemeManager, subscribing to necessary appState events.
   */
  init() {
    if (this.debug) console.log('[ThemeManager INIT]');
    // this.appState = serviceLocator.get('appState'); // REMOVED
    appState.subscribe('themeChanged', (newTheme) => this.handleThemeChange(newTheme));

    // Set initial theme based on appState
    this.handleThemeChange(appState.getCurrentTheme());
  }

  /**
   * Handles theme changes by updating the class list on the body element.
   * @param {string} newTheme - The new theme name ('dim', 'dark', 'light').
   */
  handleThemeChange(newTheme) {
    if (!this.body) return;
    if (this.debug) console.log(`[ThemeManager] Theme changing to '${newTheme}'.`);

    this.body.classList.remove('theme-dim', 'theme-dark', 'theme-light');
    this.body.classList.add(`theme-${newTheme}`);
  }
}