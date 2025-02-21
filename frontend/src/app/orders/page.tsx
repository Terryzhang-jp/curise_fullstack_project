'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import { PlusIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';

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
}

// 计算剩余天数
function calculateRemainingDays(deliveryDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const delivery = new Date(deliveryDate);
  delivery.setHours(0, 0, 0, 0);
  const diffTime = delivery.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const today = new Date();

  const fetchOrders = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:8000/api/v1/orders/', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setOrders(data);
    } catch (error) {
      console.error('Error fetching orders:', error);
      setError('获取订单列表失败');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  // 计算待处理订单数量
  const pendingOrdersCount = Array.isArray(orders) 
    ? orders.filter(order => order.status === 'pending').length 
    : 0;

  const columns = [
    {
      header: '订单编号',
      accessorKey: 'order_no',
    },
    {
      header: '船舶',
      accessorKey: 'ship.name',
    },
    {
      header: '公司',
      accessorKey: 'company.name',
    },
    {
      header: '港口',
      accessorKey: 'port.name',
    },
    {
      header: '订单日期',
      accessorKey: 'order_date',
      cell: ({ row }: { row: any }) => {
        const date = new Date(row.original.order_date);
        return date.toLocaleDateString('zh-CN');
      },
    },
    {
      header: '交货日期',
      accessorKey: 'delivery_date',
      cell: ({ row }: { row: any }) => {
        const date = new Date(row.original.delivery_date);
        const remainingDays = calculateRemainingDays(row.original.delivery_date);
        const remainingClass = remainingDays < 0 ? 'text-red-500' : 
                             remainingDays <= 7 ? 'text-yellow-500' : 
                             'text-green-500';
        return (
          <div>
            <div>{date.toLocaleDateString('zh-CN')}</div>
            <div className={`text-xs ${remainingClass}`}>
              {remainingDays < 0 
                ? `已超期 ${Math.abs(remainingDays)} 天`
                : `还剩 ${remainingDays} 天`}
            </div>
          </div>
        );
      },
    },
    {
      header: '状态',
      accessorKey: 'status',
      cell: ({ row }: { row: any }) => (
        <span className={`px-2 py-1 rounded-full text-sm ${
          row.original.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
          row.original.status === 'completed' ? 'bg-green-100 text-green-800' :
          'bg-red-100 text-red-800'
        }`}>
          {row.original.status === 'pending' ? '待处理' :
           row.original.status === 'completed' ? '已完成' :
           '已取消'}
        </span>
      ),
    },
    {
      header: '总金额',
      accessorKey: 'total_amount',
      cell: ({ row }: { row: any }) => (
        <span>¥{row.original.total_amount.toFixed(2)}</span>
      ),
    },
    {
      header: '操作',
      cell: ({ row }: { row: any }) => (
        <div className="flex gap-2">
          <Link href={`/orders/${row.original.id}`}>
            <Button variant="outline" size="sm">
              查看详情
            </Button>
          </Link>
          <Button
            variant="destructive"
            size="sm"
            onClick={async (e) => {
              e.preventDefault();
              if (!window.confirm('确定要删除此订单吗？此操作不可撤销。')) {
                return;
              }
              try {
                const response = await fetch(
                  `http://localhost:8000/api/v1/orders/${row.original.id}`,
                  {
                    method: 'DELETE',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                  }
                );
                if (!response.ok) {
                  throw new Error('删除订单失败');
                }
                // 重新加载订单列表
                fetchOrders();
              } catch (error) {
                console.error('Error deleting order:', error);
                alert('删除订单失败');
              }
            }}
          >
            删除
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">订单管理</h1>
          <p className="text-sm text-gray-500 mt-1">
            今天是 {today.toLocaleDateString('zh-CN')}
          </p>
        </div>
        <div className="flex gap-4">
          <Link href="/order-analysis/upload">
            <Button>
              <PlusIcon className="h-4 w-4 mr-2" />
              上传订单
            </Button>
          </Link>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow">
        <div className="mb-4">
          <h2 className="text-lg font-medium">待处理订单统计</h2>
          <p className="text-sm text-gray-500 mt-1">
            共有 {pendingOrdersCount} 个待处理订单
          </p>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={orders}
        isLoading={isLoading}
      />
    </div>
  );
} 