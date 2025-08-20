'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Eye, Download, Save, Edit3, FileDown } from 'lucide-react';
import { axiosV2Instance } from '@/lib/api/axios';
import { excelGeneratorApi } from '@/lib/api/excel-generator';

interface ProductItem {
  po_number: string;
  product_code: string;
  product_name_en: string;
  product_name_jp: string;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  amount: number;
  currency: string;
}

interface ExcelPreviewData {
  supplier_info: {
    name: string;
    phone: string;
    contact: string;
    email: string;
  };
  order_info: {
    date: string;
    invoice_number: string;
    voyage_number: string;
  };
  delivery_info: {
    delivery_date: string;
    delivery_address: string;
  };
  products: ProductItem[];
  totals: {
    subtotal: number;
    tax: number;
    total: number;
    tax_rate: number;
  };
}

interface ExcelPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  purchaseOrderRequest: any;
  onDownload: (updatedData?: any) => void;
  onDownloadPdf?: () => void;
  onSave?: (updatedData: any) => void;
  savedModifications?: any; // 已保存的修改数据
}

export default function ExcelPreviewModal({
  isOpen,
  onClose,
  purchaseOrderRequest,
  onDownload,
  onDownloadPdf,
  onSave,
  savedModifications
}: ExcelPreviewModalProps) {
  const [previewData, setPreviewData] = useState<ExcelPreviewData | null>(null);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState<ExcelPreviewData | null>(null);

  // 获取预览数据
  const fetchPreviewData = async () => {
    if (!purchaseOrderRequest) return;

    setLoading(true);
    try {
      const response = await axiosV2Instance.post('/excel/preview-purchase-order', purchaseOrderRequest);

      let initialData = response.data;

      // 如果有保存的修改数据，应用这些修改
      if (savedModifications) {
        console.log('🔄 应用已保存的修改数据:', savedModifications);
        initialData = {
          ...initialData,
          supplier_info: savedModifications.supplier_info || initialData.supplier_info,
          order_info: savedModifications.order_info || initialData.order_info,
          delivery_info: savedModifications.delivery_info || initialData.delivery_info,
          products: savedModifications.products || initialData.products,
          // 重新计算总计
          totals: savedModifications.products ? {
            ...initialData.totals,
            subtotal: savedModifications.products.reduce((sum: number, product: any) => sum + product.amount, 0),
            tax: savedModifications.products.reduce((sum: number, product: any) => sum + product.amount, 0) * initialData.totals.tax_rate,
            total: savedModifications.products.reduce((sum: number, product: any) => sum + product.amount, 0) * (1 + initialData.totals.tax_rate)
          } : initialData.totals
        };
      }

      setPreviewData(initialData);
      setEditedData(JSON.parse(JSON.stringify(initialData))); // 深拷贝
    } catch (error) {
      console.error('获取预览数据失败:', error);
      toast.error('获取预览数据失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && purchaseOrderRequest) {
      fetchPreviewData();
    }
  }, [isOpen, purchaseOrderRequest, savedModifications]);

  // 处理字段更新
  const updateField = (section: string, field: string, value: any) => {
    if (!editedData) return;

    setEditedData(prev => ({
      ...prev!,
      [section]: {
        ...prev![section as keyof ExcelPreviewData],
        [field]: value
      }
    }));
  };

  // 处理产品更新
  const updateProduct = (index: number, field: string, value: any) => {
    if (!editedData) return;

    const updatedProducts = [...editedData.products];
    updatedProducts[index] = {
      ...updatedProducts[index],
      [field]: value
    };

    // 重新计算金额
    if (field === 'quantity' || field === 'unit_price') {
      updatedProducts[index].amount = updatedProducts[index].quantity * updatedProducts[index].unit_price;
    }

    // 重新计算总计
    const subtotal = updatedProducts.reduce((sum, product) => sum + product.amount, 0);
    const tax = subtotal * editedData.totals.tax_rate;
    const total = subtotal + tax;

    setEditedData(prev => ({
      ...prev!,
      products: updatedProducts,
      totals: {
        ...prev!.totals,
        subtotal,
        tax,
        total
      }
    }));
  };

  // 保存修改并下载
  const handleSaveAndDownload = async () => {
    if (!editedData) return;

    try {
      // 构建更新请求
      const updateRequest = {
        supplier_info: editedData.supplier_info,
        order_info: editedData.order_info,
        delivery_info: editedData.delivery_info,
        products: editedData.products
      };

      // 调用下载函数，传递更新后的数据
      await onDownload(updateRequest);
      toast.success('Excel文件已生成并下载');
      onClose();
    } catch (error) {
      console.error('保存并下载失败:', error);
      toast.error('保存并下载失败');
    }
  };

  // 保存修改到主页面状态
  const handleSaveModifications = async () => {
    if (!editedData || !onSave) return;

    try {
      // 构建更新请求
      const updateRequest = {
        supplier_info: editedData.supplier_info,
        order_info: editedData.order_info,
        delivery_info: editedData.delivery_info,
        products: editedData.products
      };

      // 保存修改到主页面状态
      onSave(updateRequest);
      toast.success('修改已保存');
      setIsEditing(false);
    } catch (error) {
      console.error('保存修改失败:', error);
      toast.error('保存修改失败');
    }
  };

  // 下载当前数据（检查是否有修改）
  const handleDownloadWithCurrentData = async () => {
    if (!editedData) return;

    try {
      // 检查当前数据是否与原始数据不同，或者是否有保存的修改
      const hasModifications = savedModifications ||
        (previewData && JSON.stringify(editedData) !== JSON.stringify(previewData));

      if (hasModifications) {
        // 如果有修改，使用修改后的数据
        const updateRequest = {
          supplier_info: editedData.supplier_info,
          order_info: editedData.order_info,
          delivery_info: editedData.delivery_info,
          products: editedData.products
        };
        console.log('🔄 使用修改后的数据下载Excel:', updateRequest);
        await onDownload(updateRequest);
      } else {
        // 如果没有修改，使用原始数据
        console.log('📄 使用原始数据下载Excel');
        await onDownload();
      }

      toast.success('Excel文件已生成并下载');
    } catch (error) {
      console.error('下载失败:', error);
      toast.error('下载失败');
    }
  };

  // 下载PDF - 暂时禁用
  const handleDownloadPdf = async () => {
    toast.info('PDF下载功能正在开发中，请使用Excel下载功能');
  };

  if (loading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
            <span className="ml-2">加载预览数据中...</span>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!previewData || !editedData) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Excel询价单预览
            {isEditing && <span className="text-sm text-orange-600">(编辑模式)</span>}
          </DialogTitle>
          <DialogDescription>
            预览和编辑Excel询价单的内容，包括供应商信息、产品明细和总计。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* 供应商信息 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">供应商信息</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div>
                <Label>供应商名称</Label>
                <Input
                  value={editedData.supplier_info.name}
                  onChange={(e) => updateField('supplier_info', 'name', e.target.value)}
                  disabled={!isEditing}
                />
              </div>
              <div>
                <Label>联系电话</Label>
                <Input
                  value={editedData.supplier_info.phone}
                  onChange={(e) => updateField('supplier_info', 'phone', e.target.value)}
                  disabled={!isEditing}
                />
              </div>
              <div>
                <Label>联系人</Label>
                <Input
                  value={editedData.supplier_info.contact}
                  onChange={(e) => updateField('supplier_info', 'contact', e.target.value)}
                  disabled={!isEditing}
                />
              </div>
              <div>
                <Label>邮箱</Label>
                <Input
                  value={editedData.supplier_info.email}
                  onChange={(e) => updateField('supplier_info', 'email', e.target.value)}
                  disabled={!isEditing}
                />
              </div>
            </CardContent>
          </Card>

          {/* 订单信息 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">订单信息</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-3 gap-4">
              <div>
                <Label>订单日期</Label>
                <Input
                  value={editedData.order_info.date}
                  onChange={(e) => updateField('order_info', 'date', e.target.value)}
                  disabled={!isEditing}
                />
              </div>
              <div>
                <Label>发票号</Label>
                <Input
                  value={editedData.order_info.invoice_number}
                  onChange={(e) => updateField('order_info', 'invoice_number', e.target.value)}
                  disabled={!isEditing}
                />
              </div>
              <div>
                <Label>航次号</Label>
                <Input
                  value={editedData.order_info.voyage_number}
                  onChange={(e) => updateField('order_info', 'voyage_number', e.target.value)}
                  disabled={!isEditing}
                />
              </div>
            </CardContent>
          </Card>

          {/* 交货信息 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">交货信息</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div>
                <Label>交货日期</Label>
                <Input
                  value={editedData.delivery_info.delivery_date}
                  onChange={(e) => updateField('delivery_info', 'delivery_date', e.target.value)}
                  disabled={!isEditing}
                />
              </div>
              <div>
                <Label>交货地址</Label>
                <Textarea
                  value={editedData.delivery_info.delivery_address}
                  onChange={(e) => updateField('delivery_info', 'delivery_address', e.target.value)}
                  disabled={!isEditing}
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          {/* 产品列表 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">产品明细</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {editedData.products.map((product, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="grid grid-cols-4 gap-4">
                      <div>
                        <Label>产品代码</Label>
                        <Input
                          value={product.product_code}
                          onChange={(e) => updateProduct(index, 'product_code', e.target.value)}
                          disabled={!isEditing}
                        />
                      </div>
                      <div>
                        <Label>英文名称</Label>
                        <Input
                          value={product.product_name_en}
                          onChange={(e) => updateProduct(index, 'product_name_en', e.target.value)}
                          disabled={!isEditing}
                        />
                      </div>
                      <div>
                        <Label>日文名称</Label>
                        <Input
                          value={product.product_name_jp}
                          onChange={(e) => updateProduct(index, 'product_name_jp', e.target.value)}
                          disabled={!isEditing}
                        />
                      </div>
                      <div>
                        <Label>描述</Label>
                        <Input
                          value={product.description}
                          onChange={(e) => updateProduct(index, 'description', e.target.value)}
                          disabled={!isEditing}
                        />
                      </div>
                      <div>
                        <Label>数量</Label>
                        <Input
                          type="number"
                          value={product.quantity}
                          onChange={(e) => updateProduct(index, 'quantity', Number(e.target.value))}
                          disabled={!isEditing}
                        />
                      </div>
                      <div>
                        <Label>单位</Label>
                        <Input
                          value={product.unit}
                          onChange={(e) => updateProduct(index, 'unit', e.target.value)}
                          disabled={!isEditing}
                        />
                      </div>
                      <div>
                        <Label>单价</Label>
                        <Input
                          type="number"
                          value={product.unit_price}
                          onChange={(e) => updateProduct(index, 'unit_price', Number(e.target.value))}
                          disabled={!isEditing}
                        />
                      </div>
                      <div>
                        <Label>金额</Label>
                        <Input
                          value={product.amount.toLocaleString()}
                          disabled
                          className="bg-gray-50"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 总计信息 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">总计</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-right">
                <div>
                  <Label>小计</Label>
                  <div className="text-lg font-semibold">¥{editedData.totals.subtotal.toLocaleString()}</div>
                </div>
                <div>
                  <Label>税金 ({(editedData.totals.tax_rate * 100).toFixed(0)}%)</Label>
                  <div className="text-lg font-semibold">¥{editedData.totals.tax.toLocaleString()}</div>
                </div>
                <div>
                  <Label>总计</Label>
                  <div className="text-xl font-bold text-blue-600">¥{editedData.totals.total.toLocaleString()}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter className="flex justify-between">
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setIsEditing(!isEditing)}
            >
              <Edit3 className="h-4 w-4 mr-2" />
              {isEditing ? '取消编辑' : '编辑'}
            </Button>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              关闭
            </Button>
            {isEditing && onSave && (
              <Button
                onClick={handleSaveModifications}
                className="bg-green-600 hover:bg-green-700"
              >
                <Save className="h-4 w-4 mr-2" />
                保存修改
              </Button>
            )}
            <Button
              variant="outline"
              disabled
              onClick={handleDownloadPdf}
              title="PDF下载功能正在开发中"
            >
              <FileDown className="h-4 w-4 mr-2" />
              下载PDF (开发中)
            </Button>
            <Button onClick={isEditing ? handleSaveAndDownload : handleDownloadWithCurrentData}>
              <Download className="h-4 w-4 mr-2" />
              {isEditing ? '保存并下载Excel' : '下载Excel'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
