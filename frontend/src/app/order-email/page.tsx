'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Paperclip, X, CheckCircle, Mail, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { FileIcon } from 'lucide-react';

interface Supplier {
  id: number;
  name: string;
  email: string;
}

interface Attachment {
  file: File;
  name: string;
}

interface OrderItem {
  id: number;
  supplier_id: number;
  // 其他可能的字段...
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

export default function OrderEmailPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplierStatuses, setSupplierStatuses] = useState<SupplierStatus[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [emailData, setEmailData] = useState<EmailData>({
    title: '',
    content: '',
    cc: '',
    bcc: ''
  });
  const [additionalAttachments, setAdditionalAttachments] = useState<Attachment[]>([]);

  useEffect(() => {
    // 从localStorage获取选中的供应商ID和订单项目
    const selectedSuppliersJson = localStorage.getItem('selectedSuppliers');
    const processingItemsJson = localStorage.getItem('processingItems');

    if (!selectedSuppliersJson || !processingItemsJson) {
      alert('缺少必要的数据');
      router.push('/order-supplier-matching');
      return;
    }

    const loadSuppliers = async () => {
      try {
        setIsLoading(true);
        const selectedSupplierIds = JSON.parse(selectedSuppliersJson);
        
        // 获取供应商详细信息
        const response = await fetch('http://localhost:8000/api/v1/suppliers/');
        const allSuppliers = await response.json();
        
        // 过滤出选中的供应商
        const selectedSuppliers = allSuppliers.filter(
          (supplier: Supplier) => selectedSupplierIds.includes(supplier.id)
        );
        
        setSuppliers(selectedSuppliers);
        // 初始化供应商状态
        setSupplierStatuses(
          selectedSuppliers.map(s => ({ id: s.id, status: 'pending' }))
        );
        // 选择第一个供应商
        if (selectedSuppliers.length > 0) {
          setSelectedSupplier(selectedSuppliers[0]);
          updateEmailContent(selectedSuppliers[0]);
        }
      } catch (error) {
        console.error('加载供应商数据失败:', error);
        alert('加载供应商数据失败');
      } finally {
        setIsLoading(false);
      }
    };

    loadSuppliers();
  }, [router]);

  const updateEmailContent = (supplier: Supplier) => {
    setEmailData({
      title: `新订单通知 - ${supplier.name}`,
      content: `尊敬的${supplier.name}：\n\n我们有新的订单需要您处理，详细信息请查看附件。\n\n谢谢！`,
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

  const handleSendEmail = async () => {
    if (!selectedSupplier) return;

    try {
      setIsSending(true);
      const processingItems = JSON.parse(localStorage.getItem('processingItems') || '[]') as OrderItem[];
      
      // 过滤出当前供应商的订单项
      const supplierOrderItems = processingItems.filter(
        item => item.supplier_id === selectedSupplier.id
      );
      
      if (supplierOrderItems.length === 0) {
        alert('当前供应商没有需要发送的订单项');
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

      const response = await fetch('http://localhost:8000/api/v1/orders/send-email', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`发送邮件给 ${selectedSupplier.name} 失败`);
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
        supplierStatuses.find(
          status => status.id === s.id && status.status === 'pending'
        )
      );

      if (nextSupplier) {
        setSelectedSupplier(nextSupplier);
        updateEmailContent(nextSupplier);
      } else {
        // 所有供应商都已发送
        alert('所有邮件发送完成！');
        // 清除localStorage中的临时数据
        localStorage.removeItem('selectedSuppliers');
        localStorage.removeItem('processingItems');
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
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
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
                <div>
                  <Label>收件人</Label>
                  <Input
                    value={selectedSupplier?.name || ''}
                    readOnly
                    className="bg-gray-100"
                  />
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
                    rows={6}
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

                <div className="flex justify-end">
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
                      '发送'
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