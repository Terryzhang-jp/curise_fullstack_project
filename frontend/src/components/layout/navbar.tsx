'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import useAuthStore from '@/lib/auth';

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuthStore();

  // 处理登出
  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  // 如果在登录页不显示导航
  if (pathname === '/login') {
    return null;
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white">
      <div className="container flex h-14 items-center">
        <div className="flex flex-1 items-center justify-between">
          {/* 左侧LOGO和系统名称 */}
          <div className="flex items-center space-x-2">
            <Link href="/" className="font-bold text-xl">
              邮轮供应链系统
            </Link>
          </div>

          {/* 右侧导航和用户信息 */}
          <div className="flex items-center space-x-4">
            {isAuthenticated ? (
              <>
                <nav className="flex items-center space-x-4">
                  <Link 
                    href="/orders" 
                    className={`text-sm font-medium transition-colors hover:text-primary ${
                      pathname === '/orders' ? 'text-primary' : 'text-muted-foreground'
                    }`}
                  >
                    订单管理
                  </Link>
                  <Link 
                    href="/products" 
                    className={`text-sm font-medium transition-colors hover:text-primary ${
                      pathname === '/products' ? 'text-primary' : 'text-muted-foreground'
                    }`}
                  >
                    产品管理
                  </Link>
                  <Link 
                    href="/suppliers" 
                    className={`text-sm font-medium transition-colors hover:text-primary ${
                      pathname === '/suppliers' ? 'text-primary' : 'text-muted-foreground'
                    }`}
                  >
                    供应商管理
                  </Link>
                  {user?.role === 'superadmin' && (
                    <Link 
                      href="/users" 
                      className={`text-sm font-medium transition-colors hover:text-primary ${
                        pathname === '/users' ? 'text-primary' : 'text-muted-foreground'
                      }`}
                    >
                      用户管理
                    </Link>
                  )}
                </nav>
                
                <div className="flex items-center space-x-2 border-l pl-4">
                  <span className="text-sm text-muted-foreground">
                    {user?.full_name || user?.email} 
                    <span className="ml-1 text-xs px-1 py-0.5 bg-gray-100 rounded">
                      {user?.role === 'superadmin' 
                        ? '超级管理员' 
                        : user?.role === 'admin' 
                          ? '管理员' 
                          : '用户'}
                    </span>
                  </span>
                  <Button variant="outline" size="sm" onClick={handleLogout}>
                    退出
                  </Button>
                </div>
              </>
            ) : (
              <Button onClick={() => router.push('/login')}>
                登录
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
} 