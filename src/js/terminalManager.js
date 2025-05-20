/**
 * @module terminalManager
 * @description Manages the HUE 9000 terminal display, including typing effects,
 * message queuing, cursor, scrolling, and startup flicker effects.
 */
import { getMessage } from './terminalMessages.js';
import { createAdvancedFlicker } from './animationUtils.js'; 

class TerminalManager {
    constructor() {
        this._terminalContainerElement = null;
        this._terminalContentElement = null;
        this._appState = null;
        this._configModule = null; // Will store the configModule namespace object
        this._gsap = null; // Store passed GSAP instance

        this._messageQueue = [];
        this._isTyping = false;
        this._currentLineElement = null; 
        this._cursorElement = null;

        this._domInitialized = false;
        this._initialMessageFlickered = false; 
    }

    init(terminalContainerElement, terminalContentElement, appStateService, configModuleParam, gsapService) { 
        // console.log("[TerminalManager INIT] Initializing...");
        if (!terminalContainerElement || !terminalContentElement) {
            console.error("[TerminalManager INIT] CRITICAL: Terminal DOM elements not provided.");
            return;
        }
        if (!appStateService || !configModuleParam || !gsapService) { 
            console.error("[TerminalManager INIT] CRITICAL: Missing appState, configModule, or gsap service.");
            return;
        }

        this._terminalContainerElement = terminalContainerElement;
        this._terminalContentElement = terminalContentElement; // This is the actual screen element
        this._appState = appStateService;
        this._configModule = configModuleParam; 
        this._gsap = gsapService; 

        this._setupDOM();
        this._appState.subscribe('requestTerminalMessage', this._handleRequestTerminalMessage.bind(this));
        
        // console.log("[TerminalManager INIT] Initialization complete. Ready to receive messages.");
    }

    _setupDOM() {
        if (this._domInitialized) return;
        // console.log("[TerminalManager _setupDOM] Setting up DOM elements for terminal.");

        this._cursorElement = document.createElement('span');
        this._cursorElement.className = 'terminal-cursor';
        this._cursorElement.textContent = '▋'; 
        this._cursorElement.style.visibility = 'hidden'; 

        this._terminalContentElement.innerHTML = ''; 
        this._domInitialized = true;
        // console.log("[TerminalManager _setupDOM] DOM setup complete.");
    }

    _handleRequestTerminalMessage(payload) {
        if (!payload) {
            // console.warn("[TerminalManager _handleRequestTerminalMessage] Received null payload.");
            return;
        }
        
        let currentAppStateSnapshot = {};
        if (payload.messageKey === 'BTN4_MESSAGE') {
            currentAppStateSnapshot = {
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

        const messageContent = getMessage(payload, currentAppStateSnapshot, this._configModule); 
        const messageObject = {
            ...payload,
            content: Array.isArray(messageContent) ? messageContent : [messageContent],
            linesTyped: 0
        };
        
        this._messageQueue.push(messageObject);
        if (!this._isTyping) {
            this._processQueue();
        }
    }

    async _processQueue() {
        if (this._messageQueue.length === 0) {
            this._isTyping = false; 
            return;
        }
        if (this._isTyping && this._messageQueue.length > 0) {
            return;
        }

        this._isTyping = true;
        const messageObject = this._messageQueue.shift();
        // console.log(`[TerminalManager _processQueue] Dequeued message. Source: '${messageObject.source}'. Lines: ${messageObject.content.length}. Remaining in queue: ${this._messageQueue.length}`);

        const delay = Math.random() * (this._configModule.TERMINAL_NEW_LINE_DELAY_MAX_MS - this._configModule.TERMINAL_NEW_LINE_DELAY_MIN_MS) + this._configModule.TERMINAL_NEW_LINE_DELAY_MIN_MS;
        await new Promise(resolve => setTimeout(resolve, delay));

        for (let i = 0; i < messageObject.content.length; i++) {
            const lineText = messageObject.content[i];
            this._addNewLineAndPrepareForTyping(); 
            
            if (messageObject.source === 'P0_INITIALIZING' && !this._initialMessageFlickered && this._currentLineElement) {
                // console.log("[TerminalManager _processQueue] Preparing for P0 initial text flicker (Advanced).");
                this._currentLineElement.appendChild(this._cursorElement);
                this._showCursor();
                await this.playInitialTextFlicker(this._currentLineElement, lineText).then(); 
                this._initialMessageFlickered = true;
                // console.log("[TerminalManager _processQueue] P0 initial text flicker (Advanced) complete.");
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
        this._terminalContentElement.appendChild(this._currentLineElement); // Add to the screen element
        
        this._scrollTerminal();
        this._limitMaxLines();
    }

    _typeLine(text, messageType = 'status') {
        return new Promise(resolve => {
            if (!this._currentLineElement) { 
                console.error("[TerminalManager _typeLine] _currentLineElement is null. Cannot type.");
                resolve(); return;
            }
            
            let speedPerChar;
            switch (messageType) {
                case 'block': speedPerChar = this._configModule.TERMINAL_TYPING_SPEED_BLOCK_MS_PER_CHAR; break;
                case 'startup': speedPerChar = this._configModule.TERMINAL_TYPING_SPEED_STARTUP_MS_PER_CHAR; break;
                case 'status': default: speedPerChar = this._configModule.TERMINAL_TYPING_SPEED_STATUS_MS_PER_CHAR; break;
            }
            const duration = (text.length * speedPerChar) / 1000;

            this._currentLineElement.appendChild(this._cursorElement); 

            this._gsap.to(this._currentLineElement, { 
                duration: Math.max(0.1, duration), 
                text: { 
                    value: text,
                    delimiter: "" 
                },
                ease: "none",
                onUpdate: () => {
                    if (this._currentLineElement && this._cursorElement && this._cursorElement.parentElement !== this._currentLineElement) {
                        this._currentLineElement.appendChild(this._cursorElement);
                    }
                },
                onComplete: () => {
                    if (this._currentLineElement && this._cursorElement && this._cursorElement.parentElement !== this._currentLineElement) {
                        this._currentLineElement.appendChild(this._cursorElement);
                    }
                    resolve();
                }
            });
        });
    }
    
    _scrollTerminal() {
        // Scroll the parent container if terminalContentElement is the screen itself
        const scrollTarget = this._terminalContentElement.parentElement.classList.contains('terminal-block') 
            ? this._terminalContentElement // If terminalContentElement IS the scrollable container
            : this._terminalContentElement.parentElement; // If terminalContentElement is inside a scrollable container

        if (scrollTarget) {
            scrollTarget.scrollTop = scrollTarget.scrollHeight;
        }
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
            if(this._cursorElement.parentElement !== this._currentLineElement) {
                this._currentLineElement.appendChild(this._cursorElement);
            }
            this._cursorElement.style.visibility = 'visible';
        }
    }

    _hideCursor() {
        if (this._cursorElement) {
            this._cursorElement.style.visibility = 'hidden';
        }
    }
    
    playInitialTextFlicker(textLineElement, textToSet) { 
        // console.log(`[TerminalManager playInitialTextFlicker (Advanced)] Called for line: "${textToSet}"`, textLineElement);
        if (!textLineElement) {
            // console.warn("[TerminalManager playInitialTextFlicker (Advanced)] textLineElement is null.");
            const tl = this._gsap.timeline(); return tl.to({}, {duration: 0.01}); 
        }
        
        // Ensure the line is clear before flicker and text animation
        const masterTl = this._gsap.timeline();
        masterTl.call(() => {
            textLineElement.textContent = ''; 
            textLineElement.appendChild(this._cursorElement);
        });

        const flickerSubTl = createAdvancedFlicker(
            textLineElement, 
            'terminalP0Flicker', 
            {} 
        );
        masterTl.add(flickerSubTl);
        
        const textAnimation = {
            duration: (textToSet.length * this._configModule.TERMINAL_TYPING_SPEED_STARTUP_MS_PER_CHAR) / 1000 * 0.75, 
            text: { 
                value: textToSet,
                delimiter: "" 
            },
            ease: "none",
            onUpdate: () => {
                if (textLineElement && this._cursorElement && this._cursorElement.parentElement !== textLineElement) {
                    textLineElement.appendChild(this._cursorElement);
                }
            },
            onComplete: () => {
                if (textLineElement && this._cursorElement && this._cursorElement.parentElement !== textLineElement) {
                    textLineElement.appendChild(this._cursorElement);
                }
                // console.log(`[TerminalManager playInitialTextFlicker (Advanced)] TextPlugin part complete for: "${textToSet}"`);
            }
        };
        // Add text animation to the flicker timeline, potentially overlapping slightly
        masterTl.to(textLineElement, textAnimation, masterTl.duration() * 0.25); 
        
        return masterTl;
    }

    playScreenFlickerToDimlyLit(terminalScreenElement, onCompleteCallback) {
        console.trace("[TerminalManager playScreenFlickerToDimlyLit] TRACE"); 
        // console.log(`[TerminalManager playScreenFlickerToDimlyLit] Called for terminal screen.`, terminalScreenElement);
        if (!terminalScreenElement) {
            // console.warn("[TerminalManager playScreenFlickerToDimlyLit] terminalScreenElement is null.");
            const tl = this._gsap.timeline(); 
            if (onCompleteCallback) tl.eventCallback("onComplete", onCompleteCallback);
            return tl.to({}, { duration: 0.01 });
        }

        // Ensure the flicker animation itself handles initial setup like opacity
        const masterTl = this._gsap.timeline();
        // No immediate class changes here; let createAdvancedFlicker and its onComplete handle it.
        
        const flickerSubTl = createAdvancedFlicker(
            terminalScreenElement,
            'lcdP4Flicker', 
            {
                onComplete: () => {
                    // console.log(`[TerminalManager playScreenFlickerToDimlyLit] Flicker complete for terminal screen.`);
                    if (onCompleteCallback) onCompleteCallback();
                }
            }
        );
        masterTl.add(flickerSubTl);
        return masterTl;
    }
}

const terminalManager = new TerminalManager();
export default terminalManager;