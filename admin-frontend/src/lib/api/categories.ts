import { Category, CategoryCreate, CategoryUpdate, PaginationParams } from "./types";
import axiosInstance from "./axios";
import { API_ENDPOINTS } from "./endpoints";

const BASE_URL = API_ENDPOINTS.CATEGORIES;

// 获取所有类别
export const getCategories = async (params?: PaginationParams) => {
  const response = await axiosInstance.get<Category[]>(`${BASE_URL}/`, { params });
  return response.data;
};

// 获取单个类别
export const getCategory = async (id: number) => {
  const response = await axiosInstance.get<Category>(`${BASE_URL}/${id}`);
  return response.data;
};

// 创建类别
export const createCategory = async (data: CategoryCreate) => {
  const response = await axiosInstance.post<Category>(`${BASE_URL}/`, data);
  return response.data;
};

// 更新类别
export const updateCategory = async (id: number, data: CategoryUpdate) => {
  const response = await axiosInstance.put<Category>(`${BASE_URL}/${id}`, data);
  return response.data;
};

// 删除类别
export const deleteCategory = async (id: number) => {
  const response = await axiosInstance.delete(`${BASE_URL}/${id}`);
  return response.data;
}; 