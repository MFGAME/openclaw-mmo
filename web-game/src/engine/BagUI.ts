/**
 * 背包 UI 组件
 */

export enum BagAction {
  USE = 'use',
  DISCARD = 'discard',
  BACK = 'back',
}

export type BagCallback = (action: BagAction) => void;

export class BagUI {
  private visible: boolean = false;
  private callback: BagCallback = () => {};

  initialize(): void {
    console.log('[BagUI] Initialized');
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

  setCallback(callback: BagCallback): void {
    this.callback = callback;
  }

  handleInput(action: 'up' | 'down' | 'left' | 'right' | 'confirm' | 'cancel' | 'any'): void {
    if (action === 'cancel') {
      this.callback(BagAction.BACK);
    }
  }

  update(_deltaTime: number): void {}

  render(_ctx: CanvasRenderingContext2D, _width: number, _height: number): void {}
}

export const bagUI = new BagUI();
