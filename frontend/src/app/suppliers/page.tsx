'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import { PlusIcon, ListBulletIcon } from '@heroicons/react/24/outline';
import SupplierForm from './SupplierForm';
import SupplierProducts from './SupplierProducts';

interface Country {
  id: number;
  name: string;
  code: string;
  status: boolean;
  created_at: string;
  updated_at: string;
}

interface Supplier {
  id: number;
  name: string;
  country_id: number;
  contact: string;
  email: string;
  phone: string;
  status: boolean;
  created_at: string;
  updated_at: string;
  country?: Country;
  categories: Array<{ id: number; name: string }>;
}

interface Product {
  id: number;
  name: string;
  code: string;
  category_id: number;
  country_id: number;
  unit: string;
  price: number;
  status: boolean;
  category?: {
    name: string;
  };
  country?: {
    name: string;
  };
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [showProductsForm, setShowProductsForm] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);

  const fetchSuppliers = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/v1/suppliers/');
      const data = await response.json();
      console.log('供应商数据:', data);
      setSuppliers(data);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const columns = [
    {
      header: 'ID',
      accessorKey: 'id',
    },
    {
      header: '供应商名称',
      accessorKey: 'name',
    },
    {
      header: '所属国家',
      accessorKey: 'country.name',
    },
    {
      header: '供应类别',
      cell: ({ row }: { row: any }) => (
        <div className="flex flex-wrap gap-1">
          {row.original.categories?.map((category: any) => (
            <span
              key={category.id}
              className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800"
            >
              {category.name}
            </span>
          ))}
        </div>
      ),
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
              setSelectedSupplier(row.original);
              setShowProductsForm(true);
            }}
          >
            <ListBulletIcon className="h-4 w-4 mr-2" />
            产品列表
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setEditingSupplier(row.original);
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
    if (!confirm('确定要删除这个供应商吗？')) return;

    try {
      await fetch(`http://localhost:8000/api/v1/suppliers/${id}`, {
        method: 'DELETE',
      });
      fetchSuppliers();
    } catch (error) {
      console.error('Error deleting supplier:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold tracking-tight">供应商管理</h1>
        <Button onClick={() => setShowForm(true)}>
          <PlusIcon className="h-4 w-4 mr-2" />
          添加供应商
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={suppliers}
        isLoading={isLoading}
      />

      {showForm && (
        <SupplierForm
          supplier={editingSupplier}
          onClose={() => {
            setShowForm(false);
            setEditingSupplier(null);
          }}
          onSuccess={() => {
            setShowForm(false);
            setEditingSupplier(null);
            fetchSuppliers();
          }}
        />
      )}

      {showProductsForm && selectedSupplier && (
        <SupplierProducts
          supplier={selectedSupplier}
          onClose={() => {
            setShowProductsForm(false);
            setSelectedSupplier(null);
          }}
        />
      )}
    </div>
  );
} 