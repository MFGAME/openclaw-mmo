/**
 * 游戏性能优化器
 * 整合所有性能优化组件，提供统一的优化接口
 *
 * 功能：
 * - 帧率监控（FPS 显示）
 * - 渲染优化（脏矩形、图层合并）
 * - 资源预加载优化
 * - 内存管理（资源释放）
 * - 性能报告生成
 */

import { performanceMonitor, PerformanceStats, PerformanceWarning } from './PerformanceMonitor';
import { renderBatcher } from './RenderBatcher';
import { resourcePreloader } from './ResourcePreloader';
import { lodManager } from './LODManager';

/**
 * 性能优化级别
 */
export enum OptimizationLevel {
  /** 不优化 */
  NONE = 'none',
  /** 低优化（基础性能） */
  LOW = 'low',
  /** 中等优化（平衡性能和质量） */
  MEDIUM = 'medium',
  /** 高优化（优先性能） */
  HIGH = 'high',
  /** 极致优化（最低质量） */
  EXTREME = 'extreme',
}

/**
 * 脏矩形区域
 */
export interface DirtyRect {
  /** 区域 X 坐标 */
  x: number;
  /** 区域 Y 坐标 */
  y: number;
  /** 区域宽度 */
  width: number;
  /** 区域高度 */
  height: number;
  /** 最后更新时间戳 */
  timestamp: number;
}

/**
 * 内存使用统计
 */
export interface MemoryStats {
  /** 已使用内存 (MB) */
  used: number;
  /** 峰值内存 (MB) */
  peak: number;
  /** 可用内存 (MB) */
  available: number;
  /** 总内存 (MB) */
  total: number;
  /** 资源数量 */
  resourceCount: number;
  /** 缓存资源数量 */
  cachedResources: number;
}

/**
 * 性能优化器配置
 */
export interface PerformanceOptimizerConfig {
  /** 优化级别 */
  optimizationLevel: OptimizationLevel;

  /** 是否启用脏矩形优化 */
  enableDirtyRectangles: boolean;

  /** 脏矩形合并阈值（像素） */
  dirtyRectMergeThreshold: number;

  /** 是否启用渲染批处理 */
  enableRenderBatching: boolean;

  /** 是否启用 LOD */
  enableLOD: boolean;

  /** 是否启用内存自动清理 */
  enableAutoMemoryCleanup: boolean;

  /** 内存清理间隔（毫秒） */
  memoryCleanupInterval: number;

  /** 内存清理阈值 (MB) */
  memoryCleanupThreshold: number;

  /** 是否启用 FPS 限制 */
  enableFPSLimit: boolean;

  /** 目标 FPS */
  targetFPS: number;

  /** 是否显示性能面板 */
  showPerformancePanel: boolean;
}

/**
 * 性能报告
 */
export interface PerformanceReport {
  /** 报告生成时间 */
  timestamp: Date;

  /** 性能统计 */
  stats: PerformanceStats;

  /** 内存统计 */
  memory: MemoryStats;

  /** 优化级别 */
  optimizationLevel: OptimizationLevel;

  /** LOD 统计 */
  lodStats: any;

  /** 渲染批处理统计 */
  batchStats: any;

  /** 资源加载统计 */
  resourceStats: {
    total: number;
    loaded: number;
    loading: number;
    failed: number;
  };

  /** 性能警告级别 */
  warningLevel: PerformanceWarning;

  /** 优化建议 */
  suggestions: string[];
}

/**
 * 性能优化器类
 */
export class PerformanceOptimizer {
  private static instance: PerformanceOptimizer;

  /** 优化配置 */
  private config: PerformanceOptimizerConfig = {
    optimizationLevel: OptimizationLevel.MEDIUM,
    enableDirtyRectangles: true,
    dirtyRectMergeThreshold: 50,
    enableRenderBatching: true,
    enableLOD: true,
    enableAutoMemoryCleanup: true,
    memoryCleanupInterval: 30000, // 30 秒
    memoryCleanupThreshold: 300, // 300 MB
    enableFPSLimit: true,
    targetFPS: 60,
    showPerformancePanel: false,
  };

  /** 脏矩形集合 */
  private dirtyRectangles: DirtyRect[] = [];

  /** 渲染画布 */
  private canvas: HTMLCanvasElement | null = null;

  /** 脏矩形画布（用于缓存） */
  private dirtyCanvas: HTMLCanvasElement | null = null;

  /** 脏矩形上下文 */
  private dirtyCtx: CanvasRenderingContext2D | null = null;

  /** 内存清理定时器 */
  private memoryCleanupTimer: number | null = null;

  /** 资源引用计数 */
  private resourceReferences: Map<string, number> = new Map();

  /** 资源最后使用时间 */
  private resourceLastUsed: Map<string, number> = new Map();

  /** 性能历史记录 */
  private performanceHistory: PerformanceStats[] = [];

  /** 最大历史记录数量 */
  private readonly maxHistorySize = 100;

  /** 脏矩形合并次数 */
  private dirtyRectMergeCount = 0;

  /**
   * 私有构造函数，确保单例
   */
  private constructor() {}

  /**
   * 获取性能优化器单例实例
   */
  static getInstance(): PerformanceOptimizer {
    if (!PerformanceOptimizer.instance) {
      PerformanceOptimizer.instance = new PerformanceOptimizer();
    }
    return PerformanceOptimizer.instance;
  }

  /**
   * 初始化性能优化器
   * @param config 配置选项
   * @param canvas 渲染画布（用于脏矩形优化）
   */
  initialize(config?: Partial<PerformanceOptimizerConfig>, canvas?: HTMLCanvasElement): void {
    if (config) {
      this.config = { ...this.config, ...config };
    }

    this.canvas = canvas || null;

    // 初始化脏矩形缓存
    if (this.config.enableDirtyRectangles && this.canvas) {
      this.initDirtyRectCanvas();
    }

    // 初始化性能监控
    performanceMonitor.initialize({
      targetFps: this.config.targetFPS,
      enableMemoryMonitoring: true,
      enableAutoOptimization: this.config.enableAutoMemoryCleanup,
    });

    // 初始化渲染批处理
    if (this.config.enableRenderBatching) {
      renderBatcher.initialize({
        enabled: true,
        maxBatchSize: 1000,
        enableContextOptimization: true,
      });
    }

    // 初始化 LOD
    if (this.config.enableLOD && this.canvas) {
      lodManager.initialize({
        cameraX: 0,
        cameraY: 0,
        viewportWidth: this.canvas.width,
        viewportHeight: this.canvas.height,
        enableFrustumCulling: true,
        extendedArea: 100,
      });
    }

    // 启动内存清理定时器
    if (this.config.enableAutoMemoryCleanup) {
      this.startMemoryCleanup();
    }

    // 启用性能监控
    performanceMonitor.enable();

    // 显示性能面板
    if (this.config.showPerformancePanel) {
      performanceMonitor.showDebugPanel();
    }

    console.log('[PerformanceOptimizer] 性能优化器已初始化', this.config);
  }

  /**
   * 初始化脏矩形缓存画布
   */
  private initDirtyRectCanvas(): void {
    if (!this.canvas) return;

    this.dirtyCanvas = document.createElement('canvas');
    this.dirtyCanvas.width = this.canvas.width;
    this.dirtyCanvas.height = this.canvas.height;
    this.dirtyCtx = this.dirtyCanvas.getContext('2d');

    if (this.dirtyCtx) {
      // 将初始画面复制到缓存
      this.dirtyCtx.drawImage(this.canvas, 0, 0);
    }
  }

  /**
   * 标记脏矩形区域
   * @param x 区域 X 坐标
   * @param y 区域 Y 坐标
   * @param width 区域宽度
   * @param height 区域高度
   */
  markDirty(x: number, y: number, width: number, height: number): void {
    if (!this.config.enableDirtyRectangles) {
      return;
    }

    // 标准化矩形（确保宽高为正数）
    const normalizedRect: DirtyRect = {
      x: width < 0 ? x + width : x,
      y: height < 0 ? y + height : y,
      width: Math.abs(width),
      height: Math.abs(height),
      timestamp: performance.now(),
    };

    // 尝试合并到现有的脏矩形
    let merged = false;
    for (const rect of this.dirtyRectangles) {
      if (this.tryMergeRects(rect, normalizedRect)) {
        rect.timestamp = normalizedRect.timestamp;
        merged = true;
        this.dirtyRectMergeCount++;
        break;
      }
    }

    // 如果没有合并，添加新的脏矩形
    if (!merged) {
      this.dirtyRectangles.push(normalizedRect);
    }
  }

  /**
   * 尝试合并两个矩形
   */
  private tryMergeRects(rect1: DirtyRect, rect2: DirtyRect): boolean {
    const threshold = this.config.dirtyRectMergeThreshold;

    // 计算扩展后的边界
    const left1 = rect1.x - threshold;
    const right1 = rect1.x + rect1.width + threshold;
    const top1 = rect1.y - threshold;
    const bottom1 = rect1.y + rect1.height + threshold;

    const left2 = rect2.x - threshold;
    const right2 = rect2.x + rect2.width + threshold;
    const top2 = rect2.y - threshold;
    const bottom2 = rect2.y + rect2.height + threshold;

    // 检查是否重叠或接近
    const overlaps = !(
      right1 < left2 || left1 > right2 || bottom1 < top2 || top1 > bottom2
    );

    if (overlaps) {
      // 合并矩形
      const mergedX = Math.min(rect1.x, rect2.x);
      const mergedY = Math.min(rect1.y, rect2.y);
      const mergedWidth = Math.max(rect1.x + rect1.width, rect2.x + rect2.width) - mergedX;
      const mergedHeight = Math.max(rect1.y + rect1.height, rect2.y + rect2.height) - mergedY;

      rect1.x = mergedX;
      rect1.y = mergedY;
      rect1.width = mergedWidth;
      rect1.height = mergedHeight;

      return true;
    }

    return false;
  }

  /**
   * 清理过期的脏矩形
   */
  cleanupDirtyRectangles(): void {
    const now = performance.now();
    const expiryTime = 1000; // 1 秒

    this.dirtyRectangles = this.dirtyRectangles.filter(
      rect => now - rect.timestamp < expiryTime
    );
  }

  /**
   * 获取脏矩形区域（如果启用）
   * 返回 null 表示需要全屏重绘
   */
  getDirtyRectangles(): DirtyRect[] | null {
    if (!this.config.enableDirtyRectangles) {
      return null;
    }

    // 如果脏矩形太多，直接返回 null 全屏重绘
    if (this.dirtyRectangles.length > 20) {
      this.dirtyRectangles = [];
      return null;
    }

    return [...this.dirtyRectangles];
  }

  /**
   * 帧开始前调用
   */
  beginFrame(): void {
    performanceMonitor.beginUpdate();
    this.cleanupDirtyRectangles();
  }

  /**
   * 帧结束后调用
   */
  endFrame(): void {
    performanceMonitor.endUpdate();
    performanceMonitor.beginRender();
  }

  /**
   * 渲染完成后调用
   */
  endRender(): void {
    performanceMonitor.endRender();
    performanceMonitor.update();

    // 记录性能历史
    this.recordPerformanceHistory();

    // 清理脏矩形
    this.dirtyRectangles = [];
  }

  /**
   * 记录性能历史
   */
  private recordPerformanceHistory(): void {
    const stats = performanceMonitor.getStats();
    this.performanceHistory.push({ ...stats });

    // 限制历史记录大小
    if (this.performanceHistory.length > this.maxHistorySize) {
      this.performanceHistory.shift();
    }
  }

  /**
   * 获取资源
   * @param id 资源 ID
   */
  getResource<T = any>(id: string): T | null {
    const resource = resourcePreloader.getResource<T>(id);

    if (resource) {
      // 更新引用计数
      const count = this.resourceReferences.get(id) || 0;
      this.resourceReferences.set(id, count + 1);

      // 更新最后使用时间
      this.resourceLastUsed.set(id, performance.now());
    }

    return resource;
  }

  /**
   * 释放资源
   * @param id 资源 ID
   */
  releaseResource(id: string): void {
    const count = this.resourceReferences.get(id) || 0;
    if (count > 0) {
      this.resourceReferences.set(id, count - 1);
    }
  }

  /**
   * 启动自动内存清理
   */
  private startMemoryCleanup(): void {
    if (this.memoryCleanupTimer) {
      clearInterval(this.memoryCleanupTimer);
    }

    this.memoryCleanupTimer = window.setInterval(() => {
      this.cleanupMemory();
    }, this.config.memoryCleanupInterval);
  }

  /**
   * 停止内存清理
   */
  private stopMemoryCleanup(): void {
    if (this.memoryCleanupTimer) {
      clearInterval(this.memoryCleanupTimer);
      this.memoryCleanupTimer = null;
    }
  }

  /**
   * 清理内存
   */
  cleanupMemory(): void {
    const memoryStats = this.getMemoryStats();

    // 如果内存使用超过阈值，清理未使用的资源
    if (memoryStats.used > this.config.memoryCleanupThreshold) {
      this.cleanupUnusedResources();
    }
  }

  /**
   * 清理未使用的资源
   */
  private cleanupUnusedResources(): void {
    const now = performance.now();
    const inactiveTime = 60000; // 60 秒未使用的资源

    let cleanedCount = 0;

    for (const [id, lastUsed] of this.resourceLastUsed.entries()) {
      // 检查是否长时间未使用
      if (now - lastUsed > inactiveTime) {
        const refCount = this.resourceReferences.get(id) || 0;

        // 如果没有被引用，卸载资源
        if (refCount === 0) {
          resourcePreloader.unloadResource(id);
          this.resourceLastUsed.delete(id);
          this.resourceReferences.delete(id);
          cleanedCount++;
        }
      }
    }

    if (cleanedCount > 0) {
      console.log(`[PerformanceOptimizer] 清理了 ${cleanedCount} 个未使用的资源`);
    }
  }

  /**
   * 获取内存统计
   */
  getMemoryStats(): MemoryStats {
    const perf = performanceMonitor.getStats();
    const stats: MemoryStats = {
      used: perf.memoryUsage,
      peak: perf.memoryPeak,
      available: 0, // 浏览器中无法准确获取
      total: 0, // 浏览器中无法准确获取
      resourceCount: this.resourceReferences.size,
      cachedResources: resourcePreloader.getProgress().total,
    };

    return stats;
  }

  /**
   * 更新相机位置（用于 LOD）
   * @param x 相机 X 位置
   * @param y 相机 Y 位置
   */
  updateCamera(x: number, y: number): void {
    if (this.config.enableLOD) {
      lodManager.updateCamera(x, y);
    }
  }

  /**
   * 更新 LOD（在每帧调用）
   */
  updateLOD(): void {
    if (this.config.enableLOD) {
      lodManager.update();
    }
  }

  /**
   * 设置优化级别
   * @param level 优化级别
   */
  setOptimizationLevel(level: OptimizationLevel): void {
    this.config.optimizationLevel = level;

    // 根据级别调整配置
    switch (level) {
      case OptimizationLevel.NONE:
        this.config.enableDirtyRectangles = false;
        this.config.enableRenderBatching = false;
        this.config.enableLOD = false;
        this.config.targetFPS = 0; // 不限制 FPS
        break;

      case OptimizationLevel.LOW:
        this.config.enableDirtyRectangles = false;
        this.config.enableRenderBatching = true;
        this.config.enableLOD = false;
        this.config.targetFPS = 0;
        break;

      case OptimizationLevel.MEDIUM:
        this.config.enableDirtyRectangles = true;
        this.config.enableRenderBatching = true;
        this.config.enableLOD = true;
        this.config.targetFPS = 60;
        break;

      case OptimizationLevel.HIGH:
        this.config.enableDirtyRectangles = true;
        this.config.enableRenderBatching = true;
        this.config.enableLOD = true;
        this.config.targetFPS = 30;
        break;

      case OptimizationLevel.EXTREME:
        this.config.enableDirtyRectangles = true;
        this.config.enableRenderBatching = true;
        this.config.enableLOD = true;
        this.config.targetFPS = 20;
        break;
    }

    // 更新 LOD 区域
    if (this.config.enableLOD) {
      const highDist = level === OptimizationLevel.EXTREME ? 200 : 300;
      const mediumDist = level === OptimizationLevel.EXTREME ? 400 : 600;
      const lowDist = level === OptimizationLevel.EXTREME ? 600 : 1200;

      lodManager.setRegions([
        { name: 'high', level: 'high' as any, distance: highDist },
        { name: 'medium', level: 'medium' as any, distance: mediumDist },
        { name: 'low', level: 'low' as any, distance: lowDist },
      ]);
    }

    console.log(`[PerformanceOptimizer] 优化级别设置为: ${level}`);
  }

  /**
   * 获取优化级别
   */
  getOptimizationLevel(): OptimizationLevel {
    return this.config.optimizationLevel;
  }

  /**
   * 切换性能面板显示
   */
  togglePerformancePanel(): void {
    this.config.showPerformancePanel = !this.config.showPerformancePanel;

    if (this.config.showPerformancePanel) {
      performanceMonitor.showDebugPanel();
    } else {
      performanceMonitor.hideDebugPanel();
    }
  }

  /**
   * 生成性能报告
   */
  generateReport(): PerformanceReport {
    const stats = performanceMonitor.getStats();
    const memory = this.getMemoryStats();
    const lodStats = lodManager.getStats();
    const batchStats = renderBatcher.getStats();
    const resourceProgress = resourcePreloader.getProgress();

    // 计算资源加载统计
    const resourceStats = {
      total: resourceProgress.total,
      loaded: resourceProgress.loaded,
      loading: resourceProgress.total - resourceProgress.loaded,
      failed: 0, // 需要从 ResourcePreloader 获取
    };

    const suggestions = performanceMonitor.getOptimizationSuggestions();

    const report: PerformanceReport = {
      timestamp: new Date(),
      stats,
      memory,
      optimizationLevel: this.config.optimizationLevel,
      lodStats,
      batchStats,
      resourceStats,
      warningLevel: performanceMonitor.getWarningLevel(),
      suggestions,
    };

    return report;
  }

  /**
   * 获取性能报告文本
   */
  getReportText(): string {
    const report = this.generateReport();

    return `
=== 性能优化报告 ===
生成时间: ${report.timestamp.toLocaleString('zh-CN')}

【性能统计】
FPS: ${report.stats.fps.toFixed(1)} / ${this.config.targetFPS} (平均: ${report.stats.avgFps.toFixed(1)})
帧时间: ${report.stats.frameTime.toFixed(2)}ms (平均: ${report.stats.avgFrameTime.toFixed(2)}ms)
更新时间: ${report.stats.updateTime.toFixed(2)}ms
渲染时间: ${report.stats.renderTime.toFixed(2)}ms
总时间: ${report.stats.totalTime.toFixed(2)}ms

【内存统计】
已使用: ${report.memory.used.toFixed(1)} MB
峰值: ${report.memory.peak.toFixed(1)} MB
资源数量: ${report.memory.resourceCount}
缓存资源: ${report.memory.cachedResources}

【优化设置】
优化级别: ${report.optimizationLevel.toUpperCase()}
脏矩形优化: ${this.config.enableDirtyRectangles ? '启用' : '禁用'}
渲染批处理: ${this.config.enableRenderBatching ? '启用' : '禁用'}
LOD: ${this.config.enableLOD ? '启用' : '禁用'}
自动内存清理: ${this.config.enableAutoMemoryCleanup ? '启用' : '禁用'}

【LOD 统计】
总对象: ${report.lodStats.total}
可见对象: ${report.lodStats.visible}
高细节: ${report.lodStats.highDetail}
中细节: ${report.lodStats.mediumDetail}
低细节: ${report.lodStats.lowDetail}
已剔除: ${report.lodStats.culled}

【渲染批处理】
总操作数: ${report.batchStats.operations}
批次数: ${report.batchStats.batches}
Draw Call: ${report.batchStats.drawCalls}
上下文状态变更: ${report.batchStats.contextStateChanges}

【资源统计】
总资源: ${report.resourceStats.total}
已加载: ${report.resourceStats.loaded}
加载中: ${report.resourceStats.loading}
失败: ${report.resourceStats.failed}

【警告级别】
${report.warningLevel.toUpperCase()}

${report.suggestions.length > 0 ? `【优化建议】\n${report.suggestions.map((s: string) => `• ${s}`).join('\n')}` : ''}
`.trim();
  }

  /**
   * 导出性能报告到 JSON
   */
  exportReport(): string {
    const report = this.generateReport();
    return JSON.stringify(report, null, 2);
  }

  /**
   * 下载性能报告
   */
  downloadReport(): void {
    const reportText = this.exportReport();
    const blob = new Blob([reportText], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `performance-report-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    URL.revokeObjectURL(url);

    console.log('[PerformanceOptimizer] 性能报告已下载');
  }

  /**
   * 重置统计信息
   */
  resetStats(): void {
    performanceMonitor.resetStats();
    this.performanceHistory = [];
    this.dirtyRectMergeCount = 0;

    console.log('[PerformanceOptimizer] 统计信息已重置');
  }

  /**
   * 销毁优化器
   */
  destroy(): void {
    this.stopMemoryCleanup();

    if (this.dirtyCanvas) {
      this.dirtyCanvas.remove();
      this.dirtyCanvas = null;
      this.dirtyCtx = null;
    }

    this.dirtyRectangles = [];
    this.resourceReferences.clear();
    this.resourceLastUsed.clear();
    this.performanceHistory = [];

    performanceMonitor.destroy();

    console.log('[PerformanceOptimizer] 性能优化器已销毁');
  }
}

/**
 * 导出性能优化器单例
 */
export const performanceOptimizer = PerformanceOptimizer.getInstance();
