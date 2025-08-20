import axiosInstance from "./axios";
import { Supplier, SupplierCreate, SupplierUpdate, SupplierCategoryUpdate, PaginationParams } from "./types";
import { API_ENDPOINTS } from "./endpoints";
import useSWR from "swr";

const BASE_URL = API_ENDPOINTS.SUPPLIERS;

// 获取所有供应商
export const getSuppliers = async (params?: PaginationParams & {
  country_id?: number;
  category_id?: number;
}) => {
  const response = await axiosInstance.get<Supplier[]>(`${BASE_URL}/`, { params });
  return response.data;
};

// 获取单个供应商
export const getSupplier = async (id: number) => {
  const response = await axiosInstance.get<Supplier>(`${BASE_URL}/${id}`);
  return response.data;
};

// 创建供应商
export const createSupplier = async (data: SupplierCreate) => {
  const response = await axiosInstance.post<Supplier>(`${BASE_URL}/`, data);
  return response.data;
};

// 更新供应商
export const updateSupplier = async (id: number, data: SupplierUpdate) => {
  const response = await axiosInstance.put<Supplier>(`${BASE_URL}/${id}`, data);
  return response.data;
};

// 删除供应商
export const deleteSupplier = async (id: number) => {
  const response = await axiosInstance.delete(`${BASE_URL}/${id}`);
  return response.data;
};

// 更新供应商的类别关联
export const updateSupplierCategories = async (id: number, data: SupplierCategoryUpdate) => {
  const response = await axiosInstance.put<Supplier>(`${BASE_URL}/${id}/categories`, data);
  return response.data;
};

// 获取供应商的产品
export const getSupplierProducts = async (id: number) => {
  const response = await axiosInstance.get(`${API_ENDPOINTS.PRODUCTS}/search`, {
    params: { supplier_id: id }
  });
  return response.data;
};

export const useSuppliers = () => {
  return useSWR<Supplier[]>(API_ENDPOINTS.SUPPLIERS, getSuppliers);
}; 