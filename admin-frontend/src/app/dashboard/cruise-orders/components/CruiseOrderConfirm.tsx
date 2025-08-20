'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle2, 
  AlertTriangle, 
  Ship, 
  Building2, 
  MapPin, 
  Calendar,
  Package
} from 'lucide-react';
import { 
  CruiseOrderUploadResponse, 
  CruiseOrderConfirmRequest,
  cruiseOrdersApi 
} from '@/lib/api/cruise-orders';
import { toast } from 'sonner';

interface CruiseOrderConfirmProps {
  uploadData: CruiseOrderUploadResponse;
  onConfirmComplete: () => void;
  onBack: () => void;
}

export function CruiseOrderConfirm({ uploadData, onConfirmComplete, onBack }: CruiseOrderConfirmProps) {
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(
    new Set(uploadData.orders.map(order => order.po_number))
  );
  const [isConfirming, setIsConfirming] = useState(false);

  const handleOrderToggle = (poNumber: string) => {
    const newSelected = new Set(selectedOrders);
    if (newSelected.has(poNumber)) {
      newSelected.delete(poNumber);
    } else {
      newSelected.add(poNumber);
    }
    setSelectedOrders(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedOrders.size === uploadData.orders.length) {
      setSelectedOrders(new Set());
    } else {
      setSelectedOrders(new Set(uploadData.orders.map(order => order.po_number)));
    }
  };

  const handleConfirm = async () => {
    if (selectedOrders.size === 0) {
      toast.error('请至少选择一个订单');
      return;
    }

    setIsConfirming(true);
    try {
      const request: CruiseOrderConfirmRequest = {
        upload_id: uploadData.upload_id,
        orders_to_confirm: Array.from(selectedOrders)
      };

      const result = await cruiseOrdersApi.confirmOrders(request);
      toast.success(result.message);
      onConfirmComplete();
    } catch (error: any) {
      console.error('确认订单失败:', error);
      toast.error(error.response?.data?.detail || '确认订单失败');
    } finally {
      setIsConfirming(false);
    }
  };

  const formatCurrency = (amount: number, currency: string = 'JPY') => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN');
  };

  const selectedOrdersData = uploadData.orders.filter(order => 
    selectedOrders.has(order.po_number)
  );

  const totalSelectedValue = selectedOrdersData.reduce(
    (sum, order) => sum + order.total_amount, 0
  );

  const totalSelectedProducts = selectedOrdersData.reduce(
    (sum, order) => sum + order.products.length, 0
  );

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold mb-2">确认导入订单</h2>
        <p className="text-gray-600">
          请选择要导入到系统的订单，确认后将创建对应的订单和产品记录
        </p>
      </div>

      {/* 选择统计 */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Checkbox
                checked={selectedOrders.size === uploadData.orders.length}
                onCheckedChange={handleSelectAll}
                className="mr-2"
              />
              <span className="font-medium">
                全选 ({selectedOrders.size}/{uploadData.orders.length})
              </span>
            </div>
            <div className="flex items-center space-x-6 text-sm">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span>已选: {selectedOrders.size} 个订单</span>
              </div>
              <div className="flex items-center space-x-2">
                <Package className="w-4 h-4 text-blue-500" />
                <span>{totalSelectedProducts} 个产品</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="font-medium">
                  总计: {formatCurrency(totalSelectedValue)}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 订单列表 */}
      <Card>
        <CardHeader>
          <CardTitle>选择要导入的订单</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {uploadData.orders.map((order) => {
              const isSelected = selectedOrders.has(order.po_number);
              return (
                <div 
                  key={order.po_number}
                  className={`
                    border rounded-lg p-4 cursor-pointer transition-colors
                    ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}
                  `}
                  onClick={() => handleOrderToggle(order.po_number)}
                >
                  <div className="flex items-center space-x-4">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => handleOrderToggle(order.po_number)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium">PO: {order.po_number}</h3>
                          <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                            <span className="flex items-center space-x-1">
                              <Ship className="w-4 h-4" />
                              <span>{order.ship_name}</span>
                            </span>
                            <span className="flex items-center space-x-1">
                              <Building2 className="w-4 h-4" />
                              <span>{order.supplier_name}</span>
                            </span>
                            <span className="flex items-center space-x-1">
                              <MapPin className="w-4 h-4" />
                              <span>{order.destination_port}</span>
                            </span>
                            <span className="flex items-center space-x-1">
                              <Calendar className="w-4 h-4" />
                              <span>{formatDate(order.delivery_date)}</span>
                            </span>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <p className="font-medium">
                            {formatCurrency(order.total_amount, order.currency)}
                          </p>
                          <p className="text-sm text-gray-600">
                            {order.products.length} 个产品
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* 导入说明 */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5" />
            <div className="space-y-2">
              <h3 className="font-medium text-amber-900">导入说明</h3>
              <ul className="text-sm text-amber-700 space-y-1">
                <li>• 系统将为每个订单创建对应的订单记录</li>
                <li>• 如果产品不存在，将自动创建新的产品记录</li>
                <li>• 如果供应商不存在，将自动创建新的供应商记录</li>
                <li>• 如果船只或港口不存在，将自动创建相应记录</li>
                <li>• 导入后可在订单管理中查看和处理这些订单</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 操作按钮 */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack} disabled={isConfirming}>
          返回分析
        </Button>
        <Button 
          onClick={handleConfirm} 
          disabled={selectedOrders.size === 0 || isConfirming}
          className="px-8"
        >
          {isConfirming ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              导入中...
            </>
          ) : (
            `确认导入 ${selectedOrders.size} 个订单`
          )}
        </Button>
      </div>
    </div>
  );
}