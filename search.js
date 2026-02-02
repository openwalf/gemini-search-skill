/**
 * Gemini Search 核心模块
 * 使用 Gemini 2.5 Flash Lite 的 OpenAI 兼容协议实现搜索功能
 */

class GeminiSearch {
  constructor(baseUrl, apiKey) {
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
    this.model = 'gemini-2.5-flash-lite';
    this.timeout = 30000; // 30秒超时
    this.retryAttempts = 3;
    this.retryDelay = 1000; // 1秒
  }

  /**
   * 记录日志
   * @private
   */
  _log(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      ...(data && { data })
    };
    
    // 在开发环境下输出日志
    if (process.env.NODE_ENV !== 'production') {
      const logMethod = level === 'error' ? console.error : 
                        level === 'warn' ? console.warn : console.log;
      logMethod(`[${timestamp}] [${level.toUpperCase()}] ${message}`, data || '');
    }
    
    return logEntry;
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
  async callGemini(messages, tools = null, attempt = 1) {
    const url = `${this.baseUrl}/v1/chat/completions`;
    
    const requestBody = {
      model: this.model,
      messages: messages,
      temperature: 0.7
    };

    if (tools) {
      requestBody.tools = tools;
    }

    this._log('debug', `API Request (attempt ${attempt}/${this.retryAttempts})`, {
      url: this.baseUrl,
      model: this.model,
      messageCount: messages.length,
      hasTools: !!tools
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
          throw new Error('Rate limit exceeded: Too many requests');
        } else if (response.status >= 500) {
          // 服务器错误，尝试重试
          if (attempt < this.retryAttempts) {
            this._log('warn', `Server error, retrying in ${this.retryDelay}ms...`);
            await this._delay(this.retryDelay * attempt);
            return this.callGemini(messages, tools, attempt + 1);
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
          this._log('warn', `Timeout, retrying in ${this.retryDelay}ms...`);
          await this._delay(this.retryDelay * attempt);
          return this.callGemini(messages, tools, attempt + 1);
        }
        
        throw new Error(`Request timeout after ${this.timeout}ms and ${this.retryAttempts} attempts`);
      }
      
      // 网络错误重试
      if (error.message.includes('fetch failed') || error.message.includes('network')) {
        if (attempt < this.retryAttempts) {
          this._log('warn', `Network error, retrying in ${this.retryDelay}ms...`, { error: error.message });
          await this._delay(this.retryDelay * attempt);
          return this.callGemini(messages, tools, attempt + 1);
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
   * @returns {Promise<string>} 搜索结果文本
   */
  async search(query, options = {}) {
    try {
      this._log('info', 'Starting search', { query, options });
      
      const { numResults = 10, timeRange } = options;
      
      // 验证 numResults 边界
      const validatedNumResults = Math.max(1, Math.min(100, parseInt(numResults) || 10));
      
      const prompt = this.buildSearchPrompt(query, validatedNumResults, timeRange);
      
      // 使用 Google 搜索工具配置
      const text = await this.callGemini([
        { role: 'user', content: prompt }
      ], [{ google_search: {} }]);
      
      this._log('info', 'Search completed successfully');
      
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
  buildSearchPrompt(query, numResults, timeRange) {
    let prompt = `请搜索"${query}"，返回${numResults}个相关结果。`;
    
    if (timeRange) {
      prompt += ` 时间范围限制：${timeRange}。`;
    }
    
    prompt += ` 请以清晰的格式列出搜索结果，包括标题、摘要和来源。`;
    
    return prompt;
  }
}

export default GeminiSearch;
