'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import useAuthStore from '@/lib/auth';
import Image from "next/image";
import OrderSummaryCard from "@/components/OrderSummaryCard";
import OrderOverviewGrid from "@/components/OrderOverviewGrid";

export default function Home() {
  const { user, isAuthenticated } = useAuthStore();
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    // 根据时间显示不同的问候语
    const hour = new Date().getHours();
    if (hour < 12) {
      setGreeting('早上好');
    } else if (hour < 18) {
      setGreeting('下午好');
    } else {
      setGreeting('晚上好');
    }
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">邮轮供应链管理系统</h1>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>欢迎</CardTitle>
          </CardHeader>
          <CardContent>
            {isAuthenticated ? (
              <p className="text-lg">
                {greeting}，{user?.full_name || user?.email}
                <span className="block text-sm text-gray-500 mt-1">
                  {user?.role === 'superadmin' 
                    ? '您是超级管理员' 
                    : user?.role === 'admin' 
                      ? '您是管理员' 
                      : '您是普通用户'}
                </span>
              </p>
            ) : (
              <p className="text-lg">
                欢迎访问邮轮供应链管理系统
                <span className="block text-sm text-gray-500 mt-1">
                  请登录以访问完整功能
                </span>
              </p>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>系统概述</CardTitle>
          </CardHeader>
          <CardContent>
            <p>
              本系统提供完整的邮轮供应链管理功能，包括订单管理、供应商匹配、产品管理等核心功能。
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>快速导航</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              <li>
                <a href="/orders" className="text-blue-600 hover:underline">订单管理</a>
              </li>
              <li>
                <a href="/suppliers" className="text-blue-600 hover:underline">供应商管理</a>
              </li>
              <li>
                <a href="/products" className="text-blue-600 hover:underline">产品管理</a>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <div className="max-w-3xl mx-auto">
        <OrderSummaryCard />
      </div>
      
      <div className="mt-10">
        <h2 className="text-2xl font-bold mb-6">订单概览</h2>
        <p className="text-gray-600 mb-4">下面显示所有订单的处理状态，鼠标悬停可查看详细信息</p>
        <OrderOverviewGrid />
      </div>

      <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {[
          {
            title: '国家和港口管理',
            description: '管理全球各个国家和港口信息，支持灵活的数据操作。'
          },
          {
            title: '公司和船舶管理',
            description: '全面的公司和船舶信息管理，包括基本信息、联系方式等。'
          },
          {
            title: '供应商管理',
            description: '完整的供应商管理功能，包括供应商信息、类别关联等。'
          },
          {
            title: '产品管理',
            description: '强大的产品管理系统，支持产品分类、价格管理等功能。'
          },
          {
            title: '订单管理',
            description: '高效的订单处理流程，从创建到交付的全程跟踪。'
          },
          {
            title: '库存管理',
            description: '实时库存监控，支持多维度的库存分析和管理。'
          }
        ].map((feature) => (
          <div
            key={feature.title}
            className="rounded-lg bg-white p-8 shadow-lg ring-1 ring-gray-200"
          >
            <h3 className="text-lg font-semibold text-gray-900">
              {feature.title}
            </h3>
            <p className="mt-4 text-gray-500">
              {feature.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
