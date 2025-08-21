"use client";

import React, { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Loader2,
  Save,
  X,
  Eye,
  FileText,
  Maximize2,
  Minimize2,
  Info,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { toast } from 'sonner';
import type { 
  EmailTemplateCreate, 
  EmailTemplateUpdate,
  TemplateType,
  TemplateVariable
} from '../types/email-template';
import { emailTemplateUtils } from '@/lib/api/email-templates';
import VariableSelector from './VariableSelector';
import SmartTemplateEditor from './SmartTemplateEditor';
import SimpleTemplatePreview from './SimpleTemplatePreview';

interface EnhancedTemplateEditorProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'create' | 'edit';
  initialData?: EmailTemplateCreate;
  onSave: (data: EmailTemplateCreate | EmailTemplateUpdate) => Promise<void>;
  isSubmitting?: boolean;
}

export default function EnhancedTemplateEditor({
  isOpen,
  onClose,
  mode,
  initialData,
  onSave,
  isSubmitting = false
}: EnhancedTemplateEditorProps) {
  const [formData, setFormData] = useState<EmailTemplateCreate>({
    name: initialData?.name || '',
    subject: initialData?.subject || '',
    content: initialData?.content || ''
  });
  const [selectedTemplateType, setSelectedTemplateType] = useState<TemplateType>('custom');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [cursorPosition, setCursorPosition] = useState(0);

  // 新增状态：变量选择器折叠和预览对话框
  const [isVariableSelectorCollapsed, setIsVariableSelectorCollapsed] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  
  const subjectEditorRef = useRef<HTMLTextAreaElement>(null);
  const contentEditorRef = useRef<HTMLTextAreaElement>(null);

  // 重置表单
  const resetForm = useCallback(() => {
    setFormData({ name: '', subject: '', content: '' });
    setSelectedTemplateType('custom');
    setIsFullscreen(false);
  }, []);

  // 处理关闭
  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [resetForm, onClose]);

  // 处理保存
  const handleSave = useCallback(async () => {
    const validation = emailTemplateUtils.validateTemplate(formData);
    if (!validation.valid) {
      toast.error(validation.errors[0]);
      return;
    }

    try {
      await onSave(formData);
      toast.success(mode === 'create' ? '模板创建成功' : '模板更新成功');
      handleClose();
    } catch (error: any) {
      console.error('保存模板失败:', error);
      toast.error('保存模板失败');
    }
  }, [formData, onSave, mode, handleClose]);

  // 处理变量选择
  const handleVariableSelect = useCallback((variable: TemplateVariable) => {
    // 确定当前活跃的编辑器
    const activeEditor = document.activeElement;
    
    if (activeEditor === subjectEditorRef.current) {
      // 插入到主题编辑器
      const currentSubject = formData.subject;
      const start = subjectEditorRef.current?.selectionStart || 0;
      const end = subjectEditorRef.current?.selectionEnd || 0;
      const newSubject = currentSubject.substring(0, start) + variable.key + currentSubject.substring(end);
      
      setFormData(prev => ({ ...prev, subject: newSubject }));
      
      // 设置新的光标位置
      setTimeout(() => {
        if (subjectEditorRef.current) {
          const newPosition = start + variable.key.length;
          subjectEditorRef.current.setSelectionRange(newPosition, newPosition);
          subjectEditorRef.current.focus();
        }
      }, 0);
    } else {
      // 插入到内容编辑器
      const currentContent = formData.content;
      const start = contentEditorRef.current?.selectionStart || 0;
      const end = contentEditorRef.current?.selectionEnd || 0;
      const newContent = currentContent.substring(0, start) + variable.key + currentContent.substring(end);
      
      setFormData(prev => ({ ...prev, content: newContent }));
      
      // 设置新的光标位置
      setTimeout(() => {
        if (contentEditorRef.current) {
          const newPosition = start + variable.key.length;
          contentEditorRef.current.setSelectionRange(newPosition, newPosition);
          contentEditorRef.current.focus();
        }
      }, 0);
    }
  }, [formData.subject, formData.content]);

  // 切换全屏模式
  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(prev => !prev);
  }, []);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent
        className={`${
          isFullscreen
            ? 'max-w-[95vw] max-h-[95vh] w-[95vw] h-[95vh]'
            : 'max-w-[90vw] max-h-[90vh] w-[90vw] h-[85vh]'
        } flex flex-col`}
      >
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {mode === 'create' ? '新建邮件模板' : '编辑邮件模板'}
              </DialogTitle>
              <DialogDescription>
                使用变量选择器创建动态邮件模板，支持实时预览
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPreviewDialog(true)}
                className="flex items-center gap-2"
              >
                <Eye className="h-4 w-4" />
                预览
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={toggleFullscreen}
              >
                {isFullscreen ? (
                  <Minimize2 className="h-4 w-4" />
                ) : (
                  <Maximize2 className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {/* 基本信息区域 */}
          <div className="mb-4 p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="template-name">模板名称 *</Label>
                <Input
                  id="template-name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="输入模板名称"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="template-subject">邮件主题 *</Label>
                <Input
                  ref={subjectEditorRef}
                  id="template-subject"
                  value={formData.subject}
                  onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                  placeholder="输入邮件主题，可使用变量"
                />
              </div>

              <div className="space-y-2">
                <Label>模板类型</Label>
                <Select 
                  value={selectedTemplateType} 
                  onValueChange={(value: TemplateType) => setSelectedTemplateType(value)}
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
            </div>
          </div>

          {/* 简约两栏编辑区域 */}
          <div className="flex-1 flex gap-4 h-full overflow-hidden">
            {/* 左侧：可折叠的变量选择器 */}
            <div className={`transition-all duration-300 overflow-hidden ${
              isVariableSelectorCollapsed ? 'w-16' : 'w-80'
            }`}>
              <div className="h-full flex flex-col">
                {/* 折叠按钮 */}
                <div className="flex justify-end mb-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsVariableSelectorCollapsed(!isVariableSelectorCollapsed)}
                    className="h-8 w-8 p-0"
                    title={isVariableSelectorCollapsed ? "展开变量选择器" : "折叠变量选择器"}
                  >
                    {isVariableSelectorCollapsed ? (
                      <ChevronRight className="h-4 w-4" />
                    ) : (
                      <ChevronLeft className="h-4 w-4" />
                    )}
                  </Button>
                </div>

                {/* 变量选择器 */}
                {!isVariableSelectorCollapsed && (
                  <VariableSelector
                    templateType={selectedTemplateType}
                    onVariableSelect={handleVariableSelect}
                    className="flex-1"
                  />
                )}
              </div>
            </div>

            {/* 右侧：扩展的模板编辑器 */}
            <div className="flex-1 overflow-hidden">
              <Card className="h-full flex flex-col">
                <CardHeader className="flex-shrink-0 pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    模板编辑器
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 overflow-hidden space-y-4">
                  {/* 主题编辑器 */}
                  <div className="space-y-2">
                    <Label htmlFor="subject">邮件主题</Label>
                    <Input
                      id="subject"
                      ref={subjectEditorRef}
                      value={formData.subject}
                      onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                      placeholder="输入邮件主题，可使用变量..."
                      className="font-mono"
                    />
                  </div>

                  {/* 内容编辑器 */}
                  <div className="flex-1 flex flex-col space-y-2">
                    <Label htmlFor="content">邮件内容</Label>
                    <div className="flex-1">
                      <SmartTemplateEditor
                        value={formData.content}
                        onChange={(value) => setFormData(prev => ({ ...prev, content: value }))}
                        onCursorPositionChange={setCursorPosition}
                        placeholder="输入邮件内容，点击左侧变量直接插入..."
                        label=""
                        rows={isFullscreen ? 25 : 15}
                        showVariableHighlight={true}
                        showSyntaxValidation={true}
                        className="h-full"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* 底部操作区域 */}
        <DialogFooter className="flex-shrink-0 mt-4">
          <div className="flex items-center justify-between w-full">
            <Alert className="flex-1 mr-4">
              <Info className="h-4 w-4" />
              <AlertDescription>
                提示：{isVariableSelectorCollapsed ? '点击左侧按钮展开变量选择器，' : '点击左侧变量可直接插入到编辑器中，'}点击预览按钮查看邮件效果
              </AlertDescription>
            </Alert>
            
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={handleClose}>
                取消
              </Button>
              <Button onClick={handleSave} disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {mode === 'create' ? '创建模板' : '保存更改'}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>

      {/* 预览对话框 */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] w-[90vw] h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              邮件预览
            </DialogTitle>
            <DialogDescription>
              预览使用示例数据，实际发送时变量会被替换为真实数据
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-hidden">
            <SimpleTemplatePreview
              subject={formData.subject}
              content={formData.content}
              templateType={selectedTemplateType}
              className="h-full"
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreviewDialog(false)}>
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
