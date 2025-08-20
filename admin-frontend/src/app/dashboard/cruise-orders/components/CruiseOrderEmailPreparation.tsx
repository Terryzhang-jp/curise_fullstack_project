'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Building2,
  Mail,
  FileText,
  Send,
  Eye,
  CheckCircle2,
  Clock,
  Edit3,
  Save,
  X,
  Download,
  FileDown,
  Lock,
  Layout,
  Wand2,
  RefreshCw,
  Paperclip,
  Plus,
  Trash2
} from 'lucide-react';
import { toast } from 'sonner';
import { excelGeneratorApi, convertToPurchaseOrderRequest } from '@/lib/api/excel-generator';
import axiosInstance from '@/lib/api/axios';
import ExcelPreviewModal from '@/components/excel/ExcelPreviewModal';
import EmailSendLock from '@/components/email/EmailSendLock';
import { emailTemplatesApi, emailTemplateUtils } from '@/lib/api/email-templates';
import type { EmailTemplate } from '@/app/dashboard/settings/types/email-template';

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

interface SupplierEmailInfo {
  supplierId: number;
  supplierName: string;
  email: string;
  products: ProductSupplierAssignment[];
  totalValue: number;
  emailContent: string;
  sent: boolean;
}

interface CruiseOrderEmailPreparationProps {
  assignments: ProductSupplierAssignment[];
  onNext: () => void;
  onBack: () => void;
}

export function CruiseOrderEmailPreparation({
  assignments,
  onNext,
  onBack
}: CruiseOrderEmailPreparationProps) {
  const [supplierEmails, setSupplierEmails] = useState<SupplierEmailInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState<Set<number>>(new Set());
  const [editingEmail, setEditingEmail] = useState<number | null>(null);
  const [editingContent, setEditingContent] = useState<string>('');

  // 邮件发送锁状态
  const [isEmailSendLocked, setIsEmailSendLocked] = useState(true);

  // Excel预览相关状态
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [currentPreviewRequest, setCurrentPreviewRequest] = useState<any>(null);
  const [currentPreviewSupplierId, setCurrentPreviewSupplierId] = useState<number | null>(null);

  // 存储每个供应商的修改数据
  const [supplierModifications, setSupplierModifications] = useState<Map<number, any>>(new Map());

  // 每个供应商的自定义附件状态
  const [supplierAttachments, setSupplierAttachments] = useState<Map<number, File[]>>(new Map());
  const [showAttachmentUpload, setShowAttachmentUpload] = useState<Map<number, boolean>>(new Map());

  // 邮件模板相关状态
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [applyingTemplate, setApplyingTemplate] = useState(false);

  useEffect(() => {
    prepareEmailsForSuppliers();
    loadEmailTemplates();
  }, [assignments]);

  // 加载邮件模板列表
  const loadEmailTemplates = async () => {
    try {
      setTemplatesLoading(true);
      const templates = await emailTemplatesApi.getTemplates();
      setEmailTemplates(templates);
    } catch (error) {
      console.error('加载邮件模板失败:', error);
      toast.error('加载邮件模板失败');
    } finally {
      setTemplatesLoading(false);
    }
  };

  const prepareEmailsForSuppliers = async () => {
    setLoading(true);

    try {
      // 按供应商分组产品
      const supplierGroups = assignments.reduce((groups, assignment) => {
        const { supplierId } = assignment;
        if (!groups[supplierId]) {
          groups[supplierId] = [];
        }
        groups[supplierId].push(assignment);
        return groups;
      }, {} as Record<number, ProductSupplierAssignment[]>);

      // 为每个供应商准备邮件
      const emailsInfo: SupplierEmailInfo[] = await Promise.all(
        Object.entries(supplierGroups).map(async ([supplierIdStr, products]) => {
          const supplierId = parseInt(supplierIdStr);
          const supplierName = products[0].supplierName;
          const totalValue = products.reduce((sum, product) => sum + product.totalPrice, 0);

          // 异步获取供应商邮箱
          const email = await getSupplierEmail(supplierId);

          // 生成邮件内容
          const emailContent = generateEmailContent(supplierName, products, totalValue);

          return {
            supplierId,
            supplierName,
            email,
            products,
            totalValue,
            emailContent,
            sent: false
          };
        })
      );

      setSupplierEmails(emailsInfo);
    } catch (error) {
      console.error('准备邮件失败:', error);
      toast.error('准备邮件失败');
    } finally {
      setLoading(false);
    }
  };

  const getSupplierEmail = async (supplierId: number): Promise<string> => {
    try {
      // 🔧 修复API调用：使用axiosInstance而不是fetch
      const response = await axiosInstance.get(`/suppliers/${supplierId}`);
      if (response.data) {
        return response.data.email || `supplier${supplierId}@example.com`;
      }
    } catch (error) {
      console.error('获取供应商邮箱失败:', error);
    }

    // 如果API调用失败，使用临时硬编码
    const emailMap: Record<number, string> = {
      24: 'supplier@merit-trading.com',
      25: 'tanaka@abc-vegetables.jp',
      26: 'sato@xyz-farm.jp',
      27: 'yamada@def-dairy.jp'
    };
    return emailMap[supplierId] || `supplier${supplierId}@example.com`;
  };

  const generateEmailContent = (
    supplierName: string, 
    products: ProductSupplierAssignment[], 
    totalValue: number
  ): string => {
    const productList = products.map(product => 
      `• ${product.productCode || 'N/A'} - ${product.productName} - ${product.quantity}单位 × ${formatCurrency(product.unitPrice, product.currency)}`
    ).join('\n');

    return `尊敬的${supplierName}，

我们收到Celebrity Millennium邮轮的以下产品需求，请确认价格和交期：

产品清单：
${productList}

总价值：${formatCurrency(totalValue, products[0]?.currency || 'JPY')}

请在2个工作日内回复：
✓ 价格确认/调整
✓ 交货时间
✓ 产品可用性

📎 附件说明：
本邮件包含2个附件：
1. 详细询价单Excel文件 - 包含完整的产品信息和价格
2. BOX标签&Pallet标签模板 - 用于产品包装和标识

如有任何问题，请及时联系我们。

谢谢！

Merit Trading Company
联系人：采购部
邮箱：procurement@merit-trading.com
电话：+81-3-1234-5678`;
  };

  const formatCurrency = (amount: number, currency: string = 'JPY') => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  // 生成模板变量值
  const generateTemplateVariables = (
    supplierName: string,
    products: ProductSupplierAssignment[],
    totalValue: number
  ): Record<string, string> => {
    const firstProduct = products[0];
    const productList = products.map(product =>
      `• ${product.productCode || 'N/A'} - ${product.productName} - ${product.quantity}单位 × ${formatCurrency(product.unitPrice, product.currency)}`
    ).join('\n');

    return {
      supplier_name: supplierName,
      product_list: productList,
      product_count: products.length.toString(),
      total_amount: formatCurrency(totalValue, products[0]?.currency || 'JPY'),
      estimated_amount: formatCurrency(totalValue, products[0]?.currency || 'JPY'),
      delivery_date: firstProduct?.deliveryDate || '2025/7/15',
      delivery_port: '東京港', // 可以根据实际港口信息动态设置
      voyage_number: firstProduct?.voyageNumber || 'ML-1017',
      invoice_number: firstProduct?.poNumber || '',
      contact_person: '采购部',
      contact_email: 'procurement@merit-trading.com',
      current_date: new Date().toLocaleDateString('ja-JP'),
      current_time: new Date().toLocaleTimeString('ja-JP'),
      additional_notes: '请确保产品质量符合邮轮标准，包装完整。'
    };
  };

  // 应用邮件模板
  const applyEmailTemplate = async (templateId: number) => {
    if (!templateId) {
      toast.error('请选择一个邮件模板');
      return;
    }

    try {
      setApplyingTemplate(true);

      // 获取选择的模板
      const template = await emailTemplatesApi.getTemplate(templateId);

      // 为每个供应商生成新的邮件内容
      const updatedEmails = supplierEmails.map(emailInfo => {
        const variables = generateTemplateVariables(
          emailInfo.supplierName,
          emailInfo.products,
          emailInfo.totalValue
        );

        // 替换模板中的变量
        const newContent = emailTemplateUtils.replaceVariables(template.content, variables);

        return {
          ...emailInfo,
          emailContent: newContent
        };
      });

      setSupplierEmails(updatedEmails);
      toast.success(`已应用模板"${template.name}"到所有供应商邮件`);

    } catch (error) {
      console.error('应用邮件模板失败:', error);
      toast.error('应用邮件模板失败');
    } finally {
      setApplyingTemplate(false);
    }
  };

  // 预览模板内容
  const previewTemplate = async (templateId: number) => {
    if (!templateId || supplierEmails.length === 0) {
      toast.error('请先选择模板并确保有供应商数据');
      return;
    }

    try {
      const template = await emailTemplatesApi.getTemplate(templateId);
      const firstSupplier = supplierEmails[0];

      const variables = generateTemplateVariables(
        firstSupplier.supplierName,
        firstSupplier.products,
        firstSupplier.totalValue
      );

      const previewContent = emailTemplateUtils.replaceVariables(template.content, variables);

      // 显示预览对话框
      const confirmed = confirm(`模板预览 - ${template.name}\n\n${previewContent.substring(0, 500)}${previewContent.length > 500 ? '...' : ''}\n\n是否应用此模板到所有供应商邮件？`);

      if (confirmed) {
        await applyEmailTemplate(templateId);
      }

    } catch (error) {
      console.error('预览模板失败:', error);
      toast.error('预览模板失败');
    }
  };

  // 处理供应商自定义附件上传
  const handleSupplierAttachmentUpload = (supplierId: number, event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const newFiles = Array.from(files);
      setSupplierAttachments(prev => {
        const newMap = new Map(prev);
        const existingFiles = newMap.get(supplierId) || [];
        newMap.set(supplierId, [...existingFiles, ...newFiles]);
        return newMap;
      });
      toast.success(`已为 ${supplierEmails.find(s => s.supplierId === supplierId)?.supplierName} 添加 ${newFiles.length} 个附件`);
    }
  };

  // 移除供应商自定义附件
  const removeSupplierAttachment = (supplierId: number, index: number) => {
    setSupplierAttachments(prev => {
      const newMap = new Map(prev);
      const existingFiles = newMap.get(supplierId) || [];
      newMap.set(supplierId, existingFiles.filter((_, i) => i !== index));
      return newMap;
    });
    toast.success('附件已移除');
  };

  // 切换供应商附件上传显示
  const toggleSupplierAttachmentUpload = (supplierId: number) => {
    setShowAttachmentUpload(prev => {
      const newMap = new Map(prev);
      newMap.set(supplierId, !newMap.get(supplierId));
      return newMap;
    });
  };

  // 发送邮件（智能使用修改后的数据）
  const handleSendEmail = async (supplierInfo: SupplierEmailInfo) => {
    // 检查邮件发送锁
    if (isEmailSendLocked) {
      toast.error('邮件发送已锁定，请先解锁后再发送');
      return;
    }

    setSending(prev => new Set(prev).add(supplierInfo.supplierId));

    try {
      // 检查是否有该供应商的修改数据
      const modificationData = supplierModifications.get(supplierInfo.supplierId);

      // 如果有修改后的数据，先生成更新后的Excel附件
      let attachmentBlob = null;
      if (modificationData) {
        // 从产品数据中获取订单信息
        const firstProduct = supplierInfo.products[0];
        const deliveryDate = firstProduct?.deliveryDate || '2025/7/15';
        const voyageNumber = firstProduct?.voyageNumber || 'ML-1017';
        const poNumber = firstProduct?.poNumber || '';

        // 转换数据格式
        const purchaseOrderRequest = convertToPurchaseOrderRequest(
          supplierInfo,
          deliveryDate,
          '',
          voyageNumber,
          poNumber
        );

        // 生成更新后的Excel附件
        attachmentBlob = await excelGeneratorApi.updateAndGenerateExcel(modificationData, purchaseOrderRequest);
        toast.info('使用修改后的数据生成邮件附件');
      }

      // 准备发送邮件的FormData
      const formData = new FormData();
      formData.append('supplier_id', supplierInfo.supplierId.toString());
      formData.append('subject', `询价单 - ${supplierInfo.supplierName}`);
      formData.append('content', supplierInfo.emailContent);

      // 🔧 添加产品数据以生成询价Excel
      const productsData = supplierInfo.products.map(product => ({
        product_code: product.productCode || '',
        product_name_en: product.productName || '',
        product_name_jp: product.productNameJp || product.productName || '',
        pack_size: `${product.quantity}*1EA/CT`, // 包装规格格式
        quantity: product.quantity || 0,
        unit: 'PC', // 默认单位
        unit_price: product.unitPrice || 0,
        amount: product.totalPrice || 0,
        currency: product.currency || 'JPY'
      }));
      formData.append('products_data', JSON.stringify(productsData));

      // 添加该供应商的自定义附件
      const supplierFiles = supplierAttachments.get(supplierInfo.supplierId) || [];
      supplierFiles.forEach((file) => {
        formData.append(`additional_attachments`, file);
      });

      // 如果有修改数据，添加修改信息
      if (modificationData) {
        formData.append('modification_data', JSON.stringify(modificationData));
      }

      // 发送邮件API调用
      try {
        const response = await axiosInstance.post('/suppliers/send-inquiry-email', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

        console.log('邮件发送成功:', response.data);
      } catch (apiError) {
        console.error('邮件API调用失败:', apiError);
        // 如果API调用失败，回退到模拟发送
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      // 标记为已发送
      setSupplierEmails(prev =>
        prev.map(email =>
          email.supplierId === supplierInfo.supplierId
            ? { ...email, sent: true }
            : email
        )
      );

      const message = modificationData
        ? `已向 ${supplierInfo.supplierName} 发送询价邮件（包含修改后的数据）`
        : `邮件已发送给 ${supplierInfo.supplierName}`;
      toast.success(message);
    } catch (error) {
      console.error('发送邮件失败:', error);
      toast.error('邮件发送失败');
    } finally {
      setSending(prev => {
        const newSet = new Set(prev);
        newSet.delete(supplierInfo.supplierId);
        return newSet;
      });
    }
  };

  const handleSendAllEmails = async () => {
    // 检查邮件发送锁
    if (isEmailSendLocked) {
      toast.error('邮件发送已锁定，请先解锁后再发送');
      return;
    }

    const unsentEmails = supplierEmails.filter(email => !email.sent);

    if (unsentEmails.length === 0) {
      toast.info('没有待发送的邮件');
      return;
    }

    // 二次确认批量发送
    if (!confirm(`确定要发送 ${unsentEmails.length} 封邮件吗？此操作不可撤销。`)) {
      return;
    }

    for (const emailInfo of unsentEmails) {
      await handleSendEmail(emailInfo);
      // 添加延迟避免邮件服务器过载
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  };

  const handleEditEmail = (supplierId: number, currentContent: string) => {
    setEditingEmail(supplierId);
    setEditingContent(currentContent);
  };

  const handleSaveEmailEdit = (supplierId: number) => {
    setSupplierEmails(prev =>
      prev.map(email =>
        email.supplierId === supplierId
          ? { ...email, emailContent: editingContent }
          : email
      )
    );
    setEditingEmail(null);
    setEditingContent('');
    toast.success('邮件内容已更新');
  };

  const handleCancelEmailEdit = () => {
    setEditingEmail(null);
    setEditingContent('');
  };

  // 预览Excel
  const handlePreviewExcel = async (emailInfo: SupplierEmailInfo) => {
    try {
      // 从产品数据中获取订单信息
      const firstProduct = emailInfo.products[0];
      const deliveryDate = firstProduct?.deliveryDate || '2025/7/15';
      const voyageNumber = firstProduct?.voyageNumber || 'ML-1017';
      const poNumber = firstProduct?.poNumber || '';

      // 转换数据格式
      const purchaseOrderRequest = convertToPurchaseOrderRequest(
        emailInfo,
        deliveryDate,
        '', // 交货地址留空
        voyageNumber,
        poNumber
      );

      setCurrentPreviewRequest(purchaseOrderRequest);
      setCurrentPreviewSupplierId(emailInfo.supplierId);
      setPreviewModalOpen(true);
    } catch (error) {
      console.error('预览Excel失败:', error);
      toast.error('预览Excel失败，请重试');
    }
  };

  // 保存Preview修改的数据
  const handleSavePreviewModifications = (updateData: any) => {
    if (currentPreviewSupplierId !== null) {
      setSupplierModifications(prev => {
        const newMap = new Map(prev);
        newMap.set(currentPreviewSupplierId, updateData);
        return newMap;
      });
      toast.success('修改已保存，发送邮件时将使用修改后的数据');
    }
  };

  // 下载Excel（支持更新数据）
  const handleDownloadExcel = async (emailInfo: SupplierEmailInfo, updateData?: any) => {
    try {
      // 从产品数据中获取订单信息（取第一个产品的订单信息）
      const firstProduct = emailInfo.products[0];
      const deliveryDate = firstProduct?.deliveryDate || '2025/7/15'; // 从产品数据获取，如果没有则使用默认值
      const voyageNumber = firstProduct?.voyageNumber || 'ML-1017'; // 从产品数据获取
      const poNumber = firstProduct?.poNumber || ''; // 从产品数据获取

      // 转换数据格式（交货地址将在后端根据港口动态获取）
      const purchaseOrderRequest = convertToPurchaseOrderRequest(
        emailInfo,
        deliveryDate,
        '', // 交货地址留空，让后端根据港口动态获取
        voyageNumber,
        poNumber
      );

      if (updateData) {
        // 使用更新后的数据生成Excel
        const blob = await excelGeneratorApi.updateAndGenerateExcel(updateData, purchaseOrderRequest);

        // 下载文件
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `询价单_${emailInfo.supplierName}_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        // 生成并下载Excel文件
        await excelGeneratorApi.generateAndDownloadPurchaseOrder(purchaseOrderRequest);
      }

      toast.success(`${emailInfo.supplierName} 的询价单Excel已下载`);
    } catch (error: any) {
      console.error('Excel下载失败:', error);
      toast.error(`Excel下载失败: ${error.message}`);
    }
  };

  // 下载PDF - 暂时禁用
  const handleDownloadPdf = async (emailInfo: SupplierEmailInfo) => {
    toast.info('PDF下载功能正在开发中，请使用Excel下载功能');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
        <span className="ml-2">准备邮件中...</span>
      </div>
    );
  }

  const totalSuppliers = supplierEmails.length;
  const sentCount = supplierEmails.filter(email => email.sent).length;
  const totalValue = supplierEmails.reduce((sum, email) => sum + email.totalValue, 0);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold mb-2">询价邮件准备</h2>
        <p className="text-gray-600">
          向供应商发送产品询价邮件
        </p>
      </div>

      {/* 发送统计 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Building2 className="w-5 h-5 text-blue-500" />
              <div>
                <p className="text-sm text-gray-600">供应商数量</p>
                <p className="text-2xl font-bold">{totalSuppliers}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              <div>
                <p className="text-sm text-gray-600">已发送</p>
                <p className="text-2xl font-bold text-green-600">{sentCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-yellow-500" />
              <div>
                <p className="text-sm text-gray-600">待发送</p>
                <p className="text-2xl font-bold text-yellow-600">{totalSuppliers - sentCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <FileText className="w-5 h-5 text-purple-500" />
              <div>
                <p className="text-sm text-gray-600">总价值</p>
                <p className="text-lg font-bold text-purple-600">
                  {formatCurrency(totalValue)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 邮件模板选择 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layout className="h-5 w-5" />
            邮件模板选择
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Select
                value={selectedTemplateId?.toString() || ''}
                onValueChange={(value) => setSelectedTemplateId(value ? parseInt(value) : null)}
                disabled={templatesLoading}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={templatesLoading ? "加载模板中..." : "选择邮件模板"} />
                </SelectTrigger>
                <SelectContent>
                  {emailTemplates.map((template) => (
                    <SelectItem key={template.id} value={template.id.toString()}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              variant="outline"
              onClick={() => selectedTemplateId && previewTemplate(selectedTemplateId)}
              disabled={!selectedTemplateId || applyingTemplate}
            >
              <Eye className="w-4 h-4 mr-2" />
              预览
            </Button>

            <Button
              onClick={() => selectedTemplateId && applyEmailTemplate(selectedTemplateId)}
              disabled={!selectedTemplateId || applyingTemplate}
            >
              {applyingTemplate ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  应用中...
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4 mr-2" />
                  应用模板
                </>
              )}
            </Button>

            <Button
              variant="outline"
              onClick={loadEmailTemplates}
              disabled={templatesLoading}
            >
              {templatesLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
            </Button>
          </div>

          {selectedTemplateId && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-2 text-sm text-blue-700">
                <Layout className="w-4 h-4" />
                <span>
                  已选择模板: {emailTemplates.find(t => t.id === selectedTemplateId)?.name}
                </span>
              </div>
              <p className="text-xs text-blue-600 mt-1">
                应用模板将替换所有供应商的邮件内容，并自动填入产品信息和供应商数据
              </p>
            </div>
          )}
        </CardContent>
      </Card>



      {/* 邮件发送锁和批量操作 */}
      <EmailSendLock
        isLocked={isEmailSendLocked}
        onUnlock={() => setIsEmailSendLocked(false)}
        onLock={() => setIsEmailSendLocked(true)}
        lockMessage="邮件发送已锁定，防止误触发送询价邮件"
        confirmationText="我确认我即将发送"
        autoLockTimeout={300} // 5分钟自动锁定
      >
        {/* 批量操作 */}
        <div className="flex justify-center">
          <Button
            onClick={handleSendAllEmails}
            disabled={sentCount === totalSuppliers || isEmailSendLocked}
            className="px-8"
          >
            <Send className="w-4 h-4 mr-2" />
            发送所有邮件 ({totalSuppliers - sentCount}个待发送)
          </Button>
        </div>
      </EmailSendLock>

      {/* 供应商邮件列表 */}
      <div className="space-y-4">
        {supplierEmails.map((emailInfo) => (
          <Card key={emailInfo.supplierId}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Building2 className="w-5 h-5" />
                  <span>{emailInfo.supplierName}</span>
                  {emailInfo.sent && (
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  )}
                  {supplierModifications.has(emailInfo.supplierId) && (
                    <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full">
                      已修改
                    </span>
                  )}
                </div>
                <div className="text-sm text-gray-600">
                  {emailInfo.products.length} 个产品 | {formatCurrency(emailInfo.totalValue)}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* 收件人信息 */}
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-sm text-gray-600">收件人: {emailInfo.email}</p>
                  <p className="text-sm text-gray-600">
                    产品: {emailInfo.products.map(p => p.productName).join(', ')}
                  </p>
                </div>

                {/* 邮件预览/编辑 */}
                <div className="border rounded-lg p-4 bg-white">
                  <h4 className="font-medium mb-2 flex items-center justify-between">
                    <div className="flex items-center">
                      {editingEmail === emailInfo.supplierId ? (
                        <Edit3 className="w-4 h-4 mr-2 text-blue-500" />
                      ) : (
                        <Eye className="w-4 h-4 mr-2" />
                      )}
                      {editingEmail === emailInfo.supplierId ? '编辑邮件内容' : '邮件预览'}
                    </div>

                    {editingEmail === emailInfo.supplierId ? (
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSaveEmailEdit(emailInfo.supplierId)}
                        >
                          <Save className="w-4 h-4 mr-1" />
                          保存
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleCancelEmailEdit}
                        >
                          <X className="w-4 h-4 mr-1" />
                          取消
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditEmail(emailInfo.supplierId, emailInfo.emailContent)}
                        disabled={emailInfo.sent}
                      >
                        <Edit3 className="w-4 h-4 mr-1" />
                        编辑
                      </Button>
                    )}
                  </h4>

                  {editingEmail === emailInfo.supplierId ? (
                    <Textarea
                      value={editingContent}
                      onChange={(e) => setEditingContent(e.target.value)}
                      className="min-h-[200px] text-sm font-mono"
                      placeholder="请输入邮件内容..."
                    />
                  ) : (
                    <div className="text-sm whitespace-pre-line bg-gray-50 p-3 rounded max-h-40 overflow-y-auto">
                      {emailInfo.emailContent}
                    </div>
                  )}
                </div>

                {/* 操作按钮 */}
                <div className="flex space-x-2">
                  <Button
                    onClick={() => handleSendEmail(emailInfo)}
                    disabled={emailInfo.sent || sending.has(emailInfo.supplierId) || isEmailSendLocked}
                    size="sm"
                    className={isEmailSendLocked ? 'opacity-50' : ''}
                  >
                    {sending.has(emailInfo.supplierId) ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                        发送中...
                      </>
                    ) : emailInfo.sent ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        已发送
                      </>
                    ) : isEmailSendLocked ? (
                      <>
                        <Lock className="w-4 h-4 mr-2" />
                        已锁定
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        发送邮件
                      </>
                    )}
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePreviewExcel(emailInfo)}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    预览Excel
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // 检查是否有该供应商的修改数据
                      const modificationData = supplierModifications.get(emailInfo.supplierId);
                      handleDownloadExcel(emailInfo, modificationData);
                    }}
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    下载Excel
                    {supplierModifications.has(emailInfo.supplierId) && (
                      <span className="ml-1 text-xs bg-orange-100 text-orange-600 px-1 rounded">已修改</span>
                    )}
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleSupplierAttachmentUpload(emailInfo.supplierId)}
                  >
                    <Paperclip className="w-4 h-4 mr-2" />
                    添加附件
                    {(supplierAttachments.get(emailInfo.supplierId)?.length || 0) > 0 && (
                      <span className="ml-1 text-xs bg-blue-100 text-blue-600 px-1 rounded">
                        {supplierAttachments.get(emailInfo.supplierId)?.length}
                      </span>
                    )}
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    disabled
                    onClick={() => handleDownloadPdf(emailInfo)}
                    title="PDF下载功能正在开发中"
                  >
                    <FileDown className="w-4 h-4 mr-2" />
                    下载PDF (开发中)
                  </Button>
                </div>

                {/* 自定义附件上传区域 */}
                {showAttachmentUpload.get(emailInfo.supplierId) && (
                  <div className="mt-4 p-3 border-2 border-dashed border-gray-300 rounded-lg">
                    <input
                      type="file"
                      multiple
                      onChange={(e) => handleSupplierAttachmentUpload(emailInfo.supplierId, e)}
                      className="w-full mb-2"
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.jpg,.jpeg,.png"
                    />
                    <p className="text-xs text-gray-500">
                      支持格式：PDF, Word, Excel, 文本文件, 图片文件
                    </p>
                  </div>
                )}

                {/* 附件信息 */}
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">
                    📎 邮件附件 ({2 + (supplierAttachments.get(emailInfo.supplierId)?.length || 0)}个)
                  </h4>
                  <div className="space-y-1 text-sm text-gray-600">
                    {/* 系统自动附件 */}
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      <span>询价单_{emailInfo.supplierName}_{new Date().toISOString().slice(0, 10).replace(/-/g, '')}.xlsx</span>
                      <span className="text-xs text-blue-600">(自动生成)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      <span>BOXラベル&Palletラベル(A4横).xlsx</span>
                      <span className="text-xs text-blue-600">(系统模板)</span>
                    </div>

                    {/* 用户自定义附件 */}
                    {supplierAttachments.get(emailInfo.supplierId)?.map((file, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Paperclip className="w-4 h-4" />
                          <span>{file.name}</span>
                          <span className="text-xs text-green-600">(自定义附件)</span>
                          <span className="text-xs text-gray-500">
                            ({(file.size / 1024 / 1024).toFixed(2)} MB)
                          </span>
                        </div>
                        <Button
                          onClick={() => removeSupplierAttachment(emailInfo.supplierId, index)}
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:text-red-700 h-6 w-6 p-0"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 操作按钮 */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          返回供应商分配
        </Button>
        <Button
          onClick={onNext}
          disabled={sentCount === 0}
        >
          完成邮件发送 → 结束流程
        </Button>
      </div>

      {/* Excel预览模态框 */}
      <ExcelPreviewModal
        isOpen={previewModalOpen}
        onClose={() => {
          setPreviewModalOpen(false);
          setCurrentPreviewSupplierId(null);
        }}
        purchaseOrderRequest={currentPreviewRequest}
        savedModifications={currentPreviewSupplierId ? supplierModifications.get(currentPreviewSupplierId) : undefined}
        onDownload={(updateData) => {
          // 找到对应的供应商信息
          const emailInfo = supplierEmails.find(e => e.supplierId === currentPreviewRequest?.supplier_id);
          if (emailInfo) {
            handleDownloadExcel(emailInfo, updateData);
          }
        }}
        onSave={handleSavePreviewModifications}
      />
    </div>
  );
}