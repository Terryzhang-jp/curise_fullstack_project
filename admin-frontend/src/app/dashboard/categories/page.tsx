"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import PageHeader from "@/components/layout/PageHeader";
import { getCategories, deleteCategory } from "@/lib/api/categories";
import type { Category } from "@/lib/api/types";
import { toast } from "sonner";
import CategoryForm from "./components/CategoryForm";

export default function CategoriesPage() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  // 获取类别列表
  const { data: categories = [], isLoading, refetch } = useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: () => getCategories(),
  });

  // 处理添加/编辑模态窗口打开
  const handleAdd = () => {
    setEditingCategory(null);
    setIsAddModalOpen(true);
  };

  // 处理编辑
  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setIsAddModalOpen(true);
  };

  // 处理删除
  const handleDelete = async (id: number) => {
    try {
      await deleteCategory(id);
      refetch();
      toast.success("分类删除成功");
    } catch (error) {
      toast.error("删除失败");
    }
  };

  // 添加/编辑成功处理
  const handleSuccess = () => {
    setIsAddModalOpen(false);
    refetch();
    toast.success(editingCategory ? "类别更新成功" : "类别添加成功");
  };

  if (!categories) {
    return <div className="flex justify-center py-8">加载中...</div>;
  }

  return (
    <div>
      <PageHeader
        title="类别管理"
        description="管理系统中的产品类别信息"
        actions={
          <Button onClick={handleAdd}>添加类别</Button>
        }
      />

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
                <TableHead>描述</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories && categories.length > 0 ? (
                categories.map((category) => (
                  <TableRow key={category.id}>
                    <TableCell>{category.id}</TableCell>
                    <TableCell>{category.name}</TableCell>
                    <TableCell>{category.code}</TableCell>
                    <TableCell>{category.description || "-"}</TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          category.status
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {category.status ? "启用" : "禁用"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(category)}
                        >
                          编辑
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="destructive"
                              size="sm"
                            >
                              删除
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>确认删除</AlertDialogTitle>
                              <AlertDialogDescription>
                                确定要删除类别 &quot;{category.name}&quot; 吗？此操作无法撤销。
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>取消</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(category.id)}
                              >
                                确认删除
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    暂无数据
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <CategoryForm
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        category={editingCategory}
        onSuccess={handleSuccess}
      />
    </div>
  );
} 