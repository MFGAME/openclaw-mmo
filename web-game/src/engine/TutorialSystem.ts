/**
 * 游戏教程系统
 *
 * 新手教程管理系统
 *
 * 功能：
 * - 教程步骤枚举定义
 * - 教程进度跟踪
 * - 支持跳过和重置教程
 * - 与 SaveManager 集成保存教程进度
 */

import { saveManager, SaveSlot } from './SaveManager';

/**
 * 教程步骤枚举
 */
export enum TutorialStep {
  /** 未开始 */
  NOT_STARTED = 'not_started',
  /** 步骤 1: 移动 */
  MOVEMENT = 'movement',
  /** 步骤 2: 交互 */
  INTERACTION = 'interaction',
  /** 步骤 3: 战斗 */
  BATTLE = 'battle',
  /** 步骤 4: 技能 */
  SKILLS = 'skills',
  /** 步骤 5: 捕捉 */
  CAPTURE = 'capture',
  /** 完成 */
  COMPLETED = 'completed',
}

/**
 * 教程数据接口
 */
export interface TutorialData {
  /** 当前步骤 */
  currentStep: TutorialStep;
  /** 已完成的步骤 */
  completedSteps: TutorialStep[];
  /** 是否跳过教程 */
  skipped: boolean;
  /** 教程开始时间 */
  startTime: number;
  /** 教程完成时间 */
  completionTime?: number;
}

/**
 * 教程步骤内容
 */
export interface TutorialStepContent {
  /** 步骤 ID */
  id: TutorialStep;
  /** 步骤标题 */
  title: string;
  /** 步骤描述 */
  description: string;
  /** 提示文本 */
  hint: string;
  /** 目标操作类型 */
  actionType: 'move' | 'interact' | 'battle' | 'skill' | 'capture';
  /** 是否为最后一步 */
  isLastStep: boolean;
  /** 键盘快捷键提示 */
  keyboardHint?: string;
}

/**
 * 教程步骤回调
 */
export type TutorialStepCallback = (step: TutorialStep) => void;

/**
 * 教程完成回调
 */
export type TutorialCompleteCallback = (skipped: boolean) => void;

/**
 * 教程系统类
 */
export class TutorialSystem {
  private static instance: TutorialSystem;

  /** 教程数据 */
  private tutorialData: TutorialData = {
    currentStep: TutorialStep.NOT_STARTED,
    completedSteps: [],
    skipped: false,
    startTime: 0,
  };

  /** 步骤回调列表 */
  private stepCallbacks: TutorialStepCallback[] = [];

  /** 完成回调列表 */
  private completeCallbacks: TutorialCompleteCallback[] = [];

  /** 教程步骤内容映射 */
  private stepContents: Map<TutorialStep, TutorialStepContent> = new Map();

  /** 是否已加载存档 */
  private loadedFromSave: boolean = false;

  /**
   * 私有构造函数，确保单例
   */
  private constructor() {
    this.initializeStepContents();
  }

  /**
   * 获取单例实例
   */
  static getInstance(): TutorialSystem {
    if (!TutorialSystem.instance) {
      TutorialSystem.instance = new TutorialSystem();
    }
    return TutorialSystem.instance;
  }

  /**
   * 初始化教程步骤内容
   */
  private initializeStepContents(): void {
    // 步骤 1: 移动
    this.stepContents.set(TutorialStep.MOVEMENT, {
      id: TutorialStep.MOVEMENT,
      title: '移动角色',
      description: '使用方向键或 WASD 控制角色移动',
      hint: '试着按上、下、左、右键移动角色',
      actionType: 'move',
      isLastStep: false,
      keyboardHint: '方向键 / WASD',
    });

    // 步骤 2: 交互
    this.stepContents.set(TutorialStep.INTERACTION, {
      id: TutorialStep.INTERACTION,
      title: '与 NPC 对话',
      description: '按空格键与 NPC 对话获取信息',
      hint: '找到附近的 NPC 并按空格键对话',
      actionType: 'interact',
      isLastStep: false,
      keyboardHint: '空格键',
    });

    // 步骤 3: 战斗
    this.stepContents.set(TutorialStep.BATTLE, {
      id: TutorialStep.BATTLE,
      title: '遭遇战斗',
      description: '在野外遭遇野生怪物时会进入战斗',
      hint: '探索时会遇到野生怪物，准备战斗吧！',
      actionType: 'battle',
      isLastStep: false,
      keyboardHint: '自动触发',
    });

    // 步骤 4: 技能
    this.stepContents.set(TutorialStep.SKILLS, {
      id: TutorialStep.SKILLS,
      title: '使用技能',
      description: '选择技能攻击敌人，不同属性有克制关系',
      hint: '选择一个技能攻击敌人',
      actionType: 'skill',
      isLastStep: false,
      keyboardHint: '数字键 1-4',
    });

    // 步骤 5: 捕捉
    this.stepContents.set(TutorialStep.CAPTURE, {
      id: TutorialStep.CAPTURE,
      title: '捕捉怪物',
      description: '使用捕捉道具将野生怪物收服',
      hint: '当怪物 HP 较低时使用捕捉道具',
      actionType: 'capture',
      isLastStep: true,
      keyboardHint: '捕捉道具',
    });
  }

  /**
   * 加载教程进度
   */
  async loadProgress(): Promise<void> {
    try {
      // 从 SaveManager 加载自定义数据
      // 注意：这里需要扩展 SaveManager 来支持自定义数据存储
      const saveData = await saveManager.loadFromSlot(SaveSlot.SLOT_1);
      if (saveData && saveData.customData && saveData.customData.tutorial) {
        this.tutorialData = saveData.customData.tutorial;
        this.loadedFromSave = true;
        console.log('[TutorialSystem] 加载教程进度:', this.tutorialData.currentStep);
      } else {
        console.log('[TutorialSystem] 未找到教程进度，使用默认值');
      }
    } catch (error) {
      console.error('[TutorialSystem] 加载教程进度失败:', error);
    }
  }

  /**
   * 保存教程进度
   */
  async saveProgress(): Promise<void> {
    try {
      // 将教程进度保存到 SaveManager
      // 注意：这里需要 SaveManager 支持自定义数据
      const saveData = await saveManager.loadFromSlot(SaveSlot.SLOT_1);
      if (saveData) {
        saveData.customData = {
          ...saveData.customData,
          tutorial: this.tutorialData,
        };
        await saveManager.saveToSlot(SaveSlot.SLOT_1, saveData);
        console.log('[TutorialSystem] 保存教程进度:', this.tutorialData.currentStep);
      }
    } catch (error) {
      console.error('[TutorialSystem] 保存教程进度失败:', error);
    }
  }

  /**
   * 开始教程
   */
  startTutorial(): void {
    if (this.tutorialData.currentStep !== TutorialStep.NOT_STARTED && !this.loadedFromSave) {
      console.warn('[TutorialSystem] 教程已经开始或已完成');
      return;
    }

    this.tutorialData.currentStep = TutorialStep.MOVEMENT;
    this.tutorialData.startTime = Date.now();
    this.tutorialData.skipped = false;
    this.loadedFromSave = false;

    console.log('[TutorialSystem] 开始教程');

    // 触发步骤回调
    this.triggerStepCallback(this.tutorialData.currentStep);
  }

  /**
   * 完成当前步骤
   */
  completeCurrentStep(): void {
    const currentStep = this.tutorialData.currentStep;

    // 记录已完成步骤
    if (!this.tutorialData.completedSteps.includes(currentStep)) {
      this.tutorialData.completedSteps.push(currentStep);
    }

    // 移动到下一步
    this.nextStep();
  }

  /**
   * 移动到下一步
   */
  nextStep(): void {
    const steps = [
      TutorialStep.MOVEMENT,
      TutorialStep.INTERACTION,
      TutorialStep.BATTLE,
      TutorialStep.SKILLS,
      TutorialStep.CAPTURE,
    ];

    const currentIndex = steps.indexOf(this.tutorialData.currentStep);

    if (currentIndex === -1) {
      console.warn('[TutorialSystem] 当前步骤无效');
      return;
    }

    // 检查是否为最后一步
    if (currentIndex >= steps.length - 1) {
      this.completeTutorial();
      return;
    }

    // 移动到下一步
    this.tutorialData.currentStep = steps[currentIndex + 1];

    console.log('[TutorialSystem] 进入下一步:', this.tutorialData.currentStep);

    // 触发步骤回调
    this.triggerStepCallback(this.tutorialData.currentStep);

    // 保存进度
    this.saveProgress();
  }

  /**
   * 跳过教程
   */
  skipTutorial(): void {
    if (this.tutorialData.currentStep === TutorialStep.COMPLETED) {
      console.warn('[TutorialSystem] 教程已完成');
      return;
    }

    console.log('[TutorialSystem] 跳过教程');

    this.tutorialData.currentStep = TutorialStep.COMPLETED;
    this.tutorialData.skipped = true;
    this.tutorialData.completionTime = Date.now();

    // 触发完成回调
    this.triggerCompleteCallback(true);

    // 保存进度
    this.saveProgress();
  }

  /**
   * 完成教程
   */
  private completeTutorial(): void {
    if (this.tutorialData.currentStep === TutorialStep.COMPLETED) {
      return;
    }

    console.log('[TutorialSystem] 教程完成');

    this.tutorialData.currentStep = TutorialStep.COMPLETED;
    this.tutorialData.completionTime = Date.now();

    // 触发完成回调
    this.triggerCompleteCallback(false);

    // 保存进度
    this.saveProgress();
  }

  /**
   * 重置教程
   */
  resetTutorial(): void {
    console.log('[TutorialSystem] 重置教程');

    this.tutorialData = {
      currentStep: TutorialStep.NOT_STARTED,
      completedSteps: [],
      skipped: false,
      startTime: 0,
    };

    this.loadedFromSave = false;

    // 保存进度
    this.saveProgress();
  }

  /**
   * 跳转到指定步骤
   * @param step 目标步骤
   */
  goToStep(step: TutorialStep): void {
    if (step === TutorialStep.COMPLETED) {
      this.completeTutorial();
      return;
    }

    console.log('[TutorialSystem] 跳转到步骤:', step);

    this.tutorialData.currentStep = step;

    // 触发步骤回调
    this.triggerStepCallback(step);

    // 保存进度
    this.saveProgress();
  }

  /**
   * 获取当前步骤
   * @returns 当前步骤
   */
  getCurrentStep(): TutorialStep {
    return this.tutorialData.currentStep;
  }

  /**
   * 获取当前步骤内容
   * @returns 当前步骤内容，如果不在教程中返回 null
   */
  getCurrentStepContent(): TutorialStepContent | null {
    return this.stepContents.get(this.tutorialData.currentStep) || null;
  }

  /**
   * 获取步骤内容
   * @param step 步骤 ID
   * @returns 步骤内容，如果不存在返回 null
   */
  getStepContent(step: TutorialStep): TutorialStepContent | null {
    return this.stepContents.get(step) || null;
  }

  /**
   * 获取所有步骤内容
   * @returns 所有步骤内容数组
   */
  getAllStepContents(): TutorialStepContent[] {
    return Array.from(this.stepContents.values());
  }

  /**
   * 获取已完成的步骤
   * @returns 已完成的步骤列表
   */
  getCompletedSteps(): TutorialStep[] {
    return [...this.tutorialData.completedSteps];
  }

  /**
   * 检查步骤是否完成
   * @param step 步骤 ID
   * @returns 是否完成
   */
  isStepCompleted(step: TutorialStep): boolean {
    return this.tutorialData.completedSteps.includes(step);
  }

  /**
   * 获取教程进度百分比
   * @returns 进度百分比（0-100）
   */
  getProgress(): number {
    if (this.tutorialData.currentStep === TutorialStep.COMPLETED) {
      return 100;
    }

    if (this.tutorialData.currentStep === TutorialStep.NOT_STARTED) {
      return 0;
    }

    const totalSteps = 5; // MOVEMENT, INTERACTION, BATTLE, SKILLS, CAPTURE
    const completedSteps = this.tutorialData.completedSteps.length;

    return Math.floor((completedSteps / totalSteps) * 100);
  }

  /**
   * 检查教程是否完成
   * @returns 是否完成
   */
  isCompleted(): boolean {
    return this.tutorialData.currentStep === TutorialStep.COMPLETED;
  }

  /**
   * 检查是否跳过了教程
   * @returns 是否跳过
   */
  isSkipped(): boolean {
    return this.tutorialData.skipped;
  }

  /**
   * 检查是否在教程中
   * @returns 是否在教程中
   */
  isInTutorial(): boolean {
    return (
      this.tutorialData.currentStep !== TutorialStep.NOT_STARTED &&
      this.tutorialData.currentStep !== TutorialStep.COMPLETED
    );
  }

  /**
   * 获取教程数据
   * @returns 教程数据（只读）
   */
  getTutorialData(): Readonly<TutorialData> {
    return { ...this.tutorialData };
  }

  /**
   * 注册步骤回调
   * @param callback 回调函数
   */
  onStepChange(callback: TutorialStepCallback): void {
    this.stepCallbacks.push(callback);
  }

  /**
   * 移除步骤回调
   * @param callback 回调函数
   */
  offStepChange(callback: TutorialStepCallback): void {
    const index = this.stepCallbacks.indexOf(callback);
    if (index !== -1) {
      this.stepCallbacks.splice(index, 1);
    }
  }

  /**
   * 注册完成回调
   * @param callback 回调函数
   */
  onComplete(callback: TutorialCompleteCallback): void {
    this.completeCallbacks.push(callback);
  }

  /**
   * 移除完成回调
   * @param callback 回调函数
   */
  offComplete(callback: TutorialCompleteCallback): void {
    const index = this.completeCallbacks.indexOf(callback);
    if (index !== -1) {
      this.completeCallbacks.splice(index, 1);
    }
  }

  /**
   * 触发步骤回调
   * @param step 步骤
   */
  private triggerStepCallback(step: TutorialStep): void {
    for (const callback of this.stepCallbacks) {
      callback(step);
    }
  }

  /**
   * 触发完成回调
   * @param skipped 是否跳过
   */
  private triggerCompleteCallback(skipped: boolean): void {
    for (const callback of this.completeCallbacks) {
      callback(skipped);
    }
  }
}

/**
 * 导出教程系统单例
 */
export const tutorialSystem = TutorialSystem.getInstance();
