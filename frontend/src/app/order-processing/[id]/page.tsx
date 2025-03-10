'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { getApiUrl, API_ENDPOINTS } from '@/lib/api-config';

interface OrderItem {
  id: number;
  product_id: number;
  supplier_id: number;
  quantity: number;
  price: number;
  total: number;
  status: string;
  product?: {
    name: string;
    code: string;
  };
  supplier?: {
    name: string;
  };
  selected?: boolean;
}

interface Order {
  id: number;
  order_no: string;
  ship_id: number;
  company_id: number;
  port_id: number;
  order_date: string;
  delivery_date: string;
  status: string;
  total_amount: number;
  notes: string;
  created_at: string;
  updated_at: string;
  ship?: {
    name: string;
  };
  company?: {
    name: string;
  };
  port?: {
    name: string;
  };
  order_items?: OrderItem[];
}

export default function OrderProcessingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  const fetchOrder = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`api/v1/orders/${params.id}`);
      if (!response.ok) {
        throw new Error('获取订单详情失败');
      }
      const data = await response.json();
      setOrder(data);
    } catch (error) {
      console.error('Error fetching order:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();
    // 从localStorage加载已选择的项目
    const processingItems = localStorage.getItem('processingItems');
    if (processingItems) {
      const items = JSON.parse(processingItems);
      setSelectedItems(new Set(items.map((item: OrderItem) => item.id)));
    }
  }, [params.id]);

  const handleToggleItem = (itemId: number) => {
    const newSelectedItems = new Set(selectedItems);
    if (selectedItems.has(itemId)) {
      newSelectedItems.delete(itemId);
    } else {
      newSelectedItems.add(itemId);
    }
    setSelectedItems(newSelectedItems);

    // 更新localStorage
    const processingItems = order?.order_items?.filter(item => newSelectedItems.has(item.id)) || [];
    localStorage.setItem('processingItems', JSON.stringify(processingItems));
  };

  const handleToggleAll = () => {
    if (!order?.order_items) return;
    
    if (selectedItems.size === order.order_items.length) {
      // 如果全部选中,则取消全选
      setSelectedItems(new Set());
      localStorage.setItem('processingItems', JSON.stringify([]));
    } else {
      // 否则全选
      const allItemIds = new Set(order.order_items.map(item => item.id));
      setSelectedItems(allItemIds);
      localStorage.setItem('processingItems', JSON.stringify(order.order_items));
    }
  };

  const handleProcessSelected = () => {
    if (selectedItems.size === 0) {
      alert('请先选择要处理的订单项目');
      return;
    }
    router.push('/order-processing/process');
  };

  if (isLoading) {
    return <div className="text-center py-8">加载中...</div>;
  }

  if (!order) {
    return <div className="text-center py-8">未找到订单</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/order-processing">
            <Button variant="outline" size="sm">
              <ArrowLeftIcon className="h-4 w-4 mr-2" />
              返回
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">订单详情</h1>
        </div>
        <Button
          onClick={handleProcessSelected}
          disabled={selectedItems.size === 0}
        >
          处理选中项目 ({selectedItems.size})
        </Button>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500">订单编号</p>
            <p className="font-medium">{order.order_no}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">状态</p>
            <p className="font-medium">{order.status}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">船舶</p>
            <p className="font-medium">{order.ship?.name || '未指定'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">公司</p>
            <p className="font-medium">{order.company?.name || '未指定'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">港口</p>
            <p className="font-medium">{order.port?.name || '未指定'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">总金额</p>
            <p className="font-medium">¥{order.total_amount.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">订单日期</p>
            <p className="font-medium">{new Date(order.order_date).toLocaleDateString()}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">交付日期</p>
            <p className="font-medium">{new Date(order.delivery_date).toLocaleDateString()}</p>
          </div>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">订单项目</h2>
          <Button variant="outline" onClick={handleToggleAll}>
            {selectedItems.size === order.order_items?.length ? '取消全选' : '全选'}
          </Button>
        </div>
        
        {order.order_items && order.order_items.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    选择
                  </th>
                  <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    产品
                  </th>
                  <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    产品编号
                  </th>
                  <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    供应商
                  </th>
                  <th className="px-6 py-3 bg-gray-50 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    数量
                  </th>
                  <th className="px-6 py-3 bg-gray-50 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    单价
                  </th>
                  <th className="px-6 py-3 bg-gray-50 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    总价
                  </th>
                  <th className="px-6 py-3 bg-gray-50 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    状态
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {order.order_items.map((item) => (
                  <tr 
                    key={item.id}
                    className={selectedItems.has(item.id) ? 'bg-blue-50' : ''}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedItems.has(item.id)}
                        onChange={() => handleToggleItem(item.id)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.product?.name || `产品 ID: ${item.product_id}`}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.product?.code || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.supplier?.name || `供应商 ID: ${item.supplier_id}`}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {item.quantity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      ¥{item.price.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      ¥{item.total.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                      {item.status}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-center text-gray-500 py-4">暂无订单项目</p>
        )}
      </div>
    </div>
  );
} 