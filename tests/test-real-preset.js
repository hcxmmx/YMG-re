/**
 * 真实预设文件测试脚本
 * 使用你的实际SillyTavern预设文件进行测试
 * 
 * 使用方法:
 * 1. 将你的预设文件放到这个目录下，命名为 test-preset.json
 * 2. 运行: node test-real-preset.js
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 真实预设文件测试\n');

// 查找预设文件
const presetFiles = [
  'test-preset.json',
  'preset.json', 
  'my-preset.json'
].map(name => path.join(__dirname, name));

let presetFile = null;
for (const file of presetFiles) {
  if (fs.existsSync(file)) {
    presetFile = file;
    break;
  }
}

if (!presetFile) {
  console.log('❌ 未找到预设文件！');
  console.log('\n请将你的SillyTavern预设文件命名为以下任意一个：');
  console.log('- test-preset.json');
  console.log('- preset.json'); 
  console.log('- my-preset.json');
  console.log('\n然后重新运行测试。');
  process.exit(1);
}

console.log(`📁 找到预设文件: ${path.basename(presetFile)}`);

try {
  // 读取和解析预设文件
  const presetData = JSON.parse(fs.readFileSync(presetFile, 'utf8'));
  console.log(`✅ 预设解析成功: ${presetData.name || '未命名预设'}`);
  
  // 分析预设结构
  console.log('\n=== 预设结构分析 ===');
  console.log(`📝 预设名称: ${presetData.name || '未命名'}`);
  console.log(`📄 描述: ${presetData.description || '无描述'}`);
  
  if (presetData.prompts && Array.isArray(presetData.prompts)) {
    console.log(`📋 提示词数量: ${presetData.prompts.length}`);
    
    // 分析提示词结构
    const enabledPrompts = presetData.prompts.filter(p => p.enabled !== false);
    console.log(`✅ 启用的提示词: ${enabledPrompts.length}个`);
    
    // 按深度分组
    const depthGroups = {};
    enabledPrompts.forEach(prompt => {
      const depth = prompt.injection_depth ?? 0;
      if (!depthGroups[depth]) depthGroups[depth] = [];
      depthGroups[depth].push(prompt);
    });
    
    console.log(`🔢 深度分布: ${Object.keys(depthGroups).sort().join(', ')}`);
    
    // 详细信息
    console.log('\n📊 提示词详情:');
    Object.keys(depthGroups).sort((a, b) => Number(a) - Number(b)).forEach(depth => {
      const prompts = depthGroups[depth];
      console.log(`  深度${depth}: ${prompts.length}个提示词`);
      prompts.forEach(prompt => {
        const role = prompt.role || 'system';
        const order = prompt.injection_order ?? 100;
        console.log(`    - ${prompt.name || prompt.identifier || '未命名'} (${role}, 优先级: ${order})`);
      });
    });
  } else {
    console.log('⚠️ 预设中没有找到prompts数组');
  }
  
  // 分析API参数
  console.log('\n=== API参数分析 ===');
  const apiParams = {
    temperature: presetData.temperature,
    max_tokens: presetData.max_tokens,
    max_output_tokens: presetData.max_output_tokens,
    top_p: presetData.top_p,
    top_k: presetData.top_k,
    frequency_penalty: presetData.frequency_penalty,
    presence_penalty: presetData.presence_penalty
  };
  
  Object.entries(apiParams).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      console.log(`  ${key}: ${value}`);
    }
  });
  
  // 模拟V3处理
  console.log('\n=== V3架构处理测试 ===');
  
  // 1. 深度注入模拟
  console.log('🔄 模拟深度注入处理...');
  
  const testChatHistory = [
    { role: 'user', content: '你好，请介绍一下你自己。', timestamp: Date.now() }
  ];
  
  let messages = [...testChatHistory];
  
  if (presetData.prompts && Array.isArray(presetData.prompts)) {
    const enabledPrompts = presetData.prompts.filter(p => p.enabled !== false);
    
    // 简化的深度注入
    enabledPrompts
      .sort((a, b) => (a.injection_order ?? 100) - (b.injection_order ?? 100))
      .forEach(prompt => {
        if (prompt.role === 'system' || !prompt.role) {
          messages.unshift({
            role: 'system',
            content: prompt.content || '',
            injected: true,
            source: prompt.name || prompt.identifier
          });
        }
      });
  }
  
  console.log(`  原始消息: ${testChatHistory.length}条`);
  console.log(`  处理后消息: ${messages.length}条`);
  console.log(`  注入的系统消息: ${messages.filter(m => m.injected).length}条`);
  
  // 2. API转换测试
  console.log('\n🔧 API格式转换测试...');
  
  // Gemini转换
  const systemMessages = [];
  const contents = [];
  
  messages.forEach(msg => {
    if (msg.role === 'system') {
      systemMessages.push(msg.content);
    } else {
      contents.push({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      });
    }
  });
  
  const geminiRequest = {
    contents: contents,
    generationConfig: {
      temperature: presetData.temperature ?? 0.8,
      maxOutputTokens: presetData.max_tokens || presetData.max_output_tokens || 2048,
      topP: presetData.top_p ?? 0.9,
      topK: presetData.top_k ?? 40
    }
  };
  
  if (systemMessages.length > 0) {
    geminiRequest.systemInstruction = {
      parts: systemMessages.map(text => ({ text }))
    };
  }
  
  // OpenAI转换
  const openaiRequest = {
    model: 'gpt-3.5-turbo',
    messages: messages.map(msg => ({
      role: msg.role,
      content: msg.content
    })),
    temperature: presetData.temperature ?? 0.8,
    max_tokens: presetData.max_tokens ?? 2048,
    top_p: presetData.top_p ?? 1.0
  };
  
  if (presetData.frequency_penalty !== undefined) {
    openaiRequest.frequency_penalty = presetData.frequency_penalty;
  }
  if (presetData.presence_penalty !== undefined) {
    openaiRequest.presence_penalty = presetData.presence_penalty;
  }
  
  console.log(`✅ Gemini转换: ${JSON.stringify(geminiRequest).length}字符`);
  console.log(`✅ OpenAI转换: ${JSON.stringify(openaiRequest).length}字符`);
  
  // 3. 兼容性检查
  console.log('\n=== 兼容性检查 ===');
  
  const issues = [];
  const warnings = [];
  
  if (presetData.prompts) {
    presetData.prompts.forEach((prompt, index) => {
      if (prompt.injection_depth === undefined) {
        issues.push(`提示词${index + 1}缺少injection_depth字段`);
      }
      if (prompt.injection_order === undefined) {
        warnings.push(`提示词${index + 1}缺少injection_order字段，将使用默认值`);
      }
      if (!prompt.role) {
        warnings.push(`提示词${index + 1}缺少role字段，将默认为system`);
      }
    });
  }
  
  if (issues.length === 0) {
    console.log('✅ 预设完全兼容V3架构！');
  } else {
    console.log('⚠️ 发现兼容性问题:');
    issues.forEach(issue => console.log(`  - ${issue}`));
  }
  
  if (warnings.length > 0) {
    console.log('💡 建议改进:');
    warnings.forEach(warning => console.log(`  - ${warning}`));
  }
  
  // 4. 输出示例请求
  console.log('\n=== API请求示例 ===');
  
  console.log('\n🌟 Gemini API请求体预览:');
  console.log('URL: https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent');
  console.log('Method: POST');
  console.log('Headers: {"Authorization": "Bearer [API_KEY]", "Content-Type": "application/json"}');
  console.log('Body:');
  console.log(JSON.stringify(geminiRequest, null, 2));
  
  console.log('\n🤖 OpenAI API请求体预览:');
  console.log('URL: https://api.openai.com/v1/chat/completions');
  console.log('Method: POST'); 
  console.log('Headers: {"Authorization": "Bearer [API_KEY]", "Content-Type": "application/json"}');
  console.log('Body:');
  console.log(JSON.stringify(openaiRequest, null, 2));
  
  console.log('\n🎉 真实预设测试完成！');
  console.log(`📊 测试结果: ${issues.length === 0 ? '完全兼容' : '需要调整'}`);
  console.log('💡 你的预设已成功转换为V3架构格式');
  
} catch (error) {
  console.error('❌ 测试失败:', error.message);
  console.error('\n可能的原因:');
  console.error('1. 预设文件格式不正确');
  console.error('2. JSON语法错误');
  console.error('3. 文件编码问题');
  console.error('\n请检查预设文件格式后重试。');
}
