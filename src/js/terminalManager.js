/**
 * @module terminalManager
 * @description Manages the HUE 9000 terminal display, including typing effects,
 * message queuing, cursor, scrolling, and startup flicker effects.
 * (Project Decouple Refactor)
 */
import { getMessage } from './terminalMessages.js';
import { createAdvancedFlicker } from './animationUtils.js';
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
        this._initialMessageFlickered = false;
        this.debug = false;
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
        this._messageQueue = [];
        this._isTyping = false;
        this._initialMessageFlickered = false;
        if (this._terminalContentElement) this._terminalContentElement.innerHTML = '';
        if (this._cursorElement && this._cursorElement.parentNode) {
            this._cursorElement.parentNode.removeChild(this._cursorElement);
        }
    }

    _setupDOM() {
        this._cursorElement = document.createElement('span');
        this._cursorElement.className = 'terminal-cursor';
        this._cursorElement.textContent = '▋';
        this._cursorElement.style.visibility = 'hidden';
        this.reset();
    }

    _handleRequestTerminalMessage(payload) {
        if (!payload) return;

        let snapshot = {};
        if (payload.messageKey === 'BTN4_MESSAGE') {
            snapshot = {
                theme: this._appState.getCurrentTheme(),
                lensPower: this._appState.getTrueLensPower(),
                dialA: this._appState.getDialState('A'),
                dialB: this._appState.getDialState('B'),
                envHue: this._appState.getTargetColorProperties('env'),
                lcdHue: this._appState.getTargetColorProperties('lcd'),
                logoHue: this._appState.getTargetColorProperties('logo'),
                btnHue: this._appState.getTargetColorProperties('btn'),
            };
        }

        const content = getMessage(payload, snapshot, this._configModule);
        this._messageQueue.push({ ...payload, content });
        if (!this._isTyping) this._processQueue();
    }

    async _processQueue() {
        if (this._messageQueue.length === 0) {
            this._isTyping = false;
            return;
        }
        this._isTyping = true;
        const messageObject = this._messageQueue.shift();

        if (this._gsap.getProperty(this._terminalContentElement, "opacity") < 1) {
            this._gsap.set(this._terminalContentElement, { opacity: 1, visibility: 'visible' });
        }

        const delay = Math.random() * (this._configModule.TERMINAL_NEW_LINE_DELAY_MAX_MS - this._configModule.TERMINAL_NEW_LINE_DELAY_MIN_MS) + this._configModule.TERMINAL_NEW_LINE_DELAY_MIN_MS;
        await new Promise(resolve => setTimeout(resolve, delay));

        for (let i = 0; i < messageObject.content.length; i++) {
            const lineText = messageObject.content[i];
            this._addNewLineAndPrepareForTyping();

            if (messageObject.source === 'EMERGENCY_SUBSYSTEMS' && !this._initialMessageFlickered) {
                this._currentLineElement.appendChild(this._cursorElement);
                this._showCursor();
                const flickerResult = createAdvancedFlicker(this._currentLineElement, 'textFlickerToDimlyLit', { gsapInstance: this._gsap });
                if (flickerResult.timeline) {
                    const textAnim = {
                        duration: (lineText.length * this._configModule.TERMINAL_TYPING_SPEED_STARTUP_MS_PER_CHAR) / 1000,
                        text: { value: lineText, delimiter: "" },
                        ease: "none",
                        onUpdate: () => this._currentLineElement.appendChild(this._cursorElement),
                        onComplete: () => this._currentLineElement.appendChild(this._cursorElement)
                    };
                    flickerResult.timeline.to(this._currentLineElement, textAnim, flickerResult.timeline.duration() * 0.25);
                    await new Promise(res => flickerResult.timeline.eventCallback('onComplete', res).play());
                }
                this._initialMessageFlickered = true;
            } else {
                this._showCursor();
                await this._typeLine(lineText, messageObject.type);
            }
            if (i < messageObject.content.length - 1) {
                await new Promise(resolve => setTimeout(resolve, this._configModule.TERMINAL_NEW_LINE_DELAY_MIN_MS / 2));
            }
        }

        this._hideCursor();
        this._isTyping = false;
        this._processQueue();
    }

    _addNewLineAndPrepareForTyping() {
        this._currentLineElement = document.createElement('div');
        this._currentLineElement.className = 'terminal-line';
        this._terminalContentElement.appendChild(this._currentLineElement);
        this._scrollTerminal();
        this._limitMaxLines();
    }

    _typeLine(text, messageType = 'status') {
        return new Promise(resolve => {
            let speedPerChar;
            switch (messageType) {
                case 'block': speedPerChar = this._configModule.TERMINAL_TYPING_SPEED_BLOCK_MS_PER_CHAR; break;
                case 'startup': speedPerChar = this._configModule.TERMINAL_TYPING_SPEED_STARTUP_MS_PER_CHAR; break;
                default: speedPerChar = this._configModule.TERMINAL_TYPING_SPEED_STATUS_MS_PER_CHAR; break;
            }
            const duration = (text.length * speedPerChar) / 1000;
            this._currentLineElement.appendChild(this._cursorElement);
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
        this._terminalContainerElement.scrollTop = this._terminalContainerElement.scrollHeight;
    }

    _limitMaxLines() {
        while (this._terminalContentElement.childElementCount > this._configModule.TERMINAL_MAX_LINES_IN_DOM) {
            if (this._terminalContentElement.firstChild) {
                this._terminalContentElement.removeChild(this._terminalContentElement.firstChild);
            } else {
                break;
            }
        }
    }

    _showCursor() {
        if (this._cursorElement && this._currentLineElement) {
            this._currentLineElement.appendChild(this._cursorElement);
            this._cursorElement.style.visibility = 'visible';
        }
    }

    _hideCursor() {
        if (this._cursorElement) {
            this._cursorElement.style.visibility = 'hidden';
        }
    }
}

const terminalManagerInstance = new TerminalManager();
export default terminalManagerInstance;