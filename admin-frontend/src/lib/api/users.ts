import axiosInstance from "./axios";
import { API_ENDPOINTS } from "./endpoints";

export interface User {
  id: number;
  email: string;
  name: string;
  role: "user" | "admin" | "super_admin";
  is_active: boolean;
  created_at: string;
}

export interface CreateUserData {
  email: string;
  name: string;
  password: string;
  role: "user" | "admin" | "super_admin";
}

export interface UpdateUserData {
  name?: string;
  password?: string;
  role?: "user" | "admin" | "super_admin";
  is_active?: boolean;
}

export async function getUsers(): Promise<User[]> {
  const { data } = await axiosInstance.get(`${API_ENDPOINTS.USERS}/`);
  return data;
}

export async function getUserById(id: number): Promise<User> {
  const { data } = await axiosInstance.get(`${API_ENDPOINTS.USERS}/${id}`);
  return data;
}

export async function createUser(userData: CreateUserData): Promise<User> {
  const { data } = await axiosInstance.post("/users/", userData);
  return data;
}

export async function updateUser(id: number, userData: UpdateUserData): Promise<User> {
  const { data } = await axiosInstance.patch(`/users/${id}`, userData);
  return data;
}

export async function deleteUser(id: number): Promise<void> {
  await axiosInstance.delete(`/users/${id}`);
}