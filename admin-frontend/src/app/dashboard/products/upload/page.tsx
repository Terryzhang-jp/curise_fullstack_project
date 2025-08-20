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
  X,
  Eye,
  AlertCircle
} from "lucide-react";
import { toast } from "sonner";
import axiosInstance from "@/lib/api/axios";
import PageHeader from "@/components/layout/PageHeader";
import * as XLSX from 'xlsx';

// 数据类型定义
interface ProductRow {
  product_name_en: string;
  country_name: string;
  category_name: string;
  supplier_name: string;
  effective_from: string;
  product_name_jp?: string;
  code?: string;
  unit?: string;
  price?: number;
  unit_size?: string;
  pack_size?: string;
  country_of_origin?: string;
  brand?: string;
  currency?: string;
  status?: boolean;
  effective_to?: string;
  port_name?: string;
}

interface ValidationResult {
  valid: boolean;
  total_rows: number;
  new_products: number;
  duplicate_products: number;
  error_count: number;
  errors: string[];
  duplicates: Array<{
    row: number;
    code: string;
    product_name_en: string;
    reason: string;
  }>;
  new_items: Array<{
    row: number;
    code: string;
    product_name_en: string;
  }>;
}

interface UploadResult {
  success: boolean;
  total_rows: number;
  created_count: number;
  skipped_count: number;
  error_count: number;
  errors: string[];
  created_products: Array<{
    id: number;
    product_name_en: string;
    code: string;
  }>;
}

type UploadStep = 'select' | 'validate' | 'confirm' | 'upload' | 'result';

interface UploadState {
  step: UploadStep;
  file: File | null;
  data: ProductRow[];
  validation: ValidationResult | null;
  uploadResult: UploadResult | null;
  loading: boolean;
  error: string | null;
}

export default function ProductUploadV2() {
  const router = useRouter();
  const [state, setState] = useState<UploadState>({
    step: 'select',
    file: null,
    data: [],
    validation: null,
    uploadResult: null,
    loading: false,
    error: null
  });

  // 解析Excel文件
  const parseExcelFile = useCallback((file: File): Promise<ProductRow[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);
          
          // 转换数据格式
          const products: ProductRow[] = jsonData.map((row: any) => ({
            product_name_en: row.product_name_en || '',
            country_name: row.country_name || '',
            category_name: row.category_name || '',
            supplier_name: row.supplier_name || '',
            effective_from: row.effective_from || '',
            product_name_jp: row.product_name_jp || undefined,
            code: row.code || undefined,
            unit: row.unit || undefined,
            price: row.price ? Number(row.price) : undefined,
            unit_size: row.unit_size || undefined,
            pack_size: row.pack_size || undefined,
            country_of_origin: row.country_of_origin || undefined,
            brand: row.brand || undefined,
            currency: row.currency || undefined,
            status: row.status !== undefined ? Boolean(row.status) : true,
            effective_to: row.effective_to || undefined,
            port_name: row.port_name || undefined,
          }));
          
          resolve(products);
        } catch (error) {
          reject(new Error('Excel文件解析失败'));
        }
      };
      reader.onerror = () => reject(new Error('文件读取失败'));
      reader.readAsArrayBuffer(file);
    });
  }, []);

  // 处理文件选择
  const handleFileSelect = useCallback(async (file: File) => {
    if (!file.name.match(/\.(xlsx|xls|csv)$/i)) {
      toast.error('请选择Excel文件 (.xlsx, .xls) 或CSV文件');
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const data = await parseExcelFile(file);
      setState(prev => ({
        ...prev,
        step: 'validate',
        file,
        data,
        loading: false
      }));
      
      // 自动进行预检查
      await performValidation(data);
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : '文件处理失败'
      }));
      toast.error('文件处理失败');
    }
  }, [parseExcelFile]);

  // 执行预检查
  const performValidation = useCallback(async (data: ProductRow[]) => {
    setState(prev => ({ ...prev, loading: true }));

    try {
      const response = await axiosInstance.post('/api/v2/products/validate', {
        products: data
      });

      const validation: ValidationResult = response.data;
      
      setState(prev => ({
        ...prev,
        step: 'confirm',
        validation,
        loading: false
      }));

      if (validation.error_count > 0) {
        toast.error(`发现 ${validation.error_count} 个错误，请检查数据`);
      } else if (validation.new_products === 0) {
        toast.warning('没有新产品需要上传');
      } else {
        toast.success(`预检查完成：${validation.new_products} 个新产品可以上传`);
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.detail || '预检查失败';
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMsg
      }));
      toast.error(errorMsg);
    }
  }, []);

  // 执行实际上传
  const performUpload = useCallback(async () => {
    if (!state.data.length) return;

    setState(prev => ({ ...prev, step: 'upload', loading: true }));

    try {
      const response = await axiosInstance.post('/api/v2/products/upload', {
        products: state.data
      });

      const result: UploadResult = response.data;
      
      setState(prev => ({
        ...prev,
        step: 'result',
        uploadResult: result,
        loading: false
      }));

      if (result.success && result.created_count > 0) {
        toast.success(`上传成功：创建了 ${result.created_count} 个产品`);
      } else if (result.error_count > 0) {
        toast.error(`上传完成，但有 ${result.error_count} 个错误`);
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.detail || '上传失败';
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMsg
      }));
      toast.error(errorMsg);
    }
  }, [state.data]);

  // 重置状态
  const resetUpload = useCallback(() => {
    setState({
      step: 'select',
      file: null,
      data: [],
      validation: null,
      uploadResult: null,
      loading: false,
      error: null
    });
  }, []);

  // 文件拖拽处理
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="产品批量上传 v2"
        description="两阶段上传：预检查 → 确认 → 上传"
        action={
          <Button
            variant="outline"
            onClick={() => router.push('/dashboard/products')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回产品列表
          </Button>
        }
      />

      {/* 步骤指示器 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            {[
              { key: 'select', label: '选择文件', icon: FileSpreadsheet },
              { key: 'validate', label: '预检查', icon: Eye },
              { key: 'confirm', label: '确认上传', icon: CheckCircle },
              { key: 'result', label: '完成', icon: CheckCircle }
            ].map((step, index) => {
              const Icon = step.icon;
              const isActive = state.step === step.key;
              const isCompleted = ['select', 'validate', 'confirm', 'upload', 'result'].indexOf(state.step) > index;
              
              return (
                <div key={step.key} className="flex items-center">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                    isActive ? 'bg-blue-500 text-white' : 
                    isCompleted ? 'bg-green-500 text-white' : 
                    'bg-gray-200 text-gray-500'
                  }`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className={`ml-2 text-sm ${
                    isActive ? 'text-blue-600 font-medium' : 
                    isCompleted ? 'text-green-600' : 
                    'text-gray-500'
                  }`}>
                    {step.label}
                  </span>
                  {index < 3 && (
                    <div className={`w-12 h-0.5 mx-4 ${
                      isCompleted ? 'bg-green-500' : 'bg-gray-200'
                    }`} />
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* 错误提示 */}
      {state.error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}

      {/* 步骤1: 文件选择 */}
      {state.step === 'select' && (
        <Card>
          <CardHeader>
            <CardTitle>选择Excel文件</CardTitle>
            <CardDescription>
              支持 .xlsx, .xls 格式。请确保文件包含必填字段：product_name_en, country_name, category_name, supplier_name, effective_from
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors cursor-pointer"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => document.getElementById('file-input')?.click()}
            >
              <FileSpreadsheet className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <p className="text-lg font-medium text-gray-900 mb-2">
                拖拽文件到此处或点击选择
              </p>
              <p className="text-sm text-gray-500">
                支持 Excel (.xlsx, .xls) 文件
              </p>
              <input
                id="file-input"
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileSelect(file);
                }}
              />
            </div>

            {state.loading && (
              <div className="mt-4 text-center">
                <Progress value={50} className="w-full mb-2" />
                <p className="text-sm text-gray-500">正在解析文件...</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 步骤2: 预检查中 */}
      {state.step === 'validate' && (
        <Card>
          <CardHeader>
            <CardTitle>正在预检查</CardTitle>
            <CardDescription>
              正在验证数据完整性和重复性...
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <Progress value={75} className="w-full mb-4" />
              <p className="text-sm text-gray-500">
                已解析 {state.data.length} 行数据，正在检查...
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 步骤3: 确认上传 */}
      {state.step === 'confirm' && state.validation && (
        <div className="space-y-6">
          {/* 检查结果概览 */}
          <Card>
            <CardHeader>
              <CardTitle>预检查结果</CardTitle>
              <CardDescription>
                请确认以下信息后点击上传
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {state.validation.total_rows}
                  </div>
                  <div className="text-sm text-blue-600">总计行数</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {state.validation.new_products}
                  </div>
                  <div className="text-sm text-green-600">新增产品</div>
                </div>
                <div className="text-center p-4 bg-yellow-50 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-600">
                    {state.validation.duplicate_products}
                  </div>
                  <div className="text-sm text-yellow-600">重复产品</div>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">
                    {state.validation.error_count}
                  </div>
                  <div className="text-sm text-red-600">错误数据</div>
                </div>
              </div>

              {/* 错误详情 */}
              {state.validation.errors.length > 0 && (
                <Alert variant="destructive" className="mt-4">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="font-medium mb-2">发现以下错误：</div>
                    <ul className="list-disc list-inside space-y-1">
                      {state.validation.errors.slice(0, 5).map((error, index) => (
                        <li key={index} className="text-sm">{error}</li>
                      ))}
                      {state.validation.errors.length > 5 && (
                        <li className="text-sm">...还有 {state.validation.errors.length - 5} 个错误</li>
                      )}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {/* 重复产品详情 */}
              {state.validation.duplicates.length > 0 && (
                <Alert className="mt-4">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="font-medium mb-2">以下产品将被跳过（重复）：</div>
                    <ul className="list-disc list-inside space-y-1">
                      {state.validation.duplicates.slice(0, 5).map((dup, index) => (
                        <li key={index} className="text-sm">
                          第{dup.row}行: {dup.product_name_en} ({dup.code}) - {dup.reason}
                        </li>
                      ))}
                      {state.validation.duplicates.length > 5 && (
                        <li className="text-sm">...还有 {state.validation.duplicates.length - 5} 个重复产品</li>
                      )}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex justify-between mt-6">
                <Button variant="outline" onClick={resetUpload}>
                  <X className="w-4 h-4 mr-2" />
                  取消
                </Button>
                <Button
                  onClick={performUpload}
                  disabled={state.validation.error_count > 0 || state.validation.new_products === 0}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  确认上传 {state.validation.new_products} 个产品
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 步骤4: 上传中 */}
      {state.step === 'upload' && (
        <Card>
          <CardHeader>
            <CardTitle>正在上传</CardTitle>
            <CardDescription>
              正在保存产品数据到数据库...
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <Progress value={90} className="w-full mb-4" />
              <p className="text-sm text-gray-500">
                正在保存数据，请稍候...
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 步骤5: 完成 */}
      {state.step === 'result' && state.uploadResult && (
        <Card>
          <CardHeader>
            <CardTitle>上传完成</CardTitle>
            <CardDescription>
              产品上传结果
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <CheckCircle className="w-16 h-16 mx-auto text-green-500 mb-4" />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {state.uploadResult.created_count}
                  </div>
                  <div className="text-sm text-green-600">成功创建</div>
                </div>
                <div className="text-center p-4 bg-yellow-50 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-600">
                    {state.uploadResult.skipped_count}
                  </div>
                  <div className="text-sm text-yellow-600">跳过重复</div>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">
                    {state.uploadResult.error_count}
                  </div>
                  <div className="text-sm text-red-600">处理失败</div>
                </div>
              </div>

              {state.uploadResult.errors.length > 0 && (
                <Alert variant="destructive" className="mb-4">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="font-medium mb-2">处理过程中发现错误：</div>
                    <ul className="list-disc list-inside space-y-1">
                      {state.uploadResult.errors.slice(0, 3).map((error, index) => (
                        <li key={index} className="text-sm">{error}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex justify-center space-x-4">
                <Button
                  variant="outline"
                  onClick={() => router.push('/dashboard/products')}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  查看产品列表
                </Button>
                <Button onClick={resetUpload}>
                  <Upload className="w-4 h-4 mr-2" />
                  继续上传
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
