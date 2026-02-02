/**
 * Gemini Search Skill 入口文件
 * 提供网络搜索和网页内容获取功能
 */

import GeminiSearch from './search.js';

class GeminiSearchSkill {
  constructor() {
    this.baseUrl = process.env.GEMINI_BASE_URL;
    this.apiKey = process.env.GEMINI_API_KEY;
    this.searchEngine = null;
    this.initialized = false;
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
    
    if (process.env.NODE_ENV !== 'production') {
      const logMethod = level === 'error' ? console.error : 
                        level === 'warn' ? console.warn : console.log;
      logMethod(`[${timestamp}] [${level.toUpperCase()}] ${message}`, data || '');
    }
    
    return logEntry;
  }

  /**
   * 初始化 Skill
   */
  async initialize() {
    if (this.initialized) {
      this._log('debug', 'Skill already initialized');
      return;
    }

    this._log('info', 'Initializing Gemini Search Skill');

    if (!this.baseUrl) {
      throw new Error('GEMINI_BASE_URL environment variable is not set');
    }
    if (!this.apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is not set');
    }

    try {
      this.searchEngine = new GeminiSearch(this.baseUrl, this.apiKey);
      this.initialized = true;
      this._log('info', 'Skill initialized successfully');
    } catch (error) {
      this._log('error', 'Failed to initialize skill', { error: error.message });
      throw error;
    }
  }

  /**
   * 执行命令
   * @param {string} command - 命令名称 (search 或 fetch)
   * @param {Object} params - 命令参数
   */
  async execute(command, params) {
    if (!this.initialized) {
      await this.initialize();
    }

    this._log('info', `Executing command: ${command}`, { params });

    try {
      let result;
      
      switch (command) {
        case 'search':
          result = await this.search(params);
          break;
        case 'fetch':
          result = await this.fetch(params);
          break;
        default:
          throw new Error(`Unknown command: ${command}. Available commands: search, fetch`);
      }

      this._log('info', `Command ${command} executed successfully`);
      return result;
    } catch (error) {
      this._log('error', `Command ${command} failed`, { error: error.message });
      throw error;
    }
  }

  /**
   * 搜索功能
   * @private
   */
  async search(params) {
    const { query, numResults = 10, timeRange } = params;
    
    // 验证 query 参数
    if (!query) {
      throw new Error('Query parameter is required for search');
    }
    
    if (typeof query !== 'string') {
      throw new Error('Query must be a string');
    }
    
    const trimmedQuery = query.trim();
    if (trimmedQuery.length === 0) {
      throw new Error('Query cannot be empty');
    }
    
    if (trimmedQuery.length > 1000) {
      throw new Error('Query too long (max 1000 characters)');
    }

    // 验证 numResults
    const validatedNumResults = parseInt(numResults);
    if (isNaN(validatedNumResults) || validatedNumResults < 1 || validatedNumResults > 100) {
      throw new Error('numResults must be a number between 1 and 100');
    }

    const results = await this.searchEngine.search(trimmedQuery, { 
      numResults: validatedNumResults, 
      timeRange 
    });

    return {
      success: true,
      command: 'search',
      query: trimmedQuery,
      numResults: validatedNumResults,
      timeRange: timeRange || null,
      results
    };
  }

  /**
   * 获取网页内容
   * @private
   */
  async fetch(params) {
    const { url, prompt = '' } = params;
    
    // 验证 URL 参数
    if (!url) {
      throw new Error('URL parameter is required for fetch');
    }
    
    // 验证 URL 格式
    try {
      new URL(url);
    } catch (e) {
      throw new Error(`Invalid URL format: ${url}`);
    }
    
    // 验证 prompt 长度
    if (typeof prompt === 'string' && prompt.length > 2000) {
      throw new Error('Prompt too long (max 2000 characters)');
    }

    const result = await this.searchEngine.fetch(url, prompt);

    return {
      success: true,
      command: 'fetch',
      ...result
    };
  }

  /**
   * 获取 Skill 信息
   */
  getInfo() {
    return {
      name: 'gemini-search',
      version: '1.0.0',
      description: '使用 Gemini API 进行网络搜索和网页内容获取',
      commands: ['search', 'fetch'],
      initialized: this.initialized
    };
  }
}

// 导出 skill 实例
const skill = new GeminiSearchSkill();

// 命令行接口
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  
  // 显示帮助信息
  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log('Gemini Search Skill - 命令行工具');
    console.log('');
    console.log('Usage:');
    console.log('  node index.js search "<query>" [options]');
    console.log('  node index.js fetch "<url>" [prompt]');
    console.log('');
    console.log('Commands:');
    console.log('  search    使用 Google 搜索网络内容');
    console.log('  fetch     获取并分析网页内容');
    console.log('');
    console.log('Options:');
    console.log('  --num <number>    搜索结果数量 (1-100, 默认: 10)');
    console.log('  --time <range>    搜索时间范围 (如: 1d, 1w, 1m)');
    console.log('');
    console.log('Environment variables:');
    console.log('  GEMINI_BASE_URL   - OpenAI 兼容 API 的基础 URL');
    console.log('  GEMINI_API_KEY    - Gemini API 密钥');
    console.log('');
    console.log('Examples:');
    console.log('  node index.js search "人工智能最新发展" --num 5');
    console.log('  node index.js fetch "https://example.com" "总结主要内容"');
    process.exit(0);
  }

  // 显示版本信息
  if (args[0] === '--version' || args[0] === '-v') {
    console.log('Gemini Search Skill v1.0.0');
    process.exit(0);
  }

  const command = args[0];
  const params = {};

  try {
    if (command === 'search') {
      if (!args[1]) {
        throw new Error('Search query is required');
      }
      params.query = args[1];
      
      // 解析 --num 参数
      if (args.includes('--num')) {
        const numIndex = args.indexOf('--num');
        const numValue = parseInt(args[numIndex + 1]);
        if (isNaN(numValue) || numValue < 1 || numValue > 100) {
          throw new Error('--num must be a number between 1 and 100');
        }
        params.numResults = numValue;
      }
      
      // 解析 --time 参数
      if (args.includes('--time')) {
        const timeIndex = args.indexOf('--time');
        if (args[timeIndex + 1] && !args[timeIndex + 1].startsWith('--')) {
          params.timeRange = args[timeIndex + 1];
        }
      }
    } else if (command === 'fetch') {
      if (!args[1]) {
        throw new Error('URL is required for fetch');
      }
      params.url = args[1];
      
      // 可选的 prompt 参数
      if (args[2]) {
        params.prompt = args[2];
      }
    } else {
      throw new Error(`Unknown command: ${command}. Use --help for usage information.`);
    }

    skill.execute(command, params)
      .then(result => {
        console.log(JSON.stringify(result, null, 2));
      })
      .catch(error => {
        console.error('Error:', error.message);
        process.exit(1);
      });
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

export default skill;
export { GeminiSearchSkill };
