"""
OpenClaw MMO - 简化版网络对战演示
在Tuxemon界面中展示API对战
"""
import pygame
import requests
import sys
import os
import random
import time

# 初始化Pygame
pygame.init()

# 屏幕设置
SCREEN_WIDTH = 1024
SCREEN_HEIGHT = 768
screen = pygame.display.set_mode((SCREEN_WIDTH, SCREEN_HEIGHT))
pygame.display.set_caption("OpenClaw MMO - Tuxemon网络对战")

# 颜色
WHITE = (255, 255, 255)
BLACK = (0, 0, 0)
GRAY = (128, 128, 128)
LIGHT_GRAY = (200, 200, 200)
RED = (255, 0, 0)
GREEN = (0, 255, 0)
BLUE = (0, 100, 255)
YELLOW = (255, 255, 0)
ORANGE = (255, 165, 0)

# 字体
font_large = pygame.font.Font(None, 48)
font_medium = pygame.font.Font(None, 36)
font_small = pygame.font.Font(None, 28)
font_tiny = pygame.font.Font(None, 22)

# API
BASE_URL = "http://localhost:8000"

# Tuxemon资源
TUXEMON_PATH = r"C:\Users\Administrator\.openclaw\agents\youxiangfa\workspace\Tuxemon\mods\tuxemon"
SPRITE_PATH = os.path.join(TUXEMON_PATH, "gfx", "sprites", "battle")

# 怪物精灵缓存
monster_sprites = {}

# 可用怪物列表
AVAILABLE_MONSTERS = [
    "aardart", "dollfin", "flambear", "budaye", 
    "pikachu", "rockitten", "sumob", "propell",
    "eaglace", "nightmerge"
]

def load_monster_sprite(monster_slug):
    """加载怪物精灵图"""
    if monster_slug in monster_sprites:
        return monster_sprites[monster_slug]
    
    sprite_file = os.path.join(SPRITE_PATH, f"{monster_slug}-sheet.png")
    
    if os.path.exists(sprite_file):
        try:
            sprite_sheet = pygame.image.load(sprite_file).convert_alpha()
            sprite = sprite_sheet.subsurface(pygame.Rect(96, 0, 96, 96))
            sprite = pygame.transform.scale(sprite, (192, 192))
            monster_sprites[monster_slug] = sprite
            return sprite
        except:
            pass
    
    # 占位符
    placeholder = pygame.Surface((192, 192))
    placeholder.fill(GRAY)
    pygame.draw.rect(placeholder, BLACK, (0, 0, 192, 192), 3)
    text = font_small.render(monster_slug[:6], True, WHITE)
    placeholder.blit(text, (96 - text.get_width()//2, 96 - text.get_height()//2))
    monster_sprites[monster_slug] = placeholder
    return placeholder

class NetworkBattle:
    """网络对战管理器"""
    
    def __init__(self):
        self.robot_id = None
        self.battle_id = None
        self.my_monster_id = None
        self.opponent_monster_id = None
        
    def register(self):
        """注册机器人"""
        response = requests.post(f"{BASE_URL}/api/robot/register", json={
            "api_key": f"game_{random.randint(1000, 9999)}",
            "name": f"Player_{random.randint(100, 999)}",
            "personality": "aggressive"
        })
        if response.status_code == 200:
            self.robot_id = response.json()['robot_id']
            return True
        return False
    
    def create_monster(self, slug, level=5):
        """创建怪物"""
        response = requests.post(f"{BASE_URL}/api/monster/create", json={
            "robot_id": self.robot_id,
            "monster_slug": slug,
            "level": level
        })
        if response.status_code == 200:
            return response.json()['monster']
        return None
    
    def find_opponent(self):
        """寻找对手"""
        response = requests.get(f"{BASE_URL}/api/robots")
        if response.status_code == 200:
            robots = response.json()['robots']
            opponents = [r for r in robots if r['id'] != self.robot_id]
            if opponents:
                return opponents[0]
        return None
    
    def create_battle(self, opponent_id, my_monsters, opponent_monsters):
        """创建对战"""
        response = requests.post(f"{BASE_URL}/api/battle/create", json={
            "player1_id": self.robot_id,
            "player2_id": opponent_id,
            "player1_monsters": my_monsters,
            "player2_monsters": opponent_monsters
        })
        if response.status_code == 200:
            self.battle_id = response.json()['battle_id']
            return self.battle_id
        return None
    
    def attack(self, target_id):
        """攻击"""
        response = requests.post(f"{BASE_URL}/api/battle/action", json={
            "battle_id": self.battle_id,
            "robot_id": self.robot_id,
            "monster_id": self.my_monster_id,
            "target_id": target_id,
            "technique_id": "tackle"
        })
        if response.status_code == 200:
            return response.json()
        return None

def draw_button(x, y, width, height, text, color=BLUE, text_color=WHITE):
    """绘制按钮"""
    pygame.draw.rect(screen, color, (x, y, width, height))
    pygame.draw.rect(screen, BLACK, (x, y, width, height), 2)
    text_surf = font_medium.render(text, True, text_color)
    screen.blit(text_surf, (x + width//2 - text_surf.get_width()//2, 
                           y + height//2 - text_surf.get_height()//2))

def draw_hp_bar(x, y, width, height, current, max_hp):
    """绘制HP条"""
    pygame.draw.rect(screen, GRAY, (x, y, width, height))
    percentage = current / max_hp if max_hp > 0 else 0
    hp_width = int(width * percentage)
    
    if percentage > 0.5:
        color = GREEN
    elif percentage > 0.25:
        color = YELLOW
    else:
        color = RED
    
    pygame.draw.rect(screen, color, (x, y, hp_width, height))
    pygame.draw.rect(screen, BLACK, (x, y, width, height), 2)
    
    text = font_small.render(f"{current}/{max_hp}", True, BLACK)
    screen.blit(text, (x + width//2 - text.get_width()//2, y + height + 5))

def draw_monster_sprite(sprite, x, y, name, level, hp, max_hp, is_player=True):
    """绘制怪物精灵和信息"""
    # 精灵图
    screen.blit(sprite, (x, y))
    
    # 名称和等级
    name_text = font_medium.render(f"{name} Lv.{level}", True, BLACK)
    text_y = y + 210 if is_player else y - 40
    screen.blit(name_text, (x + 96 - name_text.get_width()//2, text_y))
    
    # HP条
    hp_y = y + 250 if is_player else y - 60
    draw_hp_bar(x, hp_y, 192, 20, hp, max_hp)

def main():
    """主函数"""
    clock = pygame.time.Clock()
    battle = NetworkBattle()
    
    # 状态
    state = "menu"  # menu, select, battle, result
    selected_monster = 0
    my_monster = None
    opponent_monster = None
    battle_log = []
    winner = None
    
    # 注册
    if not battle.register():
        print("[ERROR] 无法注册")
        return
    
    running = True
    while running:
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False
            
            elif event.type == pygame.MOUSEBUTTONDOWN:
                mx, my = event.pos
                
                if state == "menu":
                    # 开始按钮
                    if 400 <= mx <= 624 and 400 <= my <= 460:
                        state = "select"
                
                elif state == "select":
                    # 怪物选择
                    for i, slug in enumerate(AVAILABLE_MONSTERS):
                        btn_x = 50 + (i % 5) * 190
                        btn_y = 200 + (i // 5) * 250
                        if btn_x <= mx <= btn_x + 180 and btn_y <= my <= btn_y + 240:
                            selected_monster = i
                            
                            # 创建怪物
                            my_monster = battle.create_monster(slug, level=5)
                            if my_monster:
                                battle.my_monster_id = my_monster['id']
                                
                                # 寻找对手
                                opponent = battle.find_opponent()
                                if opponent:
                                    # 创建对手怪物
                                    opp_slug = random.choice(AVAILABLE_MONSTERS)
                                    opponent_monster = battle.create_monster(opp_slug, level=5)
                                    
                                    if opponent_monster:
                                        battle.opponent_monster_id = opponent_monster['id']
                                        
                                        # 创建对战
                                        battle.create_battle(
                                            opponent['id'],
                                            [battle.my_monster_id],
                                            [battle.opponent_monster_id]
                                        )
                                        
                                        state = "battle"
                                else:
                                    print("[INFO] 没有找到对手")
                
                elif state == "battle":
                    # 攻击按钮
                    if 100 <= mx <= 400 and 650 <= my <= 720:
                        result = battle.attack(battle.opponent_monster_id)
                        if result:
                            # 更新HP
                            opponent_monster['hp'] = result['defender_hp']
                            
                            # 添加日志
                            log = result['log']
                            battle_log.append(
                                f"[回合{log['turn']}] {log['attacker']} → {log['defender']}, "
                                f"{log['damage']}伤害 ({log['type_effectiveness']})"
                            )
                            
                            if result['battle_ended']:
                                winner = "你赢了！" if result['winner_id'] == battle.robot_id else "你输了！"
                                state = "result"
                    
                    # 返回按钮
                    if 500 <= mx <= 700 and 650 <= my <= 720:
                        state = "menu"
                
                elif state == "result":
                    # 再来一局
                    if 400 <= mx <= 624 and 500 <= my <= 560:
                        state = "menu"
                        battle_log = []
                        winner = None
        
        # 绘制
        screen.fill(WHITE)
        
        if state == "menu":
            # 标题
            title = font_large.render("OpenClaw MMO - 网络对战", True, BLUE)
            screen.blit(title, (SCREEN_WIDTH//2 - title.get_width()//2, 100))
            
            # 开始按钮
            draw_button(400, 400, 224, 60, "开始对战", GREEN)
            
            # 状态
            response = requests.get(f"{BASE_URL}/api/world/status")
            if response.status_code == 200:
                status = response.json()
                status_text = font_medium.render(
                    f"在线: {status['online_robots']} | 对战: {status['active_battles']}",
                    True, BLACK
                )
                screen.blit(status_text, (SCREEN_WIDTH//2 - status_text.get_width()//2, 600))
        
        elif state == "select":
            # 标题
            title = font_large.render("选择你的怪物", True, BLACK)
            screen.blit(title, (SCREEN_WIDTH//2 - title.get_width()//2, 50))
            
            # 怪物选择网格
            for i, slug in enumerate(AVAILABLE_MONSTERS):
                btn_x = 50 + (i % 5) * 190
                btn_y = 200 + (i // 5) * 250
                
                # 背景
                pygame.draw.rect(screen, LIGHT_GRAY, (btn_x, btn_y, 180, 240))
                pygame.draw.rect(screen, BLACK, (btn_x, btn_y, 180, 240), 2)
                
                # 精灵图
                sprite = load_monster_sprite(slug)
                small_sprite = pygame.transform.scale(sprite, (128, 128))
                screen.blit(small_sprite, (btn_x + 26, btn_y + 20))
                
                # 名称
                name_text = font_small.render(slug.capitalize(), True, BLACK)
                screen.blit(name_text, (btn_x + 90 - name_text.get_width()//2, btn_y + 170))
        
        elif state == "battle":
            # 对手怪物
            if opponent_monster:
                opp_sprite = load_monster_sprite(opponent_monster['slug'])
                draw_monster_sprite(
                    opp_sprite, 
                    600, 100,
                    opponent_monster['name'],
                    opponent_monster['level'],
                    opponent_monster['hp'],
                    opponent_monster['max_hp'],
                    is_player=False
                )
            
            # 玩家怪物
            if my_monster:
                my_sprite = load_monster_sprite(my_monster['slug'])
                draw_monster_sprite(
                    my_sprite,
                    100, 350,
                    my_monster['name'],
                    my_monster['level'],
                    my_monster['hp'],
                    my_monster['max_hp'],
                    is_player=True
                )
            
            # VS
            vs_text = font_large.render("VS", True, RED)
            screen.blit(vs_text, (SCREEN_WIDTH//2 - vs_text.get_width()//2, 300))
            
            # 战斗日志
            pygame.draw.rect(screen, LIGHT_GRAY, (50, 550, SCREEN_WIDTH - 100, 80))
            pygame.draw.rect(screen, BLACK, (50, 550, SCREEN_WIDTH - 100, 80), 2)
            
            for i, log in enumerate(battle_log[-3:]):
                log_text = font_small.render(log, True, BLACK)
                screen.blit(log_text, (60, 560 + i * 25))
            
            # 攻击按钮
            draw_button(100, 650, 300, 70, "攻击！", RED)
            draw_button(500, 650, 200, 70, "返回", GRAY)
        
        elif state == "result":
            # 结果
            result_text = font_large.render(winner, True, RED if "输" in winner else GREEN)
            screen.blit(result_text, (SCREEN_WIDTH//2 - result_text.get_width()//2, 200))
            
            # 战斗日志
            pygame.draw.rect(screen, LIGHT_GRAY, (100, 300, SCREEN_WIDTH - 200, 150))
            pygame.draw.rect(screen, BLACK, (100, 300, SCREEN_WIDTH - 200, 150), 2)
            
            title_text = font_medium.render("战斗日志", True, BLACK)
            screen.blit(title_text, (SCREEN_WIDTH//2 - title_text.get_width()//2, 310))
            
            for i, log in enumerate(battle_log[-5:]):
                log_text = font_tiny.render(log, True, BLACK)
                screen.blit(log_text, (120, 350 + i * 20))
            
            # 再来一局
            draw_button(400, 500, 224, 60, "再来一局", GREEN)
        
        pygame.display.flip()
        clock.tick(30)
    
    pygame.quit()

if __name__ == "__main__":
    print("="*50)
    print("OpenClaw MMO - Tuxemon网络对战")
    print("="*50)
    print("\n提示:")
    print("  1. 点击'开始对战'")
    print("  2. 选择你的怪物")
    print("  3. 系统会自动匹配对手")
    print("  4. 点击'攻击!'进行对战")
    print("="*50)
    main()
