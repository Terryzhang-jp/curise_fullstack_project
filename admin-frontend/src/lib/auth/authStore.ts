import { create } from "zustand";
import { persist } from "zustand/middleware";
import { login as loginApi, getCurrentUser } from "../api/auth";

// 用户角色类型
export type UserRole = "superadmin" | "admin" | "user";

// 用户信息类型
export interface User {
  id: number;
  email: string;
  full_name: string | null;
  role: UserRole;
  is_active: boolean;
}

// 认证状态类型
interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean; // 添加初始化标志
  error: string | null;
  // 登录方法
  login: (email: string, password: string) => Promise<void>;
  // 登出方法
  logout: () => void;
  // 获取当前用户信息
  getCurrentUser: () => Promise<void>;
  // 清除错误信息
  clearError: () => void;
}

// 创建认证状态存储
const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      isAuthenticated: false,
      isLoading: false,
      isInitialized: false,
      error: null,

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const data = await loginApi(email, password);
          
          set({
            token: data.access_token,
            isAuthenticated: true,
            isLoading: false,
          });
          
          // 同步到localStorage以确保兼容性
          localStorage.setItem("token", data.access_token);

          // 登录成功后获取用户信息
          await get().getCurrentUser();
        } catch (error: any) {
          set({
            error: error?.response?.data?.detail || "登录失败",
            isLoading: false,
            isAuthenticated: false,
            token: null,
            user: null,
          });
        }
      },

      logout: () => {
        set({
          token: null,
          user: null,
          isAuthenticated: false,
          isInitialized: true, // 保持初始化状态
          error: null,
        });
        
        // 同步清除localStorage
        localStorage.removeItem("token");
      },

      getCurrentUser: async () => {
        const state = get();
        
        // 如果已有用户信息，无需重复获取
        if (state.user && state.isInitialized) return;
        
        const token = state.token;
        if (!token) {
          set({ 
            isAuthenticated: false, 
            isInitialized: true, 
            isLoading: false 
          });
          return;
        }

        set({ isLoading: true });
        try {
          const user = await getCurrentUser();
          set({
            user,
            isAuthenticated: true,
            isLoading: false,
            isInitialized: true,
          });
        } catch (error: any) {
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            isInitialized: true,
            token: null, // 清除无效token
            error: error?.response?.data?.detail || "获取用户信息失败",
          });
          localStorage.removeItem("token");
        }
      },

      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: "auth-storage", // localStorage中的键名
      partialize: (state) => ({ token: state.token }), // 只持久化token
      // 同步token到localStorage以确保兼容性
      onRehydrateStorage: () => (state) => {
        if (state?.token) {
          localStorage.setItem("token", state.token);
        }
      },
    }
  )
);

export default useAuthStore; 