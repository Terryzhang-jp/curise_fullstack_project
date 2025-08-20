"use client";

import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Modal } from "@/components/ui/modal";
import { FormField, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createCountry, updateCountry } from "@/lib/api/countries";
import { Country, CountryCreate, CountryUpdate } from "@/lib/api/types";
import { toast } from "sonner";

interface CountryFormProps {
  isOpen: boolean;
  onClose: () => void;
  country: Country | null;
  onSuccess: () => void;
}

export default function CountryForm({ isOpen, onClose, country, onSuccess }: CountryFormProps) {
  const [formData, setFormData] = useState<CountryCreate | CountryUpdate>({
    name: "",
    code: "",
    status: true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // 当 country 改变时更新表单数据
  useEffect(() => {
    if (country) {
      setFormData({
        name: country.name,
        code: country.code,
        status: country.status,
      });
    } else {
      setFormData({
        name: "",
        code: "",
        status: true,
      });
    }
  }, [country]);

  // 创建国家的mutation
  const createMutation = useMutation({
    mutationFn: createCountry,
    onSuccess: () => {
      onSuccess();
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.detail || "创建失败");
    },
  });

  // 更新国家的mutation
  const updateMutation = useMutation({
    mutationFn: (data: CountryUpdate) => {
      if (!country) throw new Error("No country to update");
      return updateCountry(country.id, data);
    },
    onSuccess: () => {
      onSuccess();
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.detail || "更新失败");
    },
  });

  // 处理表单输入变更
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
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
      newErrors.name = "国家名称不能为空";
    }
    if (!formData.code) {
      newErrors.code = "国家代码不能为空";
    } else if ((formData.code as string).length > 3) {
      newErrors.code = "国家代码不能超过3个字符";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 提交表单
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    if (country) {
      // 更新现有国家
      updateMutation.mutate(formData as CountryUpdate);
    } else {
      // 创建新国家
      createMutation.mutate(formData as CountryCreate);
    }
  };

  // 重置表单
  const resetForm = () => {
    setFormData({
      name: "",
      code: "",
      status: true,
    });
    setErrors({});
  };

  // 关闭模态窗口时重置表单
  const handleClose = () => {
    onClose();
    // 延迟重置表单，确保动画结束后再重置
    setTimeout(resetForm, 300);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={country ? "编辑国家" : "添加国家"}
    >
      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          <FormField>
            <FormLabel htmlFor="name">国家名称</FormLabel>
            <Input
              id="name"
              name="name"
              value={formData.name as string}
              onChange={handleChange}
              placeholder="请输入国家名称"
              error={errors.name}
            />
          </FormField>

          <FormField>
            <FormLabel htmlFor="code">国家代码</FormLabel>
            <Input
              id="code"
              name="code"
              value={formData.code as string}
              onChange={handleChange}
              placeholder="请输入国家代码 (最多3个字符)"
              maxLength={3}
              error={errors.code}
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