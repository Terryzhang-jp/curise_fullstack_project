import axiosInstance from "./axios";
import { Port, PortCreate, PortUpdate } from "./types";
import { API_ENDPOINTS } from "./endpoints";
import { useQuery } from "@tanstack/react-query";

interface GetPortsParams {
  country_id?: number;
  skip?: number;
  limit?: number;
}

// 获取所有港口
export async function getPorts(params?: GetPortsParams) {
  const response = await axiosInstance.get<Port[]>(`${API_ENDPOINTS.PORTS}/`, { params });
  return response.data;
}

// 使用React Query的港口Hook
export function usePorts(params?: GetPortsParams) {
  return useQuery({
    queryKey: ["ports", params],
    queryFn: () => getPorts(params),
  });
}

// 获取单个港口
export async function getPort(id: number) {
  const response = await axiosInstance.get<Port>(`${API_ENDPOINTS.PORTS}/${id}`);
  return response.data;
}

// 创建港口
export async function createPort(data: PortCreate) {
  const response = await axiosInstance.post<Port>(`${API_ENDPOINTS.PORTS}/`, data);
  return response.data;
}

// 更新港口
export async function updatePort(id: number, data: PortUpdate) {
  const response = await axiosInstance.put<Port>(`${API_ENDPOINTS.PORTS}/${id}`, data);
  return response.data;
}

// 删除港口
export async function deletePort(id: number) {
  await axiosInstance.delete(`${API_ENDPOINTS.PORTS}/${id}`);
}