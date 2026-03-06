"""
OpenClaw MMO - 图形化观战界面
使用Tuxemon的精灵图显示真实游戏画面
"""
import pygame
import requests
import time
import sys
import os

# 初始化Pygame
pygame.init()

# 屏幕设置
SCREEN_WIDTH = 1024
SCREEN_HEIGHT = 768
screen = pygame.display.set_mode((SCREEN_WIDTH, SCREEN_HEIGHT))
pygame.display.set_caption("OpenClaw MMO - 实时观战")

# 颜色定义
WHITE = (255, 255, 255)
BLACK = (0, 0, 0)
GRAY = (128, 128, 128)
LIGHT_GRAY = (200, 200, 200)
RED = (255, 0, 0)
GREEN = (0, 255, 0)
BLUE = (0, 0, 255)
YELLOW = (255, 255, 0)

# 字体
font_large = pygame.font.Font(None, 48)
font_medium = pygame.font.Font(None, 36)
font_small = pygame.font.Font(None, 28)

# API地址
BASE_URL = "http://localhost:8000"

# Tuxemon资源路径
TUXEMON_PATH = r"C:\Users\Administrator\.openclaw\agents\youxiangfa\workspace\Tuxemon\mods\tuxemon"
SPRITE_PATH = os.path.join(TUXEMON_PATH, "gfx", "sprites", "battle")

# 怪物精灵缓存
monster_sprites = {}

def load_monster_sprite(monster_slug):
    """加载怪物精灵图"""
    if monster_slug in monster_sprites:
        return monster_sprites[monster_slug]
    
    sprite_file = os.path.join(SPRITE_PATH, f"{monster_slug}-sheet.png")
    
    if os.path.exists(sprite_file):
        try:
            # 加载精灵图单
            sprite_sheet = pygame.image.load(sprite_file).convert_alpha()
            
            # 提取第一帧（简化版本）
            # Tuxemon的精灵图通常是96x96或类似尺寸
            frame_width = 96
            frame_height = 96
            
            # 提取中间的站立帧
            sprite = sprite_sheet.subsurface(
                pygame.Rect(frame_width, 0, frame_width, frame_height)
            )
            
            # 放大2倍
            sprite = pygame.transform.scale(sprite, (192, 192))
            
            monster_sprites[monster_slug] = sprite
            return sprite
        except Exception as e:
            print(f"加载精灵图失败: {e}")
    
    # 如果找不到，返回一个占位符
    placeholder = pygame.Surface((192, 192))
    placeholder.fill(GRAY)
    pygame.draw.rect(placeholder, BLACK, (0, 0, 192, 192), 3)
    text = font_medium.render(monster_slug, True, WHITE)
    placeholder.blit(text, (96 - text.get_width()//2, 96 - text.get_height()//2))
    monster_sprites[monster_slug] = placeholder
    return placeholder

def get_battles():
    """获取对战列表"""
    try:
        response = requests.get(f"{BASE_URL}/api/battles")
        data = response.json()
        if data['success']:
            return data['battles']
    except Exception as e:
        print(f"获取对战列表失败: {e}")
    return []

def get_battle_details(battle_id):
    """获取对战详情"""
    try:
        response = requests.get(f"{BASE_URL}/api/battle/{battle_id}")
        data = response.json()
        if data['success']:
            return data['battle']
    except Exception as e:
        print(f"获取对战详情失败: {e}")
    return None

def draw_hp_bar(x, y, width, height, current_hp, max_hp):
    """绘制HP条"""
    # 背景（深色）
    pygame.draw.rect(screen, GRAY, (x, y, width, height))
    
    # 当前HP（绿色到红色渐变）
    hp_percentage = current_hp / max_hp
    hp_width = int(width * hp_percentage)
    
    if hp_percentage > 0.5:
        color = GREEN
    elif hp_percentage > 0.25:
        color = YELLOW
    else:
        color = RED
    
    pygame.draw.rect(screen, color, (x, y, hp_width, height))
    
    # 边框
    pygame.draw.rect(screen, BLACK, (x, y, width, height), 2)
    
    # HP文字
    hp_text = f"{current_hp}/{max_hp}"
    text_surface = font_small.render(hp_text, True, BLACK)
    screen.blit(text_surface, (x + width//2 - text_surface.get_width()//2, y + height + 5))

def draw_monster_card(x, y, monster, is_player1=True):
    """绘制怪物卡片"""
    # 背景
    card_width = 350
    card_height = 450
    pygame.draw.rect(screen, WHITE, (x, y, card_width, card_height))
    pygame.draw.rect(screen, BLACK, (x, y, card_width, card_height), 3)
    
    # 标题
    title = f"玩家 {'1' if is_player1 else '2'}"
    title_surface = font_medium.render(title, True, BLUE)
    screen.blit(title_surface, (x + 10, y + 10))
    
    # 怪物名称和等级
    name = monster.get('name', monster.get('slug', 'Unknown'))
    level = monster.get('level', 1)
    name_text = f"{name} Lv.{level}"
    name_surface = font_medium.render(name_text, True, BLACK)
    screen.blit(name_surface, (x + 10, y + 50))
    
    # 类型
    types = monster.get('types', ['unknown'])
    types_text = f"类型: {', '.join(types)}"
    types_surface = font_small.render(types_text, True, GRAY)
    screen.blit(types_surface, (x + 10, y + 85))
    
    # 加载并绘制怪物精灵图
    sprite = load_monster_sprite(monster.get('slug', 'aardart'))
    sprite_x = x + (card_width - 192) // 2
    sprite_y = y + 120
    screen.blit(sprite, (sprite_x, sprite_y))
    
    # HP条
    current_hp = monster.get('hp', 0)
    max_hp = monster.get('max_hp', 100)
    draw_hp_bar(x + 20, y + 330, card_width - 40, 30, current_hp, max_hp)
    
    # 属性值
    attack = monster.get('attack', 0)
    defense = monster.get('defense', 0)
    speed = monster.get('speed', 0)
    
    stats_text = f"攻击:{attack}  防御:{defense}  速度:{speed}"
    stats_surface = font_small.render(stats_text, True, BLACK)
    screen.blit(stats_surface, (x + 20, y + 400))

def draw_battle_log(x, y, logs):
    """绘制战斗日志"""
    log_width = SCREEN_WIDTH - 40
    log_height = 200
    
    # 背景
    pygame.draw.rect(screen, LIGHT_GRAY, (x, y, log_width, log_height))
    pygame.draw.rect(screen, BLACK, (x, y, log_width, log_height), 2)
    
    # 标题
    title_surface = font_medium.render("战斗日志", True, BLACK)
    screen.blit(title_surface, (x + 10, y + 10))
    
    # 显示最近的日志（最多5条）
    recent_logs = logs[-5:] if len(logs) > 5 else logs
    
    for i, log in enumerate(recent_logs):
        turn = log.get('turn', '?')
        attacker = log.get('attacker', '???')
        defender = log.get('defender', '???')
        technique = log.get('technique', '???')
        damage = log.get('damage', 0)
        effectiveness = log.get('type_effectiveness', '普通')
        
        log_text = f"[回合{turn}] {attacker} 使用 {technique} 攻击 {defender}, 造成{damage}伤害 ({effectiveness})"
        
        color = RED if effectiveness == '效果不佳' else BLACK
        log_surface = font_small.render(log_text, True, color)
        screen.blit(log_surface, (x + 20, y + 50 + i * 30))

def draw_battle_selection(battles):
    """绘制对战选择界面"""
    screen.fill(WHITE)
    
    # 标题
    title = "选择要观战的对战"
    title_surface = font_large.render(title, True, BLACK)
    screen.blit(title_surface, (SCREEN_WIDTH//2 - title_surface.get_width()//2, 30))
    
    # 对战列表
    for i, battle in enumerate(battles[:8]):  # 最多显示8个
        battle_id = battle.get('id', '')
        status = battle.get('status', 'unknown')
        current_turn = battle.get('current_turn', 0)
        
        # 按钮背景
        button_y = 100 + i * 80
        button_color = GREEN if status == 'ongoing' else LIGHT_GRAY
        pygame.draw.rect(screen, button_color, (100, button_y, SCREEN_WIDTH - 200, 70))
        pygame.draw.rect(screen, BLACK, (100, button_y, SCREEN_WIDTH - 200, 70), 2)
        
        # 对战信息
        battle_text = f"对战 #{battle_id[:8]}"
        status_text = f"状态: {status} | 回合: {current_turn}"
        
        battle_surface = font_medium.render(battle_text, True, BLACK)
        status_surface = font_small.render(status_text, True, GRAY)
        
        screen.blit(battle_surface, (120, button_y + 10))
        screen.blit(status_surface, (120, button_y + 40))
    
    pygame.display.flip()

def draw_battle_arena(battle):
    """绘制对战竞技场"""
    screen.fill(WHITE)
    
    # 标题
    title = f"对战 #{battle.get('id', '')[:8]} - 回合 {battle.get('current_turn', '?')}"
    title_surface = font_large.render(title, True, BLACK)
    screen.blit(title_surface, (SCREEN_WIDTH//2 - title_surface.get_width()//2, 20))
    
    # 玩家1怪物
    player1_monsters = battle.get('player1_monsters', [])
    if player1_monsters:
        draw_monster_card(50, 80, player1_monsters[0], is_player1=True)
    
    # VS标志
    vs_surface = font_large.render("VS", True, RED)
    screen.blit(vs_surface, (SCREEN_WIDTH//2 - vs_surface.get_width()//2, 280))
    
    # 玩家2怪物
    player2_monsters = battle.get('player2_monsters', [])
    if player2_monsters:
        draw_monster_card(SCREEN_WIDTH - 400, 80, player2_monsters[0], is_player1=False)
    
    # 战斗日志
    logs = battle.get('logs', [])
    draw_battle_log(20, 550, logs)
    
    # 提示文字
    hint = "按 ESC 返回列表 | 按 R 刷新"
    hint_surface = font_small.render(hint, True, GRAY)
    screen.blit(hint_surface, (SCREEN_WIDTH//2 - hint_surface.get_width()//2, SCREEN_HEIGHT - 30))
    
    pygame.display.flip()

def main():
    """主循环"""
    clock = pygame.time.Clock()
    
    # 当前状态
    state = "list"  # list 或 battle
    selected_battle_id = None
    battles = []
    last_refresh = 0
    
    running = True
    while running:
        current_time = time.time()
        
        # 处理事件
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
                    battles = get_battles()
                    if selected_battle_id:
                        battle = get_battle_details(selected_battle_id)
                        if battle:
                            pass  # 继续显示
            
            elif event.type == pygame.MOUSEBUTTONDOWN:
                if state == "list":
                    # 检查点击了哪个对战
                    mouse_x, mouse_y = event.pos
                    for i, battle in enumerate(battles[:8]):
                        button_y = 100 + i * 80
                        if 100 <= mouse_x <= SCREEN_WIDTH - 100 and button_y <= mouse_y <= button_y + 70:
                            selected_battle_id = battle.get('id')
                            state = "battle"
                            break
        
        # 每5秒自动刷新
        if current_time - last_refresh > 5:
            battles = get_battles()
            last_refresh = current_time
        
        # 绘制
        if state == "list":
            draw_battle_selection(battles)
        elif state == "battle" and selected_battle_id:
            battle = get_battle_details(selected_battle_id)
            if battle:
                draw_battle_arena(battle)
        
        # 控制帧率
        clock.tick(30)
    
    pygame.quit()
    sys.exit()

if __name__ == "__main__":
    print("="*50)
    print("OpenClaw MMO - 图形化观战界面")
    print("="*50)
    print("\n提示：")
    print("  - 点击对战进入观战模式")
    print("  - 按 ESC 返回列表")
    print("  - 按 R 刷新对战列表")
    print("="*50)
    main()
