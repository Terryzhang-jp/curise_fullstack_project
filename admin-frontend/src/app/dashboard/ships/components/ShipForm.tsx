"use client";

import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Modal } from "@/components/ui/modal";
import { FormField, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { createShip, updateShip } from "@/lib/api/ships";
import { getCompanies } from "@/lib/api/companies";
import { Ship, ShipCreate, ShipUpdate } from "@/lib/api/types";
import { toast } from "sonner";

interface ShipFormProps {
  isOpen: boolean;
  onClose: () => void;
  ship: Ship | null;
  onSuccess: () => void;
}

export default function ShipForm({ isOpen, onClose, ship, onSuccess }: ShipFormProps) {
  const [formData, setFormData] = useState<ShipCreate | ShipUpdate>({
    name: ship?.name || "",
    company_id: ship?.company_id || 0,
    ship_type: ship?.ship_type || "",
    capacity: ship?.capacity || 0,
    status: ship?.status !== undefined ? ship.status : true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // 获取公司列表用于选择框
  const { data: companies = [] } = useQuery({
    queryKey: ["companies"],
    queryFn: () => getCompanies(),
    staleTime: 1000 * 60 * 10, // 10分钟内不重新获取
  });

  // 公司选项
  const companyOptions = (companies as any[]).map((company) => ({
    value: company.id,
    label: company.name,
  }));

  // 创建船舶的mutation
  const createMutation = useMutation({
    mutationFn: createShip,
    onSuccess: () => {
      onSuccess();
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.detail || "创建失败");
    },
  });

  // 更新船舶的mutation
  const updateMutation = useMutation({
    mutationFn: (data: ShipUpdate) => {
      if (!ship) throw new Error("No ship to update");
      return updateShip(ship.id, data);
    },
    onSuccess: () => {
      onSuccess();
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.detail || "更新失败");
    },
  });

  // 当编辑的船舶变化时，更新表单数据
  useEffect(() => {
    if (ship) {
      setFormData({
        name: ship.name,
        company_id: ship.company_id,
        ship_type: ship.ship_type || "",
        capacity: ship.capacity,
        status: ship.status,
      });
    } else {
      resetForm();
    }
  }, [ship]);

  // 处理表单输入变更
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" 
        ? checked 
        : name === "company_id" 
          ? Number(value) 
          : name === "capacity" 
            ? Number(value) 
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
      newErrors.name = "船舶名称不能为空";
    }
    if (!formData.company_id) {
      newErrors.company_id = "请选择所属公司";
    }
    if (formData.capacity === undefined || formData.capacity === null || formData.capacity <= 0) {
      newErrors.capacity = "容量必须大于0";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 提交表单
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    if (ship) {
      // 更新现有船舶
      updateMutation.mutate(formData as ShipUpdate);
    } else {
      // 创建新船舶
      createMutation.mutate(formData as ShipCreate);
    }
  };

  // 重置表单
  const resetForm = () => {
    setFormData({
      name: "",
      company_id: 0,
      ship_type: "",
      capacity: 0,
      status: true,
    });
    setErrors({});
  };

  // 关闭模态窗口时重置表单
  const handleClose = () => {
    onClose();
    // 延迟重置表单，确保动画结束后再重置
    if (!ship) {
      setTimeout(resetForm, 300);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={ship ? "编辑船舶" : "添加船舶"}
    >
      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          <FormField>
            <FormLabel htmlFor="name">船舶名称</FormLabel>
            <Input
              id="name"
              name="name"
              value={formData.name as string}
              onChange={handleChange}
              placeholder="请输入船舶名称"
              error={errors.name}
            />
          </FormField>

          <FormField>
            <FormLabel htmlFor="company_id">所属公司</FormLabel>
            <Select value={formData.company_id?.toString() || ""} onValueChange={(value) => handleChange({ target: { name: "company_id", value } } as any)}>
              <SelectTrigger className={errors.company_id ? "border-red-500" : ""}>
                <SelectValue placeholder="请选择公司" />
              </SelectTrigger>
              <SelectContent>
                {companyOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value.toString()}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.company_id && (
              <p className="mt-1 text-xs text-red-500">{errors.company_id}</p>
            )}
          </FormField>

          <FormField>
            <FormLabel htmlFor="ship_type">船舶类型</FormLabel>
            <Input
              id="ship_type"
              name="ship_type"
              value={formData.ship_type as string}
              onChange={handleChange}
              placeholder="请输入船舶类型"
            />
          </FormField>

          <FormField>
            <FormLabel htmlFor="capacity">容量</FormLabel>
            <Input
              id="capacity"
              name="capacity"
              type="number"
              value={formData.capacity}
              onChange={handleChange}
              placeholder="请输入容量"
              error={errors.capacity}
              min="0"
            />
          </FormField>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="status"
              name="status"
              checked={formData.status}
              onChange={handleChange}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <label htmlFor="status" className="ml-2 block text-sm text-gray-900">
              启用
            </label>
          </div>

          <div className="flex justify-end space-x-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
            >
              取消
            </Button>
            <Button type="submit">
              {ship ? "更新" : "创建"}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
} 