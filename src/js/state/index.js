/**
 * @module state/index
 * @description Barrel file for the state management system.
 * Provides a single import point for both the appState module and all action creators.
 */

// Namespace export of the appState module
export * as appState from './appState.js';

// Namespace export of all actions
export * as actions from './actions.js';

// Named re-exports of individual action creators
export * from './actions.js';
