/**
 * A* 寻路算法实现
 *
 * 用于在网格地图中查找最短路径
 */

import { collisionManager } from './CollisionManager';

/**
 * 节点接口
 */
interface PathNode {
  /** X 坐标 */
  x: number;
  /** Y 坐标 */
  y: number;
  /** G 值：从起点到当前节点的实际代价 */
  g: number;
  /** H 值：从当前节点到终点的估计代价（启发式） */
  h: number;
  /** F 值：G + H，总代价 */
  f: number;
  /** 父节点 */
  parent: PathNode | null;
}

/**
 * 路径点接口
 */
export interface PathPoint {
  /** X 坐标 */
  x: number;
  /** Y 坐标 */
  y: number;
  /** 停留时间（毫秒） */
  waitTime?: number;
}

/**
 * 寻路器配置
 */
export interface PathfinderConfig {
  /** 允许对角线移动 */
  allowDiagonal: boolean;
  /** 对角线移动代价 */
  diagonalCost: number;
  /** 直线移动代价 */
  straightCost: number;
  /** 最大搜索步数 */
  maxIterations: number;
}

/**
 * A* 寻路器
 */
export class Pathfinder {
  private static instance: Pathfinder;

  /** 寻路配置 */
  private config: PathfinderConfig;

  /** 开放列表（待评估的节点） */
  private openList: PathNode[] = [];

  /** 关闭列表（已评估的节点） */
  private closedList: Map<string, boolean> = new Map();

  /**
   * 私有构造函数
   */
  private constructor() {
    this.config = {
      allowDiagonal: true,
      diagonalCost: 1.414, // √2
      straightCost: 1.0,
      maxIterations: 10000,
    };
  }

  /**
   * 获取单例实例
   */
  static getInstance(): Pathfinder {
    if (!Pathfinder.instance) {
      Pathfinder.instance = new Pathfinder();
    }
    return Pathfinder.instance;
  }

  /**
   * 配置寻路器
   */
  configure(config: Partial<PathfinderConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 查找路径
   * @param startX 起点 X 坐标
   * @param startY 起点 Y 坐标
   * @param endX 终点 X 坐标
   * @param endY 终点 Y 坐标
   * @returns 路径点数组，如果没有路径返回空数组
   */
  findPath(startX: number, startY: number, endX: number, endY: number): PathPoint[] {
    // 重置状态
    this.openList = [];
    this.closedList.clear();

    // 创建起始节点
    const startNode: PathNode = {
      x: startX,
      y: startY,
      g: 0,
      h: this.calculateHeuristic(startX, startY, endX, endY),
      f: 0,
      parent: null,
    };
    startNode.f = startNode.g + startNode.h;

    // 将起始节点加入开放列表
    this.openList.push(startNode);

    let iterations = 0;

    // 开始 A* 搜索
    while (this.openList.length > 0 && iterations < this.config.maxIterations) {
      iterations++;

      // 从开放列表中获取 F 值最小的节点
      const currentIndex = this.getLowestFIndex();
      const currentNode = this.openList[currentIndex];

      // 将当前节点移出开放列表
      this.openList.splice(currentIndex, 1);

      // 将当前节点加入关闭列表
      this.closedList.set(this.getNodeKey(currentNode.x, currentNode.y), true);

      // 检查是否到达终点
      if (currentNode.x === endX && currentNode.y === endY) {
        return this.reconstructPath(currentNode);
      }

      // 获取相邻节点
      const neighbors = this.getNeighbors(currentNode);

      // 处理每个相邻节点
      for (const neighbor of neighbors) {
        // 如果节点已在关闭列表中，跳过
        if (this.closedList.has(this.getNodeKey(neighbor.x, neighbor.y))) {
          continue;
        }

        // 计算新的 G 值
        const movementCost = this.getMovementCost(currentNode, neighbor);
        const newG = currentNode.g + movementCost;

        // 检查节点是否已在开放列表中
        const existingNodeIndex = this.openList.findIndex(
          node => node.x === neighbor.x && node.y === neighbor.y
        );

        if (existingNodeIndex === -1) {
          // 节点不在开放列表中，添加新节点
          neighbor.g = newG;
          neighbor.h = this.calculateHeuristic(neighbor.x, neighbor.y, endX, endY);
          neighbor.f = neighbor.g + neighbor.h;
          neighbor.parent = currentNode;
          this.openList.push(neighbor);
        } else {
          // 节点已在开放列表中，检查是否找到更好的路径
          const existingNode = this.openList[existingNodeIndex];
          if (newG < existingNode.g) {
            existingNode.g = newG;
            existingNode.f = existingNode.g + existingNode.h;
            existingNode.parent = currentNode;
          }
        }
      }
    }

    // 未找到路径
    console.warn(`[Pathfinder] Path not found after ${iterations} iterations`);
    return [];
  }

  /**
   * 获取相邻节点
   */
  private getNeighbors(node: PathNode): PathNode[] {
    const neighbors: PathNode[] = [];

    // 定义方向偏移（上下左右）
    const directions = [
      { dx: 0, dy: -1 }, // 上
      { dx: 0, dy: 1 },  // 下
      { dx: -1, dy: 0 }, // 左
      { dx: 1, dy: 0 },  // 右
    ];

    // 如果允许对角线移动，添加对角线方向
    if (this.config.allowDiagonal) {
      directions.push(
        { dx: -1, dy: -1 }, // 左上
        { dx: 1, dy: -1 },  // 右上
        { dx: -1, dy: 1 },  // 左下
        { dx: 1, dy: 1 }    // 右下
      );
    }

    // 检查每个方向
    for (const dir of directions) {
      const newX = node.x + dir.dx;
      const newY = node.y + dir.dy;

      // 检查新位置是否可通行
      if (this.isWalkable(newX, newY, node.x, node.y)) {
        neighbors.push({
          x: newX,
          y: newY,
          g: 0,
          h: 0,
          f: 0,
          parent: null,
        });
      }
    }

    return neighbors;
  }

  /**
   * 检查位置是否可通行
   * @param x 目标 X 坐标
   * @param y 目标 Y 坐标
   * @param fromX 来源 X 坐标（用于对角线检测）
   * @param fromY 来源 Y 坐标（用于对角线检测）
   */
  private isWalkable(x: number, y: number, fromX: number, fromY: number): boolean {
    // 检查碰撞
    if (collisionManager.isTileSolid(x, y)) {
      return false;
    }

    // 如果是对角线移动，检查是否被"墙角"阻挡
    const isDiagonal = x !== fromX && y !== fromY;
    if (isDiagonal) {
      // 检查两个相邻的直角位置是否都可通行
      if (collisionManager.isTileSolid(x, fromY) || collisionManager.isTileSolid(fromX, y)) {
        return false;
      }
    }

    return true;
  }

  /**
   * 计算启发式值（使用曼哈顿距离）
   */
  private calculateHeuristic(x1: number, y1: number, x2: number, y2: number): number {
    return Math.abs(x1 - x2) + Math.abs(y1 - y2);
  }

  /**
   * 获取移动代价
   */
  private getMovementCost(from: PathNode, to: PathNode): number {
    // 对角线移动
    if (from.x !== to.x && from.y !== to.y) {
      return this.config.diagonalCost;
    }
    // 直线移动
    return this.config.straightCost;
  }

  /**
   * 获取开放列表中 F 值最小的节点索引
   */
  private getLowestFIndex(): number {
    let lowestIndex = 0;
    let lowestF = this.openList[0].f;

    for (let i = 1; i < this.openList.length; i++) {
      if (this.openList[i].f < lowestF) {
        lowestF = this.openList[i].f;
        lowestIndex = i;
      }
    }

    return lowestIndex;
  }

  /**
   * 重建路径
   */
  private reconstructPath(endNode: PathNode): PathPoint[] {
    const path: PathPoint[] = [];
    let currentNode: PathNode | null = endNode;

    // 从终点回溯到起点
    while (currentNode !== null) {
      path.unshift({
        x: currentNode.x,
        y: currentNode.y,
      });
      currentNode = currentNode.parent;
    }

    return path;
  }

  /**
   * 获取节点键（用于关闭列表）
   */
  private getNodeKey(x: number, y: number): string {
    return `${x},${y}`;
  }

  /**
   * 检查两个位置是否直接可达（不需要寻路）
   */
  isDirectlyReachable(
    fromX: number,
    fromY: number,
    toX: number,
    toY: number
  ): boolean {
    const dx = Math.abs(toX - fromX);
    const dy = Math.abs(toY - fromY);

    // 只能移动一格
    if (dx > 1 || dy > 1) {
      return false;
    }

    // 检查目标位置是否可通行
    return this.isWalkable(toX, toY, fromX, fromY);
  }
}

/**
 * 导出寻路器单例
 */
export const pathfinder = Pathfinder.getInstance();
