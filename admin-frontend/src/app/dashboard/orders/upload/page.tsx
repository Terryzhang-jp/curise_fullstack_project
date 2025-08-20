"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import PageHeader from "@/components/layout/PageHeader";
import { uploadOrders } from "@/lib/api/orders";

export default function OrderUploadPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // 检查文件类型
      if (!selectedFile.name.match(/\.(xlsx|xls)$/)) {
        setError("请上传Excel文件（.xlsx或.xls格式）");
        setFile(null);
        return;
      }
      setFile(selectedFile);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError("请选择要上传的文件");
      return;
    }

    try {
      setIsUploading(true);
      setError(null);

      const formData = new FormData();
      formData.append("file", file);
      await uploadOrders(formData);

      // 上传成功后返回订单列表页
      router.push("/dashboard/orders");
    } catch (err) {
      setError(err instanceof Error ? err.message : "上传失败，请重试");
    } finally {
      setIsUploading(false);
    }
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <div>
      <PageHeader
        title="上传订单"
        description="通过Excel文件批量上传订单"
        actions={
          <Button variant="outline" onClick={handleBack}>
            返回
          </Button>
        }
      />

      <div className="max-w-2xl mx-auto">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="space-y-6">
            {/* 文件上传区域 */}
            <div>
              <label className="block text-sm font-medium mb-2">选择Excel文件</label>
              <div className="flex items-center gap-4">
                <Input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileChange}
                  disabled={isUploading}
                />
                <Button onClick={handleUpload} disabled={!file || isUploading}>
                  {isUploading ? "上传中..." : "上传"}
                </Button>
              </div>
              {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
            </div>

            {/* 上传说明 */}
            <div className="bg-blue-50 p-4 rounded-md">
              <h4 className="text-sm font-medium text-blue-800 mb-2">上传说明</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• 请使用提供的Excel模板文件</li>
                <li>• 支持.xlsx和.xls格式的Excel文件</li>
                <li>• 文件大小不能超过10MB</li>
                <li>• 确保Excel中的数据格式正确</li>
                <li>• 必填字段：订单号、订单日期、产品、数量、单价</li>
              </ul>
            </div>

            {/* 下载模板按钮 */}
            <div className="flex justify-center">
              <Button variant="outline" onClick={() => window.open("/templates/order_template.xlsx")}>
                下载Excel模板
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 