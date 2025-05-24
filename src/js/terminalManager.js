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
        this._configModule = null; 
        this._gsap = null; 

        this._messageQueue = [];
        this._isTyping = false;
        this._currentLineElement = null;
        this._cursorElement = null;

        this._domInitialized = false;
        this._initialMessageFlickered = false;
        this.debugFlicker = true; 
    }

    init(terminalContainerElement, terminalContentElement, appStateService, configModuleParam, gsapService) {
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

        if (!this._gsap || typeof this._gsap.to !== 'function') {
            console.error("[TerminalManager INIT] CRITICAL: GSAP service is invalid or not provided correctly.");
            return;
        }

        this._setupDOM();
        if (this._appState && typeof this._appState.subscribe === 'function') {
            this._appState.subscribe('requestTerminalMessage', this._handleRequestTerminalMessage.bind(this));
        } else {
            console.error("[TerminalManager INIT] appState service or its subscribe method is not available.");
        }
    }

    _setupDOM() {
        if (this._domInitialized) return;

        this._cursorElement = document.createElement('span');
        this._cursorElement.className = 'terminal-cursor';
        this._cursorElement.textContent = '▋'; 
        this._cursorElement.style.visibility = 'hidden'; 

        this._terminalContentElement.innerHTML = ''; 
        this._domInitialized = true;
    }

    _handleRequestTerminalMessage(payload) {
        if (!this._configModule) {
            return;
        }
        if (!payload) {
            return;
        }

        let currentAppStateSnapshot = {};
        if (payload.messageKey === 'BTN4_MESSAGE' && this._appState) { 
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
        if (!this._configModule) { 
            this._isTyping = false;
            return;
        }
        if (this._messageQueue.length === 0) {
            this._isTyping = false;
            return;
        }
        if (this._isTyping && this._messageQueue.length > 0) {
            return;
        }

        this._isTyping = true;
        const messageObject = this._messageQueue.shift();

        // Ensure terminal content area (#terminal-lcd-content) is visible
        // This is crucial because uiUpdater might set it to opacity 0 if the parent screen is 'lcd--unlit'.
        if (this._gsap.getProperty(this._terminalContentElement, "opacity") < 1) {
            if (this.debugFlicker) console.log(`[TerminalManager _processQueue] Forcing #terminal-lcd-content opacity to 1 before typing message: ${messageObject.source}`);
            this._gsap.set(this._terminalContentElement, { opacity: 1, visibility: 'visible' });
        }
        
        // For P1, also ensure the parent screen container (.actual-lcd-screen-element) is visible.
        // This helps if the screen itself was set to autoAlpha 0 by uiUpdater for 'lcd--unlit'.
        // The flicker profile for the P1 line will handle the line's own autoAlpha.
        if (messageObject.source === 'P1_EMERGENCY_SUBSYSTEMS' && this._terminalContainerElement) {
            if (this._gsap.getProperty(this._terminalContainerElement, "autoAlpha") < 0.8) { // Check against a reasonable visibility threshold
                 if (this.debugFlicker) console.log(`[TerminalManager _processQueue] Forcing .actual-lcd-screen-element (terminal container) autoAlpha to 1 for P1 message.`);
                 this._gsap.set(this._terminalContainerElement, {autoAlpha: 1}); 
            }
        }


        const delay = Math.random() * (this._configModule.TERMINAL_NEW_LINE_DELAY_MAX_MS - this._configModule.TERMINAL_NEW_LINE_DELAY_MIN_MS) + this._configModule.TERMINAL_NEW_LINE_DELAY_MIN_MS;
        await new Promise(resolve => setTimeout(resolve, delay));

        for (let i = 0; i < messageObject.content.length; i++) {
            const lineText = messageObject.content[i];
            this._addNewLineAndPrepareForTyping(); 

            if (messageObject.source === 'P1_EMERGENCY_SUBSYSTEMS' && !this._initialMessageFlickered && this._currentLineElement) {
                if (this.debugFlicker) console.log(`[TerminalManager P1 Flicker] Preparing for initial message: "${lineText}"`);
                this._currentLineElement.classList.add('terminal-line--initial-boot');
                
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
            if (!this._gsap || !this._configModule) { 
                console.error("[TerminalManager _typeLine] GSAP or ConfigModule not available.");
                resolve(); return;
            }
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
        if (!this._configModule) return; 
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
        if (!this._gsap || !this._configModule) { 
             const tl = gsap.timeline(); 
            return { timeline: tl.to({}, {duration: 0.01}), completionPromise: Promise.resolve() };
        }
        if (!textLineElement) {
            const tl = this._gsap.timeline();
            return { timeline: tl.to({}, {duration: 0.01}), completionPromise: Promise.resolve() };
        }

        if (this.debugFlicker) console.log(`[TerminalManager playInitialTextFlicker] Target: ${textLineElement.tagName}, Text: "${textToSet}", Profile: ${flickerProfileName}`);

        const masterTl = this._gsap.timeline({
            onStart: () => {
                if (this.debugFlicker) console.log(`[TerminalManager P1 Flicker MasterTL] START for "${textToSet}". Initial textLineElement autoAlpha: ${this._gsap.getProperty(textLineElement, "autoAlpha")}`);
            },
            onComplete: () => {
                 if (this.debugFlicker) console.log(`[TerminalManager P1 Flicker MasterTL] COMPLETE for "${textToSet}". Final textLineElement autoAlpha: ${this._gsap.getProperty(textLineElement, "autoAlpha")}`);
            }
        });

        masterTl.call(() => {
            textLineElement.textContent = ''; 
            textLineElement.appendChild(this._cursorElement); 
            if (this.debugFlicker) console.log(`[TerminalManager P1 Flicker MasterTL] Text content cleared, cursor appended. Pre-flicker autoAlpha: ${this._gsap.getProperty(textLineElement, "autoAlpha")}`);
        });
        
        // Ensure #terminal-lcd-content (parent of lines) is visible when P1 flicker starts
        if (this._terminalContentElement && this._gsap.getProperty(this._terminalContentElement, "opacity") < 1) {
            masterTl.set(this._terminalContentElement, { opacity: 1, visibility: 'visible' }, 0); 
            if (this.debugFlicker) console.log(`[TerminalManager P1 Flicker MasterTL] Set #terminal-lcd-content opacity to 1 at start of P1 message flicker.`);
        }
        // Also ensure the main screen container is visible for P1 flicker
        if (this._terminalContainerElement && this._gsap.getProperty(this._terminalContainerElement, "autoAlpha") < 0.8) {
            masterTl.set(this._terminalContainerElement, { autoAlpha: 1 }, 0);
             if (this.debugFlicker) console.log(`[TerminalManager P1 Flicker MasterTL] Set .actual-lcd-screen-element autoAlpha to 1 at start of P1 message flicker.`);
        }


        const flickerResult = createAdvancedFlicker(
            textLineElement, 
            flickerProfileName,
            { 
                gsapInstance: this._gsap, 
                onStart: () => {
                    if (this.debugFlicker) console.log(`[TerminalManager P1 Flicker createAdvancedFlicker] Flicker timeline START for "${textToSet}". textLineElement autoAlpha: ${this._gsap.getProperty(textLineElement, "autoAlpha")}`);
                },
                onTimelineComplete: () => {
                    if (this.debugFlicker) console.log(`[TerminalManager P1 Flicker createAdvancedFlicker] Flicker timeline COMPLETE for "${textToSet}". textLineElement autoAlpha: ${this._gsap.getProperty(textLineElement, "autoAlpha")}`);
                }
            } 
        );

        if (flickerResult && flickerResult.timeline) {
            masterTl.add(flickerResult.timeline);
        }

        const textAnimation = {
            duration: (textToSet.length * this._configModule.TERMINAL_TYPING_SPEED_STARTUP_MS_PER_CHAR) / 1000 * 0.75, 
            text: { value: textToSet, delimiter: "" },
            ease: "none",
            onStart: () => {
                if (this.debugFlicker) console.log(`[TerminalManager P1 Flicker TextPlugin] Text animation START for "${textToSet}". textLineElement autoAlpha: ${this._gsap.getProperty(textLineElement, "autoAlpha")}`);
            },
            onUpdate: () => {
                if (textLineElement && this._cursorElement && this._cursorElement.parentElement !== textLineElement) {
                    textLineElement.appendChild(this._cursorElement);
                }
            },
            onComplete: () => {
                if (textLineElement && this._cursorElement && this._cursorElement.parentElement !== textLineElement) {
                    textLineElement.appendChild(this._cursorElement);
                }
                if (this.debugFlicker) console.log(`[TerminalManager P1 Flicker TextPlugin] Text animation COMPLETE for "${textToSet}". textLineElement autoAlpha: ${this._gsap.getProperty(textLineElement, "autoAlpha")}`);
            }
        };
        const textStartTime = (flickerResult && flickerResult.timeline && flickerResult.timeline.duration() > 0) ? flickerResult.timeline.duration() * 0.25 : 0.01;
        masterTl.to(textLineElement, textAnimation, textStartTime);

        masterTl.set(textLineElement, { autoAlpha: 1 }, ">"); 
        
        const overallCompletionPromise = new Promise(resolve => {
            masterTl.eventCallback('onComplete', resolve);
        });
        if (masterTl.duration() === 0) { 
            masterTl.to({}, {duration: 0.001});
        }
        return { timeline: masterTl, completionPromise: overallCompletionPromise };
    }

    playScreenFlickerToState(terminalScreenElement, profileName, onCompleteCallback) {
        if (!this._gsap) { 
            const tl = gsap.timeline();
            if (onCompleteCallback) tl.eventCallback("onComplete", onCompleteCallback);
            return { timeline: tl.to({}, { duration: 0.01 }), completionPromise: Promise.resolve() };
        }
        if (!terminalScreenElement) {
            const tl = this._gsap.timeline();
            if (onCompleteCallback) tl.eventCallback("onComplete", onCompleteCallback);
            return { timeline: tl.to({}, { duration: 0.01 }), completionPromise: Promise.resolve() };
        }

        // When flickering the terminal screen (e.g., in P6), we want existing text to remain visible.
        // The flicker profile 'lcdScreenFlickerToDimlyLit' animates autoAlpha of the screenElement.
        // We need to ensure #terminal-lcd-content stays opaque.
        let existingContentOpacity = 1;
        if (this._terminalContentElement) {
            existingContentOpacity = this._gsap.getProperty(this._terminalContentElement, "opacity");
            this._gsap.set(this._terminalContentElement, { opacity: 1, visibility: 'visible' }); // Keep content visible
        }


        return createAdvancedFlicker(
            terminalScreenElement, 
            profileName,
            {
                gsapInstance: this._gsap, 
                onTimelineComplete: () => {
                    // Restore content opacity if it was changed, though it should remain 1
                    if (this._terminalContentElement) {
                         this._gsap.set(this._terminalContentElement, { opacity: 1, visibility: 'visible' });
                    }
                    if (onCompleteCallback) onCompleteCallback();
                }
            }
        );
    }
}

const terminalManagerInstance = new TerminalManager();
export default terminalManagerInstance;