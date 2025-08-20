"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import useAuthStore from "@/lib/auth/authStore";
import { getDashboardStats, DashboardStats } from "@/lib/api/dashboard";
import { toast } from "sonner";
import { Database, Upload, BarChart3, Settings } from "lucide-react";

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    total_products: 0,
    total_suppliers: 0,
    total_orders: 0,
    total_pending_orders: 0,
    total_ships: 0,
    total_companies: 0,
    total_ports: 0,
    orders_last_30_days: 0,
    active_suppliers: 0,
  });
  const { user } = useAuthStore();
  const router = useRouter();

  // 获取仪表盘数据
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const data = await getDashboardStats();
        setStats(data);
        setLoading(false);
      } catch (error) {
        console.error("获取仪表盘数据失败:", error);
        toast.error("获取仪表盘数据失败");
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  // 加载中状态
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-xl">数据加载中...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">邮轮供应链管理系统</h1>
        <p className="mt-2 text-slate-600">
          欢迎回来，{user?.full_name || user?.email}！
        </p>
      </div>

      {/* 系统管理快速访问 */}
      <div className="mb-8">
        <h2 className="mb-4 text-xl font-semibold">系统管理</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 hover:border-blue-300"
                onClick={() => router.push("/dashboard/system-check")}>
            <CardHeader className="text-center pb-3">
              <Database className="h-8 w-8 mx-auto mb-2 text-blue-600" />
              <CardTitle className="text-lg">系统状态检查</CardTitle>
              <CardDescription className="text-sm">
                查看所有数据表状态和系统健康度
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <Button className="w-full" variant="outline" size="sm">
                立即检查
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 hover:border-green-300"
                onClick={() => router.push("/dashboard/data-upload")}>
            <CardHeader className="text-center pb-3">
              <Upload className="h-8 w-8 mx-auto mb-2 text-green-600" />
              <CardTitle className="text-lg">数据上传</CardTitle>
              <CardDescription className="text-sm">
                批量导入Excel数据到系统
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <Button className="w-full" variant="outline" size="sm">
                开始上传
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 hover:border-purple-300"
                onClick={() => router.push("/dashboard/data-import")}>
            <CardHeader className="text-center pb-3">
              <BarChart3 className="h-8 w-8 mx-auto mb-2 text-purple-600" />
              <CardTitle className="text-lg">数据导入中心</CardTitle>
              <CardDescription className="text-sm">
                管理导入会话和任务进度
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <Button className="w-full" variant="outline" size="sm">
                查看详情
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 hover:border-orange-300"
                onClick={() => router.push("/dashboard/users")}>
            <CardHeader className="text-center pb-3">
              <Settings className="h-8 w-8 mx-auto mb-2 text-orange-600" />
              <CardTitle className="text-lg">用户管理</CardTitle>
              <CardDescription className="text-sm">
                管理系统用户和权限设置
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <Button className="w-full" variant="outline" size="sm">
                管理用户
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 数据概览统计 */}
      <div className="mb-8">
        <h2 className="mb-4 text-xl font-semibold">数据概览</h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div className="p-6 bg-white rounded-lg shadow">
          <h3 className="text-lg font-medium">产品总数</h3>
          <div className="mt-2 text-3xl font-semibold">{stats.total_products}</div>
          <div className="mt-4">
            <Button size="sm" variant="outline" className="text-sm">
              查看详情
            </Button>
          </div>
        </div>

        <div className="p-6 bg-white rounded-lg shadow">
          <h3 className="text-lg font-medium">供应商总数</h3>
          <div className="mt-2 text-3xl font-semibold">{stats.total_suppliers}</div>
          <p className="mt-1 text-sm text-gray-500">活跃供应商: {stats.active_suppliers}</p>
          <div className="mt-4">
            <Button size="sm" variant="outline" className="text-sm">
              查看详情
            </Button>
          </div>
        </div>

        <div className="p-6 bg-white rounded-lg shadow">
          <h3 className="text-lg font-medium">订单总数</h3>
          <div className="mt-2 text-3xl font-semibold">{stats.total_orders}</div>
          <p className="mt-1 text-sm text-gray-500">近30天: {stats.orders_last_30_days}</p>
          <div className="mt-4">
            <Button size="sm" variant="outline" className="text-sm">
              查看详情
            </Button>
          </div>
        </div>

        <div className="p-6 bg-white rounded-lg shadow">
          <h3 className="text-lg font-medium">待处理订单</h3>
          <div className="mt-2 text-3xl font-semibold">{stats.total_pending_orders}</div>
          <div className="mt-4">
            <Button size="sm" variant="outline" className="text-sm">
              查看详情
            </Button>
          </div>
        </div>

        <div className="p-6 bg-white rounded-lg shadow">
          <h3 className="text-lg font-medium">船舶总数</h3>
          <div className="mt-2 text-3xl font-semibold">{stats.total_ships}</div>
          <div className="mt-4">
            <Button size="sm" variant="outline" className="text-sm">
              查看详情
            </Button>
          </div>
        </div>

        <div className="p-6 bg-white rounded-lg shadow">
          <h3 className="text-lg font-medium">公司总数</h3>
          <div className="mt-2 text-3xl font-semibold">{stats.total_companies}</div>
          <div className="mt-4">
            <Button size="sm" variant="outline" className="text-sm">
              查看详情
            </Button>
          </div>
        </div>

        <div className="p-6 bg-white rounded-lg shadow">
          <h3 className="text-lg font-medium">港口总数</h3>
          <div className="mt-2 text-3xl font-semibold">{stats.total_ports}</div>
          <div className="mt-4">
            <Button size="sm" variant="outline" className="text-sm">
              查看详情
            </Button>
          </div>
        </div>
        </div>
      </div>

      {/* 业务管理快速访问 */}
      <div className="mt-8">
        <h2 className="mb-4 text-xl font-semibold">业务管理</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Button
            className="h-16"
            variant="outline"
            onClick={() => router.push("/dashboard/products")}
          >
            📦 产品管理
          </Button>
          <Button
            className="h-16"
            variant="outline"
            onClick={() => router.push("/dashboard/suppliers")}
          >
            🏭 供应商管理
          </Button>
          <Button
            className="h-16"
            variant="outline"
            onClick={() => router.push("/dashboard/orders")}
          >
            📋 订单管理
          </Button>
          <Button
            className="h-16"
            variant="outline"
            onClick={() => router.push("/dashboard/cruise-orders")}
          >
            🚢 邮轮订单
          </Button>
        </div>
      </div>
    </div>
  );
} 