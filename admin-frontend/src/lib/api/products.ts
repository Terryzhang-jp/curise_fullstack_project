import axiosInstance from "./axios";
import { Product, ProductCreate, ProductUpdate, PaginationParams } from "./types";
import { API_ENDPOINTS } from "./endpoints";

const BASE_URL = API_ENDPOINTS.PRODUCTS;

// 获取所有产品，支持筛选（不限制数量）
export const getProducts = async (params?: {
  category_id?: number;
  country_id?: number;
}) => {
  const response = await axiosInstance.get<Product[]>(`${BASE_URL}/`, { params });
  return response.data;
};

// 搜索产品（不限制数量）
export const searchProducts = async (params: {
  product_name_en?: string;
  code?: string;
  category_id?: number;
  country_id?: number;
  supplier_id?: number;
}) => {
  const response = await axiosInstance.get<Product[]>(`${BASE_URL}/search`, { params });
  return response.data;
};

// 获取单个产品
export const getProduct = async (id: number) => {
  const response = await axiosInstance.get<Product>(`${BASE_URL}/${id}`);
  return response.data;
};

// 创建产品
export const createProduct = async (data: ProductCreate) => {
  const response = await axiosInstance.post<Product>(`${BASE_URL}/`, data);
  return response.data;
};

// 更新产品
export const updateProduct = async (id: number, data: ProductUpdate) => {
  const response = await axiosInstance.put<Product>(`${BASE_URL}/${id}`, data);
  return response.data;
};

// 删除产品
export const deleteProduct = async (id: number) => {
  try {
    const response = await axiosInstance.delete(`${BASE_URL}/${id}`);
    return response.data;
  } catch (error: any) {
    if (error.response) {
      throw new Error(error.response.data.detail || '删除产品失败');
    }
    throw new Error('网络错误，请稍后重试');
  }
};

// 产品历史记录功能已移除

