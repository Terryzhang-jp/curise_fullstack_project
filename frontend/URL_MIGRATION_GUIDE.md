# API URL迁移指南

## 问题背景

前端代码中存在大量硬编码的API URL（如`http://localhost:8000/api/v1/xxx`），导致即使设置了环境变量，应用仍然尝试连接本地服务器。

## 解决方案

我们创建了一套工具和配置，用于解决这个问题：

1. **集中化API配置**：`src/lib/api-config.ts`文件
2. **批量更新脚本**：`scripts/update-api-urls.js`
3. **验证脚本**：`scripts/check-urls.js`

## 步骤1：运行批量更新脚本

此脚本会自动替换所有硬编码的API URL，并添加必要的导入语句：

```bash
# 确保你在前端项目目录
cd frontend

# 添加执行权限
chmod +x scripts/update-api-urls.js

# 运行脚本
node scripts/update-api-urls.js
```

## 步骤2：验证更新结果

运行验证脚本，检查是否还有漏网之鱼：

```bash
# 添加执行权限
chmod +x scripts/check-urls.js

# 运行脚本
node scripts/check-urls.js
```

如果有遗漏的文件，验证脚本会输出具体位置，你需要手动修改这些文件或再次运行更新脚本。

## 步骤3：手动检查关键组件

一些关键组件可能需要特别注意：

1. **认证相关组件**：
   - `src/lib/auth.ts` - 登录和用户信息请求

2. **主要数据列表组件**：
   - `src/app/countries/page.tsx`
   - `src/app/companies/page.tsx`
   - `src/app/orders/page.tsx`

3. **仪表板组件**：
   - `src/components/OrderSummaryCard.tsx`
   - `src/components/OrderOverviewGrid.tsx`

## 步骤4：更新环境变量

确保所有环境文件都正确设置了API基础URL：

1. 本地开发：`.env.local`
   ```
   NEXT_PUBLIC_API_URL=https://curise-system.an.r.appspot.com
   ```

2. 生产环境：`.env.production`
   ```
   NEXT_PUBLIC_API_URL=https://curise-system.an.r.appspot.com
   ```

3. Vercel项目设置中添加环境变量：
   - 名称：`NEXT_PUBLIC_API_URL`
   - 值：`https://curise-system.an.r.appspot.com`

## 步骤5：重新部署

1. 提交代码到版本控制系统
2. 在Vercel上重新部署，确保勾选"清除缓存并重新部署"选项

## 常见问题排解

### Q: 更新后部分API请求仍然指向localhost

**解决方案**：检查组件是否正确导入并使用了`getApiUrl`函数。示例：

```typescript
// 错误方式
const response = await fetch('http://localhost:8000/api/v1/countries');

// 正确方式
import { getApiUrl, API_ENDPOINTS } from '@/lib/api-config';
// ...
const response = await fetch(getApiUrl(API_ENDPOINTS.COUNTRIES));
```

### Q: 找不到特定端点的API_ENDPOINTS常量

**解决方案**：在`src/lib/api-config.ts`文件中添加缺失的端点：

```typescript
export const API_ENDPOINTS = {
  // 已有端点...
  
  // 添加新端点
  YOUR_NEW_ENDPOINT: 'api/v1/your-endpoint',
};
```

### Q: 部署后出现CORS错误

**解决方案**：确保后端CORS配置包含Vercel域名，并重新部署后端。

### Q: 部署时出现"Type error: Argument of type 'number' is not assignable to parameter of type 'string'"错误

**解决方案**：这个错误通常是因为在JavaScript中使用连字符（-）引用对象属性。例如：

```typescript
// 错误用法 - 会被解析为减法运算
API_ENDPOINTS.ORDER-ANALYSIS

// 正确用法 - 使用下划线
API_ENDPOINTS.ORDER_ANALYSIS
```

确保所有引用API_ENDPOINTS的地方都使用下划线（_）代替连字符（-）。 