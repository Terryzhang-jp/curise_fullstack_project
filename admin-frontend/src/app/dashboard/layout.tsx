"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/layout/Header";
import Sidebar from "@/components/layout/Sidebar";
import useAuthStore from "@/lib/auth/authStore";
import { Toaster } from "sonner";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isAuthenticated, isLoading, isInitialized, getCurrentUser } = useAuthStore();

  // 侧边栏折叠状态管理
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // 切换侧边栏折叠状态
  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  // 认证检查
  useEffect(() => {
    const checkAuth = async () => {
      // 如果尚未初始化，先进行初始化
      if (!isInitialized) {
        await getCurrentUser();
      }
    };

    checkAuth();
  }, [isInitialized, getCurrentUser]);

  // 重定向逻辑
  useEffect(() => {
    // 只有在初始化完成后才进行重定向检查
    if (isInitialized && !isAuthenticated && !isLoading) {
      router.push("/login");
    }
  }, [isInitialized, isAuthenticated, isLoading, router]);

  // 如果正在加载或未初始化，显示加载状态
  if (isLoading || !isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">加载中...</div>
      </div>
    );
  }

  // 如果未认证，不显示内容（此时应该会重定向）
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex flex-col h-screen">
      <Header onToggleSidebar={toggleSidebar} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar isCollapsed={isSidebarCollapsed} />
        <main className="flex-1 p-4 md:p-6 overflow-auto bg-background">
          {children}
        </main>
      </div>
      <Toaster position="top-right" />
    </div>
  );
}