'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import useAuthStore from '@/lib/auth';
import { toast } from '@/components/ui/use-toast';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { getApiUrl, API_ENDPOINTS } from '@/lib/api-config';

interface User {
  id: number;
  email: string;
  full_name: string | null;
  role: 'superadmin' | 'admin' | 'user';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function UsersPage() {
  const { user: currentUser, token } = useAuthStore();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    password: '',
    role: 'user',
    is_active: true
  });
  const [error, setError] = useState('');

  useEffect(() => {
    if (token) {
      fetchUsers();
    }
  }, [token]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch(getApiUrl(API_ENDPOINTS.USERS), {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || '获取用户列表失败');
      }
      
      const data = await response.json();
      setUsers(data);
    } catch (error) {
      console.error('获取用户列表错误:', error);
      setError(error instanceof Error ? error.message : '未知错误');
      toast({
        title: "错误",
        description: error instanceof Error ? error.message : '获取用户列表失败',
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    });
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch(getApiUrl(API_ENDPOINTS.USERS), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || '创建用户失败');
      }

      await fetchUsers();
      setIsAddDialogOpen(false);
      resetForm();
      toast({
        title: "成功",
        description: "用户创建成功",
      });
    } catch (error) {
      console.error('创建用户错误:', error);
      setError(error instanceof Error ? error.message : '未知错误');
      toast({
        title: "错误",
        description: error instanceof Error ? error.message : '创建用户失败',
        variant: "destructive",
      });
    }
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    try {
      const dataToSend = { ...formData } as Partial<typeof formData>;
      if (!dataToSend.password) {
        delete dataToSend.password;
      }

      const response = await fetch(`api/v1/users/${editingUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(dataToSend)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || '更新用户失败');
      }

      await fetchUsers();
      setIsEditDialogOpen(false);
      setEditingUser(null);
      resetForm();
      toast({
        title: "成功",
        description: "用户更新成功",
      });
    } catch (error) {
      console.error('更新用户错误:', error);
      setError(error instanceof Error ? error.message : '未知错误');
      toast({
        title: "错误",
        description: error instanceof Error ? error.message : '更新用户失败',
        variant: "destructive",
      });
    }
  };

  const handleDeleteUser = async (userId: number) => {
    try {
      const response = await fetch(`api/v1/users/${userId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || '删除用户失败');
      }

      await fetchUsers();
      toast({
        title: "成功",
        description: "用户已成功删除",
      });
    } catch (error) {
      console.error('删除用户错误:', error);
      setError(error instanceof Error ? error.message : '未知错误');
      toast({
        title: "错误",
        description: error instanceof Error ? error.message : '删除用户失败',
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (user: User) => {
    setEditingUser(user);
    setFormData({
      email: user.email,
      full_name: user.full_name || '',
      password: '',
      role: user.role,
      is_active: user.is_active
    });
    setIsEditDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      email: '',
      full_name: '',
      password: '',
      role: 'user',
      is_active: true
    });
    setError('');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">用户管理</h1>
        {(currentUser?.role === 'admin' || currentUser?.role === 'superadmin') && (
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>添加用户</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>添加新用户</DialogTitle>
                <DialogDescription>
                  创建新的系统用户账号。
                </DialogDescription>
              </DialogHeader>
              
              <form onSubmit={handleAddUser} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">邮箱</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="full_name">姓名</Label>
                  <Input
                    id="full_name"
                    name="full_name"
                    value={formData.full_name}
                    onChange={handleInputChange}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password">密码</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="role">角色</Label>
                  <select
                    id="role"
                    name="role"
                    value={formData.role}
                    onChange={handleInputChange}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2"
                  >
                    <option value="user">普通用户</option>
                    <option value="admin">管理员</option>
                    {currentUser?.role === 'superadmin' && (
                      <option value="superadmin">超级管理员</option>
                    )}
                  </select>
                </div>
                
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="is_active"
                    name="is_active"
                    checked={formData.is_active}
                    onChange={handleInputChange}
                    className="h-4 w-4 rounded border-gray-300 text-primary"
                  />
                  <Label htmlFor="is_active">账号激活</Label>
                </div>
                
                {error && (
                  <div className="p-3 rounded-md bg-red-50 text-red-500 text-sm">
                    {error}
                  </div>
                )}
                
                <DialogFooter>
                  <Button variant="outline" type="button" onClick={() => setIsAddDialogOpen(false)}>
                    取消
                  </Button>
                  <Button type="submit">创建用户</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>
      
      {loading ? (
        <div className="flex justify-center items-center py-10">
          <p>加载中...</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {users.map(user => (
            <Card key={user.id}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-center">
                  <CardTitle>{user.full_name || user.email}</CardTitle>
                  <div className="space-x-2">
                    {(currentUser?.role === 'admin' || currentUser?.role === 'superadmin') && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => openEditDialog(user)}
                        disabled={currentUser.role === 'admin' && user.role === 'superadmin'}
                      >
                        编辑
                      </Button>
                    )}
                    
                    {currentUser?.role === 'superadmin' && currentUser.id !== user.id && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="sm">删除</Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>确认删除用户?</AlertDialogTitle>
                            <AlertDialogDescription>
                              此操作不可逆，将永久删除该用户账号。
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>取消</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteUser(user.id)}>
                              确认删除
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <dl className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                  <div>
                    <dt className="text-gray-500">邮箱</dt>
                    <dd>{user.email}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">角色</dt>
                    <dd>
                      {user.role === 'superadmin' ? '超级管理员' : 
                       user.role === 'admin' ? '管理员' : '普通用户'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">状态</dt>
                    <dd>
                      <span 
                        className={`inline-block px-2 py-1 rounded-full text-xs ${
                          user.is_active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {user.is_active ? '已激活' : '未激活'}
                      </span>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">创建时间</dt>
                    <dd>{new Date(user.created_at).toLocaleString('zh-CN')}</dd>
                  </div>
                </dl>
              </CardContent>
            </Card>
          ))}
          
          {users.length === 0 && (
            <div className="text-center py-10">
              <p className="text-gray-500">没有找到用户记录</p>
            </div>
          )}
        </div>
      )}
      
      {/* 编辑用户对话框 */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑用户</DialogTitle>
            <DialogDescription>
              修改用户账号信息。
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleEditUser} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-email">邮箱</Label>
              <Input
                id="edit-email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-full_name">姓名</Label>
              <Input
                id="edit-full_name"
                name="full_name"
                value={formData.full_name}
                onChange={handleInputChange}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-password">密码（留空则不修改）</Label>
              <Input
                id="edit-password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleInputChange}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-role">角色</Label>
              <select
                id="edit-role"
                name="role"
                value={formData.role}
                onChange={handleInputChange}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2"
                disabled={currentUser?.role === 'admin' && editingUser?.role === 'superadmin'}
              >
                <option value="user">普通用户</option>
                <option value="admin">管理员</option>
                {currentUser?.role === 'superadmin' && (
                  <option value="superadmin">超级管理员</option>
                )}
              </select>
            </div>
            
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="edit-is_active"
                name="is_active"
                checked={formData.is_active}
                onChange={handleInputChange}
                className="h-4 w-4 rounded border-gray-300 text-primary"
              />
              <Label htmlFor="edit-is_active">账号激活</Label>
            </div>
            
            {error && (
              <div className="p-3 rounded-md bg-red-50 text-red-500 text-sm">
                {error}
              </div>
            )}
            
            <DialogFooter>
              <Button 
                variant="outline" 
                type="button" 
                onClick={() => {
                  setIsEditDialogOpen(false);
                  setEditingUser(null);
                }}
              >
                取消
              </Button>
              <Button type="submit">保存修改</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
} 