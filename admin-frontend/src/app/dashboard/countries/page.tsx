"use client";

import { useState } from "react";
import type { FC } from "react";
import { useQuery } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Trash2 } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import { getCountries, deleteCountry } from "@/lib/api/countries";
import type { Country } from "@/lib/api/types";
import { toast } from "sonner";
import CountryForm from "./components/CountryForm";

const CountriesPage: FC = () => {
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [editingCountry, setEditingCountry] = useState<Country | null>(null);

  // 获取国家列表
  const { data: countries, isLoading, error, refetch } = useQuery<Country[], Error>({
    queryKey: ["countries"],
    queryFn: async (): Promise<Country[]> => {
      const response = await getCountries();
      return response;
    },
  });

  // 处理添加/编辑模态窗口打开
  const handleAdd = (): void => {
    setEditingCountry(null);
    setIsAddModalOpen(true);
  };

  // 处理编辑
  const handleEdit = (country: Country): void => {
    setEditingCountry(country);
    setIsAddModalOpen(true);
  };

  // 添加/编辑成功处理
  const handleSuccess = (): void => {
    setIsAddModalOpen(false);
    refetch();
    toast.success(editingCountry ? "国家更新成功" : "国家添加成功");
  };

  // 处理删除
  const handleDelete = async (country: Country): Promise<void> => {
    try {
      await deleteCountry(country.id);
      refetch();
      toast.success(`国家 "${country.name}" 删除成功`);
    } catch (error: any) {
      console.error("删除国家失败:", error);
      toast.error(error.response?.data?.detail || "删除失败");
    }
  };

  if (error) {
    return <div className="p-6">加载失败: {JSON.stringify(error)}</div>;
  }

  return (
    <div>
      <PageHeader
        title="国家管理"
        description="管理系统中的国家信息"
        actions={
          <Button onClick={handleAdd}>添加国家</Button>
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
                <TableHead>国家名称</TableHead>
                <TableHead>国家代码</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {countries && countries.length > 0 ? (
                countries.map((country) => (
                  <TableRow key={country.id}>
                    <TableCell>{country.id}</TableCell>
                    <TableCell>{country.name}</TableCell>
                    <TableCell>{country.code}</TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          country.status
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {country.status ? "启用" : "禁用"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(country)}
                        >
                          编辑
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>确认删除</AlertDialogTitle>
                              <AlertDialogDescription>
                                您确定要删除国家 &ldquo;{country.name}&rdquo; 吗？此操作无法撤销。
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>取消</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(country)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                删除
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
                  <TableCell colSpan={5} className="text-center py-8">
                    暂无数据
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <CountryForm
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        country={editingCountry}
        onSuccess={handleSuccess}
      />
    </div>
  );
};

export default CountriesPage; 