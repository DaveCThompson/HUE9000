/**
 * @module terminalManager
 * @description Manages the HUE 9000 terminal display, including rich text,
 * command sequences, typing effects, cursor, and scrolling.
 */
import { getMessage } from './terminalMessages.js';
import { serviceLocator } from './serviceLocator.js';
import * as appState from './appState.js';
import { ScanSequencePlayer } from './ScanSequencePlayer.js';
import {
    TERMINAL_THINKING_DELAY_MIN_MS,
    TERMINAL_THINKING_DELAY_MAX_MS,
    TERMINAL_TYPING_SPEED_STARTUP_MS_PER_CHAR,
    TERMINAL_TYPING_SPEED_BLOCK_MS_PER_CHAR,
    TERMINAL_TYPING_SPEED_STATUS_MS_PER_CHAR,
    TERMINAL_INTER_LINE_PAUSE_S,
    TERMINAL_SCROLL_DURATION_S,
    TERMINAL_MAX_LINES_IN_DOM,
    MOBILE_BREAKPOINT
} from './config/index.js';

class TerminalManager {
    constructor() {
        this._terminalContainerElement = null;
        this._terminalContentElement = null;
        this._scrollWrapperElement = null;
        this._gsap = null;

        this._messageQueue = [];
        this._isProcessing = false;
        this._currentLineElement = null;
        this._cursorElement = null;
        this._isFirstLine = true;
        this._currentProcessPromise = null;
        this._activeScanPlayer = null;
        this._activeScanObserver = null; // For auto-scrolling

        this._commandHandlers = {
            'pause': this._handlePauseCommand.bind(this),
            'displayText': this._handleDisplayTextCommand.bind(this),
            'spinner': this._handleSpinnerCommand.bind(this),
        };
    }

    init() {
        this._gsap = serviceLocator.get('gsap');
        this._setupDOM();
        appState.subscribe('requestTerminalMessage', (payload) => this._handleRequestTerminalMessage(payload));
    }

    reset() {
        this._interruptAndClear();
    }

    _setupDOM() {
        const dom = serviceLocator.get('domElements');
        const isMobile = window.matchMedia(MOBILE_BREAKPOINT).matches;

        if (isMobile && document.getElementById('mobile-terminal-drawer')) {
            this._terminalContainerElement = document.getElementById('mobile-terminal-drawer');
            this._terminalContentElement = document.getElementById('mobile-terminal-output');
            this._scrollWrapperElement = this._terminalContainerElement?.querySelector('.lcd-scroll-wrapper');
        } else {
            this._terminalContainerElement = dom.terminalContainer;
            this._terminalContentElement = dom.terminalLcdContentElement;
            this._scrollWrapperElement = this._terminalContainerElement?.querySelector('.lcd-scroll-wrapper');
        }

        this._cursorElement = document.createElement('span');
        this._cursorElement.className = 'terminal-cursor';
        const cursorInner = document.createElement('span');
        cursorInner.className = 'cursor-inner';
        this._cursorElement.appendChild(cursorInner);
        this.reset();
    }

    _interruptAndClear() {
        this._interruptCurrentTask(); // Use the task-specific interrupt
        if (this._terminalContentElement) this._terminalContentElement.innerHTML = '';
        this._isFirstLine = true;
        this._setCursorState('idle');
    }

    _interruptCurrentTask() {
        if (this._activeScanPlayer) {
            this._activeScanPlayer.kill();
            this._activeScanPlayer = null;
        }
        if (this._activeScanObserver) {
            this._activeScanObserver.disconnect();
            this._activeScanObserver = null;
        }

        if (this._currentProcessPromise) {
            this._currentProcessPromise.abort = true;
            this._currentProcessPromise = null;
        }

        if (this._gsap) this._gsap.killTweensOf(this);
        this._messageQueue = [];
        this._isProcessing = false;

        if (this._cursorElement && this._cursorElement.parentNode) {
            this._cursorElement.parentNode.removeChild(this._cursorElement);
        }
        this._setCursorState('idle');
    }

    _handleRequestTerminalMessage(payload) {
        const isMobile = window.matchMedia(MOBILE_BREAKPOINT).matches;
        if (isMobile && !appState.getIsMobileTerminalOpen()) {
            appState.setHasUnreadTerminalMessages(true);
        }
        
        const messageData = getMessage(payload);
        const messageObject = { ...payload, ...messageData };

        if (messageObject.type === 'command' && messageObject.command === 'clear') {
            this._interruptAndClear();
            return;
        }

        if (messageObject.interrupt) {
            this._interruptAndClear();
        } else if (messageObject.type === 'scan') {
            this._interruptCurrentTask();
        }

        if (messageObject.coalesce) {
            const existingIndex = this._messageQueue.findIndex(m => m.coalesceId === messageObject.coalesceId);
            if (existingIndex > -1) {
                this._messageQueue[existingIndex] = messageObject;
                return;
            }
        }
        this._messageQueue.push(messageObject);
        if (!this._isProcessing) {
            this._processQueue();
        }
    }

    async _processQueue() {
        if (this._isProcessing) return;
        this._isProcessing = true;

        while (this._messageQueue.length > 0) {
            const messageObject = this._messageQueue.shift();

            if (messageObject.type === 'scan' && messageObject.scanConfig) {
                await this._executeScanSequence(messageObject);
                continue; 
            }

            const processPromise = {};
            this._currentProcessPromise = processPromise;

            this._setCursorState('thinking');
            const delay = this._gsap.utils.random(TERMINAL_THINKING_DELAY_MIN_MS, TERMINAL_THINKING_DELAY_MAX_MS);
            await new Promise(resolve => this._gsap.delayedCall(delay / 1000, resolve));
            if (processPromise.abort) break;

            if (messageObject.beforeTyping && Array.isArray(messageObject.beforeTyping)) {
                for (const command of messageObject.beforeTyping) {
                    if (processPromise.abort) break;
                    const handler = this._commandHandlers[command.command];
                    if (handler) {
                        await handler(command.params, processPromise);
                    } else {
                        console.warn(`[Terminal] Unknown command: ${command.command}`);
                    }
                }
            }
            if (processPromise.abort) break;
            
            this._setCursorState('typing');
            await this._typeMessage(messageObject, processPromise);
        }

        this._isProcessing = false;
        this._currentProcessPromise = null;
        if (this._messageQueue.length === 0) {
            this._setCursorState('idle');
        }
    }

    async _executeScanSequence(messageObject) {
        const scanContainer = this._initiateScanProcess();

        this._activeScanPlayer = new ScanSequencePlayer(scanContainer, messageObject.scanConfig);
        try {
            await this._activeScanPlayer.play();
        } catch (error) {
            if (error.message.indexOf('interrupted') === -1) {
                console.error("Scan sequence failed:", error);
            }
            return; 
        } finally {
            this._activeScanPlayer = null;
            if (this._activeScanObserver) {
                this._activeScanObserver.disconnect();
                this._activeScanObserver = null;
            }
        }
        // The conclusion message is now solely handled by the ScanSequencePlayer.
    }
    
    _initiateScanProcess() {
        if (this._cursorElement) this._cursorElement.style.display = 'none';

        const scanAnimationContainer = document.createElement('div');
        scanAnimationContainer.className = 'scan-animation-container';
        
        this._terminalContentElement.appendChild(scanAnimationContainer);
        
        // Use a ResizeObserver to auto-scroll as the scan animation expands
        this._activeScanObserver = new ResizeObserver(() => {
            this._scrollTerminal(true);
        });
        this._activeScanObserver.observe(scanAnimationContainer);

        this._scrollTerminal(true);
        return scanAnimationContainer;
    }

    _logSystemMessage(message, type = 'success') {
        if (!this._terminalContentElement) return;
        const line = document.createElement('div');
        line.className = `terminal-line line-${type}`;
        const prompt = document.createElement('span');
        prompt.textContent = '> ';
        const text = document.createElement('span');
        text.textContent = message;
        line.append(prompt, text);
        this._terminalContentElement.appendChild(line);
        this._limitMaxLines();
        this._scrollTerminal(true);
    }

    _breakTextIntoVisualLines(text) {
        if (!text) return [''];
        return text.split('\n');
    }

    async _typeMessage(messageObject, promise) {
        if (promise.abort) return;
        if (!messageObject.content) {
            if (this._cursorElement) this._cursorElement.style.display = '';
            return;
        }

        if (this._cursorElement) this._cursorElement.style.display = '';

        if (!this._isFirstLine && messageObject.formatting.spacingBefore > 0) {
            for (let i = 0; i < messageObject.formatting.spacingBefore; i++) {
                this._addNewLineAndPrepareForTyping(true);
            }
        }
        
        const allLogicalLines = messageObject.content;

        for (let i = 0; i < allLogicalLines.length; i++) {
            if (promise.abort) return;
            const lineSegments = allLogicalLines[i];
            this._addNewLineAndPrepareForTyping(false, messageObject.className);
            
            let speedPerChar = TERMINAL_TYPING_SPEED_STATUS_MS_PER_CHAR;
            if (messageObject.type === 'startup') speedPerChar = TERMINAL_TYPING_SPEED_STARTUP_MS_PER_CHAR;
            else if (messageObject.type === 'block') speedPerChar = TERMINAL_TYPING_SPEED_BLOCK_MS_PER_CHAR;
            
            await this._typeLine(lineSegments, speedPerChar, {}, promise);
            if (promise.abort) return;

            if (i < allLogicalLines.length - 1) {
                await this._pauseAndBlink(TERMINAL_INTER_LINE_PAUSE_S, promise);
            }
        }
        this._isFirstLine = false;
    }

    _addNewLineAndPrepareForTyping(isSpacer = false, className = null) {
        if (!this._terminalContentElement) return;
        this._currentLineElement = document.createElement('div');
        this._currentLineElement.className = 'terminal-line';
        if (className) this._currentLineElement.classList.add(className);
        
        if (!isSpacer) {
            this._currentLineElement.appendChild(this._cursorElement);
        }
        
        this._terminalContentElement.appendChild(this._currentLineElement);
        this._limitMaxLines();
        this._isFirstLine = false;
    }
    
    async _typeLine(lineSegments, speedPerChar, options = {}, promise) {
        if (!this._currentLineElement || promise.abort) return;
        
        if (!Array.isArray(lineSegments) || lineSegments.length === 0) {
            this._currentLineElement.innerHTML = ' ';
            return;
        }

        const segmentSpans = lineSegments.map(segment => {
            const span = document.createElement('span');
            if (segment && segment.styles && Array.isArray(segment.styles)) {
                span.classList.add(...segment.styles.map(s => `tm-text--${s}`));
            }
            this._currentLineElement.insertBefore(span, this._cursorElement);
            return span;
        });

        for (let i = 0; i < lineSegments.length; i++) {
            if (promise.abort) return;
            const segmentText = String(lineSegments[i]?.text || '');
            const targetSpan = segmentSpans[i];
            for (const char of segmentText) {
                if (promise.abort) return;
                targetSpan.textContent += char;
                this._scrollTerminal();
                await new Promise(resolve => setTimeout(resolve, speedPerChar));
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
        const container = this._scrollWrapperElement;
        if (!container) return;
        const scrollThreshold = 50;
        const isUserAtBottom = container.scrollHeight - container.clientHeight <= container.scrollTop + scrollThreshold;
        
        if (isUserAtBottom) {
            this._gsap.to(container, {
                scrollTop: container.scrollHeight,
                duration: instant ? 0 : TERMINAL_SCROLL_DURATION_S,
                ease: 'power2.out'
            });
        }
    }

    _limitMaxLines() {
        if (!this._terminalContentElement) return;
        while (this._terminalContentElement.childElementCount > TERMINAL_MAX_LINES_IN_DOM) {
            if (this._terminalContentElement.firstChild) {
                this._terminalContentElement.removeChild(this._terminalContentElement.firstChild);
            }
        }
    }

    _setCursorState(state) {
        if (!this._cursorElement) return;
        this._cursorElement.classList.remove('is-blinking', 'is-solid', 'is-thinking');
        switch (state) {
            case 'idle': this._cursorElement.classList.add('is-blinking'); break;
            case 'typing': this._cursorElement.classList.add('is-solid'); break;
            case 'thinking': this._cursorElement.classList.add('is-thinking'); break;
        }
        if (state === 'idle' && this._terminalContentElement && !this._cursorElement.parentElement) {
             this._addNewLineAndPrepareForTyping();
        }
    }
    
    async _handlePauseCommand({ duration = 500 }, promise) {
        if (promise.abort) return;
        await new Promise(resolve => setTimeout(resolve, duration));
    }
    
    async _handleDisplayTextCommand({ text }, promise) {
        if (promise.abort) return;
        const messageObject = {
            content: [[{ text }]],
            formatting: { spacingBefore: 0 },
            type: 'status'
        };
        await this._typeMessage(messageObject, promise);
    }
    
    async _handleSpinnerCommand({ duration = 1500, text = 'PROCESSING...' }, promise) {
        if (promise.abort || !this._terminalContentElement) return;
        this._setCursorState('thinking');
        const spinnerLine = document.createElement('div');
        spinnerLine.className = 'terminal-line terminal-spinner-line';
        const spinnerCursor = this._cursorElement.cloneNode(true);
        spinnerCursor.classList.remove('is-blinking', 'is-solid');
        spinnerCursor.classList.add('is-thinking');
        const textNode = document.createElement('span');
        textNode.textContent = text;
        spinnerLine.appendChild(spinnerCursor);
        spinnerLine.appendChild(textNode);
        this._terminalContentElement.appendChild(spinnerLine);
        this._scrollTerminal();
        await new Promise(resolve => setTimeout(resolve, duration));
        if (!promise.abort && this._terminalContentElement.contains(spinnerLine)) {
            this._terminalContentElement.removeChild(spinnerLine);
        }
    }
}

const terminalManagerInstance = new TerminalManager();
export default terminalManagerInstance;