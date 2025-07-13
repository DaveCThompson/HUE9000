/**
 * @module terminalManager
 * @description Manages the HUE 9000 terminal display, including rich text,
 * command sequences, typing effects, cursor, and scrolling.
 */
import { getMessage } from './terminalMessages.js';
import { serviceLocator } from './serviceLocator.js';
import * as appState from './appState.js';
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
        this._scanContainerElement = null; // Container for scan sequences
        this._gsap = null;

        this._messageQueue = [];
        this._isProcessing = false;
        this._isTakeoverActive = false; // Flag to pause message processing
        this._currentLineElement = null;
        this._cursorElement = null;
        this._isFirstLine = true;
        this._currentProcessPromise = null;

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
        appState.subscribe('scanComplete', (payload) => this.concludeScan(payload));
    }

    reset() {
        this._interruptAndClear();
    }

    async concludeScan({ status }) {
        this._isTakeoverActive = false;

        // On successful completion, we want the scan results to remain.
        // The terminal is cleared only when a *new* scan is initiated.
        // For aborts or errors, we clear the screen and show a message.
        if (status === 'aborted') {
            appState.emit('requestTerminalMessage', {
                type: 'status',
                source: 'scan',
                messageKey: 'SCAN_ABORTED',
                interrupt: true
            });
        } else if (status === 'error') {
            appState.emit('requestTerminalMessage', {
                type: 'status',
                source: 'scan',
                messageKey: 'FSM_ERROR',
                data: { content: 'Evaluation failed due to a system timeout or internal error.' },
                interrupt: true
            });
        } else {
            // For 'completed', just resume the message queue if anything is pending.
            this._processQueue();
        }
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
        this._interruptCurrentTask();
        if (this._terminalContentElement) this._terminalContentElement.innerHTML = '';
        this._isFirstLine = true;
        this._setCursorState('idle');
    }

    _interruptCurrentTask() {
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
        if (this._isTakeoverActive && payload.type !== 'scan' && !payload.interrupt) {
            this._messageQueue.push({ ...payload, ...getMessage(payload) });
            return;
        }

        const isMobile = window.matchMedia(MOBILE_BREAKPOINT).matches;
        if (isMobile && !appState.getIsMobileTerminalOpen()) {
            appState.setHasUnreadTerminalMessages(true);
        }

        if (payload.instant) {
            const messageData = getMessage(payload);
            this._printMessageInstantly({ ...payload, ...messageData });
            return;
        }

        if (payload.type === 'scan') {
            this._initiateScan(payload);
            return;
        }

        const messageData = getMessage(payload);
        const messageObject = { ...payload, ...messageData };

        if (messageObject.type === 'command' && messageObject.command === 'clear') {
            this._interruptAndClear();
            return;
        }

        if (messageObject.interrupt) {
            this._interruptAndClear();
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

    _printMessageInstantly(messageObject) {
        if (!this._terminalContentElement || !messageObject.content) return;

        if (!this._isFirstLine && messageObject.formatting.spacingBefore > 0) {
            for (let i = 0; i < messageObject.formatting.spacingBefore; i++) {
                this._addNewLineAndPrepareForTyping(true);
            }
        }

        messageObject.content.forEach(lineSegments => {
            this._addNewLineAndPrepareForTyping(false, messageObject.className);
            if (this._currentLineElement) {
                lineSegments.forEach(segment => {
                    const span = document.createElement('span');
                    if (segment.styles) {
                        span.classList.add(...segment.styles.map(s => `tm-text--${s}`));
                    }
                    span.textContent = segment.text || '';
                    this._currentLineElement.appendChild(span);
                });
            }
        });

        this._isFirstLine = false;
        this._setCursorState('idle');
        this._scrollTerminal(true);
    }

    async _initiateScan(payload) {
        if (this._isTakeoverActive) return;

        this._isTakeoverActive = true;
        this._interruptCurrentTask();
        this._setCursorState('thinking');

        const scanConfig = getMessage(payload);
        if (!scanConfig || !scanConfig.subJobs) {
            console.error("Invalid or missing scan configuration for payload:", payload);
            await this.concludeScan({ status: 'error' });
            return;
        }
        
        if (this._terminalContentElement) {
            this._terminalContentElement.innerHTML = '';
        }

        this._scanContainerElement = document.createElement('div');
        this._scanContainerElement.className = 'scan-animation-container';
        
        if (this._terminalContentElement) {
            this._terminalContentElement.appendChild(this._scanContainerElement);
        }
        
        const scanOrchestrator = serviceLocator.get('scanOrchestrator');
        scanOrchestrator.startScan(scanConfig, this._scanContainerElement);
    }

    async _processQueue() {
        if (this._isProcessing || this._isTakeoverActive) {
            return;
        }
        this._isProcessing = true;

        while (this._messageQueue.length > 0) {
            if (this._isTakeoverActive) break; 
            
            const messageObject = this._messageQueue.shift();

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
        if (this._messageQueue.length === 0 && !this._isTakeoverActive) {
            this._setCursorState('idle');
        }
    }

    _breakTextIntoVisualLines(text) {
        if (!text) return [''];
        return text.split('\n');
    }

    async _typeMessage(messageObject, promise) {
        if (promise.abort) return;
        if (!messageObject.content) {
            return;
        }

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