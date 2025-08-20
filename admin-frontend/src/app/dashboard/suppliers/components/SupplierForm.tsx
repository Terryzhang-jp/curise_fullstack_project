"use client";

import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Modal } from "@/components/ui/modal";
import { FormField, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createSupplier, updateSupplier } from "@/lib/api/suppliers";
import { getCountries } from "@/lib/api/countries";
import { getCategories } from "@/lib/api/categories";
import { Supplier, SupplierCreate, SupplierUpdate, Country, Category } from "@/lib/api/types";
import { toast } from "sonner";

interface SupplierFormProps {
  isOpen: boolean;
  onClose: () => void;
  supplier: Supplier | null;
  onSuccess: () => void;
}

export default function SupplierForm({ isOpen, onClose, supplier, onSuccess }: SupplierFormProps) {
  const [formData, setFormData] = useState<SupplierCreate | SupplierUpdate>({
    name: supplier?.name || "",
    code: supplier?.code || "",
    country_id: supplier?.country_id || 0,
    contact: supplier?.contact || "",
    email: supplier?.email || "",
    phone: supplier?.phone || "",
    address: supplier?.address || "",
    status: supplier?.status !== undefined ? supplier.status : true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // 获取国家列表
  const { data: countries = [] } = useQuery({
    queryKey: ["countries"],
    queryFn: () => getCountries(),
    staleTime: 1000 * 60 * 10, // 10分钟内不重新获取
  });

  // 创建供应商的mutation
  const createMutation = useMutation({
    mutationFn: createSupplier,
    onSuccess: () => {
      onSuccess();
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.detail || "创建失败");
    },
  });

  // 更新供应商的mutation
  const updateMutation = useMutation({
    mutationFn: (data: SupplierUpdate) => {
      if (!supplier) throw new Error("No supplier to update");
      return updateSupplier(supplier.id, data);
    },
    onSuccess: () => {
      onSuccess();
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.detail || "更新失败");
    },
  });

  // 当编辑的供应商变化时，更新表单数据
  useEffect(() => {
    if (supplier) {
      setFormData({
        name: supplier.name,
        code: supplier.code || "",
        country_id: supplier.country_id,
        contact: supplier.contact || "",
        email: supplier.email || "",
        phone: supplier.phone || "",
        address: supplier.address || "",
        status: supplier.status,
      });
    } else {
      resetForm();
    }
  }, [supplier]);

  // 处理表单输入变更
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" 
        ? checked 
        : name === "country_id"
          ? (value ? parseInt(value, 10) : undefined)
          : value,
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
      newErrors.name = "供应商名称不能为空";
    }
    if (!formData.country_id) {
      newErrors.country_id = "请选择国家";
    }
    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email as string)) {
      newErrors.email = "邮箱格式不正确";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 提交表单
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    if (supplier) {
      // 更新现有供应商
      updateMutation.mutate(formData as SupplierUpdate);
    } else {
      // 创建新供应商
      createMutation.mutate(formData as SupplierCreate);
    }
  };

  // 重置表单
  const resetForm = () => {
    setFormData({
      name: "",
      code: "",
      country_id: 0,
      contact: "",
      email: "",
      phone: "",
      address: "",
      status: true,
    });
    setErrors({});
  };

  // 关闭模态窗口时重置表单
  const handleClose = () => {
    onClose();
    // 延迟重置表单，确保动画结束后再重置
    if (!supplier) {
      setTimeout(resetForm, 300);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={supplier ? "编辑供应商" : "添加供应商"}
    >
      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          <FormField>
            <FormLabel htmlFor="name">供应商名称</FormLabel>
            <Input
              id="name"
              name="name"
              value={formData.name as string}
              onChange={handleChange}
              placeholder="请输入供应商名称"
              error={errors.name}
            />
          </FormField>

          <FormField>
            <FormLabel htmlFor="code">供应商代码</FormLabel>
            <Input
              id="code"
              name="code"
              value={formData.code as string}
              onChange={handleChange}
              placeholder="请输入供应商代码"
              disabled={!!supplier && !!supplier.code}
            />
          </FormField>

          <FormField>
            <FormLabel htmlFor="country_id">所属国家</FormLabel>
            <select
              id="country_id"
              name="country_id"
              value={formData.country_id?.toString() || ""}
              onChange={handleChange}
              className={`w-full rounded-md border ${
                errors.country_id ? "border-red-500" : "border-gray-300"
              } bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100`}
            >
              <option value="">选择国家</option>
              {countries.map((country: Country) => (
                <option key={country.id} value={country.id.toString()}>
                  {country.name}
                </option>
              ))}
            </select>
            {errors.country_id && (
              <div className="text-sm text-red-500 mt-1">{errors.country_id}</div>
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
            <FormLabel htmlFor="email">邮箱</FormLabel>
            <Input
              id="email"
              name="email"
              type="email"
              value={formData.email as string}
              onChange={handleChange}
              placeholder="请输入邮箱地址"
              error={errors.email}
            />
          </FormField>

          <FormField>
            <FormLabel htmlFor="phone">电话</FormLabel>
            <Input
              id="phone"
              name="phone"
              value={formData.phone as string}
              onChange={handleChange}
              placeholder="请输入电话号码"
            />
          </FormField>

          <FormField>
            <FormLabel htmlFor="address">地址</FormLabel>
            <textarea
              id="address"
              name="address"
              value={formData.address as string}
              onChange={handleChange}
              placeholder="请输入详细地址"
              className="w-full rounded-md border border-slate-300 p-2"
              rows={3}
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
            {createMutation.isPending || updateMutation.isPending
              ? "提交中..."
              : supplier
              ? "更新"
              : "添加"}
          </Button>
        </div>
      </form>
    </Modal>
  );
} 