import axios from "axios";
import { API_CONFIG } from "../config";

// 延迟导入以避免循环依赖
const getAuthToken = () => {
  try {
    // 动态导入authStore以避免初始化问题
    const { default: useAuthStore } = require("../auth/authStore");
    return useAuthStore.getState().token;
  } catch (error) {
    // 如果store还未初始化，尝试从localStorage获取
    return localStorage.getItem("token");
  }
};

// 创建API v1的axios实例
const baseURL = API_CONFIG.BASE_URL;
console.log("🔍 创建axios实例 - baseURL:", baseURL);

// 根据环境决定是否强制HTTPS
let finalBaseURL = baseURL;
if (process.env.NODE_ENV === 'production' && baseURL.startsWith('http:')) {
  // 生产环境强制使用HTTPS
  finalBaseURL = baseURL.replace(/^http:/, 'https:');
  console.log("🔧 生产环境强制HTTPS - 最终baseURL:", finalBaseURL);
} else {
  // 开发环境保持原始协议
  console.log("🔧 开发环境保持原始协议 - 最终baseURL:", finalBaseURL);
}

const axiosInstance = axios.create({
  baseURL: finalBaseURL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: API_CONFIG.TIMEOUT,
  maxRedirects: API_CONFIG.MAX_REDIRECTS,
});

// 创建API v2的axios实例
const v2BaseURL = `${finalBaseURL}/api/v2`;
console.log("🔧 API v2 baseURL:", v2BaseURL);

const axiosV2Instance = axios.create({
  baseURL: v2BaseURL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: API_CONFIG.TIMEOUT,
  maxRedirects: API_CONFIG.MAX_REDIRECTS,
});

// API v1的请求拦截器函数
const addV1AuthInterceptor = (instance: any) => {
  instance.interceptors.request.use(
    (config: any) => {
      console.log("🔍 Axios V1拦截器 - 请求前:", {
        originalUrl: config.url,
        baseURL: config.baseURL,
        fullUrl: config.baseURL + config.url
      });

      // 添加API v1版本前缀
      if (config.url && !config.url.startsWith('/api/v1')) {
        config.url = `/api/v1${config.url}`;
      }

      console.log("🔍 Axios V1拦截器 - 修改后:", {
        modifiedUrl: config.url,
        baseURL: config.baseURL,
        finalUrl: config.baseURL + config.url
      });

      // 从store获取token
      const token = getAuthToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error: any) => Promise.reject(error)
  );
};

// API v2的请求拦截器函数
const addV2AuthInterceptor = (instance: any) => {
  instance.interceptors.request.use(
    (config: any) => {
      console.log("🔍 Axios V2拦截器 - 请求前:", {
        originalUrl: config.url,
        baseURL: config.baseURL,
        fullUrl: config.baseURL + config.url
      });

      // V2不需要添加额外的前缀，因为baseURL已经包含了/api/v2
      console.log("🔍 Axios V2拦截器 - 修改后:", {
        modifiedUrl: config.url,
        baseURL: config.baseURL,
        finalUrl: config.baseURL + config.url
      });

      // 从store获取token
      const token = getAuthToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error: any) => Promise.reject(error)
  );
};

// 通用的响应拦截器函数
const addResponseInterceptor = (instance: any) => {
  instance.interceptors.response.use(
    (response: any) => response,
    (error: any) => {
      // 处理401错误，清除token并重定向到登录页
      if (error.response?.status === 401) {
        try {
          const { default: useAuthStore } = require("../auth/authStore");
          useAuthStore.getState().logout();
        } catch (e) {
          // 如果store不可用，直接清除localStorage
          localStorage.removeItem("token");
        }
        window.location.href = "/login";
      }
      return Promise.reject(error);
    }
  );
};

// 为API v1实例添加拦截器
addV1AuthInterceptor(axiosInstance);
addResponseInterceptor(axiosInstance);

// 为API v2实例添加拦截器
addV2AuthInterceptor(axiosV2Instance);
addResponseInterceptor(axiosV2Instance);

export default axiosInstance;
export { axiosV2Instance };