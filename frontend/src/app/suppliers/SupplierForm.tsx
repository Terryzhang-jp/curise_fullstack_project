'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { getApiUrl, API_ENDPOINTS } from '@/lib/api-config';

interface Country {
  id: number;
  name: string;
}

interface Category {
  id: number;
  name: string;
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
  categories: Array<{ id: number; name: string }>;
}

interface SupplierFormProps {
  supplier?: Supplier | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function SupplierForm({ supplier, onClose, onSuccess }: SupplierFormProps) {
  const [countries, setCountries] = useState<Country[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [formData, setFormData] = useState({
    name: supplier?.name || '',
    country_id: supplier?.country_id || '',
    contact: supplier?.contact || '',
    email: supplier?.email || '',
    phone: supplier?.phone || '',
    status: supplier?.status ?? true,
    category_ids: supplier?.categories?.map(c => c.id) || [],
  });

  useEffect(() => {
    // 获取国家列表
    const fetchCountries = async () => {
      try {
        const response = await fetch(getApiUrl(API_ENDPOINTS.COUNTRIES));
        const data = await response.json();
        setCountries(data);
        
        // 如果是新建且有国家数据，默认选择第一个国家
        if (!supplier && data.length > 0) {
          setFormData(prev => ({ ...prev, country_id: data[0].id }));
        }
      } catch (error) {
        console.error('Error fetching countries:', error);
      }
    };

    // 获取类别列表
    const fetchCategories = async () => {
      try {
        const response = await fetch(getApiUrl(API_ENDPOINTS.CATEGORIES));
        const data = await response.json();
        setCategories(data);
      } catch (error) {
        console.error('Error fetching categories:', error);
      }
    };

    fetchCountries();
    fetchCategories();
  }, [supplier]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // 创建一个不包含category_ids的数据对象
      const supplierData = {
        name: formData.name,
        country_id: formData.country_id,
        contact: formData.contact,
        email: formData.email,
        phone: formData.phone,
        status: formData.status,
      };

      let updatedSupplier;
      
      if (supplier) {
        // 如果是更新现有供应商
        const response = await fetch(`api/v1/suppliers/${supplier.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(supplierData),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.detail || '更新供应商失败');
        }

        updatedSupplier = await response.json();
      } else {
        // 如果是创建新供应商
        const response = await fetch(getApiUrl(API_ENDPOINTS.SUPPLIERS), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(supplierData),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.detail || '创建供应商失败');
        }

        updatedSupplier = await response.json();
      }

      // 更新类别关联
      console.log('正在更新类别，类别ID列表:', formData.category_ids);
      const categoriesUrl = `api/v1/suppliers/${updatedSupplier.id}/categories`;
      const categoriesResponse = await fetch(categoriesUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ category_ids: formData.category_ids }),
      });

      if (!categoriesResponse.ok) {
        const error = await categoriesResponse.json();
        throw new Error(error.detail || '更新类别失败');
      }

      console.log('类别更新成功');
      onSuccess();
    } catch (error) {
      console.error('Error:', error);
      alert(error instanceof Error ? error.message : '操作失败');
    }
  };

  const handleCategoryChange = (categoryId: number) => {
    setFormData(prev => {
      const currentCategories = prev.category_ids as number[];
      const newCategories = currentCategories.includes(categoryId)
        ? currentCategories.filter(id => id !== categoryId)
        : [...currentCategories, categoryId];
      return { ...prev, category_ids: newCategories };
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">
            {supplier ? '编辑供应商' : '添加供应商'}
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
              供应商名称
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
              联系人
            </label>
            <input
              type="text"
              value={formData.contact}
              onChange={(e) =>
                setFormData({ ...formData, contact: e.target.value })
              }
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              邮箱
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              电话
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) =>
                setFormData({ ...formData, phone: e.target.value })
              }
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              供应类别
            </label>
            <div className="space-y-2">
              {categories.map((category) => (
                <label key={category.id} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={(formData.category_ids as number[]).includes(category.id)}
                    onChange={() => handleCategoryChange(category.id)}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-900">{category.name}</span>
                </label>
              ))}
            </div>
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
              {supplier ? '更新' : '创建'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
} 