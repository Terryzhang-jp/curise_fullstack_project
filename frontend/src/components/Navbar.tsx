'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

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

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="bg-white shadow">
      <div className="container mx-auto px-4">
        <div className="flex h-16 justify-between">
          <div className="flex">
            <div className="flex flex-shrink-0 items-center">
              <span className="text-xl font-semibold">邮轮供应链管理系统</span>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              {navigation.map((item) => {
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
              })}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
} 