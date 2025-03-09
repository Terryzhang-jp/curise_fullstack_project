'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { getApiUrl, API_ENDPOINTS } from '@/lib/api-config';

interface Country {
  id: number;
  name: string;
}

interface Ship {
  id: number;
  name: string;
  company_id: number;
}

interface FormData {
  country_id: number;
  ship_id: number;
}

interface OrderUploadFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function OrderUploadForm({ onClose, onSuccess }: OrderUploadFormProps) {
  const [countries, setCountries] = useState<Country[]>([]);
  const [ships, setShips] = useState<Ship[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [formData, setFormData] = useState<FormData>({
    country_id: 0,
    ship_id: 0,
  });

  useEffect(() => {
    // 获取国家列表
    const fetchCountries = async () => {
      try {
        const response = await fetch(getApiUrl(API_ENDPOINTS.COUNTRIES));
        const data = await response.json();
        setCountries(data);
        
        // 默认选择第一个国家
        if (data.length > 0) {
          setFormData(prev => ({ ...prev, country_id: data[0].id }));
        }
      } catch (error) {
        console.error('Error fetching countries:', error);
      }
    };

    // 获取船舶列表
    const fetchShips = async () => {
      try {
        const response = await fetch(getApiUrl(API_ENDPOINTS.SHIPS));
        const data = await response.json();
        setShips(data);
        
        // 默认选择第一艘船
        if (data.length > 0) {
          setFormData(prev => ({ ...prev, ship_id: data[0].id }));
        }
      } catch (error) {
        console.error('Error fetching ships:', error);
      }
    };

    fetchCountries();
    fetchShips();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedFile) {
      alert('请选择要上传的文件');
      return;
    }

    const formDataToSend = new FormData();
    formDataToSend.append('file', selectedFile);
    formDataToSend.append('country_id', formData.country_id.toString());
    formDataToSend.append('ship_id', formData.ship_id.toString());

    try {
      const response = await fetch(getApiUrl(API_ENDPOINTS.ORDER_ANALYSIS_UPLOAD), {
        method: 'POST',
        body: formDataToSend,
      });

      if (response.ok) {
        onSuccess();
      } else {
        const error = await response.json();
        alert(error.detail || '上传失败');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('上传失败');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">上传订单</h2>
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
              选择国家
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
              选择船舶
            </label>
            <select
              value={formData.ship_id}
              onChange={(e) =>
                setFormData({ ...formData, ship_id: Number(e.target.value) })
              }
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              required
            >
              <option value="">请选择船舶</option>
              {ships.map((ship) => (
                <option key={ship.id} value={ship.id}>
                  {ship.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              上传文件
            </label>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              className="mt-1 block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-full file:border-0
                file:text-sm file:font-semibold
                file:bg-indigo-50 file:text-indigo-700
                hover:file:bg-indigo-100"
              required
            />
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
              上传
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
} 