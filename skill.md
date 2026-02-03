# Gemini Search Skill

使用 Gemini API 提供强大的实时网络搜索和深度网页内容分析能力。

## 安装说明

1. 进入技能目录：`cd skills/gemini-search`
2. 安装依赖：`npm install`
3. 配置环境变量：将 `.env.example` 复制为 `.env` 并填入您的 Gemini API Key。
   - **Bash/Linux**: `cp .env.example .env`
   - **Windows/CMD**: `copy .env.example .env`
4. 在 Claude Code 中添加技能：`/skill add [当前目录的绝对路径]`

## 核心能力
1. **增强搜索 (`/search`)**: 调用 Google 搜索获取最新资讯，并通过 Gemini 模型进行信息提炼和结构化输出。
2. **网页抓取 (`/fetch`)**: 抓取指定 URL 的网页内容，并允许通过 Prompt 进行针对性的分析、总结或数据提取。

## 使用指南
- **场景识别**：当用户提出的问题涉及实时信息（如“今天的新闻”、“XX 的最新价格”）或需要深入分析某个网页（如“总结这个链接的内容”）时，应主动考虑使用此技能。
- **参数优化**：
  - `numResults`: 默认为 10。如果需要快速概览，可设为 3-5；如果需要深度调研，可设为 20+。
  - `timeRange`: 支持 `1d` (一天内), `1w` (一周内), `1m` (一月内), `1y` (一年内)。
  - `json`: 默认开启。除非用户明确要求原始文本，否则请保持开启以获得更好的结构化分析。

## 交互示例

### 示例 1：实时资讯查询
**用户**: "分析一下过去 24 小时内关于人工智能的主要新闻。"
**Assistant**: [调用 `/search query="人工智能新闻" timeRange="1d" numResults=10`]

### 示例 2：特定网页分析
**用户**: "总结一下这个页面的核心观点：https://example.com/article"
**Assistant**: [调用 `/fetch url="https://example.com/article" prompt="总结这篇文章的核心观点，按要点列出" `]

## 注意事项
- 技能需要配置 `GEMINI_API_KEY` 和 `GEMINI_BASE_URL`。
- 如果搜索结果不理想，尝试调整关键词或扩大 `timeRange`。
