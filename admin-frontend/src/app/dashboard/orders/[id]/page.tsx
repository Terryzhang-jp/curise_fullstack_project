"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import PageHeader from "@/components/layout/PageHeader";
import { getOrderById, OrderItem } from "@/lib/api/orders";
import { formatDateTime } from "@/lib/utils";

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = Number(params.id);

  const { data: order, isLoading } = useQuery({
    queryKey: ["order", orderId],
    queryFn: () => getOrderById(orderId),
  });

  const handleBack = () => {
    router.back();
  };

  if (isLoading) {
    return <div className="flex justify-center py-8">加载中...</div>;
  }

  if (!order) {
    return <div className="flex justify-center py-8">订单不存在</div>;
  }

  return (
    <div>
      <PageHeader
        title={`订单详情 - ${order.order_no}`}
        description="查看订单详细信息"
        actions={
          <Button variant="outline" onClick={handleBack}>
            返回
          </Button>
        }
      />

      {/* 订单基本信息 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium mb-4">基本信息</h3>
          <dl className="grid grid-cols-2 gap-4">
            <div>
              <dt className="text-sm font-medium text-gray-500">订单号</dt>
              <dd className="mt-1">{order.order_no}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">状态</dt>
              <dd className="mt-1">
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
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">订单日期</dt>
              <dd className="mt-1">{formatDateTime(order.order_date)}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">交付日期</dt>
              <dd className="mt-1">
                {order.delivery_date ? formatDateTime(order.delivery_date) : "-"}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">总金额</dt>
              <dd className="mt-1">¥{order.total_amount.toFixed(2)}</dd>
            </div>
          </dl>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium mb-4">相关信息</h3>
          <dl className="grid grid-cols-2 gap-4">
            <div>
              <dt className="text-sm font-medium text-gray-500">船舶</dt>
              <dd className="mt-1">{order.ship?.name || "-"}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">公司</dt>
              <dd className="mt-1">{order.company?.name || "-"}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">港口</dt>
              <dd className="mt-1">{order.port?.name || "-"}</dd>
            </div>
          </dl>
        </div>
      </div>

      {/* 订单项目列表 */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-medium mb-4">订单项目</h3>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>产品名称</TableHead>
              <TableHead>供应商</TableHead>
              <TableHead>数量</TableHead>
              <TableHead>单价</TableHead>
              <TableHead>总价</TableHead>
              <TableHead>状态</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(order.items || []).length > 0 ? (
              (order.items || []).map((item: OrderItem) => (
                <TableRow key={item.id}>
                  <TableCell>{item.product.name}</TableCell>
                  <TableCell>{item.supplier.name}</TableCell>
                  <TableCell>{item.quantity}</TableCell>
                  <TableCell>¥{item.unit_price.toFixed(2)}</TableCell>
                  <TableCell>¥{(item.quantity * item.unit_price).toFixed(2)}</TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        item.status === "processed"
                          ? "bg-green-100 text-green-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {item.status === "processed" ? "已处理" : "未处理"}
                    </span>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  暂无订单项目
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
} 