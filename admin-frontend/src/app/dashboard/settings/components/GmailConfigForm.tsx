"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Mail, Shield, Send, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import type { GmailConfigQuickSetup, EmailTestRequest } from '../types/email-config';
import { emailSettingsApi, emailConfigUtils } from '@/lib/api/email-settings';

interface GmailConfigFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function GmailConfigForm({ onSuccess, onCancel }: GmailConfigFormProps) {
  const [formData, setFormData] = useState<GmailConfigQuickSetup>({
    gmail_address: '',
    gmail_app_password: '',
    sender_name: '',
    set_as_default: true,
  });

  const [testEmail, setTestEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [configId, setConfigId] = useState<number | null>(null);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // 验证表单
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // 验证Gmail地址
    const gmailValidation = emailConfigUtils.validateGmailAddress(formData.gmail_address);
    if (!gmailValidation.valid) {
      newErrors.gmail_address = gmailValidation.message || '无效的Gmail地址';
    }

    // 验证App Password
    const passwordValidation = emailConfigUtils.validateAppPassword(formData.gmail_app_password);
    if (!passwordValidation.valid) {
      newErrors.gmail_app_password = passwordValidation.message || '无效的App Password';
    }

    // 验证发件人名称
    if (!formData.sender_name.trim()) {
      newErrors.sender_name = '发件人名称不能为空';
    } else if (formData.sender_name.length > 100) {
      newErrors.sender_name = '发件人名称不能超过100个字符';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 处理输入变化
  const handleInputChange = (field: keyof GmailConfigQuickSetup, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // 清除对应字段的错误
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }

    // 自动格式化App Password
    if (field === 'gmail_app_password' && typeof value === 'string') {
      const formatted = emailConfigUtils.formatAppPassword(value);
      if (formatted !== value) {
        setFormData(prev => ({ ...prev, [field]: formatted }));
      }
    }
  };

  // 提交配置
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      // 清理App Password（移除空格）
      const submitData = {
        ...formData,
        gmail_app_password: emailConfigUtils.cleanAppPassword(formData.gmail_app_password),
      };

      const config = await emailSettingsApi.gmailQuickSetup(submitData);
      setConfigId(config.id);
      
      toast.success('Gmail配置创建成功！');
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      console.error('Gmail配置失败:', error);
      toast.error(error.response?.data?.detail || '配置失败，请检查输入信息');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 测试邮件发送
  const handleTestEmail = async () => {
    if (!configId) {
      toast.error('请先保存配置');
      return;
    }

    if (!testEmail) {
      toast.error('请输入测试邮箱地址');
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const testData: EmailTestRequest = {
        test_email: testEmail,
        subject: 'Gmail配置测试',
        message: '这是一封测试邮件，用于验证Gmail配置是否正常工作。',
      };

      const result = await emailSettingsApi.testConfig(configId, testData);
      setTestResult({
        success: result.success,
        message: result.message,
      });

      if (result.success) {
        toast.success('测试邮件发送成功！');
      } else {
        toast.error(`测试失败: ${result.message}`);
      }
    } catch (error: any) {
      console.error('测试邮件失败:', error);
      const errorMessage = error.response?.data?.detail || '测试失败';
      setTestResult({
        success: false,
        message: errorMessage,
      });
      toast.error(errorMessage);
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Gmail配置表单 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Gmail配置
          </CardTitle>
          <CardDescription>
            配置Gmail SMTP服务用于发送邮件。您需要在Gmail中生成App Password。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Gmail地址 */}
            <div className="space-y-2">
              <Label htmlFor="gmail_address">Gmail邮箱地址 *</Label>
              <Input
                id="gmail_address"
                type="email"
                placeholder="your-email@gmail.com"
                value={formData.gmail_address}
                onChange={(e) => handleInputChange('gmail_address', e.target.value)}
                className={errors.gmail_address ? 'border-red-500' : ''}
              />
              {errors.gmail_address && (
                <p className="text-sm text-red-500">{errors.gmail_address}</p>
              )}
            </div>

            {/* App Password */}
            <div className="space-y-2">
              <Label htmlFor="gmail_app_password">Gmail App Password *</Label>
              <Input
                id="gmail_app_password"
                type="password"
                placeholder="xxxx xxxx xxxx xxxx"
                value={formData.gmail_app_password}
                onChange={(e) => handleInputChange('gmail_app_password', e.target.value)}
                className={errors.gmail_app_password ? 'border-red-500' : ''}
                maxLength={19} // 16字符 + 3个空格
              />
              {errors.gmail_app_password && (
                <p className="text-sm text-red-500">{errors.gmail_app_password}</p>
              )}
              <p className="text-sm text-gray-500">
                请在Gmail设置中生成16位App Password
              </p>
            </div>

            {/* 发件人名称 */}
            <div className="space-y-2">
              <Label htmlFor="sender_name">发件人显示名称 *</Label>
              <Input
                id="sender_name"
                type="text"
                placeholder="您的公司名称"
                value={formData.sender_name}
                onChange={(e) => handleInputChange('sender_name', e.target.value)}
                className={errors.sender_name ? 'border-red-500' : ''}
                maxLength={100}
              />
              {errors.sender_name && (
                <p className="text-sm text-red-500">{errors.sender_name}</p>
              )}
            </div>

            {/* 设为默认 */}
            <div className="flex items-center space-x-2">
              <Switch
                id="set_as_default"
                checked={formData.set_as_default}
                onCheckedChange={(checked) => handleInputChange('set_as_default', checked)}
              />
              <Label htmlFor="set_as_default">设为默认邮件配置</Label>
            </div>

            {/* 提交按钮 */}
            <div className="flex gap-2">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Shield className="mr-2 h-4 w-4" />
                保存配置
              </Button>
              {onCancel && (
                <Button type="button" variant="outline" onClick={onCancel}>
                  取消
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* 邮件测试 */}
      {configId && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              测试邮件发送
            </CardTitle>
            <CardDescription>
              发送测试邮件验证配置是否正常工作
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="test_email">测试邮箱地址</Label>
                <Input
                  id="test_email"
                  type="email"
                  placeholder="test@example.com"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                />
              </div>

              <Button onClick={handleTestEmail} disabled={isTesting || !testEmail}>
                {isTesting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Send className="mr-2 h-4 w-4" />
                发送测试邮件
              </Button>

              {/* 测试结果 */}
              {testResult && (
                <Alert className={testResult.success ? 'border-green-500' : 'border-red-500'}>
                  <div className="flex items-center gap-2">
                    {testResult.success ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                    <AlertDescription>{testResult.message}</AlertDescription>
                  </div>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 帮助信息 */}
      <Card>
        <CardHeader>
          <CardTitle>如何获取Gmail App Password？</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li>登录您的Gmail账户</li>
            <li>进入"管理您的Google账户"</li>
            <li>选择"安全性"选项卡</li>
            <li>在"登录Google"部分，启用"两步验证"</li>
            <li>启用两步验证后，选择"应用专用密码"</li>
            <li>选择"邮件"和您的设备类型</li>
            <li>Google会生成一个16位的App Password</li>
            <li>将这个密码复制到上面的"App Password"字段中</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
