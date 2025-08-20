"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import PageHeader from "@/components/layout/PageHeader";
import { getOrders, getOrderStatistics, Order } from "@/lib/api/orders";
import { formatDateTime } from "@/lib/utils";

export default function OrdersPage() {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);

  // 获取订单列表
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["orders", statusFilter],
    queryFn: () => getOrders({ status: statusFilter }),
  });

  // 获取订单统计信息
  const { data: statistics } = useQuery({
    queryKey: ["order-statistics"],
    queryFn: () => getOrderStatistics(),
  });

  // 查看订单详情
  const handleViewOrder = (orderId: number) => {
    router.push(`/dashboard/orders/${orderId}`);
  };

  // 上传订单
  const handleUploadOrder = () => {
    router.push("/dashboard/orders/upload");
  };

  // 处理状态筛选变更
  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setStatusFilter(value === "all" ? undefined : value);
  };

  return (
    <div>
      <PageHeader
        title="订单管理"
        description="管理系统中的订单信息"
        actions={
          <Button onClick={handleUploadOrder}>上传订单</Button>
        }
      />

      {/* 统计信息 */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">总订单数</h3>
            <p className="mt-1 text-2xl font-semibold">{statistics.total_orders}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">未开始处理</h3>
            <p className="mt-1 text-2xl font-semibold text-yellow-600">
              {statistics.not_started_orders}
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">部分处理</h3>
            <p className="mt-1 text-2xl font-semibold text-blue-600">
              {statistics.partially_processed_orders}
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">完全处理</h3>
            <p className="mt-1 text-2xl font-semibold text-green-600">
              {statistics.fully_processed_orders}
            </p>
          </div>
        </div>
      )}

      {/* 筛选区域 */}
      <div className="mb-6 flex items-center gap-4">
        <div className="w-64">
          <label className="block text-sm font-medium mb-1">按状态筛选</label>
          <select
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
            onChange={handleStatusChange}
            value={statusFilter || "all"}
          >
            <option value="all">所有状态</option>
            <option value="not_started">未开始处理</option>
            <option value="partially_processed">部分处理</option>
            <option value="fully_processed">完全处理</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">加载中...</div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>订单号</TableHead>
                <TableHead>船舶</TableHead>
                <TableHead>公司</TableHead>
                <TableHead>港口</TableHead>
                <TableHead>订单日期</TableHead>
                <TableHead>交付日期</TableHead>
                <TableHead>总金额</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.length > 0 ? (
                orders.map((order: Order) => (
                  <TableRow key={order.id}>
                    <TableCell>{order.order_no}</TableCell>
                    <TableCell>{order.ship?.name || "-"}</TableCell>
                    <TableCell>{order.company?.name || "-"}</TableCell>
                    <TableCell>{order.port?.name || "-"}</TableCell>
                    <TableCell>{formatDateTime(order.order_date)}</TableCell>
                    <TableCell>
                      {order.delivery_date ? formatDateTime(order.delivery_date) : "-"}
                    </TableCell>
                    <TableCell>¥{order.total_amount.toFixed(2)}</TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          order.status === "fully_processed"
                            ? "bg-green-100 text-green-800"
                            : order.status === "partially_processed"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {order.status === "fully_processed"
                          ? "完全处理"
                          : order.status === "partially_processed"
                          ? "部分处理"
                          : "未开始"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewOrder(order.id)}
                      >
                        查看
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">
                    暂无订单数据
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
} 