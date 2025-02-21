'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

interface OrderItem {
  id: number;
  product_code: string;
  quantity: number;
  unit: string;
  unit_price: string | number;
  description: string;
}

interface Order {
  id: number;
  order_no: string;
  order_date: string;
  currency: string;
  ship_code: string;
  delivery_date: string;
  notes: string | null;
  items: OrderItem[];
  status: string;
}

interface UploadRecord {
  id: number;
  file_name: string;
  country: {
    name: string;
  };
  ship: {
    name: string;
  };
  upload_date: string;
  status: string;
  error_message: string | null;
  orders: Order[];
}

export default function UploadDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const [record, setRecord] = useState<UploadRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrders, setSelectedOrders] = useState<Set<number>>(new Set());
  const [confirmingOrders, setConfirmingOrders] = useState(false);
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<Order | null>(null);

  useEffect(() => {
    fetchUploadRecord();
  }, [id]);

  const fetchUploadRecord = async () => {
    try {
      const response = await fetch(`http://localhost:8000/api/v1/orders/upload/${id}`);
      if (!response.ok) {
        throw new Error('获取上传记录失败');
      }
      const data = await response.json();
      setRecord(data);
    } catch (error) {
      console.error('Error fetching upload record:', error);
      setError(error instanceof Error ? error.message : '获取数据失败');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleOrder = (orderId: number) => {
    const newSelected = new Set(selectedOrders);
    if (newSelected.has(orderId)) {
      newSelected.delete(orderId);
    } else {
      newSelected.add(orderId);
    }
    setSelectedOrders(newSelected);
  };

  const handleToggleAll = () => {
    if (!record) return;
    
    if (selectedOrders.size === record.orders.length) {
      setSelectedOrders(new Set());
    } else {
      setSelectedOrders(new Set(record.orders.map(order => order.id)));
    }
  };

  const handleConfirmSelected = async () => {
    if (selectedOrders.size === 0) {
      alert('请选择要确认的订单');
      return;
    }

    setConfirmingOrders(true);
    const orderIds = Array.from(selectedOrders);
    let hasError = false;

    for (const orderId of orderIds) {
      try {
        const response = await fetch(`http://localhost:8000/api/v1/orders/confirm/${orderId}`, {
          method: 'POST',
        });
        if (!response.ok) {
          throw new Error(`确认订单 ${orderId} 失败`);
        }
        // 从选中列表中移除已确认的订单
        setSelectedOrders(prev => {
          const newSelected = new Set(prev);
          newSelected.delete(orderId);
          return newSelected;
        });
      } catch (error) {
        console.error('Error confirming order:', error);
        hasError = true;
      }
    }

    // 刷新数据
    await fetchUploadRecord();
    setConfirmingOrders(false);

    // 如果所有订单都已确认，跳转到主页面
    if (!hasError && record && record.orders.length === orderIds.length) {
      router.push('/');
    }
  };

  if (isLoading) {
    return <div className="text-center">加载中...</div>;
  }

  if (error) {
    return <div className="text-center text-red-500">{error}</div>;
  }

  if (!record) {
    return <div className="text-center">未找到记录</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/order-upload">
            <Button variant="outline" size="sm">
              <ArrowLeftIcon className="h-4 w-4 mr-2" />
              返回
            </Button>
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">上传详情</h1>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <div className="grid grid-cols-2 gap-6">
          <div>
            <p className="text-sm text-gray-500">文件名</p>
            <p className="mt-1">{record.file_name}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">上传日期</p>
            <p className="mt-1">{new Date(record.upload_date).toLocaleString('zh-CN')}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">船舶</p>
            <p className="mt-1">{record.ship.name}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">国家</p>
            <p className="mt-1">{record.country.name}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">状态</p>
            <p className="mt-1">{record.status}</p>
          </div>
          {record.error_message && (
            <div className="col-span-2">
              <p className="text-sm text-red-500">错误信息</p>
              <p className="mt-1 text-red-500">{record.error_message}</p>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">订单列表</h2>
          <Button
            onClick={handleConfirmSelected}
            disabled={selectedOrders.size === 0 || confirmingOrders}
          >
            {confirmingOrders ? '确认中...' : '确认选中订单'}
          </Button>
        </div>

        {record.orders && record.orders.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <input
                      type="checkbox"
                      checked={record.orders.length > 0 && selectedOrders.size === record.orders.length}
                      onChange={handleToggleAll}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    订单编号
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    订单日期
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    交付日期
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    状态
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {record.orders.map((order) => (
                  <tr key={order.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedOrders.has(order.id)}
                        onChange={() => handleToggleOrder(order.id)}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {order.order_no}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(order.order_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(order.delivery_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {order.status}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedOrderDetails(order)}
                      >
                        查看详情
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-center text-gray-500 py-4">暂无订单</p>
        )}
      </div>

      {selectedOrderDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">订单详情</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedOrderDetails(null)}
              >
                关闭
              </Button>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <p className="text-sm text-gray-500">订单编号</p>
                <p className="font-medium">{selectedOrderDetails.order_no}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">订单日期</p>
                <p className="font-medium">
                  {new Date(selectedOrderDetails.order_date).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">交付日期</p>
                <p className="font-medium">
                  {new Date(selectedOrderDetails.delivery_date).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">状态</p>
                <p className="font-medium">{selectedOrderDetails.status}</p>
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-bold mb-4">订单项目</h4>
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">产品编号</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">数量</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">单位</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">单价</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">描述</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {selectedOrderDetails.items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-2 text-sm">{item.product_code}</td>
                      <td className="px-4 py-2 text-sm">{item.quantity}</td>
                      <td className="px-4 py-2 text-sm">{item.unit}</td>
                      <td className="px-4 py-2 text-sm">{item.unit_price}</td>
                      <td className="px-4 py-2 text-sm">{item.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 