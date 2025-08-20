from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from typing import Dict, List, Any, Optional
import logging
import pandas as pd
import numpy as np
import io
import os
import json
from datetime import datetime
from enum import Enum
import re

from app.api.deps import get_db, get_current_active_user
from app.models.models import User, Country, Category, Port, Supplier, Product
from app.core.config import settings

router = APIRouter()
logger = logging.getLogger(__name__)

# Maximum file size (10MB)
MAX_FILE_SIZE = 10 * 1024 * 1024

class ProductUploadResult:
    def __init__(self):
        self.success_count = 0
        self.error_count = 0
        self.skipped_count = 0
        self.errors = []
        self.skipped_items = []
        self.new_products = []
        self.duplicate_products = []
        self.error_products = []

def validate_file_type(filename: str) -> bool:
    """Validate file type"""
    if not filename:
        return False
    return filename.lower().endswith(('.csv', '.xlsx', '.xls'))

def read_excel_file(file_content: bytes, filename: str) -> pd.DataFrame:
    """Read Excel or CSV file"""
    try:
        if filename.lower().endswith('.csv'):
            df = pd.read_csv(io.BytesIO(file_content))
        else:
            df = pd.read_excel(io.BytesIO(file_content))
        
        # Clean column names
        df.columns = df.columns.str.strip()
        
        return df
    except Exception as e:
        raise ValueError(f"无法读取文件: {str(e)}")

def validate_required_columns(df: pd.DataFrame) -> List[str]:
    """Validate required columns - support both ID and name formats"""
    # Required: product_name_en and effective_from
    required_columns = ["product_name_en", "effective_from"]
    missing_columns = []

    for col in required_columns:
        if col not in df.columns:
            missing_columns.append(col)

    # Check for country field (either country_id or country_name)
    if "country_id" not in df.columns and "country_name" not in df.columns:
        missing_columns.append("country_id 或 country_name")

    # Check for category field (either category_id or category_name)
    if "category_id" not in df.columns and "category_name" not in df.columns:
        missing_columns.append("category_id 或 category_name")

    return missing_columns

def preload_reference_data(db: Session) -> Dict[str, Dict[str, int]]:
    """Preload reference data for foreign keys"""
    try:
        reference_data = {
            'countries': {c.name: c.id for c in db.query(Country).all()},
            'categories': {c.name: c.id for c in db.query(Category).all()},
            'suppliers': {s.name: s.id for s in db.query(Supplier).all()},
            'ports': {p.name: p.id for p in db.query(Port).all()}
        }
        
        logger.info(f"Reference data loaded: {len(reference_data['countries'])} countries, "
                   f"{len(reference_data['categories'])} categories, "
                   f"{len(reference_data['suppliers'])} suppliers, "
                   f"{len(reference_data['ports'])} ports")
        
        return reference_data
    except Exception as e:
        logger.error(f"Failed to load reference data: {str(e)}")
        return {'countries': {}, 'categories': {}, 'suppliers': {}, 'ports': {}}

def process_product_row(row: pd.Series, row_number: int, db: Session, reference_data: Dict[str, Dict[str, int]]) -> Dict[str, Any]:
    """Process a single product row"""
    try:
        # Validate required fields
        if pd.isna(row.get("product_name_en")) or str(row.get("product_name_en")).strip() == "":
            return {
                "status": "error",
                "row": row_number,
                "product_name": str(row.get("product_name_en", "")),
                "error": "产品英文名称不能为空",
                "field": "product_name_en"
            }

        if pd.isna(row.get("country_name")) or str(row.get("country_name")).strip() == "":
            return {
                "status": "error",
                "row": row_number,
                "product_name": str(row.get("product_name_en", "")),
                "error": "国家名称不能为空",
                "field": "country_name"
            }

        if pd.isna(row.get("category_name")) or str(row.get("category_name")).strip() == "":
            return {
                "status": "error",
                "row": row_number,
                "product_name": str(row.get("product_name_en", "")),
                "error": "类别名称不能为空",
                "field": "category_name"
            }

        if pd.isna(row.get("effective_from")) or str(row.get("effective_from")).strip() == "":
            return {
                "status": "error",
                "row": row_number,
                "product_name": str(row.get("product_name_en", "")),
                "error": "起始日期不能为空",
                "field": "effective_from"
            }

        # Get foreign key IDs
        country_name = str(row.get("country_name")).strip()
        category_name = str(row.get("category_name")).strip()
        
        country_id = reference_data['countries'].get(country_name)
        if not country_id:
            return {
                "status": "error",
                "row": row_number,
                "product_name": str(row.get("product_name_en", "")),
                "error": f"找不到国家: {country_name}",
                "field": "country_name"
            }

        category_id = reference_data['categories'].get(category_name)
        if not category_id:
            return {
                "status": "error",
                "row": row_number,
                "product_name": str(row.get("product_name_en", "")),
                "error": f"找不到类别: {category_name}",
                "field": "category_name"
            }

        # Optional foreign keys
        supplier_id = None
        if not pd.isna(row.get("supplier_name")) and str(row.get("supplier_name")).strip():
            supplier_name = str(row.get("supplier_name")).strip()
            supplier_id = reference_data['suppliers'].get(supplier_name)
            if not supplier_id:
                return {
                    "status": "error",
                    "row": row_number,
                    "product_name": str(row.get("product_name_en", "")),
                    "error": f"找不到供应商: {supplier_name}",
                    "field": "supplier_name"
                }

        port_id = None
        if not pd.isna(row.get("port_name")) and str(row.get("port_name")).strip():
            port_name = str(row.get("port_name")).strip()
            port_id = reference_data['ports'].get(port_name)
            if not port_id:
                return {
                    "status": "error",
                    "row": row_number,
                    "product_name": str(row.get("product_name_en", "")),
                    "error": f"找不到港口: {port_name}",
                    "field": "port_name"
                }

        # Check for duplicates based on unique constraint (country_id, product_name_en, port_id)
        product_name_en = str(row.get("product_name_en")).strip()
        existing_product = db.query(Product).filter(
            Product.product_name_en == product_name_en,
            Product.country_id == country_id,
            Product.port_id == port_id
        ).first()

        if existing_product:
            return {
                "status": "skipped",
                "row": row_number,
                "product_name": product_name_en,
                "reason": f"产品已存在（相同国家和港口）"
            }

        # Parse dates
        try:
            effective_from = pd.to_datetime(row.get("effective_from"))
        except:
            return {
                "status": "error",
                "row": row_number,
                "product_name": product_name_en,
                "error": "起始日期格式错误，请使用 YYYY-MM-DD 格式",
                "field": "effective_from"
            }

        effective_to = None
        if not pd.isna(row.get("effective_to")) and str(row.get("effective_to")).strip():
            try:
                effective_to = pd.to_datetime(row.get("effective_to"))
            except:
                return {
                    "status": "error",
                    "row": row_number,
                    "product_name": product_name_en,
                    "error": "结束日期格式错误，请使用 YYYY-MM-DD 格式",
                    "field": "effective_to"
                }

        # Parse price
        price = None
        if not pd.isna(row.get("price")) and str(row.get("price")).strip():
            try:
                price_str = str(row.get("price")).strip()
                # Remove common currency symbols and commas
                price_str = re.sub(r'[¥$€£,]', '', price_str)
                price = float(price_str)
                if price < 0:
                    return {
                        "status": "error",
                        "row": row_number,
                        "product_name": product_name_en,
                        "error": "价格不能为负数",
                        "field": "price"
                    }
                if price > 999999999:
                    return {
                        "status": "error",
                        "row": row_number,
                        "product_name": product_name_en,
                        "error": "价格过大，请检查数值",
                        "field": "price"
                    }
            except:
                return {
                    "status": "error",
                    "row": row_number,
                    "product_name": product_name_en,
                    "error": f"价格格式错误，请输入数字。当前值: '{row.get('price')}'",
                    "field": "price"
                }

        # Validate product code format if provided
        code = str(row.get("code", "")).strip() or None
        if code and len(code) > 50:
            return {
                "status": "error",
                "row": row_number,
                "product_name": product_name_en,
                "error": "产品代码长度不能超过50个字符",
                "field": "code"
            }

        # Validate product names length
        if len(product_name_en) > 255:
            return {
                "status": "error",
                "row": row_number,
                "product_name": product_name_en[:50] + "...",
                "error": "产品英文名称长度不能超过255个字符",
                "field": "product_name_en"
            }

        product_name_jp = str(row.get("product_name_jp", "")).strip() or None
        if product_name_jp and len(product_name_jp) > 255:
            return {
                "status": "error",
                "row": row_number,
                "product_name": product_name_en,
                "error": "产品日文名称长度不能超过255个字符",
                "field": "product_name_jp"
            }

        # Create product
        product = Product(
            product_name_en=product_name_en,
            product_name_jp=product_name_jp,
            code=code,
            country_id=country_id,
            category_id=category_id,
            supplier_id=supplier_id,
            port_id=port_id,
            unit=str(row.get("unit", "")).strip() or None,
            price=price,
            unit_size=str(row.get("unit_size", "")).strip() or None,
            pack_size=str(row.get("pack_size", "")).strip() or None,
            country_of_origin=str(row.get("country_of_origin", "")).strip() or None,
            brand=str(row.get("brand", "")).strip() or None,
            currency=str(row.get("currency", "JPY")).strip(),
            effective_from=effective_from,
            effective_to=effective_to,
            status=str(row.get("status", "true")).lower() in ["true", "1", "yes"],
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )

        db.add(product)
        
        return {
            "status": "success",
            "row": row_number,
            "product_name": product_name_en
        }

    except Exception as e:
        logger.error(f"Error processing row {row_number}: {str(e)}")
        return {
            "status": "error",
            "row": row_number,
            "product_name": str(row.get("product_name_en", "")),
            "error": f"处理数据时发生错误: {str(e)}"
        }

@router.post("/products/upload-simple")
async def upload_products_simple(
    file: UploadFile = File(...),
    upload_id: str = Form(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Simplified product upload API with automatic processing
    """
    result = ProductUploadResult()
    
    try:
        # Validate file
        if not file.filename:
            raise HTTPException(status_code=400, detail="未选择文件")

        if not validate_file_type(file.filename):
            raise HTTPException(status_code=400, detail="不支持的文件类型，请上传 CSV 或 Excel 文件")

        if file.size and file.size > MAX_FILE_SIZE:
            raise HTTPException(status_code=400, detail="文件大小超过限制（10MB）")

        # Read file
        content = await file.read()
        if len(content) == 0:
            raise HTTPException(status_code=400, detail="文件内容为空")

        # Parse file
        df = read_excel_file(content, file.filename)
        if df.empty:
            raise HTTPException(status_code=400, detail="文件中没有数据")

        # Validate required columns
        missing_columns = validate_required_columns(df)
        if missing_columns:
            raise HTTPException(
                status_code=400, 
                detail=f"缺少必要列: {', '.join(missing_columns)}"
            )

        # Preload reference data
        reference_data = preload_reference_data(db)

        logger.info(f"Starting product upload: {len(df)} rows, upload_id: {upload_id}")

        # Process each row
        for index, row in df.iterrows():
            try:
                row_result = process_product_row(row, index + 2, db, reference_data)
                
                if row_result["status"] == "success":
                    # Commit immediately for each successful row
                    db.commit()
                    result.success_count += 1
                    result.new_products.append(row_result)
                    
                elif row_result["status"] == "skipped":
                    result.skipped_count += 1
                    result.skipped_items.append(f"第{row_result['row']}行: {row_result['reason']}")
                    result.duplicate_products.append(row_result)
                    
                elif row_result["status"] == "error":
                    result.error_count += 1
                    error_msg = f"第{row_result['row']}行: {row_result['error']}"
                    result.errors.append(error_msg)
                    result.error_products.append(row_result)

            except Exception as e:
                # Rollback current row
                db.rollback()
                logger.error(f"Error processing row {index + 2}: {str(e)}")
                result.error_count += 1
                error_msg = f"第{index + 2}行: 处理失败 - {str(e)}"
                result.errors.append(error_msg)
                result.error_products.append({
                    "row": index + 2,
                    "product_name": str(row.get("product_name_en", "")),
                    "error": str(e)
                })

        logger.info(f"Product upload completed: {result.success_count} success, "
                   f"{result.skipped_count} skipped, {result.error_count} errors")

        return {
            "success_count": result.success_count,
            "error_count": result.error_count,
            "skipped_count": result.skipped_count,
            "errors": result.errors,
            "skipped_items": result.skipped_items,
            "new_products": result.new_products,
            "duplicate_products": result.duplicate_products,
            "error_products": result.error_products
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Product upload failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"产品上传失败: {str(e)}")
