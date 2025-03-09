'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { getApiUrl, API_ENDPOINTS } from '@/lib/api-config';

interface OrderAnalysisItem {
  id: number;
  product_code: string;
  quantity: number;
  unit: string;
  unit_price: number;
  description: string;
  matched_product?: {
    name: string;
    code: string;
  };
  category?: {
    name: string;
  };
}

interface Supplier {
  id: number;
  name: string;
  contact: string;
  email: string;
  phone: string;
}

interface OrderAssignmentFormProps {
  items: OrderAnalysisItem[];
  onClose: () => void;
  onSuccess: () => void;
}

interface Assignments {
  [key: number]: {
    quantity: number;
    unit_price: number;
  };
}

export default function OrderAssignmentForm({ items, onClose, onSuccess }: OrderAssignmentFormProps) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<number | null>(null);
  const [assignments, setAssignments] = useState<Assignments>(() =>
    Object.fromEntries(
      items.map(item => [
        item.id,
        { quantity: item.quantity, unit_price: item.unit_price }
      ])
    )
  );

  useEffect(() => {
    const fetchSuppliers = async () => {
      try {
        const response = await fetch(getApiUrl(API_ENDPOINTS.SUPPLIERS));
        const data = await response.json();
        setSuppliers(data);
      } catch (error) {
        console.error('Error fetching suppliers:', error);
      }
    };

    fetchSuppliers();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedSupplier) {
      alert('请选择供应商');
      return;
    }

    const assignmentData = {
      supplier_id: selectedSupplier,
      items: Object.entries(assignments).map(([itemId, data]) => ({
        analysis_item_id: Number(itemId),
        quantity: data.quantity,
        unit_price: data.unit_price,
      })),
    };

    try {
      const response = await fetch(getApiUrl(API_ENDPOINTS.ORDER-ANALYSIS), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(assignmentData),
      });

      if (response.ok) {
        onSuccess();
      } else {
        const error = await response.json();
        alert(error.detail || '分配失败');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('分配失败');
    }
  };

  const handleQuantityChange = (itemId: number, value: number) => {
    setAssignments(prev => ({
      ...prev,
      [itemId]: { ...prev[itemId], quantity: value },
    }));
  };

  const handlePriceChange = (itemId: number, value: number) => {
    setAssignments(prev => ({
      ...prev,
      [itemId]: { ...prev[itemId], unit_price: value },
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center overflow-auto">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl m-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">分配订单</h2>
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
              选择供应商
            </label>
            <select
              value={selectedSupplier || ''}
              onChange={(e) => setSelectedSupplier(e.target.value ? Number(e.target.value) : null)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              required
            >
              <option value="">请选择供应商</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    产品代码
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    产品名称
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    类别
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    数量
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    单位
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    单价
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.product_code}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.matched_product ? item.matched_product.name : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.category ? item.category.name : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <input
                        type="number"
                        value={assignments[item.id].quantity}
                        onChange={(e) => handleQuantityChange(item.id, Number(e.target.value))}
                        className="w-24 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        min="0"
                        step="0.01"
                        required
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.unit}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <input
                        type="number"
                        value={assignments[item.id].unit_price}
                        onChange={(e) => handlePriceChange(item.id, Number(e.target.value))}
                        className="w-24 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        min="0"
                        step="0.01"
                        required
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
              确认分配
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
} 