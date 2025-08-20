"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import PageHeader from "@/components/layout/PageHeader";
import { getSuppliers } from "@/lib/api/suppliers";
import { getCountries } from "@/lib/api/countries";
import type { Supplier, Country } from "@/lib/api/types";
import { toast } from "sonner";
import SupplierForm from "./components/SupplierForm";
import { useRouter } from "next/navigation";

export default function SuppliersPage() {
  const router = useRouter();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [countryFilter, setCountryFilter] = useState<number | undefined>(undefined);

  // 获取供应商列表
  const { data: suppliers = [], isLoading, error, refetch } = useQuery<Supplier[]>({
    queryKey: ["suppliers", countryFilter],
    queryFn: () => getSuppliers({ country_id: countryFilter }),
  });

  // 获取国家列表
  const { data: countries = [] } = useQuery<Country[]>({
    queryKey: ["countries"],
    queryFn: () => getCountries(),
  });

  // 处理添加/编辑模态窗口打开
  const handleAdd = () => {
    setEditingSupplier(null);
    setIsAddModalOpen(true);
  };

  // 处理编辑
  const handleEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setIsAddModalOpen(true);
  };

  // 查看供应商产品
  const handleViewProducts = (supplierId: number) => {
    router.push(`/dashboard/suppliers/${supplierId}/products`);
  };

  // 管理供应商类别
  const handleManageCategories = (supplierId: number) => {
    router.push(`/dashboard/suppliers/${supplierId}/categories`);
  };

  // 添加/编辑成功处理
  const handleSuccess = () => {
    setIsAddModalOpen(false);
    refetch();
    toast.success(editingSupplier ? "供应商更新成功" : "供应商添加成功");
  };

  // 处理国家筛选变更
  const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setCountryFilter(value === "all" ? undefined : parseInt(value, 10));
  };

  if (error) {
    return <div className="p-6">加载失败: {JSON.stringify(error)}</div>;
  }

  return (
    <div>
      <PageHeader
        title="供应商管理"
        description="管理系统中的供应商信息"
        actions={
          <Button onClick={handleAdd}>添加供应商</Button>
        }
      />

      {/* 筛选区域 */}
      <div className="mb-6 flex items-center gap-4">
        <div className="w-64">
          <label className="block text-sm font-medium mb-1">按国家筛选</label>
          <select
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
            onChange={handleCountryChange}
            value={countryFilter?.toString() || "all"}
          >
            <option value="all">所有国家</option>
            {countries.map((country: Country) => (
              <option key={country.id} value={country.id.toString()}>
                {country.name}
              </option>
            ))}
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
                <TableHead>ID</TableHead>
                <TableHead>名称</TableHead>
                <TableHead>代码</TableHead>
                <TableHead>国家</TableHead>
                <TableHead>联系人</TableHead>
                <TableHead>电话</TableHead>
                <TableHead>邮箱</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {suppliers && suppliers.length > 0 ? (
                suppliers.map((supplier) => (
                  <TableRow key={supplier.id}>
                    <TableCell>{supplier.id}</TableCell>
                    <TableCell>{supplier.name}</TableCell>
                    <TableCell>{supplier.code || "-"}</TableCell>
                    <TableCell>{supplier.country?.name || `ID: ${supplier.country_id}`}</TableCell>
                    <TableCell>{supplier.contact || "-"}</TableCell>
                    <TableCell>{supplier.phone || "-"}</TableCell>
                    <TableCell>{supplier.email || "-"}</TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          supplier.status
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {supplier.status ? "启用" : "禁用"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(supplier)}
                        >
                          编辑
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewProducts(supplier.id)}
                        >
                          产品
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleManageCategories(supplier.id)}
                        >
                          类别
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">
                    暂无数据
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <SupplierForm
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        supplier={editingSupplier}
        onSuccess={handleSuccess}
      />
    </div>
  );
} 