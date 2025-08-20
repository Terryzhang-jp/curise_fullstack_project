'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Building2, 
  Package, 
  AlertTriangle,
  Users,
  DollarSign,
  CheckCircle2,
  XCircle,
  Edit3,
  Mail,
  Phone
} from 'lucide-react';
import { 
  CruiseOrderUploadResponse, 
  CruiseOrderMatchResponse,
  ProductMatchResult,
  cruiseOrdersApi 
} from '@/lib/api/cruise-orders';
import { toast } from 'sonner';
import axiosInstance from '@/lib/api/axios';

interface SupplierProduct {
  productIndex: number;
  matchResult: ProductMatchResult;
  originalPrice: number;
  editablePrice: number;
  editableQuantity: number;
  currency: string;
  selected: boolean;
}

interface SupplierGroup {
  id: number;
  name: string;
  contact?: string;
  email?: string;
  products: SupplierProduct[];
  allSelected: boolean;
  hasSelected: boolean;
}

interface CruiseOrderSupplierAssignmentProps {
  uploadData: CruiseOrderUploadResponse;
  matchResults: CruiseOrderMatchResponse;
  selectedProductIndices: number[];
  onNext: (assignments: ProductSupplierAssignment[]) => void;
  onBack: () => void;
}

interface ProductSupplierAssignment {
  productIndex: number;
  supplierId: number;
  supplierName: string;
  productCode: string;
  productName: string;
  productNameJp?: string; // 🔧 添加日语名称字段
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  currency: string;
  // 添加订单级别信息
  deliveryDate?: string;
  shipCode?: string;
  voyageNumber?: string;
  poNumber?: string;
}

export function CruiseOrderSupplierAssignment({ 
  uploadData, 
  matchResults, 
  selectedProductIndices, 
  onNext, 
  onBack 
}: CruiseOrderSupplierAssignmentProps) {
  const [supplierGroups, setSupplierGroups] = useState<SupplierGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProductSuppliers();
  }, [selectedProductIndices]);

  const fetchProductSuppliers = async () => {
    setLoading(true);
    try {
      // 调用后端API获取产品供应商信息
      // 🔧 修复索引映射问题：传递连续的索引和对应的匹配结果
      const selectedMatchResults = selectedProductIndices.map(index => matchResults.match_results[index]);
      const response = await axiosInstance.post('/product-suppliers/get-suppliers', {
        product_indices: selectedMatchResults.map((_, index) => index), // 使用连续的索引 [0, 1, 2, ...]
        match_results: selectedMatchResults
      });

      const data = response.data;
      
      // 按供应商分组产品
      const supplierMap = new Map<number, SupplierGroup>();

      data.products.forEach((productData: any, dataIndex: number) => {
        const { productIndex, matchResult, suppliers } = productData;
        // 🔧 使用原始的selectedProductIndices来获取正确的产品索引
        const originalProductIndex = selectedProductIndices[dataIndex];
        
        suppliers.forEach((supplier: any) => {
          if (!supplierMap.has(supplier.id)) {
            supplierMap.set(supplier.id, {
              id: supplier.id,
              name: supplier.name,
              contact: supplier.contact,
              email: supplier.email,
              products: [],
              allSelected: false,
              hasSelected: false
            });
          }
          
          const supplierGroup = supplierMap.get(supplier.id)!;
          supplierGroup.products.push({
            productIndex: originalProductIndex, // 🔧 使用原始的产品索引
            matchResult,
            originalPrice: supplier.price,
            editablePrice: supplier.price,
            editableQuantity: matchResult.cruise_product.quantity,
            currency: supplier.currency,
            selected: supplier.is_primary || false // 默认选择主供应商的产品
          });
        });
      });

      // 更新每个供应商组的选择状态
      const groups = Array.from(supplierMap.values()).map(group => {
        const selectedCount = group.products.filter(p => p.selected).length;
        return {
          ...group,
          allSelected: selectedCount === group.products.length,
          hasSelected: selectedCount > 0
        };
      });

      setSupplierGroups(groups);

    } catch (error: any) {
      console.error('获取产品供应商信息失败:', error);
      toast.error('获取供应商信息失败');
    } finally {
      setLoading(false);
    }
  };

  // 切换产品选择状态
  const toggleProductSelection = (supplierId: number, productIndex: number) => {
    setSupplierGroups(prev => prev.map(group => {
      if (group.id === supplierId) {
        const updatedProducts = group.products.map(product => 
          product.productIndex === productIndex 
            ? { ...product, selected: !product.selected }
            : product
        );
        const selectedCount = updatedProducts.filter(p => p.selected).length;
        
        return {
          ...group,
          products: updatedProducts,
          allSelected: selectedCount === updatedProducts.length,
          hasSelected: selectedCount > 0
        };
      }
      return group;
    }));
  };

  // 切换供应商全选状态
  const toggleSupplierAllSelection = (supplierId: number) => {
    setSupplierGroups(prev => prev.map(group => {
      if (group.id === supplierId) {
        const newSelectedState = !group.allSelected;
        const updatedProducts = group.products.map(product => ({ 
          ...product, 
          selected: newSelectedState 
        }));
        
        return {
          ...group,
          products: updatedProducts,
          allSelected: newSelectedState,
          hasSelected: newSelectedState
        };
      }
      return group;
    }));
  };

  // 更新产品价格
  const updateProductPrice = (supplierId: number, productIndex: number, newPrice: number) => {
    setSupplierGroups(prev => prev.map(group => {
      if (group.id === supplierId) {
        const updatedProducts = group.products.map(product => 
          product.productIndex === productIndex 
            ? { ...product, editablePrice: newPrice }
            : product
        );
        return { ...group, products: updatedProducts };
      }
      return group;
    }));
  };

  // 更新产品数量
  const updateProductQuantity = (supplierId: number, productIndex: number, newQuantity: number) => {
    setSupplierGroups(prev => prev.map(group => {
      if (group.id === supplierId) {
        const updatedProducts = group.products.map(product => 
          product.productIndex === productIndex 
            ? { ...product, editableQuantity: newQuantity }
            : product
        );
        return { ...group, products: updatedProducts };
      }
      return group;
    }));
  };

  const handleNext = () => {
    // 收集所有选中的产品分配
    const finalAssignments: ProductSupplierAssignment[] = [];

    supplierGroups.forEach(group => {
      group.products.forEach(product => {
        if (product.selected) {
          // 从uploadData中获取订单信息
          const orderInfo = uploadData.orders[0]; // 假设所有产品来自同一个订单

          finalAssignments.push({
            productIndex: product.productIndex,
            supplierId: group.id,
            supplierName: group.name,
            productCode: product.matchResult.cruise_product.item_code || '',
            productName: product.matchResult.cruise_product.product_name,
            productNameJp: product.matchResult.matched_product?.product_name_jp || '', // 🔧 添加日语名称
            quantity: product.editableQuantity,
            unitPrice: product.editablePrice,
            totalPrice: product.editablePrice * product.editableQuantity,
            currency: product.currency,
            // 添加订单级别信息
            deliveryDate: orderInfo?.delivery_date,
            shipCode: orderInfo?.ship_code,
            voyageNumber: orderInfo?.ship_code || 'ML-1017', // 使用ship_code作为voyage_number
            poNumber: orderInfo?.po_number
          });
        }
      });
    });

    if (finalAssignments.length === 0) {
      toast.error('请至少选择一个产品');
      return;
    }

    onNext(finalAssignments);
  };

  const formatCurrency = (amount: number, currency: string = 'JPY') => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const getSupplierStats = () => {
    return supplierGroups.map(group => {
      const selectedProducts = group.products.filter(p => p.selected);
      const totalValue = selectedProducts.reduce((sum, product) => {
        return sum + (product.editablePrice * product.editableQuantity);
      }, 0);
      
      return {
        id: group.id,
        name: group.name,
        count: selectedProducts.length,
        totalProducts: group.products.length,
        totalValue,
        currency: group.products[0]?.currency || 'JPY'
      };
    }).filter(stat => stat.count > 0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
        <span className="ml-2">加载供应商信息中...</span>
      </div>
    );
  }

  const supplierStats = getSupplierStats();
  const totalSelectedProducts = supplierGroups.reduce((sum, group) => 
    sum + group.products.filter(p => p.selected).length, 0
  );

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold mb-2">供应商产品分配</h2>
        <p className="text-gray-600">
          按供应商分组，选择要询价的产品并调整价格数量
        </p>
      </div>

      {/* 统计概览 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Package className="w-5 h-5 text-blue-500" />
              <div>
                <p className="text-sm text-gray-600">可选产品</p>
                <p className="text-2xl font-bold">{selectedProductIndices.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              <div>
                <p className="text-sm text-gray-600">已选产品</p>
                <p className="text-2xl font-bold text-green-600">{totalSelectedProducts}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="w-5 h-5 text-purple-500" />
              <div>
                <p className="text-sm text-gray-600">涉及供应商</p>
                <p className="text-2xl font-bold">{supplierGroups.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <DollarSign className="w-5 h-5 text-yellow-500" />
              <div>
                <p className="text-sm text-gray-600">询价供应商</p>
                <p className="text-2xl font-bold text-yellow-600">{supplierStats.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 按供应商分组显示 */}
      <div className="space-y-6">
        {supplierGroups.map((group) => (
          <Card key={group.id} className={`${group.hasSelected ? 'ring-2 ring-blue-200' : ''}`}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Building2 className="w-6 h-6 text-blue-600" />
                  <div>
                    <CardTitle className="text-lg">{group.name}</CardTitle>
                    <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                      {group.contact && (
                        <span className="flex items-center">
                          <Phone className="w-4 h-4 mr-1" />
                          {group.contact}
                        </span>
                      )}
                      {group.email && (
                        <span className="flex items-center">
                          <Mail className="w-4 h-4 mr-1" />
                          {group.email}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  <Badge variant={group.hasSelected ? "default" : "secondary"}>
                    {group.products.filter(p => p.selected).length}/{group.products.length} 已选
                  </Badge>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={group.allSelected}
                      onChange={() => toggleSupplierAllSelection(group.id)}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm font-medium">全选</span>
                  </label>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {group.products.map((product) => (
                  <div 
                    key={product.productIndex} 
                    className={`border rounded-lg p-4 ${product.selected ? 'bg-blue-50 border-blue-200' : ''}`}
                  >
                    <div className="flex items-start space-x-4">
                      {/* 产品选择 */}
                      <div className="flex items-start pt-1">
                        <input
                          type="checkbox"
                          checked={product.selected}
                          onChange={() => toggleProductSelection(group.id, product.productIndex)}
                          className="w-4 h-4 text-blue-600"
                        />
                      </div>
                      
                      {/* 产品信息 */}
                      <div className="flex-1">
                        <h4 className="font-medium">{product.matchResult.cruise_product.product_name}</h4>
                        <div className="flex items-center space-x-3 text-sm text-gray-600 mt-1">
                          {product.matchResult.cruise_product.item_code && (
                            <span className="font-mono bg-gray-100 px-2 py-1 rounded text-gray-800">
                              {product.matchResult.cruise_product.item_code}
                            </span>
                          )}
                          <span className="text-gray-500">
                            原数量: {product.matchResult.cruise_product.quantity}
                          </span>
                          <span className="text-gray-500">
                            原价: {formatCurrency(product.originalPrice, product.currency)}
                          </span>
                        </div>
                      </div>
                      
                      {/* 编辑区域 */}
                      <div className="flex items-center space-x-3">
                        <div className="flex flex-col space-y-2">
                          <label className="text-xs text-gray-600">数量</label>
                          <Input
                            type="number"
                            value={product.editableQuantity}
                            onChange={(e) => updateProductQuantity(group.id, product.productIndex, Number(e.target.value))}
                            className="w-20 h-8 text-sm"
                            min="0"
                            step="1"
                            disabled={!product.selected}
                          />
                        </div>
                        
                        <div className="flex flex-col space-y-2">
                          <label className="text-xs text-gray-600">单价 ({product.currency})</label>
                          <Input
                            type="number"
                            value={product.editablePrice}
                            onChange={(e) => updateProductPrice(group.id, product.productIndex, Number(e.target.value))}
                            className="w-24 h-8 text-sm"
                            min="0"
                            step="0.01"
                            disabled={!product.selected}
                          />
                        </div>
                        
                        <div className="flex flex-col space-y-2">
                          <label className="text-xs text-gray-600">总价</label>
                          <div className="w-24 h-8 flex items-center text-sm font-medium text-green-600">
                            {formatCurrency(product.editablePrice * product.editableQuantity, product.currency)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* 供应商小计 */}
              {group.hasSelected && (
                <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-green-800">
                      {group.name} 小计: {group.products.filter(p => p.selected).length} 个产品
                    </span>
                    <span className="font-bold text-green-600">
                      {formatCurrency(
                        group.products
                          .filter(p => p.selected)
                          .reduce((sum, p) => sum + (p.editablePrice * p.editableQuantity), 0),
                        group.products[0]?.currency || 'JPY'
                      )}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 操作按钮 */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          返回产品选择
        </Button>
        <Button 
          onClick={handleNext}
          disabled={totalSelectedProducts === 0}
        >
          继续 → 准备询价邮件 ({supplierStats.length}个供应商)
        </Button>
      </div>
    </div>
  );
}