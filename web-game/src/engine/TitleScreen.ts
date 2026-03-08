/**
 * 标题画面组件
 *
 * 负责显示游戏标题画面和主菜单
 */
import { MainMenu, MainMenuAction } from './MainMenu';
import { SaveSelectUI, SaveSelectAction } from './SaveSelectUI';
import { SettingsUI, SettingsAction } from './SettingsUI';
import { confirmDialog } from './ConfirmDialog';
import { audioManager } from './AudioManager';

/**
 * 标题画面状态
 */
enum TitleScreenState {
  /** 按任意键继续 */
  PRESS_ANY_KEY = 'press_any_key',
  /** 主菜单 */
  MAIN_MENU = 'main_menu',
  /** 存档选择 */
  SAVE_SELECT = 'save_select',
  /** 设置 */
  SETTINGS = 'settings',
  /** 确认对话框 */
  CONFIRM_DIALOG = 'confirm_dialog',
}

/**
 * 标题画面类
 */
export class TitleScreen {
  /** 主菜单 */
  private mainMenu: MainMenu = new MainMenu();

  /** 存档选择 UI */
  private saveSelectUI: SaveSelectUI = new SaveSelectUI();

  /** 设置 UI */
  private settingsUI: SettingsUI = new SettingsUI();

  /** 当前状态 */
  private state: TitleScreenState = TitleScreenState.PRESS_ANY_KEY;

  /** 是否已按键 */
  private hasPressedKey: boolean = false;

  /** 是否可见 */
  private visible: boolean = false;

  /** 游戏开始回调 */
  onGameStart?: () => void;

  /** 退出游戏回调 */
  onQuit?: () => void;

  /**
   * 初始化
   */
  initialize(): Promise<void> {
    return new Promise((resolve) => {
      this.visible = true;
      this.state = TitleScreenState.PRESS_ANY_KEY;
      this.hasPressedKey = false;

      this.mainMenu.initialize();
      this.saveSelectUI.initialize();
      this.settingsUI.initialize();

      // 设置主菜单回调
      this.mainMenu.onAction = (action) => this.handleMainMenuAction(action);

      // 设置存档选择回调
      this.saveSelectUI.setCallback((action, slot) => this.handleSaveSelectAction(action, slot));

      // 设置设置回调
      this.settingsUI.setCallback((action) => this.handleSettingsAction(action));

      // 播放标题音乐
      audioManager.playBGM('title', true, true).catch(() => {});

      console.log('[TitleScreen] Initialized');
      resolve();
    });
  }

  /**
   * 显示
   */
  show(): void {
    this.visible = true;
    this.state = TitleScreenState.PRESS_ANY_KEY;
    this.hasPressedKey = false;
    audioManager.playBGM('title', true, true).catch(() => {});
  }

  /**
   * 隐藏
   */
  hide(): void {
    this.visible = false;
  }

  /**
   * 是否可见
   */
  isVisible(): boolean {
    return this.visible;
  }

  /**
   * 处理主菜单操作
   */
  private handleMainMenuAction(action: MainMenuAction): void {
    switch (action) {
      case MainMenuAction.NEW_GAME:
        // 开始新游戏
        this.startNewGame();
        break;

      case MainMenuAction.CONTINUE:
        // 继续游戏
        this.continueGame();
        break;

      case MainMenuAction.SETTINGS:
        // 打开设置
        this.state = TitleScreenState.SETTINGS;
        this.mainMenu.hide();
        this.settingsUI.show();
        break;

      case MainMenuAction.QUIT:
        // 退出游戏
        this.quitGame();
        break;
    }
  }

  /**
   * 开始新游戏
   */
  private startNewGame(): void {
    console.log('[TitleScreen] Starting new game');
    audioManager.stopBGM(true);
    if (this.onGameStart) {
      this.onGameStart();
    }
  }

  /**
   * 继续游戏
   */
  private continueGame(): void {
    console.log('[TitleScreen] Continuing game');
    audioManager.stopBGM(true);
    if (this.onGameStart) {
      this.onGameStart();
    }
  }

  /**
   * 退出游戏
   */
  private quitGame(): void {
    console.log('[TitleScreen] Quitting game');
    if (this.onQuit) {
      this.onQuit();
    }
  }

  /**
   * 处理存档选择操作
   */
  private handleSaveSelectAction(action: SaveSelectAction, _slot: number | null): void {
    if (action === SaveSelectAction.BACK) {
      // 返回主菜单
      this.state = TitleScreenState.MAIN_MENU;
      this.saveSelectUI.hide();
      this.mainMenu.show();
    }
  }

  /**
   * 处理设置操作
   */
  private handleSettingsAction(action: SettingsAction): void {
    if (action === SettingsAction.BACK) {
      // 返回主菜单
      this.state = TitleScreenState.MAIN_MENU;
      this.settingsUI.hide();
      this.mainMenu.show();
    }
  }

  /**
   * 处理输入
   */
  handleInput(action: 'up' | 'down' | 'left' | 'right' | 'confirm' | 'cancel' | 'any'): void {
    // 优先处理确认对话框
    if (confirmDialog.isVisible()) {
      confirmDialog.handleInput(action);
      return;
    }

    switch (this.state) {
      case TitleScreenState.PRESS_ANY_KEY:
        if (action === 'any' && !this.hasPressedKey) {
          this.hasPressedKey = true;
        }
        break;

      case TitleScreenState.MAIN_MENU:
        this.mainMenu.handleInput(action);
        break;

      case TitleScreenState.SAVE_SELECT:
        this.saveSelectUI.handleInput(action);
        break;

      case TitleScreenState.SETTINGS:
        this.settingsUI.handleInput(action);
        break;
    }
  }

  /**
   * 更新
   */
  update(deltaTime: number): void {
    // 更新音频管理器（处理淡入淡出）
    audioManager.update(deltaTime);

    this.mainMenu.update(deltaTime);
    this.saveSelectUI.update(deltaTime);
    this.settingsUI.update(deltaTime);

    if (this.state === TitleScreenState.PRESS_ANY_KEY && this.hasPressedKey) {
      this.state = TitleScreenState.MAIN_MENU;
      this.mainMenu.show();
    }
  }

  /**
   * 渲染
   */
  render(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    if (!this.visible) return;

    if (this.state === TitleScreenState.PRESS_ANY_KEY) {
      this.renderPressAnyKey(ctx, width, height);
      return;
    }

    // 渲染主菜单背景（始终显示）
    this.renderBackground(ctx, width, height);

    switch (this.state) {
      case TitleScreenState.MAIN_MENU:
        this.mainMenu.render(ctx, width, height);
        break;

      case TitleScreenState.SAVE_SELECT:
        this.saveSelectUI.render(ctx, width, height);
        break;

      case TitleScreenState.SETTINGS:
        this.settingsUI.render(ctx, width, height);
        break;
    }

    // 渲染确认对话框（如果有）
    if (confirmDialog.isVisible()) {
      confirmDialog.render(ctx, width, height);
    }
  }

  /**
   * 渲染按任意键提示
   */
  private renderPressAnyKey(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    // 背景
    this.renderBackground(ctx, width, height);

    // 标题
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 32px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('OpenClaw MMO', width / 2, height / 2 - 50);

    // 按任意键提示
    const alpha = 0.5 + 0.5 * Math.sin(Date.now() / 500);
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.font = '18px Arial';
    ctx.fillText('按任意键开始', width / 2, height / 2 + 20);
  }

  /**
   * 渲染背景
   */
  private renderBackground(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#1e3a8a');
    gradient.addColorStop(0.5, '#1e40af');
    gradient.addColorStop(1, '#172554');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // 标题
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 32px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('OpenClaw MMO', width / 2, height * 0.15);
  }
}

/**
 * 导出标题画面单例
 */
export const titleScreen = new TitleScreen();
