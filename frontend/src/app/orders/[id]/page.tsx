'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { getApiUrl, API_ENDPOINTS } from '@/lib/api-config';

interface OrderItem {
  id: number;
  product_id?: number;
  supplier_id?: number;
  quantity: string;
  price: string;
  total: string;
  status: string;
  order_id: number;
  product?: {
    name: string;
    code: string;
  };
  supplier?: {
    name: string;
  };
  order?: {
    order_no: string;
    ship?: {
      name: string;
    };
  };
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

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());

  const fetchOrder = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`api/v1/orders/${params.id}`);
      if (!response.ok) {
        throw new Error('获取订单详情失败');
      }
      const data = await response.json();
      console.log('获取到的订单数据:', data);
      console.log('订单项目数量:', data.order_items ? data.order_items.length : 0);
      if (data.order_items) {
        data.order_items.forEach((item: OrderItem, index: number) => {
          console.log(`订单项目 #${index+1}:`, item);
        });
      }
      setOrder(data);
    } catch (error) {
      console.error('Error fetching order:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();
  }, [params.id]);

  const handleDelete = async () => {
    if (!confirm('确定要删除此订单吗？')) {
      return;
    }

    try {
      const response = await fetch(`api/v1/orders/${params.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('删除订单失败');
      }

      router.push('/orders');
    } catch (error) {
      console.error('Error deleting order:', error);
      alert('删除订单失败');
    }
  };

  const handleToggleItem = (itemId: number) => {
    const newSelectedItems = new Set(selectedItems);
    if (selectedItems.has(itemId)) {
      newSelectedItems.delete(itemId);
    } else {
      newSelectedItems.add(itemId);
    }
    setSelectedItems(newSelectedItems);
  };

  const handleToggleAll = () => {
    if (!order?.order_items) return;
    
    if (selectedItems.size === order.order_items.length) {
      // 如果全部选中,则取消全选
      setSelectedItems(new Set());
    } else {
      // 否则全选
      const allItemIds = new Set(order.order_items.map(item => item.id));
      setSelectedItems(allItemIds);
    }
  };

  const handleAddToProcessing = async () => {
    if (selectedItems.size === 0 || !order) {
      alert('请先选择要处理的订单项目');
      return;
    }

    setIsLoading(true);
    try {
      const itemIds = Array.from(selectedItems);
      // 获取认证令牌
      const token = localStorage.getItem('token');
      
      // 调试：打印token和请求数据
      console.log('Debug - Token:', token ? 'Token exists' : 'No token');
      console.log('Debug - itemIds:', itemIds);
      console.log('Debug - JSON body:', JSON.stringify(itemIds));
      
      const response = await fetch(getApiUrl(API_ENDPOINTS.ORDER_PROCESSING), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` // 添加认证头
        },
        body: JSON.stringify(itemIds), // 直接发送数组，不要包装在对象中
        // 由于已经手动添加了认证头，可以移除credentials，避免重复认证
        // credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || '添加到处理队列失败');
      }

      const result = await response.json();
      alert(`成功添加 ${result.length} 个项目到待处理列表`);
      
      // 清空选择
      setSelectedItems(new Set());
    } catch (error: any) {
      console.error('添加到处理队列失败:', error);
      alert('添加到处理队列失败: ' + (error.message || '未知错误'));
    } finally {
      setIsLoading(false);
    }
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
          <Link href="/orders">
            <Button variant="outline" size="sm">
              <ArrowLeftIcon className="h-4 w-4 mr-2" />
              返回
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">订单详情</h1>
        </div>
        <div className="flex space-x-4">
          <Button
            onClick={handleAddToProcessing}
            disabled={selectedItems.size === 0}
          >
            加入待处理 ({selectedItems.size})
          </Button>
          <Button variant="destructive" onClick={handleDelete}>
            删除订单
          </Button>
        </div>
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
                      {parseFloat(item.quantity).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      ¥{parseFloat(item.price).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      ¥{parseFloat(item.total).toFixed(2)}
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