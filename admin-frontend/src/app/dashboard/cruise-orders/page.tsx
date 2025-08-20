'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, FileText, CheckCircle, AlertCircle, Search, Users, Mail } from 'lucide-react';
import { CruiseOrderUpload } from './components/CruiseOrderUpload';
import { CruiseOrderAnalysis } from './components/CruiseOrderAnalysis';
import { CruiseOrderMatch } from './components/CruiseOrderMatch';
import { CruiseOrderSupplierAssignment } from './components/CruiseOrderSupplierAssignment';
import { CruiseOrderEmailPreparation } from './components/CruiseOrderEmailPreparation';
import { CruiseOrderConfirm } from './components/CruiseOrderConfirm';
import { CruiseOrderUploadResponse, CruiseOrderMatchResponse } from '@/lib/api/cruise-orders';

type Step = 'upload' | 'analysis' | 'match' | 'supplier-assignment' | 'email-preparation' | 'complete';

interface ProductSupplierAssignment {
  productIndex: number;
  supplierId: number;
  supplierName: string;
  productCode: string;
  productName: string;
  productNameJp?: string; // 🔧 添加日语名称字段
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  currency: string;
}

export default function CruiseOrdersPage() {
  const [currentStep, setCurrentStep] = useState<Step>('upload');
  const [uploadData, setUploadData] = useState<CruiseOrderUploadResponse | null>(null);
  const [matchResults, setMatchResults] = useState<CruiseOrderMatchResponse | null>(null);
  const [selectedProductIndices, setSelectedProductIndices] = useState<number[]>([]);
  const [supplierAssignments, setSupplierAssignments] = useState<ProductSupplierAssignment[]>([]);

  const handleUploadComplete = (data: CruiseOrderUploadResponse) => {
    setUploadData(data);
    setCurrentStep('analysis');
  };

  const handleAnalysisNext = () => {
    setCurrentStep('match');
  };

  const handleMatchNext = (selectedIndices: number[], matchData: CruiseOrderMatchResponse) => {
    setSelectedProductIndices(selectedIndices);
    setMatchResults(matchData);
    setCurrentStep('supplier-assignment');
  };

  const handleSupplierAssignmentNext = (assignments: ProductSupplierAssignment[]) => {
    setSupplierAssignments(assignments);
    setCurrentStep('email-preparation');
  };

  const handleEmailPreparationNext = () => {
    setCurrentStep('complete');
  };

  const handleReset = () => {
    setCurrentStep('upload');
    setUploadData(null);
    setMatchResults(null);
    setSelectedProductIndices([]);
    setSupplierAssignments([]);
  };

  const steps = [
    { key: 'upload', label: '上传文件', icon: Upload },
    { key: 'analysis', label: '分析数据', icon: FileText },
    { key: 'match', label: '产品匹配', icon: Search },
    { key: 'supplier-assignment', label: '供应商分配', icon: Users },
    { key: 'email-preparation', label: '询价邮件', icon: Mail },
    { key: 'complete', label: '流程完成', icon: CheckCircle },
  ];

  const currentStepIndex = steps.findIndex(step => step.key === currentStep);

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">邮轮订单导入</h1>
        <p className="text-gray-600 mt-2">
          上传邮轮订单Excel文件，系统会自动解析订单和产品信息
        </p>
      </div>

      {/* 步骤指示器 */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isActive = index === currentStepIndex;
            const isCompleted = index < currentStepIndex;
            
            return (
              <div key={step.key} className="flex items-center">
                <div className={`
                  flex items-center justify-center w-10 h-10 rounded-full border-2
                  ${isActive ? 'border-blue-500 bg-blue-500 text-white' : 
                    isCompleted ? 'border-green-500 bg-green-500 text-white' : 
                    'border-gray-300 bg-white text-gray-500'}
                `}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className={`ml-2 text-sm font-medium
                  ${isActive ? 'text-blue-600' : 
                    isCompleted ? 'text-green-600' : 
                    'text-gray-500'}
                `}>
                  {step.label}
                </span>
                {index < steps.length - 1 && (
                  <div className={`mx-4 h-px w-12 
                    ${index < currentStepIndex ? 'bg-green-500' : 'bg-gray-300'}
                  `} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 步骤内容 */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        {currentStep === 'upload' && (
          <CruiseOrderUpload onUploadComplete={handleUploadComplete} />
        )}
        
        {currentStep === 'analysis' && uploadData && (
          <CruiseOrderAnalysis
            uploadData={uploadData}
            onNext={handleAnalysisNext}
            onBack={() => setCurrentStep('upload')}
          />
        )}
        
        {currentStep === 'match' && uploadData && (
          <CruiseOrderMatch
            uploadData={uploadData}
            onNext={handleMatchNext}
            onBack={() => setCurrentStep('analysis')}
          />
        )}
        
        {currentStep === 'supplier-assignment' && uploadData && matchResults && (
          <CruiseOrderSupplierAssignment
            uploadData={uploadData}
            matchResults={matchResults}
            selectedProductIndices={selectedProductIndices}
            onNext={handleSupplierAssignmentNext}
            onBack={() => setCurrentStep('match')}
          />
        )}
        
        {currentStep === 'email-preparation' && supplierAssignments.length > 0 && (
          <CruiseOrderEmailPreparation
            assignments={supplierAssignments}
            onNext={handleEmailPreparationNext}
            onBack={() => setCurrentStep('supplier-assignment')}
          />
        )}
        
        {currentStep === 'complete' && (
          <div className="text-center py-8">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-green-600 mb-2">流程完成！</h2>
            <p className="text-gray-600 mb-6">
              邮轮订单处理流程已完成，询价邮件已发送给相关供应商。
            </p>
            <div className="space-x-4">
              <Button onClick={handleReset} variant="outline">
                处理新订单
              </Button>
              <Button onClick={() => window.location.href = '/dashboard/orders'}>
                查看订单跟踪
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}