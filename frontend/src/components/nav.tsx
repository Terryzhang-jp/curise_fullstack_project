'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';

const navigation = [
  { name: '首页', href: '/' },
  { name: '订单管理', href: '/orders' },
  { name: '订单上传', href: '/order-upload' },
  { name: '供应商管理', href: '/suppliers' },
  { name: '产品管理', href: '/products' },
  { name: '类别管理', href: '/categories' },
  { name: '船舶管理', href: '/ships' },
  { name: '国家管理', href: '/countries' },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <nav className="flex space-x-4">
      {navigation.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            'px-3 py-2 text-sm font-medium rounded-md',
            pathname === item.href
              ? 'bg-gray-900 text-white'
              : 'text-gray-300 hover:bg-gray-700 hover:text-white'
          )}
        >
          {item.name}
        </Link>
      ))}
    </nav>
  );
} 