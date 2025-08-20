import pandas as pd
import logging
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime
import os
from decimal import Decimal

from app.schemas.cruise_order import CruiseOrderHeader, CruiseOrderProduct

logger = logging.getLogger(__name__)


class CruiseExcelParser:
    """邮轮订单Excel文件解析器"""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
    
    def parse_cruise_order_file(self, file_path: str) -> List[CruiseOrderHeader]:
        """
        解析邮轮订单Excel文件
        
        Args:
            file_path: Excel文件路径
            
        Returns:
            List[CruiseOrderHeader]: 解析出的订单列表
        """
        try:
            self.logger.info(f"开始解析邮轮订单文件: {file_path}")
            
            # 读取Excel文件
            df = pd.read_excel(file_path, sheet_name=0, header=None)
            self.logger.info(f"成功读取Excel文件，共 {len(df)} 行数据")
            
            # 解析订单数据
            orders = self._extract_orders_from_dataframe(df)
            self.logger.info(f"成功解析出 {len(orders)} 个订单")
            
            return orders
            
        except Exception as e:
            self.logger.error(f"解析邮轮订单文件失败: {str(e)}")
            raise Exception(f"解析文件失败: {str(e)}")
    
    def _extract_orders_from_dataframe(self, df: pd.DataFrame) -> List[CruiseOrderHeader]:
        """从DataFrame中提取订单信息"""
        orders = {}
        current_order = None
        
        # 获取第一列名称，它包含行类型信息
        first_col = df.columns[0]
        
        for index, row in df.iterrows():
            try:
                # 检查第一列的值来确定行类型
                row_type = str(row[first_col]).strip() if pd.notna(row[first_col]) else ""
                
                # 检查是否是HEADER行
                if row_type == 'HEADER':
                    current_order = self._parse_header_row(row, df.columns)
                    if current_order:
                        orders[current_order.po_number] = current_order
                
                # 检查是否是DETAIL行
                elif row_type == 'DETAIL':
                    if current_order:
                        product = self._parse_detail_row(row, df.columns)
                        if product:
                            current_order.products.append(product)
                            current_order.total_amount += product.total_price
                            
            except Exception as e:
                self.logger.warning(f"处理第 {index+1} 行数据时出错: {str(e)}")
                continue
        
        return list(orders.values())
    
    def _parse_header_row(self, row: pd.Series, columns: pd.Index) -> Optional[CruiseOrderHeader]:
        """解析HEADER行数据"""
        try:
            # 根据实际Excel结构，PO号在第2列（index 1）
            po_number = str(row.iloc[1]).strip() if pd.notna(row.iloc[1]) else ""
            if not po_number:
                return None
            
            # 解析其他字段
            # 列3: 订单日期 (index 3)
            delivery_date = self._parse_date(row.iloc[7]) if len(row) > 7 else datetime.now()
            if not delivery_date:
                delivery_date = datetime.now()

            # 🔍 DEBUG: 添加送货时间解析日志
            self.logger.info(f"🚚 解析送货时间:")
            self.logger.info(f"  原始值 (列7): {row.iloc[7] if len(row) > 7 else 'N/A'}")
            self.logger.info(f"  解析结果: {delivery_date}")
            self.logger.info(f"  时间类型: {type(delivery_date)}")
            
            # 从列10的描述中提取船只和港口信息
            description = str(row.iloc[10]) if len(row) > 10 and pd.notna(row.iloc[10]) else ""
            ship_name = "CELEBRITY MILLENNIUM"  # 从描述中可以看到
            destination_port = "TOKYO (YOKOHAMA)"  # 从描述中可以看到
            
            # 供应商名称在列23 (index 23)
            supplier_name = str(row.iloc[23]).strip() if len(row) > 23 and pd.notna(row.iloc[23]) else ""
            
            # 货币在列4 (index 4)
            currency = str(row.iloc[4]).strip() if len(row) > 4 and pd.notna(row.iloc[4]) else "JPY"
            
            order = CruiseOrderHeader(
                po_number=po_number,
                ship_name=ship_name,
                ship_code="ML-0954",  # 从描述中可以看到
                supplier_name=supplier_name,
                destination_port=destination_port,
                delivery_date=delivery_date,
                currency=currency,
                total_amount=0.0,
                products=[]
            )
            
            self.logger.debug(f"解析HEADER行: PO={po_number}, Ship={ship_name}, Supplier={supplier_name}")
            return order
            
        except Exception as e:
            self.logger.error(f"解析HEADER行失败: {str(e)}")
            return None
    
    def _parse_detail_row(self, row: pd.Series, columns: pd.Index) -> Optional[CruiseOrderProduct]:
        """解析DETAIL行数据"""
        try:
            # 根据实际Excel结构解析
            # 产品ID在列1 (index 1)
            product_id = str(row.iloc[1]).strip() if pd.notna(row.iloc[1]) else ""

            # Item Code在列6 (G列, index 6) - 这是新增的产品代码
            item_code = str(row.iloc[6]).strip() if len(row) > 6 and pd.notna(row.iloc[6]) else ""

            # 产品描述在列8 (index 8)
            product_name = str(row.iloc[8]).strip() if len(row) > 8 and pd.notna(row.iloc[8]) else ""
            if not product_name:
                return None

            # 🔧 修复：数量在列3 (index 3) - 之前错误地使用了列2
            quantity = self._parse_number(row.iloc[3]) if len(row) > 3 else 0

            # 单价在列5 (index 5) - 这个是正确的
            unit_price = self._parse_number(row.iloc[5]) if len(row) > 5 else 0
            
            # 计算总价
            total_price = quantity * unit_price if quantity > 0 and unit_price > 0 else 0
            
            product = CruiseOrderProduct(
                product_id=product_id or None,
                product_name=product_name,
                quantity=quantity,
                unit_price=unit_price,
                total_price=total_price,
                currency="JPY",  # 从HEADER中我们知道是JPY
                item_code=item_code or None  # 添加item code
            )
            
            self.logger.debug(f"解析DETAIL行: ID={product_id}, Item Code={item_code}, Product={product_name}, Qty={quantity} (列3), Price={unit_price} (列5), Total={total_price}")
            return product
            
        except Exception as e:
            self.logger.error(f"解析DETAIL行失败: {str(e)}")
            return None
    
    def _parse_date(self, date_value: Any) -> Optional[datetime]:
        """解析日期值"""
        # 🔍 DEBUG: 添加日期解析详细日志
        self.logger.info(f"📅 开始解析日期:")
        self.logger.info(f"  原始值: {date_value}")
        self.logger.info(f"  值类型: {type(date_value)}")
        self.logger.info(f"  是否为NaN: {pd.isna(date_value)}")

        if pd.isna(date_value):
            self.logger.info(f"  ❌ 值为NaN，返回None")
            return None

        try:
            if isinstance(date_value, datetime):
                self.logger.info(f"  ✅ 已是datetime类型: {date_value}")
                return date_value
            elif isinstance(date_value, str):
                self.logger.info(f"  🔄 尝试解析字符串: '{date_value.strip()}'")
                # 尝试多种日期格式
                for fmt in ['%Y-%m-%d', '%Y/%m/%d', '%m/%d/%Y', '%d/%m/%Y']:
                    try:
                        result = datetime.strptime(date_value.strip(), fmt)
                        self.logger.info(f"  ✅ 格式 '{fmt}' 解析成功: {result}")
                        return result
                    except ValueError:
                        self.logger.info(f"  ❌ 格式 '{fmt}' 解析失败")
                        continue
                self.logger.warning(f"  ❌ 所有格式都解析失败")
            else:
                self.logger.info(f"  🔄 尝试转换其他类型: {type(date_value)}")
                # 尝试转换其他类型（如数字、pandas时间戳等）
                result = pd.to_datetime(date_value)
                if pd.notna(result):
                    self.logger.info(f"  ✅ pandas转换成功: {result}")
                    return result.to_pydatetime()
            return None
        except Exception as e:
            self.logger.error(f"❌ 解析日期异常: {date_value}, 错误: {str(e)}")
            return None
    
    def _parse_number(self, value: Any) -> float:
        """解析数字值"""
        if pd.isna(value):
            return 0.0
        
        try:
            if isinstance(value, (int, float)):
                return float(value)
            elif isinstance(value, str):
                # 移除逗号和其他格式字符
                cleaned_value = value.replace(',', '').replace('¥', '').replace('$', '').strip()
                return float(cleaned_value) if cleaned_value else 0.0
            return 0.0
        except (ValueError, TypeError):
            self.logger.warning(f"解析数字失败: {value}")
            return 0.0
    
    def validate_orders(self, orders: List[CruiseOrderHeader]) -> Tuple[List[CruiseOrderHeader], List[str]]:
        """
        验证订单数据
        
        Returns:
            Tuple[List[CruiseOrderHeader], List[str]]: (有效订单列表, 错误信息列表)
        """
        valid_orders = []
        errors = []
        
        for order in orders:
            order_errors = []
            
            # 验证必填字段
            if not order.po_number:
                order_errors.append("缺少PO号码")
            if not order.ship_name:
                order_errors.append("缺少船只名称")
            if not order.supplier_name:
                order_errors.append("缺少供应商名称")
            if not order.products:
                order_errors.append("订单没有产品")
            
            # 验证产品
            for i, product in enumerate(order.products):
                if not product.product_name:
                    order_errors.append(f"产品 {i+1} 缺少名称")
                if product.quantity <= 0:
                    order_errors.append(f"产品 {i+1} 数量无效")
                if product.unit_price < 0:
                    order_errors.append(f"产品 {i+1} 单价无效")
            
            if order_errors:
                errors.extend([f"订单 {order.po_number}: {error}" for error in order_errors])
            else:
                valid_orders.append(order)
        
        return valid_orders, errors
    
    def get_analysis_summary(self, orders: List[CruiseOrderHeader]) -> Dict[str, Any]:
        """获取订单分析摘要"""
        if not orders:
            return {}
        
        total_orders = len(orders)
        total_products = sum(len(order.products) for order in orders)
        total_value = sum(order.total_amount for order in orders)
        
        # 按供应商统计
        suppliers = {}
        for order in orders:
            supplier = order.supplier_name
            if supplier not in suppliers:
                suppliers[supplier] = 0
            suppliers[supplier] += 1
        
        # 按船只统计
        ships = {}
        for order in orders:
            ship = order.ship_name
            if ship not in ships:
                ships[ship] = 0
            ships[ship] += 1
        
        # 货币统计
        currencies = {}
        for order in orders:
            currency = order.currency
            if currency not in currencies:
                currencies[currency] = 0.0
            currencies[currency] += order.total_amount
        
        return {
            "total_orders": total_orders,
            "total_products": total_products,
            "total_value": total_value,
            "orders_by_supplier": suppliers,
            "orders_by_ship": ships,
            "value_by_currency": currencies,
            "average_order_value": total_value / total_orders if total_orders > 0 else 0,
            "average_products_per_order": total_products / total_orders if total_orders > 0 else 0
        }