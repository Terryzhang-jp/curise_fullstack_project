import axiosInstance from "./axios";
import { API_ENDPOINTS } from "./endpoints";

export interface DashboardStats {
  total_products: number;
  total_suppliers: number;
  total_orders: number;
  total_pending_orders: number;
  total_ships: number;
  total_companies: number;
  total_ports: number;
  orders_last_30_days: number;
  active_suppliers: number;
}

export const getDashboardStats = async (): Promise<DashboardStats> => {
  const response = await axiosInstance.get(`${API_ENDPOINTS.DASHBOARD}/stats`);
  return response.data;
}; 