# 前端部署指南

## 环境变量配置

项目使用以下环境变量：

- `NEXT_PUBLIC_API_URL` - API基础URL（例如：https://curise-system.an.r.appspot.com）

## 本地开发环境

1. 创建`.env.local`文件，设置环境变量：
```
NEXT_PUBLIC_API_URL=https://curise-system.an.r.appspot.com
```

2. 启动开发服务器：
```bash
npm run dev
```

## Vercel部署

### 手动部署

1. 登录Vercel并创建新项目
2. 导入GitHub仓库
3. 配置以下环境变量：
   - 名称：`NEXT_PUBLIC_API_URL`
   - 值：`https://curise-system.an.r.appspot.com`
4. 点击"Deploy"按钮

### 触发重新部署

当API配置更改时，你需要触发Vercel重新部署：

1. 登录Vercel仪表板
2. 选择项目
3. 点击"Deployments"标签
4. 点击"Redeploy"按钮，选择最新的成功部署

## 前端与后端集成测试

部署完成后，执行以下测试：

### 基本连接测试

1. 打开浏览器开发者工具（F12）
2. 访问前端应用并尝试登录
3. 检查网络请求，确认API请求指向正确的URL

### 功能测试清单

- [ ] 登录认证 - 使用有效凭据登录
- [ ] 用户信息 - 确认用户信息正确显示
- [ ] 数据加载 - 测试主要数据列表（产品、订单等）
- [ ] 创建操作 - 创建新记录（例如产品）
- [ ] 更新操作 - 编辑现有记录
- [ ] 删除操作 - 删除记录

### 常见问题排查

#### CORS错误

如果遇到CORS错误：
1. 检查后端CORS配置是否包含Vercel域名
2. 重新部署后端应用，应用CORS更改

#### 认证问题

如果登录失败：
1. 检查网络请求，确认请求格式正确
2. 验证API URL是否正确
3. 确认后端用户数据库可访问 