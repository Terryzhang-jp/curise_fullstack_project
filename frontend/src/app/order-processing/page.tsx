'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface PendingOrder {
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

export default function OrderProcessingPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<PendingOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [removing, setRemoving] = useState<number | null>(null);

  const loadOrders = () => {
    try {
      setLoading(true);
      setError(null);
      const items = localStorage.getItem('processingItems');
      if (items) {
        setOrders(JSON.parse(items));
      } else {
        setOrders([]);
      }
    } catch (error) {
      setError('加载待处理项目失败');
      console.error('Error loading processing items:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const handleProcess = async (itemId: number) => {
    try {
      setProcessing(true);
      setError(null);
      const response = await fetch(`http://localhost:8000/api/v1/orders/items/${itemId}/process`, {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error('处理订单失败');
      }
      
      // 从本地存储中移除已处理的项目
      const updatedOrders = orders.filter(order => order.id !== itemId);
      localStorage.setItem('processingItems', JSON.stringify(updatedOrders));
      setOrders(updatedOrders);
    } catch (error) {
      setError(error instanceof Error ? error.message : '处理订单失败');
    } finally {
      setProcessing(false);
    }
  };

  const handleRemove = (itemId: number) => {
    if (!confirm('确定要从待处理列表中移除这个项目吗？')) {
      return;
    }

    try {
      setRemoving(itemId);
      // 从本地存储中移除项目
      const updatedOrders = orders.filter(order => order.id !== itemId);
      localStorage.setItem('processingItems', JSON.stringify(updatedOrders));
      setOrders(updatedOrders);
    } catch (error) {
      setError('移除项目失败');
    } finally {
      setRemoving(null);
    }
  };

  const handleClearAll = () => {
    if (!confirm('确定要清空待处理列表吗？')) {
      return;
    }

    try {
      localStorage.removeItem('processingItems');
      setOrders([]);
    } catch (error) {
      setError('清空列表失败');
    }
  };

  const handleNext = () => {
    if (orders.length === 0) {
      alert('请先添加待处理订单项目');
      return;
    }
    router.push('/order-category-processing');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>待处理订单</CardTitle>
            <div className="flex space-x-4">
              {orders.length > 0 && (
                <>
                  <Button
                    variant="destructive"
                    onClick={handleClearAll}
                  >
                    清空列表
                  </Button>
                  <Button
                    variant="default"
                    onClick={handleNext}
                  >
                    下一步
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase">订单编号</th>
                  <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase">船舶</th>
                  <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase">产品</th>
                  <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase">产品代码</th>
                  <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase">供应商</th>
                  <th className="px-6 py-3 bg-gray-50 text-right text-xs font-medium text-gray-500 uppercase">数量</th>
                  <th className="px-6 py-3 bg-gray-50 text-right text-xs font-medium text-gray-500 uppercase">单价</th>
                  <th className="px-6 py-3 bg-gray-50 text-right text-xs font-medium text-gray-500 uppercase">总价</th>
                  <th className="px-6 py-3 bg-gray-50 text-center text-xs font-medium text-gray-500 uppercase">操作</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {order.order?.order_no}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {order.order?.ship?.name || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {order.product?.name || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {order.product?.code || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {order.supplier?.name || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {parseFloat(order.quantity).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      ¥{parseFloat(order.price).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      ¥{parseFloat(order.total).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <Button
                          onClick={() => handleProcess(order.id)}
                          disabled={processing}
                        >
                          {processing ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              处理中
                            </>
                          ) : (
                            '处理'
                          )}
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={() => handleRemove(order.id)}
                          disabled={removing === order.id}
                        >
                          {removing === order.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {orders.length === 0 && (
              <p className="text-center text-gray-500 py-4">暂无待处理订单</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 