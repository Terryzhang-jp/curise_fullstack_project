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

// Sidebar组件props类型
interface SidebarProps {
  isCollapsed?: boolean;
}

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

export default function Sidebar({ isCollapsed = false }: SidebarProps) {
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
    <aside className={`min-h-screen bg-primary text-primary-foreground transition-all duration-300 ${
      isCollapsed ? 'w-16' : 'w-64'
    } ${
      // 移动端响应式：折叠时隐藏，展开时显示
      isCollapsed ? 'hidden md:block' : 'block'
    }`}>
      {/* 标题区域 */}
      <div className="p-4">
        {isCollapsed ? (
          <div className="flex justify-center">
            <span className="text-xl font-bold">🚢</span>
          </div>
        ) : (
          <h2 className="text-xl font-bold">邮轮供应链管理</h2>
        )}
      </div>

      {/* 导航菜单 */}
      <nav className="mt-6">
        <ul>
          {filteredMenuItems.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`flex items-center px-4 py-3 text-sm transition-all duration-200 ${
                  isActive(item.href)
                    ? "bg-secondary text-secondary-foreground"
                    : "text-muted-foreground hover:bg-secondary hover:text-secondary-foreground"
                } ${isCollapsed ? 'justify-center' : ''}`}
                title={isCollapsed ? item.title : undefined}
              >
                {item.icon && (
                  <span className={`transition-all duration-200 ${isCollapsed ? 'mx-auto' : 'mr-3'}`}>
                    {item.icon}
                  </span>
                )}
                {!isCollapsed && (
                  <span className="transition-opacity duration-200 opacity-100">
                    {item.title}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}