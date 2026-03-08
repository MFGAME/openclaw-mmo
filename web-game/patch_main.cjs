const fs = require('fs');
let content = fs.readFileSync('src/main.ts', 'utf-8');

const checkAnyKey = `    private checkAnyKeyPressed(): boolean {
        return inputManager.isPressed(KeyCode.ENTER as any) ||
               inputManager.isPressed(KeyCode.SPACE as any) ||
               inputManager.isPressed('z') ||
               inputManager.isPressed(KeyCode.UP as any) ||
               inputManager.isPressed(KeyCode.DOWN as any) ||
               inputManager.isPressed(KeyCode.LEFT as any) ||
               inputManager.isPressed(KeyCode.RIGHT as any);
    }
`;

// Add after bindDebugKeys
content = content.replace(
  'private bindDebugKeys(): void {',
  checkAnyKey + '    private bindDebugKeys(): void {'
);

// Add input handling inside bindDebugKeys
content = content.replace(
  'const originalOnUpdate = this.onUpdate.bind(this);\n        this.onUpdate = (deltaTime: number) => {\n            checkDebugKey();',
  `const originalOnUpdate = this.onUpdate.bind(this);
        this.onUpdate = (deltaTime: number) => {
            if (this.gameState === 'title') {
                const anyKeyPressed = this.checkAnyKeyPressed();
                if (anyKeyPressed) { titleScreen.handleInput('any'); }
            }
            if (this.gameState === 'title') {
                if (inputManager.isPressed(KeyCode.UP as any) || inputManager.isPressed('ArrowUp')) { titleScreen.handleInput('up'); }
                if (inputManager.isPressed(KeyCode.DOWN as any) || inputManager.isPressed('ArrowDown')) { titleScreen.handleInput('down'); }
                if (inputManager.isPressed(KeyCode.LEFT as any) || inputManager.isPressed('ArrowLeft')) { titleScreen.handleInput('left'); }
                if (inputManager.isPressed(KeyCode.RIGHT as any) || inputManager.isPressed('ArrowRight')) { titleScreen.handleInput('right'); }
                if (inputManager.isPressed(KeyCode.ENTER as any) || inputManager.isPressed('Space') || inputManager.isPressed('z')) { titleScreen.handleInput('confirm'); }
                if (inputManager.isPressed(KeyCode.ESCAPE as any) || inputManager.isPressed('x')) { titleScreen.handleInput('cancel'); }
            }

            checkDebugKey();`
);

// Add global exports
content = content.replace(
  '(window as any).techniqueDataLoader = techniqueDataLoader;',
  '(window as any).techniqueDataLoader = techniqueDataLoader;\n(window as any).audioManager = audioManager;\n(window as any).itemDataLoader = itemDataLoader;\n(window as any).titleScreen = titleScreen;\n(window as any).bagUI = bagUI;'
);

fs.writeFileSync('src/main.ts', content, 'utf-8');
console.log('Main.ts patched successfully');
