"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  Database,
  Upload,
  Play,
  AlertTriangle,
  CheckCircle,
  Info,
  RefreshCw,
  Download,
  BarChart3,
  TrendingUp,
  AlertCircle
} from "lucide-react";
import { toast } from "sonner";
import axiosInstance from "@/lib/api/axios";
import { API_ENDPOINTS } from "@/lib/api/endpoints";

interface TableStatus {
  name: string;
  table: string;
  icon: string;
  description: string;
  count: number;
  status: "empty" | "has_data" | "error";
  priority: number;
  error?: string;
}

interface SystemStatus {
  system_health: "excellent" | "good" | "needs_attention" | "poor";
  total_records: number;
  empty_tables: number;
  total_tables: number;
  tables: TableStatus[];
  recommendations: Array<{
    type: "urgent" | "warning" | "info";
    message: string;
  }>;
  last_check: string;
}

interface DataQualityAnalysis {
  overall_quality_score: number;
  analysis_timestamp: string;
  tables: Array<{
    table_name: string;
    table: string;
    icon: string;
    total_records: number;
    missing_rate_analysis: Record<string, {
      missing_count: number;
      total_count: number;
      missing_rate: number;
      is_key_field: boolean;
      is_foreign_key: boolean;
      status: "critical" | "warning" | "good" | "acceptable" | "error";
      error?: string;
    }>;
    foreign_key_integrity: Record<string, {
      target_table: string;
      total_with_fk: number;
      orphaned_count: number;
      integrity_rate: number;
      status: "critical" | "warning" | "good" | "error";
      error?: string;
    }>;
    quality_score: number;
    status: "analyzed" | "empty" | "error";
    error?: string;
  }>;
}

export default function SystemCheckPage() {
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [dataQuality, setDataQuality] = useState<DataQualityAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [qualityLoading, setQualityLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "quality">("overview");
  const router = useRouter();

  const fetchSystemStatus = async () => {
    try {
      const response = await axiosInstance.get(`${API_ENDPOINTS.SYSTEM}/system-status`);
      setSystemStatus(response.data);
    } catch (error) {
      console.error("获取系统状态失败:", error);
      toast.error("获取系统状态失败");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchDataQuality = async () => {
    setQualityLoading(true);
    try {
      const response = await axiosInstance.get(`${API_ENDPOINTS.SYSTEM}/data-quality-analysis`);
      setDataQuality(response.data);
    } catch (error) {
      console.error("获取数据质量分析失败:", error);
      toast.error("获取数据质量分析失败");
    } finally {
      setQualityLoading(false);
    }
  };

  useEffect(() => {
    fetchSystemStatus();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchSystemStatus();
    if (activeTab === "quality") {
      await fetchDataQuality();
    }
  };

  const handleTabChange = async (tab: "overview" | "quality") => {
    setActiveTab(tab);
    if (tab === "quality" && !dataQuality) {
      await fetchDataQuality();
    }
  };

  const getHealthColor = (health: string) => {
    switch (health) {
      case "excellent": return "text-green-600 bg-green-50 border-green-200";
      case "good": return "text-blue-600 bg-blue-50 border-blue-200";
      case "needs_attention": return "text-yellow-600 bg-yellow-50 border-yellow-200";
      case "poor": return "text-red-600 bg-red-50 border-red-200";
      default: return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  const getHealthText = (health: string) => {
    switch (health) {
      case "excellent": return "系统状态优秀";
      case "good": return "系统状态良好";
      case "needs_attention": return "需要关注";
      case "poor": return "需要改善";
      default: return "未知状态";
    }
  };

  const getStatusBadge = (status: string, count: number) => {
    if (status === "error") {
      return <Badge variant="destructive">错误</Badge>;
    }
    if (count === 0) {
      return <Badge variant="secondary">无数据</Badge>;
    }
    return <Badge variant="default">{count} 条记录</Badge>;
  };

  const getRecommendationIcon = (type: string) => {
    switch (type) {
      case "urgent": return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case "warning": return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case "info": return <Info className="h-4 w-4 text-blue-500" />;
      default: return <Info className="h-4 w-4" />;
    }
  };

  const getQualityScoreColor = (score: number) => {
    if (score >= 90) return "text-green-600";
    if (score >= 70) return "text-yellow-600";
    if (score >= 50) return "text-orange-600";
    return "text-red-600";
  };

  const getQualityScoreText = (score: number) => {
    if (score >= 90) return "优秀";
    if (score >= 70) return "良好";
    if (score >= 50) return "一般";
    return "需要改进";
  };

  const getMissingRateColor = (rate: number, isKey: boolean) => {
    if (rate === 0) return "text-green-600";
    if (rate < 5) return "text-green-500";
    if (rate < 20) return isKey ? "text-orange-600" : "text-yellow-600";
    if (rate < 50) return "text-orange-600";
    return "text-red-600";
  };

  const getIntegrityColor = (rate: number) => {
    if (rate >= 99) return "text-green-600";
    if (rate >= 95) return "text-green-500";
    if (rate >= 90) return "text-yellow-600";
    return "text-red-600";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">正在检查系统状态...</p>
        </div>
      </div>
    );
  }

  if (!systemStatus) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">无法获取系统状态</h3>
              <p className="text-muted-foreground mb-4">请检查网络连接或联系管理员</p>
              <Button onClick={handleRefresh}>重试</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const dataCompleteness = ((systemStatus.total_tables - systemStatus.empty_tables) / systemStatus.total_tables) * 100;

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      {/* 页面标题 */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">系统状态检查</h1>
            <p className="text-muted-foreground">
              欢迎使用邮轮供应链管理系统！请查看当前数据状态并选择下一步操作。
            </p>
          </div>
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            {refreshing ? (
              <RefreshCw className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            刷新状态
          </Button>
        </div>
      </div>

      {/* 标签页导航 */}
      <div className="mb-6">
        <div className="flex space-x-1 bg-muted p-1 rounded-lg w-fit">
          <button
            onClick={() => handleTabChange("overview")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === "overview"
                ? "bg-white text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Database className="h-4 w-4 inline mr-2" />
            系统概览
          </button>
          <button
            onClick={() => handleTabChange("quality")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === "quality"
                ? "bg-white text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <BarChart3 className="h-4 w-4 inline mr-2" />
            数据质量分析
          </button>
        </div>
      </div>

      {/* 系统健康状态卡片 */}
      <Card className={`mb-6 border-2 ${getHealthColor(systemStatus.system_health)}`}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Database className="h-8 w-8" />
              <div>
                <CardTitle className="text-xl">{getHealthText(systemStatus.system_health)}</CardTitle>
                <CardDescription>
                  总计 {systemStatus.total_records} 条记录，{systemStatus.total_tables} 个数据表
                </CardDescription>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">{Math.round(dataCompleteness)}%</div>
              <div className="text-sm text-muted-foreground">数据完整度</div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Progress value={dataCompleteness} className="mb-4" />
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-green-600">{systemStatus.total_tables - systemStatus.empty_tables}</div>
              <div className="text-sm text-muted-foreground">有数据的表</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-yellow-600">{systemStatus.empty_tables}</div>
              <div className="text-sm text-muted-foreground">空表</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600">{systemStatus.total_records}</div>
              <div className="text-sm text-muted-foreground">总记录数</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 建议和警告 */}
      {activeTab === "overview" && systemStatus.recommendations.length > 0 && (
        <div className="mb-6 space-y-3">
          {systemStatus.recommendations.map((rec, index) => (
            <Alert key={index} className={
              rec.type === "urgent" ? "border-red-200 bg-red-50" :
              rec.type === "warning" ? "border-yellow-200 bg-yellow-50" :
              "border-blue-200 bg-blue-50"
            }>
              <div className="flex items-center space-x-2">
                {getRecommendationIcon(rec.type)}
                <AlertDescription>{rec.message}</AlertDescription>
              </div>
            </Alert>
          ))}
        </div>
      )}

      {/* 数据质量分析内容 */}
      {activeTab === "quality" && (
        <div className="mb-6">
          {qualityLoading ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
                  <p className="text-muted-foreground">正在分析数据质量...</p>
                </div>
              </CardContent>
            </Card>
          ) : dataQuality ? (
            <div className="space-y-6">
              {/* 整体质量评分 */}
              <Card className="border-2">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <TrendingUp className="h-8 w-8 text-blue-600" />
                      <div>
                        <CardTitle className="text-xl">整体数据质量评分</CardTitle>
                        <CardDescription>
                          基于字段完整性和外键关系完整性的综合评分
                        </CardDescription>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-3xl font-bold ${getQualityScoreColor(dataQuality.overall_quality_score)}`}>
                        {dataQuality.overall_quality_score}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {getQualityScoreText(dataQuality.overall_quality_score)}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Progress value={dataQuality.overall_quality_score} className="mb-4" />
                  <div className="text-sm text-muted-foreground">
                    最后分析时间: {new Date(dataQuality.analysis_timestamp).toLocaleString('zh-CN')}
                  </div>
                </CardContent>
              </Card>

              {/* 各表质量详情 */}
              <div className="grid gap-6">
                {dataQuality.tables.map((table, index) => (
                  <Card key={index} className="border">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <span className="text-2xl">{table.icon}</span>
                          <div>
                            <CardTitle className="text-lg">{table.table_name}</CardTitle>
                            <CardDescription>
                              {table.total_records} 条记录
                            </CardDescription>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`text-2xl font-bold ${getQualityScoreColor(table.quality_score)}`}>
                            {table.quality_score}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {getQualityScoreText(table.quality_score)}
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {table.status === "empty" ? (
                        <div className="text-center py-4 text-muted-foreground">
                          该表暂无数据
                        </div>
                      ) : table.status === "error" ? (
                        <div className="text-center py-4 text-red-600">
                          分析出错: {table.error}
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {/* 字段缺失率分析 */}
                          <div>
                            <h4 className="font-medium mb-3 flex items-center">
                              <AlertCircle className="h-4 w-4 mr-2" />
                              字段缺失率分析
                            </h4>
                            <div className="grid gap-2">
                              {Object.entries(table.missing_rate_analysis).map(([field, data]) => (
                                <div key={field} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                                  <div className="flex items-center space-x-2">
                                    <span className="font-mono text-sm">{field}</span>
                                    {data.is_key_field && (
                                      <Badge variant="outline" className="text-xs">关键字段</Badge>
                                    )}
                                    {data.is_foreign_key && (
                                      <Badge variant="outline" className="text-xs">外键</Badge>
                                    )}
                                  </div>
                                  <div className="text-right">
                                    <div className={`font-medium ${getMissingRateColor(data.missing_rate, data.is_key_field)}`}>
                                      {data.missing_rate}%
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      {data.missing_count}/{data.total_count} 缺失
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* 外键完整性分析 */}
                          {Object.keys(table.foreign_key_integrity).length > 0 && (
                            <div>
                              <h4 className="font-medium mb-3 flex items-center">
                                <CheckCircle className="h-4 w-4 mr-2" />
                                外键关系完整性
                              </h4>
                              <div className="grid gap-2">
                                {Object.entries(table.foreign_key_integrity).map(([fk, data]) => (
                                  <div key={fk} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                                    <div>
                                      <span className="font-mono text-sm">{fk}</span>
                                      <div className="text-xs text-muted-foreground">
                                        → {data.target_table}
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <div className={`font-medium ${getIntegrityColor(data.integrity_rate)}`}>
                                        {data.integrity_rate}%
                                      </div>
                                      <div className="text-xs text-muted-foreground">
                                        {data.orphaned_count} 孤立记录
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">暂无数据质量分析</h3>
                  <p className="text-muted-foreground mb-4">点击刷新按钮开始分析</p>
                  <Button onClick={fetchDataQuality}>开始分析</Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* 操作选择 */}
      {activeTab === "overview" && (
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 hover:border-blue-300"
              onClick={() => router.push("/dashboard/data-upload")}>
          <CardHeader className="text-center">
            <Upload className="h-12 w-12 mx-auto mb-4 text-blue-600" />
            <CardTitle>上传数据</CardTitle>
            <CardDescription>
              导入Excel文件或批量上传数据到系统
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" variant="default">
              开始数据导入
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 hover:border-green-300"
              onClick={() => router.push("/dashboard")}>
          <CardHeader className="text-center">
            <Play className="h-12 w-12 mx-auto mb-4 text-green-600" />
            <CardTitle>继续使用</CardTitle>
            <CardDescription>
              直接进入系统开始使用现有功能
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" variant="outline">
              进入系统
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 hover:border-purple-300"
              onClick={() => window.open("/api/v1/system/table-templates", "_blank")}>
          <CardHeader className="text-center">
            <Download className="h-12 w-12 mx-auto mb-4 text-purple-600" />
            <CardTitle>下载模板</CardTitle>
            <CardDescription>
              获取Excel导入模板和使用说明
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" variant="outline">
              获取模板
            </Button>
          </CardContent>
        </Card>
      </div>
      )}

      {/* 数据表状态详情 */}
      {activeTab === "overview" && (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Database className="h-5 w-5" />
            <span>数据表状态详情</span>
          </CardTitle>
          <CardDescription>
            查看各个数据表的详细状态信息
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {systemStatus.tables.map((table, index) => (
              <div key={index} className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">{table.icon}</span>
                    <span className="font-medium">{table.name}</span>
                  </div>
                  {getStatusBadge(table.status, table.count)}
                </div>
                <p className="text-sm text-muted-foreground mb-2">{table.description}</p>
                {table.error && (
                  <p className="text-sm text-red-600">错误: {table.error}</p>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      )}
    </div>
  );
}
