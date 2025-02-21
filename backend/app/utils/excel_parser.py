from typing import List, Dict, Any
import pandas as pd
from datetime import datetime
from decimal import Decimal

class OrderParser:
    def __init__(self, file_path: str):
        self.file_path = file_path
        
    def parse(self) -> List[Dict[str, Any]]:
        """解析Excel文件并返回订单列表"""
        try:
            # 读取Excel文件
            df = pd.read_excel(self.file_path, header=None)
            print("Excel content:", df.head())  # 调试信息
            
            orders = []
            current_order = None
            
            # 遍历每一行
            for _, row in df.iterrows():
                # 获取记录类型（第一列）
                record_type = str(row[0]).strip().upper() if not pd.isna(row[0]) else ''
                print(f"Processing row type: {record_type}")  # 调试信息
                
                if record_type == 'HEADER':
                    # 如果已有当前订单，保存它
                    if current_order:
                        orders.append(current_order)
                    
                    # 创建新订单
                    current_order = {
                        'header': {
                            'order_no': str(row[1]) if not pd.isna(row[1]) else '',
                            'order_date': self._parse_date(row[3]),
                            'currency': str(row[4]) if not pd.isna(row[4]) else '',
                            'ship_code': str(row[5]) if not pd.isna(row[5]) else '',
                            'delivery_date': self._parse_date(row[7]),
                            'supplier_info': str(row[10]) if not pd.isna(row[10]) else '',
                            'notes': ''
                        },
                        'items': []
                    }
                    print(f"Created header: {current_order['header']}")  # 调试信息
                
                elif record_type == 'DETAIL' and current_order:
                    # 添加订单项
                    item = {
                        'product_code': str(row[6]) if not pd.isna(row[6]) else '',
                        'line_number': self._parse_decimal(row[2]),  # 行项目编号
                        'quantity': self._parse_decimal(row[3]),     # 实际数量
                        'unit': str(row[4]) if not pd.isna(row[4]) else '',
                        'unit_price': self._parse_decimal(row[5]),
                        'description': str(row[8]) if not pd.isna(row[8]) else ''
                    }
                    print(f"Created item: {item}")  # 调试信息
                    current_order['items'].append(item)
            
            # 添加最后一个订单
            if current_order:
                orders.append(current_order)
            
            if not orders:
                raise ValueError("Excel文件中没有找到有效的订单数据")
            
            print(f"Total orders parsed: {len(orders)}")  # 调试信息
            return orders
            
        except pd.errors.EmptyDataError:
            raise ValueError("Excel文件为空")
        except pd.errors.ParserError:
            raise ValueError("Excel文件格式错误")
        except Exception as e:
            print(f"Error parsing Excel: {str(e)}")  # 调试信息
            raise ValueError(f"解析Excel文件时出错: {str(e)}")
    
    def _parse_date(self, date_str: Any) -> datetime:
        """解析日期字符串"""
        try:
            if pd.isna(date_str):
                return datetime.now()
            
            if isinstance(date_str, datetime):
                return date_str
                
            if isinstance(date_str, str):
                # 尝试多种日期格式
                formats = [
                    '%Y-%m-%d',
                    '%d/%m/%Y',
                    '%m/%d/%Y',
                    '%Y/%m/%d',
                    '%Y-%m-%d %H:%M:%S'
                ]
                
                for fmt in formats:
                    try:
                        return datetime.strptime(str(date_str).strip(), fmt)
                    except ValueError:
                        continue
            
            # 如果所有格式都失败，尝试解析Excel日期数字
            return pd.to_datetime(date_str).to_pydatetime()
            
        except Exception as e:
            print(f"Error parsing date '{date_str}': {str(e)}")  # 调试信息
            return datetime.now()
    
    def _parse_decimal(self, value: Any) -> Decimal:
        """解析数字值"""
        try:
            if pd.isna(value):
                return Decimal('0')
            
            if isinstance(value, (int, float)):
                return Decimal(str(value))
            
            # 移除所有非数字字符（除了小数点和负号）
            clean_value = ''.join(c for c in str(value) if c.isdigit() or c in '.-')
            return Decimal(clean_value) if clean_value else Decimal('0')
            
        except Exception as e:
            print(f"Error parsing decimal '{value}': {str(e)}")  # 调试信息
            return Decimal('0') 