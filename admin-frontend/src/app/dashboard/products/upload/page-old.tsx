"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Upload,
  Download,
  FileText,
  CheckCircle,
  AlertTriangle,
  ArrowLeft,
  FileSpreadsheet,
  X
} from "lucide-react";
import { toast } from "sonner";
import axiosInstance from "@/lib/api/axios";
import { API_ENDPOINTS } from "@/lib/api/endpoints";
import PageHeader from "@/components/layout/PageHeader";

interface UploadState {
  status: 'idle' | 'uploading' | 'processing' | 'completed' | 'error';
  progress: number;
  file?: File;
  result?: UploadResult;
  error?: string;
  uploadId?: string;
}

interface UploadResult {
  success_count: number;
  error_count: number;
  skipped_count: number;
  errors: string[];
  skipped_items: string[];
  new_products: Array<{
    row: number;
    product_name: string;
    status: string;
  }>;
  duplicate_products: Array<{
    row: number;
    product_name: string;
    reason: string;
  }>;
  error_products: Array<{
    row: number;
    product_name: string;
    error: string;
    field?: string;
  }>;
}

export default function ProductUploadPage() {
  const router = useRouter();
  const [uploadState, setUploadState] = useState<UploadState>({
    status: 'idle',
    progress: 0
  });

  const resetUpload = useCallback(() => {
    setUploadState({
      status: 'idle',
      progress: 0
    });
  }, []);

  const downloadTemplate = async () => {
    try {
      const response = await axiosInstance.get(`${API_ENDPOINTS.SYSTEM}/download-template/products`, {
        responseType: 'blob',
      });

      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = '产品数据模板.xlsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('产品模板下载成功');
    } catch (error) {
      console.error('模板下载失败:', error);
      toast.error("模板下载失败");
    }
  };

  const handleFileSelect = useCallback(async (file: File) => {
    // Validate file type
    if (!file.name.endsWith('.csv') && !file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      toast.error('请选择 CSV 或 Excel 文件');
      return;
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('文件大小不能超过 10MB');
      return;
    }

    const uploadId = `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    setUploadState({
      status: 'uploading',
      progress: 0,
      file,
      uploadId
    });

    try {
      await uploadFile(file, uploadId);
    } catch (error) {
      console.error('Upload failed:', error);
      setUploadState(prev => ({
        ...prev,
        status: 'error',
        error: error instanceof Error ? error.message : '上传失败'
      }));
    }
  }, []);

  const uploadFile = async (file: File, uploadId: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_id', uploadId);

    try {
      const response = await axiosInstance.post(
        `${API_ENDPOINTS.FILE_UPLOAD}/products/upload-simple`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          timeout: 300000, // 5 minutes timeout
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const networkProgress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              // Reserve 20% for server processing
              const displayProgress = Math.min(networkProgress * 0.8, 80);

              setUploadState(prev => ({
                ...prev,
                progress: displayProgress,
                status: networkProgress < 100 ? 'uploading' : 'processing'
              }));
            }
          }
        }
      );

      const result = response.data;

      setUploadState(prev => ({
        ...prev,
        status: 'completed',
        progress: 100,
        result: result
      }));

      // Show success message
      const successMsg = `产品上传完成：新增 ${result.success_count} 条`;
      const skippedMsg = result.skipped_count ? `，跳过 ${result.skipped_count} 条重复数据` : '';
      const errorMsg = result.error_count ? `，${result.error_count} 条数据有误` : '';

      if (result.error_count > 0) {
        toast.warning(successMsg + skippedMsg + errorMsg);
      } else {
        toast.success(successMsg + skippedMsg);
      }

    } catch (error: any) {
      console.error('Upload error:', error);

      let errorMessage = '上传失败';
      if (error.code === 'ECONNABORTED') {
        errorMessage = '上传超时，请检查网络连接或稍后重试';
      } else if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      } else if (error.message) {
        errorMessage = error.message;
      }

      setUploadState(prev => ({
        ...prev,
        status: 'error',
        error: errorMessage
      }));

      toast.error(`产品上传失败: ${errorMessage}`);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  }, []);

  const getStatusText = (status: string) => {
    switch (status) {
      case 'uploading': return '上传中...';
      case 'processing': return '处理中...';
      case 'completed': return '完成';
      case 'error': return '错误';
      default: return '待上传';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title="产品数据上传"
        description="批量导入产品数据，支持 CSV 和 Excel 格式"
        actions={
          <div className="flex space-x-2">
            <Button variant="outline" onClick={downloadTemplate}>
              <Download className="h-4 w-4 mr-2" />
              下载模板
            </Button>
            <Button variant="outline" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              返回
            </Button>
          </div>
        }
      />

      {/* Upload Area */}
      {uploadState.status === 'idle' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileSpreadsheet className="h-5 w-5" />
              <span>选择产品文件</span>
            </CardTitle>
            <CardDescription>
              支持 CSV 和 Excel 格式，文件大小不超过 10MB
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors cursor-pointer"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => document.getElementById('file-input')?.click()}
            >
              <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">拖拽文件到这里或点击选择</h3>
              <p className="text-gray-500 mb-4">支持 .csv, .xlsx, .xls 格式</p>
              <Button variant="outline">
                <FileText className="h-4 w-4 mr-2" />
                选择文件
              </Button>
            </div>
            <input
              id="file-input"
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  handleFileSelect(file);
                }
              }}
            />
          </CardContent>
        </Card>
      )}

      {/* Upload Progress */}
      {(uploadState.status === 'uploading' || uploadState.status === 'processing') && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                <FileSpreadsheet className="h-5 w-5" />
                <span>{uploadState.file?.name}</span>
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={resetUpload}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between text-sm text-gray-600">
              <span>{getStatusText(uploadState.status)}</span>
              <span>{uploadState.progress}%</span>
            </div>
            <Progress value={uploadState.progress} />
            <div className="text-sm text-gray-500">
              {uploadState.status === 'uploading' && '正在上传文件...'}
              {uploadState.status === 'processing' && '正在验证和处理数据...'}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upload Results */}
      {uploadState.status === 'completed' && uploadState.result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span>上传完成</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{uploadState.result.success_count}</div>
                <div className="text-sm text-green-700">新增产品</div>
              </div>
              <div className="bg-yellow-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-yellow-600">{uploadState.result.skipped_count}</div>
                <div className="text-sm text-yellow-700">跳过重复</div>
              </div>
              <div className="bg-red-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-red-600">{uploadState.result.error_count}</div>
                <div className="text-sm text-red-700">数据错误</div>
              </div>
            </div>

            {uploadState.result.errors && uploadState.result.errors.length > 0 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    <div className="font-medium">发现以下错误：</div>
                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {uploadState.result.errors.slice(0, 10).map((error, index) => (
                        <div key={index} className="text-sm text-red-600">
                          • {error}
                        </div>
                      ))}
                      {uploadState.result.errors.length > 10 && (
                        <div className="text-sm text-gray-500">
                          还有 {uploadState.result.errors.length - 10} 个错误未显示...
                        </div>
                      )}
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            <div className="flex space-x-2">
              <Button onClick={resetUpload}>
                继续上传
              </Button>
              <Button variant="outline" onClick={() => router.push('/dashboard/products')}>
                查看产品列表
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upload Error */}
      {uploadState.status === 'error' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <span>上传失败</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {uploadState.error || '上传过程中发生未知错误'}
              </AlertDescription>
            </Alert>

            <div className="flex space-x-2">
              <Button onClick={resetUpload}>
                重新上传
              </Button>
              <Button variant="outline" onClick={() => router.back()}>
                返回
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Usage Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>使用说明</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div>
              <strong>支持格式：</strong>CSV (.csv) 和 Excel (.xlsx, .xls) 文件
            </div>
            <div>
              <strong>文件大小：</strong>最大 10MB
            </div>
            <div>
              <strong>必填字段：</strong>
              <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                <li>product_name_en（英文名称）</li>
                <li>country_name（国家名称）</li>
                <li>category_name（类别名称）</li>
                <li>effective_from（起始日期）</li>
              </ul>
            </div>
            <div>
              <strong>数据处理：</strong>
              <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                <li>重复产品将自动跳过</li>
                <li>数据格式错误将显示具体错误信息</li>
                <li>成功导入的产品将立即生效</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}