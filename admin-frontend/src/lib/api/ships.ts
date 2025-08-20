import axiosInstance from "./axios";
import { Ship, ShipCreate, ShipUpdate, PaginationParams } from "./types";
import { API_ENDPOINTS } from "./endpoints";

const BASE_URL = API_ENDPOINTS.SHIPS;

// 获取船舶列表
export const getShips = async (params?: PaginationParams & { company_id?: number }) => {
  const { skip = 0, limit = 100, company_id } = params || {};
  const response = await axiosInstance.get(`${BASE_URL}/`, {
    params: { skip, limit, company_id }
  });
  return response.data;
};

// 获取单个船舶详情
export const getShip = async (id: number) => {
  const response = await axiosInstance.get(`${BASE_URL}/${id}`);
  return response.data;
};

// 创建新船舶
export const createShip = async (data: ShipCreate) => {
  const response = await axiosInstance.post(`${BASE_URL}/`, data);
  return response.data;
};

// 更新船舶
export const updateShip = async (id: number, data: ShipUpdate) => {
  const response = await axiosInstance.put(`${BASE_URL}/${id}`, data);
  return response.data;
};

// 删除船舶
export const deleteShip = async (id: number) => {
  const response = await axiosInstance.delete(`${BASE_URL}/${id}`);
  return response.data;
}; 