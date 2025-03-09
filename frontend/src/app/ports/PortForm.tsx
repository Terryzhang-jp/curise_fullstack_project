'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { getApiUrl, API_ENDPOINTS } from '@/lib/api-config';

interface Country {
  id: number;
  name: string;
  code: string;
}

interface Port {
  id: number;
  name: string;
  country_id: number;
  location: string;
  status: boolean;
  created_at: string;
  updated_at: string;
}

interface PortFormProps {
  port?: Port | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function PortForm({ port, onClose, onSuccess }: PortFormProps) {
  const [countries, setCountries] = useState<Country[]>([]);
  const [formData, setFormData] = useState({
    name: port?.name || '',
    country_id: port?.country_id || '',
    location: port?.location || '',
    status: port?.status ?? true,
  });

  useEffect(() => {
    // 获取国家列表
    const fetchCountries = async () => {
      try {
        const response = await fetch(getApiUrl(API_ENDPOINTS.COUNTRIES));
        const data = await response.json();
        setCountries(data);
        
        // 如果是新建且有国家数据，默认选择第一个国家
        if (!port && data.length > 0) {
          setFormData(prev => ({ ...prev, country_id: data[0].id }));
        }
      } catch (error) {
        console.error('Error fetching countries:', error);
      }
    };

    fetchCountries();
  }, [port]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const url = port
      ? `api/v1/ports/${port.id}`
      : getApiUrl(API_ENDPOINTS.PORTS);

    try {
      const response = await fetch(url, {
        method: port ? 'PUT' : 'POST',
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
            {port ? '编辑港口' : '添加港口'}
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
              港口名称
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
              所属国家
            </label>
            <select
              value={formData.country_id}
              onChange={(e) =>
                setFormData({ ...formData, country_id: Number(e.target.value) })
              }
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              required
            >
              <option value="">请选择国家</option>
              {countries.map((country) => (
                <option key={country.id} value={country.id}>
                  {country.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              位置
            </label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) =>
                setFormData({ ...formData, location: e.target.value })
              }
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
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
              {port ? '更新' : '创建'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
} 