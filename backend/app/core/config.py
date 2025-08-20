from pydantic_settings import BaseSettings
from typing import Optional
import os
from dotenv import load_dotenv
import logging.config
import secrets

# 根据环境变量加载对应的配置文件
env = os.getenv("ENV", "development")
env_file = f".env.{env}" if env != "development" else ".env"
load_dotenv(env_file)

class Settings(BaseSettings):
    # 环境设置
    ENV: str = os.getenv("ENV", "development")
    DEBUG: bool = ENV == "development"

    PROJECT_NAME: str = "邮轮供应链管理系统"
    PROJECT_VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"

    # 数据库设置
    POSTGRES_SERVER: str = os.getenv("POSTGRES_SERVER", "localhost")
    POSTGRES_USER: str = os.getenv("POSTGRES_USER", "postgres")
    POSTGRES_PASSWORD: str = os.getenv("POSTGRES_PASSWORD", "postgres")
    POSTGRES_DB: str = os.getenv("POSTGRES_DB", f"cruise_system_{ENV}")
    SQLALCHEMY_DATABASE_URI: Optional[str] = None

    # Supabase数据库设置
    SUPABASE_DB_URL: Optional[str] = os.getenv("SUPABASE_DB_URL")
    SUPABASE_URL: Optional[str] = os.getenv("SUPABASE_URL")
    SUPABASE_ANON_KEY: Optional[str] = os.getenv("SUPABASE_ANON_KEY")

    # SQLite数据库设置
    SQLITE_DB_PATH: Optional[str] = os.getenv("SQLITE_DB_PATH")

    # JWT设置
    SECRET_KEY: str = os.getenv("SECRET_KEY") or secrets.token_urlsafe(32)
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        # 生产环境必须设置SECRET_KEY环境变量
        if self.ENV == "production" and not os.getenv("SECRET_KEY"):
            raise ValueError("生产环境必须设置SECRET_KEY环境变量")

    # SMTP配置
    SMTP_HOST: str = os.getenv("SMTP_HOST", "smtp.gmail.com")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USERNAME: Optional[str] = None
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "")
    SENDER_EMAIL: Optional[str] = None

    # 日志配置
    LOG_LEVEL: str = "DEBUG" if DEBUG else "INFO"
    LOG_FORMAT: str = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"

    # SMTP设置
    SMTP_USER: str = os.getenv("SMTP_USER", "")

    # 默认超级管理员
    FIRST_SUPERADMIN: str = os.getenv("FIRST_SUPERADMIN", "admin@example.com")
    FIRST_SUPERADMIN_PASSWORD: str = os.getenv("FIRST_SUPERADMIN_PASSWORD", "adminpassword")

    # CORS配置
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:3000")
    ALLOWED_ORIGINS: str = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:3001,http://127.0.0.1:3000,http://127.0.0.1:3001,https://curisedbfronted-qk6vhby5m-terryzhang-jps-projects.vercel.app,https://curisedbfronted-h8b2rwhqz-terryzhang-jps-projects.vercel.app,https://curisedbfronted-aetbxi22h-terryzhang-jps-projects.vercel.app,https://curisedbfronted-n873hhhmv-terryzhang-jps-projects.vercel.app,https://curisedbfronted.vercel.app")

    @property
    def get_allowed_origins(self) -> list:
        """获取允许的CORS源列表"""
        if self.ENV == "development":
            # 开发环境允许所有源
            return ["*"]
        else:
            # 生产环境使用配置的源
            return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",") if origin.strip()]

    @property
    def get_database_url(self) -> str:
        # 优先使用SQLite数据库（本地开发）
        if self.SQLITE_DB_PATH:
            return f"sqlite:///{self.SQLITE_DB_PATH}"
        # 其次使用Supabase数据库URL（如果配置了的话）
        if self.SUPABASE_DB_URL:
            return self.SUPABASE_DB_URL
        return f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_SERVER}/{self.POSTGRES_DB}"

    def setup_logging(self):
        logging_config = {
            "version": 1,
            "disable_existing_loggers": False,
            "formatters": {
                "default": {
                    "format": self.LOG_FORMAT
                }
            },
            "handlers": {
                "console": {
                    "class": "logging.StreamHandler",
                    "formatter": "default",
                    "level": self.LOG_LEVEL
                }
            },
            "root": {
                "handlers": ["console"],
                "level": self.LOG_LEVEL
            }
        }

        # 只在开发环境中添加文件处理器
        if self.ENV == "development":
            logging_config["handlers"]["file"] = {
                "class": "logging.FileHandler",
                "formatter": "default",
                "filename": f"logs/app_{self.ENV}.log",
                "level": self.LOG_LEVEL
            }
            logging_config["root"]["handlers"].append("file")

            # 确保logs目录存在
            os.makedirs("logs", exist_ok=True)

        logging.config.dictConfig(logging_config)

    class Config:
        case_sensitive = True
        env_file = env_file
        extra = "ignore"  # 忽略额外的环境变量

settings = Settings()
settings.SQLALCHEMY_DATABASE_URI = settings.get_database_url
settings.setup_logging()