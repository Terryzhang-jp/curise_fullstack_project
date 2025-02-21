'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

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
}

export default function ProcessOrderItemsPage() {
  const router = useRouter();
  const [processingItems, setProcessingItems] = useState<OrderItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    // 从localStorage加载选中的订单项目
    const items = localStorage.getItem('processingItems');
    if (items) {
      try {
        const parsedItems = JSON.parse(items);
        setProcessingItems(parsedItems);
      } catch (error) {
        console.error('解析待处理项目失败:', error);
        setProcessingItems([]);
      }
    }
  }, []);

  const handleRemoveItem = (itemId: number) => {
    // 移除指定项目
    const newItems = processingItems.filter(item => item.id !== itemId);
    setProcessingItems(newItems);
    // 更新localStorage
    localStorage.setItem('processingItems', JSON.stringify(newItems));
  };

  const handleRemoveAll = () => {
    if (!confirm('确定要清空所有待处理项目吗？')) {
      return;
    }
    setProcessingItems([]);
    localStorage.removeItem('processingItems');
  };

  const handleProcessItems = async () => {
    if (processingItems.length === 0) {
      alert('没有可处理的订单项目');
      return;
    }

    try {
      setIsProcessing(true);
      
      // 调用后端API处理订单项目
      const response = await fetch('http://localhost:8000/api/v1/orders/process-items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          item_ids: processingItems.map(item => item.id)
        }),
      });

      if (!response.ok) {
        throw new Error('处理订单项目失败');
      }

      // 清空localStorage
      localStorage.removeItem('processingItems');
      setProcessingItems([]);
      
      // 显示成功消息
      alert('订单项目处理成功');
      
      // 返回订单处理中心
      router.push('/order-processing');
    } catch (error) {
      console.error('Error processing items:', error);
      alert('处理订单项目时发生错误');
    } finally {
      setIsProcessing(false);
    }
  };

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
          <h1 className="text-2xl font-bold">待处理订单项目</h1>
        </div>
        <div className="flex space-x-4">
          <Button
            variant="outline"
            onClick={handleRemoveAll}
            disabled={processingItems.length === 0}
          >
            清空列表
          </Button>
          <Button
            onClick={handleProcessItems}
            disabled={isProcessing || processingItems.length === 0}
          >
            {isProcessing ? '处理中...' : '确认处理'}
          </Button>
        </div>
      </div>

      {processingItems.length > 0 ? (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
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
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {processingItems.map((item) => (
                <tr key={item.id}>
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
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRemoveItem(item.id)}
                      disabled={isProcessing}
                    >
                      移除
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg p-6">
          <p className="text-center text-gray-500">暂无待处理的订单项目</p>
        </div>
      )}
    </div>
  );
} 