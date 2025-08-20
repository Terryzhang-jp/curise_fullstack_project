"use client";

import { useState } from "react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { createUser, updateUser, User, CreateUserData, UpdateUserData } from "@/lib/api/users";

interface UserFormProps {
  user: User | null;
  onClose: () => void;
}

export default function UserForm({ user, onClose }: UserFormProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    email: user?.email || "",
    name: user?.name || "",
    password: "",
    role: user?.role || "user",
    is_active: user?.is_active ?? true,
  });
  const [error, setError] = useState<string | null>(null);

  // 创建用户的mutation
  const createMutation = useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      onClose();
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : "创建用户失败，请重试");
    },
  });

  // 更新用户的mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateUserData }) => updateUser(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      onClose();
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : "更新用户失败，请重试");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const data = { ...formData };
    if (!user) {
      // 创建新用户
      if (!data.password) {
        setError("请输入密码");
        return;
      }
      createMutation.mutate(data as CreateUserData);
    } else {
      // 更新用户
      const updateData: UpdateUserData = {
        name: data.name,
        role: data.role,
        is_active: data.is_active,
      };
      if (data.password) {
        updateData.password = data.password;
      }
      updateMutation.mutate({ id: user.id, data: updateData });
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open onOpenChange={() => !isLoading && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{user ? "编辑用户" : "添加用户"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 邮箱 */}
          <div>
            <Label htmlFor="email">邮箱</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              disabled={!!user || isLoading}
              required
            />
          </div>

          {/* 姓名 */}
          <div>
            <Label htmlFor="name">姓名</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              disabled={isLoading}
              required
            />
          </div>

          {/* 密码 */}
          <div>
            <Label htmlFor="password">
              密码{user && " (留空表示不修改)"}
            </Label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              disabled={isLoading}
              required={!user}
            />
          </div>

          {/* 角色 */}
          <div>
            <Label>角色</Label>
            <Select
              value={formData.role}
              onValueChange={(value: "user" | "admin" | "super_admin") =>
                setFormData({ ...formData, role: value })
              }
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">普通用户</SelectItem>
                <SelectItem value="admin">管理员</SelectItem>
                <SelectItem value="super_admin">超级管理员</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 状态 */}
          {user && (
            <div className="flex items-center justify-between">
              <Label>是否激活</Label>
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked: boolean) =>
                  setFormData({ ...formData, is_active: checked })
                }
                disabled={isLoading}
              />
            </div>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              取消
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "提交中..." : "确定"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
} 