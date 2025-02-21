'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import { PlusIcon, ArrowUpTrayIcon, MagnifyingGlassIcon, CheckCircleIcon, XMarkIcon } from '@heroicons/react/24/outline';
import ProductForm from './ProductForm';
import { Input } from '@/components/ui/input';
import { Product, Category, Country, Supplier, TableRow } from './types';

interface DuplicateInfo {
  type: 'name_country' | 'code';
  product1: Product;
  product2: Product;
}

interface ProductHistory {
  id: number;
  name: string;
  code: string;
  category_id: number;
  country_id: number;
  supplier_id?: number;
  unit: string;
  price: number;
  status: boolean;
  effective_from?: string;
  effective_to?: string;
  change_type: string;
  changed_at: string;
  changed_by?: string;
  category?: {
    name: string;
  };
  country?: {
    name: string;
  };
  supplier?: {
    name: string;
  };
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [searchName, setSearchName] = useState('');
  const [searchCode, setSearchCode] = useState('');
  const [searchCategoryId, setSearchCategoryId] = useState<string>('');
  const [searchCountryId, setSearchCountryId] = useState<string>('');
  const [duplicates, setDuplicates] = useState<DuplicateInfo[]>([]);
  const [isAscending, setIsAscending] = useState(true);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productHistory, setProductHistory] = useState<ProductHistory[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = async () => {
    try {
      console.log('开始获取产品列表...');
      const response = await fetch('http://localhost:8000/api/v1/products/');
      console.log('API 响应状态:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API 错误响应:', errorText);
        throw new Error(`API 请求失败: ${response.status} ${errorText}`);
      }
      
      const data = await response.json();
      console.log('API 返回的原始数据:', JSON.stringify(data, null, 2));
      
      if (!Array.isArray(data)) {
        console.error('返回的数据不是数组:', data);
        throw new Error('返回的数据格式不正确');
      }
      
      // 详细记录每个产品的处理过程
      const processedData = data.map((product: Product, index) => {
        console.log(`\n处理第 ${index + 1} 个产品:`, product);
        
        // 确保关联对象的结构完整
        const processed = {
          ...product,
          category: product.category ? {
            name: product.category.name || null
          } : { name: null },
          country: product.country ? {
            name: product.country.name || null
          } : { name: null },
          supplier: product.supplier ? {
            name: product.supplier.name || null
          } : { name: null }
        };
        
        console.log('处理后的产品数据:', processed);
        return processed;
      });
      
      console.log('\n最终处理后的数据:', processedData);
      setProducts(processedData);
    } catch (error) {
      console.error('获取产品列表失败:', error);
      setError(error instanceof Error ? error.message : '获取产品列表失败');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCountries = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/v1/countries/');
      const data = await response.json();
      setCountries(data);
    } catch (error) {
      console.error('Error fetching countries:', error);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/v1/categories/');
      const data = await response.json();
      setCategories(data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/v1/suppliers/');
      const data = await response.json();
      setSuppliers(data);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
    }
  };

  const fetchProductHistory = async (productId: number) => {
    try {
      const response = await fetch(`http://localhost:8000/api/v1/products/${productId}/history`);
      const data = await response.json();
      setProductHistory(data);
    } catch (error) {
      console.error('Error fetching product history:', error);
    }
  };

  const searchProducts = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      
      // 只有在有值时才添加参数
      if (searchName?.trim()) {
        params.append('name', searchName.trim());
      }
      if (searchCode?.trim()) {
        params.append('code', searchCode.trim());
      }
      if (searchCategoryId && searchCategoryId !== '') {
        const categoryIdNum = parseInt(searchCategoryId);
        console.log('Category ID before conversion:', searchCategoryId);
        console.log('Category ID after conversion:', categoryIdNum);
        if (!isNaN(categoryIdNum)) {
          params.append('category_id', categoryIdNum.toString());
        }
      }
      if (searchCountryId && searchCountryId !== '') {
        const countryIdNum = parseInt(searchCountryId);
        console.log('Country ID before conversion:', searchCountryId);
        console.log('Country ID after conversion:', countryIdNum);
        if (!isNaN(countryIdNum)) {
          params.append('country_id', countryIdNum.toString());
        }
      }

      // 如果没有任何搜索条件，则获取所有产品
      if (!params.toString()) {
        return fetchProducts();
      }
      
      const url = `http://localhost:8000/api/v1/products/search?${params.toString()}`;
      console.log('发送请求到:', url);
      
      const response = await fetch(url);
      console.log('Response status:', response.status);
      
      const responseData = await response.json();
      console.log('搜索返回的原始数据:', responseData);
      
      if (!response.ok) {
        throw new Error(JSON.stringify(responseData.detail));
      }
      
      // 处理搜索结果数据
      const processedData = responseData.map((product: Product) => ({
        ...product,
        country: product.country || { name: null },
        category: product.category || { name: null },
        supplier: product.supplier || { name: null }
      }));
      
      console.log('处理后的数据:', processedData);
      setProducts(processedData);
    } catch (error) {
      console.error('搜索失败:', error);
      if (error instanceof Error) {
        alert('搜索失败: ' + error.message);
      } else {
        alert('搜索失败，请检查输入是否正确');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const checkProducts = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(
        `http://localhost:8000/api/v1/products/check?order_by_code=true&ascending=${isAscending}`
      );
      const data = await response.json();
      console.log('检查返回的原始数据:', data);
      
      // 处理产品数据
      const processedProducts = data.products.map((product: Product) => ({
        ...product,
        country: product.country || { name: null },
        category: product.category || { name: null },
        supplier: product.supplier || { name: null }
      }));
      
      console.log('处理后的产品数据:', processedProducts);
      setProducts(processedProducts);
      setDuplicates(data.duplicates);
      
      if (data.duplicates.length > 0) {
        const message = data.duplicates.map((dup: DuplicateInfo) => {
          if (dup.type === 'code') {
            return `发现重复的产品代码: ${dup.product1.code}`;
          } else {
            return `发现重复的产品名称和国家组合: ${dup.product1.name}`;
          }
        }).join('\n');
        alert(`检查结果:\n${message}`);
      } else {
        alert('没有发现重复的产品！');
      }
      
      setIsAscending(!isAscending);
    } catch (error) {
      console.error('检查产品失败:', error);
      setError('检查产品失败');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const initializeData = async () => {
      setIsLoading(true);
      try {
        await Promise.all([
          fetchProducts(),
          fetchCategories(),
          fetchCountries(),
          fetchSuppliers(),
        ]);
      } catch (error) {
        setError(error instanceof Error ? error.message : '加载数据失败');
      } finally {
        setIsLoading(false);
      }
    };

    initializeData();
  }, []);

  const handleUpload = async (file: File, supplierId: number) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('supplier_id', supplierId.toString());

    try {
      const response = await fetch('http://localhost:8000/api/v1/products/upload', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        fetchProducts();
        setShowUploadForm(false);
        alert('文件上传成功！');
      } else {
        const error = await response.json();
        alert(error.detail || '上传失败');
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('上传失败');
    }
  };

  const columns = [
    {
      header: 'ID',
      accessorKey: 'id',
    },
    {
      header: '产品名称',
      accessorKey: 'name',
    },
    {
      header: '产品代码',
      accessorKey: 'code',
      cell: ({ row }: { row: TableRow }) => row.original.code || '-'
    },
    {
      header: '所属类别',
      id: 'category',
      accessorFn: (row: Product) => {
        const categoryName = row?.category?.name;
        console.log('类别数据:', {
          产品ID: row.id,
          产品名称: row.name,
          原始数据: row.category,
          处理后的名称: categoryName
        });
        return categoryName || '-';
      },
    },
    {
      header: '所属国家',
      id: 'country',
      accessorFn: (row: Product) => {
        const countryName = row?.country?.name;
        console.log('国家数据:', {
          产品ID: row.id,
          产品名称: row.name,
          原始数据: row.country,
          处理后的名称: countryName
        });
        return countryName || '-';
      },
    },
    {
      header: '供应商',
      id: 'supplier',
      accessorFn: (row: Product) => {
        const supplierName = row?.supplier?.name;
        console.log('供应商数据:', {
          产品ID: row.id,
          产品名称: row.name,
          原始数据: row.supplier,
          处理后的名称: supplierName
        });
        return supplierName || '-';
      },
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
      cell: ({ row }: { row: any }) => {
        const date = row.original.effective_from;
        if (!date) return '-';
        return new Date(date).toLocaleString('zh-CN', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        });
      }
    },
    {
      header: '价格失效时间',
      accessorKey: 'effective_to',
      cell: ({ row }: { row: any }) => {
        const date = row.original.effective_to;
        if (!date) return '永久有效';
        return new Date(date).toLocaleString('zh-CN', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        });
      }
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
              setEditingProduct(row.original);
              setShowForm(true);
            }}
          >
            编辑
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSelectedProduct(row.original);
              fetchProductHistory(row.original.id);
              setShowHistory(true);
            }}
          >
            历史记录
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
    if (!confirm('确定要删除这个产品吗？')) return;

    try {
      await fetch(`http://localhost:8000/api/v1/products/${id}`, {
        method: 'DELETE',
      });
      fetchProducts();
    } catch (error) {
      console.error('Error deleting product:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold tracking-tight">产品管理</h1>
        <div className="flex gap-4">
          <div className="flex gap-2 items-center">
            <Input
              type="text"
              placeholder="产品名称..."
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              className="w-40"
            />
            <Input
              type="text"
              placeholder="产品代码..."
              value={searchCode}
              onChange={(e) => setSearchCode(e.target.value)}
              className="w-40"
            />
            <select
              value={searchCategoryId}
              onChange={(e) => setSearchCategoryId(e.target.value)}
              className="w-40 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
            >
              <option value="">所有类别</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <select
              value={searchCountryId}
              onChange={(e) => setSearchCountryId(e.target.value)}
              className="w-40 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
            >
              <option value="">所有国家</option>
              {countries.map((country) => (
                <option key={country.id} value={country.id}>
                  {country.name}
                </option>
              ))}
            </select>
            <Button
              variant="outline"
              onClick={searchProducts}
            >
              <MagnifyingGlassIcon className="h-4 w-4 mr-2" />
              搜索
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setSearchName('');
                setSearchCode('');
                setSearchCategoryId('');
                setSearchCountryId('');
                fetchProducts();
              }}
            >
              重置
            </Button>
          </div>
          <Button
            variant="outline"
            onClick={checkProducts}
          >
            <CheckCircleIcon className="h-4 w-4 mr-2" />
            检查
          </Button>
          <Button onClick={() => setShowUploadForm(true)}>
            <ArrowUpTrayIcon className="h-4 w-4 mr-2" />
            导入产品
          </Button>
          <Button onClick={() => setShowForm(true)}>
            <PlusIcon className="h-4 w-4 mr-2" />
            添加产品
          </Button>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={products}
        isLoading={isLoading}
      />

      {showForm && (
        <ProductForm
          product={editingProduct}
          onClose={() => {
            setShowForm(false);
            setEditingProduct(null);
          }}
          onSuccess={() => {
            setShowForm(false);
            setEditingProduct(null);
            fetchProducts();
          }}
        />
      )}

      {showUploadForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">导入产品</h2>
              <button
                onClick={() => setShowUploadForm(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const file = formData.get('file') as File;
              const supplierId = parseInt(formData.get('supplier_id') as string);
              if (file && supplierId) {
                handleUpload(file, supplierId);
              }
            }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  选择供应商
                </label>
                <select
                  name="supplier_id"
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

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  选择文件
                </label>
                <input
                  type="file"
                  name="file"
                  accept=".xlsx,.csv"
                  className="mt-1 block w-full text-sm text-gray-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-md file:border-0
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
                  onClick={() => setShowUploadForm(false)}
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
      )}

      {showHistory && selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">产品历史记录 - {selectedProduct.name}</h2>
              <button
                onClick={() => setShowHistory(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">修改时间</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">修改类型</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">名称</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">价格</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">生效时间</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">失效时间</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">状态</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {productHistory.map((history) => (
                  <tr key={history.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(history.changed_at).toLocaleString('zh-CN')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {history.change_type === 'update' ? '更新' : '删除'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{history.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ¥{Number(history.price).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {history.effective_from ? new Date(history.effective_from).toLocaleString('zh-CN') : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {history.effective_to ? new Date(history.effective_to).toLocaleString('zh-CN') : '永久有效'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 py-1 rounded-full ${
                        history.status ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {history.status ? '启用' : '禁用'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
} 