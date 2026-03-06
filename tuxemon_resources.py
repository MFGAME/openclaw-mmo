"""
OpenClaw MMO - Tuxemon资源API
提供Tuxemon的美术资源访问
"""
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse, Response
import os

# Tuxemon资源路径
TUXEMON_PATH = r"C:\Users\Administrator\.openclaw\agents\youxiangfa\workspace\Tuxemon"
SPRITE_DIR = os.path.join(TUXEMON_PATH, "mods", "tuxemon", "gfx", "sprites", "battle")

def setup_resource_routes(app: FastAPI):
    """设置资源路由"""
    
    @app.get("/api/sprite/{monster_slug}")
    async def get_monster_sprite(monster_slug: str):
        """获取怪物精灵图"""
        sprite_file = os.path.join(SPRITE_DIR, f"{monster_slug}-sheet.png")
        
        if os.path.exists(sprite_file):
            return FileResponse(sprite_file, media_type="image/png")
        else:
            raise HTTPException(status_code=404, detail="Sprite not found")
    
    @app.get("/api/sprite/{monster_slug}/frame/{frame_num}")
    async def get_monster_sprite_frame(monster_slug: str, frame_num: int = 1):
        """获取怪物精灵图的特定帧"""
        sprite_file = os.path.join(SPRITE_DIR, f"{monster_slug}-sheet.png")
        
        if not os.path.exists(sprite_file):
            raise HTTPException(status_code=404, detail="Sprite not found")
        
        try:
            from PIL import Image
            import io
            
            # 加载精灵图
            img = Image.open(sprite_file)
            
            # Tuxemon精灵图通常是96x96一帧
            frame_width = 96
            frame_height = 96
            
            # 计算帧位置（取中间的站立帧）
            frame_x = frame_width * min(frame_num, 2)
            frame_y = 0
            
            # 裁剪帧
            frame = img.crop((frame_x, frame_y, frame_x + frame_width, frame_y + frame_height))
            
            # 转换为字节
            img_byte_arr = io.BytesIO()
            frame.save(img_byte_arr, format='PNG')
            img_byte_arr.seek(0)
            
            return Response(content=img_byte_arr.getvalue(), media_type="image/png")
        except Exception as e:
            print(f"Error processing sprite: {e}")
            raise HTTPException(status_code=500, detail=str(e))

print("[OK] Tuxemon resource routes registered")
print(f"[OK] Sprite directory: {SPRITE_DIR}")
print(f"[OK] Available sprites: {len([f for f in os.listdir(SPRITE_DIR) if f.endswith('-sheet.png')])}")
