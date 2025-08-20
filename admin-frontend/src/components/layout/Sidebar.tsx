"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import useAuthStore from "@/lib/auth/authStore";

// 菜单项类型
type MenuItem = {
  title: string;
  href: string;
  icon?: string;
  roles?: string[];  // 允许访问的角色
};

// 菜单配置
const menuItems: MenuItem[] = [
  {
    title: "系统状态检查",
    href: "/dashboard/system-check",
    icon: "🔍",
  },
  {
    title: "数据上传中心",
    href: "/dashboard/data-upload",
    icon: "⬆️",
  },
  {
    title: "仪表盘",
    href: "/dashboard",
    icon: "📊",
  },
  {
    title: "产品管理",
    href: "/dashboard/products",
    icon: "📦",
  },
  {
    title: "分类管理",
    href: "/dashboard/categories",
    icon: "🏷️",
  },
  {
    title: "供应商管理",
    href: "/dashboard/suppliers",
    icon: "🏭",
  },
  {
    title: "订单管理",
    href: "/dashboard/orders",
    icon: "📋",
  },
  {
    title: "邮轮订单导入",
    href: "/dashboard/cruise-orders",
    icon: "🚢",
  },
  {
    title: "国家管理",
    href: "/dashboard/countries",
    icon: "🌎",
  },
  {
    title: "港口管理",
    href: "/dashboard/ports",
    icon: "🚢",
  },
  {
    title: "公司管理",
    href: "/dashboard/companies",
    icon: "🏢",
  },
  {
    title: "船舶管理",
    href: "/dashboard/ships",
    icon: "⚓",
  },
  {
    title: "用户管理",
    href: "/dashboard/users",
    icon: "👥",
    roles: ["superadmin", "admin"], // 只有管理员和超级管理员可以访问
  },
  {
    title: "系统设置",
    href: "/dashboard/settings",
    icon: "⚙️",
    roles: ["superadmin"], // 只有超级管理员可以访问
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuthStore();

  // 根据用户角色筛选菜单项
  const filteredMenuItems = menuItems.filter(
    (item) => !item.roles || (user && item.roles.includes(user.role))
  );

  // 判断链接是否激活
  const isActive = (href: string) => {
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <aside className="w-64 min-h-screen bg-primary text-primary-foreground hidden md:block">
      <div className="p-4">
        <h2 className="text-xl font-bold">邮轮供应链管理</h2>
      </div>
      <nav className="mt-6">
        <ul>
          {filteredMenuItems.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`flex items-center px-4 py-3 text-sm ${
                  isActive(item.href)
                    ? "bg-secondary text-secondary-foreground"
                    : "text-muted-foreground hover:bg-secondary hover:text-secondary-foreground"
                }`}
              >
                {item.icon && <span className="mr-3">{item.icon}</span>}
                {item.title}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}