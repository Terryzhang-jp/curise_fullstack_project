import axios from "axios";
import axiosInstance from "./axios";
import { getApiUrl } from "../utils";
import { API_CONFIG } from "../config";

// 用户登录
export const login = async (email: string, password: string) => {
  try {
    // 登录API需要使用表单格式
    const formData = new URLSearchParams();
    formData.append("username", email);
    formData.append("password", password);

    // 登录接口无需携带token，所以不用axiosInstance
    const response = await axios.post(`${API_CONFIG.BASE_URL}/api/v1/auth/login`, formData, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};

// 获取当前用户信息
export const getCurrentUser = async () => {
  try {
    const response = await axiosInstance.get("/auth/me");
    return response.data;
  } catch (error) {
    throw error;
  }
};

// 用户注册（管理员功能）
export const registerUser = async (userData: {
  email: string;
  password: string;
  full_name: string;
  role: string;
  is_active: boolean;
}) => {
  try {
    const response = await axiosInstance.post("/auth/register", userData);
    return response.data;
  } catch (error) {
    throw error;
  }
}; 