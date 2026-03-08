/**
 * 存档选择 UI 组件
 */

export enum SaveSelectAction {
  SELECT = 'select',
  DELETE = 'delete',
  BACK = 'back',
}

export type SaveSelectCallback = (action: SaveSelectAction, slot: number | null) => void;

export class SaveSelectUI {
  private visible: boolean = false;
  private callback: SaveSelectCallback = () => {};

  initialize(): void {
    console.log('[SaveSelectUI] Initialized');
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

  setCallback(callback: SaveSelectCallback): void {
    this.callback = callback;
  }

  handleInput(action: 'up' | 'down' | 'left' | 'right' | 'confirm' | 'cancel' | 'any'): void {
    if (action === 'cancel') {
      this.callback(SaveSelectAction.BACK, null);
    }
  }

  update(_deltaTime: number): void {}

  render(_ctx: CanvasRenderingContext2D, _width: number, _height: number): void {}
}

export const saveSelectUI = new SaveSelectUI();
