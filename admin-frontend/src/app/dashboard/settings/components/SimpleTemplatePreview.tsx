"use client";

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Mail, 
  Clock
} from 'lucide-react';
import type { TemplateType } from '../types/email-template';
import { emailTemplateUtils } from '@/lib/api/email-templates';

interface SimpleTemplatePreviewProps {
  subject: string;
  content: string;
  templateType: TemplateType;
  className?: string;
}

export default function SimpleTemplatePreview({
  subject,
  content,
  templateType,
  className = ""
}: SimpleTemplatePreviewProps) {
  
  // 获取示例变量数据
  const sampleVariables = useMemo(() => {
    return emailTemplateUtils.generateDefaultVariables();
  }, []);

  // 替换变量生成预览内容
  const previewSubject = useMemo(() => {
    return emailTemplateUtils.replaceVariables(subject, sampleVariables);
  }, [subject, sampleVariables]);

  const previewContent = useMemo(() => {
    return emailTemplateUtils.replaceVariables(content, sampleVariables);
  }, [content, sampleVariables]);

  return (
    <div className={`h-full flex flex-col space-y-4 ${className}`}>
      {/* 简洁的标题 */}
      <div className="flex items-center gap-2 pb-2 border-b">
        <Mail className="h-5 w-5 text-blue-600" />
        <h3 className="text-lg font-semibold">邮件预览</h3>
      </div>

      {/* 邮件预览内容 */}
      <div className="flex-1 space-y-4 overflow-y-auto">
        {/* 邮件主题预览 */}
        <div className="space-y-2">
          <div className="text-sm font-medium text-gray-700">主题</div>
          <div className="p-3 bg-gray-50 rounded-lg border">
            <p className="font-medium text-gray-900">
              {previewSubject || '(无主题)'}
            </p>
          </div>
        </div>

        {/* 邮件内容预览 */}
        <div className="space-y-2 flex-1">
          <div className="text-sm font-medium text-gray-700">内容</div>
          <div className="p-4 bg-white border rounded-lg min-h-[300px] max-h-[500px] overflow-y-auto">
            {previewContent ? (
              <div 
                className="whitespace-pre-wrap text-sm leading-relaxed text-gray-900"
                style={{ fontFamily: 'Arial, sans-serif' }}
              >
                {previewContent}
              </div>
            ) : (
              <div className="text-gray-500 text-sm italic flex items-center justify-center h-32">
                (无内容)
              </div>
            )}
          </div>
        </div>

        {/* 简单提示 */}
        <Alert>
          <Clock className="h-4 w-4" />
          <AlertDescription>
            预览使用示例数据，实际发送时变量会被替换为真实数据
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}
