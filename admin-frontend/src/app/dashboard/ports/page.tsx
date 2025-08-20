"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import PageHeader from "@/components/layout/PageHeader";
import { getPorts, deletePort } from "@/lib/api/ports";
import type { Port } from "@/lib/api/types";
import { toast } from "sonner";
import PortForm from "./components/PortForm";

export default function PortsPage() {
  const [isOpen, setIsOpen] = useState(false);
  const [editingPort, setEditingPort] = useState<Port | null>(null);
  const [countryFilter, setCountryFilter] = useState<number | undefined>(undefined);
  const queryClient = useQueryClient();

  // 获取港口列表
  const { data: ports = [], isLoading, error, refetch } = useQuery<Port[]>({
    queryKey: ["ports", countryFilter],
    queryFn: () => getPorts({ country_id: countryFilter }),
  });

  // 删除港口的mutation
  const deleteMutation = useMutation({
    mutationFn: deletePort,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ports"] });
      toast.success("港口删除成功");
    },
    onError: (error: any) => {
      toast.error(`删除失败: ${error.response?.data?.detail || error.message}`);
    },
  });

  // 处理添加/编辑模态窗口打开
  const handleAdd = () => {
    setEditingPort(null);
    setIsOpen(true);
  };

  // 处理编辑
  const handleEdit = (port: Port) => {
    setEditingPort(port);
    setIsOpen(true);
  };

  // 处理删除
  const handleDelete = (port: Port) => {
    deleteMutation.mutate(port.id);
  };

  // 添加/编辑成功处理
  const handleSuccess = () => {
    setIsOpen(false);
    refetch();
    toast.success(editingPort ? "港口更新成功" : "港口添加成功");
  };

  if (error) {
    return <div className="p-6">加载失败: {JSON.stringify(error)}</div>;
  }

  return (
    <div>
      <PageHeader
        title="港口管理"
        description="管理系统中的港口信息"
        actions={
          <Button onClick={handleAdd}>添加港口</Button>
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
                <TableHead>港口名称</TableHead>
                <TableHead>所属国家</TableHead>
                <TableHead>位置</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ports && ports.length > 0 ? (
                ports.map((port) => (
                  <TableRow key={port.id}>
                    <TableCell>{port.id}</TableCell>
                    <TableCell>{port.name}</TableCell>
                    <TableCell>{port.country?.name || `国家ID: ${port.country_id}`}</TableCell>
                    <TableCell>{port.location || "-"}</TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          port.status
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {port.status ? "启用" : "禁用"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(port)}
                        >
                          编辑
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-red-600 hover:text-red-700"
                              disabled={deleteMutation.isPending}
                            >
                              删除
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>确认删除</AlertDialogTitle>
                              <AlertDialogDescription>
                                您确定要删除港口 &ldquo;{port.name}&rdquo; 吗？此操作无法撤销。
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>取消</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(port)}
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
                  <TableCell colSpan={6} className="text-center py-8">
                    暂无数据
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <PortForm
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        port={editingPort}
        onSuccess={handleSuccess}
      />
    </div>
  );
} 