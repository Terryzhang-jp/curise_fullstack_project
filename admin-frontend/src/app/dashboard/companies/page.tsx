"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import PageHeader from "@/components/layout/PageHeader";
import { getCompanies } from "@/lib/api/companies";
import type { Company } from "@/lib/api/types";
import { toast } from "sonner";
import CompanyForm from "./components/CompanyForm";

export default function CompaniesPage() {
  const [isOpen, setIsOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);

  // 获取公司列表
  const { data: companies = [], isLoading, error, refetch } = useQuery<Company[]>({
    queryKey: ["companies"],
    queryFn: () => getCompanies(),
  });

  // 处理添加/编辑模态窗口打开
  const handleAdd = () => {
    setEditingCompany(null);
    setIsOpen(true);
  };

  // 处理编辑
  const handleEdit = (company: Company) => {
    setEditingCompany(company);
    setIsOpen(true);
  };

  // 添加/编辑成功处理
  const handleSuccess = () => {
    setIsOpen(false);
    refetch();
    toast.success(editingCompany ? "公司更新成功" : "公司添加成功");
  };

  if (error) {
    return <div className="p-6">加载失败: {JSON.stringify(error)}</div>;
  }

  return (
    <div>
      <PageHeader
        title="公司管理"
        description="管理系统中的公司信息"
        actions={
          <Button onClick={handleAdd}>添加公司</Button>
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
                <TableHead>公司名称</TableHead>
                <TableHead>所属国家</TableHead>
                <TableHead>联系人</TableHead>
                <TableHead>联系方式</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {companies && companies.length > 0 ? (
                companies.map((company: Company) => (
                  <TableRow key={company.id}>
                    <TableCell>{company.id}</TableCell>
                    <TableCell>{company.name}</TableCell>
                    <TableCell>{company.country?.name || `国家ID: ${company.country_id}`}</TableCell>
                    <TableCell>{company.contact || "-"}</TableCell>
                    <TableCell>
                      {company.phone ? <div>电话: {company.phone}</div> : null}
                      {company.email ? <div>邮箱: {company.email}</div> : null}
                      {!company.phone && !company.email ? "-" : null}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          company.status
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {company.status ? "启用" : "禁用"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(company)}
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

      <CompanyForm
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        company={editingCompany}
        onSuccess={handleSuccess}
      />
    </div>
  );
} 