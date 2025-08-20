import axiosInstance from './axios';
import { API_ENDPOINTS } from './endpoints';

export interface CruiseOrderProduct {
  product_id?: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  currency: string;
  category_id?: number;
  supplier_id?: number;
  item_code?: string;  // G列的产品代码
}

export interface CruiseOrderHeader {
  po_number: string;
  ship_name: string;
  ship_code?: string;
  supplier_name: string;
  supplier_id?: number;
  destination_port: string;
  port_id?: number;
  delivery_date: string;
  currency: string;
  total_amount: number;
  products: CruiseOrderProduct[];
}

export interface CruiseOrderUploadResponse {
  upload_id: number;
  file_name: string;
  total_orders: number;
  total_products: number;
  orders: CruiseOrderHeader[];
  status: string;
  created_at: string;
}

export interface CruiseOrderConfirmRequest {
  upload_id: number;
  orders_to_confirm: string[];
}

export interface CruiseOrderConfirmResponse {
  upload_id: number;
  confirmed_orders: number;
  created_orders: number[];
  status: string;
  message: string;
}

export interface CruiseOrderAnalysisResponse {
  upload_id: number;
  total_orders: number;
  total_products: number;
  products_by_category: Record<string, number>;
  orders_by_supplier: Record<string, number>;
  total_value: number;
  currency: string;
  analysis_summary: Record<string, any>;
}

export interface UploadHistory {
  upload_id: number;
  file_name: string;
  total_orders: number;
  total_errors: number;
  created_at: string;
}

export interface ProductMatchResult {
  cruise_product: CruiseOrderProduct;
  matched_product?: {
    id: number;
    code: string;
    product_name_en: string;
    product_name_zh: string;
    product_name_jp: string;
    purchase_price: number;
    currency: string;
    supplier_id: number;
    category_id: number;
  };
  match_status: string;  // "matched", "not_matched", "possible_match", "error"
  match_score: number;   // 0-1
  match_reason: string;
}

export interface CruiseOrderMatchRequest {
  upload_id: number;
}

export interface CruiseOrderMatchResponse {
  upload_id: number;
  total_products: number;
  matched_products: number;
  unmatched_products: number;
  match_results: ProductMatchResult[];
}

export const cruiseOrdersApi = {
  // 上传邮轮订单文件
  uploadFile: async (file: File): Promise<CruiseOrderUploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await axiosInstance.post(`${API_ENDPOINTS.CRUISE_ORDERS}/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // 确认订单
  confirmOrders: async (request: CruiseOrderConfirmRequest): Promise<CruiseOrderConfirmResponse> => {
    const response = await axiosInstance.post(`${API_ENDPOINTS.CRUISE_ORDERS}/confirm`, request);
    return response.data;
  },

  // 获取分析结果
  getAnalysis: async (uploadId: number): Promise<CruiseOrderAnalysisResponse> => {
    const response = await axiosInstance.get(`${API_ENDPOINTS.CRUISE_ORDERS}/analysis/${uploadId}`);
    return response.data;
  },

  // 获取上传历史
  getUploadHistory: async (): Promise<UploadHistory[]> => {
    const response = await axiosInstance.get(`${API_ENDPOINTS.CRUISE_ORDERS}/uploads`);
    return response.data;
  },

  // 删除上传记录
  deleteUploadRecord: async (uploadId: number): Promise<{ message: string }> => {
    const response = await axiosInstance.delete(`${API_ENDPOINTS.CRUISE_ORDERS}/uploads/${uploadId}`);
    return response.data;
  },

  // 匹配产品
  matchProducts: async (request: CruiseOrderMatchRequest): Promise<CruiseOrderMatchResponse> => {
    const response = await axiosInstance.post(`${API_ENDPOINTS.CRUISE_ORDERS}/match`, request);
    return response.data;
  },
};