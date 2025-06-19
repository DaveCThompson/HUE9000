/**
 * @module terminalManager
 * @description Manages the HUE 9000 terminal display, including typing effects,
 * message queuing, cursor, scrolling, and startup flicker effects.
 * (Project Decouple Refactor)
 */
import { getMessage } from './terminalMessages.js';
import { serviceLocator } from './serviceLocator.js';
import * as appState from './appState.js'; // IMPORT appState directly
import { createAdvancedFlicker } from './animationUtils.js'; // Import flicker utility
import {
    TERMINAL_THINKING_DELAY_MIN_MS,
    TERMINAL_THINKING_DELAY_MAX_MS,
    TERMINAL_TYPING_SPEED_STARTUP_MS_PER_CHAR,
    TERMINAL_TYPING_SPEED_BLOCK_MS_PER_CHAR,
    TERMINAL_TYPING_SPEED_STATUS_MS_PER_CHAR,
    TERMINAL_INTER_LINE_PAUSE_S,
    TERMINAL_SCROLL_DURATION_S,
    TERMINAL_MAX_LINES_IN_DOM
} from './config/index.js';

class TerminalManager {
    constructor() {
        this._terminalContainerElement = null;
        this._terminalContentElement = null;
        this._gsap = null;
        this._lcdUpdater = null; 

        this._messageQueue = [];
        this._isTyping = false;
        this._currentLineElement = null;
        this._currentTextSpan = null; 
        this._cursorElement = null;
        this._isFirstLine = true; 
        this.debug = false;
        this._currentTypingPromise = null; // To manage the active typing process
    }

    init() {
        const dom = serviceLocator.get('domElements');
        this._terminalContainerElement = dom.terminalContainer;
        this._terminalContentElement = dom.terminalLcdContentElement;
        this._gsap = serviceLocator.get('gsap');
        this._lcdUpdater = serviceLocator.get('lcdUpdater'); 

        this._setupDOM();
        appState.subscribe('requestTerminalMessage', (payload) => this._handleRequestTerminalMessage(payload));
        // if (this.debug) console.log(`[TM | ${performance.now().toFixed(2)}ms] TerminalManager INIT`);
    }

    reset() {
        this._interruptAndClear(); // Use the new interrupt method for a full reset
    }

    _setupDOM() {
        this._cursorElement = document.createElement('span');
        this._cursorElement.className = 'terminal-cursor';
        this.reset();
    }

    _interruptAndClear() {
        if (this._currentTypingPromise) {
            this._currentTypingPromise.abort = true;
            this._currentTypingPromise = null;
        }
        if(this._gsap) this._gsap.killTweensOf(this); // Kill any pending delayed calls
        this._messageQueue = [];
        this._isTyping = false;
        if (this._terminalContentElement) this._terminalContentElement.innerHTML = '';
        if (this._cursorElement && this._cursorElement.parentNode) {
            this._cursorElement.parentNode.removeChild(this._cursorElement);
        }
        this._isFirstLine = true; 
        this._setCursorState('idle');
    }

    _handleRequestTerminalMessage(payload) {
        const messageData = getMessage(payload, appState);
        const messageObject = { ...payload, ...messageData };

        // 1. Handle immediate commands (interrupts and clears)
        if (messageObject.type === 'command' && messageObject.command === 'clear') {
            this._interruptAndClear();
            return;
        }
        if (messageObject.interrupt) {
            this._interruptAndClear();
        }

        // 2. Handle message coalescing for status updates
        if (messageObject.coalesce) {
            const existingIndex = this._messageQueue.findIndex(m => m.coalesceId === messageObject.coalesceId);
            if (existingIndex > -1) {
                this._messageQueue[existingIndex] = messageObject; // Replace old with new
                return; // Don't queue again and don't start a new process
            }
        }

        // 3. Add to queue
        this._messageQueue.push(messageObject);

        // 4. THE CRITICAL FIX: The Race-Condition-Proof Lock
        // Only start processing if we are not *already* in the middle of the _processQueue loop.
        if (!this._isTyping) {
            this._processQueue();
        }
    }

    async _processQueue() {
        if (this._isTyping) return; // Redundant guard, but safe

        this._isTyping = true; // Set the lock IMMEDIATELY

        while (this._messageQueue.length > 0) {
            const messageObject = this._messageQueue.shift();
            this._setCursorState('typing');

            // Thinking delay
            const delay = this._gsap.utils.random(
                TERMINAL_THINKING_DELAY_MIN_MS,
                TERMINAL_THINKING_DELAY_MAX_MS
            );
            if (!this._isFirstLine) {
                await new Promise(resolve => setTimeout(resolve, delay));
            }

            // Create a new promise for the typing task
            const typingPromise = {};
            this._currentTypingPromise = typingPromise;

            // Run the typing logic
            await this._typeMessage(messageObject, typingPromise);

            if (typingPromise.abort) {
                // If we were aborted, exit the loop immediately
                break;
            }
        }

        this._isTyping = false;
        this._currentTypingPromise = null;
        if (this._messageQueue.length === 0) {
            this._setCursorState('idle'); // Only go idle if queue is truly empty
        }
    }

    async _typeMessage(messageObject, promise) {
        if (promise.abort) return;

        if (!this._isFirstLine && messageObject.formatting.spacingBefore > 0) {
            for (let i = 0; i < messageObject.formatting.spacingBefore; i++) {
                this._addNewLineAndPrepareForTyping(true);
            }
        }

        for (let i = 0; i < messageObject.content.length; i++) {
            if (promise.abort) return;

            const lineText = messageObject.content[i];
            this._addNewLineAndPrepareForTyping();

            let speedPerChar;
            if (messageObject.type === 'startup') speedPerChar = TERMINAL_TYPING_SPEED_STARTUP_MS_PER_CHAR;
            else if (messageObject.type === 'block') speedPerChar = TERMINAL_TYPING_SPEED_BLOCK_MS_PER_CHAR;
            else speedPerChar = TERMINAL_TYPING_SPEED_STATUS_MS_PER_CHAR;

            const typeOptions = { flicker: messageObject.flicker || false };

            // Pass the promise down to be checked inside the loop
            await this._typeLine(lineText, speedPerChar, typeOptions, promise);

            if (i < messageObject.content.length - 1) {
                await this._pauseAndBlink(TERMINAL_INTER_LINE_PAUSE_S || 0.4, promise);
            }
        }
        this._isFirstLine = false;
    }

    _addNewLineAndPrepareForTyping(isSpacer = false) {
        this._currentLineElement = document.createElement('div');
        this._currentLineElement.className = 'terminal-line';
        
        this._currentTextSpan = null; // Reset span
        if (!isSpacer) {
            this._currentTextSpan = document.createElement('span');
            this._currentLineElement.appendChild(this._currentTextSpan);
            this._currentLineElement.appendChild(this._cursorElement);
        }
        
        this._terminalContentElement.appendChild(this._currentLineElement);
        
        this._limitMaxLines();
        this._isFirstLine = false;
        return this._currentTextSpan; // Return the new span for potential use
    }
    
    async _typeLine(text, speedPerChar, options = {}, promise) {
        if (!this._currentTextSpan) return;
        if (promise.abort) return;

        const scrollContainer = this._terminalContentElement.parentElement;
        let flickerAnimation = null;

        if (options.flicker) {
            flickerAnimation = createAdvancedFlicker(this._currentTextSpan, 'textFlickerToDimlyLit', { gsapInstance: this._gsap });
        }
        
        for (const char of text) {
            if (promise.abort) return;
            const oldScrollHeight = scrollContainer ? scrollContainer.scrollHeight : 0;
            this._currentTextSpan.textContent += char;

            if (options.flicker) {
                this._gsap.set(this._currentTextSpan, { autoAlpha: 1 });
            }
            
            if (scrollContainer) {
                const newScrollHeight = scrollContainer.scrollHeight;
                if (newScrollHeight > oldScrollHeight) {
                    this._scrollTerminal();
                }
            }
            
            await new Promise(resolve => setTimeout(resolve, speedPerChar));
        }

        if (flickerAnimation) {
            if (flickerAnimation.completionPromise) {
                await flickerAnimation.completionPromise;
            } else {
                await new Promise(resolve => this._gsap.delayedCall(flickerAnimation.timeline.duration(), resolve));
            }
        }
        
        this._scrollTerminal();
    }


    _pauseAndBlink(durationSeconds, promise) {
        return new Promise(resolve => {
            if (promise.abort) return resolve();
            this._setCursorState('idle');
            this._gsap.delayedCall(durationSeconds, () => {
                if (promise.abort) return resolve();
                this._setCursorState('typing');
                resolve();
            });
        });
    }

    _scrollTerminal(instant = false) {
        const scrollContainer = this._terminalContentElement.parentElement;
        if (scrollContainer) {
            this._gsap.to(scrollContainer, {
                scrollTop: scrollContainer.scrollHeight,
                duration: instant ? 0 : TERMINAL_SCROLL_DURATION_S,
                ease: 'power2.out'
            });
        }
    }

    _limitMaxLines() {
        while (this._terminalContentElement.childElementCount > TERMINAL_MAX_LINES_IN_DOM) {
            if (this._terminalContentElement.firstChild) {
                this._terminalContentElement.removeChild(this._terminalContentElement.firstChild);
            }
        }
    }

    _setCursorState(state) {
        if (!this._cursorElement) return;
        this._cursorElement.classList.toggle('is-blinking', state === 'idle');
        this._gsap.set(this._cursorElement, { opacity: 1 });
        if (state === 'idle' && !this._currentLineElement) {
            this._addNewLineAndPrepareForTyping();
        }
    }
}

const terminalManagerInstance = new TerminalManager();
export default terminalManagerInstance;