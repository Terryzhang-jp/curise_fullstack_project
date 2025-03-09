"use client";

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { getApiUrl, API_ENDPOINTS } from '@/lib/api-config';

interface OrderOverview {
  id: number;
  order_no: string;
  order_date: string;
  delivery_date: string | null;
  status: string;
  total_amount: number;
  ship_name: string | null;
  company_name: string | null;
  port_name: string | null;
  total_items: number;
  processed_items: number;
  completion_percentage: number;
}

export default function OrderOverviewGrid() {
  const [orders, setOrders] = useState<OrderOverview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hoveredOrderId, setHoveredOrderId] = useState<number | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch(getApiUrl(API_ENDPOINTS.OVERVIEW));
        if (!response.ok) {
          throw new Error('获取数据失败');
        }
        const data = await response.json();
        console.log('Orders overview data:', data);
        setOrders(data);
      } catch (error) {
        console.error('Error fetching orders overview:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'not_started':
      case 'pending':
        return 'bg-yellow-500';
      case 'partially_processed':
        return 'bg-blue-500';
      case 'fully_processed':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'not_started':
      case 'pending':
        return '未开始';
      case 'partially_processed':
        return '部分处理';
      case 'fully_processed':
        return '已完成';
      default:
        return '未知';
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '未设置';
    try {
      return format(new Date(dateString), 'yyyy-MM-dd');
    } catch (error) {
      return dateString;
    }
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
        {[...Array(6)].map((_, index) => (
          <div key={index} className="bg-white rounded-lg shadow-md p-6 h-64">
            <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {orders.map((order) => (
        <Card 
          key={order.id}
          className="relative overflow-hidden transition-all duration-300 hover:shadow-lg"
          onMouseEnter={() => setHoveredOrderId(order.id)}
          onMouseLeave={() => setHoveredOrderId(null)}
        >
          <div className={`absolute top-0 left-0 w-2 h-full ${getStatusColor(order.status)}`}></div>
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-bold">{order.order_no}</h3>
                <p className="text-sm text-gray-500">{order.ship_name || '未指定船舶'}</p>
              </div>
              <Badge className={getStatusColor(order.status) + ' text-white'}>
                {getStatusText(order.status)}
              </Badge>
            </div>
            
            <div className="mb-4">
              <div className="flex justify-between text-sm mb-1">
                <span>处理进度:</span>
                <span>{order.processed_items} / {order.total_items} 项目</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className="bg-blue-600 h-2.5 rounded-full"
                  style={{ width: `${order.completion_percentage}%` }}
                ></div>
              </div>
            </div>

            {/* 基本信息 - 始终显示 */}
            <div className="text-sm">
              <div className="flex justify-between mb-1">
                <span className="text-gray-500">订单日期:</span>
                <span>{formatDate(order.order_date)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">总金额:</span>
                <span>¥{order.total_amount.toFixed(2)}</span>
              </div>
            </div>

            {/* 悬停时显示的额外信息 */}
            {hoveredOrderId === order.id && (
              <div className="absolute inset-0 bg-white bg-opacity-95 p-6 flex flex-col justify-center transition-opacity duration-300 opacity-100">
                <h3 className="text-lg font-bold mb-4">{order.order_no} - 详细信息</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">订单状态:</span>
                    <span className="font-medium">{getStatusText(order.status)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">船舶:</span>
                    <span>{order.ship_name || '未指定'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">公司:</span>
                    <span>{order.company_name || '未指定'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">港口:</span>
                    <span>{order.port_name || '未指定'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">订单日期:</span>
                    <span>{formatDate(order.order_date)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">交付日期:</span>
                    <span>{formatDate(order.delivery_date)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">总金额:</span>
                    <span className="font-medium">¥{order.total_amount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">项目处理:</span>
                    <span>
                      {order.processed_items} / {order.total_items} 
                      <span className="ml-1 text-xs">({order.completion_percentage}%)</span>
                    </span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
} 