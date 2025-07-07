import { serviceLocator } from './serviceLocator.js';

export class DOMManager {
    constructor() {
        this.root = document.documentElement;
        this.body = document.body;
        this.appWrapper = document.querySelector('.app-wrapper');
        
        this.preloaderRoot = document.getElementById('datastream-preloader');
        this.streamFonts = document.getElementById('stream-fonts');
        this.streamGraphics = document.getElementById('stream-graphics');
        this.streamAudio = document.getElementById('stream-audio');
        this.overallProgressPercentage = document.getElementById('overall-progress-percentage');
        this.overallProgressBar = document.getElementById('overall-progress-bar');
        this.engageButtonContainer = document.getElementById('engage-button-container');
        this.preloaderEngageBtn = document.getElementById('preloader-engage-btn');
        this.criticalErrorMessageElement = document.getElementById('critical-error-message');

        this.controlDeck = document.getElementById('control-deck');
        this.deckToggle = document.getElementById('deck-toggle');
        this.allButtons = Array.from(document.querySelectorAll('.button-unit'));
        this.dialA = document.getElementById('dial-canvas-container-A');
        this.dialB = document.getElementById('dial-canvas-container-B');
        this.lcdA = document.getElementById('hue-lcd-A');
        this.lcdB = document.getElementById('hue-lcd-B');
        this.terminalContainer = document.querySelector('.terminal-block .actual-lcd-screen-element');
        this.terminalLcdContentElement = document.getElementById('terminal-lcd-content');
        this.colorLensGradient = document.getElementById('color-lens-gradient');
        this.lensSuperGlow = document.getElementById('lens-super-glow');
        this.logoContainer = document.getElementById('logo-container');
        this.hueAssignmentColumns = Array.from(document.querySelectorAll('.hue-assignment-column[data-assignment-target]'));

        // Mobile-specific elements
        this.mobileControlsOverlay = document.getElementById('mobile-controls-overlay');
        this.mobileTerminalDrawer = document.getElementById('mobile-terminal-drawer');
        this.mobileTerminalToggle = document.getElementById('mobile-terminal-toggle');
        this.mobileTerminalCloseBtn = document.getElementById('mobile-terminal-close-btn');
    }

    init() {
        // Register this instance with the service locator for global access.
        serviceLocator.register('domElements', this);
    }
}