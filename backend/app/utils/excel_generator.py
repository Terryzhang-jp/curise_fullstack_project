from typing import List, Dict, Any
import pandas as pd
from datetime import datetime
from decimal import Decimal

class ExcelGenerator:
    @staticmethod
    def generate_supplier_order(
        supplier_name: str,
        order_items: List[Dict[str, Any]],
        ship_name: str,
        delivery_date: datetime
    ) -> str:
        """生成供应商订单Excel文件"""
        # 创建数据框
        df = pd.DataFrame(order_items)
        
        # 重命名列
        df = df.rename(columns={
            'product_code': '产品代码',
            'product_name': '产品名称',
            'category_name': '类别',
            'quantity': '数量',
            'unit': '单位',
            'unit_price': '单价',
            'total_price': '总价',
            'description': '描述'
        })
        
        # 格式化数字
        df['单价'] = df['单价'].apply(lambda x: f'¥{float(x):.2f}')
        df['总价'] = df['总价'].apply(lambda x: f'¥{float(x):.2f}')
        
        # 计算总计
        total = sum(float(str(x).replace('¥', '')) for x in df['总价'])
        
        # 创建Excel写入器
        current_time = datetime.now().strftime('%Y%m%d_%H%M%S')
        file_name = f"orders/{supplier_name}_{current_time}.xlsx"
        writer = pd.ExcelWriter(file_name, engine='xlsxwriter')
        
        # 写入数据
        df.to_excel(writer, sheet_name='订单明细', index=False, startrow=2)
        
        # 获取工作簿和工作表
        workbook = writer.book
        worksheet = writer.sheets['订单明细']
        
        # 定义格式
        header_format = workbook.add_format({
            'bold': True,
            'text_wrap': True,
            'valign': 'top',
            'align': 'center',
            'bg_color': '#D9E1F2',
            'border': 1
        })
        
        cell_format = workbook.add_format({
            'text_wrap': True,
            'valign': 'top',
            'border': 1
        })
        
        # 写入标题信息
        worksheet.write(0, 0, f'供应商: {supplier_name}', workbook.add_format({'bold': True}))
        worksheet.write(0, 3, f'船舶: {ship_name}', workbook.add_format({'bold': True}))
        worksheet.write(1, 0, f'交货日期: {delivery_date.strftime("%Y-%m-%d")}', workbook.add_format({'bold': True}))
        
        # 设置列宽
        worksheet.set_column('A:A', 15)  # 产品代码
        worksheet.set_column('B:B', 30)  # 产品名称
        worksheet.set_column('C:C', 15)  # 类别
        worksheet.set_column('D:D', 10)  # 数量
        worksheet.set_column('E:E', 10)  # 单位
        worksheet.set_column('F:F', 12)  # 单价
        worksheet.set_column('G:G', 12)  # 总价
        worksheet.set_column('H:H', 30)  # 描述
        
        # 写入表头格式
        for col_num, value in enumerate(df.columns.values):
            worksheet.write(2, col_num, value, header_format)
        
        # 写入数据格式
        for row_num in range(len(df)):
            for col_num in range(len(df.columns)):
                worksheet.write(row_num + 3, col_num, df.iloc[row_num, col_num], cell_format)
        
        # 写入总计
        total_row = len(df) + 3
        worksheet.write(total_row, 5, '总计:', workbook.add_format({'bold': True}))
        worksheet.write(total_row, 6, f'¥{total:.2f}', workbook.add_format({'bold': True}))
        
        # 保存文件
        writer.close()
        
        return file_name 