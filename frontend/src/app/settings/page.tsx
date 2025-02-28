'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import EmailTemplates from '@/components/settings/EmailTemplates';

export default function SettingsPage() {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">系统设置</h1>
      
      <Tabs defaultValue="email-templates" className="space-y-4">
        <TabsList>
          <TabsTrigger value="email-templates">邮件模板</TabsTrigger>
          <TabsTrigger value="general">常规设置</TabsTrigger>
          <TabsTrigger value="notifications">通知设置</TabsTrigger>
        </TabsList>

        <TabsContent value="email-templates">
          <Card>
            <CardHeader>
              <CardTitle>邮件模板管理</CardTitle>
            </CardHeader>
            <CardContent>
              <EmailTemplates />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>常规设置</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-500">常规设置内容（待开发）</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>通知设置</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-500">通知设置内容（待开发）</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 