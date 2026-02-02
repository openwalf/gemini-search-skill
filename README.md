# Gemini Search Skill

使用 Gemini 2.5 Flash Lite 的 OpenAI 兼容协议实现网络搜索和网页内容获取功能，替代 web_search 和 web_fetch。

## 功能特性

- **网络搜索**: 使用 Gemini 内置的 Google 搜索功能进行网络搜索
- **网页获取**: 获取并分析指定网页的内容
- **自动重试**: 网络错误和超时时自动重试（最多3次）
- **详细日志**: 开发环境下输出详细日志便于调试
- **参数验证**: 严格的输入参数验证和错误处理

## 安装

```powershell
cd skills\gemini-search
npm install
```

## 环境变量配置

### 必需环境变量

| 变量名 | 说明 | 示例 |
|--------|------|------|
| `GEMINI_BASE_URL` | OpenAI 兼容的 API 基础 URL | `https://generativelanguage.googleapis.com/v1beta/openai` |
| `GEMINI_API_KEY` | Gemini API 密钥 | 从 https://makersuite.google.com/ 获取 |

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

**使用 .env 文件:**
```powershell
copy .env.example .env
# 编辑 .env 文件填入实际值
```

## 使用方法

### 作为模块导入

```javascript
import skill from './index.js';

// 初始化
await skill.initialize();

// 搜索
const searchResult = await skill.execute('search', {
  query: '人工智能最新发展',
  numResults: 10,      // 可选，默认 10，范围 1-100
  timeRange: '1d'      // 可选，时间范围
});
console.log(searchResult.results);

// 获取网页内容
const fetchResult = await skill.execute('fetch', {
  url: 'https://example.com',
  prompt: '总结这个页面的主要内容'  // 可选
});
console.log(fetchResult.content);
```

### 命令行使用

```powershell
# 显示帮助
node index.js --help

# 搜索
node index.js search "搜索关键词" --num 5 --time 1d

# 获取网页
node index.js fetch "https://example.com" "分析这个页面"
```

### 命令行参数

**search 命令:**
- `--num <number>`: 搜索结果数量 (1-100, 默认: 10)
- `--time <range>`: 时间范围 (如: 1d, 1w, 1m)

**fetch 命令:**
- 第二个参数为可选的提示词，用于指导 AI 分析网页内容

## API 参考

### Skill 方法

#### `initialize()`
初始化 Skill，验证环境变量并创建搜索引擎实例。

#### `execute(command, params)`
执行指定命令。

**参数:**
- `command` (string): 命令名称，可选值: 'search', 'fetch'
- `params` (Object): 命令参数

**返回值:** Promise<Object>

#### `getInfo()`
获取 Skill 信息。

**返回值:** Object

### search 命令参数

| 参数 | 类型 | 必需 | 默认值 | 说明 |
|------|------|------|--------|------|
| query | string | 是 | - | 搜索查询，最大 1000 字符 |
| numResults | number | 否 | 10 | 返回结果数量，1-100 |
| timeRange | string | 否 | - | 时间范围过滤 |

### fetch 命令参数

| 参数 | 类型 | 必需 | 默认值 | 说明 |
|------|------|------|--------|------|
| url | string | 是 | - | 目标网页 URL |
| prompt | string | 否 | "" | 分析提示词，最大 2000 字符 |

## 返回值格式

### search 返回格式

```javascript
{
  success: true,
  command: 'search',
  query: '搜索关键词',
  numResults: 10,
  timeRange: '1d',
  results: 'AI 生成的搜索结果文本'
}
```

### fetch 返回格式

```javascript
{
  success: true,
  command: 'fetch',
  url: 'https://example.com',
  content: 'AI 生成的网页分析内容',
  timestamp: '2024-01-01T00:00:00.000Z'
}
```

## 错误处理

### 常见错误

| 错误信息 | 说明 | 解决方法 |
|----------|------|----------|
| `GEMINI_BASE_URL environment variable is not set` | 缺少基础 URL | 设置 GEMINI_BASE_URL 环境变量 |
| `GEMINI_API_KEY environment variable is not set` | 缺少 API 密钥 | 设置 GEMINI_API_KEY 环境变量 |
| `Authentication failed: Invalid API key` | API 密钥无效 | 检查 API 密钥是否正确 |
| `Rate limit exceeded: Too many requests` | 请求频率过高 | 稍后再试 |
| `Request timeout` | 请求超时 | 检查网络连接，系统会自动重试 |
| `Query too long (max 1000 characters)` | 查询过长 | 缩短查询内容 |
| `Invalid URL format` | URL 格式错误 | 检查 URL 格式 |

### 自动重试机制

- 超时错误: 最多重试 3 次，每次延迟递增
- 网络错误: 最多重试 3 次
- 服务器错误 (5xx): 最多重试 3 次

## 技术细节

- **模型**: `gemini-2.5-flash-lite`
- **协议**: OpenAI 兼容 API
- **超时**: 30 秒
- **重试次数**: 3 次
- **重试延迟**: 1 秒（逐次递增）
- **依赖**: 无（使用原生 fetch API）

## 文件结构

```
gemini-search/
├── index.js       # Skill 入口和命令行接口
├── search.js      # 核心搜索功能
├── skill.json     # Skill 配置
├── package.json   # 包配置
├── example.js     # 使用示例
├── README.md      # 详细文档
└── .env.example   # 环境变量示例
```

## 日志输出

在开发环境下（`NODE_ENV !== 'production'`），Skill 会输出详细日志：

```
[2024-01-01T00:00:00.000Z] [INFO] Initializing Gemini Search Skill
[2024-01-01T00:00:00.001Z] [INFO] Skill initialized successfully
[2024-01-01T00:00:00.002Z] [INFO] Executing command: search
[2024-01-01T00:00:00.003Z] [DEBUG] API Request (attempt 1/3)
[2024-01-01T00:00:02.000Z] [DEBUG] API request successful
[2024-01-01T00:00:02.001Z] [INFO] Command search executed successfully
```

## 许可证

MIT
