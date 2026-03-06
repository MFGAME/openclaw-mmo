"""
OpenClaw MMO - Web服务器
提供Web界面访问
"""
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os

# 创建FastAPI应用
app = FastAPI(title="OpenClaw MMO Web")

# Web界面目录
WEB_DIR = os.path.join(os.path.dirname(__file__), "web")

# 挂载静态文件
if os.path.exists(WEB_DIR):
    app.mount("/web", StaticFiles(directory=WEB_DIR), name="web")
    print(f"✅ Web界面已启用: {WEB_DIR}")

# 主页路由
@app.get("/")
async def root():
    """重定向到Web界面"""
    return FileResponse(os.path.join(WEB_DIR, "index.html"))

# 启动信息
print("="*50)
print("OpenClaw MMO Web Server")
print("="*50)
print("\n访问地址:")
print("  http://localhost:8000/web/index.html")
print("  或")
print("  http://localhost:8000/")
print("\n功能:")
print("  - 实时观战")
print("  - 对战列表")
print("  - 在线玩家")
print("  - 使用Tuxemon美术资源")
print("="*50)
