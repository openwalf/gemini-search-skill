# Gemini Search Skill

使用 Gemini 2.0 Flash 的 OpenAI 兼容协议实现网络搜索和网页内容获取功能。

## 功能特性

- **网络搜索**: 使用 Gemini 内置的 Google 搜索功能进行网络搜索
- **增强 JSON 解析**: 更加健壮的搜索结果解析，支持验证和错误回退
- **网页获取**: 获取并分析指定网页的内容
- **自动重试**: 网络错误、超时和 429 频率限制时自动重试（带指数退避）
- **灵活配置**: 支持通过环境变量或命令行参数动态切换模型
- **详细日志**: 开发环境下输出详细日志便于调试

## 安装

### 1. 安装依赖

```bash
cd skills/gemini-search
npm install
```

### 2. 在 Claude Code 中安装

在 Claude Code 终端中运行以下命令（请使用实际的绝对路径）：

```bash
/skill add /path/to/gemini-search
```

安装后，您可以通过 `/skill list` 查看，或直接使用 `/search` 和 `/fetch` 命令。

## 环境变量配置

### 必需环境变量

| 变量名 | 说明 | 示例 |
|--------|------|------|
| `GEMINI_BASE_URL` | OpenAI 兼容的 API 基础 URL | `https://generativelanguage.googleapis.com/v1beta/openai` |
| `GEMINI_API_KEY` | Gemini API 密钥 | 从 https://aistudio.google.com/ 获取 |

### 可选环境变量

| 变量名 | 说明 | 默认值 |
|--------|------|------|
| `GEMINI_MODEL` | 默认使用的模型名称 | `gemini-2.5-flash-lite` |

### 配置方法

**使用 .env 文件:**
```bash
cp .env.example .env
# 编辑 .env 文件填入实际值
```

**命令行设置 (临时):**
- **Bash**: `export GEMINI_API_KEY=your_key`
- **PowerShell**: `$env:GEMINI_API_KEY="your_key"`
- **CMD**: `set GEMINI_API_KEY=your_key`

## 使用方法

### Claude Code 斜杠命令 (推荐)

安装后可直接在 Claude Code 中使用：

- **搜索**: `/search query="关键词" numResults=5`
- **获取网页**: `/fetch url="https://example.com" prompt="分析内容"`

### 作为模块导入

```javascript
import skill from './index.js';

// 初始化
await skill.initialize();

// 搜索 (默认返回结构化 JSON)
const searchResult = await skill.execute('search', {
  query: '人工智能最新发展',
  numResults: 5,      // 可选，默认 10
  json: true,         // 可选，默认 true
  model: 'gemini-2.5-flash-lite' // 可选，覆盖默认模型
});
console.log(searchResult.results);

// 获取网页内容
const fetchResult = await skill.execute('fetch', {
  url: 'https://example.com',
  prompt: '总结这个页面的主要内容', // 可选
  model: 'gemini-2.5-flash-lite' // 可选
});
console.log(fetchResult.content);
```

### 命令行使用

```bash
# 显示帮助
node index.js --help

# 搜索 (返回 JSON)
node index.js search "搜索关键词" --num 5

# 搜索 (返回原始文本)
node index.js search "搜索关键词" --raw

# 指定模型
node index.js search "关键词" --model gemini-2.5-flash-lite

# 获取网页
node index.js fetch "https://example.com" "分析这个页面" --model gemini-2.5-flash-lite
```

## 命令行参数

**search 命令:**
- `--num <number>`: 搜索结果数量 (1-100, 默认: 10)
- `--time <range>`: 时间范围 (如: 1d, 1w, 1m)
- `--raw`: 禁用 JSON 结构化输出，返回 AI 生成的原始文本
- `--model <name>`: 临时覆盖默认模型

**fetch 命令:**
- 第二个参数为可选的提示词，用于指导 AI 分析网页内容
- `--model <name>`: 临时覆盖默认模型

## 返回值格式

### search 返回格式 (JSON 模式)

```javascript
{
  "success": true,
  "command": "search",
  "query": "关键词",
  "results": {
    "results": [
      {
        "title": "标题",
        "snippet": "内容摘要...",
        "url": "https://...",
        "source": "来源网站"
      }
    ],
    "summary": "AI 对搜索结果的整体总结"
  }
}
```

## 错误处理

### 自动重试机制

- **429 Rate Limit**: 自动进行指数退避重试。
- **超时/网络错误**: 最多重试 3 次，延迟随次数增加。
- **5xx 服务器错误**: 自动重试。

## 技术细节

- **默认模型**: `gemini-2.5-flash-lite`
- **协议**: OpenAI 兼容 Chat Completions API
- **超时**: 30 秒
- **重试次数**: 3 次

## 许可证

MIT
