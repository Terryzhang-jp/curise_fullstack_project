'use client';

import { useState, useEffect } from 'react';
import { use } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { DataTable } from '@/components/ui/data-table';
import { ColumnDef } from '@tanstack/react-table';
import Link from 'next/link';

interface OrderAnalysis {
  id: number;
  order_no: string;
  order_date: string;
  currency: string;
  ship_code: string;
  delivery_date: string;
  supplier_info: string | null;
  notes: string | null;
  status: string;
  total_amount: number;
  items_count: number;
}

interface OrderUpload {
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
  order_analyses: OrderAnalysis[];
}

export default function UploadDetailPage({ params }: { params: { id: string } }) {
  const [upload, setUpload] = useState<OrderUpload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const id = use(Promise.resolve(params.id));

  useEffect(() => {
    fetchUpload();
  }, [id]);

  const fetchUpload = async () => {
    try {
      const response = await fetch(`http://localhost:8000/api/v1/order-analysis/${id}`);
      if (!response.ok) {
        throw new Error('获取上传信息失败');
      }
      const data = await response.json();
      setUpload(data);
    } catch (error) {
      console.error('Error fetching upload:', error);
      setError(error instanceof Error ? error.message : '获取上传信息失败');
    } finally {
      setIsLoading(false);
    }
  };

  const columns: ColumnDef<OrderAnalysis>[] = [
    {
      header: '订单编号',
      accessorKey: 'order_no',
    },
    {
      header: '订单日期',
      accessorKey: 'order_date',
      cell: ({ row }) => (
        new Date(row.original.order_date).toLocaleDateString()
      ),
    },
    {
      header: '交付日期',
      accessorKey: 'delivery_date',
      cell: ({ row }) => (
        new Date(row.original.delivery_date).toLocaleDateString()
      ),
    },
    {
      header: '币种',
      accessorKey: 'currency',
    },
    {
      header: '总金额',
      accessorKey: 'total_amount',
      cell: ({ row }) => (
        <span>{row.original.total_amount.toFixed(2)}</span>
      ),
    },
    {
      header: '商品数量',
      accessorKey: 'items_count',
    },
    {
      header: '状态',
      accessorKey: 'status',
      cell: ({ row }) => (
        <span className={`px-2 py-1 rounded-full text-sm ${
          row.original.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
          row.original.status === 'completed' ? 'bg-green-100 text-green-800' :
          'bg-red-100 text-red-800'
        }`}>
          {row.original.status === 'pending' ? '处理中' :
           row.original.status === 'completed' ? '已完成' :
           '失败'}
        </span>
      ),
    },
    {
      header: '操作',
      cell: ({ row }) => (
        <Link href={`/order-analysis/${row.original.id}`}>
          <Button variant="outline" size="sm">
            查看详情
          </Button>
        </Link>
      ),
    },
  ];

  if (isLoading) {
    return <div className="text-center py-8">加载中...</div>;
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-500">{error}</p>
        <Link href="/order-analysis">
          <Button variant="outline" className="mt-4">
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            返回列表
          </Button>
        </Link>
      </div>
    );
  }

  if (!upload) {
    return (
      <div className="text-center py-8">
        <p>未找到上传记录</p>
        <Link href="/order-analysis">
          <Button variant="outline" className="mt-4">
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            返回列表
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold tracking-tight">上传详情</h1>
        <Link href="/order-analysis">
          <Button variant="outline">
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            返回列表
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 bg-white p-6 rounded-lg shadow">
        <div>
          <p className="text-sm text-gray-500">文件名</p>
          <p className="font-medium">{upload.file_name}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500">上传时间</p>
          <p className="font-medium">{new Date(upload.upload_date).toLocaleString()}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500">国家</p>
          <p className="font-medium">{upload.country?.name || '-'}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500">船舶</p>
          <p className="font-medium">{upload.ship?.name || '-'}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500">状态</p>
          <span className={`px-2 py-1 rounded-full text-sm ${
            upload.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
            upload.status === 'completed' ? 'bg-green-100 text-green-800' :
            'bg-red-100 text-red-800'
          }`}>
            {upload.status === 'pending' ? '处理中' :
             upload.status === 'completed' ? '已完成' :
             '失败'}
          </span>
        </div>
        {upload.error_message && (
          <div className="col-span-2">
            <p className="text-sm text-gray-500">错误信息</p>
            <p className="text-red-500">{upload.error_message}</p>
          </div>
        )}
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-medium mb-4">订单列表</h2>
        <DataTable
          columns={columns}
          data={upload.order_analyses || []}
        />
      </div>
    </div>
  );
} 