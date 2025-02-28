'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import useAuthStore from '@/lib/auth';

// 需要认证的页面路径
const protectedPaths = [
  '/countries', '/ports', '/companies', '/ships', 
  '/categories', '/products', '/suppliers', '/orders',
  '/order-upload', '/order-processing', '/settings',
  '/users'
];

// 不需要认证的页面路径
const publicPaths = ['/', '/login'];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, getCurrentUser } = useAuthStore();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    // 应用加载时尝试获取当前用户信息
    const initAuth = async () => {
      try {
        await getCurrentUser();
      } catch (error) {
        console.error('初始化认证状态失败:', error);
      }
    };

    initAuth();
  }, [getCurrentUser]);

  useEffect(() => {
    // 路径变化时检查认证状态
    if (!isLoading) {
      // 判断当前路径是否需要认证
      const needsAuth = protectedPaths.some(path => 
        pathname.startsWith(path) || pathname === path
      );
      
      // 如果未认证且访问需要认证的页面，重定向到登录页
      if (needsAuth && !isAuthenticated) {
        router.push('/login');
      }
    }
  }, [pathname, isAuthenticated, isLoading, router]);

  return <>{children}</>;
} 