import skill from './index.js';

async function runExample() {
  try {
    console.log('=== Gemini Search Skill 示例 ===\n');
    
    // 初始化skill
    await skill.initialize();
    console.log('Skill 初始化成功\n');
    
    // 示例1: 搜索
    console.log('--- 示例1: 搜索 ---');
    const searchResult = await skill.execute('search', {
      query: '人工智能最新发展',
      numResults: 5
    });
    console.log(JSON.stringify(searchResult, null, 2));
    console.log('');
    
    // 示例2: 获取网页
    console.log('--- 示例2: 获取网页 ---');
    const fetchResult = await skill.execute('fetch', {
      url: 'https://example.com',
      prompt: '总结这个页面的主要内容'
    });
    console.log(JSON.stringify(fetchResult, null, 2));
    
  } catch (error) {
    console.error('示例运行失败:', error.message);
  }
}

runExample();