/**
 * @module terminalManager
 * @description Manages the HUE 9000 terminal display, including typing effects,
 * message queuing, cursor, scrolling, and startup flicker effects.
 * (Project Decouple Refactor)
 */
import { getMessage } from './terminalMessages.js';
import { serviceLocator } from './serviceLocator.js';

class TerminalManager {
    constructor() {
        this._terminalContainerElement = null;
        this._terminalContentElement = null;
        this._appState = null;
        this._configModule = null;
        this._gsap = null;

        this._messageQueue = [];
        this._isTyping = false;
        this._currentLineElement = null;
        this._cursorElement = null;
        this.debug = true; // Enable detailed logging
    }

    init() {
        const dom = serviceLocator.get('domElements');
        this._terminalContainerElement = dom.terminalContainer;
        this._terminalContentElement = dom.terminalLcdContentElement;
        this._appState = serviceLocator.get('appState');
        this._configModule = serviceLocator.get('config');
        this._gsap = serviceLocator.get('gsap');

        this._setupDOM();
        this._appState.subscribe('requestTerminalMessage', (payload) => this._handleRequestTerminalMessage(payload));
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
        this._setCursorState('idle');
    }

    _setupDOM() {
        this._cursorElement = document.createElement('span');
        this._cursorElement.className = 'terminal-cursor';
        this.reset();
    }

    /**
     * Creates and returns a GSAP timeline for typing text.
     * @param {string[]} messageLines - An array of strings to be typed.
     * @returns {gsap.core.Timeline} A GSAP timeline for the typing animation.
     */
    getTypingTimeline(messageLines) {
        if (this.debug) console.log(`[TerminalManager] getTypingTimeline called with:`, messageLines);
        const typingTl = this._gsap.timeline();
        
        this._setCursorState('typing');
        
        messageLines.forEach((line, index) => {
            typingTl.call(() => this._addNewLineAndPrepareForTyping());
            
            const duration = (line.length * this._configModule.TERMINAL_TYPING_SPEED_STARTUP_MS_PER_CHAR) / 1000;
            typingTl.to(this._currentLineElement, {
                duration: Math.max(0.1, duration),
                text: { value: line, delimiter: "" },
                ease: "none",
                onUpdate: () => this._currentLineElement.appendChild(this._cursorElement),
                onComplete: () => this._currentLineElement.appendChild(this._cursorElement)
            });
        });

        typingTl.call(() => this._setCursorState('idle'));
        return typingTl;
    }

    _handleRequestTerminalMessage(payload) {
        if (this.debug) console.log(`[TerminalManager] Received message request:`, payload);
        const content = getMessage(payload, {}, this._configModule);
        this._messageQueue.push({ ...payload, content });
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
        
        this._setCursorState('typing');
        
        for (const lineText of messageObject.content) {
            this._addNewLineAndPrepareForTyping();
            await this._typeLine(lineText, messageObject.type);
        }

        this._isTyping = false;
        this._processQueue();
    }

    _addNewLineAndPrepareForTyping() {
        if (this._cursorElement && this._cursorElement.parentNode) {
            this._cursorElement.parentNode.removeChild(this._cursorElement);
        }
        this._currentLineElement = document.createElement('div');
        this._currentLineElement.className = 'terminal-line';
        this._terminalContentElement.appendChild(this._currentLineElement);
        this._scrollTerminal();
        this._limitMaxLines();
        this._currentLineElement.appendChild(this._cursorElement);
    }

    _typeLine(text, messageType = 'status') {
        return new Promise(resolve => {
            const speedPerChar = messageType === 'block' 
                ? this._configModule.TERMINAL_TYPING_SPEED_BLOCK_MS_PER_CHAR 
                : this._configModule.TERMINAL_TYPING_SPEED_STATUS_MS_PER_CHAR;
            const duration = (text.length * speedPerChar) / 1000;

            this._gsap.to(this._currentLineElement, {
                duration: Math.max(0.1, duration),
                text: { value: text, delimiter: "" },
                ease: "none",
                onUpdate: () => this._currentLineElement.appendChild(this._cursorElement),
                onComplete: () => {
                    this._currentLineElement.appendChild(this._cursorElement);
                    resolve();
                }
            });
        });
    }

    _scrollTerminal() {
        const scrollContainer = this._terminalContentElement.parentElement;
        if (scrollContainer) scrollContainer.scrollTop = scrollContainer.scrollHeight;
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