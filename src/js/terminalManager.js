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
        this.debug = true; 
    }

    init() {
        const dom = serviceLocator.get('domElements');
        this._terminalContainerElement = dom.terminalContainer;
        this._terminalContentElement = dom.terminalLcdContentElement;
        this._gsap = serviceLocator.get('gsap');
        this._lcdUpdater = serviceLocator.get('lcdUpdater'); 

        this._setupDOM();
        appState.subscribe('requestTerminalMessage', (payload) => this._handleRequestTerminalMessage(payload));
        if (this.debug) console.log(`[TM | ${performance.now().toFixed(2)}ms] TerminalManager INIT`);
    }

    reset() {
        if (this.debug) console.log('[TerminalManager] Resetting terminal.');
        this._isTyping = false;
        if(this._gsap) this._gsap.killTweensOf(this); // Kill any pending delayed calls
        this._messageQueue = [];
        if (this._terminalContentElement) this._terminalContentElement.innerHTML = '';
        if (this._cursorElement && this._cursorElement.parentNode) {
            this._cursorElement.parentNode.removeChild(this._cursorElement);
        }
        this._isFirstLine = true; 
        this._setCursorState('idle');
    }

    _setupDOM() {
        this._cursorElement = document.createElement('span');
        this._cursorElement.className = 'terminal-cursor';
        this.reset();
    }

    // The playStartupFlicker method has been removed as it was causing the issue.
    // The desired effect is now achieved declaratively in startupPhase1.js by combining
    // an 'lcdPowerOn' animation for the container with a 'terminalMessageKey' request.

    _handleRequestTerminalMessage(payload) {
        // Handle clear command immediately, even if typing
        if (payload.type === 'command' && payload.command === 'clear') {
            console.log(`[TM | ${performance.now().toFixed(2)}ms] Received immediate command: clear`);
            this.reset();
            return; // Don't queue the clear command
        }
        
        console.log(`[TM | ${performance.now().toFixed(2)}ms] Queuing request: ${payload.messageKey || payload.source}`);
        // Pass the imported appState module to getMessage
        const messageData = getMessage(payload, appState);
        this._messageQueue.push({ ...payload, ...messageData });
        
        // Only start the processing loop if it's not already running.
        if (!this._isTyping) {
            this._processQueue();
        }
    }

    async _processQueue() {
        if (this._isTyping || this._messageQueue.length === 0) {
            return;
        }

        this._isTyping = true;
        this._setCursorState('typing');

        while (this._messageQueue.length > 0) {
            const messageObject = this._messageQueue.shift();
            console.log(`[TM | ${performance.now().toFixed(2)}ms] Dequeuing and processing: ${messageObject.messageKey || messageObject.source}`);

            const delay = this._gsap.utils.random(
                TERMINAL_THINKING_DELAY_MIN_MS,
                TERMINAL_THINKING_DELAY_MAX_MS
            );
            
            if (!this._isFirstLine) {
                await new Promise(resolve => this._gsap.delayedCall(delay / 1000, resolve));
            }
            
            if (!this._isFirstLine && messageObject.formatting.spacingBefore > 0) {
                for (let i = 0; i < messageObject.formatting.spacingBefore; i++) {
                    this._addNewLineAndPrepareForTyping(true);
                }
            }

            for (let i = 0; i < messageObject.content.length; i++) {
                const lineText = messageObject.content[i];
                this._addNewLineAndPrepareForTyping();

                let speedPerChar;
                if (messageObject.type === 'startup') {
                    speedPerChar = TERMINAL_TYPING_SPEED_STARTUP_MS_PER_CHAR;
                } else if (messageObject.type === 'block') {
                    speedPerChar = TERMINAL_TYPING_SPEED_BLOCK_MS_PER_CHAR;
                } else {
                    speedPerChar = TERMINAL_TYPING_SPEED_STATUS_MS_PER_CHAR;
                }
                
                // Pass the flicker option from the message object to the typing method.
                const typeOptions = { flicker: messageObject.flicker || false };
                await this._typeLine(lineText, speedPerChar, typeOptions);
                
                if (i < messageObject.content.length - 1) {
                    await this._pauseAndBlink(TERMINAL_INTER_LINE_PAUSE_S || 0.4);
                }
            }
            
            this._isFirstLine = false;
        }

        this._isTyping = false;
        this._setCursorState('idle');
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
    
    async _typeLine(text, speedPerChar, options = {}) {
        if (!this._currentTextSpan) return;
        const scrollContainer = this._terminalContentElement.parentElement;
        let flickerAnimation = null;

        if (options.flicker) {
            // Start the advanced flicker animation on the text span.
            // We do not await it here; we let it run in the background.
            flickerAnimation = createAdvancedFlicker(this._currentTextSpan, 'textFlickerToDimlyLit', { gsapInstance: this._gsap });
        }
        
        // Standard character-by-character typing loop.
        for (const char of text) {
            const oldScrollHeight = scrollContainer ? scrollContainer.scrollHeight : 0;
            this._currentTextSpan.textContent += char;

            if (options.flicker) {
                // "Battle" the flicker animation's autoAlpha tween by forcing visibility
                // on each frame. This creates the chaotic, energetic flicker effect.
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
            // Now that typing is done, await the flicker animation's completion
            // to ensure it "settles" into its final state before we proceed.
            if (flickerAnimation.completionPromise) {
                await flickerAnimation.completionPromise;
            } else {
                await new Promise(resolve => this._gsap.delayedCall(flickerAnimation.timeline.duration(), resolve));
            }
        }
        
        this._scrollTerminal();
    }


    _pauseAndBlink(durationSeconds) {
        return new Promise(resolve => {
            this._setCursorState('idle');
            this._gsap.delayedCall(durationSeconds, () => {
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