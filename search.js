class GeminiSearch {
  constructor(baseUrl, apiKey) {
    if (!baseUrl) {
      throw new Error('GEMINI_BASE_URL is required');
    }
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is required');
    }
    
    // 验证baseUrl格式
    try {
      const url = new URL(baseUrl);
      if (!['http:', 'https:'].includes(url.protocol)) {
        throw new Error('Invalid protocol');
      }
      this.baseUrl = baseUrl.replace(/\/$/, '');
    } catch (e) {
      throw new Error('Invalid GEMINI_BASE_URL format');
    }
    
    this.apiKey = apiKey;
    this.model = 'gemini-2.5-flash-lite';
    this.timeout = 30000; // 30秒超时
  }

  async callGemini(messages, tools = null) {
    const url = `${this.baseUrl}/v1/chat/completions`;
    
    const requestBody = {
      model: this.model,
      messages: messages,
      temperature: 0.7
    };

    if (tools) {
      requestBody.tools = tools;
    }

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
        throw new Error(`API request failed with status: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error('Invalid API response format');
      }
      
      return data.choices[0].message.content;
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      throw error;
    }
  }

  async search(query, options = {}) {
    try {
      const { numResults = 10, timeRange } = options;
      
      // 验证numResults边界
      const validatedNumResults = Math.max(1, Math.min(100, parseInt(numResults) || 10));
      
      const prompt = this.buildSearchPrompt(query, validatedNumResults, timeRange);
      
      // 使用正确的Google搜索工具配置
      const text = await this.callGemini([
        { role: 'user', content: prompt }
      ], [{ google_search: {} }]);
      
      return text;
    } catch (error) {
      throw new Error(`Search failed: ${error.message}`);
    }
  }

  async fetch(url, prompt = '') {
    try {
      // 验证URL格式
      try {
        new URL(url);
      } catch (e) {
        throw new Error('Invalid URL format');
      }
      
      const fullPrompt = prompt 
        ? `Please fetch and analyze the content from ${url}. Task: ${prompt}`
        : `Please fetch and summarize the content from ${url}`;
      
      const text = await this.callGemini([
        { role: 'user', content: fullPrompt }
      ]);
      
      return {
        url,
        content: text,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Fetch failed: ${error.message}`);
    }
  }

  buildSearchPrompt(query, numResults, timeRange) {
    let prompt = `请搜索"${query}"，返回${numResults}个相关结果。`;
    
    if (timeRange) {
      prompt += ` 时间范围限制：${timeRange}。`;
    }
    
    return prompt;
  }
}

export default GeminiSearch;