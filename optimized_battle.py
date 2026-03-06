"""
OpenClaw MMO - 优化版网络对战
修复：卡顿、乱码、图片、点击问题
"""
import pygame
import requests
import sys
import os
import random
import time

# 初始化
pygame.init()
pygame.font.init()

# 屏幕
screen = pygame.display.set_mode((1024, 768))
pygame.display.set_caption("OpenClaw MMO")

# 使用系统字体解决乱码
try:
    # Windows中文字体
    font_path = "C:/Windows/Fonts/msyh.ttc"
    if os.path.exists(font_path):
        font_large = pygame.font.Font(font_path, 48)
        font_medium = pygame.font.Font(font_path, 36)
        font_small = pygame.font.Font(font_path, 28)
    else:
        font_large = pygame.font.SysFont('arial', 48)
        font_medium = pygame.font.SysFont('arial', 36)
        font_small = pygame.font.SysFont('arial', 28)
except:
    font_large = pygame.font.Font(None, 48)
    font_medium = pygame.font.Font(None, 36)
    font_small = pygame.font.Font(None, 28)

# 颜色
WHITE = (255, 255, 255)
BLACK = (0, 0, 0)
GRAY = (200, 200, 200)
RED = (255, 100, 100)
GREEN = (100, 255, 100)
BLUE = (100, 100, 255)

# API
BASE_URL = "http://localhost:8000"

# 资源路径
SPRITE_DIR = r"C:\Users\Administrator\.openclaw\agents\youxiangfa\workspace\Tuxemon\mods\tuxemon\gfx\sprites\battle"

# 缓存
sprites = {}
monster_data_cache = {}

# 怪物列表
MONSTERS = ["aardart", "dollfin", "flambear", "budaye", "pikachu", 
            "rockitten", "sumob", "propell", "eaglace", "nightmerge"]

def get_sprite(slug):
    """加载精灵图（带缓存）"""
    if slug in sprites:
        return sprites[slug]
    
    path = os.path.join(SPRITE_DIR, f"{slug}-sheet.png")
    
    if os.path.exists(path):
        try:
            img = pygame.image.load(path).convert_alpha()
            # 提取中间帧
            sprite = img.subsurface(pygame.Rect(96, 0, 96, 96))
            sprite = pygame.transform.scale(sprite, (150, 150))
            sprites[slug] = sprite
            return sprite
        except Exception as e:
            print(f"Load sprite error: {e}")
    
    # 占位符
    surface = pygame.Surface((150, 150))
    surface.fill(GRAY)
    pygame.draw.rect(surface, BLACK, (0, 0, 150, 150), 3)
    text = font_small.render(slug[:5], True, BLACK)
    surface.blit(text, (75 - text.get_width()//2, 75 - text.get_height()//2))
    sprites[slug] = surface
    return surface

def api_call(endpoint, method="GET", data=None):
    """API调用（带缓存和错误处理）"""
    try:
        url = f"{BASE_URL}{endpoint}"
        if method == "GET":
            response = requests.get(url, timeout=2)
        else:
            response = requests.post(url, json=data, timeout=2)
        
        if response.status_code == 200:
            return response.json()
    except Exception as e:
        print(f"API error: {e}")
    return None

def draw_text(x, y, text, font=font_medium, color=BLACK):
    """绘制文字"""
    surf = font.render(text, True, color)
    screen.blit(surf, (x, y))

def draw_button(x, y, w, h, text, color=BLUE):
    """绘制按钮"""
    pygame.draw.rect(screen, color, (x, y, w, h))
    pygame.draw.rect(screen, BLACK, (x, y, w, h), 2)
    draw_text(x + w//2, y + h//2 - 15, text, font_medium, WHITE)

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
    
    pygame.draw.rect(screen, BLACK, (x, y, w, h), 2)
    draw_text(x + 5, y + 3, f"{hp}/{max_hp}", font_small, BLACK)

def draw_monster_card(x, y, sprite, name, level, hp, max_hp, is_player=True):
    """绘制怪物卡片"""
    # 背景
    card_color = (220, 240, 220) if is_player else (240, 220, 220)
    pygame.draw.rect(screen, card_color, (x, y, 300, 350))
    pygame.draw.rect(screen, BLACK, (x, y, 300, 350), 3)
    
    # 精灵
    screen.blit(sprite, (x + 75, y + 30))
    
    # 信息
    draw_text(x + 10, y + 200, f"{name}", font_medium, BLACK)
    draw_text(x + 10, y + 240, f"Lv.{level}", font_small, GRAY)
    
    # HP
    draw_hp_bar(x + 10, y + 280, 280, 30, hp, max_hp)

# 游戏状态
class GameState:
    def __init__(self):
        self.state = "menu"  # menu, select, battle, result
        self.robot_id = None
        self.battle_id = None
        self.my_monster = None
        self.opp_monster = None
        self.battle_logs = []
        self.winner = None
        self.last_api_call = 0
        self.world_status = None
        
        # 注册机器人
        self.register()
    
    def register(self):
        """注册"""
        data = api_call("/api/robot/register", "POST", {
            "api_key": f"game_{random.randint(1000,9999)}",
            "name": f"Player_{random.randint(100,999)}",
            "personality": "aggressive"
        })
        if data:
            self.robot_id = data['robot_id']
    
    def create_monster(self, slug, level=5):
        """创建怪物"""
        data = api_call("/api/monster/create", "POST", {
            "robot_id": self.robot_id,
            "monster_slug": slug,
            "level": level
        })
        return data['monster'] if data else None
    
    def find_opponent(self):
        """找对手"""
        data = api_call("/api/robots")
        if data:
            robots = data['robots']
            opponents = [r for r in robots if r['id'] != self.robot_id]
            return opponents[0] if opponents else None
        return None
    
    def start_battle(self, my_slug):
        """开始对战"""
        # 创建怪物
        self.my_monster = self.create_monster(my_slug, 5)
        if not self.my_monster:
            return False
        
        # 找对手
        opponent = self.find_opponent()
        if not opponent:
            print("No opponent found")
            return False
        
        # 创建对手怪物
        self.opp_monster = self.create_monster(random.choice(MONSTERS), 5)
        if not self.opp_monster:
            return False
        
        # 创建对战
        data = api_call("/api/battle/create", "POST", {
            "player1_id": self.robot_id,
            "player2_id": opponent['id'],
            "player1_monsters": [self.my_monster['id']],
            "player2_monsters": [self.opp_monster['id']]
        })
        
        if data:
            self.battle_id = data['battle_id']
            self.battle_logs = []
            return True
        return False
    
    def attack(self):
        """攻击"""
        data = api_call("/api/battle/action", "POST", {
            "battle_id": self.battle_id,
            "robot_id": self.robot_id,
            "monster_id": self.my_monster['id'],
            "target_id": self.opp_monster['id'],
            "technique_id": "tackle"
        })
        
        if data:
            self.opp_monster['hp'] = data['defender_hp']
            log = data['log']
            self.battle_logs.append(
                f"Turn {log['turn']}: {log['attacker']} -> {log['defender']}, {log['damage']} damage"
            )
            
            if data['battle_ended']:
                self.winner = "You Win!" if data['winner_id'] == self.robot_id else "You Lose!"
                self.state = "result"
        
        return data
    
    def get_world_status(self):
        """获取世界状态（带缓存）"""
        now = time.time()
        if now - self.last_api_call > 3:  # 每3秒更新一次
            self.world_status = api_call("/api/world/status")
            self.last_api_call = now
        return self.world_status

# 主循环
def main():
    clock = pygame.time.Clock()
    game = GameState()
    
    running = True
    while running:
        # 事件处理
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False
            
            elif event.type == pygame.MOUSEBUTTONDOWN:
                mx, my = event.pos
                
                if game.state == "menu":
                    # 开始按钮
                    if 400 <= mx <= 624 and 400 <= my <= 460:
                        game.state = "select"
                
                elif game.state == "select":
                    # 怪物选择（2行5列）
                    for i, slug in enumerate(MONSTERS):
                        col = i % 5
                        row = i // 5
                        btn_x = 50 + col * 190
                        btn_y = 200 + row * 250
                        
                        if btn_x <= mx <= btn_x + 180 and btn_y <= my <= btn_y + 240:
                            if game.start_battle(slug):
                                game.state = "battle"
                            break
                
                elif game.state == "battle":
                    # 攻击按钮
                    if 100 <= mx <= 400 and 650 <= my <= 720:
                        game.attack()
                    
                    # 返回
                    if 500 <= mx <= 700 and 650 <= my <= 720:
                        game.state = "menu"
                
                elif game.state == "result":
                    # 再来
                    if 400 <= mx <= 624 and 500 <= my <= 560:
                        game.state = "menu"
                        game.battle_logs = []
        
        # 绘制
        screen.fill(WHITE)
        
        if game.state == "menu":
            # 标题
            draw_text(300, 100, "OpenClaw MMO", font_large, BLUE)
            draw_text(350, 160, "Network Battle", font_medium, BLACK)
            
            # 开始按钮
            draw_button(400, 400, 224, 60, "Start Battle", GREEN)
            
            # 状态
            status = game.get_world_status()
            if status:
                draw_text(350, 600, f"Online: {status['online_robots']} | Battles: {status['active_battles']}", 
                         font_medium, BLACK)
        
        elif game.state == "select":
            draw_text(350, 50, "Select Monster", font_large, BLACK)
            
            for i, slug in enumerate(MONSTERS):
                col = i % 5
                row = i // 5
                btn_x = 50 + col * 190
                btn_y = 200 + row * 250
                
                # 卡片
                pygame.draw.rect(screen, GRAY, (btn_x, btn_y, 180, 240))
                pygame.draw.rect(screen, BLACK, (btn_x, btn_y, 180, 240), 2)
                
                # 精灵
                sprite = get_sprite(slug)
                small = pygame.transform.scale(sprite, (120, 120))
                screen.blit(small, (btn_x + 30, btn_y + 20))
                
                # 名字
                draw_text(btn_x + 10, btn_y + 160, slug.capitalize(), font_small, BLACK)
        
        elif game.state == "battle":
            # 对手
            if game.opp_monster:
                opp_sprite = get_sprite(game.opp_monster['slug'])
                draw_monster_card(
                    600, 50, opp_sprite,
                    game.opp_monster['name'],
                    game.opp_monster['level'],
                    game.opp_monster['hp'],
                    game.opp_monster['max_hp'],
                    False
                )
            
            # 玩家
            if game.my_monster:
                my_sprite = get_sprite(game.my_monster['slug'])
                draw_monster_card(
                    100, 300, my_sprite,
                    game.my_monster['name'],
                    game.my_monster['level'],
                    game.my_monster['hp'],
                    game.my_monster['max_hp'],
                    True
                )
            
            # VS
            draw_text(480, 250, "VS", font_large, RED)
            
            # 日志
            pygame.draw.rect(screen, GRAY, (50, 550, 924, 80))
            pygame.draw.rect(screen, BLACK, (50, 550, 924, 80), 2)
            
            for i, log in enumerate(game.battle_logs[-3:]):
                draw_text(60, 560 + i * 25, log, font_small, BLACK)
            
            # 按钮
            draw_button(100, 650, 300, 70, "Attack!", RED)
            draw_button(500, 650, 200, 70, "Back", GRAY)
        
        elif game.state == "result":
            # 结果
            color = GREEN if "Win" in game.winner else RED
            draw_text(400, 200, game.winner, font_large, color)
            
            # 日志
            pygame.draw.rect(screen, GRAY, (100, 300, 824, 150))
            pygame.draw.rect(screen, BLACK, (100, 300, 824, 150), 2)
            
            draw_text(450, 310, "Battle Log", font_medium, BLACK)
            
            for i, log in enumerate(game.battle_logs[-5:]):
                draw_text(120, 350 + i * 20, log, font_small, BLACK)
            
            # 再来
            draw_button(400, 500, 224, 60, "Play Again", GREEN)
        
        pygame.display.flip()
        clock.tick(30)
    
    pygame.quit()

if __name__ == "__main__":
    main()
