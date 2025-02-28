'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { PlusIcon, Pencil, Trash2, Save } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface EmailTemplate {
  id: number;
  name: string;
  subject: string;
  content: string;
  created_at: string;
  updated_at: string;
}

interface TemplateFormData {
  name: string;
  subject: string;
  content: string;
}

export default function EmailTemplates() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [formData, setFormData] = useState<TemplateFormData>({
    name: '',
    subject: '',
    content: ''
  });

  // 加载模板列表
  const loadTemplates = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch('http://localhost:8000/api/v1/email-templates/');
      if (!response.ok) throw new Error('获取模板列表失败');
      const data = await response.json();
      setTemplates(data);
    } catch (error) {
      setError(error instanceof Error ? error.message : '加载失败');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  // 处理表单提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingTemplate
        ? `http://localhost:8000/api/v1/email-templates/${editingTemplate.id}`
        : 'http://localhost:8000/api/v1/email-templates/';
      
      const response = await fetch(url, {
        method: editingTemplate ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error('保存模板失败');
      
      await loadTemplates();
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      setError(error instanceof Error ? error.message : '保存失败');
    }
  };

  // 删除模板
  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除这个模板吗？')) return;

    try {
      const response = await fetch(`http://localhost:8000/api/v1/email-templates/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('删除模板失败');
      
      await loadTemplates();
    } catch (error) {
      setError(error instanceof Error ? error.message : '删除失败');
    }
  };

  // 编辑模板
  const handleEdit = (template: EmailTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      subject: template.subject,
      content: template.content,
    });
    setIsDialogOpen(true);
  };

  // 重置表单
  const resetForm = () => {
    setFormData({
      name: '',
      subject: '',
      content: '',
    });
    setEditingTemplate(null);
  };

  // 处理对话框关闭
  const handleDialogClose = () => {
    setIsDialogOpen(false);
    resetForm();
  };

  if (isLoading) {
    return <div className="flex justify-center py-8">加载中...</div>;
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">邮件模板列表</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              resetForm();
              setIsDialogOpen(true);
            }}>
              <PlusIcon className="h-4 w-4 mr-2" />
              新建模板
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>
                {editingTemplate ? '编辑模板' : '新建模板'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">模板名称</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="输入模板名称"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">邮件主题</label>
                <Input
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  placeholder="输入邮件主题"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">邮件内容</label>
                <Textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="输入邮件内容"
                  rows={10}
                  required
                />
                <p className="text-sm text-gray-500">
                  支持以下变量：
                  <br />
                  {'{supplier_name}'} - 供应商名称
                  <br />
                  {'{order_no}'} - 订单编号
                  <br />
                  {'{delivery_date}'} - 交付日期
                </p>
              </div>
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={handleDialogClose}>
                  取消
                </Button>
                <Button type="submit">
                  保存
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {templates.map((template) => (
          <div
            key={template.id}
            className="border rounded-lg p-4 space-y-2"
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-medium">{template.name}</h3>
                <p className="text-sm text-gray-500">{template.subject}</p>
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEdit(template)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDelete(template.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="text-sm text-gray-700 whitespace-pre-wrap">
              {template.content}
            </div>
            <div className="text-xs text-gray-500">
              最后更新: {new Date(template.updated_at).toLocaleString()}
            </div>
          </div>
        ))}

        {templates.length === 0 && (
          <p className="text-center text-gray-500 py-8">
            暂无邮件模板，点击"新建模板"添加
          </p>
        )}
      </div>
    </div>
  );
} 