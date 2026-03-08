/**
 * 标题画面组件
 */
import { MainMenu } from './MainMenu';
import { SaveSelectUI } from './SaveSelectUI';
import { SettingsUI } from './SettingsUI';
import { audioManager } from './AudioManager';

enum TitleScreenState {
  PRESS_ANY_KEY = 'press_any_key',
  MAIN_MENU = 'main_menu',
  SAVE_SELECT = 'save_select',
  SETTINGS = 'settings',
}

export class TitleScreen {
  private mainMenu: MainMenu = new MainMenu();
  private saveSelectUI: SaveSelectUI = new SaveSelectUI();
  private settingsUI: SettingsUI = new SettingsUI();
  private state: TitleScreenState = TitleScreenState.PRESS_ANY_KEY;
  private hasPressedKey: boolean = false;
  private visible: boolean = false;

  initialize(): Promise<void> {
    return new Promise((resolve) => {
      this.visible = true;
      this.state = TitleScreenState.PRESS_ANY_KEY;
      this.hasPressedKey = false;
      this.mainMenu.initialize();
      this.saveSelectUI.initialize();
      this.settingsUI.initialize();
      audioManager.playBGM('title', true, true).catch(() => {});
      console.log('[TitleScreen] Initialized');
      resolve();
    });
  }

  show(): void {
    this.visible = true;
    this.state = TitleScreenState.PRESS_ANY_KEY;
    this.hasPressedKey = false;
    audioManager.playBGM('title', true, true).catch(() => {});
  }

  hide(): void {
    this.visible = false;
  }

  isVisible(): boolean {
    return this.visible;
  }

  handleInput(action: 'up' | 'down' | 'left' | 'right' | 'confirm' | 'cancel' | 'any'): void {
    if (this.state === TitleScreenState.PRESS_ANY_KEY) {
      if (action === 'any' && !this.hasPressedKey) {
        this.hasPressedKey = true;
      }
      return;
    }

    if (this.state === TitleScreenState.MAIN_MENU) {
      this.mainMenu.handleInput(action);
      return;
    }

    if (this.state === TitleScreenState.SAVE_SELECT) {
      this.saveSelectUI.handleInput(action);
      return;
    }

    if (this.state === TitleScreenState.SETTINGS) {
      this.settingsUI.handleInput(action);
      return;
    }
  }

  update(deltaTime: number): void {
    this.mainMenu.update(deltaTime);
    this.saveSelectUI.update(deltaTime);
    this.settingsUI.update(deltaTime);

    if (this.state === TitleScreenState.PRESS_ANY_KEY && this.hasPressedKey) {
      this.state = TitleScreenState.MAIN_MENU;
      this.mainMenu.show();
    }
  }

  render(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    if (!this.visible) return;

    if (this.state === TitleScreenState.PRESS_ANY_KEY) {
      this.renderPressAnyKey(ctx, width, height);
      return;
    }

    if (this.state === TitleScreenState.MAIN_MENU) {
      this.mainMenu.render(ctx, width, height);
      return;
    }

    if (this.state === TitleScreenState.SAVE_SELECT) {
      this.saveSelectUI.render(ctx, width, height);
      return;
    }

    if (this.state === TitleScreenState.SETTINGS) {
      this.settingsUI.render(ctx, width, height);
      return;
    }
  }

  private renderPressAnyKey(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#1e3a8a');
    gradient.addColorStop(0.5, '#1e40af');
    gradient.addColorStop(1, '#172554');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = '#ffffff';
    ctx.font = '24px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('OpenClaw MMO', width / 2, height / 2 - 50);

    ctx.font = '18px Arial';
    ctx.fillText('按任意键开始', width / 2, height / 2 + 20);
  }
}

export const titleScreen = new TitleScreen();
