import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(input: string | number | Date): string {
  const date = new Date(input);
  return date.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function truncateString(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength) + "...";
}

// 从URL/DataURL中提取图像内容
export async function extractImageContent(url: string): Promise<string | null> {
  try {
    if (url.startsWith('data:')) {
      return url;
    }
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('提取图像内容时出错:', error);
    return null;
  }
}

// 生成唯一ID
export function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}

/**
 * 从PNG文件中提取角色卡数据
 * @param buffer PNG文件的ArrayBuffer数据
 * @returns 解析出的角色卡JSON字符串，如果未找到则返回null
 */
export function extractCharaDataFromPng(buffer: ArrayBuffer): string | null {
  try {
    const view = new DataView(buffer);

    // 检查PNG文件头
    const pngSignature = [137, 80, 78, 71, 13, 10, 26, 10]; // PNG文件头的十进制表示
    for (let i = 0; i < pngSignature.length; i++) {
      if (view.getUint8(i) !== pngSignature[i]) {
        return null; // 不是有效的PNG文件
      }
    }

    let offset = pngSignature.length;

    // 逐个读取PNG的数据块
    while (offset < view.byteLength) {
      const chunkLength = view.getUint32(offset); // 块长度
      offset += 4;

      const chunkType = String.fromCharCode(
        view.getUint8(offset),
        view.getUint8(offset + 1),
        view.getUint8(offset + 2),
        view.getUint8(offset + 3)
      );
      offset += 4;

      // 如果是tEXt块（文本元数据块）
      if (chunkType === 'tEXt') {
        const startOffset = offset;
        let keywordEnd = offset;

        // 查找关键字结束位置（null字节）
        while (view.getUint8(keywordEnd) !== 0 && keywordEnd < offset + chunkLength) {
          keywordEnd++;
        }

        // 提取关键字
        const keywordArray = new Uint8Array(buffer.slice(offset, keywordEnd));
        let keyword = '';
        for (let i = 0; i < keywordArray.length; i++) {
          keyword += String.fromCharCode(keywordArray[i]);
        }

        // 如果关键字是'chara'，那么这个块包含角色卡数据
        if (keyword === 'chara') {
          // 跳过null分隔符
          const textStart = keywordEnd + 1;
          const textLength = chunkLength - (textStart - startOffset);

          // 提取Base64编码的数据
          const textArray = new Uint8Array(buffer.slice(textStart, textStart + textLength));
          let encodedText = '';
          for (let i = 0; i < textArray.length; i++) {
            encodedText += String.fromCharCode(textArray[i]);
          }

          // 解码Base64
          try {
            // 使用更现代的方法处理Base64，确保Unicode字符正确解码
            const binaryString = atob(encodedText);
            const bytes = new Uint8Array(binaryString.length);

            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }

            // 使用TextDecoder正确解码UTF-8数据
            const decodedText = new TextDecoder('utf-8').decode(bytes);
            return decodedText; // 返回解码后的JSON字符串
          } catch (e) {
            console.error('解码Base64或UTF-8失败:', e);
            return null;
          }
        }
      }

      // 跳过当前块的数据和CRC校验码
      offset += chunkLength + 4;
    }

    return null; // 没有找到包含角色卡数据的块
  } catch (error) {
    console.error('提取PNG角色卡数据时出错:', error);
    return null;
  }
} 