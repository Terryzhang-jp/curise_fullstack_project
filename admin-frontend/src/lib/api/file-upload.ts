import axiosInstance from './axios';
import { API_ENDPOINTS } from './endpoints';

export interface UploadResponse {
  message: string;
  success: boolean;
  data?: any;
}

export interface ValidationError {
  row: number;
  field: string;
  message: string;
}

export interface UploadValidationResponse {
  success: boolean;
  message: string;
  errors?: ValidationError[];
  valid_count?: number;
  total_count?: number;
}

// 产品上传相关API
export const productUploadApi = {


  // 验证产品文件
  validateFile: async (file: File): Promise<UploadValidationResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await axiosInstance.post(`${API_ENDPOINTS.PRODUCTS}/validate`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // 下载产品模板
  downloadTemplate: async (): Promise<Blob> => {
    const response = await axiosInstance.get('/products/template', {
      responseType: 'blob',
    });
    return response.data;
  },
};

// 邮轮订单上传相关API
export const cruiseOrderUploadApi = {
  // 上传邮轮订单文件
  uploadFile: async (file: File): Promise<UploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await axiosInstance.post(`${API_ENDPOINTS.CRUISE_ORDERS}/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // 验证邮轮订单文件
  validateFile: async (file: File): Promise<UploadValidationResponse> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await axiosInstance.post(`${API_ENDPOINTS.CRUISE_ORDERS}/validate`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
};

// 通用文件上传API
export const fileUploadApi = {
  // 通用文件上传
  uploadFile: async (endpoint: string, file: File): Promise<UploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await axiosInstance.post(endpoint, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // 通用文件验证
  validateFile: async (endpoint: string, file: File): Promise<UploadValidationResponse> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await axiosInstance.post(endpoint, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
};

// 兼容旧版本的uploadData函数
export const uploadData = async (formData: FormData): Promise<any> => {
  const response = await axiosInstance.post(`${API_ENDPOINTS.FILE_UPLOAD}/upload`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

const fileUploadModule = {
  productUploadApi,
  cruiseOrderUploadApi,
  fileUploadApi,
};

export default fileUploadModule;
