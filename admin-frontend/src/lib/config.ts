// 统一的API配置管理
// 这是唯一需要修改后端URL的地方

/**
 * 获取API基础URL
 * 优先级：环境变量 > 硬编码默认值
 */
export function getApiBaseUrl(): string {
  console.log("🔍 getApiBaseUrl调用:", {
    envVar: process.env.NEXT_PUBLIC_API_URL,
    nodeEnv: process.env.NODE_ENV,
  });

  // 1. 优先使用环境变量（去除空白字符，包括换行符）
  if (process.env.NEXT_PUBLIC_API_URL) {
    const url = process.env.NEXT_PUBLIC_API_URL.trim();
    console.log("✅ 使用环境变量:", url);
    return url;
  }

  // 2. 根据环境返回不同的默认值
  if (process.env.NODE_ENV === "development") {
    // 开发环境默认使用本地后端
    console.log("🔧 使用开发环境默认值");
    return "http://localhost:8000";
  }

  console.warn("⚠️ 生产环境未设置NEXT_PUBLIC_API_URL环境变量，使用HTTPS默认值");

  // 3. 生产环境默认值 - 强制使用HTTPS
  const defaultUrl = "https://cruise-backend-1083982545507.asia-northeast1.run.app";
  console.log("🔧 使用生产环境HTTPS默认值:", defaultUrl);
  return defaultUrl;
}

/**
 * 获取完整的API URL（包含/api/v1路径）
 */
export function getApiUrl(endpoint: string = ""): string {
  const baseUrl = getApiBaseUrl();
  return `${baseUrl}/api/v1${endpoint}`;
}

/**
 * API配置常量
 */
export const API_CONFIG = {
  BASE_URL: getApiBaseUrl(),
  FULL_URL: getApiUrl(),
  VERSION: "/api/v1",
  TIMEOUT: 30000, // 增加到30秒，因为预检查可能需要更长时间
  MAX_REDIRECTS: 5,
} as const;

/**
 * 调试信息 - 在所有环境下都显示
 */
console.log("🔧 API配置调试:", {
  baseUrl: API_CONFIG.BASE_URL,
  fullUrl: API_CONFIG.FULL_URL,
  environment: process.env.NODE_ENV,
  envVar: process.env.NEXT_PUBLIC_API_URL || "未设置",
  timestamp: new Date().toISOString(),
});
