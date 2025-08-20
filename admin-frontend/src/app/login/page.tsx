"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Toaster, toast } from "sonner";
import useAuthStore from "@/lib/auth/authStore";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();

  const { login, isAuthenticated, isLoading, error, clearError } = useAuthStore();

  // 如果已经认证，重定向到仪表盘
  useEffect(() => {
    if (isAuthenticated) {
      router.push("/dashboard");
    }
  }, [isAuthenticated, router]);

  // 添加调试信息
  console.log('Login page - isAuthenticated:', isAuthenticated, 'isLoading:', isLoading);

  // 错误提示
  useEffect(() => {
    if (error) {
      toast.error(error);
      clearError();
    }
  }, [error, clearError]);

  // 处理登录
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    // 简单验证
    if (!email) {
      toast.error("请输入邮箱");
      return;
    }

    if (!password) {
      toast.error("请输入密码");
      return;
    }

    try {
      await login(email, password);
    } catch (err) {
      console.error("登录失败:", err);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-muted">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-foreground">邮轮管理系统</h1>
          <p className="mt-2 text-muted-foreground">数据库管理后台</p>
        </div>

        <div className="p-6 bg-card rounded-lg shadow-lg border border-border">
          <h2 className="mb-6 text-2xl font-semibold text-card-foreground">用户登录</h2>
          
          {/* 添加测试账号提示 */}
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm text-blue-700">
              <strong>测试账号:</strong><br/>
              邮箱: admin@example.com<br/>
              密码: adminpassword
            </p>
          </div>

          <form onSubmit={handleLogin}>
            <div className="mb-4">
              <label htmlFor="email" className="block mb-2 text-sm font-medium text-foreground">
                邮箱
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="请输入邮箱"
              />
            </div>

            <div className="mb-6">
              <label htmlFor="password" className="block mb-2 text-sm font-medium text-foreground">
                密码
              </label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="请输入密码"
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? "登录中..." : "登录"}
            </Button>
          </form>
        </div>
      </div>
      <Toaster position="top-center" />
    </div>
  );
}