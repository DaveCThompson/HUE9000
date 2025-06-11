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
        this.debug = false; // Enable detailed logging

        // New properties for line wrapping
        this._textMeasureSpan = null;
        this._terminalWidth = 0;
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
        
        // Wait for fonts to be ready before calculating width
        document.fonts.ready.then(() => {
            if (this.debug) console.log('[TerminalManager] Fonts ready, performing initial width calculation.');
            this._updateTerminalWidth();
        });

        window.addEventListener('resize', () => this._updateTerminalWidth());
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
        
        // Create the text measurement element
        this._textMeasureSpan = document.createElement('span');
        this._textMeasureSpan.style.position = 'absolute';
        this._textMeasureSpan.style.visibility = 'hidden';
        this._textMeasureSpan.style.height = 'auto';
        this._textMeasureSpan.style.width = 'auto';
        this._textMeasureSpan.style.whiteSpace = 'nowrap'; // Crucial for measuring
        this._terminalContentElement.appendChild(this._textMeasureSpan);
        
        this.reset();
    }

    _updateTerminalWidth() {
        this._terminalWidth = this._terminalContentElement.getBoundingClientRect().width;
        if (this.debug) console.log(`[TerminalManager] Terminal width updated to: ${this._terminalWidth}px`);
    }

    _measureTextWidth(text) {
        if (!this._textMeasureSpan || !text) return 0;
        this._textMeasureSpan.textContent = text;
        return this._textMeasureSpan.offsetWidth;
    }

    _wrapLine(lineText) {
        if (this._measureTextWidth(lineText) <= this._terminalWidth) {
            return [lineText];
        }

        const words = lineText.split(' ');
        const wrappedLines = [];
        let currentLine = words[0];

        for (let i = 1; i < words.length; i++) {
            const testLine = currentLine + ' ' + words[i];
            if (this._measureTextWidth(testLine) <= this._terminalWidth) {
                currentLine = testLine;
            } else {
                wrappedLines.push(currentLine);
                currentLine = words[i];
            }
        }
        wrappedLines.push(currentLine);
        return wrappedLines;
    }

    _handleRequestTerminalMessage(payload) {
        if (this.debug) console.log(`[TerminalManager] Received message request:`, payload);
        const messageObject = getMessage(payload, this._appState, this._configModule);
        this._messageQueue.push({ ...payload, ...messageObject });
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

        // Handle spacing before the message block
        if (this._terminalContentElement.childElementCount > 0 && messageObject.formatting.spacingBefore > 0) {
            for (let i = 0; i < messageObject.formatting.spacingBefore; i++) {
                this._addNewLineAndPrepareForTyping();
            }
        }
        
        for (const lineText of messageObject.content) {
            const wrappedLines = this._wrapLine(lineText);
            for (let i = 0; i < wrappedLines.length; i++) {
                this._addNewLineAndPrepareForTyping();
                await this._typeLine(wrappedLines[i], messageObject.type);
                // Handle spacing within the message block (after each original line)
                if (i === wrappedLines.length - 1 && messageObject.formatting.lineSpacing > 0) {
                     for (let j = 0; j < messageObject.formatting.lineSpacing; j++) {
                        this._addNewLineAndPrepareForTyping();
                    }
                }
            }
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
            const speedPerChar = (messageType === 'block' || messageType === 'startup')
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