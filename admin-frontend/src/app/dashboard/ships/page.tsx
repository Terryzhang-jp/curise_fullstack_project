"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import PageHeader from "@/components/layout/PageHeader";
import { getShips } from "@/lib/api/ships";
import type { Ship } from "@/lib/api/types";
import { toast } from "sonner";
import ShipForm from "./components/ShipForm";

export default function ShipsPage() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingShip, setEditingShip] = useState<Ship | null>(null);
  const [companyFilter, setCompanyFilter] = useState<number | undefined>(undefined);

  // 获取船舶列表
  const { data: ships, isLoading, error, refetch } = useQuery<Ship[]>({
    queryKey: ["ships", companyFilter],
    queryFn: () => getShips({ company_id: companyFilter }),
  });

  // 处理添加/编辑模态窗口打开
  const handleAdd = () => {
    setEditingShip(null);
    setIsAddModalOpen(true);
  };

  // 处理编辑
  const handleEdit = (ship: Ship) => {
    setEditingShip(ship);
    setIsAddModalOpen(true);
  };

  // 添加/编辑成功处理
  const handleSuccess = () => {
    setIsAddModalOpen(false);
    refetch();
    toast.success(editingShip ? "船舶更新成功" : "船舶添加成功");
  };

  if (error) {
    return <div className="p-6">加载失败: {JSON.stringify(error)}</div>;
  }

  return (
    <div>
      <PageHeader
        title="船舶管理"
        description="管理系统中的船舶信息"
        actions={
          <Button onClick={handleAdd}>添加船舶</Button>
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
                <TableHead>船舶名称</TableHead>
                <TableHead>所属公司</TableHead>
                <TableHead>船舶类型</TableHead>
                <TableHead>容量</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ships && ships.length > 0 ? (
                ships.map((ship) => (
                  <TableRow key={ship.id}>
                    <TableCell>{ship.id}</TableCell>
                    <TableCell>{ship.name}</TableCell>
                    <TableCell>{ship.company?.name || `公司ID: ${ship.company_id}`}</TableCell>
                    <TableCell>{ship.ship_type || "-"}</TableCell>
                    <TableCell>{ship.capacity}</TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          ship.status
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {ship.status ? "启用" : "禁用"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(ship)}
                        >
                          编辑
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    暂无数据
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <ShipForm
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        ship={editingShip}
        onSuccess={handleSuccess}
      />
    </div>
  );
} 