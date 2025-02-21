import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import { XMarkIcon, PencilIcon } from '@heroicons/react/24/outline';

interface Supplier {
  id: number;
  name: string;
  contact: string;
  phone: string;
  status: boolean;
}

interface Product {
  id: number;
  name: string;
  code: string;
  category_id: number;
  country_id: number;
  unit: string;
  price: number;
  effective_from: string;
  effective_to: string | null;
  status: boolean;
  category?: {
    name: string;
  };
  country?: {
    name: string;
  };
}

interface Category {
  id: number;
  name: string;
}

interface Country {
  id: number;
  name: string;
}

interface Props {
  supplier: Supplier;
  onClose: () => void;
}

export default function SupplierProducts({ supplier, onClose }: Props) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
    fetchCountries();
  }, [supplier.id]);

  const fetchProducts = async () => {
    try {
      const response = await fetch(`http://localhost:8000/api/v1/products/search?supplier_id=${supplier.id}`);
      if (!response.ok) {
        throw new Error('获取产品列表失败');
      }
      const data = await response.json();
      setProducts(data);
    } catch (error) {
      console.error('获取产品列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/v1/categories/');
      const data = await response.json();
      setCategories(data);
    } catch (error) {
      console.error('获取类别列表失败:', error);
    }
  };

  const fetchCountries = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/v1/countries/');
      const data = await response.json();
      setCountries(data);
    } catch (error) {
      console.error('获取国家列表失败:', error);
    }
  };

  const handleEdit = async (formData: any) => {
    if (!editingProduct) return;

    try {
      const response = await fetch(`http://localhost:8000/api/v1/products/${editingProduct.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          supplier_id: supplier.id,
        }),
      });

      if (!response.ok) {
        throw new Error('更新产品失败');
      }

      const updatedProduct = await response.json();
      setProducts(products.map(p => p.id === updatedProduct.id ? updatedProduct : p));
      setShowEditForm(false);
      setEditingProduct(null);
    } catch (error) {
      console.error('更新产品失败:', error);
    }
  };

  const handleDelete = async (productId: number) => {
    if (!confirm('确定要删除这个产品吗？')) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:8000/api/v1/products/${productId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('删除产品失败');
      }

      setProducts(products.filter(product => product.id !== productId));
    } catch (error) {
      console.error('删除产品失败:', error);
    }
  };

  const columns = [
    {
      header: '产品名称',
      accessorKey: 'name',
    },
    {
      header: '产品代码',
      accessorKey: 'code',
    },
    {
      header: '类别',
      accessorKey: 'category.name',
    },
    {
      header: '国家',
      accessorKey: 'country.name',
    },
    {
      header: '单位',
      accessorKey: 'unit',
    },
    {
      header: '价格',
      accessorKey: 'price',
      cell: ({ row }: { row: any }) => (
        <span>¥{row.original.price.toFixed(2)}</span>
      ),
    },
    {
      header: '价格生效时间',
      accessorKey: 'effective_from',
      cell: ({ row }: { row: any }) => (
        <span>
          {row.original.effective_from 
            ? new Date(row.original.effective_from).toLocaleString('zh-CN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
              })
            : '-'}
        </span>
      ),
    },
    {
      header: '价格失效时间',
      accessorKey: 'effective_to',
      cell: ({ row }: { row: any }) => (
        <span>
          {row.original.effective_to 
            ? new Date(row.original.effective_to).toLocaleString('zh-CN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
              })
            : '永久有效'}
        </span>
      ),
    },
    {
      header: '状态',
      accessorKey: 'status',
      cell: ({ row }: { row: any }) => (
        <span>{row.original.status ? '启用' : '禁用'}</span>
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
              setEditingProduct(row.original);
              setShowEditForm(true);
            }}
          >
            <PencilIcon className="h-4 w-4 mr-2" />
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

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg w-[80%] max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">
            {supplier.name} - 产品列表
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
          >
            <XMarkIcon className="h-5 w-5" />
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-4">加载中...</div>
        ) : (
          <DataTable
            columns={columns}
            data={products}
          />
        )}

        {showEditForm && editingProduct && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg w-full max-w-md">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">编辑产品</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowEditForm(false);
                    setEditingProduct(null);
                  }}
                  className="h-8 w-8 p-0"
                >
                  <XMarkIcon className="h-4 w-4" />
                </Button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  const data = {
                    name: formData.get('name'),
                    code: formData.get('code'),
                    category_id: Number(formData.get('category_id')),
                    country_id: Number(formData.get('country_id')),
                    unit: formData.get('unit'),
                    price: Number(formData.get('price')),
                    effective_from: formData.get('effective_from'),
                    effective_to: formData.get('effective_to') || null,
                    status: Boolean(formData.get('status')),
                  };
                  handleEdit(data);
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium text-gray-700">产品名称</label>
                  <input
                    type="text"
                    name="name"
                    defaultValue={editingProduct.name}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">产品代码</label>
                  <input
                    type="text"
                    name="code"
                    defaultValue={editingProduct.code}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">类别</label>
                  <select
                    name="category_id"
                    defaultValue={editingProduct.category_id}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    required
                  >
                    {categories.map(category => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">国家</label>
                  <select
                    name="country_id"
                    defaultValue={editingProduct.country_id}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    required
                  >
                    {countries.map(country => (
                      <option key={country.id} value={country.id}>
                        {country.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">单位</label>
                  <input
                    type="text"
                    name="unit"
                    defaultValue={editingProduct.unit}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">价格</label>
                  <input
                    type="number"
                    name="price"
                    defaultValue={editingProduct.price}
                    step="0.01"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">价格生效时间</label>
                  <input
                    type="datetime-local"
                    name="effective_from"
                    defaultValue={editingProduct.effective_from ? editingProduct.effective_from.slice(0, 16) : new Date().toISOString().slice(0, 16)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">价格失效时间</label>
                  <input
                    type="datetime-local"
                    name="effective_to"
                    defaultValue={editingProduct.effective_to ? editingProduct.effective_to.slice(0, 16) : ''}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    name="status"
                    defaultChecked={editingProduct.status}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <label className="ml-2 block text-sm text-gray-900">启用</label>
                </div>

                <div className="flex justify-end space-x-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowEditForm(false);
                      setEditingProduct(null);
                    }}
                  >
                    取消
                  </Button>
                  <Button type="submit">
                    保存
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 