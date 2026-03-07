/**
 * 飞书小程序（uni-app）类型定义
 * 用于支持飞书小程序环境
 */

declare global {
    /**
     * uni-app 全局对象
     */
    const uni: {
        /**
         * 获取系统信息
         */
        getSystemInfoSync(): {
            platform: string;
            pixelRatio: number;
            windowWidth: number;
            windowHeight: number;
            screenWidth: number;
            screenHeight: number;
        };

        /**
         * 创建选择器查询
         */
        createSelectorQuery(): {
            select(selector: string): {
                fields(fields: any, component?: any): {
                    exec(callback?: (res: any[]) => void): void;
                };
            };
            exec(callback?: (res: any[]) => void): void;
        };

        /**
         * 创建内部音频上下文
         */
        createInnerAudioContext(): {
            src: string;
            autoplay: boolean;
            loop: boolean;
            volume: number;
            playbackRate: number;
            startTime: number;
            currentTime: number;
            duration: number;
            buffered: number;
            onCanplay(callback: () => void): void;
            onPlay(callback: () => void): void;
            onPause(callback: () => void): void;
            onStop(callback: () => void): void;
            onEnded(callback: () => void): void;
            onError(callback: (error: any) => void): void;
            onTimeUpdate(callback: () => void): void;
            play(): void;
            pause(): void;
            stop(): void;
            seek(time: number): void;
            destroy(): void;
        };

        /**
         * 设置存储
         */
        setStorageSync(key: string, data: any): void;

        /**
         * 获取存储
         */
        getStorageSync(key: string): any;

        /**
         * 移除存储
         */
        removeStorageSync(key: string): void;

        /**
         * 清空存储
         */
        clearStorageSync(): void;

        /**
         * 获取存储信息
         */
        getStorageInfoSync(): {
            keys: string[];
            currentSize: number;
            limitSize: number;
        };
    };
}

export {};
