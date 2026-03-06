/**
 * 机器人路由
 */

import { Router, Request, Response } from 'express';
import { robots } from './auth';

const router = Router();

/**
 * 获取机器人状态
 */
router.get('/:robotId/status', (req: Request, res: Response) => {
  try {
    const { robotId } = req.params;
    const robot = robots.get(robotId);

    if (!robot) {
      return res.status(404).json({ error: '机器人不存在' });
    }

    res.json({
      success: true,
      robot: {
        id: robot.id,
        name: robot.name,
        personality: robot.personality,
        level: robot.level,
        exp: robot.exp,
        status: 'online',
        created_at: robot.created_at
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * 获取所有机器人
 */
router.get('/', (req: Request, res: Response) => {
  try {
    const robotList = Array.from(robots.values()).map((r: any) => ({
      id: r.id,
      name: r.name,
      personality: r.personality,
      level: r.level,
      status: 'online'
    }));

    res.json({
      success: true,
      robots: robotList,
      total: robotList.length
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
