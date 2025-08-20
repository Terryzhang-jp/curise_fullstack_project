/**
 * 邮件配置相关类型定义
 */

export interface EmailConfig {
  id: number;
  config_name: string;
  config_type: 'gmail' | 'smtp';
  is_active: boolean;
  is_default: boolean;
  
  // Gmail配置
  gmail_address?: string;
  sender_name?: string;
  
  // SMTP配置
  smtp_host: string;
  smtp_port: number;
  use_tls: boolean;
  use_ssl: boolean;
  
  // 高级配置
  timeout: number;
  max_retries: number;
  
  // 测试信息
  last_test_at?: string;
  last_test_result?: boolean;
  last_test_error?: string;
  
  // 统计信息
  emails_sent: number;
  last_used_at?: string;
  
  // 审计字段
  created_at: string;
  updated_at: string;
  created_by?: number;
  updated_by?: number;
  
  // 计算字段
  display_name: string;
}

export interface EmailConfigCreate {
  config_name: string;
  config_type: 'gmail' | 'smtp';
  is_active?: boolean;
  is_default?: boolean;
  
  // Gmail配置
  gmail_address?: string;
  gmail_app_password?: string;
  sender_name?: string;
  
  // SMTP配置
  smtp_host?: string;
  smtp_port?: number;
  use_tls?: boolean;
  use_ssl?: boolean;
  
  // 高级配置
  timeout?: number;
  max_retries?: number;
}

export interface EmailConfigUpdate {
  config_name?: string;
  is_active?: boolean;
  is_default?: boolean;
  
  // Gmail配置
  gmail_address?: string;
  gmail_app_password?: string;
  sender_name?: string;
  
  // SMTP配置
  smtp_host?: string;
  smtp_port?: number;
  use_tls?: boolean;
  use_ssl?: boolean;
  
  // 高级配置
  timeout?: number;
  max_retries?: number;
}

export interface EmailConfigList {
  configs: EmailConfig[];
  total: number;
  active_config?: EmailConfig;
}

export interface EmailTestRequest {
  test_email: string;
  subject?: string;
  message?: string;
}

export interface EmailTestResponse {
  success: boolean;
  message: string;
  test_time: string;
  error_details?: string;
}

export interface GmailConfigQuickSetup {
  gmail_address: string;
  gmail_app_password: string;
  sender_name: string;
  set_as_default?: boolean;
}

export interface EmailConfigStats {
  total_configs: number;
  active_configs: number;
  gmail_configs: number;
  smtp_configs: number;
  total_emails_sent: number;
  last_email_sent?: string;
}

export interface EmailConfigFormData {
  config_name: string;
  config_type: 'gmail' | 'smtp';
  is_active: boolean;
  is_default: boolean;
  
  // Gmail配置
  gmail_address: string;
  gmail_app_password: string;
  sender_name: string;
  
  // SMTP配置
  smtp_host: string;
  smtp_port: number;
  use_tls: boolean;
  use_ssl: boolean;
  
  // 高级配置
  timeout: number;
  max_retries: number;
}

export const DEFAULT_EMAIL_CONFIG: Partial<EmailConfigFormData> = {
  config_type: 'gmail',
  is_active: false,
  is_default: false,
  smtp_host: 'smtp.gmail.com',
  smtp_port: 587,
  use_tls: true,
  use_ssl: false,
  timeout: 30,
  max_retries: 3,
};

export const EMAIL_CONFIG_VALIDATION = {
  config_name: {
    required: true,
    minLength: 1,
    maxLength: 100,
  },
  gmail_address: {
    required: true,
    pattern: /^[a-zA-Z0-9._%+-]+@gmail\.com$/,
    message: '必须是有效的Gmail邮箱地址',
  },
  gmail_app_password: {
    required: true,
    length: 16,
    pattern: /^[a-zA-Z0-9]{16}$/,
    message: 'App Password必须是16位字母和数字',
  },
  sender_name: {
    required: true,
    minLength: 1,
    maxLength: 100,
  },
  smtp_host: {
    required: true,
    maxLength: 100,
  },
  smtp_port: {
    required: true,
    min: 1,
    max: 65535,
  },
  timeout: {
    required: true,
    min: 5,
    max: 300,
  },
  max_retries: {
    required: true,
    min: 0,
    max: 10,
  },
};
