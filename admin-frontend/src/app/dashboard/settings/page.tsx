"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Settings,
  Mail,
  BarChart3,
  Plus,
  Shield,
  AlertCircle,
  CheckCircle,
  TestTube,
  FileText
} from 'lucide-react';
import { toast } from 'sonner';
import useAuthStore from '@/lib/auth/authStore';
import GmailConfigForm from './components/GmailConfigForm';
import EmailConfigList from './components/EmailConfigList';
import EmailTestPanel from './components/EmailTestPanel';
import EmailTemplatePanel from './components/EmailTemplatePanel';
import type { EmailConfigStats } from './types/email-config';
import { emailSettingsApi } from '@/lib/api/email-settings';

export default function SettingsPage() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('overview');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [stats, setStats] = useState<EmailConfigStats | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // 权限检查
  const hasAccess = user?.role === 'superadmin';

  // 加载统计信息
  const loadStats = async () => {
    try {
      const data = await emailSettingsApi.getStats();
      setStats(data);
    } catch (error: any) {
      console.error('加载统计信息失败:', error);
    }
  };

  useEffect(() => {
    if (hasAccess) {
      loadStats();
    }
  }, [hasAccess, refreshTrigger]);

  // 权限不足
  if (!hasAccess) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="py-8">
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                您没有权限访问系统设置。只有超级管理员可以访问此页面。
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 处理配置创建成功
  const handleConfigCreated = () => {
    setShowCreateForm(false);
    setRefreshTrigger(prev => prev + 1);
    setActiveTab('configs');
    toast.success('配置创建成功！');
  };

  // 刷新数据
  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Settings className="h-8 w-8" />
            系统设置
          </h1>
          <p className="text-gray-600 mt-1">
            管理系统配置和邮件服务设置
          </p>
        </div>
        <Button onClick={handleRefresh} variant="outline">
          刷新数据
        </Button>
      </div>

      {/* 主要内容 */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            概览
          </TabsTrigger>
          <TabsTrigger value="configs" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            邮件配置
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            邮件模板
          </TabsTrigger>
          <TabsTrigger value="test" className="flex items-center gap-2">
            <TestTube className="h-4 w-4" />
            邮件测试
          </TabsTrigger>
          <TabsTrigger value="create" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            新建配置
          </TabsTrigger>
        </TabsList>

        {/* 概览页面 */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* 统计卡片 */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">总配置数</CardTitle>
                <Settings className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.total_configs || 0}</div>
                <p className="text-xs text-muted-foreground">
                  激活: {stats?.active_configs || 0}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Gmail配置</CardTitle>
                <Mail className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.gmail_configs || 0}</div>
                <p className="text-xs text-muted-foreground">
                  SMTP: {stats?.smtp_configs || 0}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">已发送邮件</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.total_emails_sent || 0}</div>
                <p className="text-xs text-muted-foreground">
                  总计发送数量
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">系统状态</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">正常</div>
                <p className="text-xs text-muted-foreground">
                  邮件服务运行中
                </p>
              </CardContent>
            </Card>
          </div>

          {/* 系统信息 */}
          <Card>
            <CardHeader>
              <CardTitle>系统信息</CardTitle>
              <CardDescription>
                当前系统的邮件服务配置状态
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats?.active_configs === 0 ? (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      系统当前没有激活的邮件配置。请创建并激活一个Gmail配置以启用邮件发送功能。
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Alert className="border-green-200 bg-green-50">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-700">
                      邮件服务已配置并正常运行。系统可以正常发送邮件。
                    </AlertDescription>
                  </Alert>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="font-medium">最后发送邮件时间</p>
                    <p className="text-gray-600">
                      {stats?.last_email_sent 
                        ? new Date(stats.last_email_sent).toLocaleString('zh-CN')
                        : '从未发送'
                      }
                    </p>
                  </div>
                  <div>
                    <p className="font-medium">支持的邮件服务</p>
                    <p className="text-gray-600">Gmail SMTP, 通用SMTP</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 快速操作 */}
          <Card>
            <CardHeader>
              <CardTitle>快速操作</CardTitle>
              <CardDescription>
                常用的系统设置操作
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                <Button 
                  onClick={() => setActiveTab('create')}
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  创建Gmail配置
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => setActiveTab('configs')}
                  className="flex items-center gap-2"
                >
                  <Mail className="h-4 w-4" />
                  管理邮件配置
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 邮件配置管理 */}
        <TabsContent value="configs">
          <EmailConfigList
            refreshTrigger={refreshTrigger}
            onCreateNew={() => setActiveTab('create')}
          />
        </TabsContent>

        {/* 邮件模板管理 */}
        <TabsContent value="templates">
          <EmailTemplatePanel
            refreshTrigger={refreshTrigger}
          />
        </TabsContent>

        {/* 邮件测试 */}
        <TabsContent value="test">
          <EmailTestPanel
            refreshTrigger={refreshTrigger}
          />
        </TabsContent>

        {/* 创建新配置 */}
        <TabsContent value="create">
          <GmailConfigForm
            onSuccess={handleConfigCreated}
            onCancel={() => setActiveTab('configs')}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
