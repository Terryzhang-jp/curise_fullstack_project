'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Settings, LogOut, User } from 'lucide-react';
import useAuthStore from '@/lib/auth';
import { Button } from '@/components/ui/button';

const navigation = [
  { name: '首页', href: '/' },
  { name: '国家管理', href: '/countries' },
  { name: '港口管理', href: '/ports' },
  { name: '公司管理', href: '/companies' },
  { name: '船舶管理', href: '/ships' },
  { name: '类别管理', href: '/categories' },
  { name: '产品管理', href: '/products' },
  { name: '供应商管理', href: '/suppliers' },
  { name: '订单管理', href: '/orders' },
  { name: '订单上传', href: '/order-upload' },
  { name: '订单处理', href: '/order-processing' },
];

// 需要权限的页面路径列表
const protectedPaths = [
  '/countries', '/ports', '/companies', '/ships', 
  '/categories', '/products', '/suppliers', '/orders',
  '/order-upload', '/order-processing', '/settings',
  '/users'
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, logout, isLoading } = useAuthStore();

  // 如果是登录页则不显示导航栏
  if (pathname === '/login') {
    return null;
  }

  // 处理登出
  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  // 定义管理员特有的菜单项
  const adminNavigation = user?.role === 'superadmin' || user?.role === 'admin' 
    ? [{ name: '用户管理', href: '/users' }]
    : [];

  // 合并所有导航项
  const allNavigation = [...navigation, ...adminNavigation];

  return (
    <nav className="bg-white shadow">
      <div className="container mx-auto px-4">
        <div className="flex h-16 justify-between">
          <div className="flex">
            <div className="flex flex-shrink-0 items-center">
              <span className="text-xl font-semibold">邮轮供应链管理系统</span>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              {isAuthenticated && (
                allNavigation.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`inline-flex items-center border-b-2 px-1 pt-1 text-sm font-medium ${
                        isActive
                          ? 'border-indigo-500 text-gray-900'
                          : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                      }`}
                    >
                      {item.name}
                    </Link>
                  );
                })
              )}
            </div>
          </div>
          <div className="flex items-center space-x-4">
            {isAuthenticated ? (
              <>
                {/* 用户信息显示 */}
                <div className="hidden md:flex items-center space-x-1 text-sm text-gray-600">
                  <User className="h-4 w-4" />
                  <span>{user?.full_name || user?.email}</span>
                  <span className="ml-1 px-2 py-0.5 bg-gray-100 rounded-full text-xs">
                    {user?.role === 'superadmin' 
                      ? '超级管理员' 
                      : user?.role === 'admin' 
                        ? '管理员' 
                        : '用户'}
                  </span>
                </div>

                {/* 设置按钮 */}
                <Link
                  href="/settings"
                  className={`inline-flex items-center px-3 py-2 text-sm font-medium ${
                    pathname === '/settings'
                      ? 'text-indigo-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Settings className="h-5 w-5 mr-1" />
                  设置
                </Link>

                {/* 登出按钮 */}
                <Button 
                  variant="outline"
                  size="sm"
                  onClick={handleLogout}
                  className="flex items-center"
                >
                  <LogOut className="h-4 w-4 mr-1" />
                  退出
                </Button>
              </>
            ) : (
              <Button 
                onClick={() => router.push('/login')}
                className="flex items-center"
              >
                登录
              </Button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
} 