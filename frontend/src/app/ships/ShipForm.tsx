'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { getApiUrl, API_ENDPOINTS } from '@/lib/api-config';

interface Company {
  id: number;
  name: string;
}

interface Ship {
  id: number;
  name: string;
  company_id: number;
  ship_type: string;
  capacity: number;
  status: boolean;
  created_at: string;
  updated_at: string;
}

interface ShipFormProps {
  ship?: Ship | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ShipForm({ ship, onClose, onSuccess }: ShipFormProps) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [formData, setFormData] = useState({
    name: ship?.name || '',
    company_id: ship?.company_id || '',
    ship_type: ship?.ship_type || '',
    capacity: ship?.capacity || 0,
    status: ship?.status ?? true,
  });

  useEffect(() => {
    // 获取公司列表
    const fetchCompanies = async () => {
      try {
        const response = await fetch(getApiUrl(API_ENDPOINTS.COMPANIES));
        const data = await response.json();
        setCompanies(data);
        
        // 如果是新建且有公司数据，默认选择第一个公司
        if (!ship && data.length > 0) {
          setFormData(prev => ({ ...prev, company_id: data[0].id }));
        }
      } catch (error) {
        console.error('Error fetching companies:', error);
      }
    };

    fetchCompanies();
  }, [ship]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const url = ship
      ? `api/v1/ships/${ship.id}`
      : getApiUrl(API_ENDPOINTS.SHIPS);

    try {
      const response = await fetch(url, {
        method: ship ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        onSuccess();
      } else {
        const error = await response.json();
        alert(error.detail || '操作失败');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('操作失败');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">
            {ship ? '编辑船舶' : '添加船舶'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              船舶名称
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              所属公司
            </label>
            <select
              value={formData.company_id}
              onChange={(e) =>
                setFormData({ ...formData, company_id: Number(e.target.value) })
              }
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              required
            >
              <option value="">请选择公司</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              船舶类型
            </label>
            <input
              type="text"
              value={formData.ship_type}
              onChange={(e) =>
                setFormData({ ...formData, ship_type: e.target.value })
              }
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              容量
            </label>
            <input
              type="number"
              value={formData.capacity}
              onChange={(e) =>
                setFormData({ ...formData, capacity: Number(e.target.value) })
              }
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              min="0"
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              checked={formData.status}
              onChange={(e) =>
                setFormData({ ...formData, status: e.target.checked })
              }
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <label className="ml-2 block text-sm text-gray-900">启用</label>
          </div>

          <div className="flex justify-end space-x-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
            >
              取消
            </Button>
            <Button type="submit">
              {ship ? '更新' : '创建'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
} 