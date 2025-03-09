'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { getApiUrl, API_ENDPOINTS } from '@/lib/api-config';

interface OrderItem {
  id: number;
  order_id: number;
    order_no: string;
  ship_name: string;
  product_id: number;
  product_name: string;
  product_code: string;
  supplier_name: string;
  quantity: number;
  price: number;
  total: number;
  status: string;
}

interface OrderStatistics {
  total_orders: number;
  not_started_orders: number;
  partially_processed_orders: number;
  fully_processed_orders: number;
  total_items: number;
  unprocessed_items: number;
  processed_items: number;
}

// 示例产品数据
const sampleProducts = [
  {
    id: 304,
    name: "定制饮品用品-1号",
    code: "001-002-001",
    supplier_name: "阿里",
    price: 8288.99,
  },
  {
    id: 305,
    name: "标准肉类组件-2号",
    code: "001-003-002",
    supplier_name: "阿里",
    price: 8356.4,
  },
  {
    id: 306,
    name: "定制肉类装置-3号",
    code: "001-003-003",
    supplier_name: "阿里",
    price: 5137.84,
  },
];

// 示例订单数据
const sampleOrders = [
  {
    id: 52,
    order_no: "ORD-20250211-001",
    ship_name: "阿里号",
  },
  {
    id: 53,
    order_no: "ORD-20250211-002",
    ship_name: "犀利号",
  },
  {
    id: 55,
    order_no: "ORD-20250211-004",
    ship_name: "阿里号",
  },
];

export default function OrderProcessingPage() {
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [statistics, setStatistics] = useState<OrderStatistics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [editProductId, setEditProductId] = useState<string>("");
  const router = useRouter();

  // 生成测试订单项数据
  const generateTestOrderItems = (forceGenerate = false) => {
    // 如果强制生成测试数据
    if (forceGenerate) {
      console.log('强制生成新的测试数据');
      // 生成新的测试数据
      const items: OrderItem[] = [];
      let itemId = 1;

      // 为每个订单创建1-3个订单项
      sampleOrders.forEach(order => {
        const numItems = Math.floor(Math.random() * 3) + 1;
        for (let i = 0; i < numItems; i++) {
          const product = sampleProducts[Math.floor(Math.random() * sampleProducts.length)];
          const quantity = Math.floor(Math.random() * 10) + 1;
          
          // 确保产品ID有效且类型为数字
          const productId = typeof product.id === 'number' ? product.id : parseInt(product.id, 10);
          
          // 确保产品ID大于0
          if (isNaN(productId) || productId <= 0) {
            console.warn(`警告: 生成的测试数据中有无效的产品ID: ${product.id}`);
            continue; // 跳过无效数据
          }
          
          items.push({
            id: itemId++,
            order_id: order.id,
            order_no: order.order_no,
            ship_name: order.ship_name,
            product_id: productId,
            product_name: product.name,
            product_code: product.code,
            supplier_name: product.supplier_name,
            quantity: quantity,
            price: product.price,
            total: quantity * product.price,
            status: 'unprocessed'
          });
        }
      });
      
      // 确保所有生成的测试数据都有有效的产品ID
      const validItems = items.filter(item => typeof item.product_id === 'number' && item.product_id > 0);
      console.log(`生成了 ${items.length} 个测试项，其中有效项 ${validItems.length} 个`);
      
      if (validItems.length === 0) {
        console.error('生成的测试数据中没有有效的产品ID！');
        // 添加一个固定的有效测试项
        validItems.push({
          id: 9999,
          order_id: sampleOrders[0].id,
          order_no: sampleOrders[0].order_no,
          ship_name: sampleOrders[0].ship_name,
          product_id: 304, // 确保是有效的测试产品ID
          product_name: "测试产品",
          product_code: "TEST-001",
          supplier_name: "测试供应商",
          quantity: 1,
          price: 100,
          total: 100,
          status: 'unprocessed'
        });
      }
      
      return validItems;
    }
    
    // 如果不是强制生成，则先检查是否有来自订单详情页的数据
    const processingItems = localStorage.getItem('processingItems');
    if (processingItems) {
      console.log('从processingItems加载数据');
      try {
        const parsedItems = JSON.parse(processingItems);
        // 验证并修复数据格式
        return validateAndFixItems(parsedItems);
      } catch (error) {
        console.error('解析processingItems数据失败:', error);
        return [];
      }
    }
    
    // 然后检查本地存储是否已经有数据
    const storedItems = localStorage.getItem('orderProcessingItems');
    if (storedItems) {
      console.log('从orderProcessingItems加载数据');
      try {
        const parsedItems = JSON.parse(storedItems);
        // 验证并修复数据格式
        return validateAndFixItems(parsedItems);
      } catch (error) {
        console.error('解析orderProcessingItems数据失败:', error);
        return [];
      }
    }
    
    // 如果没有任何数据，返回空数组
    console.log('没有找到任何订单处理数据');
    return [];
  };

  // 验证并修复项目数据格式
  const validateAndFixItems = (items: any[]): OrderItem[] => {
    if (!Array.isArray(items)) {
      console.error('加载的数据不是数组格式');
      return [];
    }
    
    console.log('待验证数据:', items);
    
    return items.map((item, index) => {
      // 提取产品ID，确保是有效值
      // 仔细检查产品ID的所有可能来源
      let productId = 0;
      
      if (typeof item.product_id === 'number' && item.product_id > 0) {
        productId = item.product_id;
        console.log(`订单项 #${index+1}: 直接使用product_id=${productId}`);
      } else if (item.product && typeof item.product.id === 'number' && item.product.id > 0) {
        productId = item.product.id;
        console.log(`订单项 #${index+1}: 从product.id获取，product_id=${productId}`);
      } else if (item.product_id === "0" || item.product_id === 0) {
        // 尝试从产品代码中提取ID作为后备方案
        try {
          if (item.product_code && item.product_code.includes("-")) {
            const parts = item.product_code.split("-");
            if (parts.length >= 3) {
              const possibleId = parseInt(parts[2], 10);
              if (!isNaN(possibleId) && possibleId > 0) {
                productId = possibleId;
                console.log(`订单项 #${index+1}: 从产品代码提取ID成功: ${item.product_code} -> ID: ${productId}`);
              }
            }
          }
        } catch (e) {
          console.warn(`无法从产品代码提取ID: ${item.product_code}`);
        }
      }
      
      if (productId === 0) {
        console.warn(`警告: 订单项 #${index+1} 没有有效的产品ID，请手动添加产品信息`);
        console.warn(`订单项数据:`, JSON.stringify(item, null, 2));
      }
      
      // 确保所有必需字段都存在
      const validItem: OrderItem = {
        id: item.id || index + 1,
        order_id: item.order_id || 0,
        order_no: item.order_no || '未知订单号',
        ship_name: item.ship_name || '未知船舶',
        product_id: productId, // 使用修复后的产品ID
        product_name: item.product_name || (item.product?.name || '未知产品'),
        product_code: item.product_code || (item.product?.code || ''),
        supplier_name: item.supplier_name || (item.supplier?.name || '未知供应商'),
        quantity: item.quantity || 0,
        price: item.price || 0,
        total: item.total || 0,
        status: item.status || 'unprocessed'
      };
      
      return validItem;
    });
  };

  // 计算统计信息
  const calculateStatistics = (items: OrderItem[]) => {
    const orderIds = Array.from(new Set(items.map(item => item.order_id)));
    
    // 按订单ID分组订单项
    const itemsByOrder = orderIds.map(orderId => {
      return items.filter(item => item.order_id === orderId);
    });

    // 计算各种状态的订单数量
    const notStartedOrders = itemsByOrder.filter(orderItems => 
      orderItems.every(item => item.status === 'unprocessed')
    ).length;

    const fullyProcessedOrders = itemsByOrder.filter(orderItems => 
      orderItems.every(item => item.status === 'processed')
    ).length;

    const partiallyProcessedOrders = orderIds.length - notStartedOrders - fullyProcessedOrders;

    // 计算订单项统计
    const totalItems = items.length;
    const processedItems = items.filter(item => item.status === 'processed').length;
    const unprocessedItems = totalItems - processedItems;

    return {
      total_orders: orderIds.length,
      not_started_orders: notStartedOrders,
      partially_processed_orders: partiallyProcessedOrders,
      fully_processed_orders: fullyProcessedOrders,
      total_items: totalItems,
      unprocessed_items: unprocessedItems,
      processed_items: processedItems
    };
  };

  // 加载订单统计信息和订单项
  const loadData = async () => {
    try {
      setIsLoading(true);
      
      // 检查是否有本地存储数据需要迁移
      await migrateLocalStorageData();
      
      // 获取认证令牌
      const token = localStorage.getItem('token');
      
      // 从API获取处理队列数据
      const response = await fetch(getApiUrl(API_ENDPOINTS.ORDER_PROCESSING), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` // 添加认证头
        },
        // 移除credentials设置，使用token认证
        // credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('获取处理队列数据失败');
      }

      const items = await response.json();
      setOrderItems(items);
      
      if (items.length > 0) {
        const stats = calculateStatistics(items);
        setStatistics(stats);
      } else {
        setStatistics({
          total_orders: 0,
          not_started_orders: 0,
          partially_processed_orders: 0,
          fully_processed_orders: 0,
          total_items: 0,
          unprocessed_items: 0,
          processed_items: 0
        });
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('加载数据失败');
    } finally {
      setIsLoading(false);
    }
  };

  // 从 localStorage 迁移数据到数据库
  const migrateLocalStorageData = async () => {
    try {
      // 检查是否有本地存储数据
      const localItems = localStorage.getItem('orderProcessingItems');
      if (!localItems) return;
      
      const items = JSON.parse(localItems);
      if (!items || !Array.isArray(items) || items.length === 0) return;
      
      // 显示迁移提示
      toast.info('检测到本地存储数据，正在迁移到数据库...');
      
      // 获取认证令牌
      const token = localStorage.getItem('token');
      
      // 通过API迁移本地数据到数据库
      const response = await fetch(getApiUrl(API_ENDPOINTS.ORDER_PROCESSING), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` // 添加认证头
        },
        body: JSON.stringify(items),
        // 移除credentials设置
        // credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('迁移本地数据失败');
      }

      const result = await response.json();
      
      // 清除本地存储
      localStorage.removeItem('orderProcessingItems');
      localStorage.removeItem('processingItems');
      
      toast.success(`成功迁移 ${result.count} 个本地数据项到数据库`);
    } catch (error) {
      console.error('Error migrating local data:', error);
      toast.error('迁移本地数据失败');
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // 处理选择订单项
  const handleSelectItem = (itemId: number) => {
    setSelectedItems(prev => {
      if (prev.includes(itemId)) {
        return prev.filter(id => id !== itemId);
      } else {
        return [...prev, itemId];
      }
    });
  };

  // 处理全选
  const handleSelectAll = () => {
    if (selectedItems.length === orderItems.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(orderItems.map(item => item.id));
    }
  };

  // 处理批量处理订单项
  const handleBatchProcess = async () => {
    // 检查是否有选中的项目
    if (selectedItems.length === 0) {
      toast.warning("请先选择要处理的订单项");
      return;
    }

    try {
      setIsLoading(true);
      
      // 获取认证令牌
      const token = localStorage.getItem('token');
      
      // 通过API将选中的项目标记为已处理
      const processPromises = selectedItems.map(itemId => 
        fetch(`api/v1/order-processing/items/${itemId}/process`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}` // 添加认证头
          },
          // 移除credentials设置
          // credentials: 'include'
        })
      );
      
      // 等待所有处理请求完成
      await Promise.all(processPromises);
      
      // 重新加载数据
      await loadData();
      
      toast.success(`已处理 ${selectedItems.length} 个订单项`);
      
      // 提示用户是否继续流程
      if (confirm('是否继续到产品分类环节？')) {
        router.push('/order-category-processing');
      }
    } catch (error) {
      console.error('Error processing items:', error);
      toast.error('处理订单项失败');
    } finally {
      setIsLoading(false);
    }
  };

  // 处理批量删除订单项
  const handleBatchDelete = async () => {
    if (selectedItems.length === 0) {
      toast.warning('请选择要删除的订单项');
      return;
    }

    try {
      setIsDeleting(true);
      
      // 获取认证令牌
      const token = localStorage.getItem('token');
      
      // 通过API删除选中的订单项
      const deletePromises = selectedItems.map(itemId => 
        fetch(`api/v1/order-processing/items/${itemId}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}` // 添加认证头
          },
          // 移除credentials设置
          // credentials: 'include'
        })
      );
      
      // 等待所有删除请求完成
      await Promise.all(deletePromises);
      
      // 重新加载数据
      await loadData();
      
      toast.success(`成功删除 ${selectedItems.length} 个订单项`);
      setSelectedItems([]);
      setShowDeleteDialog(false);
    } catch (error) {
      console.error('Error deleting orders:', error);
      toast.error('删除订单失败');
    } finally {
      setIsDeleting(false);
    }
  };

  // 添加测试商品到订单处理列表
  const handleAddTestItems = async () => {
    try {
      setIsLoading(true);
      
      // 使用forceGenerate参数强制生成测试数据
      const testItems = generateTestOrderItems(true);  // 强制生成测试数据
      
      // 获取认证令牌
      const token = localStorage.getItem('token');
      
      // 通过API迁移测试数据到数据库
      const response = await fetch(getApiUrl(API_ENDPOINTS.ORDER_PROCESSING), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` // 添加认证头
        },
        body: JSON.stringify(testItems),
        // 移除credentials设置
        // credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('添加测试数据失败');
      }

      const result = await response.json();
      
      // 重新加载数据
      await loadData();
      
      toast.success(`成功添加 ${result.count} 个测试订单项`);
    } catch (error) {
      console.error('Error adding test items:', error);
      toast.error('添加测试数据失败');
    } finally {
      setIsLoading(false);
    }
  };

  // 清理和重置所有数据
  const handleDataReset = async () => {
    try {
      setIsLoading(true);
      
      // 获取认证令牌
      const token = localStorage.getItem('token');
      
      // 通过API清空处理队列
      const response = await fetch(getApiUrl(API_ENDPOINTS.ORDER_PROCESSING), {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` // 添加认证头
        },
        // 移除credentials设置
        // credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('清空处理队列失败');
      }

      const result = await response.json();
      
      // 重置状态
      setOrderItems([]);
      setSelectedItems([]);
      setStatistics({
        total_orders: 0,
        not_started_orders: 0,
        partially_processed_orders: 0,
        fully_processed_orders: 0,
        total_items: 0,
        unprocessed_items: 0,
        processed_items: 0
      });
      
      toast.success(`已清除所有处理队列数据，共 ${result.count} 条`);
    } catch (error) {
      console.error('Error resetting data:', error);
      toast.error('重置数据失败');
    } finally {
      setIsLoading(false);
    }
  };

  // 清空所有订单处理项
  const handleClearAllItems = () => {
    localStorage.removeItem('orderProcessingItems');
    localStorage.removeItem('processingItems'); // 同时清除从订单详情页添加的项目
    setOrderItems([]);
    setStatistics({
      total_orders: 0,
      not_started_orders: 0,
      partially_processed_orders: 0,
      fully_processed_orders: 0,
      total_items: 0,
      unprocessed_items: 0,
      processed_items: 0
    });
    toast.success('已清空所有待处理订单项');
  };

  // 处理编辑产品ID
  const handleEditProductId = (itemId: number) => {
    const item = orderItems.find(item => item.id === itemId);
    if (item) {
      setEditingItemId(itemId);
      setEditProductId(item.product_id?.toString() || "");
    }
  };
  
  // 保存产品ID编辑
  const handleSaveProductId = () => {
    if (!editingItemId) return;
    
    const productId = parseInt(editProductId, 10);
    if (isNaN(productId) || productId <= 0) {
      toast.error("请输入有效的产品ID（大于0的整数）");
      return;
    }
    
    const updatedItems = orderItems.map(item => {
      if (item.id === editingItemId) {
        return { ...item, product_id: productId };
      }
      return item;
    });
    
    // 更新本地状态和localStorage
    setOrderItems(updatedItems);
    localStorage.setItem('orderProcessingItems', JSON.stringify(updatedItems));
    localStorage.setItem('processingItems', JSON.stringify(updatedItems));
    
    toast.success(`已更新订单项 #${editingItemId} 的产品ID为 ${productId}`);
    setEditingItemId(null);
    setEditProductId("");
  };
  
  // 取消编辑
  const handleCancelEdit = () => {
    setEditingItemId(null);
    setEditProductId("");
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">订单处理</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>订单处理流程指南</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground mb-2">完整的订单处理流程包含以下步骤：</div>
          <ol className="list-decimal list-inside space-y-1 text-sm">
            <li className="text-blue-600 font-medium">订单项选择与批量处理（当前步骤）</li>
            <li>供应商匹配 - 为订单项选择合适的供应商</li>
            <li>邮件通知 - 向所选供应商发送邮件通知</li>
          </ol>
          <div className="mt-3 text-sm">点击"批量处理"按钮后，系统会询问您是否要继续进行供应商匹配流程。</div>
        </CardContent>
      </Card>

      {/* 测试数据控制按钮 */}
      <div className="flex gap-2">
        <Button onClick={handleAddTestItems} variant="outline">
          添加测试数据
        </Button>
        <Button onClick={handleDataReset} variant="outline" className="text-red-500">
          重置所有数据
        </Button>
        <Button onClick={handleClearAllItems} variant="outline" className="text-red-500">
          清空所有数据
        </Button>
      </div>
      
      {/* 产品ID编辑对话框 */}
      <Dialog open={editingItemId !== null} onOpenChange={(open) => !open && handleCancelEdit()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>编辑产品ID</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">产品ID</label>
              <Input
                type="number"
                min="1"
                value={editProductId}
                onChange={(e) => setEditProductId(e.target.value)}
                placeholder="请输入有效的产品ID（大于0的整数）"
              />
              <p className="text-xs text-gray-500">
                产品ID必须对应数据库中已有的产品，否则将无法进行后续分类和供应商匹配。
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancelEdit}>取消</Button>
            <Button onClick={handleSaveProductId}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* 统计信息卡片 */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                未开始订单
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.not_started_orders}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                部分处理订单
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.partially_processed_orders}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                完全处理订单
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.fully_processed_orders}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                未处理订单项
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.unprocessed_items}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 订单列表 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>待处理订单项</CardTitle>
          <div className="flex gap-2">
            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
              <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                  onClick={() => selectedItems.length > 0 && setShowDeleteDialog(true)}
                  disabled={selectedItems.length === 0}
                >
                  批量删除 ({selectedItems.length})
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>确认删除</AlertDialogTitle>
                  <AlertDialogDescription>
                    您确定要删除选中的 {selectedItems.length} 个订单项吗？此操作不可撤销。
                    <br />
                    <strong className="text-green-600">注意：</strong> 此操作只会从订单处理队列中移除这些项目，不会影响实际订单数据。
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isDeleting}>取消</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={(e) => {
                      e.preventDefault();
                      handleBatchDelete();
                    }}
                    disabled={isDeleting}
                  >
                    {isDeleting ? "删除中..." : "确认删除"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            
                  <Button
              onClick={handleBatchProcess}
              disabled={selectedItems.length === 0}
                  >
              批量处理 ({selectedItems.length})
                  </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-4">加载中...</div>
          ) : orderItems.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              暂无待处理的订单项，请点击"添加测试数据"按钮添加
            </div>
          ) : (
            <div className="space-y-4">
              <div className="border rounded-lg">
                <div className="grid grid-cols-9 gap-4 p-4 bg-muted font-medium">
                  <div className="col-span-1 flex items-center">
                    <Checkbox
                      checked={selectedItems.length === orderItems.length && orderItems.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </div>
                  <div className="col-span-2">订单号/船舶</div>
                  <div className="col-span-2">产品</div>
                  <div className="col-span-1">产品ID</div>
                  <div className="col-span-1">供应商</div>
                  <div className="col-span-1">数量</div>
                  <div className="col-span-1">状态</div>
                </div>
                {orderItems.map((item) => (
                  <div
                    key={item.id}
                    className="grid grid-cols-9 gap-4 p-4 border-t hover:bg-muted/50"
                  >
                    <div className="col-span-1 flex items-center">
                      <Checkbox
                        checked={selectedItems.includes(item.id)}
                        onCheckedChange={() => handleSelectItem(item.id)}
                      />
                    </div>
                    <div className="col-span-2">
                      <div className="font-medium">{item.order_no}</div>
                      <div className="text-sm text-muted-foreground">{item.ship_name}</div>
                    </div>
                    <div className="col-span-2">
                      <div className="font-medium">{item.product_name}</div>
                      <div className="text-sm text-muted-foreground">{item.product_code}</div>
                    </div>
                    <div className="col-span-1">
                      <div className={`font-medium ${(!item.product_id || item.product_id <= 0) ? 'text-red-500' : ''}`}>
                        {item.product_id || '未设置'}
                        {(!item.product_id || item.product_id <= 0) && (
                        <Button
                            variant="ghost" 
                            size="sm" 
                            className="ml-1 text-blue-500" 
                            onClick={() => handleEditProductId(item.id)}
                          >
                            编辑
                        </Button>
                        )}
                      </div>
                    </div>
                    <div className="col-span-1">{item.supplier_name}</div>
                    <div className="col-span-1">{item.quantity}</div>
                    <div className="col-span-1">
                      <Badge variant={item.status === 'unprocessed' ? 'secondary' : 'default'}>
                        {item.status === 'unprocessed' ? '未处理' : '已处理'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 