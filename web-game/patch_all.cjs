const fs = require('fs');
const path = require('path');

// 1. Update MainMenu.ts to accept 'any'
let mainMenuContent = fs.readFileSync(path.join(__dirname, 'src', 'engine', 'MainMenu.ts'), 'utf-8');
mainMenuContent = mainMenuContent.replace(
  "handleInput(action: 'up' | 'down' | 'left' | 'right' | 'confirm' | 'cancel'): void {",
  "handleInput(action: 'up' | 'down' | 'left' | 'right' | 'confirm' | 'cancel' | 'any'): void {"
);
fs.writeFileSync(path.join(__dirname, 'src', 'engine', 'MainMenu.ts'), mainMenuContent, 'utf-8');
console.log('MainMenu.ts updated');

// 2. Update main.ts
let mainContent = fs.readFileSync(path.join(__dirname, 'src', 'main.ts'), 'utf-8');
const lines = mainContent.split('\n');

// Find the line with eventSystem import and add new imports
const eventImportIdx = lines.findIndex(l => l.includes('import { eventSystem }'));
if (eventImportIdx !== -1) {
  const newLines = [
    ...lines.slice(0, eventImportIdx + 1),
    "import { audioManager } from './engine/AudioManager.js';",
    "import { itemDataLoader } from './engine/ItemData.js';",
    "import { titleScreen } from './engine/TitleScreen.js';",
    "import { bagUI } from './engine/BagUI.js';",
    ...lines.slice(eventImportIdx + 1)
  ];
  lines.length = 0;
  lines.push(...newLines);
}

// Add gameState after showDebugInfo
const showDebugIdx = lines.findIndex(l => l.includes('private showDebugInfo = false;'));
if (showDebugIdx !== -1) {
  lines.splice(showDebugIdx + 1, 0, "    private gameState: 'loading' | 'title' | 'playing' = 'loading';");
}

// Add audio manager initialization
const loadingTextIdx = lines.findIndex(l => l.includes('loading-text'));
if (loadingTextIdx !== -1) {
  lines.splice(loadingTextIdx + 2, 0, "        await audioManager.initialize();", "        console.log('[Game] Audio manager initialized');");
}

// Add item loader and bag UI after technique
const techLoadIdx = lines.findIndex(l => l.includes('await techniqueDataLoader.loadTechniques'));
if (techLoadIdx !== -1) {
  const nextIdx = lines.findIndex((l, i) => i > techLoadIdx && l.includes('console.log') && l.includes('Tuxemon resources loaded'));
  if (nextIdx !== -1) {
    lines.splice(nextIdx, 0, "        await itemDataLoader.loadItems();", "        bagUI.initialize();");
  }
}

// Add title screen initialization
const hideLoadIdx = lines.findIndex(l => l.includes('this.hideLoadingScreen'));
if (hideLoadIdx !== -1) {
  const successIdx = lines.findIndex((l, i) => i > hideLoadIdx && l.includes('initialized successfully'));
  if (successIdx !== -1) {
    lines.splice(successIdx, 0, "        await titleScreen.initialize();", "        this.gameState = 'title';");
  }
}

// Update onUpdate to include audio and title screen
const onUpdateIdx = lines.findIndex(l => l.includes('protected onUpdate(deltaTime: number): void'));
if (onUpdateIdx !== -1) {
  const sceneUpdateIdx = lines.findIndex((l, i) => i > onUpdateIdx && l.includes('sceneManager.update(deltaTime)'));
  if (sceneUpdateIdx !== -1) {
    const newOnUpdate = [
      lines[onUpdateIdx],
      "        audioManager.update(deltaTime);",
      "",
      "        if (this.gameState === 'title') {",
      "            titleScreen.update(deltaTime);",
      "            return;",
      "        }",
      ...lines.slice(onUpdateIdx + 1, sceneUpdateIdx),
      ...lines.slice(sceneUpdateIdx + 1)
    ];
    lines.length = 0;
    lines.push(...newOnUpdate);
  }
}

// Update onRender to include title screen
const onRenderIdx = lines.findIndex(l => l.includes('protected onRender'));
if (onRenderIdx !== -1) {
  const renderBgIdx = lines.findIndex((l, i) => i > onRenderIdx && l.includes('ctx.fillStyle = '));
  if (renderBgIdx !== -1) {
    const newOnRender = [
      lines[onRenderIdx],
      "        if (this.gameState === 'title') {",
      "            titleScreen.render(ctx, this.getWidth(), this.getHeight());",
      "            return;",
      "        }",
      ...lines.slice(onRenderIdx + 1, renderBgIdx),
      ...lines.slice(renderBgIdx + 1)
    ];
    lines.length = 0;
    lines.push(...newOnRender);
  }
}

// Add global exports
const techLoaderExportIdx = lines.findIndex(l => l.includes('window as any).techniqueDataLoader = techniqueDataLoader'));
if (techLoaderExportIdx !== -1) {
  lines.splice(techLoaderExportIdx + 1, 0,
    "(window as any).audioManager = audioManager;",
    "(window as any).itemDataLoader = itemDataLoader;",
    "(window as any).titleScreen = titleScreen;",
    "(window as any).bagUI = bagUI;"
  );
}

fs.writeFileSync(path.join(__dirname, 'src', 'main.ts'), lines.join('\n'), 'utf-8');
console.log('main.ts updated');
