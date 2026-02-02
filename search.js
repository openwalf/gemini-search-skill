/**
 * Gemini Search 核心模块
 * 使用 Gemini 2.5 Flash Lite 的 OpenAI 兼容协议实现搜索功能
 */

class GeminiSearch {
  /**
   * @param {string} baseUrl - API 基础 URL
   * @param {string} apiKey - API 密钥
   * @param {Object} options - 配置选项
   * @param {string} options.model - 模型名称 (默认: gemini-2.0-flash-exp)
   * @param {number} options.timeout - 超时时间 (毫秒, 默认: 30000)
   * @param {number} options.retryAttempts - 重试次数 (默认: 3)
   * @param {number} options.retryDelay - 重试延迟基数 (毫秒, 默认: 1000)
   */
  constructor(baseUrl, apiKey, options = {}) {
    if (!baseUrl) {
      throw new Error('GEMINI_BASE_URL is required');
    }
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is required');
    }

    // 验证 baseUrl 格式
    try {
      const url = new URL(baseUrl);
      if (!['http:', 'https:'].includes(url.protocol)) {
        throw new Error('Invalid protocol: must be http or https');
      }
      this.baseUrl = baseUrl.replace(/\/$/, '');
    } catch (e) {
      throw new Error(`Invalid GEMINI_BASE_URL format: ${e.message}`);
    }

    this.apiKey = apiKey;
    this.model = options.model || 'gemini-2.5-flash-lite';
    this.timeout = options.timeout || 30000;
    this.retryAttempts = options.retryAttempts || 3;
    this.retryDelay = options.retryDelay || 1000;
  }

  /**
   * 更新模型名称
   * @param {string} model - 模型名称
   */
  setModel(model) {
    if (model) {
      this.model = model;
    }
  }

  /**
   * 记录日志
   * @private
   */
  _log(level, message, data = null) {
    const timestamp = new Date().toISOString();

    // 在开发环境下输出日志
    if (process.env.NODE_ENV !== 'production') {
      const logMethod = level === 'error' ? console.error :
                        level === 'warn' ? console.warn : console.log;

      let displayData = '';
      if (data) {
        if (data instanceof Error) {
          displayData = `\n${data.stack}`;
        } else {
          displayData = `\n${JSON.stringify(data, null, 2)}`;
        }
      }

      logMethod(`[${timestamp}] [${level.toUpperCase()}] ${message}${displayData}`);
    }
  }

  /**
   * 延迟函数
   * @private
   */
  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 调用 Gemini API
   * @private
   */
  async callGemini(messages, tools = null, responseFormat = null, attempt = 1) {
    const url = `${this.baseUrl}/v1/chat/completions`;

    const requestBody = {
      model: this.model,
      messages: messages,
      temperature: 0.7
    };

    if (tools) {
      requestBody.tools = tools;
    }

    if (responseFormat) {
      requestBody.response_format = responseFormat;
    }

    this._log('debug', `API Request (attempt ${attempt}/${this.retryAttempts})`, {
      url: this.baseUrl,
      model: this.model,
      messageCount: messages.length,
      hasTools: !!tools,
      responseFormat
    });

    // 添加超时控制
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorBody = await response.text();
        this._log('error', `API request failed`, {
          status: response.status,
          statusText: response.statusText,
          body: errorBody
        });

        // 处理特定错误码
        if (response.status === 401) {
          throw new Error('Authentication failed: Invalid API key');
        } else if (response.status === 429) {
          // 429 也进行重试，因为可能是配额瞬时限制
          if (attempt < this.retryAttempts) {
            const delay = this.retryDelay * Math.pow(2, attempt - 1);
            this._log('warn', `Rate limited, retrying in ${delay}ms...`);
            await this._delay(delay);
            return this.callGemini(messages, tools, responseFormat, attempt + 1);
          }
          throw new Error('Rate limit exceeded: Too many requests');
        } else if (response.status >= 500) {
          // 服务器错误，尝试重试
          if (attempt < this.retryAttempts) {
            const delay = this.retryDelay * Math.pow(2, attempt - 1);
            this._log('warn', `Server error, retrying in ${delay}ms...`);
            await this._delay(delay);
            return this.callGemini(messages, tools, responseFormat, attempt + 1);
          }
        }

        throw new Error(`API request failed with status ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        this._log('error', 'Invalid API response format', data);
        throw new Error('Invalid API response format: missing choices or message');
      }

      this._log('debug', 'API request successful');

      return data.choices[0].message.content;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error.name === 'AbortError') {
        this._log('error', 'Request timeout', { timeout: this.timeout });

        // 超时重试
        if (attempt < this.retryAttempts) {
          const delay = this.retryDelay * Math.pow(2, attempt - 1);
          this._log('warn', `Timeout, retrying in ${delay}ms...`);
          await this._delay(delay);
          return this.callGemini(messages, tools, responseFormat, attempt + 1);
        }

        throw new Error(`Request timeout after ${this.timeout}ms and ${this.retryAttempts} attempts`);
      }

      // 网络错误重试
      if (error.message.includes('fetch failed') || error.message.includes('network') || error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
        if (attempt < this.retryAttempts) {
          const delay = this.retryDelay * Math.pow(2, attempt - 1);
          this._log('warn', `Network error, retrying in ${delay}ms...`, { error: error.message });
          await this._delay(delay);
          return this.callGemini(messages, tools, responseFormat, attempt + 1);
        }
      }

      throw error;
    }
  }

  /**
   * 执行搜索
   * @param {string} query - 搜索查询
   * @param {Object} options - 搜索选项
   * @param {number} options.numResults - 结果数量 (1-100)
   * @param {string} options.timeRange - 时间范围
   * @param {boolean} options.json - 是否返回结构化 JSON
   * @returns {Promise<any>} 搜索结果
   */
  async search(query, options = {}) {
    try {
      this._log('info', 'Starting search', { query, options });

      const { numResults = 10, timeRange, json = true } = options;

      // 验证 numResults 边界
      const validatedNumResults = Math.max(1, Math.min(100, parseInt(numResults) || 10));

      const prompt = this.buildSearchPrompt(query, validatedNumResults, timeRange, json);

      const responseFormat = json ? { type: "json_object" } : null;

      // 使用 Google 搜索工具配置
      const text = await this.callGemini([
        { role: 'user', content: prompt }
      ], [{ google_search: {} }], responseFormat);

      this._log('info', 'Search completed successfully');

    if (json) {
      try {
        const parsed = JSON.parse(text);
        // 增强验证
        if (!parsed.results || !Array.isArray(parsed.results)) {
          this._log('warn', 'JSON response missing results array', { parsed });
          return { results: [], summary: text, raw: parsed };
        }
        return parsed;
      } catch (e) {
        this._log('warn', 'Failed to parse JSON response, returning raw text', { text, error: e.message });
        return { results: [], summary: text, error: 'JSON_PARSE_ERROR' };
      }
    }

      return text;
    } catch (error) {
      this._log('error', 'Search failed', { error: error.message });
      throw new Error(`Search failed: ${error.message}`);
    }
  }

  /**
   * 获取网页内容
   * @param {string} url - 目标网页 URL
   * @param {string} prompt - 分析提示词
   * @returns {Promise<Object>} 网页分析结果
   */
  async fetch(url, prompt = '') {
    try {
      this._log('info', 'Starting fetch', { url, hasPrompt: !!prompt });

      // 验证 URL 格式
      try {
        new URL(url);
      } catch (e) {
        throw new Error(`Invalid URL format: ${url}`);
      }

      const fullPrompt = prompt
        ? `Please fetch and analyze the content from ${url}. Task: ${prompt}`
        : `Please fetch and summarize the content from ${url}`;

      const text = await this.callGemini([
        { role: 'user', content: fullPrompt }
      ]);

      const result = {
        url,
        content: text,
        timestamp: new Date().toISOString()
      };

      this._log('info', 'Fetch completed successfully');

      return result;
    } catch (error) {
      this._log('error', 'Fetch failed', { url, error: error.message });
      throw new Error(`Fetch failed: ${error.message}`);
    }
  }

  /**
   * 构建搜索提示词
   * @private
   */
  buildSearchPrompt(query, numResults, timeRange, json) {
    let prompt = `请搜索"${query}"，返回约${numResults}个相关结果。`;

    if (timeRange) {
      prompt += ` 时间范围限制：${timeRange}。`;
    }

    if (json) {
      prompt += ` 请以 JSON 格式返回结果。响应必须是一个合法的 JSON 对象，不要包含 markdown 代码块标记。
结构如下：
{
  "results": [
    {
      "title": "网页标题",
      "snippet": "内容摘要",
      "url": "网址",
      "source": "来源网站"
    }
  ],
  "summary": "对所有结果的简明总结"
}`;
    } else {
      prompt += ` 请以清晰的格式列出搜索结果，包括标题、摘要和来源。`;
    }

    return prompt;
  }
}

export default GeminiSearch;
