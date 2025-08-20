"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import PageHeader from "@/components/layout/PageHeader";
import { getSupplier, updateSupplierCategories } from "@/lib/api/suppliers";
import { getCategories } from "@/lib/api/categories";
import { Category, SupplierCategoryUpdate } from "@/lib/api/types";
import { toast } from "sonner";

export default function SupplierCategoriesPage() {
  const params = useParams();
  const router = useRouter();
  const supplierId = parseInt(params.id as string, 10);
  
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const [isEditing, setIsEditing] = useState(false);

  // 获取供应商信息
  const { data: supplier, isLoading: isLoadingSupplier, refetch: refetchSupplier } = useQuery({
    queryKey: ["supplier", supplierId],
    queryFn: () => getSupplier(supplierId),
    enabled: !!supplierId,
  });

  // 获取所有类别
  const { data: allCategories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: () => getCategories(),
  });

  // 更新已选择的类别
  useEffect(() => {
    if (supplier?.categories) {
      setSelectedCategories(supplier.categories.map((cat: Category) => cat.id));
    }
  }, [supplier]);

  // 更新供应商类别的mutation
  const updateCategoriesMutation = useMutation({
    mutationFn: () => updateSupplierCategories(supplierId, { category_ids: selectedCategories }),
    onSuccess: () => {
      toast.success("供应商类别更新成功");
      setIsEditing(false);
      // 刷新供应商数据
      refetchSupplier();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.detail || "更新失败");
    },
  });

  // 处理类别选择变更
  const handleCategoryToggle = (categoryId: number) => {
    setSelectedCategories((prev) => {
      if (prev.includes(categoryId)) {
        return prev.filter((id) => id !== categoryId);
      } else {
        return [...prev, categoryId];
      }
    });
  };

  // 开始编辑
  const handleStartEdit = () => {
    setIsEditing(true);
  };

  // 保存更改
  const handleSave = () => {
    updateCategoriesMutation.mutate();
  };

  // 取消编辑
  const handleCancel = () => {
    // 重置为原始类别
    if (supplier?.categories) {
      setSelectedCategories(supplier.categories.map((cat: Category) => cat.id));
    }
    setIsEditing(false);
  };

  // 返回供应商列表
  const handleBack = () => {
    router.push("/dashboard/suppliers");
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
          title={`${supplier.name} - 管理类别`}
          description="管理供应商所属的类别"
          actions={
            isEditing ? (
              <div className="flex space-x-2">
                <Button variant="outline" onClick={handleCancel}>
                  取消
                </Button>
                <Button onClick={handleSave} disabled={updateCategoriesMutation.isPending}>
                  {updateCategoriesMutation.isPending ? "保存中..." : "保存"}
                </Button>
              </div>
            ) : (
              <Button onClick={handleStartEdit}>编辑类别</Button>
            )
          }
        />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">选择</TableHead>
              <TableHead>ID</TableHead>
              <TableHead>名称</TableHead>
              <TableHead>描述</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {allCategories.length > 0 ? (
              allCategories.map((category: Category) => (
                <TableRow key={category.id}>
                  <TableCell>
                    <input
                      type="checkbox"
                      checked={selectedCategories.includes(category.id)}
                      onChange={() => handleCategoryToggle(category.id)}
                      disabled={!isEditing}
                      className="h-4 w-4 rounded border-slate-300 text-slate-600 focus:ring-slate-500"
                    />
                  </TableCell>
                  <TableCell>{category.id}</TableCell>
                  <TableCell>{category.name}</TableCell>
                  <TableCell>{category.description || "-"}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8">
                  暂无类别数据
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
} 