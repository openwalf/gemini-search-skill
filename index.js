import GeminiSearch from './search.js';

class GeminiSearchSkill {
  constructor() {
    this.baseUrl = process.env.GEMINI_BASE_URL;
    this.apiKey = process.env.GEMINI_API_KEY;
    this.searchEngine = null;
  }

  async initialize() {
    if (!this.baseUrl) {
      throw new Error('GEMINI_BASE_URL environment variable is not set');
    }
    if (!this.apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is not set');
    }
    this.searchEngine = new GeminiSearch(this.baseUrl, this.apiKey);
  }

  async execute(command, params) {
    if (!this.searchEngine) {
      await this.initialize();
    }

    switch (command) {
      case 'search':
        return await this.search(params);
      case 'fetch':
        return await this.fetch(params);
      default:
        throw new Error(`Unknown command: ${command}`);
    }
  }

  async search(params) {
    const { query, numResults = 10, timeRange } = params;
    
    if (!query) {
      throw new Error('Query parameter is required for search');
    }

    const results = await this.searchEngine.search(query, { 
      numResults, 
      timeRange 
    });

    return {
      success: true,
      command: 'search',
      query,
      results
    };
  }

  async fetch(params) {
    const { url, prompt = '' } = params;
    
    if (!url) {
      throw new Error('URL parameter is required for fetch');
    }

    const result = await this.searchEngine.fetch(url, prompt);

    return {
      success: true,
      command: 'fetch',
      ...result
    };
  }
}

// 导出skill实例
const skill = new GeminiSearchSkill();

// 命令行接口
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage:');
    console.log('  search "<query>" [options]');
    console.log('  fetch "<url>" [prompt]');
    console.log('');
    console.log('Environment variables:');
    console.log('  GEMINI_BASE_URL - Base URL for OpenAI-compatible API');
    console.log('  GEMINI_API_KEY - Your API key');
    process.exit(0);
  }

  const command = args[0];
  const params = {};

  if (command === 'search') {
    params.query = args[1];
    if (args.includes('--num')) {
      const numIndex = args.indexOf('--num');
      params.numResults = parseInt(args[numIndex + 1]) || 10;
    }
    if (args.includes('--time')) {
      const timeIndex = args.indexOf('--time');
      params.timeRange = args[timeIndex + 1];
    }
  } else if (command === 'fetch') {
    params.url = args[1];
    if (args[2]) {
      params.prompt = args[2];
    }
  }

  skill.execute(command, params)
    .then(result => {
      console.log(JSON.stringify(result, null, 2));
    })
    .catch(error => {
      console.error('Error:', error.message);
      process.exit(1);
    });
}

export default skill;
export { GeminiSearchSkill };