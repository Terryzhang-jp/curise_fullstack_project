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
  const [dbProducts, setDbProducts] = useState<Map<number, ProductCategoryInfo>>(new Map());

  useEffect(() => {
    loadAndProcessOrders();
  }, []);

  const loadAndProcessOrders = async () => {
    try {
      setLoading(true);
      setError(null);

      // 从API获取处理队列数据，而不是从localStorage
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:8000/api/v1/order-processing/items', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('获取处理队列数据失败');
      }

      const orders: PendingOrder[] = await response.json();
      
      if (orders.length === 0) {
        setError('没有待处理的订单项');
        setLoading(false);
        return;
      }

      // 获取产品分类信息
      const productIds = orders.map(order => order.product_id).filter((id): id is number => id !== undefined && id > 0);
      
      // 打印产品ID列表和订单项内容用于调试
      console.log('订单项原始内容:', orders);
      console.log('有效的产品ID列表:', productIds);
      
      // 检查是否有有效的产品ID
      if (productIds.length === 0) {
        console.error('没有有效的产品ID');
        setError('订单项中没有有效的产品ID，但您仍然可以查看订单数据');
        
        // 即使没有有效的产品ID，也继续处理订单数据，只是不从API获取分类信息
        const groupedOrders = new Map<number, CategoryGroup>();
        
        // 为所有订单创建一个"未分类"分组
        groupedOrders.set(0, {
          categoryId: 0,
          categoryName: '未分类',
          items: orders,
          totalQuantity: orders.reduce((sum, order) => sum + (parseFloat(order.quantity.toString()) || 0), 0),
          totalAmount: orders.reduce((sum, order) => sum + (parseFloat(order.total.toString()) || 0), 0)
        });
        
        setCategoryGroups(Array.from(groupedOrders.values()));
        setLoading(false);
        return;
      }
      
      // 构建查询参数
      const queryParams = new URLSearchParams();
      productIds.forEach(id => queryParams.append('product_ids', id.toString()));
      
      console.log('请求URL:', `http://localhost:8000/api/v1/products/categories/by-ids?${queryParams.toString()}`);
      console.log('产品ID列表:', productIds);
      
      const response2 = await fetch(`http://localhost:8000/api/v1/products/categories/by-ids?${queryParams.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
      });

      if (!response2.ok) {
        const errorText = await response2.text();
        console.error('API Error:', errorText);
        throw new Error('获取产品分类信息失败');
      }

      const categoryData = await response2.json();
      console.log('获取到的分类数据:', categoryData);

      // 创建产品ID到分类信息的映射
      const productCategoryMap = new Map<number, ProductCategoryInfo>(
        categoryData.map((item: ProductCategoryInfo) => [item.product_id, item])
      );
      
      // 保存数据库中的产品信息，用于左侧显示
      setDbProducts(productCategoryMap);

      // 按分类组织订单项目
      const groupedOrders = new Map<number, CategoryGroup>();

      orders.forEach(order => {
        // 从映射中获取产品的分类信息
        const productInfo = productCategoryMap.get(Number(order.product_id) || 0);
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
        group.totalQuantity += parseFloat(order.quantity.toString()) || 0;
        group.totalAmount += parseFloat(order.total.toString()) || 0;
      });

      console.log('分组后的订单:', Array.from(groupedOrders.values()));
      setCategoryGroups(Array.from(groupedOrders.values()));
    } catch (error) {
      console.error('处理订单时出错:', error);
      setError(error instanceof Error ? error.message : '加载数据失败');
      // 如果错误是因为没有数据或API调用失败，跳回订单处理页面
      setTimeout(() => {
        router.push('/order-processing');
      }, 3000); // 3秒后跳转，给用户时间看错误信息
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
      // 获取认证令牌
      const token = localStorage.getItem('token');
      
      const response = await fetch(`http://localhost:8000/api/v1/order-processing/items/${itemId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error('更新状态失败');
      }

      // 直接重新加载数据，不再依赖localStorage
      loadAndProcessOrders();
    } catch (error) {
      console.error('更新状态失败:', error);
      alert('更新状态失败');
    }
  };

  const handleSupplierMatching = () => {
    // 收集所有的订单项，确保包含完整的类别信息
    const allItems = [];
    
    for (const group of categoryGroups) {
      for (const item of group.items) {
        // 使用适当的类型转换，确保对象有所需的字段
        allItems.push({
          id: item.id,
          order_id: item.order_id,
          order: {
            order_no: item.order?.order_no || '',
            ship: item.order?.ship
          },
          product: {
            name: item.product?.name || '',
            code: item.product?.code || '',
            category: {
              id: group.categoryId,
              name: group.categoryName
            }
          },
          quantity: parseFloat(item.quantity || '0'),
          price: parseFloat(item.price || '0'),
          total: parseFloat(item.total || '0'),
          status: item.status
        });
      }
    }
    
    // 保存所有类别ID到localStorage
    const categoryIds = categoryGroups.map(group => group.categoryId);
    localStorage.setItem('availableCategoryIds', JSON.stringify(categoryIds));
    
    // 如果只有一个类别，直接选中该类别
    if (categoryIds.length === 1) {
      localStorage.setItem('selectedCategoryId', categoryIds[0].toString());
    }
    
    // 保存到localStorage
    console.log('保存处理队列项目到localStorage:', allItems);
    localStorage.setItem('processingItems', JSON.stringify(allItems));
    
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

      <Card>
        <CardHeader>
          <CardTitle>处理流程指南</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground mb-2">
            当前步骤：<span className="font-medium">产品分类（2/4）</span>
          </div>
          <ol className="list-decimal list-inside space-y-1 text-sm">
            <li className="text-gray-500">订单项选择与批量处理（已完成）</li>
            <li className="text-blue-600 font-medium">产品分类 - 按类别组织和查看产品（当前步骤）</li>
            <li>供应商匹配 - 为订单项选择合适的供应商</li>
            <li>邮件通知 - 向所选供应商发送邮件通知</li>
          </ol>
          <div className="mt-3 text-sm">
            此页面左侧显示数据库中的产品数据（如有），右侧显示当前订单数据，请比对并确认数据的准确性。
          </div>
        </CardContent>
      </Card>

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
            {group.items.map((item) => (
              <div key={item.id} className="mb-6 border rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-4 py-2 border-b font-medium">
                  订单编号: {item.order?.order_no || '-'} | 产品ID: {item.product_id || '-'}
                </div>
                <div className="grid grid-cols-2 divide-x">
                  {/* 左侧：数据库中的产品数据 */}
                  <div className="p-4">
                    <h3 className="font-semibold text-blue-600 mb-3">数据库中的产品信息</h3>
                    {item.product_id && dbProducts.has(item.product_id) ? (
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-1">
                          <div className="text-sm font-medium">产品ID:</div>
                          <div className="text-sm">{dbProducts.get(item.product_id)?.product_id || '-'}</div>
                          
                          <div className="text-sm font-medium">产品名称:</div>
                          <div className="text-sm">{dbProducts.get(item.product_id)?.product_name || '-'}</div>
                          
                          <div className="text-sm font-medium">产品代码:</div>
                          <div className="text-sm">{dbProducts.get(item.product_id)?.product_code || '-'}</div>
                          
                          <div className="text-sm font-medium">产品类别:</div>
                          <div className="text-sm">{dbProducts.get(item.product_id)?.category?.name || '-'}</div>
                          
                          <div className="text-sm font-medium">类别ID:</div>
                          <div className="text-sm">{dbProducts.get(item.product_id)?.category?.id || '-'}</div>
                          
                          <div className="text-sm font-medium">推荐供应商:</div>
                          <div className="text-sm">{dbProducts.get(item.product_id)?.supplier?.name || '-'}</div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-32 text-gray-400 italic">
                        数据库中未找到匹配的产品信息
                      </div>
                    )}
                  </div>
                  
                  {/* 右侧：当前订单中的数据 */}
                  <div className="p-4">
                    <h3 className="font-semibold text-green-600 mb-3">当前订单数据</h3>
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-1">
                        <div className="text-sm font-medium">产品名称:</div>
                        <div className="text-sm">{item.product?.name || '-'}</div>
                        
                        <div className="text-sm font-medium">产品代码:</div>
                        <div className="text-sm">{item.product?.code || '-'}</div>
                        
                        <div className="text-sm font-medium">产品类别:</div>
                        <div className="text-sm">{item.product?.category?.name || '-'}</div>
                        
                        <div className="text-sm font-medium">供应商:</div>
                        <div className="text-sm">{item.supplier?.name || '-'}</div>
                        
                        <div className="text-sm font-medium">数量:</div>
                        <div className="text-sm">{parseFloat(item.quantity).toFixed(2)}</div>
                        
                        <div className="text-sm font-medium">单价:</div>
                        <div className="text-sm">¥{parseFloat(item.price).toFixed(2)}</div>
                        
                        <div className="text-sm font-medium">总价:</div>
                        <div className="text-sm">¥{parseFloat(item.total).toFixed(2)}</div>
                        
                        <div className="text-sm font-medium">状态:</div>
                        <div className="text-sm">
                          <span className={`px-2 py-1 rounded-full ${getStatusDisplay(item.status).className}`}>
                            {getStatusDisplay(item.status).text}
                          </span>
                        </div>
                      </div>

                      <div className="mt-3 flex justify-end space-x-2">
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
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
} 