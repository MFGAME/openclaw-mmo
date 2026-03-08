/**
 * 设置 UI 组件
 */

export enum SettingsAction {
  BACK = 'back',
}

export type SettingsCallback = (action: SettingsAction) => void;

export class SettingsUI {
  private visible: boolean = false;
  private callback: SettingsCallback = () => {};

  initialize(): void {
    console.log('[SettingsUI] Initialized');
  }

  show(): void {
    this.visible = true;
  }

  hide(): void {
    this.visible = false;
  }

  isVisible(): boolean {
    return this.visible;
  }

  setCallback(callback: SettingsCallback): void {
    this.callback = callback;
  }

  handleInput(action: 'up' | 'down' | 'left' | 'right' | 'confirm' | 'cancel' | 'any'): void {
    if (action === 'cancel') {
      this.callback(SettingsAction.BACK);
    }
  }

  update(_deltaTime: number): void {}

  render(_ctx: CanvasRenderingContext2D, _width: number, _height: number): void {}
}

export const settingsUI = new SettingsUI();
