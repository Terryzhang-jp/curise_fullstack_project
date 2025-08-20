"use client";

import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Modal } from "@/components/ui/modal";
import { FormField, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { createCompany, updateCompany } from "@/lib/api/companies";
import { getCountries } from "@/lib/api/countries";
import { Company, CompanyCreate, CompanyUpdate } from "@/lib/api/types";
import { toast } from "sonner";

interface CompanyFormProps {
  isOpen: boolean;
  onClose: () => void;
  company: Company | null;
  onSuccess: () => void;
}

export default function CompanyForm({ isOpen, onClose, company, onSuccess }: CompanyFormProps) {
  const [formData, setFormData] = useState<CompanyCreate | CompanyUpdate>({
    name: company?.name || "",
    country_id: company?.country_id || 0,
    contact: company?.contact || "",
    email: company?.email || "",
    phone: company?.phone || "",
    status: company?.status !== undefined ? company.status : true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // 获取国家列表用于选择框
  const { data: countries = [] } = useQuery({
    queryKey: ["countries"],
    queryFn: () => getCountries(),
    staleTime: 1000 * 60 * 10, // 10分钟内不重新获取
  });

  // 国家选项
  const countryOptions = (countries as any[]).map((country) => ({
    value: country.id,
    label: country.name,
  }));

  // 创建公司的mutation
  const createMutation = useMutation({
    mutationFn: createCompany,
    onSuccess: () => {
      onSuccess();
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.detail || "创建失败");
    },
  });

  // 更新公司的mutation
  const updateMutation = useMutation({
    mutationFn: (data: CompanyUpdate) => {
      if (!company) throw new Error("No company to update");
      return updateCompany(company.id, data);
    },
    onSuccess: () => {
      onSuccess();
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.detail || "更新失败");
    },
  });

  // 当编辑的公司变化时，更新表单数据
  useEffect(() => {
    if (company) {
      setFormData({
        name: company.name,
        country_id: company.country_id,
        contact: company.contact || "",
        email: company.email || "",
        phone: company.phone || "",
        status: company.status,
      });
    } else {
      resetForm();
    }
  }, [company]);

  // 处理表单输入变更
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : name === "country_id" ? Number(value) : value,
    }));
    
    // 清除错误
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  // 表单验证
  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name) {
      newErrors.name = "公司名称不能为空";
    }
    if (!formData.country_id) {
      newErrors.country_id = "请选择所属国家";
    }
    
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email as string)) {
      newErrors.email = "请输入有效的邮箱地址";
    }
    
    if (formData.phone && !/^[0-9+\-()\s]+$/.test(formData.phone as string)) {
      newErrors.phone = "请输入有效的电话号码";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 提交表单
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    if (company) {
      // 更新现有公司
      updateMutation.mutate(formData as CompanyUpdate);
    } else {
      // 创建新公司
      createMutation.mutate(formData as CompanyCreate);
    }
  };

  // 重置表单
  const resetForm = () => {
    setFormData({
      name: "",
      country_id: 0,
      contact: "",
      email: "",
      phone: "",
      status: true,
    });
    setErrors({});
  };

  // 关闭模态窗口时重置表单
  const handleClose = () => {
    onClose();
    // 延迟重置表单，确保动画结束后再重置
    if (!company) {
      setTimeout(resetForm, 300);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={company ? "编辑公司" : "添加公司"}
    >
      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          <FormField>
            <FormLabel htmlFor="name">公司名称</FormLabel>
            <Input
              id="name"
              name="name"
              value={formData.name as string}
              onChange={handleChange}
              placeholder="请输入公司名称"
              error={errors.name}
            />
          </FormField>

          <FormField>
            <FormLabel htmlFor="country_id">所属国家</FormLabel>
            <Select value={formData.country_id?.toString() || ""} onValueChange={(value) => handleChange({ target: { name: "country_id", value } } as any)}>
              <SelectTrigger className={errors.country_id ? "border-red-500" : ""}>
                <SelectValue placeholder="请选择国家" />
              </SelectTrigger>
              <SelectContent>
                {countryOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value.toString()}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.country_id && (
              <p className="mt-1 text-xs text-red-500">{errors.country_id}</p>
            )}
          </FormField>

          <FormField>
            <FormLabel htmlFor="contact">联系人</FormLabel>
            <Input
              id="contact"
              name="contact"
              value={formData.contact as string}
              onChange={handleChange}
              placeholder="请输入联系人姓名"
            />
          </FormField>

          <FormField>
            <FormLabel htmlFor="email">电子邮箱</FormLabel>
            <Input
              id="email"
              name="email"
              type="email"
              value={formData.email as string}
              onChange={handleChange}
              placeholder="请输入电子邮箱"
              error={errors.email}
            />
          </FormField>

          <FormField>
            <FormLabel htmlFor="phone">联系电话</FormLabel>
            <Input
              id="phone"
              name="phone"
              value={formData.phone as string}
              onChange={handleChange}
              placeholder="请输入联系电话"
              error={errors.phone}
            />
          </FormField>

          <FormField>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="status"
                name="status"
                checked={formData.status as boolean}
                onChange={handleChange}
                className="h-4 w-4 rounded border-slate-300 text-slate-600 focus:ring-slate-500"
              />
              <FormLabel htmlFor="status">启用状态</FormLabel>
            </div>
          </FormField>
        </div>

        <div className="mt-6 flex justify-end space-x-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={createMutation.isPending || updateMutation.isPending}
          >
            取消
          </Button>
          <Button
            type="submit"
            disabled={createMutation.isPending || updateMutation.isPending}
          >
            {createMutation.isPending || updateMutation.isPending ? "提交中..." : "保存"}
          </Button>
        </div>
      </form>
    </Modal>
  );
} 