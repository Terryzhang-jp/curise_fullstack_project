"use client";

import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Modal } from "@/components/ui/modal";
import { FormField, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createCategory, updateCategory } from "@/lib/api/categories";
import { Category, CategoryCreate, CategoryUpdate } from "@/lib/api/types";
import { toast } from "sonner";

interface CategoryFormProps {
  isOpen: boolean;
  onClose: () => void;
  category: Category | null;
  onSuccess: () => void;
}

export default function CategoryForm({ isOpen, onClose, category, onSuccess }: CategoryFormProps) {
  const [formData, setFormData] = useState<CategoryCreate | CategoryUpdate>({
    name: category?.name || "",
    code: category?.code || "",
    description: category?.description || "",
    status: category?.status !== undefined ? category.status : true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // 创建类别的mutation
  const createMutation = useMutation({
    mutationFn: createCategory,
    onSuccess: () => {
      onSuccess();
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.detail || "创建失败");
    },
  });

  // 更新类别的mutation
  const updateMutation = useMutation({
    mutationFn: (data: CategoryUpdate) => {
      if (!category) throw new Error("No category to update");
      return updateCategory(category.id, data);
    },
    onSuccess: () => {
      onSuccess();
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.detail || "更新失败");
    },
  });

  // 当编辑的类别变化时，更新表单数据
  useEffect(() => {
    if (category) {
      setFormData({
        name: category.name,
        code: category.code,
        description: category.description || "",
        status: category.status,
      });
    } else {
      resetForm();
    }
  }, [category]);

  // 处理表单输入变更
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

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
      newErrors.name = "类别名称不能为空";
    }
    if (!formData.code) {
      newErrors.code = "类别代码不能为空";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 提交表单
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    if (category) {
      // 更新现有类别
      updateMutation.mutate(formData as CategoryUpdate);
    } else {
      // 创建新类别
      createMutation.mutate(formData as CategoryCreate);
    }
  };

  // 重置表单
  const resetForm = () => {
    setFormData({
      name: "",
      code: "",
      description: "",
      status: true,
    });
    setErrors({});
  };

  // 关闭模态窗口时重置表单
  const handleClose = () => {
    onClose();
    // 延迟重置表单，确保动画结束后再重置
    if (!category) {
      setTimeout(resetForm, 300);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={category ? "编辑类别" : "添加类别"}
    >
      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          <FormField>
            <FormLabel htmlFor="name">类别名称</FormLabel>
            <Input
              id="name"
              name="name"
              value={formData.name as string}
              onChange={handleChange}
              placeholder="请输入类别名称"
              error={errors.name}
            />
          </FormField>

          <FormField>
            <FormLabel htmlFor="code">类别代码</FormLabel>
            <Input
              id="code"
              name="code"
              value={formData.code as string}
              onChange={handleChange}
              placeholder="请输入类别代码"
              error={errors.code}
            />
          </FormField>

          <FormField>
            <FormLabel htmlFor="description">类别描述</FormLabel>
            <textarea
              id="description"
              name="description"
              value={formData.description as string}
              onChange={handleChange}
              placeholder="请输入类别描述"
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
              : category
              ? "更新"
              : "添加"}
          </Button>
        </div>
      </form>
    </Modal>
  );
} 