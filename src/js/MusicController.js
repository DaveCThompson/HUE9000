export class MusicController {
    constructor(audioManager, appState, config) {
        this.audioManager = audioManager;
        this.appState = appState;
        this.config = config;
        this.lastResistiveStage = 0;

        this.appState.subscribe('themeChanged', this.handleThemeChange.bind(this));
        this.appState.subscribe('resistiveShutdownStageChanged', this.handleResistiveShutdownStageChange.bind(this));
        
        // Initial music set based on the starting theme
        this.handleThemeChange(this.appState.getCurrentTheme());
    }

    handleThemeChange(newTheme) {
        // Don't change music if we are in resistive shutdown mode
        if (this.appState.getResistiveShutdownStage() > 0) {
            return;
        }

        // console.log(`[MusicController] Theme changed to ${newTheme}. Setting music.`);
        switch(newTheme) {
            case 'light':
                this.audioManager.playMusic('bgLight');
                break;
            case 'dark':
            case 'dim':
            default:
                this.audioManager.playMusic('bgDim');
                break;
        }
    }

    handleResistiveShutdownStageChange({ newStage }) {
        if (newStage > 0 && this.lastResistiveStage === 0) {
            // Transitioning INTO resistive mode
            // console.log('[MusicController] Resistive shutdown started. Setting music.');
            this.audioManager.playMusic('bgResistive');
        } else if (newStage === 0 && this.lastResistiveStage > 0) {
            // Transitioning OUT OF resistive mode (reset)
            // console.log('[MusicController] Resistive shutdown ended. Reverting to theme music.');
            const currentTheme = this.appState.getCurrentTheme();
            this.handleThemeChange(currentTheme);
        }
        this.lastResistiveStage = newStage;
    }
}