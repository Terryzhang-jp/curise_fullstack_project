'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Package, 
  Ship, 
  Building2, 
  MapPin, 
  Calendar,
  DollarSign,
  FileText,
  ChevronDown,
  ChevronUp 
} from 'lucide-react';
import { 
  CruiseOrderUploadResponse, 
  CruiseOrderAnalysisResponse, 
  cruiseOrdersApi 
} from '@/lib/api/cruise-orders';
import { toast } from 'sonner';

interface CruiseOrderAnalysisProps {
  uploadData: CruiseOrderUploadResponse;
  onNext: () => void;
  onBack: () => void;
}

export function CruiseOrderAnalysis({ uploadData, onNext, onBack }: CruiseOrderAnalysisProps) {
  const [analysis, setAnalysis] = useState<CruiseOrderAnalysisResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchAnalysis = async () => {
      try {
        const result = await cruiseOrdersApi.getAnalysis(uploadData.upload_id);
        setAnalysis(result);
      } catch (error: any) {
        console.error('获取分析数据失败:', error);
        toast.error('获取分析数据失败');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalysis();
  }, [uploadData.upload_id]);

  const toggleOrderExpansion = (poNumber: string) => {
    const newExpanded = new Set(expandedOrders);
    if (newExpanded.has(poNumber)) {
      newExpanded.delete(poNumber);
    } else {
      newExpanded.add(poNumber);
    }
    setExpandedOrders(newExpanded);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
        <span className="ml-2">分析数据中...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold mb-2">数据分析结果</h2>
        <p className="text-gray-600">
          请检查解析结果，确认无误后可进行下一步
        </p>
      </div>

      {/* 统计概览 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <FileText className="w-5 h-5 text-blue-500" />
              <div>
                <p className="text-sm text-gray-600">总订单数</p>
                <p className="text-2xl font-bold">{uploadData.total_orders}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Package className="w-5 h-5 text-green-500" />
              <div>
                <p className="text-sm text-gray-600">总产品数</p>
                <p className="text-2xl font-bold">{uploadData.total_products}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <DollarSign className="w-5 h-5 text-yellow-500" />
              <div>
                <p className="text-sm text-gray-600">总金额</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(analysis?.total_value || 0, analysis?.currency)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Building2 className="w-5 h-5 text-purple-500" />
              <div>
                <p className="text-sm text-gray-600">供应商数量</p>
                <p className="text-2xl font-bold">
                  {analysis ? Object.keys(analysis.orders_by_supplier).length : 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 按供应商分组统计 */}
      {analysis && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Building2 className="w-5 h-5" />
              <span>按供应商统计</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {Object.entries(analysis.orders_by_supplier).map(([supplier, count]) => (
                <div key={supplier} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="font-medium">{supplier}</span>
                  <Badge variant="secondary">{count} 个订单</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 订单详情列表 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="w-5 h-5" />
            <span>订单详情</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {uploadData.orders.map((order) => (
              <div key={order.po_number} className="border rounded-lg">
                <div 
                  className="p-4 cursor-pointer hover:bg-gray-50"
                  onClick={() => toggleOrderExpansion(order.po_number)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div>
                        <h3 className="font-medium">PO: {order.po_number}</h3>
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
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
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="text-right">
                        <p className="font-medium">
                          {formatCurrency(order.total_amount, order.currency)}
                        </p>
                        <p className="text-sm text-gray-600">
                          {order.products.length} 个产品
                        </p>
                      </div>
                      {expandedOrders.has(order.po_number) ? (
                        <ChevronUp className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                  </div>
                </div>
                
                {expandedOrders.has(order.po_number) && (
                  <div className="border-t bg-gray-50 p-4">
                    <h4 className="font-medium mb-3">产品明细</h4>
                    <div className="space-y-2">
                      {order.products.map((product, index) => (
                        <div key={index} className="flex items-center justify-between py-2 px-3 bg-white rounded">
                          <div>
                            <p className="font-medium">{product.product_name}</p>
                            <div className="flex items-center space-x-3 text-sm text-gray-600">
                              {product.product_id && (
                                <span>ID: {product.product_id}</span>
                              )}
                              {product.item_code && (
                                <span className="font-mono bg-blue-100 px-2 py-1 rounded text-blue-800">
                                  {product.item_code}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">
                              {formatCurrency(product.total_price, product.currency)}
                            </p>
                            <p className="text-sm text-gray-600">
                              {product.quantity} × {formatCurrency(product.unit_price, product.currency)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 操作按钮 */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          返回上传
        </Button>
        <Button onClick={onNext}>
          确认数据，继续导入
        </Button>
      </div>
    </div>
  );
}