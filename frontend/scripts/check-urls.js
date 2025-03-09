#!/usr/bin/env node

/**
 * 硬编码URL检查脚本
 * 用于扫描前端代码中是否还有硬编码的API URL
 */

const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const readdir = promisify(fs.readdir);
const readFile = promisify(fs.readFile);
const stat = promisify(fs.stat);

// 需要处理的文件扩展名
const extensions = ['.ts', '.tsx', '.js', '.jsx'];

// 硬编码URL的正则表达式模式
const urlPattern = /(['"`])http:\/\/localhost:8000\/api\/v1\/[^'"`]+(['"`])/g;

// 结果存储
const hardcodedUrls = [];

// 检查单个文件
async function checkFile(filePath) {
  try {
    // 读取文件内容
    const content = await readFile(filePath, 'utf8');
    
    // 查找所有匹配的URL
    const matches = content.match(urlPattern);
    if (matches && matches.length > 0) {
      // 记录文件路径和匹配的URL
      hardcodedUrls.push({
        file: filePath,
        urls: matches
      });
    }
  } catch (error) {
    console.error(`检查文件出错: ${filePath}`, error);
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
      await checkFile(fullPath);
    }
  }
}

// 主函数
async function main() {
  const srcDir = path.join(__dirname, '../src');
  console.log('开始检查硬编码URL...');
  console.log(`源码目录: ${srcDir}`);
  
  try {
    await processDirectory(srcDir);
    
    if (hardcodedUrls.length === 0) {
      console.log('\n✅ 没有发现硬编码URL，所有文件都已更新！');
    } else {
      console.log(`\n❌ 发现 ${hardcodedUrls.length} 个文件中仍有硬编码URL:`);
      hardcodedUrls.forEach(item => {
        console.log(`\n文件: ${item.file}`);
        item.urls.forEach(url => {
          console.log(`  - ${url}`);
        });
      });
      
      console.log('\n这些文件需要手动修复或再次运行更新脚本。');
    }
  } catch (error) {
    console.error('检查过程中发生错误:', error);
    process.exit(1);
  }
}

// 执行主函数
main(); 