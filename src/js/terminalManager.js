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

// This value MUST be kept in sync with the `max-width` in `_terminal.css`.
const TERMINAL_MAX_CHARS_PER_LINE = 65;

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
        const cursorInner = document.createElement('span');
        cursorInner.className = 'cursor-inner';
        this._cursorElement.appendChild(cursorInner);
        this.reset();
    }

    _interruptAndClear() {
        // ROBUSTNESS FIX: Abort the current promise if it exists.
        // The running `_processQueue` loop will now be responsible for cleaning up its own state.
        if (this._currentTypingPromise) {
            this._currentTypingPromise.abort = true;
            this._currentTypingPromise = null; // We can clear our reference to it.
        }
        
        // Kill any pending delayed calls (like inter-line pauses).
        if(this._gsap) this._gsap.killTweensOf(this); 
        
        // Clear the message queue of any pending work.
        this._messageQueue = [];
        
        // Clear the visual DOM content.
        if (this._terminalContentElement) this._terminalContentElement.innerHTML = '';
        if (this._cursorElement && this._cursorElement.parentNode) {
            this._cursorElement.parentNode.removeChild(this._cursorElement);
        }
        
        this._isFirstLine = true; 
        
        // ROBUSTNESS FIX: DO NOT set `_isTyping = false` here.
        // The currently running `_processQueue` instance must be the one to release the lock.
        // We can, however, immediately set the cursor to idle.
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

        // 4. Start processing ONLY if we are not already in a processing loop.
        if (!this._isTyping) {
            this._processQueue();
        }
    }

    async _processQueue() {
        if (this._isTyping) return; // Redundant guard, but safe

        this._isTyping = true; // Set the lock IMMEDIATELY

        while (this._messageQueue.length > 0) {
            const messageObject = this._messageQueue.shift();
            
            this._setCursorState('thinking');
            const delay = this._gsap.utils.random(
                TERMINAL_THINKING_DELAY_MIN_MS,
                TERMINAL_THINKING_DELAY_MAX_MS
            );
            
            const typingPromise = {};
            this._currentTypingPromise = typingPromise;
            
            await new Promise(resolve => {
                this._gsap.delayedCall(delay / 1000, resolve);
            }).catch(() => {});

            // ROBUSTNESS FIX: Check for abortion immediately after any `await`.
            if (typingPromise.abort) {
                break;
            }

            this._setCursorState('typing');
            await this._typeMessage(messageObject, typingPromise);

            if (typingPromise.abort) {
                break;
            }
        }

        // ROBUSTNESS FIX: This block is now the ONLY place where `_isTyping` is set to false.
        this._isTyping = false;
        this._currentTypingPromise = null;
        if (this._messageQueue.length === 0) {
            this._setCursorState('idle'); // Only go idle if queue is truly empty
        }
    }

    _breakTextIntoVisualLines(text) {
        if (!text) return [''];
        const lines = [];
        const logicalLines = text.split('\n');

        for (const logicalLine of logicalLines) {
            const words = logicalLine.split(' ');
            let currentLine = '';

            for (const word of words) {
                if (word.length > TERMINAL_MAX_CHARS_PER_LINE) {
                    if (currentLine.length > 0) {
                        lines.push(currentLine);
                        currentLine = '';
                    }
                    let tempWord = word;
                    while (tempWord.length > TERMINAL_MAX_CHARS_PER_LINE) {
                        lines.push(tempWord.substring(0, TERMINAL_MAX_CHARS_PER_LINE));
                        tempWord = tempWord.substring(TERMINAL_MAX_CHARS_PER_LINE);
                    }
                    currentLine = tempWord;
                    continue;
                }

                if ((currentLine + ' ' + word).trim().length > TERMINAL_MAX_CHARS_PER_LINE && currentLine.length > 0) {
                    lines.push(currentLine);
                    currentLine = word;
                } else {
                    if (currentLine.length > 0) {
                        currentLine += ' ';
                    }
                    currentLine += word;
                }
            }
            if (currentLine.length > 0) {
                lines.push(currentLine);
            } else if (lines.length === 0 && logicalLines.length === 1) {
                lines.push('');
            }
        }
        return lines;
    }

    async _typeMessage(messageObject, promise) {
        if (promise.abort) return;

        if (!this._isFirstLine && messageObject.formatting.spacingBefore > 0) {
            for (let i = 0; i < messageObject.formatting.spacingBefore; i++) {
                this._addNewLineAndPrepareForTyping(true);
            }
        }
        
        const allVisualLines = [];
        for (const logicalLine of messageObject.content) {
            const visualLines = this._breakTextIntoVisualLines(logicalLine);
            allVisualLines.push(...visualLines);
        }

        for (let i = 0; i < allVisualLines.length; i++) {
            if (promise.abort) return;

            const lineText = allVisualLines[i];
            this._addNewLineAndPrepareForTyping(false, messageObject.className);

            let speedPerChar;
            if (messageObject.type === 'startup') speedPerChar = TERMINAL_TYPING_SPEED_STARTUP_MS_PER_CHAR;
            else if (messageObject.type === 'block') speedPerChar = TERMINAL_TYPING_SPEED_BLOCK_MS_PER_CHAR;
            else speedPerChar = TERMINAL_TYPING_SPEED_STATUS_MS_PER_CHAR;

            const typeOptions = { flicker: messageObject.flicker || false };

            await this._typeLine(lineText, speedPerChar, typeOptions, promise);

            if (promise.abort) return;

            if (i < allVisualLines.length - 1) {
                await this._pauseAndBlink(TERMINAL_INTER_LINE_PAUSE_S || 0.4, promise);
            }
        }
        this._isFirstLine = false;
    }

    _addNewLineAndPrepareForTyping(isSpacer = false, className = null) {
        this._currentLineElement = document.createElement('div');
        this._currentLineElement.className = 'terminal-line';
        if (className) {
            this._currentLineElement.classList.add(className);
        }
        
        this._currentTextSpan = null; // Reset span
        if (!isSpacer) {
            this._currentTextSpan = document.createElement('span');
            this._currentLineElement.appendChild(this._currentTextSpan);
            this._currentLineElement.appendChild(this._cursorElement);
        }
        
        this._terminalContentElement.appendChild(this._currentLineElement);
        
        this._limitMaxLines();
        this._isFirstLine = false;
        return this._currentTextSpan;
    }
    
    async _typeLine(text, speedPerChar, options = {}, promise) {
        if (!this._currentTextSpan || promise.abort) return;

        // FIX: If the line is meant to be empty, just add a non-breaking space
        // to ensure it takes up vertical space, then exit immediately.
        if (text === '') {
            this._currentTextSpan.innerHTML = ' ';
            return;
        }

        const scrollContainer = this._terminalContainerElement;
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
        const scrollContainer = this._terminalContainerElement; // Corrected scroll target
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

    _setCursorState(state) { // state can be 'idle', 'typing', 'thinking'
        if (!this._cursorElement) return;
        
        this._cursorElement.classList.remove('is-blinking', 'is-solid', 'is-thinking');

        switch (state) {
            case 'idle':
                this._cursorElement.classList.add('is-blinking');
                break;
            case 'typing':
                this._cursorElement.classList.add('is-solid');
                break;
            case 'thinking':
                this._cursorElement.classList.add('is-thinking');
                break;
        }

        if (state === 'idle' && !this._cursorElement.parentElement) {
             this._addNewLineAndPrepareForTyping();
        }
    }
}

const terminalManagerInstance = new TerminalManager();
export default terminalManagerInstance;