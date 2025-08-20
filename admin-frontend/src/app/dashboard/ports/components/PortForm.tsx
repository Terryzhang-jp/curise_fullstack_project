"use client";

import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Modal } from "@/components/ui/modal";
import { FormField, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { createPort, updatePort } from "@/lib/api/ports";
import { getCountries } from "@/lib/api/countries";
import { Port, PortCreate, PortUpdate } from "@/lib/api/types";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface PortFormProps {
  isOpen: boolean;
  onClose: () => void;
  port: Port | null;
  onSuccess: () => void;
}

export default function PortForm({ isOpen, onClose, port, onSuccess }: PortFormProps) {
  const [formData, setFormData] = useState<PortCreate | PortUpdate>({
    name: "",
    country_id: undefined,
    location: "",
    status: true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // 获取国家列表用于选择框
  const { data: countries = [] } = useQuery({
    queryKey: ["countries"],
    queryFn: () => getCountries(),
    staleTime: 1000 * 60 * 10, // 10分钟内不重新获取
  });

  const queryClient = useQueryClient();

  // 创建港口的mutation
  const createMutation = useMutation({
    mutationFn: createPort,
    onSuccess: () => {
      onSuccess();
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.detail || "创建失败");
    },
  });

  // 更新港口的mutation
  const updateMutation = useMutation({
    mutationFn: (data: PortUpdate) => {
      if (!port) throw new Error("No port to update");
      console.log('更新港口数据:', { id: port.id, data });
      return updatePort(port.id, data);
    },
    onSuccess: (response) => {
      console.log('更新成功，响应数据:', response);
      // 立即刷新查询缓存
      queryClient.invalidateQueries({ queryKey: ['ports'] });
      // 延迟关闭模态窗口，确保数据已刷新
      setTimeout(() => {
        onSuccess();
        resetForm();
      }, 1000); // 增加延迟时间到1秒
    },
    onError: (error: any) => {
      console.error('更新失败:', error?.response?.data || error);
      toast.error(error?.response?.data?.detail || error?.message || "更新失败，请稍后重试");
    },
  });

  // 当编辑的港口变化时，更新表单数据
  useEffect(() => {
    if (port) {
      console.log('初始化编辑数据:', port);
      setFormData({
        name: port.name,
        country_id: port.country_id,
        location: port.location || "",
        status: port.status,
      });
    } else {
      resetForm();
    }
  }, [port]);

  // 处理表单输入变更
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement> | { name: string; value: string }
  ) => {
    const name = 'target' in e ? e.target.name : e.name;
    const value = 'target' in e ? 
      e.target.type === "checkbox" ? (e.target as HTMLInputElement).checked : e.target.value 
      : e.value;

    console.log('表单字段变更:', { name, value });

    setFormData((prev) => {
      const newData = {
        ...prev,
        [name]: name === "country_id" ? (value ? Number(value) : undefined) : value,
      };
      console.log('更新后的表单数据:', newData);
      return newData;
    });
    
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
      newErrors.name = "港口名称不能为空";
    }
    if (!formData.country_id) {
      newErrors.country_id = "请选择所属国家";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 提交表单
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const submitData = {
      ...formData,
      location: formData.location || null,
    };

    console.log('提交数据:', submitData);

    if (port) {
      // 更新现有港口
      updateMutation.mutate(submitData as PortUpdate);
    } else {
      // 创建新港口
      createMutation.mutate(submitData as PortCreate);
    }
  };

  // 重置表单
  const resetForm = () => {
    setFormData({
      name: "",
      country_id: undefined,
      location: "",
      status: true,
    });
    setErrors({});
  };

  // 关闭模态窗口时重置表单
  const handleClose = () => {
    onClose();
    // 延迟重置表单，确保动画结束后再重置
    if (!port) {
      setTimeout(resetForm, 300);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={port ? "编辑港口" : "添加港口"}
    >
      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          <FormField>
            <FormLabel htmlFor="name">港口名称</FormLabel>
            <Input
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="请输入港口名称"
              error={errors.name}
            />
          </FormField>

          <FormField>
            <FormLabel htmlFor="country_id">所属国家</FormLabel>
            <Select
              name="country_id"
              value={formData.country_id?.toString()}
              onValueChange={(value) => handleChange({ name: "country_id", value })}
            >
              <SelectTrigger className={errors.country_id ? "border-red-500" : ""}>
                <SelectValue placeholder="请选择国家" />
              </SelectTrigger>
              <SelectContent>
                {countries.map((country: any) => (
                  <SelectItem key={country.id} value={country.id.toString()}>
                    {country.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.country_id && (
              <div className="text-sm text-red-500 mt-1">{errors.country_id}</div>
            )}
          </FormField>

          <FormField>
            <FormLabel htmlFor="location">位置</FormLabel>
            <Input
              id="location"
              name="location"
              value={formData.location || ""}
              onChange={handleChange}
              placeholder="请输入位置信息"
            />
          </FormField>

          <FormField>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="status"
                name="status"
                checked={formData.status}
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