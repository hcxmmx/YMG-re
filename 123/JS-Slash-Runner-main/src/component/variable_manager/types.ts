/**
 * 变量类型
 */
export type VariableType = 'global' | 'character' | 'chat' | 'message';

/**
 * 变量数据类型
 */
export type VariableDataType = 'array' | 'boolean' | 'number' | 'object' | 'string';

export interface TavernVariables {
  [variableName: string]: any;
}

export interface VariableItem {
  /** 变量名称 */
  name: string;
  /** 变量数据类型 */
  dataType: VariableDataType;
  /** 变量值(根据类型可以是不同的数据) */
  value: any;
  /** 变量唯一ID */
  id: string;
  /** 消息ID（仅用于message类型变量，标识变量属于哪个楼层） */
  message_id?: number;
}
