#!/bin/bash

# 部署脚本 - 将后端部署到Google App Engine
# 作者: Terry
# 日期: 2025-03-09

# 确保脚本在错误时停止
set -e

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}开始部署到Google App Engine...${NC}"

# 先运行检查脚本
echo -e "${GREEN}运行部署前检查...${NC}"
python scripts/deployment_check.py

# 如果检查成功，继续部署
if [ $? -eq 0 ]; then
    echo -e "${GREEN}检查通过，开始部署...${NC}"
    
    # 使用gcloud部署
    echo -e "${GREEN}执行gcloud app deploy...${NC}"
    gcloud app deploy app.yaml --quiet
    
    echo -e "${GREEN}部署完成！${NC}"
    echo -e "${GREEN}应用现在应该可以在 https://curise-system.an.r.appspot.com 上访问${NC}"
    
    # 显示日志命令提示
    echo -e "${YELLOW}要查看应用日志，请运行:${NC}"
    echo "gcloud app logs tail -s default"
else
    echo -e "${RED}检查未通过，取消部署。请先修复上述问题。${NC}"
    exit 1
fi 