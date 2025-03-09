#!/usr/bin/env node

/**
 * API URL更新脚本
 * 
 * 该脚本用于批量替换前端代码中硬编码的API URL
 * 将http://localhost:8000/api/v1/xxx替换为使用api-config.ts中的配置
 */

const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const readdir = promisify(fs.readdir);
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const stat = promisify(fs.stat);

// 导入统计信息
let totalFiles = 0;
let modifiedFiles = 0;
let totalReplacements = 0;

// 需要处理的文件扩展名
const extensions = ['.ts', '.tsx', '.js', '.jsx'];

// 硬编码URL的正则表达式模式
const urlPattern = /(['"`])http:\/\/localhost:8000\/api\/v1\/([^'"`]+)(['"`])/g;

// 检查文件是否已经导入了API配置
function hasApiConfigImport(content) {
  return /import\s+.*from\s+['"]@\/lib\/api-config['"]/.test(content);
}

// 添加API配置导入语句
function addApiConfigImport(content) {
  // 查找最后一个import语句
  const lastImportIndex = content.lastIndexOf('import');
  if (lastImportIndex === -1) {
    // 如果没有import语句，添加到文件开头
    return `import { getApiUrl, API_ENDPOINTS } from '@/lib/api-config';\n\n${content}`;
  }

  // 找到最后一个import语句的结束位置（分号或换行符）
  const importEndIndex = content.indexOf(';', lastImportIndex);
  if (importEndIndex === -1) {
    // 如果没有找到分号，尝试找换行符
    const newlineIndex = content.indexOf('\n', lastImportIndex);
    if (newlineIndex === -1) {
      // 如果都没找到，添加到文件开头
      return `import { getApiUrl, API_ENDPOINTS } from '@/lib/api-config';\n\n${content}`;
    }
    
    // 在最后一个import后添加
    return content.slice(0, newlineIndex + 1) +
           `import { getApiUrl, API_ENDPOINTS } from '@/lib/api-config';\n` +
           content.slice(newlineIndex + 1);
  }

  // 在最后一个import后添加
  return content.slice(0, importEndIndex + 1) +
         `\nimport { getApiUrl, API_ENDPOINTS } from '@/lib/api-config';` +
         content.slice(importEndIndex + 1);
}

// 替换URL并生成API_ENDPOINTS常量
function replaceUrlsWithApiConfig(content) {
  const endpointMap = new Map();
  
  // 替换函数
  const replacer = (match, quote, path, endQuote) => {
    // 移除前后的斜杠
    const cleanPath = path.replace(/^\/|\/$/g, '');
    
    // 根据路径生成常量名称
    let endpointName = cleanPath.split('/')[0].toUpperCase();
    if (cleanPath.includes('/')) {
      // 如果有子路径，只使用第一段作为常量名称基础
      endpointName = cleanPath.split('/')[0].toUpperCase();
    }
    
    // 记录这个端点
    endpointMap.set(cleanPath, endpointName);
    
    // 生成替换后的代码
    return `${quote}api/v1/${cleanPath}${endQuote}`;
  };
  
  // 执行替换
  const modifiedContent = content.replace(urlPattern, replacer);
  
  // 第二次修改，将所有的替换结果替换为getApiUrl调用
  let finalContent = modifiedContent;
  endpointMap.forEach((endpointName, path) => {
    const apiPathPattern = new RegExp(`(['"\`])api\\/v1\\/${path.replace(/\//g, '\\/')}(['"\`])`, 'g');
    finalContent = finalContent.replace(apiPathPattern, (match, quote1, quote2) => {
      return `getApiUrl(API_ENDPOINTS.${endpointName})`;
    });
  });
  
  return finalContent;
}

// 更新单个文件
async function updateFile(filePath) {
  console.log(`检查文件: ${filePath}`);
  
  try {
    // 读取文件内容
    const content = await readFile(filePath, 'utf8');
    
    // 检查文件是否包含硬编码URL
    const hasHardcodedUrls = urlPattern.test(content);
    urlPattern.lastIndex = 0; // 重置正则表达式
    
    if (!hasHardcodedUrls) {
      return false; // 文件不需要修改
    }
    
    console.log(`- 找到硬编码URL，正在更新: ${filePath}`);
    
    // 计算替换数量
    let count = 0;
    content.replace(urlPattern, () => { count++; return ''; });
    totalReplacements += count;
    
    // 替换URL并添加导入
    let updatedContent = replaceUrlsWithApiConfig(content);
    
    // 如果文件没有导入API配置，则添加
    if (!hasApiConfigImport(updatedContent)) {
      updatedContent = addApiConfigImport(updatedContent);
    }
    
    // 写入更新后的内容
    await writeFile(filePath, updatedContent, 'utf8');
    console.log(`- 已更新 ${count} 个URL: ${filePath}`);
    
    return true; // 文件已修改
  } catch (error) {
    console.error(`更新文件时出错: ${filePath}`, error);
    return false;
  }
}

// 递归遍历目录
async function processDirectory(directory) {
  const entries = await readdir(directory);
  
  for (const entry of entries) {
    // 跳过node_modules和.next目录
    if (entry === 'node_modules' || entry === '.next') {
      continue;
    }
    
    const fullPath = path.join(directory, entry);
    const stats = await stat(fullPath);
    
    if (stats.isDirectory()) {
      // 递归处理子目录
      await processDirectory(fullPath);
    } else if (stats.isFile() && extensions.includes(path.extname(fullPath))) {
      // 处理匹配扩展名的文件
      totalFiles++;
      const modified = await updateFile(fullPath);
      if (modified) {
        modifiedFiles++;
      }
    }
  }
}

// 主函数
async function main() {
  const srcDir = path.join(__dirname, '../src');
  console.log('开始更新API URL...');
  console.log(`源码目录: ${srcDir}`);
  
  try {
    await processDirectory(srcDir);
    
    console.log('\n====== 更新完成 ======');
    console.log(`检查的文件数量: ${totalFiles}`);
    console.log(`修改的文件数量: ${modifiedFiles}`);
    console.log(`替换的URL数量: ${totalReplacements}`);
    console.log('\n所有硬编码URL已替换为使用API配置。');
    console.log('请检查更改并手动调整可能的问题。');
  } catch (error) {
    console.error('更新过程中发生错误:', error);
    process.exit(1);
  }
}

// 执行主函数
main(); 