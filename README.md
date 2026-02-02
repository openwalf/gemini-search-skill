# Gemini Search Skill

使用Gemini 2.5 Flash Lite的OpenAI兼容协议实现网络搜索和网页内容获取功能，替代web_search和web_fetch。

## 功能

- **搜索**: 使用Gemini内置的Google搜索功能进行网络搜索，返回文本格式的搜索结果
- **获取**: 获取并分析网页内容

## 安装

```powershell
cd skills\gemini-search
npm install
```

## 环境变量配置

### 必需环境变量

- `GEMINI_BASE_URL`: OpenAI兼容的API基础URL
- `GEMINI_API_KEY`: Gemini API密钥

### 配置方法

**临时配置 (PowerShell):**
```powershell
$env:GEMINI_BASE_URL="https://your-api-endpoint.com"
$env:GEMINI_API_KEY="your-api-key"
```

**永久配置 (系统环境变量):**
```powershell
[Environment]::SetEnvironmentVariable("GEMINI_BASE_URL", "https://your-api-endpoint.com", "User")
[Environment]::SetEnvironmentVariable("GEMINI_API_KEY", "your-api-key", "User")
```

**使用.env文件:**
```powershell
copy .env.example .env
# 编辑.env文件填入实际值
```

## 使用方法

### 代码集成

```javascript
import { GeminiSearchSkill } from './index.js';

const skill = new GeminiSearchSkill();
await skill.initialize();

// 搜索
const searchResult = await skill.execute('search', {
  query: '搜索关键词',
  numResults: 10
});
console.log(searchResult.results); // 文本格式

// 获取网页内容
const fetchResult = await skill.execute('fetch', {
  url: 'https://example.com',
  prompt: '总结这个页面的主要内容'
});
console.log(fetchResult.content);
```

### 命令行使用

```powershell
# 搜索
node index.js search "搜索关键词" --num 5

# 获取网页
node index.js fetch "https://example.com" "分析这个页面"
```

## 返回格式

- **搜索结果**: 返回文本格式的搜索结果，由AI根据搜索内容生成
- **网页内容**: 返回文本格式的网页分析结果

## 技术细节

- 使用OpenAI兼容协议调用Gemini API
- 使用gemini-2.5-flash-lite模型，内置Google搜索功能
- 支持自定义baseurl，可配置代理或反向代理
- 无需额外依赖，使用原生fetch API
- 搜索结果以文本格式返回，由AI自然生成

## 文件结构

```
gemini-search/
├── index.js       # Skill入口文件
├── search.js      # 搜索核心功能
├── skill.json     # Skill配置
├── package.json   # 依赖配置
├── example.js     # 使用示例
├── .env.example   # 环境变量模板
└── README.md      # 说明文档
```