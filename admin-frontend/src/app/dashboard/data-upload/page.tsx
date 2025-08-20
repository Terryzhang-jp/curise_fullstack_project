"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Upload,
  Download,
  FileText,
  CheckCircle,
  AlertTriangle,
  ArrowLeft,
  Database,
  FileSpreadsheet,
  Trash2
} from "lucide-react";
import { toast } from "sonner";
import axiosInstance, { axiosV2Instance } from "@/lib/api/axios";
import { API_ENDPOINTS } from "@/lib/api/endpoints";
import * as XLSX from 'xlsx';

// Excel日期转换函数
const convertExcelDate = (excelDate: any): string => {
  if (typeof excelDate === 'number') {
    // Excel日期是从1900年1月1日开始的天数
    const date = XLSX.SSF.parse_date_code(excelDate);
    if (date) {
      return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
    }
  }
  if (typeof excelDate === 'string') {
    return excelDate;
  }
  return '';
};

// 处理产品数据，转换日期字段
const processProductData = (jsonData: any[]): any[] => {
  return jsonData.map(row => ({
    ...row,
    effective_from: convertExcelDate(row.effective_from),
    effective_to: convertExcelDate(row.effective_to)
  }));
};

// 统一预检查结果数据格式
const getPrecheckSummary = (file: any) => {
  if (file.table === 'products' && file.precheck_result) {
    // API v2 产品数据格式
    const result = file.precheck_result;
    return {
      new_count: result.new_products || 0,
      similar_count: 0, // API v2 没有相似数据概念
      duplicate_count: result.duplicate_products || 0,
      error_count: result.error_count || 0,
      warning_count: result.warning_count || 0
    };
  } else if (file.precheck_result?.summary) {
    // API v1 数据格式
    return {
      ...file.precheck_result.summary,
      warning_count: 0 // API v1 没有警告概念
    };
  }
  // 默认值
  return {
    new_count: 0,
    similar_count: 0,
    duplicate_count: 0,
    error_count: 0,
    warning_count: 0
  };
};

interface TableTemplate {
  table: string;
  name: string;
  icon: string;
  description: string;
  columns: string[];
  required_columns: string[];
  example_data: any[];
  dependencies: string[];
  priority: number;
}

interface SimilarMatch {
  existing_item: any;
  similarity: number;
  match_field: string;
}

interface PreCheckItem {
  row: number;
  data: any;
  similar_matches?: SimilarMatch[];
  existing_item?: any;
  errors?: string[];
}

interface FormattedError {
  message: string;
  suggestion: string;
  severity: 'error' | 'warning' | 'info';
  type: string;
  field?: string;
}

interface PreCheckResult {
  new_items: PreCheckItem[];
  similar_items: PreCheckItem[];
  exact_duplicates: PreCheckItem[];
  validation_errors: PreCheckItem[];
  formatted_errors?: FormattedError[];
  raw_errors?: string[];
  summary: {
    new_count: number;
    similar_count: number;
    duplicate_count: number;
    error_count: number;
  };
}

// 简化的文件状态
type SimpleFileStatus = 'analyzing' | 'ready' | 'error' | 'uploading' | 'success';

interface UploadedFile {
  file: File;
  table: string;
  status: SimpleFileStatus;
  validation_result?: {
    total_rows: number;
    valid_rows: number;
    invalid_rows: number;
    warnings: string[];
  };
  precheck_result?: PreCheckResult;
  error?: string;
  errors?: string[];
  import_result?: {
    success_count: number;
    error_count: number;
    skipped_count: number;
    errors: string[];
    formatted_errors?: FormattedError[];
    skipped_items: string[];
  };
  fileContent?: ArrayBuffer; // 保存文件内容
  progress?: number; // 添加进度字段
}

// 错误显示组件
const ErrorDisplayComponent: React.FC<{errors: FormattedError[]}> = ({errors}) => {
  if (!errors || errors.length === 0) return null;

  return (
    <div className="space-y-2">
      {errors.map((error, index) => (
        <div key={index} className={`p-3 rounded-lg border ${
          error.severity === 'error' ? 'bg-red-50 border-red-200' :
          error.severity === 'warning' ? 'bg-yellow-50 border-yellow-200' :
          'bg-blue-50 border-blue-200'
        }`}>
          <div className={`text-sm font-medium ${
            error.severity === 'error' ? 'text-red-800' :
            error.severity === 'warning' ? 'text-yellow-800' :
            'text-blue-800'
          }`}>
            {error.message}
          </div>
          {error.suggestion && (
            <div className={`text-xs mt-1 ${
              error.severity === 'error' ? 'text-red-600' :
              error.severity === 'warning' ? 'text-yellow-600' :
              'text-blue-600'
            }`}>
              💡 建议：{error.suggestion}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default function DataUploadPage() {
  const [templates, setTemplates] = useState<TableTemplate[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("select");
  const [onlyUploadNew, setOnlyUploadNew] = useState(false);
  const router = useRouter();

  // 简化的状态更新函数
  const updateFileStatus = (fileName: string, table: string, newStatus: SimpleFileStatus, data?: Partial<UploadedFile>) => {
    const fileKey = `${fileName}_${table}`;
    setUploadedFiles(prev => prev.map(f =>
      `${f.file.name}_${f.table}` === fileKey
        ? { ...f, status: newStatus, ...data }
        : f
    ));
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await axiosInstance.get(`${API_ENDPOINTS.SYSTEM}/table-templates`);
      setTemplates(response.data.templates);
    } catch (error) {
      console.error("获取模板失败:", error);
      toast.error("获取模板失败");
    } finally {
      setLoading(false);
    }
  };

  const downloadTemplate = async (table: string, name: string) => {
    try {
      // 使用axiosInstance来处理认证和CORS
      const response = await axiosInstance.get(`${API_ENDPOINTS.SYSTEM}/download-template/${table}`, {
        responseType: 'blob',
      });

      // 创建blob URL并下载
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `${name}_导入模板.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success(`${name} 模板下载成功`);
    } catch (error) {
      console.error('模板下载失败:', error);
      toast.error("模板下载失败");
    }
  };

  const handleFileUpload = async (table: string, file: File) => {
    // 立即读取文件内容以防止文件被修改
    const fileContent = await file.arrayBuffer();

    const newFile: UploadedFile = {
      file,
      table,
      status: "analyzing",
      fileContent: fileContent, // 立即保存文件内容
      progress: 0 // 添加进度字段
    };

    setUploadedFiles(prev => [...prev, newFile]);
    setActiveTab("upload");

    // 开始验证文件
    await validateFile(newFile);
  };

  const validateFile = async (uploadedFile: UploadedFile) => {
    // 更新状态为分析中
    updateFileStatus(uploadedFile.file.name, uploadedFile.table, "analyzing");

    // 🔥 优化：添加进度提示
    toast.info(`正在分析 ${uploadedFile.file.name}，请耐心等待...`, {
      duration: 5000,
    });

    try {
      // 读取并保存文件内容
      const fileContent = await uploadedFile.file.arrayBuffer();

      // 创建FormData
      const formData = new FormData();
      formData.append('file', uploadedFile.file);
      formData.append('table_name', uploadedFile.table);

      // 🔥 产品使用API v2，其他使用API v1
      let response;
      if (uploadedFile.table === 'products') {
        // 产品使用API v2的预检查
        console.log('🔥 使用API v2进行产品预检查');
        const fileContent = await uploadedFile.file.arrayBuffer();
        const workbook = XLSX.read(fileContent);
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const rawJsonData = XLSX.utils.sheet_to_json(worksheet);

        // 🔥 处理产品数据，转换日期字段
        const processedData = processProductData(rawJsonData);
        console.log('🔥 处理后的数据示例:', processedData[0]);

        console.log('🔥 调用API v2端点: /products/validate');
        response = await axiosV2Instance.post('/products/validate', {
          products: processedData
        }, {
          timeout: 60000
        });
      } else {
        // 其他表使用API v1的预检查
        response = await axiosInstance.post(`${API_ENDPOINTS.FILE_UPLOAD}/precheck-data`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          timeout: 60000,
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              if (percentCompleted < 100) {
                toast.info(`文件上传中: ${percentCompleted}%`, {
                  duration: 1000,
                });
              }
            }
          }
        });
      }

      const result = response.data;
      console.log('预检查结果:', result);

      if (uploadedFile.table === 'products') {
        // 🔥 API v2 产品预检查响应处理
        if (result.error_count > 0) {
          // 如果有验证错误，标记为错误并显示具体错误信息
          const errorMessages = result.errors.join('; ');
          updateFileStatus(uploadedFile.file.name, uploadedFile.table, "error", {
            fileContent: fileContent,
            precheck_result: result,
            error: `发现 ${result.error_count} 行数据错误: ${errorMessages}`
          });
          toast.error(`${uploadedFile.file.name} 预检查失败: ${errorMessages}`);
        } else {
          // 如果没有错误，标记为准备就绪（可能有警告）
          updateFileStatus(uploadedFile.file.name, uploadedFile.table, "ready", {
            fileContent: fileContent,
            precheck_result: result
          });

          let message = `${uploadedFile.file.name} 预检查成功: 新增 ${result.new_products} 条，重复 ${result.duplicate_products} 条`;
          if (result.warning_count > 0) {
            message += `，警告 ${result.warning_count} 条`;
            toast.warning(message);
          } else {
            toast.success(message);
          }
        }
      } else if (result.status === 'success') {
        // 🔥 API v1 其他表预检查响应处理
        const precheck = result.precheck_result;

        // 更新预检查结果并保存文件内容
        if (precheck.summary.error_count > 0) {
          // 如果有验证错误，标记为错误
          updateFileStatus(uploadedFile.file.name, uploadedFile.table, "error", {
            fileContent: fileContent,
            precheck_result: precheck,
            error: `发现 ${precheck.summary.error_count} 行数据错误`
          });
        } else {
          // 如果没有错误，标记为准备就绪（需要用户确认或直接可用）
          updateFileStatus(uploadedFile.file.name, uploadedFile.table, "ready", {
            fileContent: fileContent,
            precheck_result: precheck
          });
        }

        // 显示相应的提示信息
        if (precheck.summary.error_count > 0) {
          toast.error(`${uploadedFile.file.name} 数据验证失败：发现 ${precheck.summary.error_count} 行错误`);
        } else if (precheck.summary.new_count > 0 || precheck.summary.similar_count > 0 || precheck.summary.duplicate_count > 0) {
          toast.info(`${uploadedFile.file.name} 预检查完成，请确认数据`);
        } else {
          toast.success(`${uploadedFile.file.name} 预检查通过`);
        }
      } else {
        // 🔥 API v1 预检查失败
        updateFileStatus(uploadedFile.file.name, uploadedFile.table, "error", {
          fileContent: fileContent,
          error: result.message || "预检查失败"
        });
        toast.error(`${uploadedFile.file.name} 预检查失败: ${result.message}`);
      }
    } catch (error: any) {
      console.error('文件预检查失败:', error);
      console.error('错误详情:', {
        message: error.message,
        code: error.code,
        response: error.response?.data,
        status: error.response?.status,
        timeout: error.code === 'ECONNABORTED'
      });

      let errorMessage = "预检查过程出错";
      if (error.code === 'ECONNABORTED') {
        errorMessage = "请求超时，请检查网络连接或稍后重试";
      } else if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      } else if (error.message) {
        errorMessage = error.message;
      }

      updateFileStatus(uploadedFile.file.name, uploadedFile.table, "error", { error: errorMessage });
      toast.error(`${uploadedFile.file.name} 预检查失败: ${errorMessage}`);
    }
  };

  const confirmAndUpload = async (fileKey: string) => {
    // 确认用户选择，直接进行上传
    const file = uploadedFiles.find(f => `${f.file.name}_${f.table}` === fileKey);
    if (!file) return;

    // 更新状态为准备上传
    updateFileStatus(file.file.name, file.table, "ready");
    toast.success(`${file.file.name} 已确认，准备上传`);
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const uploadAllFiles = async () => {
    const validFiles = uploadedFiles.filter(f => f.status === "ready");

    if (validFiles.length === 0) {
      toast.warning("没有可上传的有效文件");
      return;
    }

    for (let i = 0; i < validFiles.length; i++) {
      const file = validFiles[i];

      // 更新状态为上传中
      updateFileStatus(file.file.name, file.table, "uploading");

      try {
        // 创建FormData，使用保存的文件内容
        const formData = new FormData();

        // 如果有保存的文件内容，使用它；否则使用原始文件
        if (file.fileContent) {
          console.log(`使用保存的文件内容上传: ${file.file.name}`);
          const blob = new Blob([file.fileContent], { type: file.file.type });
          const newFile = new File([blob], file.file.name, {
            type: file.file.type,
            lastModified: file.file.lastModified
          });
          formData.append('file', newFile);
        } else {
          console.log(`使用原始文件上传: ${file.file.name}`);
          formData.append('file', file.file);
        }

        formData.append('table_name', file.table);

        console.log(`开始上传文件: ${file.file.name}, 表: ${file.table}`);

        let response;

        if (file.table === 'products') {
          // 🔥 产品使用API v2上传
          const fileContent = file.fileContent || await file.file.arrayBuffer();
          const workbook = XLSX.read(fileContent);
          const worksheet = workbook.Sheets[workbook.SheetNames[0]];
          const rawJsonData = XLSX.utils.sheet_to_json(worksheet);

          // 🔥 处理产品数据，转换日期字段
          const processedData = processProductData(rawJsonData);

          // 更新进度为50%（开始上传）
          setUploadedFiles(prev => prev.map(f =>
            f.file.name === file.file.name ? { ...f, progress: 50 } : f
          ));

          response = await axiosV2Instance.post('/products/upload', {
            products: processedData,
            only_new: onlyUploadNew
          }, {
            timeout: 60000
          });

          // 更新进度为100%
          setUploadedFiles(prev => prev.map(f =>
            f.file.name === file.file.name ? { ...f, progress: 100 } : f
          ));
        } else {
          // 🔥 其他表使用API v1上传
          response = await axiosInstance.post(`${API_ENDPOINTS.FILE_UPLOAD}/upload-data`, formData, {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
            timeout: 60000,
            onUploadProgress: (progressEvent) => {
              if (progressEvent.total) {
                const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);

                // 更新文件进度
                setUploadedFiles(prev => prev.map(f =>
                  f.file.name === file.file.name
                    ? { ...f, progress: percentCompleted }
                    : f
                ));

                if (percentCompleted < 100) {
                  toast.info(`${file.file.name} 上传中: ${percentCompleted}%`, {
                    duration: 1000,
                  });
                }
              }
            }
          });
        }

        const result = response.data;
        console.log('上传结果:', result); // 添加调试日志

        if (file.table === 'products') {
          // 🔥 API v2 产品上传响应处理
          // 🔥 统一的成功判断逻辑（与后端一致）
          const errorRate = result.error_count / result.total_rows;
          const isSuccess = result.success && !(result.error_count > 0 && result.created_count === 0 && result.skipped_count === 0) && !(errorRate > 0.5);

          if (isSuccess) {
            // 成功或部分成功
            updateFileStatus(file.file.name, file.table, "success", result);
            let message = `${file.file.name} 数据导入完成：创建 ${result.created_count || 0} 条`;
            if (result.skipped_count) message += `，跳过 ${result.skipped_count} 条重复数据`;
            if (result.error_count) message += `，${result.error_count} 条失败`;

            if (result.error_count > 0) {
              toast.warning(message);
            } else {
              toast.success(message);
            }
          } else {
            // 失败
            updateFileStatus(file.file.name, file.table, "error", {
              error: "产品上传失败",
              errors: result.errors || []
            });
            toast.error(`${file.file.name} 产品上传失败：${result.error_count} 条错误`);
          }
        } else {
          // 🔥 API v1 其他表响应处理
          if (result.status === 'validation_failed') {
            updateFileStatus(file.file.name, file.table, "error", {
              error: result.message || "数据验证失败",
              errors: result.validation_result?.errors || []
            });
            toast.error(`${file.file.name} 数据验证失败: ${result.message}`);
          } else {
            updateFileStatus(file.file.name, file.table, "success", {
              import_result: result.import_result
            });
            const successMsg = `${file.file.name} 数据导入完成：成功 ${result.import_result?.success_count || 0} 条`;
            const skippedMsg = result.import_result?.skipped_count ? `，跳过 ${result.import_result.skipped_count} 条重复数据` : '';
            toast.success(successMsg + skippedMsg);
          }
        }
      } catch (error: any) {
        console.error('数据上传失败:', error);
        console.error('错误详情:', {
          message: error.message,
          code: error.code,
          response: error.response?.data,
          status: error.response?.status
        });

        let errorMessage = "上传失败";
        if (error.code === 'ERR_UPLOAD_FILE_CHANGED') {
          errorMessage = "文件已被修改，请重新选择文件";
        } else if (error.response?.data?.detail) {
          errorMessage = error.response.data.detail;
        } else if (error.message) {
          errorMessage = error.message;
        }

        updateFileStatus(file.file.name, file.table, "error", { error: errorMessage });
        toast.error(`${file.file.name} 数据上传失败: ${errorMessage}`);
      }
    }

    toast.success("所有文件处理完成");
  };

  const getStatusColor = (status: SimpleFileStatus) => {
    switch (status) {
      case "analyzing": return "bg-blue-100 text-blue-800";
      case "ready": return "bg-green-100 text-green-800";
      case "error": return "bg-red-100 text-red-800";
      case "uploading": return "bg-yellow-100 text-yellow-800";
      case "success": return "bg-green-100 text-green-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status: SimpleFileStatus) => {
    switch (status) {
      case "analyzing": return "分析中...";
      case "ready": return "准备就绪";
      case "error": return "出现错误";
      case "uploading": return "上传中...";
      case "success": return "上传成功";
      default: return "未知状态";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Database className="h-8 w-8 animate-pulse mx-auto mb-4" />
          <p className="text-muted-foreground">正在加载模板信息...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      {/* 页面标题 */}
      <div className="mb-8">
        <div className="flex items-center space-x-4 mb-4">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => router.push("/dashboard/system-check")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            返回系统检查
          </Button>
        </div>
        <h1 className="text-3xl font-bold text-foreground mb-2">数据上传中心</h1>
        <p className="text-muted-foreground">
          选择要上传的数据类型，下载对应模板，验证并上传您的数据文件。
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="select">选择数据类型</TabsTrigger>
          <TabsTrigger value="upload">文件上传</TabsTrigger>
          <TabsTrigger value="progress">上传进度</TabsTrigger>
        </TabsList>

        {/* 选择数据类型 */}
        <TabsContent value="select" className="space-y-6">
          <Alert>
            <FileText className="h-4 w-4" />
            <AlertDescription>
              请按照依赖关系顺序上传数据。基础数据（如国家、类别）需要先上传，然后再上传依赖这些数据的表。
            </AlertDescription>
          </Alert>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map((template, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-2xl">{template.icon}</span>
                      <div>
                        <CardTitle className="text-lg">{template.name}</CardTitle>
                        <Badge variant="outline" className="text-xs">
                          优先级 {template.priority}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <CardDescription>{template.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* 依赖关系 */}
                  {template.dependencies.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-2">依赖数据:</p>
                      <div className="flex flex-wrap gap-1">
                        {template.dependencies.map((dep, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {dep}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 必填字段 */}
                  <div>
                    <p className="text-sm font-medium mb-2">必填字段:</p>
                    <div className="flex flex-wrap gap-1">
                      {template.required_columns.map((col, i) => (
                        <Badge key={i} variant="default" className="text-xs">
                          {col}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* 操作按钮 */}
                  <div className="flex space-x-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => downloadTemplate(template.table, template.name)}
                    >
                      <Download className="h-4 w-4 mr-1" />
                      下载模板
                    </Button>
                    <label className="cursor-pointer">
                      <Button size="sm" variant="default" asChild>
                        <span>
                          <Upload className="h-4 w-4 mr-1" />
                          上传文件
                        </span>
                      </Button>
                      <input
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            await handleFileUpload(template.table, file);
                          }
                        }}
                      />
                    </label>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* 文件上传 */}
        <TabsContent value="upload" className="space-y-6">
          {uploadedFiles.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-12">
                  <FileSpreadsheet className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">暂无上传文件</h3>
                  <p className="text-muted-foreground mb-4">
                    请先在&ldquo;选择数据类型&rdquo;标签页中选择要上传的文件
                  </p>
                  <Button onClick={() => setActiveTab("select")}>
                    选择文件
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {uploadedFiles.map((file, index) => (
                <Card key={index}>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <FileSpreadsheet className="h-8 w-8 text-blue-600" />
                        <div>
                          <h4 className="font-semibold">{file.file.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            表: {file.table} • 大小: {(file.file.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge className={getStatusColor(file.status)}>
                          {getStatusText(file.status)}
                        </Badge>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => removeFile(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* 验证结果 */}
                    {file.validation_result && (
                      <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                        <h5 className="font-medium text-green-800 mb-2">验证结果</h5>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-green-600">总行数: </span>
                            <span className="font-medium">{file.validation_result.total_rows}</span>
                          </div>
                          <div>
                            <span className="text-green-600">有效行数: </span>
                            <span className="font-medium">{file.validation_result.valid_rows}</span>
                          </div>
                          <div>
                            <span className="text-red-600">无效行数: </span>
                            <span className="font-medium">{file.validation_result.invalid_rows}</span>
                          </div>
                        </div>
                        {file.validation_result.warnings.length > 0 && (
                          <div className="mt-3">
                            <p className="text-sm font-medium text-yellow-700 mb-1">警告:</p>
                            <ul className="text-sm text-yellow-600 space-y-1">
                              {file.validation_result.warnings.map((warning: string, i: number) => (
                                <li key={i}>• {warning}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}

                    {/* 预检查结果 */}
                    {file.precheck_result && (
                      <div className="mt-4 space-y-4">
                        {/* 预检查摘要 */}
                        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                          <h5 className="font-medium text-blue-800 mb-2">数据预检查结果</h5>
                          <div className="grid grid-cols-4 gap-4 text-sm">
                            {(() => {
                              const summary = getPrecheckSummary(file);
                              return (
                                <>
                                  <div>
                                    <span className="text-green-600">新数据: </span>
                                    <span className="font-medium">{summary.new_count} 条</span>
                                  </div>
                                  <div>
                                    <span className="text-yellow-600">相似数据: </span>
                                    <span className="font-medium">{summary.similar_count} 条</span>
                                  </div>
                                  <div>
                                    <span className="text-orange-600">重复数据: </span>
                                    <span className="font-medium">{summary.duplicate_count} 条</span>
                                  </div>
                                  <div>
                                    <span className="text-red-600">错误数据: </span>
                                    <span className="font-medium">{summary.error_count} 条</span>
                                  </div>
                                  {summary.warning_count > 0 && (
                                    <div>
                                      <span className="text-amber-600">警告数据: </span>
                                      <span className="font-medium">{summary.warning_count} 条</span>
                                    </div>
                                  )}
                                </>
                              );
                            })()}
                          </div>
                        </div>

                        {/* 需要用户确认的情况 */}
                        {file.status === "ready" && file.precheck_result && (() => {
                          const summary = getPrecheckSummary(file);
                          return summary.new_count > 0 || summary.similar_count > 0 || summary.duplicate_count > 0;
                        })() && (
                          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <div className="flex items-center justify-between mb-3">
                              <h6 className="font-medium text-yellow-800">需要确认数据</h6>
                              <Button
                                size="sm"
                                onClick={() => confirmAndUpload(`${file.file.name}_${file.table}`)}
                                className="bg-yellow-600 hover:bg-yellow-700"
                              >
                                确认并上传
                              </Button>
                            </div>

                            {/* 新数据 */}
                            {file.precheck_result.new_items.length > 0 && (
                              <div className="mb-3">
                                <p className="text-sm font-medium text-green-700 mb-1">
                                  新数据 ({file.precheck_result.new_items.length} 条):
                                </p>
                                <div className="text-sm text-green-600 max-h-20 overflow-y-auto">
                                  {file.precheck_result.new_items.slice(0, 3).map((item: any, i: number) => (
                                    <div key={i}>
                                      第{item.row}行: {
                                        file.table === 'products'
                                          ? `${item.code || ''} - ${item.product_name_en || ''}`
                                          : (item.data ? JSON.stringify(item.data).substring(0, 100) + '...' : '数据不可用')
                                      }
                                    </div>
                                  ))}
                                  {file.precheck_result.new_items.length > 3 && (
                                    <div className="italic">... 还有 {file.precheck_result.new_items.length - 3} 条新数据</div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* 相似数据 - 仅API v1 */}
                            {file.table !== 'products' && file.precheck_result.similar_items && file.precheck_result.similar_items.length > 0 && (
                              <div className="mb-3">
                                <p className="text-sm font-medium text-yellow-700 mb-1">
                                  相似数据 ({file.precheck_result.similar_items.length} 条):
                                </p>
                                <div className="text-sm text-yellow-600 max-h-20 overflow-y-auto">
                                  {file.precheck_result.similar_items.slice(0, 2).map((item: any, i: number) => (
                                    <div key={i} className="mb-1">
                                      <div>第{item.row}行: {item.data ? JSON.stringify(item.data).substring(0, 80) + '...' : '数据不可用'}</div>
                                      {item.similar_matches && item.similar_matches[0] && (
                                        <div className="text-xs text-yellow-500 ml-2">
                                          相似于: {JSON.stringify(item.similar_matches[0].existing_item).substring(0, 80)}...
                                          (相似度: {(item.similar_matches[0].similarity * 100).toFixed(1)}%)
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                  {file.precheck_result.similar_items.length > 2 && (
                                    <div className="italic">... 还有 {file.precheck_result.similar_items.length - 2} 条相似数据</div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* 重复数据 */}
                            {((file.table === 'products' && (file.precheck_result as any).duplicates && (file.precheck_result as any).duplicates.length > 0) ||
                              (file.table !== 'products' && file.precheck_result.exact_duplicates && file.precheck_result.exact_duplicates.length > 0)) && (
                              <div>
                                <p className="text-sm font-medium text-orange-700 mb-1">
                                  重复数据 ({
                                    file.table === 'products'
                                      ? (file.precheck_result as any).duplicates.length
                                      : file.precheck_result.exact_duplicates.length
                                  } 条):
                                </p>
                                <div className="text-sm text-orange-600 max-h-20 overflow-y-auto">
                                  {file.table === 'products'
                                    ? (file.precheck_result as any).duplicates.slice(0, 2).map((item: any, i: number) => (
                                        <div key={i}>第{item.row}行: {item.code || ''} - {item.product_name_en || ''}</div>
                                      ))
                                    : file.precheck_result.exact_duplicates.slice(0, 2).map((item: any, i: number) => (
                                        <div key={i}>第{item.row}行: {item.data ? JSON.stringify(item.data).substring(0, 100) + '...' : '数据不可用'}</div>
                                      ))
                                  }
                                  {((file.table === 'products' && (file.precheck_result as any).duplicates.length > 2) ||
                                    (file.table !== 'products' && file.precheck_result.exact_duplicates.length > 2)) && (
                                    <div className="italic">... 还有 {
                                      file.table === 'products'
                                        ? (file.precheck_result as any).duplicates.length - 2
                                        : file.precheck_result.exact_duplicates.length - 2
                                    } 条重复数据</div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* 验证错误显示 */}
                        {file.precheck_result && (
                          <>
                            {/* API v2 错误格式 */}
                            {file.table === 'products' && (file.precheck_result as any).errors && (file.precheck_result as any).errors.length > 0 && (
                              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                                <p className="text-sm font-medium text-red-700 mb-3">
                                  发现问题 ({(file.precheck_result as any).errors.length} 个):
                                </p>
                                <div className="max-h-40 overflow-y-auto">
                                  {(file.precheck_result as any).errors.slice(0, 8).map((error: string, i: number) => (
                                    <div key={i} className="text-sm text-red-600 mb-1">• {error}</div>
                                  ))}
                                  {(file.precheck_result as any).errors.length > 8 && (
                                    <div className="text-sm text-red-500 italic mt-2">
                                      ... 还有 {(file.precheck_result as any).errors.length - 8} 个问题
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* API v2 警告格式 */}
                            {file.table === 'products' && (file.precheck_result as any).warnings && (file.precheck_result as any).warnings.length > 0 && (
                              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                                <p className="text-sm font-medium text-amber-700 mb-3">
                                  警告信息 ({(file.precheck_result as any).warnings.length} 个):
                                </p>
                                <div className="max-h-40 overflow-y-auto">
                                  {(file.precheck_result as any).warnings.slice(0, 8).map((warning: string, i: number) => (
                                    <div key={i} className="text-sm text-amber-600 mb-1">⚠️ {warning}</div>
                                  ))}
                                  {(file.precheck_result as any).warnings.length > 8 && (
                                    <div className="text-sm text-amber-500 italic mt-2">
                                      ... 还有 {(file.precheck_result as any).warnings.length - 8} 个警告
                                    </div>
                                  )}
                                </div>
                                <div className="mt-3 text-sm text-amber-700">
                                  <strong>注意:</strong> 警告不会阻止数据上传，但建议检查这些项目。
                                </div>
                              </div>
                            )}

                            {/* API v1 格式化错误显示 */}
                            {file.table !== 'products' && file.precheck_result.formatted_errors && file.precheck_result.formatted_errors.length > 0 && (
                              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                                <p className="text-sm font-medium text-red-700 mb-3">
                                  发现问题 ({file.precheck_result.formatted_errors.length} 个):
                                </p>
                                <div className="max-h-40 overflow-y-auto">
                                  <ErrorDisplayComponent errors={file.precheck_result.formatted_errors.slice(0, 8)} />
                                  {file.precheck_result.formatted_errors.length > 8 && (
                                    <div className="text-sm text-red-500 italic mt-2">
                                      ... 还有 {file.precheck_result.formatted_errors.length - 8} 个问题
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </>
                        )}

                        {/* 如果没有格式化错误，显示原始错误（向后兼容 - 仅API v1） */}
                        {file.table !== 'products' &&
                         (!file.precheck_result.formatted_errors || file.precheck_result.formatted_errors.length === 0) &&
                         file.precheck_result.validation_errors && file.precheck_result.validation_errors.length > 0 && (
                          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-sm font-medium text-red-700 mb-1">
                              验证错误 ({file.precheck_result.validation_errors.length} 条):
                            </p>
                            <div className="text-sm text-red-600 max-h-32 overflow-y-auto">
                              {file.precheck_result.validation_errors.slice(0, 5).map((error: any, i: number) => (
                                <div key={i} className="mb-1">
                                  <div>第{error.row}行:</div>
                                  {error.errors && error.errors.map((err: string, j: number) => (
                                    <div key={j} className="ml-2">• {err}</div>
                                  ))}
                                </div>
                              ))}
                              {file.precheck_result.validation_errors.length > 5 && (
                                <div className="italic">... 还有 {file.precheck_result.validation_errors.length - 5} 个错误</div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                        )}

                    {/* 错误信息 */}
                    {file.error && (
                      <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-sm text-red-600 font-medium mb-2">{file.error}</p>
                        {file.errors && file.errors.length > 0 && (
                          <div className="mt-2">
                            <p className="text-sm font-medium text-red-700 mb-1">详细错误:</p>
                            <ul className="text-sm text-red-600 space-y-1 max-h-32 overflow-y-auto">
                              {file.errors.slice(0, 10).map((error: string, i: number) => (
                                <li key={i} className="break-words">• {error}</li>
                              ))}
                              {file.errors.length > 10 && (
                                <li className="text-red-500 italic">... 还有 {file.errors.length - 10} 个错误</li>
                              )}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}

                    {/* 导入结果 */}
                    {file.import_result && file.status === "success" && (
                      <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                        <h5 className="font-medium text-green-800 mb-2">导入结果</h5>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-green-600">成功导入: </span>
                            <span className="font-medium">{file.import_result.success_count} 条</span>
                          </div>
                          <div>
                            <span className="text-yellow-600">已跳过: </span>
                            <span className="font-medium">{file.import_result.skipped_count || 0} 条</span>
                          </div>
                          <div>
                            <span className="text-red-600">失败: </span>
                            <span className="font-medium">{file.import_result.error_count} 条</span>
                          </div>
                        </div>

                        {/* 跳过的项目 */}
                        {file.import_result.skipped_items && file.import_result.skipped_items.length > 0 && (
                          <div className="mt-3">
                            <p className="text-sm font-medium text-yellow-700 mb-1">跳过的重复数据:</p>
                            <ul className="text-sm text-yellow-600 space-y-1 max-h-32 overflow-y-auto">
                              {file.import_result.skipped_items.slice(0, 5).map((item: string, i: number) => (
                                <li key={i} className="break-words">• {item}</li>
                              ))}
                              {file.import_result.skipped_items.length > 5 && (
                                <li className="text-yellow-500 italic">... 还有 {file.import_result.skipped_items.length - 5} 个跳过项</li>
                              )}
                            </ul>
                          </div>
                        )}

                        {/* 导入错误 - 使用格式化错误显示 */}
                        {file.import_result.formatted_errors && file.import_result.formatted_errors.length > 0 && (
                          <div className="mt-3">
                            <p className="text-sm font-medium text-red-700 mb-2">导入问题:</p>
                            <div className="max-h-32 overflow-y-auto">
                              <ErrorDisplayComponent errors={file.import_result.formatted_errors.slice(0, 5)} />
                              {file.import_result.formatted_errors.length > 5 && (
                                <div className="text-sm text-red-500 italic mt-2">
                                  ... 还有 {file.import_result.formatted_errors.length - 5} 个问题
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* 如果没有格式化错误，显示原始错误（向后兼容） */}
                        {(!file.import_result.formatted_errors || file.import_result.formatted_errors.length === 0) &&
                         file.import_result.errors && file.import_result.errors.length > 0 && (
                          <div className="mt-3">
                            <p className="text-sm font-medium text-red-700 mb-1">导入错误:</p>
                            <ul className="text-sm text-red-600 space-y-1 max-h-32 overflow-y-auto">
                              {file.import_result.errors.slice(0, 5).map((error: string, i: number) => (
                                <li key={i} className="break-words">• {error}</li>
                              ))}
                              {file.import_result.errors.length > 5 && (
                                <li className="text-red-500 italic">... 还有 {file.import_result.errors.length - 5} 个错误</li>
                              )}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}

                    {/* 进度条 */}
                    {(file.status === "analyzing" || file.status === "uploading") && (
                      <div className="mt-4">
                        <div className="flex justify-between text-sm text-gray-600 mb-2">
                          <span>
                            {file.status === "analyzing" ? "分析文件中..." :
                             file.table === "products" ? "产品上传中..." : "上传中..."}
                          </span>
                          <span>{file.progress || 0}%</span>
                        </div>
                        <Progress value={file.progress || (file.status === "analyzing" ? 50 : 80)} />
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}

              {/* 批量操作 */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="onlyUploadNew"
                    checked={onlyUploadNew}
                    onChange={(e) => setOnlyUploadNew(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <label htmlFor="onlyUploadNew" className="text-sm text-gray-700">
                    仅上传新产品（跳过重复产品）
                  </label>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => setUploadedFiles([])}
                  >
                    清空列表
                  </Button>
                  <Button
                    onClick={uploadAllFiles}
                    disabled={!uploadedFiles.some(f => f.status === "ready")}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    上传所有有效文件
                  </Button>
                </div>
              </div>
            </div>
          )}
        </TabsContent>

        {/* 上传进度 */}
        <TabsContent value="progress" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>上传进度总览</CardTitle>
              <CardDescription>查看所有文件的上传状态和结果</CardDescription>
            </CardHeader>
            <CardContent>
              {uploadedFiles.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">暂无上传记录</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {uploadedFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        {file.status === "success" ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : file.status === "error" ? (
                          <AlertTriangle className="h-5 w-5 text-red-600" />
                        ) : (
                          <FileSpreadsheet className="h-5 w-5 text-blue-600" />
                        )}
                        <div>
                          <p className="font-medium">{file.file.name}</p>
                          <p className="text-sm text-muted-foreground">表: {file.table}</p>
                        </div>
                      </div>
                      <Badge className={getStatusColor(file.status)}>
                        {getStatusText(file.status)}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
