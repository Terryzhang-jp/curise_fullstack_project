# 后端URL配置指南

## 📋 概述

本项目已经实现了统一的后端URL配置管理，更换后端地址变得非常简单。

## 🔧 如何更换后端URL

### 方法1：修改环境变量（推荐）

1. **生产环境**：修改 `.env.production` 文件
   ```bash
   NEXT_PUBLIC_API_URL=https://your-new-backend-url.com
   ```

2. **开发环境**：修改 `.env.development` 文件
   ```bash
   NEXT_PUBLIC_API_URL=http://localhost:8000
   ```

3. **重新构建和部署**
   ```bash
   npm run build
   vercel --prod
   ```

### 方法2：修改默认值（备用方案）

如果环境变量不可用，可以修改 `src/lib/config.ts` 文件中的默认值：

```typescript
// 3. 默认值 - 如需更换后端URL，只需修改这里
return "https://your-new-backend-url.com";
```

## 🏗️ 架构说明

### 统一配置文件
- `src/lib/config.ts` - 唯一的API配置管理文件
- 所有API调用都通过这个文件获取后端URL
- 支持环境变量和默认值的优雅降级

### 配置优先级
1. 环境变量 `NEXT_PUBLIC_API_URL`（最高优先级）
2. 代码中的默认值（备用方案）

### 受影响的文件
以下文件已经重构为使用统一配置：
- `src/lib/api-client.ts`
- `src/lib/api/axios.ts`
- `src/lib/api/auth.ts`
- `src/lib/utils.ts`

## ✅ 验证配置

### 开发模式调试
在开发模式下，控制台会显示当前API配置：
```
🔧 API配置: {
  baseUrl: "https://your-backend-url.com",
  fullUrl: "https://your-backend-url.com/api/v1",
  environment: "production",
  envVar: "https://your-backend-url.com"
}
```

### 测试步骤
1. 修改环境变量
2. 重新构建：`npm run build`
3. 检查控制台输出确认配置正确
4. 测试登录和数据加载功能

## 🚀 部署流程

### Vercel部署
```bash
# 1. 确保环境变量正确
cat .env.production

# 2. 清除构建缓存
rm -rf .next

# 3. 重新部署
vercel --prod
```

### 环境变量设置
也可以在Vercel控制台中设置环境变量：
1. 进入项目设置
2. 添加 `NEXT_PUBLIC_API_URL` 环境变量
3. 重新部署

## 🔒 安全注意事项

1. **生产环境必须使用HTTPS**
2. **不要在代码中硬编码敏感信息**
3. **环境变量以 `NEXT_PUBLIC_` 开头才能在客户端使用**

## 🐛 故障排除

### 常见问题
1. **Mixed Content错误**：确保生产环境使用HTTPS
2. **Network Error**：检查API端点是否需要尾部斜杠
3. **环境变量不生效**：确保变量名以 `NEXT_PUBLIC_` 开头

### 调试命令
```bash
# 检查环境变量
echo $NEXT_PUBLIC_API_URL

# 查看构建日志中的环境变量
npm run build | grep "Environments"
```
