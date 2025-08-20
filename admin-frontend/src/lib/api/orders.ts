import axiosInstance from "./axios";
import { API_ENDPOINTS } from "./endpoints";

export interface OrderItem {
  id: number;
  product: {
    id: number;
    name: string;
  };
  supplier: {
    id: number;
    name: string;
  };
  quantity: number;
  unit_price: number;
  status: "processed" | "unprocessed";
}

export interface Order {
  id: number;
  order_no: string;
  ship?: {
    id: number;
    name: string;
  };
  company?: {
    id: number;
    name: string;
  };
  port?: {
    id: number;
    name: string;
  };
  order_date: string;
  delivery_date?: string;
  total_amount: number;
  status: "not_started" | "partially_processed" | "fully_processed";
  items?: OrderItem[];
}

export interface OrderStatistics {
  total_orders: number;
  not_started_orders: number;
  partially_processed_orders: number;
  fully_processed_orders: number;
}

interface GetOrdersParams {
  status?: string;
}

export async function getOrders(params?: GetOrdersParams): Promise<Order[]> {
  const { data } = await axiosInstance.get(`${API_ENDPOINTS.ORDERS}/`, { params });
  return data;
}

export async function getOrderById(id: number): Promise<Order> {
  const { data } = await axiosInstance.get(`${API_ENDPOINTS.ORDERS}/${id}`);
  return data;
}

export async function getOrderStatistics(): Promise<OrderStatistics> {
  const { data } = await axiosInstance.get(`${API_ENDPOINTS.ORDERS}/statistics`);
  return data;
}

export async function uploadOrders(formData: FormData): Promise<void> {
  await axiosInstance.post(`${API_ENDPOINTS.ORDERS}/upload`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
}