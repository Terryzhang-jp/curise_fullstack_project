import pandas as pd
from io import BytesIO
from typing import List
from app.models.models import OrderItem

def create_order_items_excel(order_items: List[OrderItem]) -> bytes:
    """
    将订单项目信息转换为Excel文件
    """
    # 准备数据
    data = []
    for item in order_items:
        data.append({
            '订单编号': item.order.order_no if item.order else '',
            '船舶': item.order.ship.name if item.order and item.order.ship else '',
            '产品名称': item.product.name if item.product else '',
            '产品代码': item.product.code if item.product else '',
            '数量': float(item.quantity),
            '单价': float(item.price),
            '总价': float(item.total),
            '状态': item.status,
            '创建时间': item.created_at.strftime('%Y-%m-%d %H:%M:%S'),
        })

    # 创建DataFrame
    df = pd.DataFrame(data)

    # 将DataFrame转换为Excel
    excel_buffer = BytesIO()
    with pd.ExcelWriter(excel_buffer, engine='xlsxwriter') as writer:
        df.to_excel(writer, sheet_name='订单项目', index=False)
        
        # 获取工作表对象
        worksheet = writer.sheets['订单项目']
        
        # 设置列宽
        for idx, col in enumerate(df.columns):
            max_length = max(
                df[col].astype(str).apply(len).max(),
                len(col)
            )
            worksheet.set_column(idx, idx, max_length + 2)

    # 获取Excel文件的二进制内容
    excel_buffer.seek(0)
    return excel_buffer.getvalue() 