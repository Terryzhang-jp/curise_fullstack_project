'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';

interface OrderStatistics {
  total_orders: number;
  not_started_orders: number;
  partially_processed_orders: number;
  fully_processed_orders: number;
  total_items: number;
  processed_items: number;
  unprocessed_items: number;
}

export default function OrderSummaryCard() {
  const [statistics, setStatistics] = useState<OrderStatistics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStatistics = async () => {
      try {
        // 更新API端点路径
        const response = await fetch('http://localhost:8000/api/v1/statistics');
        if (!response.ok) {
          throw new Error('获取统计数据失败');
        }
        
        const data = await response.json();
        console.log('Statistics data:', data);
        setStatistics(data);
      } catch (error) {
        console.error('获取订单统计数据时出错:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStatistics();
  }, []);

  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardContent className="p-6">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="flex flex-col space-y-3 md:flex-row md:space-y-0 md:space-x-4">
            {[...Array(4)].map((_, index) => (
              <div key={index} className="bg-gray-100 rounded-lg p-4 flex-1">
                <div className="h-5 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/4"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!statistics) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-2 text-yellow-600">
            <AlertCircle size={20} />
            <div>无法加载订单统计信息</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-6">
        <h2 className="text-xl font-bold mb-4">订单处理情况</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-sm text-gray-500">总订单数</div>
            <div className="text-2xl font-bold text-gray-900">{statistics.total_orders}</div>
          </div>
          
          <div className="bg-yellow-50 rounded-lg p-4">
            <div className="text-sm text-yellow-700">未开始订单</div>
            <div className="text-2xl font-bold text-yellow-600">{statistics.not_started_orders}</div>
          </div>
          
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="text-sm text-blue-700">部分处理订单</div>
            <div className="text-2xl font-bold text-blue-600">{statistics.partially_processed_orders}</div>
          </div>
          
          <div className="bg-green-50 rounded-lg p-4">
            <div className="text-sm text-green-700">已完成订单</div>
            <div className="text-2xl font-bold text-green-600">{statistics.fully_processed_orders}</div>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t">
          <div className="flex justify-between mb-2">
            <h3 className="font-medium">产品处理进度</h3>
            <div className="text-sm text-gray-500">
              {statistics.processed_items} / {statistics.total_items} 项目已处理
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className="bg-blue-600 h-2.5 rounded-full"
              style={{ width: `${statistics.total_items > 0 ? Math.round((statistics.processed_items / statistics.total_items) * 100) : 0}%` }}
            ></div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 