'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Spinner } from '@/components/ui/spinner';
import { getApiUrl, API_ENDPOINTS } from '@/lib/api-config';

interface Category {
  id: number;
  name: string;
}

interface Supplier {
  id: number;
  name: string;
  email: string;
  is_current?: boolean;
}

interface OrderItem {
  id: number;
  order_id: number;
  supplier_id?: number;
  order?: {
    id: number;
    order_no: string;
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
  supplier?: {
    id: number;
    name: string;
  };
  quantity: number;
  price: number;
  total: number;
  status?: string;
}

// 简化后的产品-供应商映射关系，格式：{ productId: Supplier[] }
interface ProductSupplierMap {
  [productId: string]: Supplier[];
}

interface EmailFormData {
  title: string;
  content: string;
}

export default function OrderSupplierMatchingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [processingItems, setProcessingItems] = useState<OrderItem[]>([]);
  const [productSupplierMap, setProductSupplierMap] = useState<ProductSupplierMap>({});
  const [matchableProductIds, setMatchableProductIds] = useState<number[]>([]);
  const [selectedProductIds, setSelectedProductIds] = useState<number[]>([]);

  // 加载数据
  useEffect(() => {
    fetchData();
  }, []);

  // 当处理项目或供应商数据更新时，获取产品-供应商映射
  useEffect(() => {
    if (processingItems.length > 0) {
      console.log('处理项目或供应商数据已更新，重新获取产品-供应商映射...');
      // 将localStorage中的数据显示在控制台上方便调试
      console.log('处理项目详情:', processingItems.map(item => ({
        id: item.id,
        productId: item.product?.id,
        productName: item.product?.name,
        productCode: item.product?.code,
        categoryId: item.product?.category?.id,
        categoryName: item.product?.category?.name
      })));
      fetchProductSupplierMapping();
    }
  }, [processingItems, suppliers]);

  const handleBack = () => {
    router.push('/order-categorization');
  };

    const fetchData = async () => {
      try {
      setLoading(true);
      setError(null);
      
      // 清空选择状态
      setSelectedSupplier(null);
      setMatchableProductIds([]);
      setSelectedProductIds([]);
      
      // 从localStorage获取分类处理后的数据
      const storedItems = localStorage.getItem('processingItems');
      if (storedItems) {
        let items: OrderItem[] = [];
        try {
          items = JSON.parse(storedItems);
          
          // 检查并修复产品数据
          items = items.map(item => {
            // 确保product存在
            if (!item.product) {
              console.warn(`订单项 ${item.id} 缺少产品数据，正在设置为空对象`);
              item.product = {
                id: 0,
                name: '未知产品',
                code: '无代码'
              };
            }
            
            // 确保产品ID是数字且有效，尝试从代码中提取ID
            if (item.product && (typeof item.product.id !== 'number' || item.product.id <= 0)) {
              console.warn(`订单项 ${item.id} 的产品ID不是有效数字：`, item.product.id);
              
              if (item.product.code) {
                // 尝试从代码中提取ID，例如从"99PRD011031"提取"11031"
                const codeMatch = item.product.code.match(/(\d+)$/);
                if (codeMatch && codeMatch[1]) {
                  const extractedId = parseInt(codeMatch[1], 10);
                  console.log(`从代码 ${item.product.code} 提取的产品ID：`, extractedId);
                  item.product.id = extractedId;
                } else {
                  console.warn(`无法从代码 ${item.product.code} 提取数字ID`);
                  // 如果无法提取，设置一个基于代码的唯一标识
                  item.product.id = parseInt(item.product.code.replace(/\D/g, '') || '0', 10);
                }
              } else {
                // 如果没有产品代码，使用订单项ID作为产品ID的备用值
                console.warn(`订单项 ${item.id} 没有产品代码，使用订单项ID作为产品ID`);
                item.product.id = item.id;
              }
            }
            
            return item;
          });
        } catch (e) {
          console.error('解析localStorage数据失败:', e);
          items = [];
        }
        
        console.log('从localStorage加载的处理项目数量:', items.length);
        
        // 验证处理项中的产品数据
        const validItems = items.filter(item => 
          item.product && 
          typeof item.product.id === 'number' && 
          item.product.id > 0
        );
        
        console.log('有效产品数量:', validItems.length, '无效产品数量:', items.length - validItems.length);
        
        // 如果没有有效的产品数据，打印详细信息以帮助调试
        if (validItems.length === 0 && items.length > 0) {
          console.warn('警告: 没有找到有效的产品数据。请检查localStorage中的数据结构:');
          console.log('全部处理项目:', items);
          
          // 显示每个处理项的详细信息，以便找出问题
          items.forEach((item, index) => {
            console.log(`处理项 #${index + 1}:`, {
              id: item.id,
              productExists: !!item.product,
              productId: item.product?.id,
              productIdType: item.product ? typeof item.product.id : 'N/A',
              productCode: item.product?.code
            });
          });
        }
        
        setProcessingItems(items);
      } else {
        throw new Error('没有找到需要处理的订单项');
      }
      
      // 获取所有供应商
      await fetchSuppliers();
    } catch (error) {
      console.error('获取数据失败:', error);
      setError(error instanceof Error ? error.message : '加载数据时出错');
    } finally {
      setLoading(false);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('api/v1/suppliers?status=true', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('获取供应商数据失败');
      }
      
      const data = await response.json();
      setSuppliers(data);
    } catch (error) {
      console.error('获取供应商失败:', error);
      setError('无法获取供应商数据');
    }
  };

  // 获取产品-供应商映射关系（使用新的API）
  const fetchProductSupplierMapping = async () => {
    // 从处理项中提取产品代码，而不是ID
    const validProducts = processingItems
      .filter(item => item.product && item.product.code)
      .map(item => item.product.code);
    
    // 如果没有有效产品代码，则不需要获取映射关系
    if (validProducts.length === 0) {
      console.log('没有有效的产品代码需要获取映射关系');
      // 显示处理项目，帮助判断原因
      console.warn('当前处理项目数据:', processingItems);
      
      // 如果有处理项但没有产品代码，可能是数据结构问题
      if (processingItems.length > 0) {
        // 尝试手动从localStorage获取数据并分析结构
        try {
          const storedItems = localStorage.getItem('processingItems');
          if (storedItems) {
            console.log('原始localStorage数据:', storedItems);
            const items = JSON.parse(storedItems);
            console.log('尝试重新解析localStorage数据，找到项目数:', items.length);
            
            // 打印整个数据结构以分析
            console.log('数据结构详情:', JSON.stringify(items, null, 2));
            
            // 检查产品代码
            console.log('产品代码列表:', items.map((item: any) => 
              typeof item.product === 'object' ? item.product?.code : '无效产品'
            ));
          }
        } catch (e) {
          console.error('重新解析localStorage数据出错:', e);
        }
      }
      
      // 手动测试API连接性
      try {
        const testProductCodes = ['99PRD011031', '99PRD011027', '99PRD011023']; // 测试产品代码
        console.log('正在使用测试产品代码测试API连接...', testProductCodes);
        
        const token = localStorage.getItem('token');
        
        fetch(getApiUrl(API_ENDPOINTS.PRODUCTS), {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(testProductCodes) // 直接发送产品代码数组
        })
        .then(response => {
          console.log('API测试响应状态:', response.status);
          if (!response.ok) {
            return response.text().then(text => {
              console.error('API错误响应文本:', text);
              throw new Error(`API错误: ${response.status} ${text}`);
            });
          }
          return response.json();
        })
        .then(data => {
          console.log('API测试响应数据:', data);
        })
        .catch(error => {
          console.error('API测试出错:', error);
        });
      } catch (e) {
        console.error('API测试异常:', e);
      }
      
      return;
    }
    
    console.log('正在获取产品-供应商映射关系（使用产品代码）...', validProducts);
    setLoading(true);
    
    try {
      const token = localStorage.getItem('token');
      
      console.log('发送请求数据（产品代码）:', validProducts);
      
      const response = await fetch(getApiUrl(API_ENDPOINTS.PRODUCTS), {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(validProducts) // 直接发送产品代码数组
      });
      
      console.log('API响应状态:', response.status);
      
      if (!response.ok) {
        let errorText;
        try {
          errorText = await response.text();
        } catch (e) {
          errorText = '无法获取错误详情';
        }
        console.error('API错误响应:', errorText);
        throw new Error(`获取产品-供应商映射失败: ${response.status} ${errorText}`);
      }
      
      const data = await response.json();
      console.log('获取到的产品-供应商映射:', data);
      
      // 直接使用API返回的产品代码到供应商的映射
      const productSupplierMapping = data || {};
      
      // 检查返回的数据是否符合预期结构
      if (!data || Object.keys(data).length === 0) {
        console.warn('API返回了空的映射数据，这可能是正常的（如果没有匹配），也可能是API实现问题');
      } else {
        console.log('映射数据包含的产品数量:', Object.keys(data).length);
        
        // 检查每个产品的供应商数量
        Object.entries(data).forEach(([productCode, suppliers]: [string, any]) => {
          const suppliersArray = suppliers as Supplier[];
          console.log(`产品代码 ${productCode} 匹配的供应商数量:`, suppliersArray.length);
        });
      }
      
      setProductSupplierMap(productSupplierMapping);
      } catch (error) {
      console.error('获取供应商映射出错:', error);
      setError('无法获取供应商匹配数据');
      
      // 出错时设置空映射，避免界面报错
      setProductSupplierMap({});
      } finally {
        setLoading(false);
      }
    };

  // 判断产品是否匹配特定供应商
  const isProductMatchedWithSupplier = (productCode: string | undefined, supplierId: number): boolean => {
    if (!productCode || !productSupplierMap) return false;
    
    const suppliers = productSupplierMap[productCode] || [];
    
    // 增加日志以便调试
    if (suppliers.length > 0) {
      console.log(`检查产品${productCode}与供应商${supplierId}是否匹配:`, 
        suppliers.some(supplier => supplier.id === supplierId),
        '供应商列表:', suppliers.map(s => s.id));
    }
    
    return suppliers.some(supplier => supplier.id === supplierId);
  };
  
  // 获取可以匹配特定产品的所有供应商
  const getProductSuppliers = (productCode: string | undefined): Supplier[] => {
    if (!productCode || !productSupplierMap) return [];
    
    const suppliers = productSupplierMap[productCode] || [];
    
    // 增加日志以便调试
    console.log(`获取产品${productCode}的供应商:`, suppliers.length > 0 ? '找到' : '未找到', 
      `${suppliers.length}个供应商`);
    
    return suppliers;
  };

  // 点击供应商，显示可以由该供应商供应的产品
  const handleSupplierClick = (supplier: Supplier) => {
    console.log('供应商被点击:', supplier.name, 'ID:', supplier.id);
    
    // 如果点击已选中的供应商，则取消选择
    if (selectedSupplier && selectedSupplier.id === supplier.id) {
      setSelectedSupplier(null);
      setMatchableProductIds([]);
      setSelectedProductIds([]);
      return;
    }
    
    setSelectedSupplier(supplier);
    
    // 检查映射表状态
    console.log('当前产品-供应商映射表状态:', 
      '键数量:', Object.keys(productSupplierMap).length,
      '映射表键列表:', Object.keys(productSupplierMap));
    
    if (Object.keys(productSupplierMap).length === 0) {
      console.warn('供应商映射表为空，请检查API返回数据');
    }
    
    // 检查处理项列表
    console.log('处理项数量:', processingItems.length);
    processingItems.forEach((item, index) => {
      if (item.product) {
        console.log(`处理项 ${index+1}: ID=${item.id}, 产品代码=${item.product.code}, 产品ID=${item.product.id}`);
      } else {
        console.log(`处理项 ${index+1}: ID=${item.id}, 无产品数据`);
      }
    });
    
    // 找出可以由该供应商提供的所有产品
    const matchableIds = processingItems
      .filter(item => {
        if (!item.product || !item.product.code) {
          console.log(`订单项 ${item.id} 没有有效的产品数据或产品代码`);
          return false;
        }
        
        const isMatched = isProductMatchedWithSupplier(item.product.code, supplier.id);
        console.log(`订单项 ${item.id} (产品代码: ${item.product.code}) 与供应商 ${supplier.id} 匹配结果:`, isMatched);
        return isMatched;
      })
      .map(item => item.id);
    
    console.log('此供应商可匹配的产品IDs:', matchableIds, '共', matchableIds.length, '个');
    setMatchableProductIds(matchableIds);
    
    // 清空之前的产品选择
    setSelectedProductIds([]);
  };

  // 选择或取消选择产品
  const handleProductSelect = (productItemId: number) => {
    if (!matchableProductIds.includes(productItemId)) {
      console.log('无法选择不可匹配的产品');
      return;
    }
    
    setSelectedProductIds(prev => {
      if (prev.includes(productItemId)) {
        return prev.filter(id => id !== productItemId);
      } else {
        return [...prev, productItemId];
      }
    });
  };

  // 准备发送邮件
  const handleProceedToEmail = () => {
    if (!selectedSupplier) {
      toast.error('请先选择一个供应商');
      return;
    }
    
    if (selectedProductIds.length === 0) {
      toast.error('请至少选择一个产品');
      return;
    }
    
    // 保存选中的供应商和产品到localStorage
    try {
      // 保存所选供应商
      const selectedSuppliers = [selectedSupplier];
    localStorage.setItem('selectedSuppliers', JSON.stringify(selectedSuppliers));
      
      // 保存所选产品项
      const selectedItems = processingItems.filter(item => selectedProductIds.includes(item.id));
      localStorage.setItem('processingItems', JSON.stringify(selectedItems));
      
      // 跳转到邮件页面
    router.push('/order-email');
    } catch (error) {
      console.error('保存数据失败:', error);
      toast.error('准备邮件数据时出错，请重试');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">供应商匹配</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleBack}>
            返回
          </Button>
          <Button onClick={handleProceedToEmail} disabled={!selectedSupplier || selectedProductIds.length === 0}>
            前往邮件页面
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

        <Card>
          <CardHeader>
          <CardTitle>处理流程指南</CardTitle>
          </CardHeader>
          <CardContent>
          <div className="text-sm text-muted-foreground mb-2">
            当前步骤：<span className="font-medium">供应商匹配（3/4）</span>
                    </div>
          <ol className="list-decimal list-inside space-y-1 text-sm">
            <li className="text-gray-500">订单项选择与批量处理（已完成）</li>
            <li className="text-gray-500">产品分类 - 按类别组织和查看产品（已完成）</li>
            <li className="text-blue-600 font-medium">供应商匹配 - 为订单项选择合适的供应商（当前步骤）</li>
            <li>邮件通知 - 向所选供应商发送邮件通知</li>
          </ol>
          <div className="mt-3 text-sm">
            1. 点击左侧供应商，匹配的产品将会高亮显示
            <br />
            2. 选择需要的产品，然后点击"前往邮件页面"进入邮件发送页面
            </div>
          </CardContent>
        </Card>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* 供应商列表 */}
        <div className="md:col-span-1">
        <Card>
          <CardHeader>
              <CardTitle>供应商列表</CardTitle>
          </CardHeader>
          <CardContent>
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {suppliers.length === 0 ? (
                  <div className="text-center text-muted-foreground py-4">
                    无可用供应商
                  </div>
                ) : (
                  suppliers.map(supplier => (
                    <div
                      key={supplier.id}
                      className={`p-3 rounded-md cursor-pointer transition-colors ${
                        selectedSupplier?.id === supplier.id
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-secondary'
                      }`}
                      onClick={() => handleSupplierClick(supplier)}
                    >
                      <div className="font-medium">{supplier.name}</div>
                      <div className="text-sm opacity-80">{supplier.email || '无邮箱'}</div>
                    </div>
                  ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

        {/* 产品列表 */}
        <div className="md:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle>产品列表</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[600px] overflow-y-auto">
                {processingItems.length === 0 ? (
                  <div className="text-center text-muted-foreground py-4 col-span-full">
                    无待处理产品
                  </div>
                ) : (
                  processingItems.map(item => {
                    // 如果product不存在，跳过这个项目的渲染
                    if (!item.product) {
                      console.log('跳过不含有效产品的项目:', item.id);
                      return null;
                    }
                    
                    const isMatchable = selectedSupplier ? matchableProductIds.includes(item.id) : false;
                    const isSelected = selectedProductIds.includes(item.id);
                    const productCode = item.product.code;
                    const suppliers = getProductSuppliers(productCode);
                    
                    return (
                      <Card
                        key={item.id}
                        className={`overflow-hidden transition-all ${
                          isMatchable
                            ? isSelected
                              ? 'ring-2 ring-primary border-primary'
                              : 'border-blue-300 hover:border-primary cursor-pointer'
                            : selectedSupplier
                              ? 'opacity-50 grayscale'
                              : ''
                        }`}
                        onClick={() => isMatchable && handleProductSelect(item.id)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="font-medium truncate">
                                {item.product.name || '未知产品'}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                代码: {item.product.code || '无'}
                              </div>
                              <div className="text-sm">
                                订单: {item.order?.order_no || '未知'}
                              </div>
                              <div className="text-sm">
                                数量: {item.quantity}
                              </div>
                            </div>
                            {isMatchable && (
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => handleProductSelect(item.id)}
                                className="mt-1"
                              />
                            )}
                          </div>
                          <div className="mt-3 pt-3 border-t border-border">
                            <div className="text-sm font-medium">匹配供应商:</div>
                            <div className="flex flex-wrap gap-2 mt-1">
                              {suppliers.length > 0 ? (
                                suppliers.slice(0, 3).map(s => (
                                  <div 
                                    key={s.id}
                                    className={`px-2 py-1 text-xs rounded-full ${
                                      s.is_current
                                        ? 'bg-green-100 text-green-800'
                                        : 'bg-blue-100 text-blue-800'
                                    }`}
                                  >
                                    {s.name} {s.is_current ? '(当前)' : ''}
                                  </div>
                                ))
                              ) : (
                                <div className="text-sm text-muted-foreground">无匹配供应商</div>
                              )}
                              {suppliers.length > 3 && (
                                <div className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">
                                  +{suppliers.length - 3}个
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 