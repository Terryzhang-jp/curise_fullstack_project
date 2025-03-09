/**
 * API配置文件
 * 用于集中管理API端点URL
 */

// API基础URL
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://curise-system.an.r.appspot.com';

// 构建完整API URL的辅助函数
export const getApiUrl = (endpoint: string): string => {
  // 确保endpoint不以/开头（因为API_BASE_URL已经包含了结尾的/）
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.substring(1) : endpoint;
  return `${API_BASE_URL}/${cleanEndpoint}`;
};

// 常用API端点
export const API_ENDPOINTS = {
  // 认证相关
  LOGIN: 'api/v1/auth/login',
  GET_USER: 'api/v1/auth/me',
  
  // 主要实体
  COUNTRIES: 'api/v1/countries',
  COMPANIES: 'api/v1/companies',
  PORTS: 'api/v1/ports',
  SHIPS: 'api/v1/ships',
  PRODUCTS: 'api/v1/products',
  CATEGORIES: 'api/v1/categories',
  SUPPLIERS: 'api/v1/suppliers',
  ORDERS: 'api/v1/orders',
  
  // 其他功能
  EMAIL_TEMPLATES: 'api/v1/email-templates',
  ORDER_PROCESSING: 'api/v1/order-processing',
  ORDER_ANALYSIS: 'api/v1/order-analysis',
  STATISTICS: 'api/v1/statistics',
  OVERVIEW: 'api/v1/overview'
}; 