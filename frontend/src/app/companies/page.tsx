'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import { PlusIcon } from '@heroicons/react/24/outline';
import CompanyForm from './CompanyForm';
import { getApiUrl, API_ENDPOINTS } from '@/lib/api-config';
import { toast } from '@/components/ui/use-toast';

interface Company {
  id: number;
  name: string;
  country_id: number;
  contact: string;
  email: string;
  phone: string;
  status: boolean;
  created_at: string;
  updated_at: string;
  country?: {
    name: string;
    code: string;
  };
}

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);

  const fetchCompanies = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(getApiUrl(API_ENDPOINTS.COMPANIES));
      const data = await response.json();
      setCompanies(data);
    } catch (error) {
      console.error('Error fetching companies:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  const columns = [
    {
      header: 'ID',
      accessorKey: 'id',
    },
    {
      header: '公司名称',
      accessorKey: 'name',
    },
    {
      header: '所属国家',
      accessorKey: 'country.name',
    },
    {
      header: '联系人',
      accessorKey: 'contact',
    },
    {
      header: '邮箱',
      accessorKey: 'email',
    },
    {
      header: '电话',
      accessorKey: 'phone',
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
              setEditingCompany(row.original);
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
    if (!window.confirm('确定要删除这家公司吗？')) return;

    try {
      setIsLoading(true);
      await fetch(`${getApiUrl(API_ENDPOINTS.COMPANIES)}/${id}`, {
        method: 'DELETE',
      });
      
      toast({
        title: "删除成功",
        description: "公司已成功删除"
      });
      
      fetchCompanies();
    } catch (error) {
      console.error('Error deleting company:', error);
      toast({
        title: "删除失败",
        description: "删除公司时发生错误",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold tracking-tight">公司管理</h1>
        <Button onClick={() => setShowForm(true)}>
          <PlusIcon className="h-4 w-4 mr-2" />
          添加公司
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={companies}
        isLoading={isLoading}
      />

      {showForm && (
        <CompanyForm
          company={editingCompany}
          onClose={() => {
            setShowForm(false);
            setEditingCompany(null);
          }}
          onSuccess={() => {
            setShowForm(false);
            setEditingCompany(null);
            fetchCompanies();
          }}
        />
      )}
    </div>
  );
} 