import axiosInstance from "./axios";
import { Country, CountryCreate, CountryUpdate, PaginationParams } from "./types";
import { API_ENDPOINTS } from "./endpoints";

const BASE_URL = API_ENDPOINTS.COUNTRIES;

// 获取国家列表
export const getCountries = async (params?: PaginationParams) => {
  const { skip = 0, limit = 100 } = params || {};
  const response = await axiosInstance.get(`${BASE_URL}/`, {
    params: { skip, limit }
  });
  return response.data;
};

// 获取单个国家详情
export const getCountry = async (id: number) => {
  const response = await axiosInstance.get(`${BASE_URL}/${id}`);
  return response.data;
};

// 创建新国家
export const createCountry = async (data: CountryCreate) => {
  const response = await axiosInstance.post(`${BASE_URL}/`, data);
  return response.data;
};

// 更新国家
export const updateCountry = async (id: number, data: CountryUpdate) => {
  const response = await axiosInstance.put(`${BASE_URL}/${id}`, data);
  return response.data;
};

// 删除国家
export const deleteCountry = async (id: number) => {
  const response = await axiosInstance.delete(`${BASE_URL}/${id}`);
  return response.data;
}; 