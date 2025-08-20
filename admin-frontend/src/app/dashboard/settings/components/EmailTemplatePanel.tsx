"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { 
  Loader2, 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  Copy,
  FileText,
  Save,
  X,
  AlertCircle,
  CheckCircle,
  Info
} from 'lucide-react';
import { toast } from 'sonner';
import type { 
  EmailTemplate, 
  EmailTemplateCreate, 
  EmailTemplateUpdate,
  TemplateType,
  TemplateVariable
} from '../types/email-template';
import { 
  DEFAULT_TEMPLATES, 
  TEMPLATE_VARIABLES 
} from '../types/email-template';
import { emailTemplatesApi, emailTemplateUtils } from '@/lib/api/email-templates';

interface EmailTemplatePanelProps {
  refreshTrigger?: number;
}

export default function EmailTemplatePanel({ refreshTrigger }: EmailTemplatePanelProps) {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [previewContent, setPreviewContent] = useState<{ subject: string; content: string } | null>(null);
  
  // 表单状态
  const [formData, setFormData] = useState<EmailTemplateCreate>({
    name: '',
    subject: '',
    content: ''
  });
  const [selectedTemplateType, setSelectedTemplateType] = useState<TemplateType>('custom');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 加载模板列表
  const loadTemplates = async () => {
    try {
      setIsLoading(true);
      const data = await emailTemplatesApi.getTemplates();
      setTemplates(data);
    } catch (error: any) {
      console.error('加载邮件模板失败:', error);
      toast.error('加载邮件模板失败');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, [refreshTrigger]);

  // 重置表单
  const resetForm = () => {
    setFormData({ name: '', subject: '', content: '' });
    setSelectedTemplateType('custom');
  };

  // 使用预定义模板
  const useDefaultTemplate = (templateType: TemplateType) => {
    const defaultTemplate = DEFAULT_TEMPLATES[templateType];
    if (defaultTemplate) {
      setFormData({
        name: defaultTemplate.name || '',
        subject: defaultTemplate.subject || '',
        content: defaultTemplate.content || ''
      });
    }
  };

  // 创建模板
  const handleCreate = async () => {
    const validation = emailTemplateUtils.validateTemplate(formData);
    if (!validation.valid) {
      toast.error(validation.errors[0]);
      return;
    }

    setIsSubmitting(true);
    try {
      await emailTemplatesApi.createTemplate(formData);
      toast.success('邮件模板创建成功');
      setShowCreateDialog(false);
      resetForm();
      loadTemplates();
    } catch (error: any) {
      console.error('创建模板失败:', error);
      toast.error('创建模板失败');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 更新模板
  const handleUpdate = async () => {
    if (!selectedTemplate) return;

    const validation = emailTemplateUtils.validateTemplate(formData);
    if (!validation.valid) {
      toast.error(validation.errors[0]);
      return;
    }

    setIsSubmitting(true);
    try {
      await emailTemplatesApi.updateTemplate(selectedTemplate.id, formData);
      toast.success('邮件模板更新成功');
      setShowEditDialog(false);
      resetForm();
      setSelectedTemplate(null);
      loadTemplates();
    } catch (error: any) {
      console.error('更新模板失败:', error);
      toast.error('更新模板失败');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 删除模板
  const handleDelete = async () => {
    if (!selectedTemplate) return;

    setIsSubmitting(true);
    try {
      await emailTemplatesApi.deleteTemplate(selectedTemplate.id);
      toast.success('邮件模板删除成功');
      setShowDeleteDialog(false);
      setSelectedTemplate(null);
      loadTemplates();
    } catch (error: any) {
      console.error('删除模板失败:', error);
      toast.error('删除模板失败');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 预览模板
  const handlePreview = (template: EmailTemplate) => {
    const defaultVars = emailTemplateUtils.generateDefaultVariables();
    const previewSubject = emailTemplateUtils.replaceVariables(template.subject, defaultVars);
    const previewContent = emailTemplateUtils.replaceVariables(template.content, defaultVars);
    
    setPreviewContent({
      subject: previewSubject,
      content: previewContent
    });
    setShowPreviewDialog(true);
  };

  // 复制模板
  const handleCopy = (template: EmailTemplate) => {
    setFormData({
      name: `${template.name} (副本)`,
      subject: template.subject,
      content: template.content
    });
    setShowCreateDialog(true);
  };

  // 编辑模板
  const handleEdit = (template: EmailTemplate) => {
    setSelectedTemplate(template);
    setFormData({
      name: template.name,
      subject: template.subject,
      content: template.content
    });
    setShowEditDialog(true);
  };

  // 获取模板中的变量
  const getTemplateVariables = (content: string): string[] => {
    return emailTemplateUtils.extractVariables(content);
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            邮件模板管理
          </CardTitle>
          <CardDescription>
            管理系统邮件模板，支持变量替换和预览功能
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => setShowCreateDialog(true)} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            新建模板
          </Button>
        </CardContent>
      </Card>

      {/* 模板列表 */}
      <Card>
        <CardHeader>
          <CardTitle>模板列表</CardTitle>
          <CardDescription>
            共 {templates.length} 个模板
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              加载中...
            </div>
          ) : templates.length === 0 ? (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                还没有邮件模板。点击"新建模板"创建第一个模板。
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4">
              {templates.map((template) => {
                const variables = getTemplateVariables(template.content);
                
                return (
                  <Card key={template.id} className="border-l-4 border-l-blue-500">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{template.name}</CardTitle>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePreview(template)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            预览
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCopy(template)}
                          >
                            <Copy className="h-4 w-4 mr-1" />
                            复制
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(template)}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            编辑
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedTemplate(template);
                              setShowDeleteDialog(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            删除
                          </Button>
                        </div>
                      </div>
                      <CardDescription>
                        主题：{template.subject}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm text-gray-600 line-clamp-3">
                            {template.content}
                          </p>
                        </div>
                        
                        {variables.length > 0 && (
                          <div>
                            <p className="text-sm font-medium mb-2">使用的变量：</p>
                            <div className="flex flex-wrap gap-1">
                              {variables.map((variable) => (
                                <Badge key={variable} variant="secondary" className="text-xs">
                                  {`{{${variable}}}`}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>创建时间：{emailTemplateUtils.formatDateTime(template.created_at)}</span>
                          <span>更新时间：{emailTemplateUtils.formatDateTime(template.updated_at)}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 创建模板对话框 */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>新建邮件模板</DialogTitle>
            <DialogDescription>
              创建新的邮件模板，支持使用变量进行动态内容替换
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* 模板类型选择 */}
            <div className="space-y-2">
              <Label>模板类型</Label>
              <Select 
                value={selectedTemplateType} 
                onValueChange={(value: TemplateType) => {
                  setSelectedTemplateType(value);
                  useDefaultTemplate(value);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择模板类型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="order_notification">订单通知</SelectItem>
                  <SelectItem value="quotation_request">询价请求</SelectItem>
                  <SelectItem value="supplier_notification">供应商通知</SelectItem>
                  <SelectItem value="test_email">测试邮件</SelectItem>
                  <SelectItem value="custom">自定义</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 基本信息 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">模板名称 *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="输入模板名称"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="subject">邮件主题 *</Label>
                <Input
                  id="subject"
                  value={formData.subject}
                  onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                  placeholder="输入邮件主题"
                />
              </div>
            </div>

            {/* 邮件内容 */}
            <div className="space-y-2">
              <Label htmlFor="content">邮件内容 *</Label>
              <Textarea
                id="content"
                rows={12}
                value={formData.content}
                onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                placeholder="输入邮件内容，可以使用变量如 {{supplier_name}}"
                className="resize-none font-mono text-sm"
              />
            </div>

            {/* 可用变量提示 */}
            {selectedTemplateType !== 'custom' && (
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">可用变量：</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                  {TEMPLATE_VARIABLES[selectedTemplateType].map((variable) => (
                    <div key={variable.key} className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {variable.key}
                      </Badge>
                      <span className="text-gray-600">{variable.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              取消
            </Button>
            <Button onClick={handleCreate} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              创建模板
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 编辑模板对话框 */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>编辑邮件模板</DialogTitle>
            <DialogDescription>
              修改邮件模板内容
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* 基本信息 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">模板名称 *</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="输入模板名称"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-subject">邮件主题 *</Label>
                <Input
                  id="edit-subject"
                  value={formData.subject}
                  onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                  placeholder="输入邮件主题"
                />
              </div>
            </div>

            {/* 邮件内容 */}
            <div className="space-y-2">
              <Label htmlFor="edit-content">邮件内容 *</Label>
              <Textarea
                id="edit-content"
                rows={12}
                value={formData.content}
                onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                placeholder="输入邮件内容，可以使用变量如 {{supplier_name}}"
                className="resize-none font-mono text-sm"
              />
            </div>

            {/* 当前使用的变量 */}
            {formData.content && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">当前使用的变量：</h4>
                <div className="flex flex-wrap gap-1">
                  {getTemplateVariables(formData.content).map((variable) => (
                    <Badge key={variable} variant="secondary" className="text-xs">
                      {`{{${variable}}}`}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              取消
            </Button>
            <Button onClick={handleUpdate} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              保存更改
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 预览模板对话框 */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>模板预览</DialogTitle>
            <DialogDescription>
              使用示例数据预览邮件效果
            </DialogDescription>
          </DialogHeader>

          {previewContent && (
            <div className="space-y-4">
              {/* 邮件主题预览 */}
              <div className="space-y-2">
                <Label>邮件主题</Label>
                <div className="p-3 bg-gray-50 rounded-lg border">
                  <p className="font-medium">{previewContent.subject}</p>
                </div>
              </div>

              {/* 邮件内容预览 */}
              <div className="space-y-2">
                <Label>邮件内容</Label>
                <div className="p-4 bg-white border rounded-lg max-h-96 overflow-y-auto">
                  <div
                    className="whitespace-pre-wrap text-sm leading-relaxed"
                    style={{ fontFamily: 'Arial, sans-serif' }}
                  >
                    {previewContent.content}
                  </div>
                </div>
              </div>

              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  预览使用的是示例数据。实际发送时，变量会被替换为真实数据。
                </AlertDescription>
              </Alert>
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setShowPreviewDialog(false)}>
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>
              您确定要删除模板 "{selectedTemplate?.name}" 吗？此操作无法撤销。
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              取消
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              确认删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 使用说明 */}
      <Card>
        <CardHeader>
          <CardTitle>使用说明</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-2">
              <span className="font-medium text-blue-600">1.</span>
              <span>选择模板类型可以快速使用预定义模板</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-medium text-blue-600">2.</span>
              <span>使用 {`{{变量名}}`} 格式在模板中插入动态内容</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-medium text-blue-600">3.</span>
              <span>预览功能可以查看变量替换后的实际效果</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-medium text-blue-600">4.</span>
              <span>复制功能可以基于现有模板快速创建新模板</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-medium text-blue-600">5.</span>
              <span>模板创建后可在邮件发送功能中选择使用</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
