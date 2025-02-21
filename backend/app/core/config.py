from pydantic_settings import BaseSettings
from typing import Optional
import os
from dotenv import load_dotenv
import logging.config

load_dotenv()

class Settings(BaseSettings):
    PROJECT_NAME: str = "邮轮供应链管理系统"
    PROJECT_VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    POSTGRES_SERVER: str = os.getenv("POSTGRES_SERVER", "localhost")
    POSTGRES_USER: str = os.getenv("POSTGRES_USER", "postgres")
    POSTGRES_PASSWORD: str = os.getenv("POSTGRES_PASSWORD", "postgres")
    POSTGRES_DB: str = os.getenv("POSTGRES_DB", "cruise_system")
    SQLALCHEMY_DATABASE_URI: Optional[str] = None

    # SMTP配置
    SMTP_HOST: str = os.getenv("SMTP_HOST", "smtp.gmail.com")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USERNAME: Optional[str] = None
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "")
    SENDER_EMAIL: Optional[str] = None

    # 日志配置
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"

    # SMTP设置
    SMTP_USER: str = os.getenv("SMTP_USER", "")

    @property
    def get_database_url(self) -> str:
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
        logging.config.dictConfig(logging_config)

    class Config:
        case_sensitive = True
        env_file = ".env"

settings = Settings()
settings.SQLALCHEMY_DATABASE_URI = settings.get_database_url
settings.setup_logging() 