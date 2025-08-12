/**
 * 修复版真实预设文件测试脚本
 * 修复了消息合并和空内容处理问题
 * 
 * 使用方法:
 * 1. 将你的预设文件放到这个目录下，命名为 test-preset.json
 * 2. 运行: node test-real-preset-fixed.js
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 修复版真实预设文件测试\n');

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
    console.log(`📋 总提示词数量: ${presetData.prompts.length}`);
    
    // 应用SillyTavern的宽容处理逻辑
    const processedPrompts = presetData.prompts.map((prompt, index) => ({
      ...prompt,
      // 使用默认值，而不是报错
      injection_depth: prompt.injection_depth ?? 0,
      injection_order: prompt.injection_order ?? 100,
      role: prompt.role || 'system',
      enabled: prompt.enabled !== false
    }));
    
    // 过滤掉空内容的提示词（SillyTavern的做法）
    const validPrompts = processedPrompts.filter(p => 
      p.enabled && 
      p.content && 
      p.content.trim().length > 0
    );
    
    console.log(`✅ 有效提示词: ${validPrompts.length}个`);
    console.log(`🚫 已过滤空内容提示词: ${presetData.prompts.length - validPrompts.length}个`);
    
    // 按深度分组
    const depthGroups = {};
    validPrompts.forEach(prompt => {
      const depth = prompt.injection_depth;
      if (!depthGroups[depth]) depthGroups[depth] = [];
      depthGroups[depth].push(prompt);
    });
    
    console.log(`🔢 深度分布: ${Object.keys(depthGroups).sort().join(', ')}`);
    
    // 详细信息
    console.log('\n📊 有效提示词详情:');
    Object.keys(depthGroups).sort((a, b) => Number(a) - Number(b)).forEach(depth => {
      const prompts = depthGroups[depth];
      console.log(`  深度${depth}: ${prompts.length}个提示词`);
      prompts.forEach(prompt => {
        const role = prompt.role;
        const order = prompt.injection_order;
        const preview = prompt.content.substring(0, 50).replace(/\n/g, ' ');
        console.log(`    - ${prompt.name || prompt.identifier || '未命名'} (${role}, 优先级: ${order})`);
        const suffix = prompt.content.length > 50 ? '...' : '';
        console.log(`      内容预览: "${preview}${suffix}"`);
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
  
  let hasApiParams = false;
  Object.entries(apiParams).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      console.log(`  ${key}: ${value}`);
      hasApiParams = true;
    }
  });
  
  if (!hasApiParams) {
    console.log('  使用默认API参数');
  }
  
  // 模拟V3处理（修复版）
  console.log('\n=== V3架构处理测试（修复版）===');
  
  // 1. 改进的深度注入处理
  console.log('🔄 执行改进的深度注入处理...');
  
  const testChatHistory = [
    { role: 'user', content: '你好，请介绍一下你自己。', timestamp: Date.now() }
  ];
  
  let messages = [...testChatHistory];
  
  if (presetData.prompts && Array.isArray(presetData.prompts)) {
    // 应用改进的处理逻辑
    const processedPrompts = presetData.prompts.map(prompt => ({
      ...prompt,
      injection_depth: prompt.injection_depth ?? 0,
      injection_order: prompt.injection_order ?? 100,
      role: prompt.role || 'system',
      enabled: prompt.enabled !== false
    }));
    
    // 过滤有效提示词（关键修复：过滤空内容）
    const validPrompts = processedPrompts.filter(p => 
      p.enabled && 
      p.content && 
      p.content.trim().length > 0
    );
    
    console.log(`  处理前提示词: ${presetData.prompts.length}个`);
    console.log(`  过滤后有效提示词: ${validPrompts.length}个`);
    console.log(`  过滤掉空内容: ${presetData.prompts.length - validPrompts.length}个`);
    
    // 按深度和优先级排序
    validPrompts.sort((a, b) => {
      const depthDiff = a.injection_depth - b.injection_depth;
      if (depthDiff !== 0) return depthDiff;
      return a.injection_order - b.injection_order;
    });
    
    // 注入提示词到消息中
    validPrompts.forEach(prompt => {
      if (prompt.role === 'system' || prompt.role === 'user') {
        messages.unshift({
          role: prompt.role,
          content: prompt.content,
          injected: true,
          source: prompt.name || prompt.identifier,
          depth: prompt.injection_depth,
          order: prompt.injection_order
        });
      }
    });
    
    console.log(`  注入后总消息数: ${messages.length}`);
  }
  
  // 2. 关键修复：实现SillyTavern的消息合并逻辑
  console.log('\n🔧 执行消息合并（SillyTavern逻辑）...');
  
  const originalLength = messages.length;
  const mergedMessages = [];
  
  messages.forEach(message => {
    // 跳过空内容的消息
    if (!message.content || message.content.trim().length === 0) {
      console.log(`  跳过空内容消息: ${message.role}`);
      return;
    }
    
    // SillyTavern的合并逻辑：相同角色且内容不为空
    if (mergedMessages.length > 0 && 
        mergedMessages[mergedMessages.length - 1].role === message.role &&
        message.role !== 'tool') {
      
      // 合并内容，用双换行分隔
      mergedMessages[mergedMessages.length - 1].content += '\n\n' + message.content;
      console.log(`  合并${message.role}消息 (${message.content.substring(0, 30)}...)`);
    } else {
      // 新增消息
      mergedMessages.push({
        role: message.role,
        content: message.content
      });
      console.log(`  添加${message.role}消息 (${message.content.substring(0, 30)}...)`);
    }
  });
  
  console.log(`  合并前消息数: ${originalLength}`);
  console.log(`  合并后消息数: ${mergedMessages.length}`);
  console.log(`  合并效果: ${mergedMessages.map(m => m.role).join(' -> ')}`);
  
  // 3. API转换测试
  console.log('\n🔧 API格式转换测试...');
  
  // Gemini转换（使用合并后的消息）
  const systemMessages = [];
  const contents = [];
  
  mergedMessages.forEach(msg => {
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
    },
    safetySettings: [
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }
    ]
  };
  
  if (systemMessages.length > 0) {
    geminiRequest.systemInstruction = {
      parts: systemMessages.map(text => ({ text }))
    };
  }
  
  // OpenAI转换（使用合并后的消息）
  const openaiRequest = {
    model: 'gpt-3.5-turbo',
    messages: mergedMessages.map(msg => ({
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
  console.log(`   - SystemInstruction: ${systemMessages.length}条`);
  console.log(`   - Contents: ${contents.length}条`);
  
  console.log(`✅ OpenAI转换: ${JSON.stringify(openaiRequest).length}字符`);
  console.log(`   - 消息数: ${openaiRequest.messages.length}条`);
  console.log(`   - 角色分布: ${openaiRequest.messages.map(m => m.role).join(' -> ')}`);
  
  // 4. 改进的兼容性检查
  console.log('\n=== 改进的兼容性检查 ===');
  
  const realIssues = [];
  const suggestions = [];
  
  if (!presetData.prompts || presetData.prompts.length === 0) {
    realIssues.push('预设中没有提示词');
  } else {
    const emptyContentCount = presetData.prompts.filter(p => !p.content || p.content.trim().length === 0).length;
    if (emptyContentCount > 0) {
      suggestions.push(`有 ${emptyContentCount} 个提示词内容为空，已自动过滤`);
    }
    
    const missingDepthCount = presetData.prompts.filter(p => p.injection_depth === undefined).length;
    if (missingDepthCount > 0) {
      suggestions.push(`有 ${missingDepthCount} 个提示词缺少injection_depth字段，已使用默认值0`);
    }
    
    const missingOrderCount = presetData.prompts.filter(p => p.injection_order === undefined).length;
    if (missingOrderCount > 0) {
      suggestions.push(`有 ${missingOrderCount} 个提示词缺少injection_order字段，已使用默认值100`);
    }
    
    const missingRoleCount = presetData.prompts.filter(p => !p.role).length;
    if (missingRoleCount > 0) {
      suggestions.push(`有 ${missingRoleCount} 个提示词缺少role字段，已默认为system`);
    }
  }
  
  if (realIssues.length === 0) {
    console.log('✅ 预设与V3架构兼容！');
  } else {
    console.log('⚠️ 发现兼容性问题:');
    realIssues.forEach(issue => console.log(`  - ${issue}`));
  }
  
  if (suggestions.length > 0) {
    console.log('💡 处理信息:');
    suggestions.forEach(suggestion => console.log(`  - ${suggestion}`));
  }
  
  // 5. 对比展示
  console.log('\n=== 修复效果对比 ===');
  
  // 计算修复前可能的问题
  const potentialEmptyMessages = mergedMessages.filter(m => !m.content || m.content.trim().length === 0).length;
  const systemMessageCount = mergedMessages.filter(m => m.role === 'system').length;
  
  console.log('🔧 修复效果:');
  console.log(`  - 过滤空内容提示词: ${presetData.prompts ? presetData.prompts.length - (presetData.prompts.filter(p => p.content && p.content.trim()).length) : 0}个`);
  console.log(`  - 合并相同角色消息: ${originalLength} -> ${mergedMessages.length}条`);
  console.log(`  - 最终系统消息数: ${systemMessageCount}条（内容不为空）`);
  console.log(`  - 消息序列优化: ${mergedMessages.map(m => m.role).join(' -> ')}`);
  
  // 6. 输出最终请求体预览
  console.log('\n=== 最终API请求预览 ===');
  
  console.log('\n🤖 修复后的OpenAI请求体:');
  console.log('```json');
  console.log(JSON.stringify({
    model: openaiRequest.model,
    messages: openaiRequest.messages.map((msg, index) => ({
      role: msg.role,
      content: msg.content ? (msg.content.length > 100 ? msg.content.substring(0, 100) + '...' : msg.content) : ''
    })),
    temperature: openaiRequest.temperature,
    max_tokens: openaiRequest.max_tokens
  }, null, 2));
  console.log('```');
  
  console.log('\n🌟 修复后的Gemini请求体:');
  console.log('```json');
  console.log(JSON.stringify({
    contents: geminiRequest.contents.map(c => ({
      role: c.role,
      parts: [{ text: c.parts[0].text.length > 100 ? c.parts[0].text.substring(0, 100) + '...' : c.parts[0].text }]
    })),
    systemInstruction: geminiRequest.systemInstruction ? {
      parts: geminiRequest.systemInstruction.parts.map(p => ({ 
        text: p.text.length > 100 ? p.text.substring(0, 100) + '...' : p.text 
      }))
    } : undefined,
    generationConfig: geminiRequest.generationConfig
  }, null, 2));
  console.log('```');
  
  console.log('\n🎉 修复版测试完成！');
  console.log('📊 主要改进:');
  console.log('  ✅ 正确过滤空内容的提示词');
  console.log('  ✅ 实现SillyTavern的消息合并逻辑'); 
  console.log('  ✅ 宽容处理缺失字段（使用默认值）');
  console.log('  ✅ 生成清洁的API请求体');
  console.log(`📈 处理效率: 原始${presetData.prompts ? presetData.prompts.length : 0}个提示词 -> 有效${mergedMessages.length}条消息`);
  
} catch (error) {
  console.error('❌ 测试失败:', error.message);
  console.error('\n可能的原因:');
  console.error('1. 预设文件格式不正确');
  console.error('2. JSON语法错误');
  console.error('3. 文件编码问题');
  console.error('\n请检查预设文件格式后重试。');
}
