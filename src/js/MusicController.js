import { appState } from './state/index.js';

export class MusicController {
    constructor(audioManager) {
        this.audioManager = audioManager;
        this.lastResistiveStage = 0;

        appState.subscribe('themeChanged', this.handleThemeChange.bind(this));
        appState.subscribe('resistiveShutdownStageChanged', this.handleResistiveShutdownStageChange.bind(this));
        
        this.handleThemeChange(appState.getCurrentTheme());
    }

    handleThemeChange(newTheme) {
        if (appState.getResistiveShutdownStage() > 0) {
            return;
        }
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
            this.audioManager.playMusic('bgResistive');
        } else if (newStage === 0 && this.lastResistiveStage > 0) {
            const currentTheme = appState.getCurrentTheme();
            this.handleThemeChange(currentTheme);
        }
        this.lastResistiveStage = newStage;
    }
}