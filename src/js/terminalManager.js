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

class TerminalManager {
    constructor() {
        this._terminalContainerElement = null;
        this._terminalContentElement = null;
        // this._appState = null; // REMOVED
        this._configModule = null;
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
        // this._appState = serviceLocator.get('appState'); // REMOVED
        this._configModule = serviceLocator.get('config');
        this._gsap = serviceLocator.get('gsap');
        this._lcdUpdater = serviceLocator.get('lcdUpdater'); 

        this._setupDOM();
        appState.subscribe('requestTerminalMessage', (payload) => this._handleRequestTerminalMessage(payload));
        if (this.debug) console.log('[TerminalManager INIT]');
    }

    reset() {
        if (this.debug) console.log('[TerminalManager] Resetting terminal.');
        this._messageQueue = [];
        this._isTyping = false;
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

    playStartupFlicker(messageLines) {
        if (this.debug) console.log('[TerminalManager] Playing startup flicker animation.');
        this.reset();
        this._setCursorState('typing');

        const masterFlickerTl = this._gsap.timeline();

        const containerFlicker = this._lcdUpdater.getLcdPowerOnTimeline(this._terminalContainerElement, {
            profileName: 'terminalScreenFlickerToDimlyLit',
            state: 'dimly-lit'
        });
        masterFlickerTl.add(containerFlicker, 0);

        const lineElements = messageLines.map(lineText => {
            const lineEl = document.createElement('div');
            lineEl.className = 'terminal-line';
            lineEl.textContent = lineText;
            return lineEl;
        });
        
        this._terminalContentElement.append(...lineElements);
        this._gsap.set(lineElements, { autoAlpha: 0 });

        const textFlicker = createAdvancedFlicker(lineElements, 'textFlickerToDimlyLit', {
            gsapInstance: this._gsap,
            stagger: 0.1,
            onTimelineComplete: () => {
                const lastLine = this._terminalContentElement.querySelector('.terminal-line:last-child');
                if (lastLine) {
                    lastLine.appendChild(this._cursorElement);
                }
                this._isFirstLine = false; 
                this._setCursorState('idle');
            }
        });
        
        masterFlickerTl.add(textFlicker.timeline, ">-0.5");

        return masterFlickerTl;
    }

    getTypingTimeline(messageLines) {
        if (this.debug) console.log(`[TerminalManager] getTypingTimeline called with:`, messageLines);
        const typingTl = this._gsap.timeline();
        
        this._setCursorState('typing');
        
        messageLines.forEach((line, index) => {
            typingTl.call(() => this._addNewLineAndPrepareForTyping());
            
            const duration = (line.length * this._configModule.TERMINAL_TYPING_SPEED_STARTUP_MS_PER_CHAR) / 1000;
            typingTl.to(this._currentTextSpan, {
                duration: Math.max(0.1, duration),
                text: { value: line, delimiter: "" },
                ease: "none",
            });
        });

        typingTl.call(() => {
            this._isFirstLine = false;
            this._setCursorState('idle');
        });
        return typingTl;
    }

    _handleRequestTerminalMessage(payload) {
        if (this.debug) console.log(`[TerminalManager] Received message request:`, payload);
        // Pass the imported appState module to getMessage
        const messageData = getMessage(payload, appState, this._configModule);
        this._messageQueue.push({ ...payload, ...messageData });
        if (!this._isTyping) this._processQueue();
    }

    async _processQueue() {
        if (this._messageQueue.length === 0) {
            this._isTyping = false;
            this._setCursorState('idle');
            return;
        }
        this._isTyping = true;
        const messageObject = this._messageQueue.shift();
        
        const delay = this._gsap.utils.random(
            this._configModule.TERMINAL_THINKING_DELAY_MIN_MS,
            this._configModule.TERMINAL_THINKING_DELAY_MAX_MS
        );

        setTimeout(async () => {
            this._setCursorState('typing');
            
            if (!this._isFirstLine && messageObject.formatting.spacingBefore > 0) {
                for (let i = 0; i < messageObject.formatting.spacingBefore; i++) {
                    this._addNewLineAndPrepareForTyping(true);
                }
            }
            
            for (const lineText of messageObject.content) {
                this._addNewLineAndPrepareForTyping();
                await this._typeLine(lineText, messageObject.type);
            }

            this._isTyping = false;
            this._processQueue();
        }, this._isFirstLine ? 0 : delay);
    }

    _addNewLineAndPrepareForTyping(isSpacer = false) {
        this._currentLineElement = document.createElement('div');
        this._currentLineElement.className = 'terminal-line';
        
        if (!isSpacer) {
            this._currentTextSpan = document.createElement('span');
            this._currentLineElement.appendChild(this._currentTextSpan);
            this._currentLineElement.appendChild(this._cursorElement);
        }
        
        this._terminalContentElement.appendChild(this._currentLineElement);
        this._scrollTerminal();
        this._limitMaxLines();
        this._isFirstLine = false;
    }

    _typeLine(text, messageType = 'status') {
        return new Promise(resolve => {
            const speedPerChar = messageType === 'block' 
                ? this._configModule.TERMINAL_TYPING_SPEED_BLOCK_MS_PER_CHAR 
                : this._configModule.TERMINAL_TYPING_SPEED_STATUS_MS_PER_CHAR;
            const duration = (text.length * speedPerChar) / 1000;

            this._gsap.to(this._currentTextSpan, { 
                duration: Math.max(0.1, duration),
                text: { value: text, delimiter: "" },
                ease: "none",
                onComplete: () => {
                    resolve();
                }
            });
        });
    }

    _scrollTerminal() {
        const scrollContainer = this._terminalContentElement.parentElement;
        if (scrollContainer) {
            this._gsap.to(scrollContainer, {
                scrollTop: scrollContainer.scrollHeight,
                duration: this._configModule.TERMINAL_SCROLL_DURATION_S,
                ease: 'power2.out'
            });
        }
    }

    _limitMaxLines() {
        while (this._terminalContentElement.childElementCount > this._configModule.TERMINAL_MAX_LINES_IN_DOM) {
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