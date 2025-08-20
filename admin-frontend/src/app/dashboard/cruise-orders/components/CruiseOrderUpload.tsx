'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, FileText, AlertCircle } from 'lucide-react';
import { cruiseOrdersApi, CruiseOrderUploadResponse } from '@/lib/api/cruise-orders';
import { toast } from 'sonner';

interface CruiseOrderUploadProps {
  onUploadComplete: (data: CruiseOrderUploadResponse) => void;
}

export function CruiseOrderUpload({ onUploadComplete }: CruiseOrderUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const handleFileSelect = (selectedFile: File) => {
    if (!selectedFile.name.endsWith('.xlsx') && !selectedFile.name.endsWith('.xls')) {
      toast.error('请选择Excel文件 (.xlsx 或 .xls)');
      return;
    }
    setFile(selectedFile);
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error('请先选择文件');
      return;
    }

    console.log('开始上传文件:', file.name);
    setIsUploading(true);
    try {
      console.log('调用API上传文件...');
      const result = await cruiseOrdersApi.uploadFile(file);
      console.log('上传成功:', result);
      toast.success(`成功解析 ${result.total_orders} 个订单，${result.total_products} 个产品`);
      onUploadComplete(result);
    } catch (error: any) {
      console.error('上传失败详情:', error);
      console.error('错误响应:', error.response);
      toast.error(error.response?.data?.detail || error.message || '上传失败');
    } finally {
      setIsUploading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold mb-2">上传邮轮订单文件</h2>
        <p className="text-gray-600">
          支持Excel格式 (.xlsx, .xls)，文件应包含订单头部信息和产品明细
        </p>
      </div>

      {/* 文件上传区域 */}
      <div
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
          transition-colors duration-200
          ${dragActive 
            ? 'border-blue-400 bg-blue-50' 
            : file 
              ? 'border-green-400 bg-green-50' 
              : 'border-gray-300 hover:border-gray-400'
          }
        `}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => document.getElementById('file-input')?.click()}
      >
        <input
          id="file-input"
          type="file"
          accept=".xlsx,.xls"
          onChange={handleFileInput}
          className="hidden"
        />
        
        {file ? (
          <div className="space-y-3">
            <FileText className="w-12 h-12 text-green-500 mx-auto" />
            <div>
              <p className="font-medium text-green-700">{file.name}</p>
              <p className="text-sm text-gray-500">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleReset();
              }}
            >
              重新选择
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <Upload className="w-12 h-12 text-gray-400 mx-auto" />
            <div>
              <p className="text-lg font-medium text-gray-700">
                拖拽文件到此处或点击选择
              </p>
              <p className="text-sm text-gray-500">
                支持 .xlsx 和 .xls 格式
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 文件格式说明 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-blue-500 mt-0.5" />
          <div className="space-y-2">
            <h3 className="font-medium text-blue-900">文件格式要求</h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• 文件应包含 HEADER 行（订单信息）和 DETAIL 行（产品信息）</li>
              <li>• HEADER 行字段：Type, PO No, Ship, Supplier, Destination, Delivery Date, Currency</li>
              <li>• DETAIL 行字段：Type, Description, Quantity, Unit Price, Total, Currency</li>
              <li>• 支持多个订单在同一文件中</li>
            </ul>
          </div>
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="flex justify-end space-x-3">
        <Button
          onClick={handleUpload}
          disabled={!file || isUploading}
          className="px-8"
        >
          {isUploading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              解析中...
            </>
          ) : (
            '开始解析'
          )}
        </Button>
      </div>
    </div>
  );
}