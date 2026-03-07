/**
 * 战斗状态枚举
 */

/**
 * 战斗阶段
 */
export enum BattlePhase {
  /** 战斗准备 */
  PREPARE = 'prepare',
  /** 选择行动 */
  SELECT_ACTION = 'select_action',
  /** 选择目标 */
  SELECT_TARGET = 'select_target',
  /** 执行行动 */
  EXECUTE_ACTION = 'execute_action',
  /** 回合结束 */
  END_TURN = 'end_turn',
  /** 战斗结束 */
  BATTLE_END = 'battle_end',
}

/**
 * 战斗结果
 */
export enum BattleResult {
  /** 战斗进行中 */
  ONGOING = 'ongoing',
  /** 玩家胜利 */
  WIN = 'win',
  /** 玩家失败 */
  LOSE = 'lose',
  /** 逃跑成功 */
  ESCAPE = 'escape',
}

/**
 * 行动类型
 */
export enum ActionType {
  /** 攻击（普通攻击） */
  ATTACK = 'attack',
  /** 使用技能 */
  TECHNIQUE = 'technique',
  /** 使用道具 */
  ITEM = 'item',
  /** 交换怪物 */
  SWITCH = 'switch',
  /** 逃跑 */
  ESCAPE = 'escape',
  /** 等待 */
  WAIT = 'wait',
}

/**
 * 战斗单位数据接口
 */
export interface BattleUnit {
  /** 单位 ID */
  id: string;
  /** 怪物 ID */
  monsterId: string;
  /** 怪物名称 */
  name: string;
  /** 当前 HP */
  currentHp: number;
  /** 最大 HP */
  maxHp: number;
  /** 当前等级 */
  level: number;
  /** 经验值 */
  exp: number;
  /** 属性列表 */
  elements: string[];
  /** 状态效果列表 */
  status: string[];
  /** 技能列表 */
  techniques: string[];
  /** 攻击力 */
  attack: number;
  /** 防御力 */
  defense: number;
  /** 速度 */
  speed: number;
  /** 特攻 */
  specialAttack: number;
  /** 特防 */
  specialDefense: number;
  /** 是否为玩家单位 */
  isPlayer: boolean;
  /** 是否已阵亡 */
  isFainted: boolean;
}

/**
 * 战斗行动接口
 */
export interface BattleAction {
  /** 行动类型 */
  type: ActionType;
  /** 行动者 ID */
  actorId: string;
  /** 目标 ID 列表 */
  targetIds: string[];
  /** 技能 ID（使用技能时） */
  techniqueId?: string;
  /** 道具 ID（使用道具时） */
  itemId?: string;
  /** 优先级 */
  priority: number;
}

/**
 * 战斗事件接口
 */
export interface BattleEvent {
  /** 事件类型 */
  type: 'damage' | 'heal' | 'status_apply' | 'status_remove' | 'faint' | 'switch' | 'escape' | 'exp_gain' | 'level_up';
  /** 来源单位 ID */
  sourceId?: string;
  /** 目标单位 ID */
  targetId?: string;
  /** 数值 */
  value?: number;
  /** 技能 ID */
  techniqueId?: string;
  /** 状态 ID */
  statusId?: string;
  /** 道具 ID */
  itemId?: string;
  /** 事件文本 */
  text?: string;
}

/**
 * 战斗状态接口
 */
export interface BattleState {
  /** 战斗 ID */
  battleId: string;
  /** 战斗阶段 */
  phase: BattlePhase;
  /** 战斗结果 */
  result: BattleResult;
  /** 当前回合数 */
  turn: number;
  /** 玩家队伍 */
  playerParty: BattleUnit[];
  /** 敌方队伍 */
  enemyParty: BattleUnit[];
  /** 当前行动中的单位索引（玩家） */
  currentPlayerIndex: number;
  /** 当前行动中的单位索引（敌方） */
  currentEnemyIndex: number;
  /** 待执行的行动队列 */
  actionQueue: BattleAction[];
  /** 战斗事件日志 */
  eventLog: BattleEvent[];
  /** 可逃跑 */
  canEscape: boolean;
  /** 战斗背景 */
  background: string;
  /** 战斗音乐 */
  bgm: string;
}
