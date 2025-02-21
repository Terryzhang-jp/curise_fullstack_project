'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

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
  categories: Category[];  // 添加供应商可处理的类别
}

interface OrderItem {
  id: number;
  order_id: number;
  order: {
    id: number;
    order_no: string;
    ship?: {
      name: string;
    };
  };
  product: {
    id: number;
    name: string;
    code: string;
    category?: {
      id: number;
      name: string;
    };
  };
  supplier: {
    id: number;
    name: string;
  };
  quantity: number;
  price: number;
  total: number;
  status: string;
  created_at: string;
  updated_at: string;
}

interface ProductCategoryInfo {
  product_id: number;
  product_name: string;
  product_code: string;
  category: {
    id: number;
    name: string;
  };
}

interface EmailFormData {
  title: string;
  content: string;
}

export default function OrderSupplierMatchingPage() {
  const router = useRouter();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedSuppliers, setSelectedSuppliers] = useState<number[]>([]);
  const [processingItems, setProcessingItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 从localStorage获取订单项目
  useEffect(() => {
    const items = localStorage.getItem('processingItems');
    if (!items) {
      alert('没有待处理的订单项目');
      router.push('/order-processing');
      return;
    }
  }, [router]);

  // 加载供应商和类别数据
  useEffect(() => {
    const fetchData = async () => {
      try {
        // 获取供应商数据
        const suppliersResponse = await fetch('http://localhost:8000/api/v1/suppliers/');
        if (!suppliersResponse.ok) {
          throw new Error('获取供应商列表失败');
        }
        const suppliersData = await suppliersResponse.json();
        console.log('获取到的供应商原始数据:', suppliersData);
        
        const activeSuppliers = suppliersData.filter((supplier: Supplier) => supplier.status);
        console.log('过滤后的活跃供应商:', activeSuppliers);
        console.log('供应商类别信息:', activeSuppliers.map((s: Supplier) => ({
          供应商: s.name,
          类别: s.categories
        })));
        
        setSuppliers(activeSuppliers);

        // 获取类别数据
        const categoriesResponse = await fetch('http://localhost:8000/api/v1/categories/');
        if (!categoriesResponse.ok) {
          throw new Error('获取类别列表失败');
        }
        const categoriesData = await categoriesResponse.json();
        console.log('获取到的类别数据:', categoriesData);
        setCategories(categoriesData);

        // 从localStorage加载处理中的订单项
        const items = localStorage.getItem('processingItems');
        if (items) {
          const parsedItems = JSON.parse(items);
          console.log('从 localStorage 读取的原始数据:', parsedItems);
          
          // 获取所有产品ID
          const productIds = parsedItems
            .map((item: any) => item.product_id)
            .filter((id: number | undefined): id is number => id !== undefined);
          
          // 获取产品分类信息
          if (productIds.length > 0) {
            const queryParams = new URLSearchParams();
            productIds.forEach((id: number) => queryParams.append('product_ids', id.toString()));
            
            const productResponse = await fetch(
              `http://localhost:8000/api/v1/products/categories/by-ids?${queryParams.toString()}`
            );
            
            if (!productResponse.ok) {
              throw new Error('获取产品分类信息失败');
            }
            
            const productData = await productResponse.json();
            
            // 创建产品ID到分类信息的映射
            const productCategoryMap = new Map<number, ProductCategoryInfo>(
              productData.map((item: ProductCategoryInfo) => [item.product_id, item])
            );
            
            // 更新订单项的产品分类信息
            const processedItems = parsedItems.map((item: any) => {
              const productInfo = productCategoryMap.get(item.product_id);
              return {
                ...item,
                quantity: typeof item.quantity === 'string' ? parseFloat(item.quantity) : item.quantity,
                price: typeof item.price === 'string' ? parseFloat(item.price) : item.price,
                total: typeof item.total === 'string' ? parseFloat(item.total) : item.total,
                product: {
                  ...item.product,
                  category: productInfo?.category || item.product?.category
                }
              };
            });
            
            setProcessingItems(processedItems);
          }
        }
      } catch (error) {
        setError('加载数据失败');
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // 根据选择的类别筛选订单项
  const filteredProcessingItems = selectedCategory
    ? processingItems.filter(item => item.product?.category?.id === selectedCategory)
    : processingItems;

  // 根据选择的类别筛选供应商
  const filteredSuppliers = selectedCategory
    ? suppliers.filter(supplier => {
        const hasCategory = supplier.categories?.some(category => category.id === selectedCategory);
        console.log(`供应商 ${supplier.name} 的类别匹配结果:`, {
          供应商ID: supplier.id,
          供应商名称: supplier.name,
          所有类别: supplier.categories,
          选中类别ID: selectedCategory,
          是否匹配: hasCategory
        });
        return hasCategory;
      })
    : suppliers;

  const handleSupplierToggle = (supplierId: number) => {
    setSelectedSuppliers(prev => {
      if (prev.includes(supplierId)) {
        return prev.filter(id => id !== supplierId);
      } else {
        return [...prev, supplierId];
      }
    });
  };

  const handleBack = () => {
    router.push('/order-processing');
  };

  const handleSendEmail = () => {
    if (selectedSuppliers.length === 0) {
      alert('请选择至少一个供应商');
      return;
    }
    
    // 将选中的供应商ID存储到localStorage
    localStorage.setItem('selectedSuppliers', JSON.stringify(selectedSuppliers));
    // 导航到发送邮件页面
    router.push('/order-email');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            返回
          </Button>
          <h1 className="text-2xl font-bold">供应商匹配</h1>
        </div>
        <div className="flex items-center gap-4">
          <select
            className="px-4 py-2 border rounded-md"
            value={selectedCategory || ''}
            onChange={(e) => setSelectedCategory(e.target.value ? Number(e.target.value) : null)}
          >
            <option value="">选择产品类别</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>选择供应商</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {selectedCategory ? (
                filteredSuppliers.length > 0 ? (
                  filteredSuppliers.map((supplier) => (
                    <div key={supplier.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`supplier-${supplier.id}`}
                        checked={selectedSuppliers.includes(supplier.id)}
                        onCheckedChange={() => handleSupplierToggle(supplier.id)}
                      />
                      <label
                        htmlFor={`supplier-${supplier.id}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {supplier.name}
                      </label>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-gray-500">没有供应商处理该类别的产品</p>
                )
              ) : (
                <p className="text-center text-gray-500">请先选择产品类别</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>待处理订单项</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {selectedCategory ? (
                filteredProcessingItems.length > 0 ? (
                  filteredProcessingItems.map((item) => (
                    <div
                      key={item.id}
                      className="p-4 border rounded-lg"
                    >
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="font-medium">订单编号：</span>
                          {item.order?.order_no || '-'}
                        </div>
                        <div>
                          <span className="font-medium">产品名称：</span>
                          {item.product?.name || '-'}
                        </div>
                        <div>
                          <span className="font-medium">产品代码：</span>
                          {item.product?.code || '-'}
                        </div>
                        <div>
                          <span className="font-medium">产品类别：</span>
                          {item.product?.category?.name || '-'}
                        </div>
                        <div>
                          <span className="font-medium">数量：</span>
                          {item.quantity.toFixed(2)}
                        </div>
                        <div>
                          <span className="font-medium">单价：</span>
                          ¥{item.price.toFixed(2)}
                        </div>
                        <div>
                          <span className="font-medium">总价：</span>
                          ¥{item.total.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-gray-500">该类别下没有待处理订单项</p>
                )
              ) : (
                <p className="text-center text-gray-500">请先选择产品类别</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-between items-center">
        <Button onClick={handleBack} variant="outline">
          返回
        </Button>
        <div className="space-x-4">
          <Button onClick={handleSendEmail} disabled={selectedSuppliers.length === 0}>
            发送邮件
          </Button>
        </div>
      </div>
    </div>
  );
} 
