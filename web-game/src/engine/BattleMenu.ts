/**
 * 战斗菜单 - 管理战斗中的行动选择菜单
 * 
 * 功能：
 * - 显示主菜单（战斗、技能、道具、逃跑）
 * - 显示技能选择菜单
 * - 显示目标选择菜单
 * - 处理用户输入
 */

import { inputManager, KeyCode } from './InputManager';

/**
 * 菜单动作类型
 */
export enum MenuAction {
  /** 攻击 */
  FIGHT = 'fight',
  /** 技能 */
  TECHNIQUE = 'technique',
  /** 道具 */
  ITEM = 'item',
  /** 交换 */
  SWITCH = 'switch',
  /** 逃跑 */
  ESCAPE = 'escape',
  /** 返回 */
  BACK = 'back',
  /** 选择目标 */
  SELECT_TARGET = 'select_target',
}

/**
 * 菜单项接口
 */
export interface MenuItem {
  /** 项目 ID */
  id: string;
  /** 显示文本 */
  text: string;
  /** 是否可用 */
  enabled: boolean;
  /** 动作类型 */
  action: MenuAction;
  /** 附加数据 */
  data?: unknown;
}

/**
 * 菜单状态
 */
export enum MenuState {
  /** 主菜单 */
  MAIN = 'main',
  /** 技能选择 */
  TECHNIQUE = 'technique',
  /** 道具选择 */
  ITEM = 'item',
  /** 目标选择 */
  TARGET = 'target',
  /** 交换选择 */
  SWITCH = 'switch',
  /** 禁用（等待中） */
  DISABLED = 'disabled',
}

/**
 * 菜单回调
 */
export type MenuCallback = (action: MenuAction, data?: unknown) => void;

/**
 * 战斗菜单类
 */
export class BattleMenu {
  /** 当前菜单状态 */
  private state: MenuState = MenuState.MAIN;

  /** 当前选中索引 */
  private selectedIndex: number = 0;

  /** 当前菜单项 */
  private currentItems: MenuItem[] = [];

  /** 主菜单项 */
  private mainMenuItems: MenuItem[] = [
    { id: 'fight', text: '战斗', enabled: true, action: MenuAction.FIGHT },
    { id: 'technique', text: '技能', enabled: true, action: MenuAction.TECHNIQUE },
    { id: 'item', text: '道具', enabled: true, action: MenuAction.ITEM },
    { id: 'switch', text: '交换', enabled: false, action: MenuAction.SWITCH },
    { id: 'escape', text: '逃跑', enabled: true, action: MenuAction.ESCAPE },
  ];

  /** 技能菜单项 */
  private techniqueItems: MenuItem[] = [];

  /** 道具菜单项 */
  private itemItems: MenuItem[] = [];

  /** 目标列表 */
  private _targetItems: MenuItem[] = [];

  /** 回调函数 */
  private callback: MenuCallback | null = null;

  /** 是否已初始化 */
  private _initialized: boolean = false;

  /**
   * 初始化菜单
   */
  initialize(): void {
    this.initialized = true;
    this.state = MenuState.MAIN;
    this.currentItems = this.mainMenuItems;
    this.selectedIndex = 0;
    console.log('[BattleMenu] Initialized');
  }

  /**
   * 更新菜单
   */
  update(_deltaTime: number): void {
    if (this.state === MenuState.DISABLED) return;

    // 处理输入
    this.handleInput();
  }

  /**
   * 处理输入
   */
  private handleInput(): void {
    const items = this.currentItems.filter(item => item.enabled);
    if (items.length === 0) return;

    // 上/下导航
    if (inputManager.isPressed(KeyCode.UP) || inputManager.isPressed('ArrowUp')) {
      this.selectedIndex = Math.max(0, this.selectedIndex - 1);
      this.playSelectSound();
    } else if (inputManager.isPressed(KeyCode.DOWN) || inputManager.isPressed('ArrowDown')) {
      this.selectedIndex = Math.min(items.length - 1, this.selectedIndex + 1);
      this.playSelectSound();
    }

    // 确认
    if (inputManager.isPressed(KeyCode.ENTER) || inputManager.isPressed('Space')) {
      this.confirmSelection();
    }

    // 取消
    if (inputManager.isPressed(KeyCode.ESCAPE) || inputManager.isPressed('Escape')) {
      this.goBack();
    }
  }

  /**
   * 播放选择音效
   */
  private playSelectSound(): void {
    // TODO: 播放音效
  }

  /**
   * 确认选择
   */
  private confirmSelection(): void {
    const items = this.currentItems.filter(item => item.enabled);
    const selectedItem = items[this.selectedIndex];
    if (!selectedItem) return;

    switch (selectedItem.action) {
      case MenuAction.FIGHT:
        // 普通攻击，直接返回
        if (this.callback) {
          this.callback(MenuAction.FIGHT);
        }
        break;

      case MenuAction.TECHNIQUE:
        // 显示技能菜单
        this.showTechniqueMenu();
        break;

      case MenuAction.ITEM:
        // 显示道具菜单
        this.showItemMenu();
        break;

      case MenuAction.SWITCH:
        // TODO: 显示交换菜单
        break;

      case MenuAction.ESCAPE:
        // 逃跑
        if (this.callback) {
          this.callback(MenuAction.ESCAPE);
        }
        break;

      case MenuAction.BACK:
        this.goBack();
        break;

      case MenuAction.SELECT_TARGET:
        // 选择目标
        if (this.callback && selectedItem.data) {
          this.callback(MenuAction.SELECT_TARGET, selectedItem.data);
        }
        break;

      default:
        // 如果在技能菜单，返回选择的技能
        if (this.state === MenuState.TECHNIQUE && selectedItem.data) {
          if (this.callback) {
            this.callback(MenuAction.TECHNIQUE, selectedItem.data);
          }
        }
    }
  }

  /**
   * 返回上一级菜单
   */
  private goBack(): void {
    switch (this.state) {
      case MenuState.TECHNIQUE:
      case MenuState.ITEM:
      case MenuState.SWITCH:
        this.showMainMenu();
        break;

      case MenuState.TARGET:
        // 返回到技能菜单或主菜单
        this.showMainMenu();
        break;

      default:
        // 在主菜单无法返回
        break;
    }
  }

  /**
   * 显示主菜单
   */
  showMainMenu(): void {
    this.state = MenuState.MAIN;
    this.currentItems = this.mainMenuItems;
    this.selectedIndex = 0;
  }

  /**
   * 显示技能菜单
   */
  showTechniqueMenu(): void {
    this.state = MenuState.TECHNIQUE;
    this.currentItems = this.techniqueItems;
    this.selectedIndex = 0;
  }

  /**
   * 显示道具菜单
   */
  showItemMenu(): void {
    this.state = MenuState.ITEM;
    this.currentItems = this.itemItems;
    this.selectedIndex = 0;
  }

  /**
   * 显示目标选择菜单
   */
  showTargetMenu(targets: MenuItem[]): void {
    this.state = MenuState.TARGET;
    this.targetItems = targets;
    this.currentItems = targets;
    this.selectedIndex = 0;
  }

  /**
   * 设置技能列表
   */
  setTechniques(techniques: { id: string; name: string; currentPp: number; maxPp: number }[]): void {
    this.techniqueItems = techniques.map(tech => ({
      id: tech.id,
      text: `${tech.name} (${tech.currentPp}/${tech.maxPp})`,
      enabled: tech.currentPp > 0,
      action: MenuAction.TECHNIQUE,
      data: tech.id,
    }));

    // 添加返回选项
    this.techniqueItems.push({
      id: 'back',
      text: '返回',
      enabled: true,
      action: MenuAction.BACK,
    });
  }

  /**
   * 设置道具列表
   */
  setItems(items: { id: string; name: string; quantity: number }[]): void {
    this.itemItems = items.map(item => ({
      id: item.id,
      text: `${item.name} x${item.quantity}`,
      enabled: item.quantity > 0,
      action: MenuAction.ITEM,
      data: item.id,
    }));

    // 添加返回选项
    this.itemItems.push({
      id: 'back',
      text: '返回',
      enabled: true,
      action: MenuAction.BACK,
    });
  }

  /**
   * 设置回调
   */
  setCallback(callback: MenuCallback): void {
    this.callback = callback;
  }

  /**
   * 禁用菜单
   */
  disable(): void {
    this.state = MenuState.DISABLED;
  }

  /**
   * 启用菜单
   */
  enable(): void {
    if (this.state === MenuState.DISABLED) {
      this.showMainMenu();
    }
  }

  /**
   * 渲染菜单
   */
  render(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    if (this.state === MenuState.DISABLED) return;

    const menuX = width - 250;
    const menuY = height - 180;
    const menuWidth = 240;
    const menuHeight = 170;

    ctx.save();

    // 背景
    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.fillRect(menuX, menuY, menuWidth, menuHeight);

    // 边框
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.strokeRect(menuX, menuY, menuWidth, menuHeight);

    // 标题
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    const titles: Record<MenuState, string> = {
      [MenuState.MAIN]: '选择行动',
      [MenuState.TECHNIQUE]: '选择技能',
      [MenuState.ITEM]: '选择道具',
      [MenuState.TARGET]: '选择目标',
      [MenuState.SWITCH]: '选择怪物',
      [MenuState.DISABLED]: '',
    };
    ctx.fillText(titles[this.state], menuX + menuWidth / 2, menuY + 25);

    // 菜单项
    const items = this.currentItems;
    const startY = menuY + 45;
    const lineHeight = 25;

    ctx.font = '14px Arial';
    ctx.textAlign = 'left';

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const y = startY + i * lineHeight;

      // 高亮选中项
      if (i === this.selectedIndex && item.enabled) {
        ctx.fillStyle = '#3b82f6';
        ctx.fillRect(menuX + 10, y - 5, menuWidth - 20, lineHeight);

        // 选中指示器
        ctx.fillStyle = '#ffffff';
        ctx.fillText('▶', menuX + 20, y + 10);
      }

      // 文本
      ctx.fillStyle = item.enabled ? '#ffffff' : '#6b7280';
      ctx.fillText(item.text, menuX + 40, y + 10);
    }

    ctx.restore();
  }

  /**
   * 重置菜单
   */
  reset(): void {
    this.state = MenuState.MAIN;
    this.currentItems = this.mainMenuItems;
    this.selectedIndex = 0;
  }

  /**
   * 获取当前状态
   */
  getState(): MenuState {
    return this.state;
  }

  /**
   * 获取选中项
   */
  getSelectedItem(): MenuItem | null {
    const items = this.currentItems.filter(item => item.enabled);
    return items[this.selectedIndex] || null;
  }
}
