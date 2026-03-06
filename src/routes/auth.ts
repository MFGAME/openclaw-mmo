/**
 * 认证路由
 */

import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// 临时存储（实际应使用数据库）
const users: Map<string, any> = new Map();
export const robots: Map<string, any> = new Map();

/**
 * 注册用户
 */
router.post('/register', (req: Request, res: Response) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: '缺少必填字段' });
    }

    const userId = uuidv4();
    const apiKey = uuidv4();

    users.set(userId, {
      id: userId,
      username,
      email,
      password, // 实际应加密
      api_key: apiKey,
      created_at: new Date()
    });

    res.json({
      success: true,
      user_id: userId,
      api_key: apiKey
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * 注册机器人
 */
router.post('/robot/register', (req: Request, res: Response) => {
  try {
    const { api_key, name, personality } = req.body;

    if (!api_key || !name || !personality) {
      return res.status(400).json({ error: '缺少必填字段' });
    }

    // 查找用户
    let user: any = null;
    for (const [id, u] of users) {
      if (u.api_key === api_key) {
        user = u;
        break;
      }
    }

    if (!user) {
      return res.status(401).json({ error: '无效的API Key' });
    }

    const robotId = uuidv4();

    robots.set(robotId, {
      id: robotId,
      name,
      personality,
      user_id: user.id,
      level: 1,
      exp: 0,
      created_at: new Date()
    });

    res.json({
      success: true,
      robot_id: robotId,
      name,
      personality
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * 登录
 */
router.post('/login', (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    let user: any = null;
    for (const [id, u] of users) {
      if (u.email === email && u.password === password) {
        user = u;
        break;
      }
    }

    if (!user) {
      return res.status(401).json({ error: '邮箱或密码错误' });
    }

    res.json({
      success: true,
      user_id: user.id,
      api_key: user.api_key
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
