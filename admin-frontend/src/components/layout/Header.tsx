"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import useAuthStore from "@/lib/auth/authStore";

export default function Header() {
  const { user, logout } = useAuthStore();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <header className="sticky top-0 z-10 w-full bg-white border-b border-slate-200 shadow-sm">
      <div className="container flex items-center justify-between h-16 px-4 mx-auto">
        <div className="flex items-center space-x-4">
          <Link href="/dashboard">
            <h1 className="text-xl font-bold">邮轮管理系统</h1>
          </Link>
        </div>

        <nav className="hidden md:flex items-center space-x-6">
          <Link href="/dashboard" className="text-sm font-medium hover:text-slate-900">
            首页
          </Link>
          <Link href="/dashboard/products" className="text-sm font-medium hover:text-slate-900">
            产品管理
          </Link>
          <Link href="/dashboard/suppliers" className="text-sm font-medium hover:text-slate-900">
            供应商管理
          </Link>
          <Link href="/dashboard/orders" className="text-sm font-medium hover:text-slate-900">
            订单管理
          </Link>
          {user?.role === "superadmin" && (
            <Link href="/dashboard/users" className="text-sm font-medium hover:text-slate-900">
              用户管理
            </Link>
          )}
        </nav>

        <div className="flex items-center space-x-4">
          {user && (
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium">
                {user.full_name || user.email} ({user.role})
              </span>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                退出
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
} 