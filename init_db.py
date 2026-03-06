"""
数据库初始化脚本
"""
import os
import sys
import io
from sqlalchemy import create_engine, text
from sqlalchemy.exc import SQLAlchemyError

# 设置UTF-8编码
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

def get_database_config():
    """获取数据库配置"""
    print("="*50)
    print("🔧 数据库配置")
    print("="*50)
    
    # 从环境变量读取，或使用默认值
    db_host = os.getenv("DB_HOST", "localhost")
    db_port = os.getenv("DB_PORT", "3306")
    db_user = os.getenv("DB_USER", "root")
    db_password = os.getenv("DB_PASSWORD", "")
    db_name = os.getenv("DB_NAME", "openclaw_mmo")
    
    print(f"\n当前配置:")
    print(f"  主机: {db_host}")
    print(f"  端口: {db_port}")
    print(f"  用户: {db_user}")
    print(f"  密码: {'*' * len(db_password) if db_password else '(空)'}")
    print(f"  数据库: {db_name}")
    
    # 提示用户修改配置
    print("\n如果配置不正确，请设置环境变量:")
    print("  Windows CMD:")
    print("    set DB_HOST=localhost")
    print("    set DB_PORT=3306")
    print("    set DB_USER=root")
    print("    set DB_PASSWORD=your_password")
    print("    set DB_NAME=openclaw_mmo")
    print("\n  Windows PowerShell:")
    print("    $env:DB_HOST='localhost'")
    print("    $env:DB_PORT='3306'")
    print("    $env:DB_USER='root'")
    print("    $env:DB_PASSWORD='your_password'")
    print("    $env:DB_NAME='openclaw_mmo'")
    
    return db_host, db_port, db_user, db_password, db_name

def init_database():
    """初始化数据库"""
    db_host, db_port, db_user, db_password, db_name = get_database_config()
    
    print("\n" + "="*50)
    print("🚀 开始初始化数据库")
    print("="*50)
    
    # 测试连接到MySQL服务器
    try:
        server_url = f"mysql+pymysql://{db_user}:{db_password}@{db_host}:{db_port}/"
        server_engine = create_engine(server_url, pool_pre_ping=True)
        
        with server_engine.connect() as conn:
            result = conn.execute(text("SELECT VERSION()"))
            version = result.fetchone()[0]
            print(f"✅ MySQL服务器连接成功 (版本: {version})")
    except SQLAlchemyError as e:
        print(f"❌ MySQL服务器连接失败: {str(e)}")
        print("\n请确保:")
        print("  1. MySQL已安装并运行")
        print("  2. 用户名和密码正确")
        print("  3. MySQL服务正在运行（端口3306）")
        return False
    
    # 创建数据库（如果不存在）
    try:
        with server_engine.connect() as conn:
            result = conn.execute(text(f"SHOW DATABASES LIKE '{db_name}'"))
            db_exists = result.fetchone() is not None
            
            if not db_exists:
                print(f"⚠️  数据库 '{db_name}' 不存在，正在创建...")
                conn.execute(text(f"CREATE DATABASE {db_name} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"))
                conn.commit()
                print(f"✅ 数据库 '{db_name}' 创建成功")
            else:
                print(f"✅ 数据库 '{db_name}' 已存在")
    except SQLAlchemyError as e:
        print(f"❌ 数据库创建失败: {str(e)}")
        return False
    
    # 连接到数据库并创建表
    try:
        db_url = f"mysql+pymysql://{db_user}:{db_password}@{db_host}:{db_port}/{db_name}"
        db_engine = create_engine(db_url, pool_pre_ping=True)
        
        # 导入模型
        from database import Base, init_db
        
        # 创建所有表
        print("\n📋 创建数据库表...")
        init_db()
        
        print("\n" + "="*50)
        print("✅ 数据库初始化完成！")
        print("="*50)
        print(f"\n数据库信息:")
        print(f"  主机: {db_host}:{db_port}")
        print(f"  数据库: {db_name}")
        print(f"  用户: {db_user}")
        
        return True
        
    except SQLAlchemyError as e:
        print(f"❌ 数据库表创建失败: {str(e)}")
        return False

if __name__ == "__main__":
    success = init_database()
    sys.exit(0 if success else 1)
