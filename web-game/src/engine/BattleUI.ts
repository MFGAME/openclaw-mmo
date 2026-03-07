/**
 * 战斗 UI 管理器 - 管理战斗界面渲染和交互
 *
 * 功能：
 * - 渲染战斗场景（背景、怪物显示）
 * - 渲染战斗菜单
 * - 显示战斗信息（HP、状态、属性等）
 * - 处理战斗事件
 */

import {
  BattlePhase,
  BattleResult,
  BattleUnit,
  BattleEvent,
  BattleState,
} from './BattleState';
import { battleManager, BattleCallback } from './BattleManager';
import { BattleMenu, MenuAction } from './BattleMenu';

/**
 * UI 配置
 */
export interface BattleUIConfig {
  /** 战斗菜单位置 */
  menuPosition?: 'bottom' | 'right';
  /** 是否显示 HP 条动画 */
  animateHpBars?: boolean;
  /** 战斗信息滚动速度 */
  messageSpeed?: number;
}

/**
 * 战斗 UI 管理器类
 */
export class BattleUI {
  private static instance: BattleUI;

  /** UI 配置 */
  private config: BattleUIConfig;

  /** 战斗菜单 */
  private battleMenu: BattleMenu;

  /** 当前显示的消息队列 */
  private messageQueue: string[] = [];

  /** 当前消息 */
  private currentMessage: string = '';

  /** 消息显示进度 (0-1) */
  private messageProgress: number = 0;

  /** 是否等待用户确认 */
  private waitingForConfirm: boolean = false;

  /** 战斗回调 */
  private battleCallback: BattleCallback;

  /**
   * 私有构造函数
   */
  private constructor() {
    this.config = {
      menuPosition: 'bottom',
      animateHpBars: true,
      messageSpeed: 50,
    };

    this.battleMenu = new BattleMenu();

    // 注册战斗事件回调
    this.battleCallback = (event: BattleEvent, state: BattleState) => {
      this.handleBattleEvent(event, state);
    };
    battleManager.onBattleEvent(this.battleCallback);
  }

  /**
   * 获取单例实例
   */
  static getInstance(): BattleUI {
    if (!BattleUI.instance) {
      BattleUI.instance = new BattleUI();
    }
    return BattleUI.instance;
  }

  /**
   * 初始化 UI
   */
  initialize(config?: Partial<BattleUIConfig>): void {
    if (config) {
      this.config = { ...this.config, ...config };
    }
    this.battleMenu.initialize();
    console.log('[BattleUI] Initialized');
  }

  /**
   * 更新 UI
   */
  update(deltaTime: number): void {
    const state = battleManager.getBattleState();
    if (!state) return;

    // 更新战斗菜单
    this.battleMenu.update(deltaTime);

    // 更新消息显示
    if (this.currentMessage && this.messageProgress < 1) {
      this.messageProgress += deltaTime * this.config.messageSpeed! / 1000;
      if (this.messageProgress > 1) this.messageProgress = 1;
    }

    // 如果消息显示完成且没有等待确认，检查下一个消息
    if (
      this.messageProgress >= 1 &&
      !this.waitingForConfirm &&
      this.messageQueue.length > 0
    ) {
      this.showNextMessage();
    }
  }

  /**
   * 渲染 UI
   */
  render(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    const state = battleManager.getBattleState();
    if (!state) {
      this.renderNoBattle(ctx, width, height);
      return;
    }

    // 渲染战斗背景
    this.renderBackground(ctx, width, height, state.background);

    // 渲染玩家怪物
    this.renderPlayerMonsters(ctx, state.playerParty);

    // 渲染敌方怪物
    this.renderEnemyMonsters(ctx, state.enemyParty);

    // 渲染 HP 条
    this.renderHpBars(ctx, state, height);

    // 渲染怪物属性（HP、攻击、防御、速度）
    this.renderMonsterStatsDisplay(ctx, state, width, height);

    // 渲染战斗菜单
    this.battleMenu.render(ctx, width, height);

    // 渲染消息框
    this.renderMessageBox(ctx, width, height);

    // 渲染战斗结束画面
    if (state.phase === BattlePhase.BATTLE_END) {
      this.renderBattleEnd(ctx, width, height, state.result);
    }
  }

  /**
   * 渲染怪物属性显示
   */
  private renderMonsterStatsDisplay(
    ctx: CanvasRenderingContext2D,
    state: BattleState,
    width: number,
    height: number
  ): void {
    // 玩家怪物属性（显示在左下角）
    const playerMonster = state.playerParty.find(m => !m.isFainted);
    if (playerMonster) {
      this.renderMonsterStats(ctx, 30, height - 120, playerMonster);
    }

    // 敌方怪物属性（显示在左上角）
    const enemyMonster = state.enemyParty.find(m => !m.isFainted);
    if (enemyMonster) {
      this.renderMonsterStats(ctx, width - 160, 60, enemyMonster);
    }
  }

  /**
   * 渲染无战斗状态
   */
  private renderNoBattle(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = '#ffffff';
    ctx.font = '20px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('No battle in progress', width / 2, height / 2);
  }

  /**
   * 渲染战斗背景
   */
  private renderBackground(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    backgroundType: string
  ): void {
    // 根据背景类型渲染不同背景
    switch (backgroundType) {
      case 'grassland':
        ctx.fillStyle = '#4ade80';
        break;
      case 'forest':
        ctx.fillStyle = '#166534';
        break;
      case 'cave':
        ctx.fillStyle = '#374151';
        break;
      case 'water':
        ctx.fillStyle = '#0ea5e9';
        break;
      default:
        ctx.fillStyle = '#1e293b';
    }

    ctx.fillRect(0, 0, width, height);

    // 绘制简单的地面
    ctx.fillStyle = '#854d0e';
    ctx.fillRect(0, height * 0.7, width, height * 0.3);

    // 绘制战斗区域分隔线
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.beginPath();
    ctx.moveTo(0, height * 0.4);
    ctx.lineTo(width, height * 0.4);
    ctx.stroke();
  }

  /**
   * 渲染玩家怪物
   */
  private renderPlayerMonsters(ctx: CanvasRenderingContext2D, party: BattleUnit[]): void {
    const aliveMonsters = party.filter(m => !m.isFainted);
    if (aliveMonsters.length === 0) return;

    // 只显示当前战斗中的怪物
    const currentMonster = aliveMonsters[0];

    ctx.save();
    ctx.translate(150, 280);

    // 绘制怪物占位符（矩形）
    ctx.fillStyle = currentMonster.isPlayer ? '#3b82f6' : '#64748b';
    ctx.fillRect(0, 0, 80, 80);

    // 绘制怪物名称
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(currentMonster.name, 40, 95);

    // 绘制 HP 状态
    ctx.font = '12px Arial';
    ctx.fillText(`HP: ${currentMonster.currentHp}/${currentMonster.maxHp}`, 40, 110);

    ctx.restore();
  }

  /**
   * 渲染敌方怪物
   */
  private renderEnemyMonsters(ctx: CanvasRenderingContext2D, party: BattleUnit[]): void {
    const aliveMonsters = party.filter(m => !m.isFainted);
    if (aliveMonsters.length === 0) return;

    // 显示当前敌方怪物
    const currentMonster = aliveMonsters[0];

    ctx.save();
    ctx.translate(550, 80);

    // 绘制怪物占位符（矩形）
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(0, 0, 80, 80);

    // 绘制怪物名称
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(currentMonster.name, 40, 95);

    ctx.restore();
  }

  /**
   * 渲染 HP 条
   */
  private renderHpBars(ctx: CanvasRenderingContext2D, state: BattleState, canvasHeight: number): void {
    // 玩家 HP 条
    const playerMonster = state.playerParty.find(m => !m.isFainted);
    if (playerMonster) {
      this.renderSingleHpBar(ctx, 30, canvasHeight - 180, 200, 20, playerMonster);
    }

    // 敌方 HP 条
    const enemyMonster = state.enemyParty.find(m => !m.isFainted);
    if (enemyMonster) {
      this.renderSingleHpBar(ctx, 30, 30, 200, 20, enemyMonster);
    }
  }

  /**
   * 渲染单个 HP 条
   */
  private renderSingleHpBar(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    unit: BattleUnit
  ): void {
    ctx.save();

    // 背景
    ctx.fillStyle = '#1f2937';
    ctx.fillRect(x, y, width, height);

    // HP 条
    const hpRatio = unit.currentHp / unit.maxHp;
    let hpColor = '#22c55e'; // 绿色
    if (hpRatio < 0.5) hpColor = '#eab308'; // 黄色
    if (hpRatio < 0.2) hpColor = '#ef4444'; // 红色

    ctx.fillStyle = hpColor;
    ctx.fillRect(x, y, width * hpRatio, height);

    // 边框
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, width, height);

    // 文字
    ctx.fillStyle = '#ffffff';
    ctx.font = '12px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`${unit.name} Lv.${unit.level}`, x, y - 5);
    ctx.textAlign = 'right';
    ctx.fillText(`${unit.currentHp}/${unit.maxHp}`, x + width, y - 5);

    ctx.restore();
  }

  /**
   * 渲染怪物属性信息（HP、攻击、防御、速度）
   */
  private renderMonsterStats(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    unit: BattleUnit
  ): void {
    ctx.save();

    const boxWidth = 120;
    const boxHeight = 80;

    // 背景框
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(x, y, boxWidth, boxHeight);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, boxWidth, boxHeight);

    // 属性文字
    ctx.fillStyle = '#ffffff';
    ctx.font = '11px Arial';
    ctx.textAlign = 'left';

    const lineHeight = 16;
    const startY = y + 12;

    // HP
    ctx.fillStyle = '#ef4444';
    ctx.fillText(`HP: ${unit.maxHp}`, x + 8, startY);
    // 攻击
    ctx.fillStyle = '#f97316';
    ctx.fillText(`攻: ${unit.attack}`, x + 8, startY + lineHeight);
    // 防御
    ctx.fillStyle = '#eab308';
    ctx.fillText(`防: ${unit.defense}`, x + 8, startY + lineHeight * 2);
    // 速度
    ctx.fillStyle = '#22c55e';
    ctx.fillText(`速: ${unit.speed}`, x + 8, startY + lineHeight * 3);

    ctx.restore();
  }

  /**
   * 渲染消息框
   */
  private renderMessageBox(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    if (!this.currentMessage) return;

    const boxHeight = 80;
    const boxY = height - boxHeight - 10;

    ctx.save();

    // 背景
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(10, boxY, width - 20, boxHeight);

    // 边框
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.strokeRect(10, boxY, width - 20, boxHeight);

    // 文字
    ctx.fillStyle = '#ffffff';
    ctx.font = '16px Arial';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    const displayText = this.currentMessage.substring(
      0,
      Math.floor(this.currentMessage.length * this.messageProgress)
    );
    ctx.fillText(displayText, 20, boxY + boxHeight / 2);

    // 如果消息显示完成，显示继续提示
    if (this.messageProgress >= 1 && !this.waitingForConfirm) {
      ctx.fillStyle = '#a0a0a0';
      ctx.font = '12px Arial';
      ctx.textAlign = 'right';
      ctx.fillText('按任意键继续...', width - 20, boxY + boxHeight - 15);
    }

    ctx.restore();
  }

  /**
   * 渲染战斗结束画面
   */
  private renderBattleEnd(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    result: BattleResult
  ): void {
    ctx.save();

    // 半透明遮罩
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, width, height);

    // 结果文字
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 32px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    let resultText = '';
    switch (result) {
      case BattleResult.WIN:
        resultText = 'Victory!';
        ctx.fillStyle = '#22c55e';
        break;
      case BattleResult.LOSE:
        resultText = 'Defeat...';
        ctx.fillStyle = '#ef4444';
        break;
      case BattleResult.ESCAPE:
        resultText = 'Escaped!';
        ctx.fillStyle = '#eab308';
        break;
      default:
        resultText = 'Battle End';
    }

    ctx.fillText(resultText, width / 2, height / 2);

    ctx.restore();
  }

  /**
   * 处理战斗事件
   */
  private handleBattleEvent(event: BattleEvent, _state: BattleState): void {
    if (event.text) {
      this.messageQueue.push(event.text);
    }
  }

  /**
   * 显示下一条消息
   */
  private showNextMessage(): void {
    if (this.messageQueue.length === 0) {
      this.currentMessage = '';
      return;
    }

    this.currentMessage = this.messageQueue.shift()!;
    this.messageProgress = 0;
  }

  /**
   * 确认消息（按键处理）
   */
  confirmMessage(): void {
    if (this.messageProgress < 1) {
      // 加速显示消息
      this.messageProgress = 1;
      return;
    }

    if (this.messageQueue.length > 0) {
      this.showNextMessage();
    } else {
      this.currentMessage = '';
      this.waitingForConfirm = false;
    }
  }

  /**
   * 获取战斗菜单
   */
  getMenu(): BattleMenu {
    return this.battleMenu;
  }

  /**
   * 设置菜单回调
   */
  setMenuCallback(callback: (action: MenuAction) => void): void {
    this.battleMenu.setCallback(callback);
  }

  /**
   * 清除 UI 状态
   */
  clear(): void {
    this.messageQueue = [];
    this.currentMessage = '';
    this.messageProgress = 0;
    this.waitingForConfirm = false;
    this.battleMenu.reset();
    console.log('[BattleUI] Cleared');
  }
}

/**
 * 导出单例
 */
export const battleUI = BattleUI.getInstance();
