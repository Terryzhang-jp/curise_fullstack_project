'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Search,
  Package,
  Database,
  TrendingUp,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import { 
  CruiseOrderUploadResponse, 
  CruiseOrderMatchResponse,
  ProductMatchResult,
  cruiseOrdersApi 
} from '@/lib/api/cruise-orders';
import { toast } from 'sonner';

interface CruiseOrderMatchProps {
  uploadData: CruiseOrderUploadResponse;
  onNext: (selectedIndices: number[], matchResults: CruiseOrderMatchResponse) => void;
  onBack: () => void;
}

export function CruiseOrderMatch({ uploadData, onNext, onBack }: CruiseOrderMatchProps) {
  const [matchResults, setMatchResults] = useState<CruiseOrderMatchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
  const [selectedProducts, setSelectedProducts] = useState<Set<number>>(new Set());

  const handleMatch = async () => {
    setLoading(true);
    try {
      const result = await cruiseOrdersApi.matchProducts({ upload_id: uploadData.upload_id });
      setMatchResults(result);
      toast.success(`匹配完成！${result.matched_products}/${result.total_products} 个产品成功匹配`);
    } catch (error: any) {
      console.error('产品匹配失败:', error);
      toast.error(error.response?.data?.detail || '产品匹配失败');
    } finally {
      setLoading(false);
    }
  };

  const toggleItemExpansion = (index: number) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedItems(newExpanded);
  };

  const toggleProductSelection = (index: number) => {
    const newSelected = new Set(selectedProducts);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedProducts(newSelected);
  };

  const handleSelectAll = () => {
    if (!matchResults) return;
    
    const matchedIndices = matchResults.match_results
      .map((result, index) => ({ result, index }))
      .filter(({ result }) => result.match_status === 'matched')
      .map(({ index }) => index);
    
    setSelectedProducts(new Set(matchedIndices));
  };

  const handleSelectNone = () => {
    setSelectedProducts(new Set());
  };

  const handleSelectMatched = () => {
    if (!matchResults) return;
    
    const matchedIndices = matchResults.match_results
      .map((result, index) => ({ result, index }))
      .filter(({ result }) => result.match_status === 'matched')
      .map(({ index }) => index);
    
    setSelectedProducts(new Set(matchedIndices));
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'matched':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'possible_match':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      case 'not_matched':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <XCircle className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'matched':
        return '匹配成功';
      case 'possible_match':
        return '可能匹配';
      case 'not_matched':
        return '未匹配';
      default:
        return '匹配错误';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'matched':
        return 'bg-green-100 text-green-800';
      case 'possible_match':
        return 'bg-yellow-100 text-yellow-800';
      case 'not_matched':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (amount: number, currency: string = 'JPY') => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold mb-2">产品数据匹配</h2>
        <p className="text-gray-600">
          将邮轮订单中的产品与数据库中的产品进行匹配，检查数据一致性
        </p>
      </div>

      {!matchResults ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Database className="w-16 h-16 text-blue-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">开始产品匹配</h3>
            <p className="text-gray-600 mb-6">
              点击下方按钮开始匹配邮轮订单中的 {uploadData.total_products} 个产品
            </p>
            <Button onClick={handleMatch} disabled={loading} className="px-8">
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  匹配中...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 mr-2" />
                  开始匹配
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* 产品选择统计 */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-blue-900">产品选择</h3>
                <p className="text-sm text-blue-700">
                  已选择 {selectedProducts.size} / {matchResults.total_products} 个产品
                </p>
              </div>
              <div className="flex space-x-2">
                <Button variant="outline" size="sm" onClick={handleSelectAll}>
                  全选匹配成功
                </Button>
                <Button variant="outline" size="sm" onClick={handleSelectMatched}>
                  只选匹配成功
                </Button>
                <Button variant="outline" size="sm" onClick={handleSelectNone}>
                  全不选
                </Button>
              </div>
            </div>
          </div>

          {/* 匹配统计 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Package className="w-5 h-5 text-blue-500" />
                  <div>
                    <p className="text-sm text-gray-600">总产品数</p>
                    <p className="text-2xl font-bold">{matchResults.total_products}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <div>
                    <p className="text-sm text-gray-600">匹配成功</p>
                    <p className="text-2xl font-bold text-green-600">{matchResults.matched_products}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <XCircle className="w-5 h-5 text-red-500" />
                  <div>
                    <p className="text-sm text-gray-600">未匹配</p>
                    <p className="text-2xl font-bold text-red-600">{matchResults.unmatched_products}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="w-5 h-5 text-purple-500" />
                  <div>
                    <p className="text-sm text-gray-600">匹配率</p>
                    <p className="text-2xl font-bold text-purple-600">
                      {((matchResults.matched_products / matchResults.total_products) * 100).toFixed(1)}%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 匹配结果列表 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Search className="w-5 h-5" />
                <span>匹配结果详情</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {matchResults.match_results.map((result, index) => (
                  <div key={index} className="border rounded-lg">
                    <div className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <input
                            type="checkbox"
                            checked={selectedProducts.has(index)}
                            onChange={() => toggleProductSelection(index)}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            disabled={result.match_status !== 'matched'}
                          />
                          {getStatusIcon(result.match_status)}
                          <div className="flex-1">
                            <h3 className="font-medium">{result.cruise_product.product_name}</h3>
                            <div className="flex items-center space-x-3 text-sm text-gray-600">
                              {result.cruise_product.item_code && (
                                <span className="font-mono bg-gray-100 px-2 py-1 rounded">
                                  {result.cruise_product.item_code}
                                </span>
                              )}
                              <span>数量: {result.cruise_product.quantity}</span>
                              <span>单价: {formatCurrency(result.cruise_product.unit_price)}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <Badge className={getStatusColor(result.match_status)}>
                            {getStatusText(result.match_status)}
                          </Badge>
                          <div className="text-sm text-gray-500">
                            {(result.match_score * 100).toFixed(0)}%
                          </div>
                          <button
                            onClick={() => toggleItemExpansion(index)}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            {expandedItems.has(index) ? (
                              <ChevronUp className="w-5 h-5" />
                            ) : (
                              <ChevronDown className="w-5 h-5" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    {expandedItems.has(index) && (
                      <div className="border-t bg-gray-50 p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* 邮轮订单产品信息 */}
                          <div>
                            <h4 className="font-medium text-blue-600 mb-2">邮轮订单产品</h4>
                            <div className="space-y-1 text-sm">
                              <p><strong>产品名称:</strong> {result.cruise_product.product_name}</p>
                              {result.cruise_product.product_id && (
                                <p><strong>产品ID:</strong> {result.cruise_product.product_id}</p>
                              )}
                              {result.cruise_product.item_code && (
                                <p><strong>产品代码:</strong> {result.cruise_product.item_code}</p>
                              )}
                              <p><strong>数量:</strong> {result.cruise_product.quantity}</p>
                              <p><strong>单价:</strong> {formatCurrency(result.cruise_product.unit_price)}</p>
                              <p><strong>总价:</strong> {formatCurrency(result.cruise_product.total_price)}</p>
                            </div>
                          </div>

                          {/* 数据库匹配产品信息 */}
                          <div>
                            <h4 className="font-medium text-green-600 mb-2">数据库匹配产品</h4>
                            {result.matched_product ? (
                              <div className="space-y-1 text-sm">
                                <p><strong>产品名称(英):</strong> {result.matched_product.product_name_en}</p>
                                {result.matched_product.product_name_zh && (
                                  <p><strong>产品名称(中):</strong> {result.matched_product.product_name_zh}</p>
                                )}
                                {result.matched_product.product_name_jp && (
                                  <p><strong>产品名称(日):</strong> {result.matched_product.product_name_jp}</p>
                                )}
                                <p><strong>产品代码:</strong> {result.matched_product.code}</p>
                                <p><strong>采购价格:</strong> {formatCurrency(result.matched_product.purchase_price, result.matched_product.currency)}</p>
                                <p><strong>匹配原因:</strong> {result.match_reason}</p>
                              </div>
                            ) : (
                              <div className="text-sm text-gray-500">
                                <p>未找到匹配的产品</p>
                                <p><strong>原因:</strong> {result.match_reason}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* 操作按钮 */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          返回分析
        </Button>
        {matchResults && (
          <Button 
            onClick={() => onNext(Array.from(selectedProducts), matchResults)}
            disabled={selectedProducts.size === 0}
          >
            继续 → 供应商分配 ({selectedProducts.size}个产品)
          </Button>
        )}
      </div>
    </div>
  );
}