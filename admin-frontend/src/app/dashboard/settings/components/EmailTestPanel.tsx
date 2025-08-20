"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Loader2, 
  Send, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Mail,
  TestTube
} from 'lucide-react';
import { toast } from 'sonner';
import type { EmailConfig, EmailTestRequest, EmailTestResponse } from '../types/email-config';
import { emailSettingsApi } from '@/lib/api/email-settings';

interface EmailTestPanelProps {
  refreshTrigger?: number;
}

export default function EmailTestPanel({ refreshTrigger }: EmailTestPanelProps) {
  const [configs, setConfigs] = useState<EmailConfig[]>([]);
  const [selectedConfigId, setSelectedConfigId] = useState<string>('');
  const [testData, setTestData] = useState<EmailTestRequest>({
    test_email: '',
    subject: '邮件系统测试',
    message: '这是一封测试邮件，用于验证邮件配置是否正常工作。\n\n如果您收到这封邮件，说明邮件系统配置成功！\n\n发送时间：' + new Date().toLocaleString('zh-CN')
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<EmailTestResponse | null>(null);

  // 加载邮件配置列表
  const loadConfigs = async () => {
    try {
      setIsLoading(true);
      const data = await emailSettingsApi.getConfigs({ is_active: true });
      setConfigs(data.configs);
      
      // 自动选择默认激活的配置
      if (data.active_config) {
        setSelectedConfigId(data.active_config.id.toString());
      } else if (data.configs.length > 0) {
        setSelectedConfigId(data.configs[0].id.toString());
      }
    } catch (error: any) {
      console.error('加载邮件配置失败:', error);
      toast.error('加载邮件配置失败');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadConfigs();
  }, [refreshTrigger]);

  // 发送测试邮件
  const handleSendTest = async () => {
    if (!selectedConfigId) {
      toast.error('请选择邮件配置');
      return;
    }

    if (!testData.test_email) {
      toast.error('请输入测试邮箱地址');
      return;
    }

    // 验证邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(testData.test_email)) {
      toast.error('请输入有效的邮箱地址');
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const result = await emailSettingsApi.testConfig(parseInt(selectedConfigId), testData);
      setTestResult(result);

      if (result.success) {
        toast.success('测试邮件发送成功！请检查收件箱');
      } else {
        toast.error(`测试失败: ${result.message}`);
      }
    } catch (error: any) {
      console.error('测试邮件失败:', error);
      const errorMessage = error.response?.data?.detail || '测试失败';
      setTestResult({
        success: false,
        message: errorMessage,
        test_time: new Date().toISOString(),
        error_details: errorMessage,
      });
      toast.error(errorMessage);
    } finally {
      setIsTesting(false);
    }
  };

  // 获取选中的配置信息
  const selectedConfig = configs.find(config => config.id.toString() === selectedConfigId);

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TestTube className="h-5 w-5" />
            邮件测试中心
          </CardTitle>
          <CardDescription>
            测试已配置的Gmail邮件发送功能，验证邮件服务是否正常工作
          </CardDescription>
        </CardHeader>
      </Card>

      {/* 配置选择 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            选择邮件配置
          </CardTitle>
          <CardDescription>
            选择要测试的邮件配置
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              加载配置中...
            </div>
          ) : configs.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                没有找到激活的邮件配置。请先在"邮件配置"页面创建并激活一个配置。
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="config-select">邮件配置</Label>
                <Select value={selectedConfigId} onValueChange={setSelectedConfigId}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择邮件配置" />
                  </SelectTrigger>
                  <SelectContent>
                    {configs.map((config) => (
                      <SelectItem key={config.id} value={config.id.toString()}>
                        <div className="flex items-center gap-2">
                          <span>{config.display_name}</span>
                          {config.is_default && (
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                              默认
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 显示选中配置的信息 */}
              {selectedConfig && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">配置信息</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Gmail地址：</span>
                      <span className="font-medium">{selectedConfig.gmail_address}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">发件人名称：</span>
                      <span className="font-medium">{selectedConfig.sender_name}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">已发送邮件：</span>
                      <span className="font-medium">{selectedConfig.emails_sent} 封</span>
                    </div>
                    <div>
                      <span className="text-gray-500">最后测试：</span>
                      <span className="font-medium">
                        {selectedConfig.last_test_at 
                          ? new Date(selectedConfig.last_test_at).toLocaleString('zh-CN')
                          : '从未测试'
                        }
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 测试邮件表单 */}
      {configs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              发送测试邮件
            </CardTitle>
            <CardDescription>
              填写测试邮件信息并发送
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* 收件人邮箱 */}
              <div className="space-y-2">
                <Label htmlFor="test_email">收件人邮箱地址 *</Label>
                <Input
                  id="test_email"
                  type="email"
                  placeholder="test@example.com"
                  value={testData.test_email}
                  onChange={(e) => setTestData(prev => ({ ...prev, test_email: e.target.value }))}
                />
                <p className="text-sm text-gray-500">
                  请输入您要接收测试邮件的邮箱地址
                </p>
              </div>

              {/* 邮件主题 */}
              <div className="space-y-2">
                <Label htmlFor="subject">邮件主题</Label>
                <Input
                  id="subject"
                  type="text"
                  value={testData.subject}
                  onChange={(e) => setTestData(prev => ({ ...prev, subject: e.target.value }))}
                />
              </div>

              {/* 邮件内容 */}
              <div className="space-y-2">
                <Label htmlFor="message">邮件内容</Label>
                <Textarea
                  id="message"
                  rows={6}
                  value={testData.message}
                  onChange={(e) => setTestData(prev => ({ ...prev, message: e.target.value }))}
                  className="resize-none"
                />
              </div>

              {/* 发送按钮 */}
              <Button 
                onClick={handleSendTest} 
                disabled={isTesting || !selectedConfigId || !testData.test_email}
                className="w-full"
              >
                {isTesting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Send className="mr-2 h-4 w-4" />
                {isTesting ? '发送中...' : '发送测试邮件'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 测试结果 */}
      {testResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {testResult.success ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
              测试结果
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert className={testResult.success ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}>
              <div className="flex items-center gap-2">
                {testResult.success ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
                <AlertDescription className={testResult.success ? 'text-green-700' : 'text-red-700'}>
                  <div className="space-y-2">
                    <p className="font-medium">{testResult.message}</p>
                    <p className="text-sm">
                      测试时间: {new Date(testResult.test_time).toLocaleString('zh-CN')}
                    </p>
                    {testResult.error_details && (
                      <details className="text-sm">
                        <summary className="cursor-pointer">错误详情</summary>
                        <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto">
                          {testResult.error_details}
                        </pre>
                      </details>
                    )}
                  </div>
                </AlertDescription>
              </div>
            </Alert>
          </CardContent>
        </Card>
      )}

      {/* 使用说明 */}
      <Card>
        <CardHeader>
          <CardTitle>使用说明</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-2">
              <span className="font-medium text-blue-600">1.</span>
              <span>选择要测试的邮件配置（通常选择默认激活的配置）</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-medium text-blue-600">2.</span>
              <span>输入您的邮箱地址作为测试收件人</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-medium text-blue-600">3.</span>
              <span>可以自定义邮件主题和内容（可选）</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-medium text-blue-600">4.</span>
              <span>点击"发送测试邮件"按钮</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-medium text-blue-600">5.</span>
              <span>检查您的邮箱（包括垃圾邮件文件夹）是否收到测试邮件</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
