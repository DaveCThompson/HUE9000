/**
 * @module ThemeManager
 * @description Manages global UI theme changes by updating the <body> class.
 */
import { appState } from './state/index.js'

export class ThemeManager {
  constructor() {
    this.body = document.body;
  }

  init() {
    appState.subscribe('themeChanged', (newTheme) => this.handleThemeChange(newTheme));
    this.handleThemeChange(appState.getCurrentTheme());
  }

  handleThemeChange(newTheme) {
    if (!this.body) return;
    this.body.classList.remove('theme-dim', 'theme-dark', 'theme-light');
    this.body.classList.add(`theme-${newTheme}`);
  }
}