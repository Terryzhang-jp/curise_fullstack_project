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
  USERS: 'api/v1/users',
  
  // 统计和概览
  STATISTICS: 'api/v1/statistics',
  OVERVIEW: 'api/v1/overview',
  
  // 订单处理
  ORDER_UPLOAD: 'api/v1/orders/upload',
  ORDER_CONFIRM: 'api/v1/orders/confirm',
  ORDER_PROCESSING: 'api/v1/order-processing',
  ORDER_PROCESSING_ITEMS: 'api/v1/order-processing/items',
  ORDER_ANALYSIS: 'api/v1/order-analysis',
  ORDER_ANALYSIS_UPLOAD: 'api/v1/order-analysis/upload',
  ORDER_ANALYSIS_ASSIGN: 'api/v1/order-analysis/assign',
  
  // 邮件
  EMAIL_TEMPLATES: 'api/v1/email-templates',
  SEND_EMAIL: 'api/v1/orders/send-email',
  
  // 供应商匹配
  SUPPLIER_MATCHING: 'api/v1/order-supplier-matching',
  AVAILABLE_SUPPLIERS: 'api/v1/products/available-suppliers-by-code',
  
  // 健康检查
  HEALTH: 'api/v1/health',
  HEALTH_DB: 'api/v1/health/db'
};