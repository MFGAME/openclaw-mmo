/**
 * 战斗引擎
 * 基于Tuxemon的回合制战斗系统
 */

export interface Monster {
  id: string;
  slug: string;
  species: string;
  level: number;
  hp: number;
  max_hp: number;
  attack: number;
  defense: number;
  speed: number;
  skills: string[];
  types: string[];
}

export interface Battle {
  id: string;
  player1: string;
  player2: string;
  player1_monsters: Monster[];
  player2_monsters: Monster[];
  current_turn: number;
  active_monster_player1: number;
  active_monster_player2: number;
  status: 'waiting' | 'ongoing' | 'completed';
  winner?: string;
  logs: BattleLog[];
}

export interface BattleLog {
  turn: number;
  actor: string;
  action: string;
  result: any;
  timestamp: Date;
}

export class BattleEngine {
  private battles: Map<string, Battle> = new Map();

  /**
   * 创建新对战
   */
  createBattle(
    player1: string,
    player2: string,
    player1_monsters: Monster[],
    player2_monsters: Monster[]
  ): string {
    const battleId = `battle_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const battle: Battle = {
      id: battleId,
      player1,
      player2,
      player1_monsters,
      player2_monsters,
      current_turn: 0,
      active_monster_player1: 0,
      active_monster_player2: 0,
      status: 'ongoing',
      logs: []
    };

    this.battles.set(battleId, battle);
    console.log(`✅ 创建对战: ${battleId}`);

    return battleId;
  }

  /**
   * 处理战斗行动
   */
  processAction(battleId: string, action: any): any {
    const battle = this.battles.get(battleId);

    if (!battle) {
      throw new Error('对战不存在');
    }

    if (battle.status === 'completed') {
      throw new Error('对战已结束');
    }

    battle.current_turn++;

    const result = this.executeAction(battle, action);

    // 检查胜负
    const winner = this.checkWinner(battle);
    if (winner) {
      battle.status = 'completed';
      battle.winner = winner;
    }

    // 记录日志
    battle.logs.push({
      turn: battle.current_turn,
      actor: action.player,
      action: action.type,
      result,
      timestamp: new Date()
    });

    return {
      battleId,
      current_turn: battle.current_turn,
      result,
      battle_status: battle.status,
      winner: battle.winner
    };
  }

  /**
   * 执行行动
   */
  private executeAction(battle: Battle, action: any): any {
    const attacker = action.player === 'player1'
      ? battle.player1_monsters[battle.active_monster_player1]
      : battle.player2_monsters[battle.active_monster_player2];

    const defender = action.player === 'player1'
      ? battle.player2_monsters[battle.active_monster_player2]
      : battle.player1_monsters[battle.active_monster_player1];

    switch (action.type) {
      case 'attack':
        return this.executeAttack(attacker, defender, action.skill);

      case 'switch':
        return this.executeSwitch(battle, action.player, action.monster_index);

      case 'item':
        return this.executeItem(attacker, action.item);

      default:
        throw new Error('未知行动类型');
    }
  }

  /**
   * 执行攻击
   */
  private executeAttack(attacker: Monster, defender: Monster, skill: string): any {
    // 简化的伤害计算（实际应从Tuxemon提取）
    const baseDamage = attacker.attack * 2 - defender.defense;
    const randomFactor = Math.random() * 0.2 + 0.9; // 90%-110%
    const damage = Math.max(1, Math.floor(baseDamage * randomFactor));

    defender.hp = Math.max(0, defender.hp - damage);

    console.log(`${attacker.species} 对 ${defender.species} 使用 ${skill}，造成 ${damage} 点伤害`);

    return {
      type: 'attack',
      attacker: attacker.id,
      defender: defender.id,
      skill,
      damage,
      defender_remaining_hp: defender.hp
    };
  }

  /**
   * 执行切换
   */
  private executeSwitch(battle: Battle, player: string, monsterIndex: number): any {
    if (player === 'player1') {
      battle.active_monster_player1 = monsterIndex;
    } else {
      battle.active_monster_player2 = monsterIndex;
    }

    const monster = player === 'player1'
      ? battle.player1_monsters[monsterIndex]
      : battle.player2_monsters[monsterIndex];

    console.log(`${player} 切换到 ${monster.species}`);

    return {
      type: 'switch',
      player,
      new_monster: monster.id
    };
  }

  /**
   * 使用道具
   */
  private executeItem(monster: Monster, item: string): any {
    // 简化的道具效果
    let effect = 0;

    switch (item) {
      case 'potion':
        effect = 20;
        monster.hp = Math.min(monster.max_hp, monster.hp + effect);
        break;
      default:
        throw new Error('未知道具');
    }

    console.log(`对 ${monster.species} 使用 ${item}，恢复 ${effect} HP`);

    return {
      type: 'item',
      monster: monster.id,
      item,
      effect,
      monster_new_hp: monster.hp
    };
  }

  /**
   * 检查胜负
   */
  private checkWinner(battle: Battle): string | null {
    const player1_alive = battle.player1_monsters.some(m => m.hp > 0);
    const player2_alive = battle.player2_monsters.some(m => m.hp > 0);

    if (!player1_alive) {
      return battle.player2;
    }

    if (!player2_alive) {
      return battle.player1;
    }

    return null;
  }

  /**
   * 获取对战信息
   */
  getBattle(battleId: string): Battle | undefined {
    return this.battles.get(battleId);
  }

  /**
   * 获取所有对战
   */
  getAllBattles(): Battle[] {
    return Array.from(this.battles.values());
  }
}
