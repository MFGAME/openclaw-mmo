const fs = require('fs');
const path = require('path');

const mainPath = path.join(__dirname, 'src', 'main.ts');
let content = fs.readFileSync(mainPath, 'utf-8');

// 1. Add imports after eventSystem
content = content.replace(
  "import { eventSystem } from './engine/EventSystem.js';\n",
  "import { eventSystem } from './engine/EventSystem.js';\nimport { audioManager } from './engine/AudioManager.js';\nimport { itemDataLoader } from './engine/ItemData.js';\nimport { titleScreen } from './engine/TitleScreen.js';\nimport { bagUI } from './engine/BagUI.js';\n"
);

// 2. Add gameState after showDebugInfo
content = content.replace(
  "    private showDebugInfo = false;",
  "    private showDebugInfo = false;\n    private gameState: 'loading' | 'title' | 'playing' = 'loading';"
);

// 3. Add audio manager initialization after input system initialization
content = content.replace(
  "        console.log('[Game] Input system initialized');\n\n        // 创建测试地图",
  "        console.log('[Game] Input system initialized');\n\n        await audioManager.initialize();\n        console.log('[Game] Audio manager initialized');\n\n        // 创建测试地图"
);

// 4. Add item loader and bag UI after Tuxemon resources loaded
content = content.replace(
  "            await techniqueDataLoader.loadTechniques();\n            console.log('[Game] Tuxemon resources loaded');",
  "            await techniqueDataLoader.loadTechniques();\n            console.log('[Game] Tuxemon resources loaded');\n\n            await itemDataLoader.loadItems();\n            console.log('[Game] Item data loaded');\n            bagUI.initialize();"
);

// 5. Add title screen initialization before hiding loading screen
content = content.replace(
  "            // 隐藏加载屏幕\n            this.hideLoadingScreen();\n\n            console.log('Game initialized successfully');",
  "            // 隐藏加载屏幕\n            this.hideLoadingScreen();\n\n            await titleScreen.initialize();\n            this.gameState = 'title';\n            console.log('[Game] Title screen initialized');\n\n            console.log('Game initialized successfully');"
);

// 6. Update onUpdate to include audio and title screen - use proper indent
content = content.replace(
  "protected onUpdate(deltaTime: number): void {\n        // 更新场景管理器\n        sceneManager.update(deltaTime);",
  "protected onUpdate(deltaTime: number): void {\n        audioManager.update(deltaTime);\n\n        if (this.gameState === 'title') {\n            titleScreen.update(deltaTime);\n            return;\n        }\n\n        // 更新场景管理器\n        sceneManager.update(deltaTime);"
);

// 7. Update onRender to include title screen - use proper indent
content = content.replace(
  "protected onRender(ctx: CanvasRenderingContext2D): void {\n        // 清空画布\n        ctx.fillStyle = '#16213e';\n        ctx.fillRect(0, 0, this.getWidth(), this.getHeight());",
  "protected onRender(ctx: CanvasRenderingContext2D): void {\n        if (this.gameState === 'title') {\n            titleScreen.render(ctx, this.getWidth(), this.getHeight());\n            return;\n        }\n\n        // 清空画布\n        ctx.fillStyle = '#16213e';\n        ctx.fillRect(0, 0, this.getWidth(), this.getHeight());"
);

// 8. Add global exports
content = content.replace(
  "(window as any).techniqueDataLoader = techniqueDataLoader;\n",
  "(window as any).techniqueDataLoader = techniqueDataLoader;\n(window as any).audioManager = audioManager;\n(window as any).itemDataLoader = itemDataLoader;\n(window as any).titleScreen = titleScreen;\n(window as any).bagUI = bagUI;\n"
);

fs.writeFileSync(mainPath, content, 'utf-8');
console.log('main.ts updated successfully');
