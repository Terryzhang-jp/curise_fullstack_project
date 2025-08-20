/**
 * 邮件设置API调用
 */

import axiosInstance from './axios';
import type {
  EmailConfig,
  EmailConfigCreate,
  EmailConfigUpdate,
  EmailConfigList,
  EmailTestRequest,
  EmailTestResponse,
  GmailConfigQuickSetup,
  EmailConfigStats,
} from '@/app/dashboard/settings/types/email-config';

const BASE_URL = '/email-settings';

export const emailSettingsApi = {
  // 获取邮件配置列表
  getConfigs: async (params?: {
    skip?: number;
    limit?: number;
    config_type?: string;
    is_active?: boolean;
  }): Promise<EmailConfigList> => {
    console.log("🔍 [邮件配置API] getConfigs 开始调用:", {
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
    if (params?.config_type) {
      searchParams.append('config_type', params.config_type);
    }
    if (params?.is_active !== undefined) {
      searchParams.append('is_active', params.is_active.toString());
    }

    const url = `${BASE_URL}/configs${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
    console.log("🔍 [邮件配置API] 构造的URL:", {
      BASE_URL,
      searchParams: searchParams.toString(),
      finalUrl: url,
      axiosBaseURL: axiosInstance.defaults.baseURL,
      fullRequestUrl: axiosInstance.defaults.baseURL + url
    });

    try {
      const response = await axiosInstance.get(url);
      console.log("✅ [邮件配置API] getConfigs 成功:", response.data);
      return response.data;
    } catch (error: any) {
      console.error("❌ [邮件配置API] getConfigs 失败:", {
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

  // 获取单个邮件配置
  getConfig: async (configId: number): Promise<EmailConfig> => {
    const response = await axiosInstance.get(`${BASE_URL}/configs/${configId}`);
    return response.data;
  },

  // 创建邮件配置
  createConfig: async (data: EmailConfigCreate): Promise<EmailConfig> => {
    const response = await axiosInstance.post(`${BASE_URL}/configs`, data);
    return response.data;
  },

  // 更新邮件配置
  updateConfig: async (configId: number, data: EmailConfigUpdate): Promise<EmailConfig> => {
    const response = await axiosInstance.put(`${BASE_URL}/configs/${configId}`, data);
    return response.data;
  },

  // 删除邮件配置
  deleteConfig: async (configId: number): Promise<{ message: string }> => {
    const response = await axiosInstance.delete(`${BASE_URL}/configs/${configId}`);
    return response.data;
  },

  // 激活邮件配置
  activateConfig: async (configId: number): Promise<EmailConfig> => {
    const response = await axiosInstance.post(`${BASE_URL}/configs/${configId}/activate`);
    return response.data;
  },

  // 测试邮件配置
  testConfig: async (configId: number, testData: EmailTestRequest): Promise<EmailTestResponse> => {
    const response = await axiosInstance.post(`${BASE_URL}/configs/${configId}/test`, testData);
    return response.data;
  },

  // Gmail快速配置
  gmailQuickSetup: async (data: GmailConfigQuickSetup): Promise<EmailConfig> => {
    const response = await axiosInstance.post(`${BASE_URL}/gmail/quick-setup`, data);
    return response.data;
  },

  // 获取统计信息
  getStats: async (): Promise<EmailConfigStats> => {
    console.log("🔍 [邮件配置API] getStats 开始调用:", {
      BASE_URL,
      axiosInstance: axiosInstance.defaults.baseURL,
      fullUrl: axiosInstance.defaults.baseURL + `${BASE_URL}/stats`
    });

    try {
      const response = await axiosInstance.get(`${BASE_URL}/stats`);
      console.log("✅ [邮件配置API] getStats 成功:", response.data);
      return response.data;
    } catch (error: any) {
      console.error("❌ [邮件配置API] getStats 失败:", {
        error,
        url: `${BASE_URL}/stats`,
        axiosBaseURL: axiosInstance.defaults.baseURL,
        fullRequestUrl: axiosInstance.defaults.baseURL + `${BASE_URL}/stats`,
        errorMessage: error.message,
        errorCode: error.code,
        errorConfig: error.config
      });
      throw error;
    }
  },
};

// 邮件配置工具函数
export const emailConfigUtils = {
  // 验证Gmail地址
  validateGmailAddress: (email: string): { valid: boolean; message?: string } => {
    if (!email) {
      return { valid: false, message: '邮箱地址不能为空' };
    }
    
    const gmailPattern = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;
    if (!gmailPattern.test(email)) {
      return { valid: false, message: '必须是有效的Gmail邮箱地址' };
    }
    
    return { valid: true };
  },

  // 验证App Password
  validateAppPassword: (password: string): { valid: boolean; message?: string } => {
    if (!password) {
      return { valid: false, message: 'App Password不能为空' };
    }
    
    // 移除空格
    const cleanPassword = password.replace(/\s/g, '');
    
    if (cleanPassword.length !== 16) {
      return { valid: false, message: 'App Password必须是16位字符' };
    }
    
    if (!/^[a-zA-Z0-9]{16}$/.test(cleanPassword)) {
      return { valid: false, message: 'App Password只能包含字母和数字' };
    }
    
    return { valid: true };
  },

  // 格式化App Password（添加空格）
  formatAppPassword: (password: string): string => {
    const clean = password.replace(/\s/g, '');
    return clean.replace(/(.{4})/g, '$1 ').trim();
  },

  // 清理App Password（移除空格）
  cleanAppPassword: (password: string): string => {
    return password.replace(/\s/g, '');
  },

  // 获取配置状态文本
  getConfigStatusText: (config: EmailConfig): string => {
    if (config.is_active && config.is_default) {
      return '当前激活';
    } else if (config.is_active) {
      return '已激活';
    } else {
      return '未激活';
    }
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

  // 生成默认配置名称
  generateConfigName: (gmailAddress: string): string => {
    return `Gmail - ${gmailAddress}`;
  },

  // 检查是否可以删除配置
  canDeleteConfig: (config: EmailConfig): { canDelete: boolean; reason?: string } => {
    // 允许删除任何配置，包括激活的配置
    return { canDelete: true };
  },
};
