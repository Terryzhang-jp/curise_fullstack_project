"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import PageHeader from "@/components/layout/PageHeader";
import { getSupplier, getSupplierProducts } from "@/lib/api/suppliers";
import { Product } from "@/lib/api/types";

export default function SupplierProductsPage() {
  const params = useParams();
  const router = useRouter();
  const supplierId = parseInt(params.id as string, 10);
  
  // 获取供应商信息
  const { data: supplier, isLoading: isLoadingSupplier } = useQuery({
    queryKey: ["supplier", supplierId],
    queryFn: () => getSupplier(supplierId),
    enabled: !!supplierId,
  });

  // 获取供应商的产品
  const { data: products = [], isLoading: isLoadingProducts } = useQuery({
    queryKey: ["supplier-products", supplierId],
    queryFn: () => getSupplierProducts(supplierId),
    enabled: !!supplierId,
  });

  // 返回供应商列表
  const handleBack = () => {
    router.push("/dashboard/suppliers");
  };

  // 查看产品详情
  const handleViewProduct = (productId: number) => {
    router.push(`/dashboard/products/${productId}`);
  };

  if (isLoadingSupplier) {
    return <div className="p-6">加载中...</div>;
  }

  if (!supplier) {
    return <div className="p-6">未找到供应商</div>;
  }

  return (
    <div>
      <div className="mb-6">
        <Button variant="outline" size="sm" onClick={handleBack} className="mb-4">
          返回供应商列表
        </Button>
        <PageHeader
          title={`${supplier.name} - 关联产品`}
          description="查看该供应商提供的所有产品"
          actions={
            <Button onClick={() => router.push(`/dashboard/products?supplier_id=${supplierId}`)}>
              管理产品
            </Button>
          }
        />
      </div>

      {isLoadingProducts ? (
        <div className="flex justify-center py-8">加载中...</div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>产品名称</TableHead>
                <TableHead>代码</TableHead>
                <TableHead>价格</TableHead>
                <TableHead>单位</TableHead>
                <TableHead>类别</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.length > 0 ? (
                products.map((product: Product) => (
                  <TableRow key={product.id}>
                    <TableCell>{product.id}</TableCell>
                    <TableCell>{product.product_name_en}</TableCell>
                    <TableCell>{product.code || "-"}</TableCell>
                    <TableCell>{product.price ? `¥${product.price.toFixed(2)}` : "-"}</TableCell>
                    <TableCell>{product.unit || "-"}</TableCell>
                    <TableCell>
                      {product.category?.name || "-"}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          product.status
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {product.status ? "上架" : "下架"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewProduct(product.id)}
                      >
                        查看
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    暂无产品数据
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