import axiosInstance from "./axios";
import { Company, CompanyCreate, CompanyUpdate, PaginationParams } from "./types";
import { API_ENDPOINTS } from "./endpoints";

const BASE_URL = API_ENDPOINTS.COMPANIES;

// 获取公司列表
export const getCompanies = async (params?: PaginationParams & { country_id?: number }) => {
  const { skip = 0, limit = 100, country_id } = params || {};
  const response = await axiosInstance.get(`${BASE_URL}/`, {
    params: { skip, limit, country_id }
  });
  return response.data;
};

// 获取单个公司详情
export const getCompany = async (id: number) => {
  const response = await axiosInstance.get(`${BASE_URL}/${id}`);
  return response.data;
};

// 创建新公司
export const createCompany = async (data: CompanyCreate) => {
  const response = await axiosInstance.post(`${BASE_URL}/`, data);
  return response.data;
};

// 更新公司
export const updateCompany = async (id: number, data: CompanyUpdate) => {
  const response = await axiosInstance.put(`${BASE_URL}/${id}`, data);
  return response.data;
};

// 删除公司
export const deleteCompany = async (id: number) => {
  const response = await axiosInstance.delete(`${BASE_URL}/${id}`);
  return response.data;
}; 