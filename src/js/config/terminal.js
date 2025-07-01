/**
 * @module config/terminal
 * @description Configuration constants for the terminal display.
 */

/** @const {number} The maximum number of lines to keep in the DOM for performance. */
export const TERMINAL_MAX_LINES_IN_DOM = 150;

/** @const {number} The typing speed in ms per character for status messages. */
export const TERMINAL_TYPING_SPEED_STATUS_MS_PER_CHAR = 40;

/** @const {number} The typing speed in ms per character for block messages. */
export const TERMINAL_TYPING_SPEED_BLOCK_MS_PER_CHAR = 8;

/** @const {number} The typing speed in ms per character for startup messages. */
export const TERMINAL_TYPING_SPEED_STARTUP_MS_PER_CHAR = 20;

/** @const {number} The debounce delay in ms for terminal interactions. */
export const TERMINAL_INTERACTION_DEBOUNCE_MS = 500;

/** @const {number} The minimum "thinking" delay in ms before typing a message. */
export const TERMINAL_THINKING_DELAY_MIN_MS = 150;

/** @const {number} The maximum "thinking" delay in ms before typing a message. */
export const TERMINAL_THINKING_DELAY_MAX_MS = 400;

/** @const {number} The duration in seconds for the terminal to scroll. */
export const TERMINAL_SCROLL_DURATION_S = 0.4;

/** @const {number} The duration in ms for the cursor to be 'on' during blinking. */
export const TERMINAL_CURSOR_BLINK_ON_MS = 530;

/** @const {number} The duration in ms for the cursor to be 'off' during blinking. */
export const TERMINAL_CURSOR_BLINK_OFF_MS = 370;

/** @const {number} The pause in seconds between typing multiple lines of a single message. */
export const TERMINAL_INTER_LINE_PAUSE_S = 0.25;