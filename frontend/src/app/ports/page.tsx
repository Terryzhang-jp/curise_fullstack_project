'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import { PlusIcon } from '@heroicons/react/24/outline';
import PortForm from './PortForm';

interface Port {
  id: number;
  name: string;
  country_id: number;
  location: string;
  status: boolean;
  created_at: string;
  updated_at: string;
  country?: {
    name: string;
    code: string;
  };
}

export default function PortsPage() {
  const [ports, setPorts] = useState<Port[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPort, setEditingPort] = useState<Port | null>(null);

  const fetchPorts = async () => {
    try {
      console.log('开始获取港口列表...');
      const response = await fetch('http://localhost:8000/api/v1/ports/');
      console.log('API 响应状态:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API 错误响应:', errorText);
        throw new Error(`API 请求失败: ${response.status} ${errorText}`);
      }
      
      const data = await response.json();
      console.log('API 返回的原始数据:', JSON.stringify(data, null, 2));
      
      // 处理返回的数据，确保 country 对象的结构完整
      const processedData = data.map((port: Port) => ({
        ...port,
        country: port.country ? {
          name: port.country.name || null,
          code: port.country.code || null
        } : { name: null, code: null }
      }));
      
      console.log('处理后的数据:', processedData);
      setPorts(processedData);
    } catch (error) {
      console.error('获取港口列表失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPorts();
  }, []);

  const columns = [
    {
      header: 'ID',
      accessorKey: 'id',
    },
    {
      header: '港口名称',
      accessorKey: 'name',
    },
    {
      header: '所属国家',
      id: 'country',
      accessorFn: (row: Port) => {
        const countryName = row?.country?.name;
        console.log('国家数据:', {
          港口ID: row.id,
          港口名称: row.name,
          原始数据: row.country,
          处理后的名称: countryName
        });
        return countryName || '-';
      },
    },
    {
      header: '位置',
      accessorKey: 'location',
    },
    {
      header: '状态',
      accessorKey: 'status',
      cell: ({ row }: { row: any }) => (
        <span className={`px-2 py-1 rounded-full text-sm ${
          row.original.status ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {row.original.status ? '启用' : '禁用'}
        </span>
      ),
    },
    {
      header: '操作',
      cell: ({ row }: { row: any }) => (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setEditingPort(row.original);
              setShowForm(true);
            }}
          >
            编辑
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => handleDelete(row.original.id)}
          >
            删除
          </Button>
        </div>
      ),
    },
  ];

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除这个港口吗？')) return;

    try {
      await fetch(`http://localhost:8000/api/v1/ports/${id}`, {
        method: 'DELETE',
      });
      fetchPorts();
    } catch (error) {
      console.error('Error deleting port:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold tracking-tight">港口管理</h1>
        <Button onClick={() => setShowForm(true)}>
          <PlusIcon className="h-4 w-4 mr-2" />
          添加港口
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={ports}
        isLoading={isLoading}
      />

      {showForm && (
        <PortForm
          port={editingPort}
          onClose={() => {
            setShowForm(false);
            setEditingPort(null);
          }}
          onSuccess={() => {
            setShowForm(false);
            setEditingPort(null);
            fetchPorts();
          }}
        />
      )}
    </div>
  );
} 