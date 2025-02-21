'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import { PlusIcon } from '@heroicons/react/24/outline';
import ShipForm from './ShipForm';

interface Ship {
  id: number;
  name: string;
  company_id: number;
  ship_type: string;
  capacity: number;
  status: boolean;
  created_at: string;
  updated_at: string;
  company?: {
    name: string;
  };
}

export default function ShipsPage() {
  const [ships, setShips] = useState<Ship[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingShip, setEditingShip] = useState<Ship | null>(null);

  const fetchShips = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/v1/ships/');
      const data = await response.json();
      setShips(data);
    } catch (error) {
      console.error('Error fetching ships:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchShips();
  }, []);

  const columns = [
    {
      header: 'ID',
      accessorKey: 'id',
    },
    {
      header: '船舶名称',
      accessorKey: 'name',
    },
    {
      header: '所属公司',
      accessorKey: 'company.name',
    },
    {
      header: '船舶类型',
      accessorKey: 'ship_type',
    },
    {
      header: '容量',
      accessorKey: 'capacity',
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
              setEditingShip(row.original);
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
    if (!confirm('确定要删除这艘船舶吗？')) return;

    try {
      await fetch(`http://localhost:8000/api/v1/ships/${id}`, {
        method: 'DELETE',
      });
      fetchShips();
    } catch (error) {
      console.error('Error deleting ship:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold tracking-tight">船舶管理</h1>
        <Button onClick={() => setShowForm(true)}>
          <PlusIcon className="h-4 w-4 mr-2" />
          添加船舶
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={ships}
        isLoading={isLoading}
      />

      {showForm && (
        <ShipForm
          ship={editingShip}
          onClose={() => {
            setShowForm(false);
            setEditingShip(null);
          }}
          onSuccess={() => {
            setShowForm(false);
            setEditingShip(null);
            fetchShips();
          }}
        />
      )}
    </div>
  );
} 