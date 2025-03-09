'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import { PlusIcon } from '@heroicons/react/24/outline';
import CountryForm from './CountryForm';
import { getApiUrl, API_ENDPOINTS } from '@/lib/api-config';
import { toast } from '@/components/ui/use-toast';

interface Country {
  id: number;
  name: string;
  code: string;
  status: boolean;
  created_at: string;
  updated_at: string;
}

export default function CountriesPage() {
  const [countries, setCountries] = useState<Country[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCountry, setEditingCountry] = useState<Country | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchCountries = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(getApiUrl(API_ENDPOINTS.COUNTRIES));
      const data = await response.json();
      setCountries(data);
    } catch (error) {
      console.error('Error fetching countries:', error);
      setError('获取国家列表失败');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCountries();
  }, []);

  const columns = [
    {
      header: 'ID',
      accessorKey: 'id',
    },
    {
      header: '国家名称',
      accessorKey: 'name',
    },
    {
      header: '国家代码',
      accessorKey: 'code',
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
              setEditingCountry(row.original);
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
    if (!confirm('确定要删除这个国家吗？')) return;
    
    try {
      setIsLoading(true);
      await fetch(`${getApiUrl(API_ENDPOINTS.COUNTRIES)}/${id}`, {
        method: 'DELETE',
      });
      
      // 从列表中移除被删除的国家
      setCountries(countries.filter(country => country.id !== id));
      
      toast({
        title: '删除成功',
        description: '国家已成功删除',
      });
    } catch (error) {
      console.error('删除国家失败:', error);
      toast({
        title: '删除失败',
        description: '无法删除国家，请稍后再试',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold tracking-tight">国家管理</h1>
        <Button onClick={() => setShowForm(true)}>
          <PlusIcon className="h-4 w-4 mr-2" />
          添加国家
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={countries}
        isLoading={isLoading}
      />

      {showForm && (
        <CountryForm
          country={editingCountry}
          onClose={() => {
            setShowForm(false);
            setEditingCountry(null);
          }}
          onSuccess={() => {
            setShowForm(false);
            setEditingCountry(null);
            fetchCountries();
          }}
        />
      )}
    </div>
  );
} 