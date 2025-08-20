"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Loader2, 
  Mail, 
  Settings, 
  Trash2, 
  Power, 
  TestTube,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import type { EmailConfig, EmailConfigList as EmailConfigListType } from '../types/email-config';
import { emailSettingsApi, emailConfigUtils } from '@/lib/api/email-settings';

interface EmailConfigListProps {
  onConfigSelect?: (config: EmailConfig) => void;
  onCreateNew?: () => void;
  refreshTrigger?: number;
}

export default function EmailConfigList({ 
  onConfigSelect, 
  onCreateNew,
  refreshTrigger 
}: EmailConfigListProps) {
  const [configList, setConfigList] = useState<EmailConfigListType | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<{ [key: number]: string }>({});

  // 加载配置列表
  const loadConfigs = async () => {
    try {
      setLoading(true);
      const data = await emailSettingsApi.getConfigs();
      setConfigList(data);
    } catch (error: any) {
      console.error('加载邮件配置失败:', error);
      toast.error('加载配置失败');
    } finally {
      setLoading(false);
    }
  };

  // 初始加载和刷新
  useEffect(() => {
    loadConfigs();
  }, [refreshTrigger]);

  // 激活配置
  const handleActivateConfig = async (configId: number) => {
    setActionLoading(prev => ({ ...prev, [configId]: 'activating' }));
    
    try {
      await emailSettingsApi.activateConfig(configId);
      toast.success('配置已激活');
      await loadConfigs(); // 重新加载列表
    } catch (error: any) {
      console.error('激活配置失败:', error);
      toast.error(error.response?.data?.detail || '激活失败');
    } finally {
      setActionLoading(prev => {
        const newState = { ...prev };
        delete newState[configId];
        return newState;
      });
    }
  };

  // 删除配置
  const handleDeleteConfig = async (config: EmailConfig) => {
    const confirmMessage = config.is_active
      ? `确定要删除当前激活的配置"${config.display_name}"吗？删除后系统将没有激活的邮件配置，邮件功能将无法使用。此操作不可恢复。`
      : `确定要删除配置"${config.display_name}"吗？此操作不可恢复。`;

    if (!confirm(confirmMessage)) {
      return;
    }

    setActionLoading(prev => ({ ...prev, [config.id]: 'deleting' }));

    try {
      await emailSettingsApi.deleteConfig(config.id);
      toast.success('配置已删除');
      await loadConfigs(); // 重新加载列表
    } catch (error: any) {
      console.error('删除配置失败:', error);
      toast.error(error.response?.data?.detail || '删除失败');
    } finally {
      setActionLoading(prev => {
        const newState = { ...prev };
        delete newState[config.id];
        return newState;
      });
    }
  };

  // 获取状态徽章
  const getStatusBadge = (config: EmailConfig) => {
    const statusText = emailConfigUtils.getConfigStatusText(config);
    
    if (config.is_active && config.is_default) {
      return <Badge variant="default" className="bg-green-500">{statusText}</Badge>;
    } else if (config.is_active) {
      return <Badge variant="secondary">{statusText}</Badge>;
    } else {
      return <Badge variant="outline">{statusText}</Badge>;
    }
  };

  // 获取测试结果图标
  const getTestResultIcon = (config: EmailConfig) => {
    if (config.last_test_result === undefined) {
      return <AlertCircle className="h-4 w-4 text-gray-400" />;
    } else if (config.last_test_result) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    } else {
      return <XCircle className="h-4 w-4 text-red-500" />;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          加载中...
        </CardContent>
      </Card>
    );
  }

  if (!configList) {
    return (
      <Card>
        <CardContent className="py-8">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>加载配置失败，请刷新页面重试</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* 头部信息 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                邮件配置管理
              </CardTitle>
              <CardDescription>
                管理系统邮件发送配置，共 {configList.total} 个配置
              </CardDescription>
            </div>
            {onCreateNew && (
              <Button onClick={onCreateNew}>
                <Mail className="mr-2 h-4 w-4" />
                新建配置
              </Button>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* 当前激活配置 */}
      {configList.active_config && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="text-green-700 flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              当前激活配置
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm font-medium">配置名称</p>
                <p className="text-sm text-gray-600">{configList.active_config.display_name}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Gmail地址</p>
                <p className="text-sm text-gray-600">{configList.active_config.gmail_address}</p>
              </div>
              <div>
                <p className="text-sm font-medium">已发送邮件</p>
                <p className="text-sm text-gray-600">{configList.active_config.emails_sent} 封</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 配置列表 */}
      {configList.configs.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">还没有邮件配置</p>
            {onCreateNew && (
              <Button onClick={onCreateNew}>
                创建第一个配置
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {configList.configs.map((config) => (
            <Card key={config.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-medium">{config.display_name}</h3>
                      {getStatusBadge(config)}
                      <Badge variant="outline">{config.config_type.toUpperCase()}</Badge>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">Gmail地址</p>
                        <p className="font-medium">{config.gmail_address}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">发件人名称</p>
                        <p className="font-medium">{config.sender_name}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">已发送邮件</p>
                        <p className="font-medium">{config.emails_sent} 封</p>
                      </div>
                      <div>
                        <p className="text-gray-500 flex items-center gap-1">
                          {getTestResultIcon(config)}
                          最后测试
                        </p>
                        <p className="font-medium">
                          {emailConfigUtils.formatDateTime(config.last_test_at)}
                        </p>
                      </div>
                    </div>

                    {config.last_test_error && (
                      <Alert className="mt-3 border-red-200 bg-red-50">
                        <XCircle className="h-4 w-4 text-red-500" />
                        <AlertDescription className="text-red-700">
                          测试失败: {config.last_test_error}
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    {/* 激活按钮 - 显示给所有配置，让用户可以切换 */}
                    <Button
                      size="sm"
                      variant={config.is_active ? "default" : "outline"}
                      onClick={() => handleActivateConfig(config.id)}
                      disabled={actionLoading[config.id] === 'activating'}
                      title={config.is_active ? "当前激活配置" : "点击激活此配置"}
                    >
                      {actionLoading[config.id] === 'activating' ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Power className="h-4 w-4" />
                      )}
                    </Button>

                    {/* 编辑按钮 */}
                    {onConfigSelect && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onConfigSelect(config)}
                      >
                        <Settings className="h-4 w-4" />
                      </Button>
                    )}

                    {/* 删除按钮 - 允许删除任何配置 */}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeleteConfig(config)}
                      disabled={actionLoading[config.id] === 'deleting'}
                      className="text-red-600 hover:text-red-700"
                      title="删除此配置"
                    >
                      {actionLoading[config.id] === 'deleting' ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
