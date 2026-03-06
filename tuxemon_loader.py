"""
OpenClaw MMO - Tuxemon完整资源加载器（无emoji版）
"""
import json
import os
from pathlib import Path

TUXEMON_PATH = Path(r"C:\Users\Administrator\.openclaw\agents\youxiangfa\workspace\Tuxemon\mods\tuxemon")

class TuxemonResourceLoader:
    def __init__(self):
        self.monsters = {}
        self.maps = {}
        self.npcs = {}
        self.items = {}
        self.techniques = {}
        
    def load_monsters(self):
        monster_dir = TUXEMON_PATH / "db" / "monster"
        if not monster_dir.exists():
            print(f"[WARNING] Monster directory not found: {monster_dir}")
            return
        
        for json_file in monster_dir.glob("*.json"):
            try:
                with open(json_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    slug = json_file.stem
                    self.monsters[slug] = data
            except Exception as e:
                print(f"[WARNING] Failed to load {json_file}: {e}")
        
        print(f"[OK] Loaded {len(self.monsters)} monsters")
        return self.monsters
    
    def load_techniques(self):
        technique_dir = TUXEMON_PATH / "db" / "technique"
        if not technique_dir.exists():
            return
        
        for json_file in technique_dir.glob("*.json"):
            try:
                with open(json_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    slug = json_file.stem
                    self.techniques[slug] = data
            except Exception as e:
                pass
        
        print(f"[OK] Loaded {len(self.techniques)} techniques")
    
    def load_items(self):
        item_dir = TUXEMON_PATH / "db" / "item"
        if not item_dir.exists():
            return
        
        for json_file in item_dir.glob("*.json"):
            try:
                with open(json_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    slug = json_file.stem
                    self.items[slug] = data
            except Exception as e:
                pass
        
        print(f"[OK] Loaded {len(self.items)} items")
    
    def get_sprite_url(self, monster_slug):
        return f"/api/sprite/{monster_slug}/frame/1"
    
    def get_all_resources_info(self):
        return {
            "monsters": len(self.monsters),
            "techniques": len(self.techniques),
            "items": len(self.items),
            "monsters_list": list(self.monsters.keys())[:20],
            "sample_monster": self.monsters.get('flambear', {})
        }

loader = TuxemonResourceLoader()

if __name__ == "__main__":
    loader.load_monsters()
    loader.load_techniques()
    loader.load_items()
    print(json.dumps(loader.get_all_resources_info(), indent=2))
