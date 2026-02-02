class GeminiSearch {
  constructor(baseUrl, apiKey) {
    if (!baseUrl) {
      throw new Error('GEMINI_BASE_URL is required');
    }
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is required');
    }
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.apiKey = apiKey;
    this.model = 'gemini-2.5-flash-lite';
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

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API request failed: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }

  async search(query, options = {}) {
    try {
      const { numResults = 10, timeRange } = options;
      
      const prompt = this.buildSearchPrompt(query, numResults, timeRange);
      
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