/**
 * Excel生成API调用函数
 * 用于生成邮轮订单询价单Excel文件
 */

import axiosInstance, { axiosV2Instance } from './axios';
import { API_ENDPOINTS } from './endpoints';

// 产品项目接口
export interface ProductItem {
  po_number: string;
  product_code: string;
  product_name_en: string;
  product_name_jp: string;
  pack_size: string;  // 包装规格，显示在F列（与G列合并）
  quantity: number;
  unit: string;
  unit_price: number;
  amount: number;
  currency: string;
}

// 采购订单请求接口
export interface PurchaseOrderRequest {
  supplier_id: number;
  supplier_name: string;
  products: ProductItem[];
  delivery_date: string;
  delivery_address: string;
  total_amount: number;
  currency: string;
  invoice_number?: string;
  voyage_number?: string;
}

// Excel生成API
export const excelGeneratorApi = {
  /**
   * 预览采购订单Excel数据
   * @param request 采购订单请求数据
   * @returns Promise<any> 预览数据
   */
  previewPurchaseOrder: async (request: PurchaseOrderRequest): Promise<any> => {
    try {
      const response = await axiosV2Instance.post(
        '/excel/preview-purchase-order',
        request,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error('预览采购订单失败:', error);
      throw error;
    }
  },

  /**
   * 根据更新数据生成Excel文件
   * @param updateRequest 更新请求数据
   * @param originalRequest 原始请求数据
   * @returns Promise<Blob> Excel文件的Blob对象
   */
  updateAndGenerateExcel: async (updateRequest: any, originalRequest: PurchaseOrderRequest): Promise<Blob> => {
    try {
      const response = await axiosV2Instance.post(
        '/excel/update-and-generate',
        {
          update_request: updateRequest,
          original_request: originalRequest
        },
        {
          responseType: 'blob',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error('更新并生成Excel失败:', error);
      throw error;
    }
  },

  /**
   * 生成采购订单Excel文件
   * @param request 采购订单请求数据
   * @returns Promise<Blob> Excel文件的Blob对象
   */
  generatePurchaseOrder: async (request: PurchaseOrderRequest): Promise<Blob> => {
    try {
      // 🔧 修复URL问题：使用API v2专用的axios实例
      const response = await axiosV2Instance.post(
        '/excel/generate-purchase-order',
        request,
        {
          responseType: 'blob', // 重要：指定响应类型为blob
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      // 检查响应是否成功
      if (response.status !== 200) {
        throw new Error(`HTTP ${response.status}: Excel生成失败`);
      }

      return response.data;
    } catch (error: any) {
      console.error('Excel生成失败:', error);
      
      // 处理不同类型的错误
      if (error.response) {
        // 服务器返回错误响应
        const status = error.response.status;
        const message = error.response.data?.detail || `服务器错误 (${status})`;
        throw new Error(`Excel生成失败: ${message}`);
      } else if (error.request) {
        // 网络错误
        throw new Error('网络连接失败，请检查网络连接');
      } else {
        // 其他错误
        throw new Error(`Excel生成失败: ${error.message}`);
      }
    }
  },

  /**
   * 下载Excel文件
   * @param blob Excel文件的Blob对象
   * @param filename 文件名
   */
  downloadExcelFile: (blob: Blob, filename: string) => {
    try {
      // 创建下载链接
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      
      // 触发下载
      document.body.appendChild(link);
      link.click();
      
      // 清理
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('文件下载失败:', error);
      throw new Error('文件下载失败');
    }
  },

  // PDF功能暂时移除，正在开发中

  /**
   * 生成并下载采购订单Excel文件
   * @param request 采购订单请求数据
   * @param customFilename 自定义文件名（可选）
   */
  generateAndDownloadPurchaseOrder: async (
    request: PurchaseOrderRequest,
    customFilename?: string
  ): Promise<void> => {
    try {
      // 生成Excel文件
      const blob = await excelGeneratorApi.generatePurchaseOrder(request);

      // 生成文件名
      const currentDate = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const filename = customFilename || `询价单_${request.supplier_name}_${currentDate}.xlsx`;

      // 下载文件
      excelGeneratorApi.downloadExcelFile(blob, filename);
    } catch (error) {
      console.error('Excel生成和下载失败:', error);
      throw error;
    }
  },

  // PDF下载功能暂时移除，正在开发中
};

/**
 * 将ProductSupplierAssignment转换为ProductItem
 * @param assignment 产品供应商分配数据
 * @param poNumber PO编号
 * @returns ProductItem
 */
export const convertToProductItem = (
  assignment: any, 
  poNumber: string = ''
): ProductItem => {
  return {
    po_number: poNumber,
    product_code: assignment.productCode || '',
    product_name_en: assignment.productName || '',
    product_name_jp: assignment.productNameJp || assignment.productName || '', // 🔧 修复：使用日语字段
    pack_size: `${assignment.quantity}*1EA/CT`,  // 包装规格格式，如 "150*1EA/CT"
    quantity: assignment.quantity || 0,
    unit: 'CT', // 默认单位
    unit_price: assignment.unitPrice || 0,
    amount: assignment.totalPrice || 0,
    currency: assignment.currency || 'JPY'
  };
};

/**
 * 将SupplierEmailInfo转换为PurchaseOrderRequest
 * @param emailInfo 供应商邮件信息
 * @param deliveryDate 交货日期
 * @param deliveryAddress 交货地址（可选，会根据港口动态获取）
 * @param voyageNumber 航次号
 * @param poNumber PO编号
 * @returns PurchaseOrderRequest
 */
export const convertToPurchaseOrderRequest = (
  emailInfo: any,
  deliveryDate: string = '',
  deliveryAddress: string = '',
  voyageNumber: string = '',
  poNumber: string = ''
): PurchaseOrderRequest => {
  // 如果没有提供PO编号，则生成一个
  const finalPoNumber = poNumber || `${new Date().toISOString().slice(0, 10).replace(/-/g, '')}ML`;

  // 如果没有提供航次号，使用默认值
  const finalVoyageNumber = voyageNumber || 'ML-1017';

  // 生成Invoice编号
  const currentDate = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const invoiceNumber = `${currentDate}-02 ML`;

  // 如果没有提供交货地址，使用默认的横浜地址
  const finalDeliveryAddress = deliveryAddress || '神奈川県横浜市中区海岸通り1-1-4 株式会社松武';

  return {
    supplier_id: emailInfo.supplierId,
    supplier_name: emailInfo.supplierName,
    products: emailInfo.products.map((product: any) =>
      convertToProductItem(product, finalPoNumber)
    ),
    delivery_date: deliveryDate || new Date().toISOString().slice(0, 10).replace(/-/g, '/'),
    delivery_address: finalDeliveryAddress,
    total_amount: emailInfo.totalValue,
    currency: 'JPY',
    invoice_number: invoiceNumber,
    voyage_number: finalVoyageNumber
  };
};
