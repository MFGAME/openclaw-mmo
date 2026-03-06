/**
 * 对战路由
 */

import { Router, Request, Response } from 'express';
import { battleEngine } from '../server';

const router = Router();

/**
 * 创建对战
 */
router.post('/create', (req: Request, res: Response) => {
  try {
    const { player1_id, player2_id, player1_monsters, player2_monsters } = req.body;

    if (!player1_id || !player2_id || !player1_monsters || !player2_monsters) {
      return res.status(400).json({ error: '缺少必填字段' });
    }

    const battleId = battleEngine.createBattle(
      player1_id,
      player2_id,
      player1_monsters,
      player2_monsters
    );

    res.json({
      success: true,
      battle_id: battleId
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * 获取对战信息
 */
router.get('/:battleId', (req: Request, res: Response) => {
  try {
    const { battleId } = req.params;
    const battle = battleEngine.getBattle(battleId);

    if (!battle) {
      return res.status(404).json({ error: '对战不存在' });
    }

    res.json({
      success: true,
      battle
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * 获取所有对战
 */
router.get('/', (req: Request, res: Response) => {
  try {
    const battles = battleEngine.getAllBattles();

    res.json({
      success: true,
      battles,
      total: battles.length
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
