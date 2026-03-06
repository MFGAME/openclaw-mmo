"""
测试数据库连接
"""
import sys
from sqlalchemy import create_engine, text
from sqlalchemy.exc import SQLAlchemyError

def test_database_connection():
    """测试数据库连接"""
    import sys
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    
    print("="*50)
    print("🧪 测试数据库连接")
    print("="*50)
    
    # 数据库配置
    DB_HOST = "localhost"
    DB_PORT = "3306"
    DB_USER = "root"
    DB_PASSWORD = ""
    DB_NAME = "openclaw_mmo"
    
    # 测试连接到MySQL服务器（不指定数据库）
    try:
        server_url = f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/"
        server_engine = create_engine(server_url, pool_pre_ping=True)
        
        with server_engine.connect() as conn:
            result = conn.execute(text("SELECT VERSION()"))
            version = result.fetchone()[0]
            print(f"✅ MySQL服务器连接成功")
            print(f"   MySQL版本: {version}")
    except SQLAlchemyError as e:
        print(f"❌ MySQL服务器连接失败")
        print(f"   错误: {str(e)}")
        print("\n请确保:")
        print("  1. MySQL已安装并运行")
        print("  2. 用户名和密码正确")
        print("  3. MySQL服务正在运行（端口3306）")
        return False
    
    # 测试数据库是否存在
    try:
        server_url = f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/"
        server_engine = create_engine(server_url, pool_pre_ping=True)
        
        with server_engine.connect() as conn:
            result = conn.execute(text(f"SHOW DATABASES LIKE '{DB_NAME}'"))
            db_exists = result.fetchone() is not None
            
            if not db_exists:
                print(f"⚠️  数据库 '{DB_NAME}' 不存在")
                print("   正在创建数据库...")
                
                conn.execute(text(f"CREATE DATABASE {DB_NAME} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"))
                conn.commit()
                print(f"✅ 数据库 '{DB_NAME}' 创建成功")
            else:
                print(f"✅ 数据库 '{DB_NAME}' 已存在")
    except SQLAlchemyError as e:
        print(f"❌ 数据库检查/创建失败")
        print(f"   错误: {str(e)}")
        return False
    
    # 测试连接到指定数据库
    try:
        db_url = f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
        db_engine = create_engine(db_url, pool_pre_ping=True)
        
        with db_engine.connect() as conn:
            result = conn.execute(text("SELECT DATABASE()"))
            db_name = result.fetchone()[0]
            print(f"✅ 数据库连接成功: {db_name}")
    except SQLAlchemyError as e:
        print(f"❌ 数据库连接失败")
        print(f"   错误: {str(e)}")
        return False
    
    print("\n" + "="*50)
    print("✅ 所有数据库测试通过！")
    print("="*50)
    return True

if __name__ == "__main__":
    success = test_database_connection()
    sys.exit(0 if success else 1)
