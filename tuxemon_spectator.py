"""
OpenClaw MMO - Tuxemon观战模式
在Tuxemon中观看网络对战
"""
import pygame
import sys
import os
import time
import requests

# 添加Tuxemon路径
TUXEMON_PATH = r"C:\Users\Administrator\.openclaw\agents\youxiangfa\workspace\Tuxemon"
sys.path.insert(0, TUXEMON_PATH)

# 初始化Pygame
pygame.init()
pygame.font.init()

# 屏幕
screen = pygame.display.set_mode((1280, 720))
pygame.display.set_caption("OpenClaw MMO - Tuxemon观战模式")

# 使用Tuxemon的字体
try:
    font_large = pygame.font.SysFont('arial', 48)
    font_medium = pygame.font.SysFont('arial', 32)
    font_small = pygame.font.SysFont('arial', 24)
except:
    font_large = pygame.font.Font(None, 48)
    font_medium = pygame.font.Font(None, 32)
    font_small = pygame.font.Font(None, 24)

# 颜色
WHITE = (255, 255, 255)
BLACK = (0, 0, 0)
GRAY = (200, 200, 200)
RED = (255, 100, 100)
GREEN = (100, 255, 100)
BLUE = (100, 100, 255)

# Tuxemon资源路径
SPRITE_DIR = os.path.join(TUXEMON_PATH, "mods", "tuxemon", "gfx", "sprites", "battle")
UI_DIR = os.path.join(TUXEMON_PATH, "mods", "tuxemon", "gfx", "ui")

# API
BASE_URL = "http://localhost:8000"

# 缓存
sprites = {}

def load_sprite(slug):
    """加载Tuxemon精灵图"""
    if slug in sprites:
        return sprites[slug]
    
    path = os.path.join(SPRITE_DIR, f"{slug}-sheet.png")
    
    if os.path.exists(path):
        try:
            img = pygame.image.load(path).convert_alpha()
            # 提取战斗姿态（中间帧）
            sprite = img.subsurface(pygame.Rect(96, 0, 96, 96))
            sprite = pygame.transform.scale(sprite, (200, 200))
            sprites[slug] = sprite
            return sprite
        except Exception as e:
            print(f"Sprite load error: {e}")
    
    # 占位符
    surface = pygame.Surface((200, 200))
    surface.fill(GRAY)
    pygame.draw.rect(surface, BLACK, (0, 0, 200, 200), 3)
    text = font_small.render(slug[:8], True, BLACK)
    surface.blit(text, (100 - text.get_width()//2, 100 - text.get_height()//2))
    sprites[slug] = surface
    return surface

def api_get(endpoint):
    """API GET请求"""
    try:
        response = requests.get(f"{BASE_URL}{endpoint}", timeout=2)
        if response.status_code == 200:
            return response.json()
    except Exception as e:
        print(f"API error: {e}")
    return None

def draw_text(x, y, text, font=font_medium, color=BLACK):
    """绘制文字"""
    surf = font.render(text, True, color)
    screen.blit(surf, (x, y))

def draw_hp_bar(x, y, w, h, hp, max_hp):
    """绘制HP条"""
    pygame.draw.rect(screen, GRAY, (x, y, w, h))
    
    if max_hp > 0:
        pct = hp / max_hp
        hp_w = int(w * pct)
        
        if pct > 0.5:
            color = GREEN
        elif pct > 0.25:
            color = (255, 255, 0)
        else:
            color = RED
        
        pygame.draw.rect(screen, color, (x, y, hp_w, h))
    
    pygame.draw.rect(screen, BLACK, (x, y, w, h), 3)
    draw_text(x + 10, y + 5, f"{hp}/{max_hp}", font_small, BLACK)

def draw_battle_arena(battle_data):
    """绘制战斗竞技场（Tuxemon风格）"""
    if not battle_data:
        return
    
    # 背景
    screen.fill((240, 248, 255))  # 淡蓝色背景
    
    # 战斗场景背景框
    pygame.draw.rect(screen, WHITE, (50, 50, 1180, 500))
    pygame.draw.rect(screen, BLACK, (50, 50, 1180, 500), 3)
    
    # 玩家1怪物（左下）
    p1_monsters = battle_data.get('player1_monsters', [])
    if p1_monsters:
        m = p1_monsters[0]
        sprite = load_sprite(m.get('slug', 'aardart'))
        screen.blit(sprite, (100, 300))
        
        # 信息框
        pygame.draw.rect(screen, WHITE, (320, 350, 300, 80))
        pygame.draw.rect(screen, BLACK, (320, 350, 300, 80), 2)
        
        draw_text(330, 360, f"{m.get('name', 'Monster')} Lv.{m.get('level', 1)}", font_medium, BLACK)
        draw_hp_bar(330, 395, 280, 25, m.get('hp', 0), m.get('max_hp', 100))
    
    # VS标志
    draw_text(580, 200, "VS", font_large, RED)
    
    # 玩家2怪物（右上）
    p2_monsters = battle_data.get('player2_monsters', [])
    if p2_monsters:
        m = p2_monsters[0]
        sprite = load_sprite(m.get('slug', 'aardart'))
        screen.blit(sprite, (900, 100))
        
        # 信息框
        pygame.draw.rect(screen, WHITE, (620, 120, 300, 80))
        pygame.draw.rect(screen, BLACK, (620, 120, 300, 80), 2)
        
        draw_text(630, 130, f"{m.get('name', 'Monster')} Lv.{m.get('level', 1)}", font_medium, BLACK)
        draw_hp_bar(630, 165, 280, 25, m.get('hp', 0), m.get('max_hp', 100))
    
    # 战斗日志
    pygame.draw.rect(screen, WHITE, (50, 560, 1180, 100))
    pygame.draw.rect(screen, BLACK, (50, 560, 1180, 100), 3)
    
    draw_text(70, 570, "Battle Log", font_medium, BLACK)
    
    logs = battle_data.get('logs', [])
    for i, log in enumerate(logs[-3:]):
        turn = log.get('turn', '?')
        attacker = log.get('attacker', '???')
        defender = log.get('defender', '???')
        damage = log.get('damage', 0)
        effect = log.get('type_effectiveness', 'normal')
        
        text = f"[Turn {turn}] {attacker} -> {defender}, {damage} damage ({effect})"
        draw_text(70, 600 + i * 20, text, font_small, BLACK)

def draw_battle_list(battles):
    """绘制对战列表"""
    screen.fill(WHITE)
    
    # 标题
    draw_text(450, 50, "Spectate Battles", font_large, BLUE)
    
    # 对战列表
    for i, battle in enumerate(battles[:8]):
        y = 150 + i * 70
        
        # 背景
        color = GREEN if battle.get('status') == 'ongoing' else GRAY
        pygame.draw.rect(screen, color, (100, y, 1080, 60))
        pygame.draw.rect(screen, BLACK, (100, y, 1080, 60), 2)
        
        # 信息
        battle_id = battle.get('id', '')[:8]
        status = battle.get('status', 'unknown')
        turn = battle.get('current_turn', 0)
        
        draw_text(120, y + 10, f"Battle #{battle_id}", font_medium, BLACK)
        draw_text(120, y + 35, f"Status: {status} | Turn: {turn}", font_small, GRAY)
        
        # 点击提示
        draw_text(1000, y + 20, "Click to Watch", font_small, BLUE)

def main():
    """主函数"""
    clock = pygame.time.Clock()
    
    state = "list"  # list, battle
    selected_battle_id = None
    battles = []
    battle_data = None
    last_refresh = 0
    
    running = True
    while running:
        current_time = time.time()
        
        # 事件处理
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False
            
            elif event.type == pygame.KEYDOWN:
                if event.key == pygame.K_ESCAPE:
                    if state == "battle":
                        state = "list"
                        selected_battle_id = None
                    else:
                        running = False
                
                elif event.key == pygame.K_r:
                    # 刷新
                    battles = api_get("/api/battles") or []
            
            elif event.type == pygame.MOUSEBUTTONDOWN:
                if state == "list":
                    # 点击对战
                    mx, my = event.pos
                    for i, battle in enumerate(battles[:8]):
                        y = 150 + i * 70
                        if 100 <= mx <= 1180 and y <= my <= y + 60:
                            selected_battle_id = battle.get('id')
                            state = "battle"
                            break
        
        # 定时刷新
        if current_time - last_refresh > 2:
            if state == "list":
                data = api_get("/api/battles")
                if data:
                    battles = data.get('battles', [])
            elif state == "battle" and selected_battle_id:
                data = api_get(f"/api/battle/{selected_battle_id}")
                if data:
                    battle_data = data.get('battle')
            
            last_refresh = current_time
        
        # 绘制
        if state == "list":
            draw_battle_list(battles)
        elif state == "battle" and battle_data:
            draw_battle_arena(battle_data)
            
            # 提示
            draw_text(50, 680, "Press ESC to return | R to refresh", font_small, GRAY)
        
        pygame.display.flip()
        clock.tick(30)
    
    pygame.quit()

if __name__ == "__main__":
    print("="*50)
    print("OpenClaw MMO - Tuxemon观战模式")
    print("="*50)
    print("\n使用Tuxemon的所有美术资源")
    print("点击对战列表观看实时战斗")
    print("\n控制:")
    print("  - 点击对战进入观战")
    print("  - ESC 返回列表")
    print("  - R 刷新列表")
    print("="*50)
    main()
