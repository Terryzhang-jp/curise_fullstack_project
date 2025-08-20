from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from typing import Dict, List, Any, Optional, Tuple
import logging
import pandas as pd
import numpy as np
import io
import os
import json
from datetime import datetime
from enum import Enum
from difflib import SequenceMatcher
import re

from app.api.deps import get_db, get_current_active_user
from app.models.models import User, Country, Category, Port, Company, Supplier, Product, Ship
from app.core.config import settings

router = APIRouter()
logger = logging.getLogger(__name__)

def clean_nan_values(obj):
    """递归清理对象中的NaN值，将其转换为None"""
    if isinstance(obj, dict):
        return {k: clean_nan_values(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [clean_nan_values(item) for item in obj]
    elif isinstance(obj, float) and (np.isnan(obj) or np.isinf(obj)):
        return None
    elif pd.isna(obj):
        return None
    else:
        return obj

# 支持的文件类型
ALLOWED_EXTENSIONS = {'.xlsx', '.xls', '.csv'}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB

class DuplicateHandlingStrategy(Enum):
    """重复数据处理策略"""
    SKIP = "skip"           # 跳过重复数据
    ERROR = "error"         # 报错停止
    UPDATE = "update"       # 更新现有数据

class ImportResult:
    """导入结果类"""
    def __init__(self):
        self.success_count = 0
        self.error_count = 0
        self.skipped_count = 0
        self.errors = []
        self.skipped_items = []
        self.warnings = []

    def to_dict(self) -> Dict[str, Any]:
        # 格式化错误信息
        formatted_errors = format_validation_errors(self.errors) if self.errors else []

        result = {
            "success_count": self.success_count,
            "error_count": self.error_count,
            "skipped_count": self.skipped_count,
            "errors": self.errors,  # 保留原始错误用于兼容性
            "formatted_errors": formatted_errors,  # 新增格式化错误
            "skipped_items": self.skipped_items,
            "warnings": self.warnings
        }

        # 清理NaN值以避免JSON序列化错误
        return clean_nan_values(result)

class PreCheckResult:
    """数据预检查结果类"""
    def __init__(self):
        self.new_items = []          # 数据库中不存在的新数据
        self.similar_items = []      # 数据库中存在相似的数据
        self.exact_duplicates = []   # 完全重复的数据
        self.validation_errors = []  # 验证错误

    def to_dict(self) -> Dict[str, Any]:
        # 格式化验证错误
        formatted_errors = []
        raw_errors = []

        for error_item in self.validation_errors:
            if isinstance(error_item, dict) and 'errors' in error_item:
                # 处理包含错误列表的项目
                for error in error_item['errors']:
                    raw_errors.append(error)
                    formatted_errors.append(format_user_friendly_error(error))
            elif isinstance(error_item, str):
                # 处理直接的错误字符串
                raw_errors.append(error_item)
                formatted_errors.append(format_user_friendly_error(error_item))
            else:
                # 保持原有格式
                raw_errors.append(str(error_item))
                formatted_errors.append(format_user_friendly_error(str(error_item)))

        result = {
            "new_items": self.new_items,
            "similar_items": self.similar_items,
            "exact_duplicates": self.exact_duplicates,
            "validation_errors": self.validation_errors,  # 保留原始格式用于兼容性
            "formatted_errors": formatted_errors,  # 新增格式化错误
            "raw_errors": raw_errors,  # 原始错误信息用于调试
            "summary": {
                "new_count": len(self.new_items),
                "similar_count": len(self.similar_items),
                "duplicate_count": len(self.exact_duplicates),
                "error_count": len(self.validation_errors)
            }
        }

        # 清理NaN值以避免JSON序列化错误
        return clean_nan_values(result)

# 按数据类型定义重复数据处理策略
DUPLICATE_STRATEGIES = {
    "countries": DuplicateHandlingStrategy.SKIP,    # 基础数据跳过重复
    "categories": DuplicateHandlingStrategy.SKIP,   # 基础数据跳过重复
    "ports": DuplicateHandlingStrategy.ERROR,       # 地理数据报错
    "companies": DuplicateHandlingStrategy.ERROR,   # 公司数据报错
    "suppliers": DuplicateHandlingStrategy.ERROR,   # 供应商数据报错
    "ships": DuplicateHandlingStrategy.ERROR,       # 船舶数据报错
    "products": DuplicateHandlingStrategy.ERROR,    # 产品数据报错
}

def validate_file_type(filename: str) -> bool:
    """验证文件类型"""
    return any(filename.lower().endswith(ext) for ext in ALLOWED_EXTENSIONS)

def build_foreign_key_cache(table_name: str, db: Session) -> Dict[str, Dict[str, Any]]:
    """构建外键数据缓存，避免重复数据库查询"""
    cache = {}

    try:
        # 根据表类型加载相应的外键数据
        if table_name == "products":
            # 产品表需要的所有外键数据
            cache['countries'] = {c.name: {"id": c.id, "name": c.name, "code": c.code}
                                for c in db.query(Country).all()}
            cache['categories'] = {c.name: {"id": c.id, "name": c.name}
                                 for c in db.query(Category).all()}
            cache['suppliers'] = {s.name: {"id": s.id, "name": s.name, "country": s.country.name if s.country else None}
                                for s in db.query(Supplier).all()}
            cache['ports'] = {p.name: {"id": p.id, "name": p.name, "code": p.code, "country": p.country.name if p.country else None}
                            for p in db.query(Port).all()}
        elif table_name == "ports":
            cache['countries'] = {c.name: {"id": c.id, "name": c.name, "code": c.code}
                                for c in db.query(Country).all()}
        elif table_name == "companies":
            cache['countries'] = {c.name: {"id": c.id, "name": c.name, "code": c.code}
                                for c in db.query(Country).all()}
        elif table_name == "suppliers":
            cache['countries'] = {c.name: {"id": c.id, "name": c.name, "code": c.code}
                                for c in db.query(Country).all()}
        elif table_name == "ships":
            cache['companies'] = {c.name: {"id": c.id, "name": c.name, "country": c.country.name if c.country else None}
                                for c in db.query(Company).all()}

        logger.info(f"外键缓存构建完成: {table_name}, 缓存表数量: {len(cache)}")

    except Exception as e:
        logger.error(f"构建外键缓存失败: {str(e)}")

    return cache

def build_existing_data_cache(table_name: str, db: Session) -> List[Dict[str, Any]]:
    """构建现有数据缓存，用于重复检查和相似性检查"""
    cache = []

    try:
        if table_name == "countries":
            cache = [{"id": c.id, "name": c.name, "code": c.code} for c in db.query(Country).all()]
        elif table_name == "categories":
            cache = [{"id": c.id, "name": c.name} for c in db.query(Category).all()]
        elif table_name == "ports":
            cache = [{"id": p.id, "name": p.name, "code": p.code, "country": p.country.name if p.country else None}
                   for p in db.query(Port).all()]
        elif table_name == "companies":
            cache = [{"id": c.id, "name": c.name, "country": c.country.name if c.country else None}
                   for c in db.query(Company).all()]
        elif table_name == "suppliers":
            cache = [{"id": s.id, "name": s.name, "country": s.country.name if s.country else None}
                   for s in db.query(Supplier).all()]
        elif table_name == "ships":
            cache = [{"id": s.id, "name": s.name, "company": s.company.name if s.company else None}
                   for s in db.query(Ship).all()]
        elif table_name == "products":
            cache = [{"id": p.id, "product_name_en": p.product_name_en, "product_name_jp": p.product_name_jp, "code": p.code}
                   for p in db.query(Product).all()]

        logger.info(f"现有数据缓存构建完成: {table_name}, 记录数量: {len(cache)}")

    except Exception as e:
        logger.error(f"构建现有数据缓存失败: {str(e)}")

    return cache

def calculate_similarity(str1: str, str2: str) -> float:
    """计算两个字符串的相似度 (0-1)"""
    if not str1 or not str2:
        return 0.0

    # 标准化字符串：去除空格、转小写
    s1 = str(str1).strip().lower()
    s2 = str(str2).strip().lower()

    if s1 == s2:
        return 1.0

    # 使用SequenceMatcher计算相似度
    return SequenceMatcher(None, s1, s2).ratio()

def find_similar_items(table_name: str, new_item: Dict[str, Any], db: Session, threshold: float = 0.8) -> List[Dict[str, Any]]:
    """查找数据库中与新项目相似的项目"""
    similar_items = []

    try:
        if table_name == "countries":
            existing_items = db.query(Country).all()
            for item in existing_items:
                similarity = calculate_similarity(new_item.get("name", ""), item.name)
                if similarity >= threshold:
                    similar_items.append({
                        "existing_item": {"id": item.id, "name": item.name, "code": item.code},
                        "similarity": similarity,
                        "match_field": "name"
                    })

        elif table_name == "categories":
            existing_items = db.query(Category).all()
            for item in existing_items:
                similarity = calculate_similarity(new_item.get("name", ""), item.name)
                if similarity >= threshold:
                    similar_items.append({
                        "existing_item": {"id": item.id, "name": item.name},
                        "similarity": similarity,
                        "match_field": "name"
                    })

        elif table_name == "ports":
            existing_items = db.query(Port).all()
            for item in existing_items:
                name_similarity = calculate_similarity(new_item.get("name", ""), item.name)
                if name_similarity >= threshold:
                    similar_items.append({
                        "existing_item": {
                            "id": item.id,
                            "name": item.name,
                            "code": item.code,
                            "country": item.country.name if item.country else None
                        },
                        "similarity": name_similarity,
                        "match_field": "name"
                    })

        elif table_name == "companies":
            existing_items = db.query(Company).all()
            for item in existing_items:
                name_similarity = calculate_similarity(new_item.get("name", ""), item.name)
                if name_similarity >= threshold:
                    similar_items.append({
                        "existing_item": {
                            "id": item.id,
                            "name": item.name,
                            "country": item.country.name if item.country else None
                        },
                        "similarity": name_similarity,
                        "match_field": "name"
                    })

        elif table_name == "suppliers":
            existing_items = db.query(Supplier).all()
            for item in existing_items:
                name_similarity = calculate_similarity(new_item.get("name", ""), item.name)
                if name_similarity >= threshold:
                    similar_items.append({
                        "existing_item": {
                            "id": item.id,
                            "name": item.name,
                            "country": item.country.name if item.country else None
                        },
                        "similarity": name_similarity,
                        "match_field": "name"
                    })

        elif table_name == "products":
            existing_items = db.query(Product).all()
            for item in existing_items:
                name_similarity = calculate_similarity(new_item.get("product_name_en", ""), item.product_name_en)
                if name_similarity >= threshold:
                    similar_items.append({
                        "existing_item": {
                            "id": item.id,
                            "product_name_en": item.product_name_en,
                            "product_name_jp": item.product_name_jp,
                            "code": item.code,
                            "country": item.country.name if item.country else None
                        },
                        "similarity": name_similarity,
                        "match_field": "product_name_en"
                    })

        elif table_name == "ships":
            existing_items = db.query(Ship).all()
            for item in existing_items:
                name_similarity = calculate_similarity(new_item.get("name", ""), item.name)
                if name_similarity >= threshold:
                    similar_items.append({
                        "existing_item": {
                            "id": item.id,
                            "name": item.name,
                            "company": item.company.name if item.company else None
                        },
                        "similarity": name_similarity,
                        "match_field": "name"
                    })

    except Exception as e:
        logger.error(f"查找相似项目时出错: {str(e)}")

    # 按相似度降序排序
    similar_items.sort(key=lambda x: x["similarity"], reverse=True)
    return similar_items

def precheck_data(table_name: str, df: pd.DataFrame, db: Session) -> PreCheckResult:
    """简化版预检查 - 只做基本验证"""
    result = PreCheckResult()

    try:
        # 获取验证规则
        rules = get_table_validation_rules(table_name)
        if not rules:
            result.validation_errors.append(f"不支持的表类型: {table_name}")
            return result

        logger.info(f"开始简化预检查 {table_name} 数据，共 {len(df)} 行")

        # 🔥 简化逻辑：检查数据库中是否有现有数据
        existing_count = 0
        if table_name == "products":
            existing_count = db.query(Product).count()
        elif table_name == "countries":
            existing_count = db.query(Country).count()
        elif table_name == "categories":
            existing_count = db.query(Category).count()
        elif table_name == "suppliers":
            existing_count = db.query(Supplier).count()
        elif table_name == "ports":
            existing_count = db.query(Port).count()
        elif table_name == "companies":
            existing_count = db.query(Company).count()
        elif table_name == "ships":
            existing_count = db.query(Ship).count()

        logger.info(f"数据库中现有 {table_name} 数据: {existing_count} 条")

        # 🔥 简化逻辑：如果数据库为空，跳过复杂检查
        if existing_count == 0:
            logger.info(f"{table_name} 表为空，使用快速验证模式")
            return quick_precheck_for_empty_db(table_name, df, db, rules)

        # 如果数据库有数据，只做基本验证（不做相似性检查）
        logger.info(f"{table_name} 表有数据，使用基本验证模式")
        return basic_precheck_with_existing_data(table_name, df, db, rules)

    except Exception as e:
        logger.error(f"数据预检查失败: {str(e)}")
        result.validation_errors.append(f"预检查过程出错: {str(e)}")

    return result

def quick_precheck_for_empty_db(table_name: str, df: pd.DataFrame, db: Session, rules: Dict) -> PreCheckResult:
    """空数据库的快速预检查 - 只验证格式和外键"""
    result = PreCheckResult()

    # 预加载外键数据（只在需要时）
    foreign_key_cache = {}
    foreign_keys = rules.get("foreign_keys", {})

    if foreign_keys:
        if "countries.name" in foreign_keys.values():
            foreign_key_cache['countries'] = {c.name: c.id for c in db.query(Country).all()}
        if "categories.name" in foreign_keys.values():
            foreign_key_cache['categories'] = {c.name: c.id for c in db.query(Category).all()}
        if "suppliers.name" in foreign_keys.values():
            foreign_key_cache['suppliers'] = {s.name: s.id for s in db.query(Supplier).all()}
        if "ports.name" in foreign_keys.values():
            foreign_key_cache['ports'] = {p.name: p.id for p in db.query(Port).all()}
        if "companies.name" in foreign_keys.values():
            foreign_key_cache['companies'] = {c.name: c.id for c in db.query(Company).all()}

    # 快速验证每行
    for index, row in df.iterrows():
        row_number = index + 2
        row_dict = row.to_dict()

        # 只做基本验证
        row_errors = validate_basic_fields_only(table_name, row, row_number, foreign_key_cache, rules)

        if row_errors:
            result.validation_errors.append({
                "row": row_number,
                "data": row_dict,
                "errors": row_errors
            })
        else:
            # 数据库为空，所有有效数据都是新数据
            result.new_items.append({
                "row": row_number,
                "data": row_dict
            })

    return result

def basic_precheck_with_existing_data(table_name: str, df: pd.DataFrame, db: Session, rules: Dict) -> PreCheckResult:
    """有现有数据时的基本预检查 - 不做相似性检查"""
    result = PreCheckResult()

    # 预加载外键数据
    foreign_key_cache = {}
    foreign_keys = rules.get("foreign_keys", {})

    if foreign_keys:
        if "countries.name" in foreign_keys.values():
            foreign_key_cache['countries'] = {c.name: c.id for c in db.query(Country).all()}
        if "categories.name" in foreign_keys.values():
            foreign_key_cache['categories'] = {c.name: c.id for c in db.query(Category).all()}
        if "suppliers.name" in foreign_keys.values():
            foreign_key_cache['suppliers'] = {s.name: s.id for s in db.query(Supplier).all()}
        if "ports.name" in foreign_keys.values():
            foreign_key_cache['ports'] = {p.name: p.id for p in db.query(Port).all()}
        if "companies.name" in foreign_keys.values():
            foreign_key_cache['companies'] = {c.name: c.id for c in db.query(Company).all()}

    # 基本验证每行
    for index, row in df.iterrows():
        row_number = index + 2
        row_dict = row.to_dict()

        # 基本验证
        row_errors = validate_basic_fields_only(table_name, row, row_number, foreign_key_cache, rules)

        if row_errors:
            result.validation_errors.append({
                "row": row_number,
                "data": row_dict,
                "errors": row_errors
            })
        else:
            # 简单的重复检查（只检查主键字段）
            is_duplicate = check_simple_duplicate(table_name, row_dict, db)
            if is_duplicate:
                result.exact_duplicates.append({
                    "row": row_number,
                    "data": row_dict,
                    "existing_item": is_duplicate
                })
            else:
                # 标记为新数据（跳过相似性检查）
                result.new_items.append({
                    "row": row_number,
                    "data": row_dict
                })

    return result

def validate_basic_fields_only(table_name: str, row: pd.Series, row_number: int, foreign_key_cache: Dict, rules: Dict) -> List[str]:
    """只验证基本字段 - 简化版本"""
    errors = []

    try:
        # 验证必填字段
        required_columns = rules.get("required_columns", [])
        for col in required_columns:
            if pd.isna(row.get(col)) or str(row.get(col, "")).strip() == "":
                errors.append(f"第{row_number}行: {col} 不能为空")

        # 简化的外键验证
        foreign_keys = rules.get("foreign_keys", {})
        for fk_col, fk_ref in foreign_keys.items():
            if row.get(fk_col) and not pd.isna(row[fk_col]):
                value = str(row[fk_col]).strip()

                # 使用缓存快速验证
                if fk_ref == "countries.name" and value not in foreign_key_cache.get('countries', {}):
                    available = list(foreign_key_cache.get('countries', {}).keys())[:3]
                    errors.append(f"第{row_number}行: 国家 '{value}' 不存在。可用: {available}")
                elif fk_ref == "categories.name" and value not in foreign_key_cache.get('categories', {}):
                    available = list(foreign_key_cache.get('categories', {}).keys())[:3]
                    errors.append(f"第{row_number}行: 类别 '{value}' 不存在。可用: {available}")
                elif fk_ref == "suppliers.name" and value not in foreign_key_cache.get('suppliers', {}):
                    errors.append(f"第{row_number}行: 供应商 '{value}' 不存在")
                elif fk_ref == "ports.name" and value not in foreign_key_cache.get('ports', {}):
                    errors.append(f"第{row_number}行: 港口 '{value}' 不存在")
                elif fk_ref == "companies.name" and value not in foreign_key_cache.get('companies', {}):
                    errors.append(f"第{row_number}行: 公司 '{value}' 不存在")

        # 基本格式验证（只对产品）
        if table_name == "products":
            # 验证价格
            if row.get("price") and not pd.isna(row["price"]):
                try:
                    price = float(row["price"])
                    if price < 0:
                        errors.append(f"第{row_number}行: 价格不能为负数")
                except (ValueError, TypeError):
                    errors.append(f"第{row_number}行: 价格格式错误")

            # pack_size 允许字符串，不做格式验证

    except Exception as e:
        logger.error(f"验证第{row_number}行数据时出错: {str(e)}")
        errors.append(f"第{row_number}行: 验证过程中发生错误")

    return errors

def check_simple_duplicate(table_name: str, new_item: Dict[str, Any], db: Session) -> Optional[Dict[str, Any]]:
    """简单的重复检查 - 只检查主要字段"""
    try:
        if table_name == "countries":
            existing = db.query(Country).filter(
                (Country.name == new_item.get("name")) |
                (Country.code == new_item.get("code"))
            ).first()
            if existing:
                return {"id": existing.id, "name": existing.name, "code": existing.code}

        elif table_name == "categories":
            existing = db.query(Category).filter(Category.name == new_item.get("name")).first()
            if existing:
                return {"id": existing.id, "name": existing.name}

        elif table_name == "products":
            existing = db.query(Product).filter(
                Product.product_name_en == new_item.get("product_name_en")
            ).first()
            if existing:
                return {
                    "id": existing.id,
                    "product_name_en": existing.product_name_en,
                    "code": existing.code
                }

        elif table_name == "suppliers":
            existing = db.query(Supplier).filter(Supplier.name == new_item.get("name")).first()
            if existing:
                return {"id": existing.id, "name": existing.name}

        elif table_name == "ports":
            existing = db.query(Port).filter(Port.name == new_item.get("name")).first()
            if existing:
                return {"id": existing.id, "name": existing.name}

        elif table_name == "companies":
            existing = db.query(Company).filter(Company.name == new_item.get("name")).first()
            if existing:
                return {"id": existing.id, "name": existing.name}

        elif table_name == "ships":
            existing = db.query(Ship).filter(Ship.name == new_item.get("name")).first()
            if existing:
                return {"id": existing.id, "name": existing.name}

    except Exception as e:
        logger.error(f"检查重复数据时出错: {str(e)}")

    return None

def check_exact_duplicate(table_name: str, new_item: Dict[str, Any], db: Session) -> Optional[Dict[str, Any]]:
    """检查是否存在完全重复的数据"""
    try:
        if table_name == "countries":
            existing = db.query(Country).filter(
                (Country.name == new_item.get("name")) |
                (Country.code == new_item.get("code"))
            ).first()
            if existing:
                return {"id": existing.id, "name": existing.name, "code": existing.code}

        elif table_name == "categories":
            existing = db.query(Category).filter(Category.name == new_item.get("name")).first()
            if existing:
                return {"id": existing.id, "name": existing.name}

        elif table_name == "ports":
            existing = db.query(Port).filter(Port.name == new_item.get("name")).first()
            if existing:
                return {
                    "id": existing.id,
                    "name": existing.name,
                    "code": existing.code,
                    "country": existing.country.name if existing.country else None
                }

        elif table_name == "companies":
            existing = db.query(Company).filter(Company.name == new_item.get("name")).first()
            if existing:
                return {
                    "id": existing.id,
                    "name": existing.name,
                    "country": existing.country.name if existing.country else None
                }

        elif table_name == "suppliers":
            existing = db.query(Supplier).filter(Supplier.name == new_item.get("name")).first()
            if existing:
                return {
                    "id": existing.id,
                    "name": existing.name,
                    "country": existing.country.name if existing.country else None
                }

        elif table_name == "products":
            existing = db.query(Product).filter(Product.product_name_en == new_item.get("product_name_en")).first()
            if existing:
                return {
                    "id": existing.id,
                    "product_name_en": existing.product_name_en,
                    "product_name_jp": existing.product_name_jp,
                    "code": existing.code
                }

        elif table_name == "ships":
            existing = db.query(Ship).filter(Ship.name == new_item.get("name")).first()
            if existing:
                return {
                    "id": existing.id,
                    "name": existing.name,
                    "company": existing.company.name if existing.company else None
                }

    except Exception as e:
        logger.error(f"检查重复数据时出错: {str(e)}")

    return None

def check_exact_duplicate_cached(table_name: str, new_item: Dict[str, Any], existing_data_cache: List[Dict]) -> Optional[Dict[str, Any]]:
    """检查是否存在完全重复的数据 - 使用缓存优化版本"""
    try:
        if table_name == "countries":
            for existing in existing_data_cache:
                if (existing.get("name") == new_item.get("name") or
                    existing.get("code") == new_item.get("code")):
                    return {"id": existing["id"], "name": existing["name"], "code": existing["code"]}

        elif table_name == "categories":
            for existing in existing_data_cache:
                if existing.get("name") == new_item.get("name"):
                    return {"id": existing["id"], "name": existing["name"]}

        elif table_name == "ports":
            for existing in existing_data_cache:
                if existing.get("name") == new_item.get("name"):
                    return {
                        "id": existing["id"],
                        "name": existing["name"],
                        "code": existing.get("code"),
                        "country": existing.get("country")
                    }

        elif table_name == "companies":
            for existing in existing_data_cache:
                if existing.get("name") == new_item.get("name"):
                    return {
                        "id": existing["id"],
                        "name": existing["name"],
                        "country": existing.get("country")
                    }

        elif table_name == "suppliers":
            for existing in existing_data_cache:
                if existing.get("name") == new_item.get("name"):
                    return {
                        "id": existing["id"],
                        "name": existing["name"],
                        "country": existing.get("country")
                    }

        elif table_name == "products":
            for existing in existing_data_cache:
                if existing.get("product_name_en") == new_item.get("product_name_en"):
                    return {
                        "id": existing["id"],
                        "product_name_en": existing["product_name_en"],
                        "product_name_jp": existing.get("product_name_jp"),
                        "code": existing.get("code")
                    }

        elif table_name == "ships":
            for existing in existing_data_cache:
                if existing.get("name") == new_item.get("name"):
                    return {
                        "id": existing["id"],
                        "name": existing["name"],
                        "company": existing.get("company")
                    }

    except Exception as e:
        logger.error(f"检查重复数据时出错: {str(e)}")

    return None

def find_similar_items_cached(table_name: str, new_item: Dict[str, Any], existing_data_cache: List[Dict], threshold: float = 0.8) -> List[Dict[str, Any]]:
    """查找数据库中与新项目相似的项目 - 使用缓存优化版本"""
    similar_items = []

    try:
        if table_name == "countries":
            for existing in existing_data_cache:
                name_similarity = calculate_similarity(new_item.get("name", ""), existing.get("name", ""))
                if name_similarity >= threshold:
                    similar_items.append({
                        "existing_item": {
                            "id": existing["id"],
                            "name": existing["name"],
                            "code": existing.get("code")
                        },
                        "similarity": name_similarity,
                        "match_field": "name"
                    })

        elif table_name == "categories":
            for existing in existing_data_cache:
                name_similarity = calculate_similarity(new_item.get("name", ""), existing.get("name", ""))
                if name_similarity >= threshold:
                    similar_items.append({
                        "existing_item": {
                            "id": existing["id"],
                            "name": existing["name"]
                        },
                        "similarity": name_similarity,
                        "match_field": "name"
                    })

        elif table_name == "products":
            for existing in existing_data_cache:
                name_similarity = calculate_similarity(new_item.get("product_name_en", ""), existing.get("product_name_en", ""))
                if name_similarity >= threshold:
                    similar_items.append({
                        "existing_item": {
                            "id": existing["id"],
                            "product_name_en": existing["product_name_en"],
                            "product_name_jp": existing.get("product_name_jp"),
                            "code": existing.get("code")
                        },
                        "similarity": name_similarity,
                        "match_field": "product_name_en"
                    })

        elif table_name == "suppliers":
            for existing in existing_data_cache:
                name_similarity = calculate_similarity(new_item.get("name", ""), existing.get("name", ""))
                if name_similarity >= threshold:
                    similar_items.append({
                        "existing_item": {
                            "id": existing["id"],
                            "name": existing["name"],
                            "country": existing.get("country")
                        },
                        "similarity": name_similarity,
                        "match_field": "name"
                    })

        elif table_name == "ports":
            for existing in existing_data_cache:
                name_similarity = calculate_similarity(new_item.get("name", ""), existing.get("name", ""))
                if name_similarity >= threshold:
                    similar_items.append({
                        "existing_item": {
                            "id": existing["id"],
                            "name": existing["name"],
                            "code": existing.get("code"),
                            "country": existing.get("country")
                        },
                        "similarity": name_similarity,
                        "match_field": "name"
                    })

        elif table_name == "companies":
            for existing in existing_data_cache:
                name_similarity = calculate_similarity(new_item.get("name", ""), existing.get("name", ""))
                if name_similarity >= threshold:
                    similar_items.append({
                        "existing_item": {
                            "id": existing["id"],
                            "name": existing["name"],
                            "country": existing.get("country")
                        },
                        "similarity": name_similarity,
                        "match_field": "name"
                    })

        elif table_name == "ships":
            for existing in existing_data_cache:
                name_similarity = calculate_similarity(new_item.get("name", ""), existing.get("name", ""))
                if name_similarity >= threshold:
                    similar_items.append({
                        "existing_item": {
                            "id": existing["id"],
                            "name": existing["name"],
                            "company": existing.get("company")
                        },
                        "similarity": name_similarity,
                        "match_field": "name"
                    })

    except Exception as e:
        logger.error(f"查找相似项目时出错: {str(e)}")

    # 按相似度降序排序
    similar_items.sort(key=lambda x: x["similarity"], reverse=True)
    return similar_items

def validate_all_data_before_import(table_name: str, df: pd.DataFrame, db: Session) -> Tuple[bool, ImportResult]:
    """
    在导入前验证所有数据
    返回: (是否通过验证, 验证结果)
    """
    result = ImportResult()

    try:
        # 获取验证规则
        rules = get_table_validation_rules(table_name)
        if not rules:
            result.errors.append(f"不支持的表类型: {table_name}")
            return False, result

        # 验证必填列
        required_columns = rules.get("required_columns", [])
        for col in required_columns:
            if col not in df.columns:
                result.errors.append(f"缺少必填列: {col}")
                return False, result

        # 逐行验证数据
        for index, row in df.iterrows():
            row_errors = validate_single_row(table_name, row, index + 2, db, rules)
            result.errors.extend(row_errors)
            if row_errors:
                result.error_count += 1
            else:
                result.success_count += 1

        # 如果有错误，验证失败
        if result.errors:
            return False, result

        return True, result

    except Exception as e:
        logger.error(f"数据验证失败: {e}")
        result.errors.append(f"数据验证过程中发生错误: {str(e)}")
        return False, result

def validate_single_row_cached(table_name: str, row: pd.Series, row_number: int, foreign_key_cache: Dict, rules: Dict) -> List[str]:
    """验证单行数据 - 使用缓存优化版本"""
    errors = []

    try:
        # 验证必填字段
        required_columns = rules.get("required_columns", [])
        for col in required_columns:
            if pd.isna(row.get(col)) or str(row.get(col, "")).strip() == "":
                errors.append(f"第{row_number}行: {col} 不能为空")

        # 验证外键关系（使用缓存）
        foreign_keys = rules.get("foreign_keys", {})
        for fk_col, fk_ref in foreign_keys.items():
            if row.get(fk_col) and not pd.isna(row[fk_col]):
                value = str(row[fk_col]).strip()

                # 🔥 性能优化：使用缓存验证外键，避免数据库查询
                if not validate_foreign_key_cached(fk_col, value, fk_ref, foreign_key_cache):
                    # 生成友好的错误信息
                    debug_info = get_debug_info_from_cache(fk_ref, foreign_key_cache)
                    errors.append(f"第{row_number}行: {fk_col} '{value}' 不存在。{debug_info}")

        # 验证数据格式
        if table_name == "products":
            # 验证产品特有的字段
            errors.extend(validate_product_specific_fields(row, row_number))

    except Exception as e:
        logger.error(f"验证第{row_number}行数据时出错: {str(e)}")
        errors.append(f"第{row_number}行: 数据验证过程中发生错误")

    return errors

def validate_foreign_key_cached(column: str, value: str, reference: str, cache: Dict) -> bool:
    """使用缓存验证外键关系"""
    try:
        if reference == "countries.name":
            return value in cache.get('countries', {})
        elif reference == "categories.name":
            return value in cache.get('categories', {})
        elif reference == "companies.name":
            return value in cache.get('companies', {})
        elif reference == "suppliers.name":
            return value in cache.get('suppliers', {})
        elif reference == "ports.name":
            return value in cache.get('ports', {})

        return False
    except Exception:
        return False

def get_debug_info_from_cache(reference: str, cache: Dict) -> str:
    """从缓存获取调试信息"""
    try:
        if reference == "countries.name":
            available = list(cache.get('countries', {}).keys())[:5]  # 只显示前5个
            return f"可用国家: {available}" + ("..." if len(cache.get('countries', {})) > 5 else "")
        elif reference == "categories.name":
            available = list(cache.get('categories', {}).keys())[:5]
            return f"可用类别: {available}" + ("..." if len(cache.get('categories', {})) > 5 else "")
        elif reference == "companies.name":
            available = list(cache.get('companies', {}).keys())[:5]
            return f"可用公司: {available}" + ("..." if len(cache.get('companies', {})) > 5 else "")
        elif reference == "suppliers.name":
            available = list(cache.get('suppliers', {}).keys())[:5]
            return f"可用供应商: {available}" + ("..." if len(cache.get('suppliers', {})) > 5 else "")
        elif reference == "ports.name":
            available = list(cache.get('ports', {}).keys())[:5]
            return f"可用港口: {available}" + ("..." if len(cache.get('ports', {})) > 5 else "")
        return ""
    except Exception as e:
        return f"获取调试信息失败: {str(e)}"

def validate_single_row(table_name: str, row: pd.Series, row_number: int, db: Session, rules: Dict) -> List[str]:
    """验证单行数据"""
    errors = []

    try:
        # 验证必填字段
        required_columns = rules.get("required_columns", [])
        for col in required_columns:
            if pd.isna(row.get(col)) or str(row.get(col, "")).strip() == "":
                errors.append(f"第{row_number}行: {col} 不能为空")

        # 验证外键关系
        foreign_keys = rules.get("foreign_keys", {})
        for fk_col, fk_ref in foreign_keys.items():
            if row.get(fk_col) and not pd.isna(row[fk_col]):
                # 去除空格并获取调试信息
                value = str(row[fk_col]).strip()
                if not validate_foreign_key(fk_col, value, fk_ref, db):
                    # 获取调试信息
                    debug_info = get_debug_info_for_foreign_key_error(fk_ref, db)
                    errors.append(f"第{row_number}行: {fk_col} '{value}' 不存在。{debug_info}")

        # 验证数据格式
        if table_name == "products":
            # 验证产品特有的字段
            errors.extend(validate_product_specific_fields(row, row_number))

    except Exception as e:
        errors.append(f"第{row_number}行: 验证过程中发生错误 - {str(e)}")

    return errors

def format_user_friendly_error(error: str, row_number: int = None) -> dict:
    """将技术错误转换为用户友好的错误信息"""

    # 解析行号
    if row_number is None and "第" in error and "行:" in error:
        try:
            row_part = error.split(":")[0]
            row_number = int(row_part.replace("第", "").replace("行", ""))
        except:
            row_number = 0

    # 错误模式匹配
    if "不存在" in error:
        if "country_name" in error or "国家" in error:
            return {
                "message": f"第{row_number}行：国家名称在系统中不存在",
                "suggestion": "请检查国家名称拼写，或先导入国家数据",
                "severity": "error",
                "type": "foreign_key_missing",
                "field": "country_name"
            }
        elif "category_name" in error or "类别" in error:
            return {
                "message": f"第{row_number}行：产品类别在系统中不存在",
                "suggestion": "请检查类别名称拼写，或先导入产品类别数据",
                "severity": "error",
                "type": "foreign_key_missing",
                "field": "category_name"
            }
        elif "supplier_name" in error or "供应商" in error:
            return {
                "message": f"第{row_number}行：供应商在系统中不存在",
                "suggestion": "请检查供应商名称拼写，或先导入供应商数据",
                "severity": "error",
                "type": "foreign_key_missing",
                "field": "supplier_name"
            }
        elif "company_name" in error or "公司" in error:
            return {
                "message": f"第{row_number}行：公司名称在系统中不存在",
                "suggestion": "请检查公司名称拼写，或先导入公司数据",
                "severity": "error",
                "type": "foreign_key_missing",
                "field": "company_name"
            }
        elif "port_name" in error or "港口" in error:
            return {
                "message": f"第{row_number}行：港口名称在系统中不存在",
                "suggestion": "请检查港口名称拼写，或先导入港口数据",
                "severity": "error",
                "type": "foreign_key_missing",
                "field": "port_name"
            }
        else:
            return {
                "message": f"第{row_number}行：引用的数据在系统中不存在",
                "suggestion": "请检查数据拼写或先导入相关的基础数据",
                "severity": "error",
                "type": "foreign_key_missing"
            }

    elif "不能为空" in error:
        field_name = ""
        if "name" in error:
            field_name = "名称"
        elif "code" in error:
            field_name = "代码"
        elif "effective_from" in error:
            field_name = "起始日期"

        return {
            "message": f"第{row_number}行：{field_name}是必填项，不能为空",
            "suggestion": "请在Excel文件中填写此字段后重新上传",
            "severity": "error",
            "type": "required_field_missing",
            "field": field_name
        }

    elif "格式错误" in error or "格式不正确" in error:
        return {
            "message": f"第{row_number}行：数据格式不正确",
            "suggestion": "请参考下载的模板文件中的格式示例",
            "severity": "warning",
            "type": "format_error"
        }

    elif "不能为负数" in error:
        return {
            "message": f"第{row_number}行：数值不能为负数",
            "suggestion": "请输入大于等于0的数值",
            "severity": "error",
            "type": "invalid_value"
        }

    # 默认情况：保持原始错误信息但添加建议
    return {
        "message": error,
        "suggestion": "请检查数据格式和内容，或参考模板文件",
        "severity": "error",
        "type": "general_error"
    }

def get_debug_info_for_foreign_key_error(reference: str, db: Session) -> str:
    """获取外键错误的调试信息"""
    try:
        if reference == "countries.name":
            all_items = db.query(Country.name).all()
            available = [item[0] for item in all_items]
            return f"可用国家: {available}"
        elif reference == "categories.name":
            all_items = db.query(Category.name).all()
            available = [item[0] for item in all_items]
            return f"可用类别: {available}"
        elif reference == "companies.name":
            all_items = db.query(Company.name).all()
            available = [item[0] for item in all_items]
            return f"可用公司: {available}"
        elif reference == "suppliers.name":
            all_items = db.query(Supplier.name).all()
            available = [item[0] for item in all_items]
            return f"可用供应商: {available}"
        elif reference == "ports.name":
            all_items = db.query(Port.name).all()
            available = [item[0] for item in all_items]
            return f"可用港口: {available}"
        return ""
    except Exception as e:
        return f"获取调试信息失败: {str(e)}"

def validate_foreign_key(column: str, value: str, reference: str, db: Session) -> bool:
    """验证外键关系"""
    try:
        table_name, field_name = reference.split(".")

        if reference == "countries.name":
            return db.query(Country).filter(Country.name == value).first() is not None
        elif reference == "categories.name":
            return db.query(Category).filter(Category.name == value).first() is not None
        elif reference == "companies.name":
            return db.query(Company).filter(Company.name == value).first() is not None
        elif reference == "suppliers.name":
            return db.query(Supplier).filter(Supplier.name == value).first() is not None
        elif reference == "ports.name":
            return db.query(Port).filter(Port.name == value).first() is not None

        return False
    except Exception:
        return False

def validate_product_specific_fields(row: pd.Series, row_number: int) -> List[str]:
    """验证产品特有字段"""
    errors = []

    # 验证价格字段
    if row.get("price") and not pd.isna(row["price"]):
        try:
            price = float(row["price"])
            if price < 0:
                errors.append(f"第{row_number}行: price (价格) 不能为负数")
        except (ValueError, TypeError):
            errors.append(f"第{row_number}行: price (价格) 格式错误，必须为数字")

    # pack_size 允许字符串格式，不做数字验证
    # 例如: "30个", "1箱", "500g装" 等都是有效的

    return errors

def format_validation_errors(errors: List[str]) -> List[dict]:
    """格式化验证错误为用户友好的信息"""
    formatted_errors = []
    for error in errors:
        formatted_error = format_user_friendly_error(error)
        formatted_errors.append(formatted_error)

    return formatted_errors

def read_excel_file(file_content: bytes, filename: str) -> pd.DataFrame:
    """读取Excel文件"""
    try:
        if filename.lower().endswith('.csv'):
            # 尝试不同的编码
            for encoding in ['utf-8', 'gbk', 'gb2312']:
                try:
                    df = pd.read_csv(io.BytesIO(file_content), encoding=encoding)
                    return df
                except UnicodeDecodeError:
                    continue
            raise ValueError("无法解析CSV文件编码")
        else:
            df = pd.read_excel(io.BytesIO(file_content))
            return df
    except Exception as e:
        raise ValueError(f"文件读取失败: {str(e)}")

def validate_table_data(table_name: str, df: pd.DataFrame, db: Session) -> Dict[str, Any]:
    """验证表数据"""
    validation_result = {
        "total_rows": len(df),
        "valid_rows": 0,
        "invalid_rows": 0,
        "errors": [],
        "warnings": [],
        "data_preview": []
    }
    
    # 获取表的验证规则
    validation_rules = get_table_validation_rules(table_name)
    
    if not validation_rules:
        raise ValueError(f"不支持的表类型: {table_name}")
    
    # 检查必填列
    required_columns = validation_rules.get("required_columns", [])
    missing_columns = [col for col in required_columns if col not in df.columns]
    
    if missing_columns:
        validation_result["errors"].append(f"缺少必填列: {', '.join(missing_columns)}")
        return validation_result
    
    # 逐行验证数据
    for index, row in df.iterrows():
        row_errors = []
        
        # 验证必填字段
        for col in required_columns:
            if pd.isna(row[col]) or str(row[col]).strip() == '':
                row_errors.append(f"第{index+2}行: {col} 不能为空")
        
        # 验证外键关系
        if table_name == "ports" and "country_name" in row:
            if not pd.isna(row["country_name"]):
                country_name = str(row["country_name"]).strip()  # 去除空格
                country = db.query(Country).filter(Country.name == country_name).first()
                if not country:
                    # 获取所有可用的国家名称用于调试
                    available_countries = [c.name for c in db.query(Country).all()]
                    logger.warning(f"港口验证失败 - 第{index+2}行: 国家名称 '{country_name}' 不存在")
                    logger.warning(f"可用的国家: {available_countries}")
                    row_errors.append(f"第{index+2}行: 国家名称在系统中不存在")
                    row_errors.append(f"💡 建议：请检查国家名称拼写，或先导入国家数据")
        
        elif table_name == "companies" and "country_name" in row:
            if not pd.isna(row["country_name"]):
                country_name = str(row["country_name"]).strip()  # 去除空格
                country = db.query(Country).filter(Country.name == country_name).first()
                if not country:
                    row_errors.append(f"第{index+2}行: 国家名称在系统中不存在")
                    row_errors.append(f"💡 建议：请检查国家名称拼写，或先导入国家数据")
        
        elif table_name == "suppliers" and "country_name" in row:
            if not pd.isna(row["country_name"]):
                country_name = str(row["country_name"]).strip()  # 去除空格
                country = db.query(Country).filter(Country.name == country_name).first()
                if not country:
                    # 调试信息：显示所有可用的国家
                    all_countries = db.query(Country.name).all()
                    available_countries = [c[0] for c in all_countries]
                    row_errors.append(f"第{index+2}行: country_name '{country_name}' 不存在。可用国家: {available_countries}")
        
        elif table_name == "ships" and "company_name" in row:
            if not pd.isna(row["company_name"]):
                company = db.query(Company).filter(Company.name == row["company_name"]).first()
                if not company:
                    row_errors.append(f"第{index+2}行: 公司 '{row['company_name']}' 不存在")
        
        elif table_name == "products":
            # 验证产品的多个外键关系
            if "country_name" in row and not pd.isna(row["country_name"]):
                country = db.query(Country).filter(Country.name == row["country_name"]).first()
                if not country:
                    row_errors.append(f"第{index+2}行: 国家 '{row['country_name']}' 不存在")
            
            if "category_name" in row and not pd.isna(row["category_name"]):
                category = db.query(Category).filter(Category.name == row["category_name"]).first()
                if not category:
                    row_errors.append(f"第{index+2}行: 类别 '{row['category_name']}' 不存在")
            
            if "supplier_name" in row and not pd.isna(row["supplier_name"]):
                supplier = db.query(Supplier).filter(Supplier.name == row["supplier_name"]).first()
                if not supplier:
                    row_errors.append(f"第{index+2}行: 供应商 '{row['supplier_name']}' 不存在")
            
            if "port_name" in row and not pd.isna(row["port_name"]):
                port = db.query(Port).filter(Port.name == row["port_name"]).first()
                if not port:
                    row_errors.append(f"第{index+2}行: 港口 '{row['port_name']}' 不存在")
        
        if row_errors:
            validation_result["invalid_rows"] += 1
            validation_result["errors"].extend(row_errors)
        else:
            validation_result["valid_rows"] += 1
        
        # 添加数据预览（前5行）
        if index < 5:
            # 处理NaN值，转换为None以便JSON序列化
            row_dict = row.to_dict()
            for key, value in row_dict.items():
                if pd.isna(value):
                    row_dict[key] = None
            validation_result["data_preview"].append(row_dict)
    
    return validation_result

def get_table_validation_rules(table_name: str) -> Dict[str, Any]:
    """获取表的验证规则"""
    rules = {
        "countries": {
            "required_columns": ["name", "code"],
            "unique_columns": ["name", "code"]
        },
        "categories": {
            "required_columns": ["name"],
            "unique_columns": ["name"]
        },
        "ports": {
            "required_columns": ["name", "country_name"],
            "foreign_keys": {"country_name": "countries.name"}
        },
        "companies": {
            "required_columns": ["name", "country_name"],
            "foreign_keys": {"country_name": "countries.name"}
        },
        "suppliers": {
            "required_columns": ["name", "country_name"],
            "foreign_keys": {"country_name": "countries.name"}
        },
        "ships": {
            "required_columns": ["name", "company_name", "capacity"],
            "foreign_keys": {"company_name": "companies.name"}
        },
        "products": {
            "required_columns": ["product_name_en", "country_name", "category_name", "effective_from"],
            "foreign_keys": {
                "country_name": "countries.name",
                "category_name": "categories.name",
                "supplier_name": "suppliers.name",
                "port_name": "ports.name"
            }
        }
    }
    
    return rules.get(table_name)

@router.post("/precheck-data")
async def precheck_file_data(
    file: UploadFile = File(...),
    table_name: str = Form(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """预检查上传的文件数据，识别新数据、相似数据和重复数据"""

    # 验证文件
    if not file.filename:
        raise HTTPException(status_code=400, detail="未选择文件")

    if not validate_file_type(file.filename):
        raise HTTPException(status_code=400, detail="不支持的文件类型")

    if file.size and file.size > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="文件大小超过限制")

    try:
        # 读取文件内容
        content = await file.read()

        # 解析Excel/CSV文件
        if file.filename.lower().endswith('.csv'):
            df = pd.read_csv(io.StringIO(content.decode('utf-8')))
        else:
            df = pd.read_excel(io.BytesIO(content))

        if df.empty:
            raise HTTPException(status_code=400, detail="文件为空或无法读取数据")

        logger.info(f"开始预检查 {table_name} 数据，共 {len(df)} 行")

        # 执行数据预检查
        precheck_result = precheck_data(table_name, df, db)

        logger.info(f"预检查完成: 新数据 {len(precheck_result.new_items)} 条，"
                   f"相似数据 {len(precheck_result.similar_items)} 条，"
                   f"重复数据 {len(precheck_result.exact_duplicates)} 条，"
                   f"错误 {len(precheck_result.validation_errors)} 条")

        return {
            "status": "success",
            "message": "数据预检查完成",
            "precheck_result": precheck_result.to_dict(),
            "total_rows": len(df)
        }

    except Exception as e:
        logger.error(f"数据预检查失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"数据预检查失败: {str(e)}")

@router.post("/validate-file")
async def validate_file(
    file: UploadFile = File(...),
    table_name: str = Form(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """验证上传的文件"""
    
    # 验证文件大小
    if file.size > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="文件大小超过限制（10MB）")
    
    # 验证文件类型
    if not validate_file_type(file.filename):
        raise HTTPException(status_code=400, detail="不支持的文件类型，请上传 .xlsx, .xls 或 .csv 文件")
    
    try:
        # 读取文件内容
        file_content = await file.read()
        
        # 解析文件
        df = read_excel_file(file_content, file.filename)
        
        if df.empty:
            raise HTTPException(status_code=400, detail="文件为空或无法读取数据")
        
        # 验证数据
        validation_result = validate_table_data(table_name, df, db)
        
        return {
            "status": "success",
            "message": "文件验证完成",
            "validation_result": validation_result
        }
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"文件验证失败: {e}")
        raise HTTPException(status_code=500, detail="文件验证过程中发生错误")

@router.post("/upload-products-with-progress")
async def upload_products_with_progress(
    file: UploadFile = File(...),
    table_name: str = Form(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    专门的产品上传端点，支持进度显示
    """
    if table_name != 'products':
        raise HTTPException(status_code=400, detail="此端点仅支持产品上传")

    # 调用通用上传逻辑
    return await upload_data_internal(file, table_name, db, current_user)

@router.post("/upload-data")
async def upload_data(
    file: UploadFile = File(...),
    table_name: str = Form(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    通用数据上传端点
    """
    return await upload_data_internal(file, table_name, db, current_user)

async def upload_data_internal(
    file: UploadFile,
    table_name: str,
    db: Session,
    current_user: User
):
    """上传并导入数据到数据库 - 原子性事务版本"""

    try:
        # 读取文件
        file_content = await file.read()
        df = read_excel_file(file_content, file.filename)

        if df.empty:
            raise HTTPException(status_code=400, detail="文件为空或无法读取数据")

        logger.info(f"开始原子性导入 {table_name} 数据，共 {len(df)} 行")

        # 阶段1: 数据预验证
        is_valid, validation_result = validate_all_data_before_import(table_name, df, db)

        if not is_valid:
            logger.warning(f"数据验证失败: {len(validation_result.errors)} 个错误")
            return {
                "status": "validation_failed",
                "message": "数据验证失败，请修复错误后重新上传",
                "validation_result": validation_result.to_dict()
            }

        # 阶段2: 原子性批量导入
        import_result = import_table_data_atomic(table_name, df, db)

        logger.info(f"导入完成: 成功 {import_result.success_count} 行，跳过 {import_result.skipped_count} 行")

        return {
            "status": "success",
            "message": "数据导入成功",
            "import_result": import_result.to_dict()
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"数据导入失败: {e}")
        # 不需要在这里回滚，import_table_data_atomic已经处理了
        raise HTTPException(status_code=500, detail=f"数据导入失败: {str(e)}")

def import_table_data_atomic(table_name: str, df: pd.DataFrame, db: Session, progress_callback=None) -> ImportResult:
    """
    原子性数据导入 - 逐行提交模式，避免批量INSERT问题
    """
    result = ImportResult()

    try:
        # 获取重复数据处理策略
        strategy = DUPLICATE_STRATEGIES.get(table_name, DuplicateHandlingStrategy.ERROR)

        logger.info(f"开始数据导入 {table_name}，策略: {strategy.value}，使用逐行提交模式")

        # 🔥 性能优化：预加载所有外键数据
        foreign_key_maps = preload_foreign_key_data(table_name, db)
        logger.info(f"外键数据预加载完成，包含 {sum(len(v) for v in foreign_key_maps.values())} 条记录")

        # 逐行处理数据并立即提交
        for index, row in df.iterrows():
            try:
                row_result = process_single_row_atomic_optimized(table_name, row, index + 2, db, strategy, foreign_key_maps)

                if row_result["status"] == "success":
                    # 立即提交这一行的更改
                    db.commit()
                    result.success_count += 1
                    logger.debug(f"第{index+2}行数据提交成功")
                elif row_result["status"] == "skipped":
                    result.skipped_count += 1
                    result.skipped_items.append(row_result["message"])
                elif row_result["status"] == "error":
                    result.error_count += 1
                    result.errors.append(row_result["message"])

                    # 如果策略是ERROR，立即抛出异常
                    if strategy == DuplicateHandlingStrategy.ERROR:
                        raise Exception(f"数据导入失败: {row_result['message']}")

            except Exception as e:
                # 回滚当前行的更改
                db.rollback()
                logger.error(f"处理第{index+2}行时发生错误: {e}")

                # 如果是ERROR策略，停止处理并抛出异常
                if strategy == DuplicateHandlingStrategy.ERROR:
                    result.errors.append(f"第{index+2}行导入失败，所有更改已回滚: {str(e)}")
                    result.error_count = len(df)
                    result.success_count = 0
                    result.skipped_count = 0
                    raise e
                else:
                    # 如果是其他策略，记录错误但继续处理
                    result.error_count += 1
                    result.errors.append(f"第{index+2}行: {str(e)}")

        logger.info(f"数据导入完成: 成功 {result.success_count} 行，跳过 {result.skipped_count} 行，错误 {result.error_count} 行")

    except Exception as e:
        logger.error(f"数据导入失败: {e}")
        # 错误信息已在上面处理
        if not result.errors:
            result.errors.append(f"导入失败: {str(e)}")
            result.error_count = len(df)
            result.success_count = 0
            result.skipped_count = 0
        raise e

    return result


def import_table_data_batch(table_name: str, df: pd.DataFrame, db: Session, batch_size: int = 10) -> ImportResult:
    """
    批量数据导入 - 分批提交模式，避免大批量INSERT问题
    """
    result = ImportResult()

    try:
        # 获取重复数据处理策略
        strategy = DUPLICATE_STRATEGIES.get(table_name, DuplicateHandlingStrategy.ERROR)

        logger.info(f"开始数据导入 {table_name}，策略: {strategy.value}，批量大小: {batch_size}")

        # 🔥 性能优化：预加载所有外键数据
        foreign_key_maps = preload_foreign_key_data(table_name, db)
        logger.info(f"外键数据预加载完成，包含 {sum(len(v) for v in foreign_key_maps.values())} 条记录")

        # 分批处理数据
        total_rows = len(df)
        for batch_start in range(0, total_rows, batch_size):
            batch_end = min(batch_start + batch_size, total_rows)
            batch_df = df.iloc[batch_start:batch_end]

            logger.info(f"处理批次 {batch_start//batch_size + 1}: 第{batch_start+1}-{batch_end}行")

            try:
                # 处理当前批次的所有行
                batch_success = 0
                for index, row in batch_df.iterrows():
                    row_result = process_single_row_atomic_optimized(table_name, row, index + 2, db, strategy, foreign_key_maps)

                    if row_result["status"] == "success":
                        batch_success += 1
                    elif row_result["status"] == "skipped":
                        result.skipped_count += 1
                        result.skipped_items.append(row_result["message"])
                    elif row_result["status"] == "error":
                        result.error_count += 1
                        result.errors.append(row_result["message"])

                        # 如果策略是ERROR，立即抛出异常回滚整个批次
                        if strategy == DuplicateHandlingStrategy.ERROR:
                            raise Exception(f"数据导入失败: {row_result['message']}")

                # 提交当前批次
                db.commit()
                result.success_count += batch_success
                logger.info(f"批次 {batch_start//batch_size + 1} 提交成功，处理 {batch_success} 行")

            except Exception as e:
                # 回滚当前批次
                db.rollback()
                logger.error(f"批次 {batch_start//batch_size + 1} 处理失败: {e}")

                # 如果是ERROR策略，停止处理
                if strategy == DuplicateHandlingStrategy.ERROR:
                    result.errors.append(f"批次导入失败，所有更改已回滚: {str(e)}")
                    result.error_count = len(df)
                    result.success_count = 0
                    result.skipped_count = 0
                    raise e

        logger.info(f"数据导入完成: 成功 {result.success_count} 行，跳过 {result.skipped_count} 行，错误 {result.error_count} 行")

    except Exception as e:
        logger.error(f"数据导入失败: {e}")
        if not result.errors:
            result.errors.append(f"导入失败: {str(e)}")

    return result




def preload_foreign_key_data(table_name: str, db: Session) -> Dict[str, Dict[str, int]]:
    """
    预加载外键数据到内存映射表
    🚀 性能优化：避免在循环中重复查询数据库
    """
    foreign_key_maps = {}

    try:
        if table_name == "products":
            # 预加载产品表需要的所有外键数据
            logger.info("正在预加载产品外键数据...")

            # 加载国家数据
            countries_map = {}
            for country in db.query(Country).all():
                countries_map[country.name] = country.id
            foreign_key_maps["countries"] = countries_map
            logger.info(f"预加载国家数据: {len(countries_map)} 条")

            # 加载类别数据
            categories_map = {}
            for category in db.query(Category).all():
                categories_map[category.name] = category.id
            foreign_key_maps["categories"] = categories_map
            logger.info(f"预加载类别数据: {len(categories_map)} 条")

            # 加载供应商数据
            suppliers_map = {}
            for supplier in db.query(Supplier).all():
                suppliers_map[supplier.name] = supplier.id
            foreign_key_maps["suppliers"] = suppliers_map
            logger.info(f"预加载供应商数据: {len(suppliers_map)} 条")

            # 加载港口数据
            ports_map = {}
            for port in db.query(Port).all():
                ports_map[port.name] = port.id
            foreign_key_maps["ports"] = ports_map
            logger.info(f"预加载港口数据: {len(ports_map)} 条")

        elif table_name == "suppliers":
            # 供应商表只需要国家数据
            countries_map = {}
            for country in db.query(Country).all():
                countries_map[country.name] = country.id
            foreign_key_maps["countries"] = countries_map

        elif table_name == "ports":
            # 港口表只需要国家数据
            countries_map = {}
            for country in db.query(Country).all():
                countries_map[country.name] = country.id
            foreign_key_maps["countries"] = countries_map

        elif table_name == "companies":
            # 公司表只需要国家数据
            countries_map = {}
            for country in db.query(Country).all():
                countries_map[country.name] = country.id
            foreign_key_maps["countries"] = countries_map

        elif table_name == "ships":
            # 船舶表只需要公司数据
            companies_map = {}
            for company in db.query(Company).all():
                companies_map[company.name] = company.id
            foreign_key_maps["companies"] = companies_map

        logger.info(f"外键数据预加载完成: {table_name}")

    except Exception as e:
        logger.error(f"预加载外键数据失败: {str(e)}")
        # 如果预加载失败，返回空映射，回退到原有查询方式
        foreign_key_maps = {}

    return foreign_key_maps

def process_single_row_atomic_optimized(table_name: str, row: pd.Series, row_number: int, db: Session, strategy: DuplicateHandlingStrategy, foreign_key_maps: Dict[str, Dict[str, int]]) -> Dict[str, str]:
    """处理单行数据的原子性操作 - 优化版本，使用预加载的外键数据"""

    try:
        if table_name == "countries":
            return process_country_row(row, row_number, db, strategy)
        elif table_name == "categories":
            return process_category_row(row, row_number, db, strategy)
        elif table_name == "ports":
            return process_port_row_optimized(row, row_number, db, strategy, foreign_key_maps)
        elif table_name == "companies":
            return process_company_row_optimized(row, row_number, db, strategy, foreign_key_maps)
        elif table_name == "suppliers":
            return process_supplier_row_optimized(row, row_number, db, strategy, foreign_key_maps)
        elif table_name == "ships":
            return process_ship_row_optimized(row, row_number, db, strategy, foreign_key_maps)
        elif table_name == "products":
            return process_product_row_optimized(row, row_number, db, strategy, foreign_key_maps)
        else:
            return {"status": "error", "message": f"不支持的表类型: {table_name}"}

    except Exception as e:
        return {"status": "error", "message": f"第{row_number}行: 处理失败 - {str(e)}"}

def process_single_row_atomic(table_name: str, row: pd.Series, row_number: int, db: Session, strategy: DuplicateHandlingStrategy) -> Dict[str, str]:
    """处理单行数据的原子性操作"""

    try:
        if table_name == "countries":
            return process_country_row(row, row_number, db, strategy)
        elif table_name == "categories":
            return process_category_row(row, row_number, db, strategy)
        elif table_name == "ports":
            return process_port_row(row, row_number, db, strategy)
        elif table_name == "companies":
            return process_company_row(row, row_number, db, strategy)
        elif table_name == "suppliers":
            return process_supplier_row(row, row_number, db, strategy)
        elif table_name == "ships":
            return process_ship_row(row, row_number, db, strategy)
        elif table_name == "products":
            return process_product_row(row, row_number, db, strategy)
        else:
            return {"status": "error", "message": f"不支持的表类型: {table_name}"}

    except Exception as e:
        return {"status": "error", "message": f"第{row_number}行处理失败: {str(e)}"}

def process_country_row(row: pd.Series, row_number: int, db: Session, strategy: DuplicateHandlingStrategy) -> Dict[str, str]:
    """处理国家数据行"""
    # 检查是否已存在
    existing = db.query(Country).filter(
        (Country.name == row["name"]) | (Country.code == row["code"])
    ).first()

    if existing:
        if strategy == DuplicateHandlingStrategy.SKIP:
            return {"status": "skipped", "message": f"第{row_number}行: 国家 '{row['name']}' 或代码 '{row['code']}' 已存在，已跳过"}
        else:
            return {"status": "error", "message": f"第{row_number}行: 国家 '{row['name']}' 或代码 '{row['code']}' 已存在"}

    # 创建新记录
    country = Country(
        name=row["name"],
        code=row["code"],
        status=str(row.get("status", "true")).lower() == "true"
    )
    db.add(country)
    return {"status": "success", "message": f"第{row_number}行: 国家 '{row['name']}' 创建成功"}

def process_category_row(row: pd.Series, row_number: int, db: Session, strategy: DuplicateHandlingStrategy) -> Dict[str, str]:
    """处理类别数据行"""
    existing = db.query(Category).filter(Category.name == row["name"]).first()

    if existing:
        if strategy == DuplicateHandlingStrategy.SKIP:
            return {"status": "skipped", "message": f"第{row_number}行: 类别 '{row['name']}' 已存在，已跳过"}
        else:
            return {"status": "error", "message": f"第{row_number}行: 类别 '{row['name']}' 已存在"}

    category = Category(
        name=row["name"],
        code=row.get("code") if not pd.isna(row.get("code")) else None,
        description=row.get("description") if not pd.isna(row.get("description")) else None,
        status=str(row.get("status", "true")).lower() == "true"
    )
    db.add(category)
    return {"status": "success", "message": f"第{row_number}行: 类别 '{row['name']}' 创建成功"}

def process_port_row(row: pd.Series, row_number: int, db: Session, strategy: DuplicateHandlingStrategy) -> Dict[str, str]:
    """处理港口数据行"""
    # 查找国家
    country_name = str(row["country_name"]).strip()
    country = db.query(Country).filter(Country.name == country_name).first()
    if not country:
        # 获取调试信息
        all_countries = db.query(Country.name).all()
        available_countries = [c[0] for c in all_countries]
        return {"status": "error", "message": f"第{row_number}行: 国家 '{country_name}' 不存在。可用国家: {available_countries}"}

    # 检查港口名称是否已存在
    existing = db.query(Port).filter(Port.name == row["name"]).first()
    if existing:
        if strategy == DuplicateHandlingStrategy.SKIP:
            return {"status": "skipped", "message": f"第{row_number}行: 港口 '{row['name']}' 已存在，已跳过"}
        else:
            return {"status": "error", "message": f"第{row_number}行: 港口 '{row['name']}' 已存在"}

    # 处理code字段 - 检查唯一性
    port_code = row.get("code")
    if port_code and str(port_code).strip():
        port_code = str(port_code).strip()
        # 检查code是否已存在
        existing_code = db.query(Port).filter(Port.code == port_code).first()
        if existing_code:
            if strategy == DuplicateHandlingStrategy.SKIP:
                return {"status": "skipped", "message": f"第{row_number}行: 港口代码 '{port_code}' 已存在，已跳过"}
            else:
                return {"status": "error", "message": f"第{row_number}行: 港口代码 '{port_code}' 已存在"}
    else:
        port_code = None  # 确保空值为None

    port = Port(
        name=row["name"],
        code=port_code,
        country_id=country.id,
        location=row.get("location"),
        status=str(row.get("status", "true")).lower() == "true"
    )
    db.add(port)
    return {"status": "success", "message": f"第{row_number}行: 港口 '{row['name']}' 创建成功"}

def process_company_row(row: pd.Series, row_number: int, db: Session, strategy: DuplicateHandlingStrategy) -> Dict[str, str]:
    """处理公司数据行"""
    # 查找国家
    country_name = str(row["country_name"]).strip()
    country = db.query(Country).filter(Country.name == country_name).first()
    if not country:
        # 获取调试信息
        all_countries = db.query(Country.name).all()
        available_countries = [c[0] for c in all_countries]
        return {"status": "error", "message": f"第{row_number}行: 国家 '{country_name}' 不存在。可用国家: {available_countries}"}

    existing = db.query(Company).filter(Company.name == row["name"]).first()
    if existing:
        if strategy == DuplicateHandlingStrategy.SKIP:
            return {"status": "skipped", "message": f"第{row_number}行: 公司 '{row['name']}' 已存在，已跳过"}
        else:
            return {"status": "error", "message": f"第{row_number}行: 公司 '{row['name']}' 已存在"}

    # 安全处理所有字符串字段
    def safe_string_field(value):
        if value is None or pd.isna(value):
            return None
        return str(value).strip() if str(value).strip() else None

    contact_value = safe_string_field(row.get("contact"))
    email_value = safe_string_field(row.get("email"))
    phone_value = safe_string_field(row.get("phone"))

    company = Company(
        name=row["name"],
        country_id=country.id,
        contact=contact_value,
        email=email_value,
        phone=phone_value,
        status=str(row.get("status", "true")).lower() == "true"
    )
    db.add(company)
    return {"status": "success", "message": f"第{row_number}行: 公司 '{row['name']}' 创建成功"}

def process_supplier_row(row: pd.Series, row_number: int, db: Session, strategy: DuplicateHandlingStrategy) -> Dict[str, str]:
    """处理供应商数据行"""
    # 查找国家
    country_name = str(row["country_name"]).strip()  # 去除空格
    country = db.query(Country).filter(Country.name == country_name).first()
    if not country:
        # 调试信息：显示所有可用的国家
        all_countries = db.query(Country.name).all()
        available_countries = [c[0] for c in all_countries]
        return {"status": "error", "message": f"第{row_number}行: 国家 '{country_name}' 不存在。可用国家: {available_countries}"}

    existing = db.query(Supplier).filter(Supplier.name == row["name"]).first()
    if existing:
        if strategy == DuplicateHandlingStrategy.SKIP:
            return {"status": "skipped", "message": f"第{row_number}行: 供应商 '{row['name']}' 已存在，已跳过"}
        else:
            return {"status": "error", "message": f"第{row_number}行: 供应商 '{row['name']}' 已存在"}

    # 安全处理所有字符串字段
    def safe_string_field(value):
        if value is None or pd.isna(value):
            return None
        return str(value).strip() if str(value).strip() else None

    contact_value = safe_string_field(row.get("contact"))
    email_value = safe_string_field(row.get("email"))
    phone_value = safe_string_field(row.get("phone"))

    supplier = Supplier(
        name=row["name"],
        country_id=country.id,
        contact=contact_value,
        email=email_value,
        phone=phone_value,
        status=str(row.get("status", "true")).lower() == "true"
    )
    db.add(supplier)
    return {"status": "success", "message": f"第{row_number}行: 供应商 '{row['name']}' 创建成功"}

def process_ship_row(row: pd.Series, row_number: int, db: Session, strategy: DuplicateHandlingStrategy) -> Dict[str, str]:
    """处理船舶数据行"""
    # 查找公司
    company = db.query(Company).filter(Company.name == row["company_name"]).first()
    if not company:
        return {"status": "error", "message": f"第{row_number}行: 公司 '{row['company_name']}' 不存在"}

    existing = db.query(Ship).filter(Ship.name == row["name"]).first()
    if existing:
        if strategy == DuplicateHandlingStrategy.SKIP:
            return {"status": "skipped", "message": f"第{row_number}行: 船舶 '{row['name']}' 已存在，已跳过"}
        else:
            return {"status": "error", "message": f"第{row_number}行: 船舶 '{row['name']}' 已存在"}

    ship = Ship(
        name=row["name"],
        company_id=company.id,
        ship_type=row.get("ship_type"),
        capacity=int(row["capacity"]) if row.get("capacity") else None,
        status=str(row.get("status", "true")).lower() == "true"
    )
    db.add(ship)
    return {"status": "success", "message": f"第{row_number}行: 船舶 '{row['name']}' 创建成功"}

def process_product_row(row: pd.Series, row_number: int, db: Session, strategy: DuplicateHandlingStrategy) -> Dict[str, str]:
    """处理产品数据行 - 完整版本"""
    try:
        # 查找必要的外键
        country_name = str(row["country_name"]).strip()
        country = db.query(Country).filter(Country.name == country_name).first()
        if not country:
            all_countries = db.query(Country.name).all()
            available_countries = [c[0] for c in all_countries]
            return {"status": "error", "message": f"第{row_number}行: 国家 '{country_name}' 不存在。可用国家: {available_countries}"}

        category_name = str(row["category_name"]).strip()
        category = db.query(Category).filter(Category.name == category_name).first()
        if not category:
            all_categories = db.query(Category.name).all()
            available_categories = [c[0] for c in all_categories]
            return {"status": "error", "message": f"第{row_number}行: 类别 '{category_name}' 不存在。可用类别: {available_categories}"}

        # 检查产品是否已存在
        existing = db.query(Product).filter(Product.product_name_en == row["product_name_en"]).first()
        if existing:
            if strategy == DuplicateHandlingStrategy.SKIP:
                return {"status": "skipped", "message": f"第{row_number}行: 产品 '{row['product_name_en']}' 已存在，已跳过"}
            else:
                return {"status": "error", "message": f"第{row_number}行: 产品 '{row['product_name_en']}' 已存在"}

        # 处理可选的外键关系
        supplier_id = None
        if row.get("supplier_name") and not pd.isna(row["supplier_name"]):
            supplier_name = str(row["supplier_name"]).strip()
            supplier = db.query(Supplier).filter(Supplier.name == supplier_name).first()
            if supplier:
                supplier_id = supplier.id
            else:
                return {"status": "error", "message": f"第{row_number}行: 供应商 '{supplier_name}' 不存在"}

        port_id = None
        if row.get("port_name") and not pd.isna(row["port_name"]):
            port_name = str(row["port_name"]).strip()
            port = db.query(Port).filter(Port.name == port_name).first()
            if port:
                port_id = port.id
            else:
                return {"status": "error", "message": f"第{row_number}行: 港口 '{port_name}' 不存在"}

        # 安全处理字符串字段
        def safe_string_field(value):
            if value is None or pd.isna(value):
                return None
            return str(value).strip() if str(value).strip() else None

        code_value = safe_string_field(row.get("code"))
        unit_value = safe_string_field(row.get("unit"))
        currency_value = safe_string_field(row.get("currency"))
        unit_size_value = safe_string_field(row.get("unit_size"))
        brand_value = safe_string_field(row.get("brand"))
        country_of_origin_value = safe_string_field(row.get("country_of_origin"))

        # 处理字段
        pack_size_value = None
        if row.get("pack_size") and not pd.isna(row["pack_size"]):
            # pack_size 现在支持字符串格式，直接使用字符串值
            pack_size_value = str(row["pack_size"]).strip()

        price_value = None
        if row.get("price") and not pd.isna(row["price"]):
            try:
                price_value = float(row["price"])
                if price_value < 0:
                    return {"status": "error", "message": f"第{row_number}行: price (价格) 不能为负数"}
            except (ValueError, TypeError):
                return {"status": "error", "message": f"第{row_number}行: price (价格) 格式错误，必须为数字"}

        # 处理日期字段
        from datetime import datetime, timedelta
        effective_from_value = None
        effective_to_value = None

        if row.get("effective_from") and not pd.isna(row["effective_from"]):
            try:
                effective_from_value = pd.to_datetime(row["effective_from"]).to_pydatetime()
            except Exception as e:
                return {"status": "error", "message": f"第{row_number}行: 起始日期格式错误 - {str(e)}"}

        if row.get("effective_to") and not pd.isna(row["effective_to"]):
            try:
                effective_to_value = pd.to_datetime(row["effective_to"]).to_pydatetime()
            except Exception as e:
                return {"status": "error", "message": f"第{row_number}行: 结束日期格式错误 - {str(e)}"}
        elif effective_from_value:
            # 如果没有结束日期，自动设置为起始日期+3个月
            effective_to_value = effective_from_value + timedelta(days=90)

        # 验证日期范围
        if effective_from_value and effective_to_value:
            if effective_to_value < effective_from_value:
                return {"status": "error", "message": f"第{row_number}行: 结束日期不能早于起始日期"}

        # 创建产品
        product = Product(
            product_name_en=row["product_name_en"],
            product_name_jp=row.get("product_name_jp"),
            code=code_value,
            country_id=country.id,
            category_id=category.id,
            supplier_id=supplier_id,
            port_id=port_id,
            unit=unit_value,
            price=price_value,
            currency=currency_value,
            unit_size=unit_size_value,
            pack_size=pack_size_value,
            brand=brand_value,
            country_of_origin=country_of_origin_value,
            effective_from=effective_from_value,
            effective_to=effective_to_value,
            status=str(row.get("status", "true")).lower() == "true"
        )
        db.add(product)
        return {"status": "success", "message": f"第{row_number}行: 产品 '{row['product_name_en']}' 创建成功"}

    except Exception as e:
        return {"status": "error", "message": f"第{row_number}行: 处理失败 - {str(e)}"}

def process_product_row_optimized(row: pd.Series, row_number: int, db: Session, strategy: DuplicateHandlingStrategy, foreign_key_maps: Dict[str, Dict[str, int]]) -> Dict[str, str]:
    """处理产品数据行 - 优化版本，使用预加载的外键数据"""

    try:
        # 🔥 性能优化：使用预加载的映射表，避免数据库查询

        # 查找国家ID（从内存映射表）
        country_id = foreign_key_maps.get("countries", {}).get(row["country_name"])
        if not country_id:
            return {"status": "error", "message": f"第{row_number}行: 国家 '{row['country_name']}' 不存在"}

        # 查找类别ID（从内存映射表）
        category_id = foreign_key_maps.get("categories", {}).get(row["category_name"])
        if not category_id:
            return {"status": "error", "message": f"第{row_number}行: 类别 '{row['category_name']}' 不存在"}

        # 查找供应商ID（从内存映射表，可选）
        supplier_id = None
        if row.get("supplier_name") and not pd.isna(row["supplier_name"]):
            supplier_id = foreign_key_maps.get("suppliers", {}).get(row["supplier_name"])
            if not supplier_id:
                return {"status": "error", "message": f"第{row_number}行: 供应商 '{row['supplier_name']}' 不存在"}

        # 查找港口ID（从内存映射表，可选）
        port_id = None
        if row.get("port_name") and not pd.isna(row["port_name"]):
            port_id = foreign_key_maps.get("ports", {}).get(row["port_name"])
            if not port_id:
                return {"status": "error", "message": f"第{row_number}行: 港口 '{row['port_name']}' 不存在"}

        # 检查产品是否已存在
        existing = db.query(Product).filter(Product.product_name_en == row["product_name_en"]).first()
        if existing:
            if strategy == DuplicateHandlingStrategy.SKIP:
                return {"status": "skipped", "message": f"第{row_number}行: 产品 '{row['product_name_en']}' 已存在，已跳过"}
            else:
                return {"status": "error", "message": f"第{row_number}行: 产品 '{row['product_name_en']}' 已存在"}

        # 处理其他字段
        code_value = row.get("code")
        if code_value and not pd.isna(code_value):
            code_value = str(code_value).strip()
        else:
            code_value = None

        unit_value = row.get("unit")
        if unit_value and not pd.isna(unit_value):
            unit_value = str(unit_value).strip()
        else:
            unit_value = None

        price_value = None
        if row.get("price") and not pd.isna(row["price"]):
            try:
                price_value = float(row["price"])
                if price_value < 0:
                    return {"status": "error", "message": f"第{row_number}行: price (价格) 不能为负数"}
            except (ValueError, TypeError):
                return {"status": "error", "message": f"第{row_number}行: price (价格) 格式错误，必须为数字"}

        currency_value = row.get("currency")
        if currency_value and not pd.isna(currency_value):
            currency_value = str(currency_value).strip()
        else:
            currency_value = None

        unit_size_value = row.get("unit_size")
        if unit_size_value and not pd.isna(unit_size_value):
            unit_size_value = str(unit_size_value).strip()
        else:
            unit_size_value = None

        # pack_size 现在支持字符串格式
        pack_size_value = None
        if row.get("pack_size") and not pd.isna(row["pack_size"]):
            pack_size_value = str(row["pack_size"]).strip()

        brand_value = row.get("brand")
        if brand_value and not pd.isna(brand_value):
            brand_value = str(brand_value).strip()
        else:
            brand_value = None

        country_of_origin_value = row.get("country_of_origin")
        if country_of_origin_value and not pd.isna(country_of_origin_value):
            country_of_origin_value = str(country_of_origin_value).strip()
        else:
            country_of_origin_value = None

        # 处理日期字段
        effective_from_value = None
        if row.get("effective_from") and not pd.isna(row["effective_from"]):
            try:
                if isinstance(row["effective_from"], str):
                    effective_from_value = datetime.strptime(row["effective_from"], "%Y-%m-%d").date()
                else:
                    effective_from_value = row["effective_from"]
            except (ValueError, TypeError):
                return {"status": "error", "message": f"第{row_number}行: effective_from 日期格式错误"}

        effective_to_value = None
        if row.get("effective_to") and not pd.isna(row["effective_to"]):
            try:
                if isinstance(row["effective_to"], str):
                    effective_to_value = datetime.strptime(row["effective_to"], "%Y-%m-%d").date()
                else:
                    effective_to_value = row["effective_to"]
            except (ValueError, TypeError):
                return {"status": "error", "message": f"第{row_number}行: effective_to 日期格式错误"}

        # 创建产品
        product = Product(
            product_name_en=row["product_name_en"],
            product_name_jp=row.get("product_name_jp"),
            code=code_value,
            country_id=country_id,
            category_id=category_id,
            supplier_id=supplier_id,
            port_id=port_id,
            unit=unit_value,
            price=price_value,
            currency=currency_value,
            unit_size=unit_size_value,
            pack_size=pack_size_value,
            brand=brand_value,
            country_of_origin=country_of_origin_value,
            effective_from=effective_from_value,
            effective_to=effective_to_value,
            status=str(row.get("status", "true")).lower() == "true"
        )
        db.add(product)
        return {"status": "success", "message": f"第{row_number}行: 产品 '{row['product_name_en']}' 创建成功"}

    except Exception as e:
        return {"status": "error", "message": f"第{row_number}行: 处理失败 - {str(e)}"}

def process_port_row_optimized(row: pd.Series, row_number: int, db: Session, strategy: DuplicateHandlingStrategy, foreign_key_maps: Dict[str, Dict[str, int]]) -> Dict[str, str]:
    """处理港口数据行 - 优化版本"""
    # 使用预加载的国家数据
    country_id = foreign_key_maps.get("countries", {}).get(row["country_name"])
    if not country_id:
        return {"status": "error", "message": f"第{row_number}行: 国家 '{row['country_name']}' 不存在"}

    existing = db.query(Port).filter(Port.name == row["name"]).first()
    if existing:
        if strategy == DuplicateHandlingStrategy.SKIP:
            return {"status": "skipped", "message": f"第{row_number}行: 港口 '{row['name']}' 已存在，已跳过"}
        else:
            return {"status": "error", "message": f"第{row_number}行: 港口 '{row['name']}' 已存在"}

    port_code = row.get("code")
    if port_code and str(port_code).strip():
        port_code = str(port_code).strip()
        existing_code = db.query(Port).filter(Port.code == port_code).first()
        if existing_code:
            if strategy == DuplicateHandlingStrategy.SKIP:
                return {"status": "skipped", "message": f"第{row_number}行: 港口代码 '{port_code}' 已存在，已跳过"}
            else:
                return {"status": "error", "message": f"第{row_number}行: 港口代码 '{port_code}' 已存在"}
    else:
        port_code = None

    port = Port(
        name=row["name"],
        code=port_code,
        country_id=country_id,
        location=row.get("location"),
        status=str(row.get("status", "true")).lower() == "true"
    )
    db.add(port)
    return {"status": "success", "message": f"第{row_number}行: 港口 '{row['name']}' 创建成功"}

def process_company_row_optimized(row: pd.Series, row_number: int, db: Session, strategy: DuplicateHandlingStrategy, foreign_key_maps: Dict[str, Dict[str, int]]) -> Dict[str, str]:
    """处理公司数据行 - 优化版本"""
    # 使用预加载的国家数据
    country_id = foreign_key_maps.get("countries", {}).get(row["country_name"])
    if not country_id:
        return {"status": "error", "message": f"第{row_number}行: 国家 '{row['country_name']}' 不存在"}

    existing = db.query(Company).filter(Company.name == row["name"]).first()
    if existing:
        if strategy == DuplicateHandlingStrategy.SKIP:
            return {"status": "skipped", "message": f"第{row_number}行: 公司 '{row['name']}' 已存在，已跳过"}
        else:
            return {"status": "error", "message": f"第{row_number}行: 公司 '{row['name']}' 已存在"}

    company = Company(
        name=row["name"],
        country_id=country_id,
        status=str(row.get("status", "true")).lower() == "true"
    )
    db.add(company)
    return {"status": "success", "message": f"第{row_number}行: 公司 '{row['name']}' 创建成功"}

def process_supplier_row_optimized(row: pd.Series, row_number: int, db: Session, strategy: DuplicateHandlingStrategy, foreign_key_maps: Dict[str, Dict[str, int]]) -> Dict[str, str]:
    """处理供应商数据行 - 优化版本"""
    # 使用预加载的国家数据
    country_id = foreign_key_maps.get("countries", {}).get(row["country_name"])
    if not country_id:
        return {"status": "error", "message": f"第{row_number}行: 国家 '{row['country_name']}' 不存在"}

    existing = db.query(Supplier).filter(Supplier.name == row["name"]).first()
    if existing:
        if strategy == DuplicateHandlingStrategy.SKIP:
            return {"status": "skipped", "message": f"第{row_number}行: 供应商 '{row['name']}' 已存在，已跳过"}
        else:
            return {"status": "error", "message": f"第{row_number}行: 供应商 '{row['name']}' 已存在"}

    phone_value = row.get("phone")
    if phone_value is not None and not pd.isna(phone_value):
        phone_value = str(phone_value)
    else:
        phone_value = None

    supplier = Supplier(
        name=row["name"],
        country_id=country_id,
        contact=row.get("contact"),
        email=row.get("email"),
        phone=phone_value,
        status=str(row.get("status", "true")).lower() == "true"
    )
    db.add(supplier)
    return {"status": "success", "message": f"第{row_number}行: 供应商 '{row['name']}' 创建成功"}

def process_ship_row_optimized(row: pd.Series, row_number: int, db: Session, strategy: DuplicateHandlingStrategy, foreign_key_maps: Dict[str, Dict[str, int]]) -> Dict[str, str]:
    """处理船舶数据行 - 优化版本"""
    # 使用预加载的公司数据
    company_id = foreign_key_maps.get("companies", {}).get(row["company_name"])
    if not company_id:
        return {"status": "error", "message": f"第{row_number}行: 公司 '{row['company_name']}' 不存在"}

    existing = db.query(Ship).filter(Ship.name == row["name"]).first()
    if existing:
        if strategy == DuplicateHandlingStrategy.SKIP:
            return {"status": "skipped", "message": f"第{row_number}行: 船舶 '{row['name']}' 已存在，已跳过"}
        else:
            return {"status": "error", "message": f"第{row_number}行: 船舶 '{row['name']}' 已存在"}

    ship = Ship(
        name=row["name"],
        company_id=company_id,
        status=str(row.get("status", "true")).lower() == "true"
    )
    db.add(ship)
    return {"status": "success", "message": f"第{row_number}行: 船舶 '{row['name']}' 创建成功"}

async def import_table_data(table_name: str, df: pd.DataFrame, db: Session) -> Dict[str, Any]:
    """导入数据到指定表"""

    success_count = 0
    error_count = 0
    skipped_count = 0  # 跳过的重复数据计数
    errors = []
    skipped_items = []  # 跳过的项目列表
    
    try:
        for index, row in df.iterrows():
            try:
                if table_name == "countries":
                    # 检查必填字段
                    if pd.isna(row["name"]) or str(row["name"]).strip() == "":
                        errors.append(f"第{index+2}行: name 不能为空")
                        error_count += 1
                        continue

                    if pd.isna(row["code"]) or str(row["code"]).strip() == "":
                        errors.append(f"第{index+2}行: code 不能为空")
                        error_count += 1
                        continue

                    # 检查是否已存在
                    existing = db.query(Country).filter(
                        (Country.name == row["name"]) | (Country.code == row["code"])
                    ).first()

                    if not existing:
                        country = Country(
                            name=row["name"],
                            code=row["code"],
                            status=str(row.get("status", "true")).lower() == "true"
                        )
                        db.add(country)
                        success_count += 1
                    else:
                        # 重复数据跳过，不再作为错误
                        skipped_count += 1
                        skipped_items.append(f"第{index+2}行: 国家 '{row['name']}' 或代码 '{row['code']}' 已存在，已跳过")
                
                elif table_name == "categories":
                    # 检查必填字段
                    if pd.isna(row["name"]) or str(row["name"]).strip() == "":
                        errors.append(f"第{index+2}行: name 不能为空")
                        error_count += 1
                        continue

                    existing = db.query(Category).filter(Category.name == row["name"]).first()

                    if not existing:
                        category = Category(
                            name=row["name"],
                            code=row.get("code") if not pd.isna(row.get("code")) else None,
                            description=row.get("description") if not pd.isna(row.get("description")) else None,
                            status=str(row.get("status", "true")).lower() == "true"
                        )
                        db.add(category)
                        success_count += 1
                    else:
                        errors.append(f"第{index+2}行: 类别 '{row['name']}' 已存在")
                        error_count += 1

                elif table_name == "ports":
                    # 查找国家
                    country_name = str(row["country_name"]).strip()
                    country = db.query(Country).filter(Country.name == country_name).first()
                    if not country:
                        all_countries = db.query(Country.name).all()
                        available_countries = [c[0] for c in all_countries]
                        errors.append(f"第{index+2}行: 国家 '{country_name}' 不存在。可用国家: {available_countries}")
                        error_count += 1
                        continue

                    # 检查港口是否已存在
                    existing = db.query(Port).filter(Port.name == row["name"]).first()
                    if existing:
                        errors.append(f"第{index+2}行: 港口 '{row['name']}' 已存在")
                        error_count += 1
                        continue

                    # 处理code字段 - 检查唯一性
                    port_code = row.get("code")
                    if port_code and str(port_code).strip():
                        port_code = str(port_code).strip()
                        # 检查code是否已存在
                        existing_code = db.query(Port).filter(Port.code == port_code).first()
                        if existing_code:
                            errors.append(f"第{index+2}行: 港口代码 '{port_code}' 已存在")
                            error_count += 1
                            continue
                    else:
                        port_code = None  # 确保空值为None

                    port = Port(
                        name=row["name"],
                        code=port_code,
                        country_id=country.id,
                        location=row.get("location"),
                        status=str(row.get("status", "true")).lower() == "true"
                    )
                    db.add(port)
                    success_count += 1

                elif table_name == "companies":
                    # 查找国家
                    country_name = str(row["country_name"]).strip()
                    country = db.query(Country).filter(Country.name == country_name).first()
                    if not country:
                        all_countries = db.query(Country.name).all()
                        available_countries = [c[0] for c in all_countries]
                        errors.append(f"第{index+2}行: 国家 '{country_name}' 不存在。可用国家: {available_countries}")
                        error_count += 1
                        continue

                    # 检查公司是否已存在
                    existing = db.query(Company).filter(Company.name == row["name"]).first()
                    if existing:
                        errors.append(f"第{index+2}行: 公司 '{row['name']}' 已存在")
                        error_count += 1
                        continue

                    # 安全处理所有字符串字段
                    def safe_string_field(value):
                        if value is None or pd.isna(value):
                            return None
                        return str(value).strip() if str(value).strip() else None

                    contact_value = safe_string_field(row.get("contact"))
                    email_value = safe_string_field(row.get("email"))
                    phone_value = safe_string_field(row.get("phone"))

                    company = Company(
                        name=row["name"],
                        country_id=country.id,
                        contact=contact_value,
                        email=email_value,
                        phone=phone_value,
                        status=str(row.get("status", "true")).lower() == "true"
                    )
                    db.add(company)
                    success_count += 1

                elif table_name == "suppliers":
                    # 查找国家
                    country_name = str(row["country_name"]).strip()  # 去除空格
                    country = db.query(Country).filter(Country.name == country_name).first()
                    if not country:
                        # 调试信息：显示所有可用的国家
                        all_countries = db.query(Country.name).all()
                        available_countries = [c[0] for c in all_countries]
                        errors.append(f"第{index+2}行: 国家 '{country_name}' 不存在。可用国家: {available_countries}")
                        error_count += 1
                        continue

                    # 检查供应商是否已存在
                    existing = db.query(Supplier).filter(Supplier.name == row["name"]).first()
                    if not existing:
                        # 确保phone字段被正确处理为字符串
                        phone_value = row.get("phone")
                        if phone_value is not None and not pd.isna(phone_value):
                            phone_value = str(phone_value)
                        else:
                            phone_value = None

                        supplier = Supplier(
                            name=row["name"],
                            country_id=country.id,
                            contact=row.get("contact"),
                            email=row.get("email"),
                            phone=phone_value,
                            status=str(row.get("status", "true")).lower() == "true"
                        )
                        db.add(supplier)
                        success_count += 1
                    else:
                        errors.append(f"第{index+2}行: 供应商 '{row['name']}' 已存在")
                        error_count += 1

                elif table_name == "ships":
                    # 查找公司
                    company = db.query(Company).filter(Company.name == row["company_name"]).first()
                    if not company:
                        errors.append(f"第{index+2}行: 公司 '{row['company_name']}' 不存在")
                        error_count += 1
                        continue

                    # 检查船舶是否已存在
                    existing = db.query(Ship).filter(Ship.name == row["name"]).first()
                    if not existing:
                        ship = Ship(
                            name=row["name"],
                            company_id=company.id,
                            ship_type=row.get("ship_type"),
                            capacity=int(row["capacity"]) if row.get("capacity") else None,
                            status=str(row.get("status", "true")).lower() == "true"
                        )
                        db.add(ship)
                        success_count += 1
                    else:
                        errors.append(f"第{index+2}行: 船舶 '{row['name']}' 已存在")
                        error_count += 1

                elif table_name == "products":
                    # 检查必填字段：产品英文名称
                    if pd.isna(row.get("product_name_en")) or str(row.get("product_name_en", "")).strip() == "":
                        errors.append(f"第{index+2}行: product_name_en (产品英文名称) 不能为空")
                        error_count += 1
                        continue

                    # 检查必填字段：起始日期
                    if pd.isna(row.get("effective_from")) or str(row.get("effective_from", "")).strip() == "":
                        errors.append(f"第{index+2}行: effective_from (起始日期) 不能为空")
                        error_count += 1
                        continue

                    # 检查必填字段：国家名称
                    if pd.isna(row.get("country_name")) or str(row.get("country_name", "")).strip() == "":
                        errors.append(f"第{index+2}行: country_name (国家名称) 不能为空")
                        error_count += 1
                        continue

                    # 检查必填字段：类别名称
                    if pd.isna(row.get("category_name")) or str(row.get("category_name", "")).strip() == "":
                        errors.append(f"第{index+2}行: category_name (类别名称) 不能为空")
                        error_count += 1
                        continue

                    # 查找国家
                    country = db.query(Country).filter(Country.name == row["country_name"]).first()
                    if not country:
                        errors.append(f"第{index+2}行: 国家 '{row['country_name']}' 不存在")
                        error_count += 1
                        continue

                    # 查找类别
                    category = db.query(Category).filter(Category.name == row["category_name"]).first()
                    if not category:
                        errors.append(f"第{index+2}行: 类别 '{row['category_name']}' 不存在")
                        error_count += 1
                        continue

                    # 查找供应商（可选）
                    supplier_id = None
                    if row.get("supplier_name") and not pd.isna(row["supplier_name"]):
                        supplier = db.query(Supplier).filter(Supplier.name == row["supplier_name"]).first()
                        if supplier:
                            supplier_id = supplier.id
                        else:
                            errors.append(f"第{index+2}行: 供应商 '{row['supplier_name']}' 不存在")
                            error_count += 1
                            continue

                    # 查找港口（可选）
                    port_id = None
                    if row.get("port_name") and not pd.isna(row["port_name"]):
                        port = db.query(Port).filter(Port.name == row["port_name"]).first()
                        if port:
                            port_id = port.id
                        else:
                            errors.append(f"第{index+2}行: 港口 '{row['port_name']}' 不存在")
                            error_count += 1
                            continue

                    # 检查产品是否已存在
                    existing = db.query(Product).filter(Product.product_name_en == row["product_name_en"]).first()
                    if not existing:
                        # 处理字符串字段，确保类型正确
                        code_value = row.get("code")
                        if code_value is not None and not pd.isna(code_value):
                            code_value = str(code_value)
                        else:
                            code_value = None

                        unit_value = row.get("unit")
                        if unit_value is not None and not pd.isna(unit_value):
                            unit_value = str(unit_value)
                        else:
                            unit_value = None

                        currency_value = row.get("currency")
                        if currency_value is not None and not pd.isna(currency_value):
                            currency_value = str(currency_value)
                        else:
                            currency_value = None

                        unit_size_value = row.get("unit_size")
                        if unit_size_value is not None and not pd.isna(unit_size_value):
                            unit_size_value = str(unit_size_value)
                        else:
                            unit_size_value = None

                        brand_value = row.get("brand")
                        if brand_value is not None and not pd.isna(brand_value):
                            brand_value = str(brand_value)
                        else:
                            brand_value = None

                        country_of_origin_value = row.get("country_of_origin")
                        if country_of_origin_value is not None and not pd.isna(country_of_origin_value):
                            country_of_origin_value = str(country_of_origin_value)
                        else:
                            country_of_origin_value = None

                        # 处理字段
                        pack_size_value = row.get("pack_size")
                        if pack_size_value is not None and not pd.isna(pack_size_value):
                            # pack_size 现在支持字符串格式，直接使用字符串值
                            pack_size_value = str(pack_size_value).strip()
                        else:
                            pack_size_value = None

                        # 处理价格字段
                        price_value = None
                        if row.get("price") and not pd.isna(row["price"]):
                            try:
                                price_value = float(row["price"])
                                if price_value < 0:
                                    errors.append(f"第{index+2}行: price (价格) 不能为负数")
                                    error_count += 1
                                    continue
                            except (ValueError, TypeError):
                                errors.append(f"第{index+2}行: price (价格) 格式错误，必须为数字")
                                error_count += 1
                                continue

                        # 处理日期字段
                        from datetime import datetime, timedelta
                        import pandas as pd

                        # 处理起始日期（必填）
                        effective_from_value = None
                        try:
                            if row.get("effective_from") and not pd.isna(row["effective_from"]):
                                if isinstance(row["effective_from"], str):
                                    # 尝试解析字符串日期
                                    effective_from_value = pd.to_datetime(row["effective_from"]).to_pydatetime()
                                else:
                                    # 已经是datetime对象
                                    effective_from_value = pd.to_datetime(row["effective_from"]).to_pydatetime()
                        except Exception as e:
                            errors.append(f"第{index+2}行: 起始日期格式错误 - {str(e)}")
                            error_count += 1
                            continue

                        # 处理结束日期（可选，如果没有则自动设置为起始日期+3个月）
                        effective_to_value = None
                        if row.get("effective_to") and not pd.isna(row["effective_to"]):
                            try:
                                if isinstance(row["effective_to"], str):
                                    effective_to_value = pd.to_datetime(row["effective_to"]).to_pydatetime()
                                else:
                                    effective_to_value = pd.to_datetime(row["effective_to"]).to_pydatetime()
                            except Exception as e:
                                errors.append(f"第{index+2}行: 结束日期格式错误 - {str(e)}")
                                error_count += 1
                                continue
                        else:
                            # 如果没有结束日期，自动设置为起始日期+3个月
                            if effective_from_value:
                                effective_to_value = effective_from_value + timedelta(days=90)  # 约3个月

                        # 验证日期范围
                        if effective_from_value and effective_to_value:
                            if effective_to_value < effective_from_value:
                                errors.append(f"第{index+2}行: 结束日期不能早于起始日期")
                                error_count += 1
                                continue

                        product = Product(
                            product_name_en=row["product_name_en"],
                            product_name_jp=row.get("product_name_jp"),
                            code=code_value,
                            country_id=country.id,
                            category_id=category.id,
                            supplier_id=supplier_id,
                            port_id=port_id,
                            unit=unit_value,
                            price=price_value,
                            currency=currency_value,
                            unit_size=unit_size_value,
                            pack_size=pack_size_value,
                            brand=brand_value,
                            country_of_origin=country_of_origin_value,
                            effective_from=effective_from_value,
                            effective_to=effective_to_value,
                            status=str(row.get("status", "true")).lower() == "true"
                        )
                        db.add(product)
                        success_count += 1
                    else:
                        errors.append(f"第{index+2}行: 产品 '{row['product_name_en']}' 已存在")
                        error_count += 1

                else:
                    errors.append(f"第{index+2}行: 不支持的表类型 '{table_name}'")
                    error_count += 1
                
            except Exception as e:
                error_count += 1
                errors.append(f"第{index+2}行: {str(e)}")
        
        # 提交事务
        if success_count > 0:
            db.commit()
        
        return {
            "success_count": success_count,
            "error_count": error_count,
            "skipped_count": skipped_count,
            "errors": errors,
            "skipped_items": skipped_items
        }
        
    except Exception as e:
        db.rollback()
        raise e
