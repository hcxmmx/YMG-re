import { VariableDataType } from '@/component/variable_manager/types';

/**
 * 变量管理器通用工具类
 */
export class VariableManagerUtil {
  /**
   * 从值推断变量数据类型
   * @param value 要推断类型的值
   * @returns 推断出的变量数据类型
   */
  public static inferDataType(value: any): VariableDataType {
    if (Array.isArray(value)) {
      return 'array';
    } else if (typeof value === 'boolean') {
      return 'boolean';
    } else if (typeof value === 'number') {
      return 'number';
    } else if (typeof value === 'object' && value !== null) {
      return 'object';
    }
    return 'string';
  }

  /**
   * 获取数据类型的默认值
   * @param dataType 数据类型
   * @returns 默认值
   */
  public static getDefaultValueForType(dataType: VariableDataType): any {
    switch (dataType) {
      case 'string':
        return '';
      case 'number':
        return 0;
      case 'boolean':
        return false;
      case 'array':
        return [];
      case 'object':
        return {};
      default:
        return '';
    }
  }

  /**
   * 生成唯一的键名
   * @param existingKeys 已存在的键名集合
   * @param baseName 基础键名，默认为 'newKey'
   * @returns 唯一键名
   */
  public static generateUniqueKey(existingKeys: Set<string>, baseName: string = 'newKey'): string {
    let newKey = baseName;
    let counter = 1;
    while (existingKeys.has(newKey)) {
      newKey = `${baseName}${counter}`;
      counter++;
    }
    return newKey;
  }
}
