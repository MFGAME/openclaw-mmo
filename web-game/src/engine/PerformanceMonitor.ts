/**
 * 性能监控器
 * 负责监控游戏运行时的性能指标，包括帧率、帧时间、内存使用、网络延迟等
 */

/**
 * 性能统计数据
 */
export interface PerformanceStats {
    /** 当前帧率 (FPS) */
    fps: number;

    /** 平均帧率 */
    avgFps: number;

    /** 当前帧时间 (毫秒) */
    frameTime: number;

    /** 平均帧时间 */
    avgFrameTime: number;

    /** 最小帧时间 */
    minFrameTime: number;

    /** 最大帧时间 */
    maxFrameTime: number;

    /** 内存使用 (MB) */
    memoryUsage: number;

    /** 内存峰值 (MB) */
    memoryPeak: number;

    /** 渲染对象数量 */
    renderCount: number;

    /** 活跃对象数量 */
    activeObjects: number;

    /** 更新时间 (毫秒) */
    updateTime: number;

    /** 渲染时间 (毫秒) */
    renderTime: number;

    /** 总时间 (毫秒) */
    totalTime: number;

    /** 网络延迟 (毫秒) */
    networkLatency: number;

    /** 平均网络延迟 (毫秒) */
    avgNetworkLatency: number;

    /** 网络延迟历史记录 */
    networkLatencyHistory: number[];

    /** 网络状态 */
    networkStatus: 'online' | 'offline' | 'unknown';
}

/**
 * 性能警告级别
 */
export enum PerformanceWarning {
    /** 无警告 */
    NONE = 'none',

    /** 性能良好 */
    GOOD = 'good',

    /** 性能一般 */
    FAIR = 'fair',

    /** 性能警告 */
    WARNING = 'warning',

    /** 性能严重警告 */
    CRITICAL = 'critical',
}

/**
 * 性能配置选项
 */
export interface PerformanceConfig {
    /** 目标帧率 */
    targetFps: number;

    /** 良好帧率阈值 */
    goodFpsThreshold: number;

    /** 警告帧率阈值 */
    warningFpsThreshold: number;

    /** 严重警告帧率阈值 */
    criticalFpsThreshold: number;

    /** 内存警告阈值 (MB) */
    memoryWarningThreshold: number;

    /** 帧时间统计窗口大小 */
    frameTimeWindow: number;

    /** 是否启用内存监控 */
    enableMemoryMonitoring: boolean;

    /** 是否启用自动优化建议 */
    enableAutoOptimization: boolean;
}

/**
 * 性能监控器
 */
export class PerformanceMonitor {
    private static instance: PerformanceMonitor;

    /** 性能配置 */
    private config: PerformanceConfig = {
        targetFps: 60,
        goodFpsThreshold: 55,
        warningFpsThreshold: 45,
        criticalFpsThreshold: 30,
        memoryWarningThreshold: 500,
        frameTimeWindow: 60,
        enableMemoryMonitoring: true,
        enableAutoOptimization: false,
    };

    /** 性能统计数据 */
    private stats: PerformanceStats = {
        fps: 0,
        avgFps: 0,
        frameTime: 0,
        avgFrameTime: 0,
        minFrameTime: Infinity,
        maxFrameTime: 0,
        memoryUsage: 0,
        memoryPeak: 0,
        renderCount: 0,
        activeObjects: 0,
        updateTime: 0,
        renderTime: 0,
        totalTime: 0,
        networkLatency: 0,
        avgNetworkLatency: 0,
        networkLatencyHistory: [],
        networkStatus: 'unknown',
    };

    /** 帧时间历史记录 */
    private frameTimeHistory: number[] = [];

    /** FPS 历史记录 */
    private fpsHistory: number[] = [];

    /** 内存使用历史记录 */
    private memoryHistory: number[] = [];

    /** 性能警告级别 */
    private warningLevel: PerformanceWarning = PerformanceWarning.NONE;

    /** 上一帧时间戳 */
    private lastFrameTime: number = 0;

    /** FPS 计数器 */
    private fpsCount: number = 0;

    /** FPS 计时器 */
    private fpsTimer: number = 0;

    /** 更新开始时间 */
    private updateStartTime: number = 0;

    /** 渲染开始时间 */
    private renderStartTime: number = 0;

    /** 是否启用 */
    private enabled: boolean = false;

    /** 调试面板是否显示 */
    private debugPanelVisible: boolean = false;

    /** 调试面板元素 */
    private debugPanel: HTMLElement | null = null;

    /** 优化建议列表 */
    private optimizationSuggestions: string[] = [];

    /** 网络延迟监控间隔（毫秒） */
    private networkPingInterval: number = 5000;

    /** Ping 测试 URL */
    private pingUrl: string = window.location.origin;

    /** 网络监控定时器 ID */
    private networkMonitorTimer: number | null = null;

    /**
     * 私有构造函数，确保单例
     */
    private constructor() {}

    /**
     * 获取性能监控器单例实例
     */
    static getInstance(): PerformanceMonitor {
        if (!PerformanceMonitor.instance) {
            PerformanceMonitor.instance = new PerformanceMonitor();
        }
        return PerformanceMonitor.instance;
    }

    /**
     * 初始化性能监控器
     * @param config 性能配置选项
     */
    initialize(config?: Partial<PerformanceConfig>): void {
        if (config) {
            this.config = { ...this.config, ...config };
        }

        this.enabled = true;
        this.lastFrameTime = performance.now();
        this.startNetworkMonitoring();
        console.log('[PerformanceMonitor] 性能监控器已初始化', this.config);
    }

    /**
     * 开始更新阶段计时
     */
    beginUpdate(): void {
        if (!this.enabled) return;
        this.updateStartTime = performance.now();
    }

    /**
     * 结束更新阶段计时
     */
    endUpdate(): void {
        if (!this.enabled) return;
        this.stats.updateTime = performance.now() - this.updateStartTime;
    }

    /**
     * 开始渲染阶段计时
     */
    beginRender(): void {
        if (!this.enabled) return;
        this.renderStartTime = performance.now();
    }

    /**
     * 结束渲染阶段计时
     */
    endRender(): void {
        if (!this.enabled) return;
        this.stats.renderTime = performance.now() - this.renderStartTime;
    }

    /**
     * 更新性能统计
     * 应该在每帧结束时调用
     */
    update(): void {
        if (!this.enabled) return;

        const currentTime = performance.now();
        const frameTime = currentTime - this.lastFrameTime;
        this.lastFrameTime = currentTime;

        // 计算帧时间
        this.stats.frameTime = frameTime;
        this.stats.minFrameTime = Math.min(this.stats.minFrameTime, frameTime);
        this.stats.maxFrameTime = Math.max(this.stats.maxFrameTime, frameTime);

        // 更新帧时间历史
        this.frameTimeHistory.push(frameTime);
        if (this.frameTimeHistory.length > this.config.frameTimeWindow) {
            this.frameTimeHistory.shift();
        }

        // 计算平均帧时间
        this.stats.avgFrameTime = this.frameTimeHistory.reduce((a, b) => a + b, 0) / this.frameTimeHistory.length;

        // 计算 FPS
        this.fpsCount++;
        this.fpsTimer += frameTime;

        if (this.fpsTimer >= 1000) {
            this.stats.fps = this.fpsCount;
            this.fpsHistory.push(this.stats.fps);
            if (this.fpsHistory.length > this.config.frameTimeWindow) {
                this.fpsHistory.shift();
            }
            this.stats.avgFps = this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length;
            this.fpsCount = 0;
            this.fpsTimer = 0;

            // 更新警告级别
            this.updateWarningLevel();

            // 监控内存
            if (this.config.enableMemoryMonitoring) {
                this.monitorMemory();
            }
        }

        // 计算总时间
        this.stats.totalTime = this.stats.updateTime + this.stats.renderTime;

        // 自动优化
        if (this.config.enableAutoOptimization) {
            this.checkOptimizationNeeds();
        }
    }

    /**
     * 监控内存使用
     */
    private monitorMemory(): void {
        // 使用 Performance API 获取内存信息（Chrome 支持）
        if (typeof (performance as any).memory !== 'undefined') {
            const memory = (performance as any).memory;
            const usageMB = memory.usedJSHeapSize / 1024 / 1024;

            this.stats.memoryUsage = usageMB;
            this.stats.memoryPeak = Math.max(this.stats.memoryPeak, usageMB);

            this.memoryHistory.push(usageMB);
            if (this.memoryHistory.length > this.config.frameTimeWindow) {
                this.memoryHistory.shift();
            }
        } else {
            // 估算内存使用
            this.stats.memoryUsage = 0;
        }
    }

    /**
     * 更新警告级别
     */
    private updateWarningLevel(): void {
        const fps = this.stats.fps;

        if (fps >= this.config.goodFpsThreshold) {
            this.warningLevel = PerformanceWarning.GOOD;
        } else if (fps >= this.config.warningFpsThreshold) {
            this.warningLevel = PerformanceWarning.FAIR;
        } else if (fps >= this.config.criticalFpsThreshold) {
            this.warningLevel = PerformanceWarning.WARNING;
        } else {
            this.warningLevel = PerformanceWarning.CRITICAL;
        }
    }

    /**
     * 检查是否需要优化
     */
    private checkOptimizationNeeds(): void {
        this.optimizationSuggestions = [];

        // 检查帧率
        if (this.stats.fps < this.config.warningFpsThreshold) {
            this.optimizationSuggestions.push('帧率较低，建议减少渲染对象数量');
        }

        // 检查内存使用
        if (this.stats.memoryUsage > this.config.memoryWarningThreshold) {
            this.optimizationSuggestions.push('内存使用较高，建议清理未使用的资源');
        }

        // 检查帧时间波动
        const frameTimeVariance = this.calculateVariance(this.frameTimeHistory);
        if (frameTimeVariance > 10) {
            this.optimizationSuggestions.push('帧时间波动较大，建议优化更新逻辑');
        }
    }

    /**
     * 计算数组方差
     */
    private calculateVariance(values: number[]): number {
        if (values.length === 0) return 0;

        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const variance = values.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / values.length;

        return variance;
    }

    /**
     * 设置渲染对象数量
     */
    setRenderCount(count: number): void {
        this.stats.renderCount = count;
    }

    /**
     * 设置活跃对象数量
     */
    setActiveObjects(count: number): void {
        this.stats.activeObjects = count;
    }

    /**
     * 获取性能统计数据
     */
    getStats(): PerformanceStats {
        return { ...this.stats };
    }

    /**
     * 获取警告级别
     */
    getWarningLevel(): PerformanceWarning {
        return this.warningLevel;
    }

    /**
     * 获取优化建议
     */
    getOptimizationSuggestions(): string[] {
        return [...this.optimizationSuggestions];
    }

    /**
     * 获取帧率历史
     */
    getFpsHistory(): number[] {
        return [...this.fpsHistory];
    }

    /**
     * 获取帧时间历史
     */
    getFrameTimeHistory(): number[] {
        return [...this.frameTimeHistory];
    }

    /**
     * 获取内存历史
     */
    getMemoryHistory(): number[] {
        return [...this.memoryHistory];
    }

    /**
     * 重置统计数据
     */
    resetStats(): void {
        this.stats = {
            fps: 0,
            avgFps: 0,
            frameTime: 0,
            avgFrameTime: 0,
            minFrameTime: Infinity,
            maxFrameTime: 0,
            memoryUsage: 0,
            memoryPeak: 0,
            renderCount: 0,
            activeObjects: 0,
            updateTime: 0,
            renderTime: 0,
            totalTime: 0,
            networkLatency: 0,
            avgNetworkLatency: 0,
            networkLatencyHistory: [],
            networkStatus: 'unknown',
        };

        this.frameTimeHistory = [];
        this.fpsHistory = [];
        this.memoryHistory = [];
        this.optimizationSuggestions = [];
        this.warningLevel = PerformanceWarning.NONE;

        console.log('[PerformanceMonitor] 统计数据已重置');
    }

    /**
     * 启用性能监控
     */
    enable(): void {
        this.enabled = true;
        this.lastFrameTime = performance.now();
        console.log('[PerformanceMonitor] 性能监控已启用');
    }

    /**
     * 禁用性能监控
     */
    disable(): void {
        this.enabled = false;
        this.stopNetworkMonitoring();
        console.log('[PerformanceMonitor] 性能监控已禁用');
    }

    /**
     * 检查是否启用
     */
    isEnabled(): boolean {
        return this.enabled;
    }

    /**
     * 显示调试面板
     */
    showDebugPanel(): void {
        if (this.debugPanelVisible) return;

        this.debugPanelVisible = true;
        this.createDebugPanel();
    }

    /**
     * 隐藏调试面板
     */
    hideDebugPanel(): void {
        if (!this.debugPanelVisible) return;

        this.debugPanelVisible = false;
        if (this.debugPanel) {
            this.debugPanel.remove();
            this.debugPanel = null;
        }
    }

    /**
     * 切换调试面板显示状态
     */
    toggleDebugPanel(): void {
        if (this.debugPanelVisible) {
            this.hideDebugPanel();
        } else {
            this.showDebugPanel();
        }
    }

    /**
     * 创建调试面板
     */
    private createDebugPanel(): void {
        // 移除现有面板
        if (this.debugPanel) {
            this.debugPanel.remove();
        }

        // 创建面板元素
        const panel = document.createElement('div');
        panel.id = 'performance-debug-panel';
        panel.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            width: 320px;
            background: rgba(0, 0, 0, 0.85);
            color: #0f0;
            font-family: monospace;
            font-size: 12px;
            padding: 15px;
            border-radius: 8px;
            z-index: 10000;
            border: 1px solid #0f0;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
            user-select: none;
        `;

        this.debugPanel = panel;
        document.body.appendChild(panel);

        // 更新面板内容
        this.updateDebugPanel();

        // 定期更新面板
        setInterval(() => {
            if (this.debugPanelVisible) {
                this.updateDebugPanel();
            }
        }, 100);
    }

    /**
     * 更新调试面板内容
     */
    private updateDebugPanel(): void {
        if (!this.debugPanel) return;

        const warningColors: Record<PerformanceWarning, string> = {
            [PerformanceWarning.NONE]: '#0f0',
            [PerformanceWarning.GOOD]: '#0f0',
            [PerformanceWarning.FAIR]: '#ff0',
            [PerformanceWarning.WARNING]: '#fa0',
            [PerformanceWarning.CRITICAL]: '#f00',
        };

        const warningColor = warningColors[this.warningLevel];

        const html = `
            <div style="font-weight: bold; margin-bottom: 10px; color: ${warningColor}">
                === 性能监控 ===
            </div>
            <div style="margin-bottom: 8px;">
                <span style="color: #888;">FPS:</span>
                <span style="color: ${warningColor}; margin-left: 8px;">${this.stats.fps.toFixed(1)} / ${this.config.targetFps}</span>
                <span style="color: #888; margin-left: 8px;">(平均: ${this.stats.avgFps.toFixed(1)})</span>
            </div>
            <div style="margin-bottom: 8px;">
                <span style="color: #888;">帧时间:</span>
                <span style="margin-left: 8px;">${this.stats.frameTime.toFixed(2)}ms</span>
                <span style="color: #888; margin-left: 8px;">(平均: ${this.stats.avgFrameTime.toFixed(2)}ms)</span>
            </div>
            <div style="margin-bottom: 8px;">
                <span style="color: #888;">更新:</span>
                <span style="margin-left: 8px;">${this.stats.updateTime.toFixed(2)}ms</span>
            </div>
            <div style="margin-bottom: 8px;">
                <span style="color: #888;">渲染:</span>
                <span style="margin-left: 8px;">${this.stats.renderTime.toFixed(2)}ms</span>
            </div>
            <div style="margin-bottom: 8px;">
                <span style="color: #888;">总计:</span>
                <span style="margin-left: 8px;">${this.stats.totalTime.toFixed(2)}ms</span>
            </div>
            <div style="margin-bottom: 8px;">
                <span style="color: #888;">内存:</span>
                <span style="margin-left: 8px;">${this.stats.memoryUsage.toFixed(1)} MB</span>
                <span style="color: #888; margin-left: 8px;">(峰值: ${this.stats.memoryPeak.toFixed(1)} MB)</span>
            </div>
            <div style="margin-bottom: 8px;">
                <span style="color: #888;">渲染对象:</span>
                <span style="margin-left: 8px;">${this.stats.renderCount}</span>
            </div>
            <div style="margin-bottom: 8px;">
                <span style="color: #888;">活跃对象:</span>
                <span style="margin-left: 8px;">${this.stats.activeObjects}</span>
            </div>
            <div style="margin-bottom: 8px;">
                <span style="color: #888;">网络延迟:</span>
                <span style="color: ${this.stats.networkStatus === 'online' ? '#0f0' : '#f00'}; margin-left: 8px;">${this.stats.networkLatency > 0 ? this.stats.networkLatency.toFixed(1) + 'ms' : '检测中'}</span>
                <span style="color: #888; margin-left: 8px;">(平均: ${this.stats.avgNetworkLatency.toFixed(1)}ms)</span>
            </div>
            <div style="margin-bottom: 8px;">
                <span style="color: #888;">网络状态:</span>
                <span style="color: ${this.stats.networkStatus === 'online' ? '#0f0' : '#f00'}; margin-left: 8px;">${this.stats.networkStatus.toUpperCase()}</span>
            </div>
            <div style="margin-bottom: 8px;">
                <span style="color: #888;">警告级别:</span>
                <span style="color: ${warningColor}; margin-left: 8px;">${this.warningLevel.toUpperCase()}</span>
            </div>
            ${this.optimizationSuggestions.length > 0 ? `
                <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #333;">
                    <div style="color: #fa0; font-weight: bold; margin-bottom: 5px;">优化建议:</div>
                    ${this.optimizationSuggestions.map(s => `<div style="margin-bottom: 3px;">• ${s}</div>`).join('')}
                </div>
            ` : ''}
            <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #333; color: #888;">
                按 F2 键关闭面板 | 按 E 键导出数据
            </div>
        `;

        this.debugPanel.innerHTML = html;
    }

    /**
     * 获取性能报告
     */
    getReport(): string {
        const stats = this.stats;
        return `
=== 性能报告 ===
帧率: ${stats.fps.toFixed(1)} FPS (平均: ${stats.avgFps.toFixed(1)} FPS)
帧时间: ${stats.frameTime.toFixed(2)}ms (平均: ${stats.avgFrameTime.toFixed(2)}ms)
更新时间: ${stats.updateTime.toFixed(2)}ms
渲染时间: ${stats.renderTime.toFixed(2)}ms
内存使用: ${stats.memoryUsage.toFixed(1)} MB (峰值: ${stats.memoryPeak.toFixed(1)} MB)
网络延迟: ${stats.networkLatency.toFixed(1)}ms (平均: ${stats.avgNetworkLatency.toFixed(1)}ms)
网络状态: ${stats.networkStatus.toUpperCase()}
渲染对象: ${stats.renderCount}
活跃对象: ${stats.activeObjects}
警告级别: ${this.warningLevel.toUpperCase()}
        `.trim();
    }

    /**
     * 启动网络延迟监控
     */
    private startNetworkMonitoring(): void {
        // 清除现有定时器
        if (this.networkMonitorTimer !== null) {
            clearInterval(this.networkMonitorTimer);
        }

        // 立即执行一次
        this.pingNetwork();

        // 设置定时监控
        this.networkMonitorTimer = window.setInterval(() => {
            this.pingNetwork();
        }, this.networkPingInterval);

        console.log('[PerformanceMonitor] 网络延迟监控已启动');
    }

    /**
     * 停止网络延迟监控
     */
    private stopNetworkMonitoring(): void {
        if (this.networkMonitorTimer !== null) {
            clearInterval(this.networkMonitorTimer);
            this.networkMonitorTimer = null;
            console.log('[PerformanceMonitor] 网络延迟监控已停止');
        }
    }

    /**
     * 执行网络延迟测试（Ping）
     */
    private async pingNetwork(): Promise<void> {
        const startTime = performance.now();

        try {
            // 使用 HEAD 请求减少数据传输
            await fetch(this.pingUrl, {
                method: 'HEAD',
                cache: 'no-cache',
                mode: 'cors',
            });

            const endTime = performance.now();
            const latency = endTime - startTime;

            // 更新网络延迟
            this.stats.networkLatency = latency;
            this.stats.networkLatencyHistory.push(latency);

            // 限制历史记录大小
            if (this.stats.networkLatencyHistory.length > this.config.frameTimeWindow) {
                this.stats.networkLatencyHistory.shift();
            }

            // 计算平均延迟
            this.stats.avgNetworkLatency = this.stats.networkLatencyHistory.reduce((a, b) => a + b, 0) / this.stats.networkLatencyHistory.length;

            // 更新网络状态
            this.stats.networkStatus = 'online';
        } catch (error) {
            // 网络请求失败
            this.stats.networkStatus = 'offline';
            this.stats.networkLatency = -1;
            console.warn('[PerformanceMonitor] 网络延迟测试失败:', error);
        }
    }

    /**
     * 设置 Ping 测试 URL
     * @param url 测试 URL
     */
    setPingUrl(url: string): void {
        this.pingUrl = url;
        console.log(`[PerformanceMonitor] Ping URL 设置为: ${url}`);
    }

    /**
     * 获取网络延迟
     * @returns 网络延迟（毫秒），-1 表示离线
     */
    getNetworkLatency(): number {
        return this.stats.networkLatency;
    }

    /**
     * 获取平均网络延迟
     * @returns 平均网络延迟（毫秒）
     */
    getAvgNetworkLatency(): number {
        return this.stats.avgNetworkLatency;
    }

    /**
     * 获取网络状态
     * @returns 网络状态
     */
    getNetworkStatus(): 'online' | 'offline' | 'unknown' {
        return this.stats.networkStatus;
    }

    /**
     * 获取网络延迟历史
     * @returns 网络延迟历史记录
     */
    getNetworkLatencyHistory(): number[] {
        return [...this.stats.networkLatencyHistory];
    }

    /**
     * 设置网络监控间隔
     * @param interval 监控间隔（毫秒）
     */
    setNetworkPingInterval(interval: number): void {
        this.networkPingInterval = interval;
        // 重启监控以应用新间隔
        if (this.enabled) {
            this.startNetworkMonitoring();
        }
    }

    /**
     * 导出性能数据为 JSON
     * @returns JSON 字符串
     */
    exportData(): string {
        const exportData = {
            timestamp: new Date().toISOString(),
            stats: this.getStats(),
            warningLevel: this.getWarningLevel(),
            fpsHistory: this.getFpsHistory(),
            frameTimeHistory: this.getFrameTimeHistory(),
            memoryHistory: this.getMemoryHistory(),
            networkLatencyHistory: this.getNetworkLatencyHistory(),
            optimizationSuggestions: this.getOptimizationSuggestions(),
            config: this.config,
        };

        return JSON.stringify(exportData, null, 2);
    }

    /**
     * 导出性能数据并下载为文件
     * @param filename 文件名（默认: performance-data.json）
     */
    downloadData(filename: string = 'performance-data.json'): void {
        const jsonData = this.exportData();
        const blob = new Blob([jsonData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        URL.revokeObjectURL(url);

        console.log(`[PerformanceMonitor] 性能数据已导出: ${filename}`);
    }

    /**
     * 从 JSON 导入性能数据
     * @param jsonData JSON 字符串
     * @returns 导入的数据对象
     */
    importData(jsonData: string): any {
        try {
            const data = JSON.parse(jsonData);
            console.log('[PerformanceMonitor] 性能数据已导入');
            return data;
        } catch (error) {
            console.error('[PerformanceMonitor] 导入性能数据失败:', error);
            throw error;
        }
    }

    /**
     * 销毁性能监控器
     */
    destroy(): void {
        this.stopNetworkMonitoring();
        this.hideDebugPanel();
        this.enabled = false;
        this.resetStats();
        console.log('[PerformanceMonitor] 性能监控器已销毁');
    }
}

/**
 * 导出性能监控器单例
 */
export const performanceMonitor = PerformanceMonitor.getInstance();
