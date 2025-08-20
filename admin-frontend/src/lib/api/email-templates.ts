/**
 * 邮件模板API调用
 */

import axiosInstance from './axios';
import type {
  EmailTemplate,
  EmailTemplateCreate,
  EmailTemplateUpdate,
  EmailTemplateList,
} from '@/app/dashboard/settings/types/email-template';

const BASE_URL = '/email-templates';

export const emailTemplatesApi = {
  // 获取邮件模板列表
  getTemplates: async (params?: {
    skip?: number;
    limit?: number;
  }): Promise<EmailTemplate[]> => {
    console.log("🔍 [邮件模板API] getTemplates 开始调用:", {
      params,
      BASE_URL,
      axiosInstance: axiosInstance.defaults.baseURL
    });

    const searchParams = new URLSearchParams();

    if (params?.skip !== undefined) {
      searchParams.append('skip', params.skip.toString());
    }
    if (params?.limit !== undefined) {
      searchParams.append('limit', params.limit.toString());
    }

    const url = `${BASE_URL}/${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
    console.log("🔍 [邮件模板API] 构造的URL:", {
      BASE_URL,
      searchParams: searchParams.toString(),
      finalUrl: url,
      axiosBaseURL: axiosInstance.defaults.baseURL,
      fullRequestUrl: axiosInstance.defaults.baseURL + url
    });

    try {
      const response = await axiosInstance.get(url);
      console.log("✅ [邮件模板API] getTemplates 成功:", response.data);
      return response.data;
    } catch (error: any) {
      console.error("❌ [邮件模板API] getTemplates 失败:", {
        error,
        url,
        axiosBaseURL: axiosInstance.defaults.baseURL,
        fullRequestUrl: axiosInstance.defaults.baseURL + url,
        errorMessage: error.message,
        errorCode: error.code,
        errorConfig: error.config
      });
      throw error;
    }
  },

  // 获取单个邮件模板
  getTemplate: async (templateId: number): Promise<EmailTemplate> => {
    const response = await axiosInstance.get(`${BASE_URL}/${templateId}`);
    return response.data;
  },

  // 创建邮件模板
  createTemplate: async (data: EmailTemplateCreate): Promise<EmailTemplate> => {
    const response = await axiosInstance.post(`${BASE_URL}`, data);
    return response.data;
  },

  // 更新邮件模板
  updateTemplate: async (templateId: number, data: EmailTemplateUpdate): Promise<EmailTemplate> => {
    const response = await axiosInstance.put(`${BASE_URL}/${templateId}`, data);
    return response.data;
  },

  // 删除邮件模板
  deleteTemplate: async (templateId: number): Promise<{ message: string }> => {
    const response = await axiosInstance.delete(`${BASE_URL}/${templateId}`);
    return response.data;
  },

  // 预览模板（替换变量）
  previewTemplate: async (templateId: number, variables: Record<string, string>): Promise<{ subject: string; content: string }> => {
    const response = await axiosInstance.post(`${BASE_URL}/${templateId}/preview`, { variables });
    return response.data;
  },
};

// 邮件模板工具函数
export const emailTemplateUtils = {
  // 替换模板变量
  replaceVariables: (template: string, variables: Record<string, string>): string => {
    let result = template;
    
    Object.entries(variables).forEach(([key, value]) => {
      // 支持 {{key}} 和 {key} 两种格式
      const regex1 = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      const regex2 = new RegExp(`\\{${key}\\}`, 'g');
      
      result = result.replace(regex1, value);
      result = result.replace(regex2, value);
    });
    
    return result;
  },

  // 提取模板中的变量
  extractVariables: (template: string): string[] => {
    const regex = /\{\{([^}]+)\}\}/g;
    const variables: string[] = [];
    let match;
    
    while ((match = regex.exec(template)) !== null) {
      const variable = match[1].trim();
      if (!variables.includes(variable)) {
        variables.push(variable);
      }
    }
    
    return variables;
  },

  // 验证模板格式
  validateTemplate: (template: EmailTemplateCreate): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];
    
    if (!template.name || template.name.trim().length === 0) {
      errors.push('模板名称不能为空');
    }
    
    if (template.name && template.name.length > 100) {
      errors.push('模板名称不能超过100个字符');
    }
    
    if (!template.subject || template.subject.trim().length === 0) {
      errors.push('邮件主题不能为空');
    }
    
    if (template.subject && template.subject.length > 200) {
      errors.push('邮件主题不能超过200个字符');
    }
    
    if (!template.content || template.content.trim().length === 0) {
      errors.push('邮件内容不能为空');
    }
    
    if (template.content && template.content.length > 10000) {
      errors.push('邮件内容不能超过10000个字符');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  },

  // 格式化日期时间
  formatDateTime: (dateString?: string): string => {
    if (!dateString) return '从未';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return '无效日期';
    }
  },

  // 生成默认变量值（用于预览）
  generateDefaultVariables: (): Record<string, string> => {
    const now = new Date();
    
    return {
      supplier_name: '示例供应商',
      invoice_number: 'INV-2025-001',
      voyage_number: 'VOY-2025-001',
      delivery_date: '2025-08-15',
      delivery_address: '东京港码头A区',
      delivery_port: '东京港',
      product_count: '15',
      total_amount: '¥125,000',
      estimated_amount: '¥50,000',
      contact_person: '张三',
      contact_email: 'zhang@company.com',
      notification_title: '重要通知',
      notification_content: '这是一个示例通知内容',
      product_list: '• 苹果 x100个 - ¥5,000\n• 香蕉 x200个 - ¥3,000\n• 橙子 x150个 - ¥4,500',
      additional_notes: '请确保产品新鲜度',
      test_message: '这是一封测试邮件，用于验证邮件配置是否正常工作。',
      config_name: 'Gmail配置',
      sender_name: '邮轮系统',
      custom_field_1: '自定义内容1',
      custom_field_2: '自定义内容2',
      current_date: now.toLocaleDateString('zh-CN'),
      current_time: now.toLocaleTimeString('zh-CN'),
    };
  },

  // 获取模板类型的显示名称
  getTemplateTypeLabel: (templateType: string): string => {
    const labels: Record<string, string> = {
      order_notification: '订单通知',
      quotation_request: '询价请求',
      supplier_notification: '供应商通知',
      test_email: '测试邮件',
      custom: '自定义'
    };
    
    return labels[templateType] || '未知类型';
  },

  // 检查模板是否包含必要变量
  checkRequiredVariables: (content: string, requiredVars: string[]): { missing: string[]; present: string[] } => {
    const extractedVars = emailTemplateUtils.extractVariables(content);
    const missing = requiredVars.filter(varName => !extractedVars.includes(varName));
    const present = requiredVars.filter(varName => extractedVars.includes(varName));
    
    return { missing, present };
  },

  // 生成模板预览HTML
  generatePreviewHtml: (subject: string, content: string): string => {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
        <div style="background-color: #f5f5f5; padding: 10px; margin-bottom: 20px; border-radius: 4px;">
          <strong>主题：</strong> ${subject}
        </div>
        <div style="line-height: 1.6; white-space: pre-wrap;">
          ${content}
        </div>
      </div>
    `;
  }
};
