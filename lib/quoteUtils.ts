/**
 * 引号高亮处理工具
 * 用于处理文本中的引号内容，实现高亮效果
 */

// 支持的引号类型
const QUOTES = {
  // 英文直引号
  STRAIGHT_DOUBLE_QUOTE: '"', // U+0022
  // 英文弯引号（左右）
  LEFT_DOUBLE_QUOTE: '"', // U+201C
  RIGHT_DOUBLE_QUOTE: '"', // U+201D
  // 中文弯引号（左右）
  CHINESE_LEFT_DOUBLE_QUOTE: '"', // U+201C
  CHINESE_RIGHT_DOUBLE_QUOTE: '"', // U+201D
  // 英文单引号
  STRAIGHT_SINGLE_QUOTE: "'", // U+0027
  LEFT_SINGLE_QUOTE: "'", // U+2018
  RIGHT_SINGLE_QUOTE: "'", // U+2019
  // 中文单引号
  CHINESE_LEFT_SINGLE_QUOTE: "'", // U+2018
  CHINESE_RIGHT_SINGLE_QUOTE: "'", // U+2019
};

// 文本段类型定义
export type TextSegment = {
  type: 'text' | 'openQuote' | 'quotedText' | 'closeQuote';
  content: string;
};

/**
 * 检查字符是否为起始引号
 * @param {string} char - 要检查的字符
 * @returns {boolean} - 是否为起始引号
 */
const isOpenQuote = (char: string): boolean => {
  return (
    char === QUOTES.STRAIGHT_DOUBLE_QUOTE ||
    char === QUOTES.LEFT_DOUBLE_QUOTE ||
    char === QUOTES.CHINESE_LEFT_DOUBLE_QUOTE ||
    char === QUOTES.STRAIGHT_SINGLE_QUOTE ||
    char === QUOTES.LEFT_SINGLE_QUOTE ||
    char === QUOTES.CHINESE_LEFT_SINGLE_QUOTE
  );
};

/**
 * 检查字符是否为结束引号
 * @param {string} char - 要检查的字符
 * @returns {boolean} - 是否为结束引号
 */
const isCloseQuote = (char: string): boolean => {
  return (
    char === QUOTES.STRAIGHT_DOUBLE_QUOTE ||
    char === QUOTES.RIGHT_DOUBLE_QUOTE ||
    char === QUOTES.CHINESE_RIGHT_DOUBLE_QUOTE ||
    char === QUOTES.STRAIGHT_SINGLE_QUOTE ||
    char === QUOTES.RIGHT_SINGLE_QUOTE ||
    char === QUOTES.CHINESE_RIGHT_SINGLE_QUOTE
  );
};

/**
 * 获取配对的结束引号
 * @param {string} openQuote - 起始引号
 * @returns {string} - 对应的结束引号
 */
const getMatchingCloseQuote = (openQuote: string): string | null => {
  if (openQuote === QUOTES.STRAIGHT_DOUBLE_QUOTE) {
    return QUOTES.STRAIGHT_DOUBLE_QUOTE;
  }
  if (openQuote === QUOTES.LEFT_DOUBLE_QUOTE) {
    return QUOTES.RIGHT_DOUBLE_QUOTE;
  }
  if (openQuote === QUOTES.CHINESE_LEFT_DOUBLE_QUOTE) {
    return QUOTES.CHINESE_RIGHT_DOUBLE_QUOTE;
  }
  if (openQuote === QUOTES.STRAIGHT_SINGLE_QUOTE) {
    return QUOTES.STRAIGHT_SINGLE_QUOTE;
  }
  if (openQuote === QUOTES.LEFT_SINGLE_QUOTE) {
    return QUOTES.RIGHT_SINGLE_QUOTE;
  }
  if (openQuote === QUOTES.CHINESE_LEFT_SINGLE_QUOTE) {
    return QUOTES.CHINESE_RIGHT_SINGLE_QUOTE;
  }
  return null;
};

/**
 * 解析文本，查找引号和引号内容
 * @param {string} text - 要解析的文本
 * @returns {Array<TextSegment>} - 解析结果数组，包含引号和引号内容的标记
 */
export const parseTextWithQuotes = (text: string): TextSegment[] => {
  if (!text) return [];
  
  const segments: TextSegment[] = [];
  let currentText = '';
  let inQuote = false;
  let openQuote: string | null = null;
  let expectedCloseQuote: string | null = null;
  
  // 调试输出
  console.log("解析文本:", text);
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    
    // 如果不在引号内部，检查是否遇到起始引号
    if (!inQuote && isOpenQuote(char)) {
      // 添加引号前的文本
      if (currentText) {
        segments.push({ type: 'text', content: currentText });
        currentText = '';
      }
      
      // 开始一个引号
      inQuote = true;
      openQuote = char;
      expectedCloseQuote = getMatchingCloseQuote(char);
      segments.push({ type: 'openQuote', content: char });
    }
    // 如果在引号内部，检查是否遇到结束引号
    else if (inQuote && char === expectedCloseQuote) {
      // 添加引号内的文本
      if (currentText) {
        segments.push({ type: 'quotedText', content: currentText });
        currentText = '';
      }
      
      // 结束引号
      inQuote = false;
      segments.push({ type: 'closeQuote', content: char });
    }
    // 普通字符，添加到当前文本
    else {
      currentText += char;
    }
  }
  
  // 处理剩余的文本
  if (currentText) {
    segments.push({
      type: inQuote ? 'quotedText' : 'text',
      content: currentText
    });
  }
  
  // 调试输出
  console.log("解析结果:", segments);
  
  return segments;
};

/**
 * 检查是否启用引号高亮功能
 * @returns {boolean} - 是否启用
 */
export const isQuoteHighlightEnabled = (): boolean => {
  if (typeof localStorage === 'undefined') return true; // 默认启用
  return localStorage.getItem('enableQuoteHighlight') !== 'false';
};

/**
 * 获取引号高亮颜色
 * @returns {string} - 高亮颜色
 */
export const getQuoteHighlightColor = (): string => {
  if (typeof localStorage === 'undefined') return '#8b5cf6'; // 默认紫色
  return localStorage.getItem('quoteHighlightColor') || '#8b5cf6';
}; 