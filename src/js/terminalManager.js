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
        this._terminalContentElement = terminalContentElement; 
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

        const delay = Math.random() * (this._configModule.TERMINAL_NEW_LINE_DELAY_MAX_MS - this._configModule.TERMINAL_NEW_LINE_DELAY_MIN_MS) + this._configModule.TERMINAL_NEW_LINE_DELAY_MIN_MS;
        await new Promise(resolve => setTimeout(resolve, delay));

        for (let i = 0; i < messageObject.content.length; i++) {
            const lineText = messageObject.content[i];
            this._addNewLineAndPrepareForTyping(); 

            if (messageObject.source === 'P1_EMERGENCY_SUBSYSTEMS' && !this._initialMessageFlickered && this._currentLineElement) {
                this._currentLineElement.classList.add('terminal-line--initial-boot');
                // The color is now handled by CSS:
                // body.theme-dim .actual-lcd-screen-element.lcd--unlit #terminal-lcd-content .terminal-line
                // this._gsap.set(this._currentLineElement, { color: "oklch(0.75 0.05 130 / 1)" }); // REMOVED explicit JS color set
                
                this._currentLineElement.appendChild(this._cursorElement);
                this._showCursor();
                const flickerProfileToUse = messageObject.flickerProfile || 'textFlickerToDimlyLit';
                const flickerResult = this.playInitialTextFlicker(this._currentLineElement, lineText, flickerProfileToUse);

                if (flickerResult && flickerResult.completionPromise) {
                    await flickerResult.completionPromise;
                } else if (flickerResult && flickerResult.timeline) {
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
        if (this._terminalContainerElement) {
            this._terminalContainerElement.scrollTop = this._terminalContainerElement.scrollHeight;
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

    playInitialTextFlicker(textLineElement, textToSet, flickerProfileName = 'textFlickerToDimlyLit') {
        if (!textLineElement) {
            const tl = this._gsap.timeline();
            return { timeline: tl.to({}, {duration: 0.01}), completionPromise: Promise.resolve() };
        }

        const masterTl = this._gsap.timeline();
        masterTl.call(() => {
            textLineElement.textContent = ''; 
            textLineElement.appendChild(this._cursorElement); 
        });

        const flickerResult = createAdvancedFlicker(
            textLineElement, 
            flickerProfileName,
            {}
        );
        if (flickerResult && flickerResult.timeline) {
            masterTl.add(flickerResult.timeline);
        }

        const textAnimation = {
            duration: (textToSet.length * this._configModule.TERMINAL_TYPING_SPEED_STARTUP_MS_PER_CHAR) / 1000 * 0.75,
            text: { value: textToSet, delimiter: "" },
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
            }
        };
        const textStartTime = (flickerResult && flickerResult.timeline && flickerResult.timeline.duration() > 0) ? flickerResult.timeline.duration() * 0.25 : 0;
        masterTl.to(textLineElement, textAnimation, textStartTime);

        masterTl.call(() => {
            this._gsap.set(textLineElement, { autoAlpha: 1 }); 
            if (this._terminalContentElement) { 
                this._gsap.set(this._terminalContentElement, { opacity: 1, visibility: 'visible' });
            }
        });


        const overallCompletionPromise = new Promise(resolve => {
            masterTl.eventCallback('onComplete', resolve);
        });
        if (masterTl.duration() === 0) {
            masterTl.to({}, {duration: 0.001});
        }
        return { timeline: masterTl, completionPromise: overallCompletionPromise };
    }

    playScreenFlickerToState(terminalScreenElement, profileName, onCompleteCallback) {
        if (!terminalScreenElement) {
            const tl = this._gsap.timeline();
            if (onCompleteCallback) tl.eventCallback("onComplete", onCompleteCallback);
            return { timeline: tl.to({}, { duration: 0.01 }), completionPromise: Promise.resolve() };
        }

        return createAdvancedFlicker(
            terminalScreenElement, 
            profileName,
            {
                onTimelineComplete: () => {
                    if (onCompleteCallback) onCompleteCallback();
                }
            }
        );
    }
}

const terminalManager = new TerminalManager();
export default terminalManager;