"""
Excel文件解析服务
用于解析邮轮订单Excel文件
"""
import pandas as pd
import re
from datetime import datetime
from typing import List, Dict, Any, Optional, Tuple
from decimal import Decimal
import logging

logger = logging.getLogger(__name__)

class CruiseOrderParser:
    """邮轮订单Excel解析器"""
    
    def __init__(self):
        self.orders = []
        self.errors = []
    
    def parse_excel_file(self, file_path: str) -> Dict[str, Any]:
        """
        解析Excel文件
        
        Args:
            file_path: Excel文件路径
            
        Returns:
            解析结果字典
        """
        try:
            # 读取Excel文件
            df = pd.read_excel(file_path, header=None)
            
            # 重置解析状态
            self.orders = []
            self.errors = []
            
            # 解析数据
            self._parse_dataframe(df)
            
            return {
                "success": True,
                "orders_count": len(self.orders),
                "orders": self.orders,
                "errors": self.errors,
                "summary": self._generate_summary()
            }
            
        except Exception as e:
            logger.error(f"解析Excel文件失败: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "orders": [],
                "errors": [f"文件解析失败: {str(e)}"]
            }
    
    def _parse_dataframe(self, df: pd.DataFrame):
        """解析DataFrame数据"""
        current_order = None
        
        for index, row in df.iterrows():
            try:
                # 转换为字符串列表，处理NaN值
                row_data = [str(cell) if pd.notna(cell) else "" for cell in row]
                
                if not row_data or all(cell == "" for cell in row_data):
                    continue
                
                # 判断行类型
                row_type = row_data[0].strip().upper()
                
                if row_type == "HEADER":
                    # 保存上一个订单
                    if current_order:
                        self.orders.append(current_order)
                    
                    # 解析HEADER行
                    current_order = self._parse_header_row(row_data, index)
                    
                elif row_type == "DETAIL":
                    # 解析DETAIL行
                    if current_order:
                        detail_item = self._parse_detail_row(row_data, index)
                        if detail_item:
                            current_order["items"].append(detail_item)
                    else:
                        self.errors.append(f"第{index+1}行: DETAIL行出现在HEADER行之前")
                
            except Exception as e:
                self.errors.append(f"第{index+1}行解析失败: {str(e)}")
                continue
        
        # 保存最后一个订单
        if current_order:
            self.orders.append(current_order)
    
    def _parse_header_row(self, row_data: List[str], row_index: int) -> Dict[str, Any]:
        """解析HEADER行"""
        try:
            header = {
                "row_index": row_index,
                "order_number": row_data[1] if len(row_data) > 1 else "",
                "order_date": self._parse_date(row_data[3]) if len(row_data) > 3 else None,
                "currency": row_data[4] if len(row_data) > 4 else "",
                "ship_code": row_data[5] if len(row_data) > 5 else "",
                "order_type": row_data[6] if len(row_data) > 6 else "",
                "loading_date": self._parse_date(row_data[7]) if len(row_data) > 7 else None,
                "ship_name": "",
                "destination": "",
                "port_code": "",
                "supplier_name": "",
                "supplier_code": "",
                "total_amount": None,
                "items": [],
                "raw_data": row_data
            }
            
            # 解析详细信息（通常在第9列）
            if len(row_data) > 9:
                details = row_data[9]
                header.update(self._parse_header_details(details))
            
            # 解析船舶名称（通常在第10列）
            if len(row_data) > 10:
                header["ship_name"] = row_data[10]
            
            # 解析供应商信息（通常在第12列）
            if len(row_data) > 12:
                header["supplier_name"] = row_data[12]
            
            # 解析供应商代码（通常在第13列）
            if len(row_data) > 13:
                header["supplier_code"] = row_data[13]
            
            # 解析总金额（通常在第15列）
            if len(row_data) > 15:
                header["total_amount"] = self._parse_decimal(row_data[15])
            
            return header
            
        except Exception as e:
            logger.error(f"解析HEADER行失败: {str(e)}")
            raise
    
    def _parse_detail_row(self, row_data: List[str], row_index: int) -> Optional[Dict[str, Any]]:
        """解析DETAIL行"""
        try:
            if len(row_data) < 8:
                return None
            
            detail = {
                "row_index": row_index,
                "product_code": row_data[1] if len(row_data) > 1 else "",
                "line_number": self._parse_int(row_data[2]) if len(row_data) > 2 else None,
                "quantity": self._parse_decimal(row_data[3]) if len(row_data) > 3 else 0,
                "unit": row_data[4] if len(row_data) > 4 else "",
                "unit_price": self._parse_decimal(row_data[5]) if len(row_data) > 5 else 0,
                "product_name": row_data[7] if len(row_data) > 7 else "",
                "raw_data": row_data
            }
            
            # 计算总价
            if detail["quantity"] and detail["unit_price"]:
                detail["total_price"] = detail["quantity"] * detail["unit_price"]
            else:
                detail["total_price"] = 0
            
            return detail
            
        except Exception as e:
            logger.error(f"解析DETAIL行失败: {str(e)}")
            return None
    
    def _parse_header_details(self, details_text: str) -> Dict[str, str]:
        """解析HEADER详细信息"""
        result = {
            "ship_name": "",
            "destination": "",
            "port_code": ""
        }
        
        try:
            # 解析船舶名称
            ship_match = re.search(r'([A-Z\s]+)\s*:\s*([A-Z0-9-]+)', details_text)
            if ship_match:
                result["ship_name"] = ship_match.group(1).strip()
            
            # 解析目的地
            dest_match = re.search(r'FINAL DESTINATION\s*:\s*([^&#]+)', details_text)
            if dest_match:
                result["destination"] = dest_match.group(1).strip()
            
            # 解析港口代码
            port_match = re.search(r'PORT CODE:\s*([A-Z]+)', details_text)
            if port_match:
                result["port_code"] = port_match.group(1).strip()
                
        except Exception as e:
            logger.error(f"解析HEADER详细信息失败: {str(e)}")
        
        return result
    
    def _parse_date(self, date_str: str) -> Optional[datetime]:
        """解析日期字符串"""
        if not date_str or date_str.strip() == "":
            return None
        
        try:
            # 尝试多种日期格式
            date_formats = [
                "%m/%d/%Y",
                "%Y-%m-%d",
                "%d/%m/%Y",
                "%Y/%m/%d"
            ]
            
            for fmt in date_formats:
                try:
                    return datetime.strptime(date_str.strip(), fmt)
                except ValueError:
                    continue
            
            logger.warning(f"无法解析日期: {date_str}")
            return None
            
        except Exception as e:
            logger.error(f"日期解析失败: {str(e)}")
            return None
    
    def _parse_decimal(self, value_str: str) -> Optional[Decimal]:
        """解析数字字符串为Decimal"""
        if not value_str or value_str.strip() == "":
            return None
        
        try:
            # 移除逗号和其他非数字字符（保留小数点和负号）
            cleaned = re.sub(r'[^\d.-]', '', str(value_str))
            if cleaned:
                return Decimal(cleaned)
            return None
        except Exception:
            return None
    
    def _parse_int(self, value_str: str) -> Optional[int]:
        """解析整数字符串"""
        if not value_str or value_str.strip() == "":
            return None
        
        try:
            cleaned = re.sub(r'[^\d-]', '', str(value_str))
            if cleaned:
                return int(cleaned)
            return None
        except Exception:
            return None
    
    def _generate_summary(self) -> Dict[str, Any]:
        """生成解析摘要"""
        total_items = sum(len(order["items"]) for order in self.orders)
        total_amount = sum(
            order.get("total_amount", 0) or 0 
            for order in self.orders
        )
        
        return {
            "total_orders": len(self.orders),
            "total_items": total_items,
            "total_amount": float(total_amount) if total_amount else 0,
            "currencies": list(set(
                order.get("currency", "") 
                for order in self.orders 
                if order.get("currency")
            )),
            "suppliers": list(set(
                order.get("supplier_name", "") 
                for order in self.orders 
                if order.get("supplier_name")
            )),
            "ships": list(set(
                order.get("ship_name", "") 
                for order in self.orders 
                if order.get("ship_name")
            ))
        }
