import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// 用户角色类型
export type UserRole = 'superadmin' | 'admin' | 'user';

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
      error: null,

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          // 构建FormData对象
          const formData = new URLSearchParams();
          formData.append('username', email);
          formData.append('password', password);

          const response = await fetch('http://localhost:8000/api/v1/auth/login', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: formData,
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || '登录失败');
          }

          const data = await response.json();
          
          // 将token同时保存在localStorage中，方便其他组件直接获取
          localStorage.setItem('token', data.access_token);
          
          set({
            token: data.access_token,
            isAuthenticated: true,
            isLoading: false,
          });

          // 登录成功后获取用户信息
          await get().getCurrentUser();
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : '登录失败',
            isLoading: false,
            isAuthenticated: false,
            token: null,
            user: null,
          });
        }
      },

      logout: () => {
        // 同时清除localStorage中的token
        localStorage.removeItem('token');
        
        set({
          token: null,
          user: null,
          isAuthenticated: false,
          error: null,
        });
      },

      getCurrentUser: async () => {
        const { token } = get();
        if (!token) return;

        set({ isLoading: true });
        try {
          const response = await fetch('http://localhost:8000/api/v1/auth/me', {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (!response.ok) {
            throw new Error('获取用户信息失败');
          }

          const data = await response.json();
          set({
            user: data,
            isLoading: false,
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : '获取用户信息失败',
            isLoading: false,
          });
        }
      },

      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: 'auth-storage', // 持久化存储的键名
    }
  )
);

export default useAuthStore; 