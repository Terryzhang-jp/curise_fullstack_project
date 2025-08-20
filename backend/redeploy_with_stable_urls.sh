#!/bin/bash

echo "🚀 重新部署前端和后端 (保持URL稳定)"
echo "================================"

# 设置颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置信息
FRONTEND_URL="https://cruisefrontend.vercel.app"
BACKEND_URL="https://cruise-backend-1083982545507.asia-northeast1.run.app"
PROJECT_ID="gxutokyo"
SERVICE_NAME="cruise-backend"
REGION="asia-northeast1"

echo -e "${BLUE}📋 部署配置：${NC}"
echo "前端URL: $FRONTEND_URL"
echo "后端URL: $BACKEND_URL"
echo "Google Cloud项目: $PROJECT_ID"
echo "服务名称: $SERVICE_NAME"
echo "区域: $REGION"
echo ""

# 1. 重新部署后端
echo -e "${YELLOW}🚀 1. 重新部署后端到Google Cloud Run...${NC}"
cd backend

# 设置项目
gcloud config set project $PROJECT_ID

# 部署到Cloud Run (使用相同的服务名保持URL不变)
echo -e "${BLUE}📦 部署后端服务...${NC}"
gcloud run deploy $SERVICE_NAME \
    --source . \
    --region=$REGION \
    --platform=managed \
    --allow-unauthenticated \
    --env-vars-file=env_vars.yaml \
    --memory=1Gi \
    --cpu=1 \
    --timeout=300 \
    --max-instances=10 \
    --port=8000

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ 后端部署成功！${NC}"
    echo "后端URL: $BACKEND_URL"
else
    echo -e "${RED}❌ 后端部署失败${NC}"
    exit 1
fi

cd ..
echo ""

# 2. 重新部署前端
echo -e "${YELLOW}🚀 2. 重新部署前端到Vercel...${NC}"
cd admin-frontend

# 设置环境变量
echo -e "${BLUE}🔧 设置前端环境变量...${NC}"
vercel env rm NEXT_PUBLIC_API_URL production --yes 2>/dev/null || true
echo "$BACKEND_URL" | vercel env add NEXT_PUBLIC_API_URL production

# 部署到生产环境
echo -e "${BLUE}📦 部署前端应用...${NC}"
vercel --prod

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ 前端部署成功！${NC}"
    echo "前端URL: $FRONTEND_URL"
else
    echo -e "${RED}❌ 前端部署失败${NC}"
    exit 1
fi

cd ..
echo ""

echo -e "${GREEN}🎉 部署完成！${NC}"
echo "================================"
echo -e "${BLUE}📋 部署结果：${NC}"
echo "✅ 前端URL: $FRONTEND_URL"
echo "✅ 后端URL: $BACKEND_URL"
echo "✅ 管理员账号: admin@example.com"
echo "✅ 管理员密码: adminpassword"
