'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';

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
    category?: {
      id: number;
      name: string;
    };
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

interface CategoryGroup {
  categoryId: number;
  categoryName: string;
  items: PendingOrder[];
  totalQuantity: number;
  totalAmount: number;
}

interface ProductCategoryInfo {
  product_id: number;
  product_name: string;
  product_code: string;
  category: {
    id: number;
    name: string;
  };
  supplier?: {
    name: string;
  };
}

export default function OrderCategoryProcessingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categoryGroups, setCategoryGroups] = useState<CategoryGroup[]>([]);

  useEffect(() => {
    loadAndProcessOrders();
  }, []);

  const loadAndProcessOrders = async () => {
    try {
      setLoading(true);
      setError(null);

      // 从localStorage加载待处理订单
      const items = localStorage.getItem('processingItems');
      if (!items) {
        router.push('/order-processing');
        return;
      }

      const orders: PendingOrder[] = JSON.parse(items);
      if (orders.length === 0) {
        router.push('/order-processing');
        return;
      }

      // 获取产品分类信息
      const productIds = orders.map(order => order.product_id).filter((id): id is number => id !== undefined);
      
      // 构建查询参数
      const queryParams = new URLSearchParams();
      productIds.forEach(id => queryParams.append('product_ids', id.toString()));
      
      console.log('Request URL:', `http://localhost:8000/api/v1/products/categories/by-ids?${queryParams.toString()}`);
      
      const response = await fetch(`http://localhost:8000/api/v1/products/categories/by-ids?${queryParams.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error:', errorText);
        throw new Error('获取产品分类信息失败');
      }

      const categoryData = await response.json();
      console.log('获取到的分类数据:', categoryData);

      // 创建产品ID到分类信息的映射
      const productCategoryMap = new Map<number, ProductCategoryInfo>(
        categoryData.map((item: ProductCategoryInfo) => [item.product_id, item])
      );

      // 按分类组织订单项目
      const groupedOrders = new Map<number, CategoryGroup>();

      orders.forEach(order => {
        // 从映射中获取产品的分类信息
        const productInfo = productCategoryMap.get(order.product_id || 0);
        const categoryId = productInfo?.category?.id || 0;
        const categoryName = productInfo?.category?.name || '未分类';
        
        console.log('处理订单项:', {
          订单ID: order.id,
          产品ID: order.product_id,
          分类信息: productInfo,
          最终分类ID: categoryId,
          最终分类名称: categoryName
        });
        
        if (!groupedOrders.has(categoryId)) {
          groupedOrders.set(categoryId, {
            categoryId,
            categoryName,
            items: [],
            totalQuantity: 0,
            totalAmount: 0,
          });
        }

        const group = groupedOrders.get(categoryId)!;
        
        // 使用API返回的产品信息更新订单项
        const updatedOrder: PendingOrder = {
          ...order,
          product: {
            ...order.product,
            name: productInfo?.product_name || order.product?.name || '',
            code: productInfo?.product_code || order.product?.code || '',
            category: {
              id: categoryId,
              name: categoryName
            }
          },
          supplier: {
            ...order.supplier,
            name: productInfo?.supplier?.name || order.supplier?.name || ''
          }
        };
        
        group.items.push(updatedOrder);
        group.totalQuantity += parseFloat(order.quantity) || 0;
        group.totalAmount += parseFloat(order.total) || 0;
      });

      console.log('分组后的订单:', Array.from(groupedOrders.values()));
      setCategoryGroups(Array.from(groupedOrders.values()));
    } catch (error) {
      console.error('处理订单时出错:', error);
      setError(error instanceof Error ? error.message : '加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    router.push('/order-processing');
  };

  // 添加状态处理函数
  const getStatusDisplay = (status: string) => {
    const statusMap: Record<string, { text: string; className: string }> = {
      pending: { text: '待处理', className: 'bg-yellow-100 text-yellow-800' },
      processing: { text: '处理中', className: 'bg-blue-100 text-blue-800' },
      assigned: { text: '已分配', className: 'bg-purple-100 text-purple-800' },
      completed: { text: '已完成', className: 'bg-green-100 text-green-800' },
      failed: { text: '处理失败', className: 'bg-red-100 text-red-800' }
    };
    return statusMap[status] || { text: status, className: 'bg-gray-100 text-gray-800' };
  };

  const handleStatusChange = async (itemId: number, newStatus: string) => {
    try {
      const response = await fetch(`http://localhost:8000/api/v1/orders/items/${itemId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error('更新状态失败');
      }

      // 更新localStorage中的数据
      const items = localStorage.getItem('processingItems');
      if (items) {
        const processingItems: PendingOrder[] = JSON.parse(items);
        const updatedItems = processingItems.map(item => 
          item.id === itemId ? { ...item, status: newStatus } : item
        );
        localStorage.setItem('processingItems', JSON.stringify(updatedItems));
      }

      // 重新加载订单数据
      loadAndProcessOrders();
    } catch (error) {
      console.error('更新状态失败:', error);
      alert('更新状态失败');
    }
  };

  const handleSupplierMatching = () => {
    router.push('/order-supplier-matching');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">订单分类处理</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleBack}>
            返回
          </Button>
          <Button onClick={handleSupplierMatching}>
            供应商匹配
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {categoryGroups.map((group) => (
        <Card key={group.categoryId}>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>{group.categoryName}</CardTitle>
              <div className="text-sm text-gray-500">
                总数量: {group.totalQuantity.toFixed(2)} | 
                总金额: ¥{group.totalAmount.toFixed(2)}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase">订单编号</th>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase">产品</th>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase">产品代码</th>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase">供应商</th>
                    <th className="px-6 py-3 bg-gray-50 text-right text-xs font-medium text-gray-500 uppercase">数量</th>
                    <th className="px-6 py-3 bg-gray-50 text-right text-xs font-medium text-gray-500 uppercase">单价</th>
                    <th className="px-6 py-3 bg-gray-50 text-right text-xs font-medium text-gray-500 uppercase">总价</th>
                    <th className="px-6 py-3 bg-gray-50 text-center text-xs font-medium text-gray-500 uppercase">状态</th>
                    <th className="px-6 py-3 bg-gray-50 text-center text-xs font-medium text-gray-500 uppercase">操作</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {group.items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.order?.order_no}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.product?.name || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.product?.code || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.supplier?.name || '-'}
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
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                        <span className={`px-2 py-1 rounded-full ${getStatusDisplay(item.status).className}`}>
                          {getStatusDisplay(item.status).text}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                        <div className="flex justify-center space-x-2">
                          {item.status === 'pending' && (
                            <Button
                              size="sm"
                              onClick={() => handleStatusChange(item.id, 'processing')}
                            >
                              开始处理
                            </Button>
                          )}
                          {item.status === 'processing' && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => handleSupplierMatching()}
                              >
                                分配供应商
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleStatusChange(item.id, 'failed')}
                              >
                                处理失败
                              </Button>
                            </>
                          )}
                          {item.status === 'assigned' && (
                            <Button
                              size="sm"
                              onClick={() => handleStatusChange(item.id, 'completed')}
                            >
                              完成处理
                            </Button>
                          )}
                          {(item.status === 'failed' || item.status === 'completed') && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleStatusChange(item.id, 'pending')}
                            >
                              重新处理
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
} 