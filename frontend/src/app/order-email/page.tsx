'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Paperclip, X, CheckCircle, Mail, Download, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { FileIcon } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { getApiUrl, API_ENDPOINTS } from '@/lib/api-config';

interface Supplier {
  id: number;
  name: string;
  email: string;
  categories?: Category[];
  status?: boolean;
}

interface Category {
  id: number;
  name: string;
}

interface Attachment {
  file: File;
  name: string;
}

interface OrderItem {
  id: number;
  supplier_id?: number;
  order_id?: number;
  order_no?: string;
  product_id?: number;
  product?: {
    id?: number;
    name?: string;
    code?: string;
    category?: {
      id: number;
      name: string;
    }
  };
  quantity: number;
  price?: number;
  total?: number;
  status?: string;
  delivery_date?: string;
}

interface SupplierStatus {
  id: number;
  status: 'pending' | 'sent' | 'failed';
  error?: string;
}

interface EmailData {
  title: string;
  content: string;
  cc: string;
  bcc: string;
}

interface EmailTemplate {
  id: number;
  name: string;
  subject: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export default function OrderEmailPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplierStatuses, setSupplierStatuses] = useState<SupplierStatus[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([]);
  const [processingItems, setProcessingItems] = useState<OrderItem[]>([]);
  const [emailData, setEmailData] = useState<EmailData>({
    title: '',
    content: '',
    cc: '',
    bcc: ''
  });
  const [additionalAttachments, setAdditionalAttachments] = useState<Attachment[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 从localStorage获取选中的供应商和分类
    const selectedSuppliersJson = localStorage.getItem('selectedSuppliers');
    const selectedCategoryStr = localStorage.getItem('selectedCategory');
    
    if (!selectedSuppliersJson) {
      alert('没有选择供应商');
      router.push('/order-supplier-matching');
      return;
    }

    const loadData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // 从localStorage获取选定的供应商
        const suppliersJson = localStorage.getItem('selectedSuppliers');
        if (!suppliersJson) {
          alert('未选择任何供应商，将重定向到供应商匹配页面');
          router.push('/order-supplier-matching');
          return;
        }
        
        const selectedSuppliers = JSON.parse(suppliersJson) as Supplier[];
        setSuppliers(selectedSuppliers);
        
        // 初始化供应商状态
        const initialStatuses: SupplierStatus[] = selectedSuppliers.map(s => ({
          id: s.id,
          status: 'pending',
          error: undefined
        }));
        setSupplierStatuses(initialStatuses);
        
        // 选择第一个供应商作为默认
        if (selectedSuppliers.length > 0) {
          setSelectedSupplier(selectedSuppliers[0]);
          updateEmailContent(selectedSuppliers[0]);
        }
        
        // 从localStorage获取处理项
        const processingItemsJson = localStorage.getItem('processingItems');
        if (processingItemsJson) {
          const storedItems = JSON.parse(processingItemsJson) as OrderItem[];
          setProcessingItems(storedItems);
        }
        
        // 加载邮件模板
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('未登录或会话已过期');
        }
        
        const templateResponse = await fetch(getApiUrl(API_ENDPOINTS.EMAIL-TEMPLATES), {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!templateResponse.ok) {
          throw new Error('获取邮件模板失败');
        }
        
        const templates = await templateResponse.json();
        setEmailTemplates(templates);
        
      } catch (error) {
        console.error('加载数据失败:', error);
        setError(error instanceof Error ? error.message : '加载数据失败');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [router]);

  const updateEmailContent = (supplier: Supplier) => {
    setEmailData({
      title: `新订单通知 - ${supplier.name}`,
      content: `尊敬的${supplier.name}：

我们有新的订单需要您处理，详细信息请查看附件。
订单需要尽快处理，请在收到邮件后24小时内回复确认。
如有任何问题，请及时与我们联系。

谢谢您的合作！

此致
采购部
`,
      cc: '',
      bcc: ''
    });
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const newAttachments = Array.from(files).map(file => ({
        file,
        name: file.name
      }));
      setAdditionalAttachments(prev => [...prev, ...newAttachments]);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveAttachment = (index: number) => {
    setAdditionalAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSupplierSelect = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    updateEmailContent(supplier);
  };

  const handleTemplateSelect = (templateId: string) => {
    const template = emailTemplates.find(t => t.id === parseInt(templateId));
    if (template && selectedSupplier) {
      // 替换模板中的变量
      let content = template.content;
      content = content.replace(/{supplier_name}/g, selectedSupplier.name);
      
      // 如果有处理队列中的订单信息，可以添加更多变量替换
      const processingItemsJson = localStorage.getItem('processingItems');
      if (processingItemsJson) {
        const processingItems = JSON.parse(processingItemsJson) as OrderItem[];
        if (processingItems.length > 0) {
          const firstItem = processingItems[0];
          // 替换订单编号
          if (firstItem.order_no) {
            content = content.replace(/{order_no}/g, firstItem.order_no);
          }
          // 替换交付日期（如果有）
          if (firstItem.delivery_date) {
            content = content.replace(/{delivery_date}/g, firstItem.delivery_date);
          } else {
            content = content.replace(/{delivery_date}/g, new Date().toISOString().split('T')[0]);
          }
        }
      }
      
      setSelectedTemplate(template);
      setEmailData(prev => ({
        ...prev,
        title: template.subject,
        content: content
      }));
    }
  };

  const handleSendEmail = async () => {
    if (!selectedSupplier) return;

    try {
      setIsSending(true);
      const processingItems = JSON.parse(localStorage.getItem('processingItems') || '[]') as OrderItem[];
      
      // 过滤出当前供应商相关的订单项，直接使用所有处理项，因为我们是从供应商匹配页面传过来的
      // 这些项目已经是针对特定供应商筛选过的
      const supplierOrderItems = processingItems;
      
      if (supplierOrderItems.length === 0) {
        alert('当前供应商没有需要发送的订单项');
        return;
      }

      // 获取认证token
      const token = localStorage.getItem('token');
      if (!token) {
        alert('未登录或会话已过期');
        router.push('/login');
        return;
      }

      // 创建FormData对象
      const formData = new FormData();
      formData.append('supplier_id', selectedSupplier.id.toString());
      formData.append('title', emailData.title);
      formData.append('content', emailData.content);
      formData.append('cc_list', emailData.cc);
      formData.append('bcc_list', emailData.bcc);
      
      // 将order_item_ids作为逗号分隔的字符串添加
      const orderItemIds = supplierOrderItems.map(item => item.id.toString()).join(',');
      formData.append('order_item_ids', orderItemIds);
      
      // 添加附件
      additionalAttachments.forEach((attachment) => {
        formData.append('additional_attachments', attachment.file);
      });

      const response = await fetch(getApiUrl(API_ENDPOINTS.ORDERS), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`发送邮件给 ${selectedSupplier.name} 失败: ${response.statusText}`);
      }

      // 更新供应商状态
      setSupplierStatuses(prev => 
        prev.map(s => 
          s.id === selectedSupplier.id 
            ? { ...s, status: 'sent' } 
            : s
        )
      );

      // 自动选择下一个待发送的供应商
      const nextSupplier = suppliers.find(s => 
        s.id !== selectedSupplier.id && // 不是当前供应商
        supplierStatuses.find(
          status => status.id === s.id && status.status === 'pending'
        )
      );

      if (nextSupplier) {
        setSelectedSupplier(nextSupplier);
        updateEmailContent(nextSupplier);
        // 清空附件，保持抄送、密送
        setAdditionalAttachments([]);
      } else {
        // 所有供应商都已发送
        alert('所有邮件发送完成！');
        // 清除localStorage中的临时数据
        localStorage.removeItem('selectedSuppliers');
        localStorage.removeItem('processingItems');
        localStorage.removeItem('selectedCategory');
        // 返回到订单处理页面
        router.push('/order-processing');
      }
    } catch (error) {
      console.error('发送邮件失败:', error);
      // 更新供应商状态为失败
      setSupplierStatuses(prev => 
        prev.map(s => 
          s.id === selectedSupplier.id 
            ? { 
                ...s, 
                status: 'failed',
                error: error instanceof Error ? error.message : '未知错误'
              } 
            : s
        )
      );
      alert(error instanceof Error ? error.message : '发送邮件失败');
    } finally {
      setIsSending(false);
    }
  };

  const handleBack = () => {
    router.push('/order-supplier-matching');
  };

  // 添加附件下载功能
  const handleDownloadAttachment = async (attachment: Attachment) => {
    try {
      // 创建一个临时的URL来下载文件
      const url = URL.createObjectURL(attachment.file);
      const a = document.createElement('a');
      a.href = url;
      a.download = attachment.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('下载附件失败:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <h1 className="text-2xl font-bold mb-4">发送订单通知邮件</h1>
        
        <Card>
          <CardHeader>
            <CardTitle>处理流程指南</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground mb-2">
              当前步骤：<span className="font-medium">邮件通知（4/4）</span>
            </div>
            <ol className="list-decimal list-inside space-y-1 text-sm">
              <li className="text-gray-500">订单项选择与批量处理（已完成）</li>
              <li className="text-gray-500">产品分类（已完成）</li>
              <li className="text-gray-500">供应商匹配（已完成）</li>
              <li className="text-blue-600 font-medium">邮件通知 - 向所选供应商发送邮件通知（当前步骤）</li>
            </ol>
            <div className="mt-3 text-sm">
              选择并调整邮件模板，添加附件后发送给选定的供应商。完成该步骤后，整个订单处理流程就完成了。
            </div>
          </CardContent>
        </Card>
        
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex gap-6">
        {/* 左侧：供应商列表 */}
        <div className="w-1/3">
          <Card>
            <CardHeader>
              <CardTitle>供应商列表</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {suppliers.map((supplier) => {
                  const status = supplierStatuses.find(s => s.id === supplier.id);
                  return (
                    <div
                      key={supplier.id}
                      className={cn(
                        "p-4 rounded-lg border cursor-pointer transition-colors",
                        selectedSupplier?.id === supplier.id
                          ? "border-primary bg-primary/5"
                          : "hover:bg-muted",
                        status?.status === 'sent' && "bg-green-50",
                        status?.status === 'failed' && "bg-red-50"
                      )}
                      onClick={() => handleSupplierSelect(supplier)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{supplier.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {supplier.email}
                          </div>
                        </div>
                        <div>
                          {status?.status === 'sent' && (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          )}
                          {status?.status === 'failed' && (
                            <div className="text-red-500 text-sm">
                              发送失败
                            </div>
                          )}
                        </div>
                      </div>
                      {status?.error && (
                        <div className="mt-2 text-sm text-red-500">
                          {status.error}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 右侧：邮件编辑区 */}
        <div className="flex-1">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>发送邮件</CardTitle>
                <Button variant="outline" onClick={handleBack}>返回</Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <Select onValueChange={handleTemplateSelect}>
                    <SelectTrigger className="w-[280px]">
                      <SelectValue placeholder="选择邮件模板" />
                    </SelectTrigger>
                    <SelectContent>
                      {emailTemplates.map((template) => (
                        <SelectItem key={template.id} value={template.id.toString()}>
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <Info className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent className="w-80">
                        <p className="text-sm">
                          支持的变量：<br />
                          {'{supplier_name}'} - 供应商名称<br />
                          {'{order_no}'} - 订单编号<br />
                          {'{delivery_date}'} - 交付日期
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>

                <div>
                  <Label>收件人</Label>
                  <div className="flex items-center space-x-2">
                    <Input
                      value={selectedSupplier?.name || ''}
                      readOnly
                      className="bg-gray-100 flex-grow"
                    />
                    <Input
                      value={selectedSupplier?.email || ''}
                      readOnly
                      className="bg-gray-100 flex-grow"
                    />
                  </div>
                </div>

                <div>
                  <Label>抄送 (多个邮箱用逗号分隔)</Label>
                  <Input
                    value={emailData.cc}
                    onChange={(e) => setEmailData({ ...emailData, cc: e.target.value })}
                    placeholder="example1@example.com, example2@example.com"
                  />
                </div>

                <div>
                  <Label>密送 (多个邮箱用逗号分隔)</Label>
                  <Input
                    value={emailData.bcc}
                    onChange={(e) => setEmailData({ ...emailData, bcc: e.target.value })}
                    placeholder="example1@example.com, example2@example.com"
                  />
                </div>

                <div>
                  <Label>主题</Label>
                  <Input
                    value={emailData.title}
                    onChange={(e) => setEmailData({ ...emailData, title: e.target.value })}
                    placeholder="请输入邮件主题"
                  />
                </div>

                <div>
                  <Label>正文</Label>
                  <Textarea
                    value={emailData.content}
                    onChange={(e) => setEmailData({ ...emailData, content: e.target.value })}
                    placeholder="请输入邮件内容"
                    rows={10}
                  />
                </div>

                <div>
                  <Label>附件</Label>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Paperclip className="h-4 w-4 mr-2" />
                        添加附件
                      </Button>
                      <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        onChange={handleFileSelect}
                        multiple
                      />
                    </div>
                    
                    <div className="text-sm text-gray-500 mt-1">
                      注意：系统会自动生成订单项目Excel文件作为主要附件，您可以添加其他补充文件
                    </div>
                    
                    {additionalAttachments.length > 0 && (
                      <div className="border rounded-md p-4 space-y-2">
                        {additionalAttachments.map((attachment, index) => (
                          <div key={index} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <FileIcon className="h-4 w-4" />
                              <span>{attachment.name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDownloadAttachment(attachment)}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveAttachment(index)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={handleBack}
                  >
                    取消
                  </Button>
                  <Button
                    onClick={handleSendEmail}
                    disabled={isSending || !selectedSupplier}
                  >
                    {isSending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        发送中...
                      </>
                    ) : (
                      <>
                        <Mail className="mr-2 h-4 w-4" />
                        发送邮件
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 