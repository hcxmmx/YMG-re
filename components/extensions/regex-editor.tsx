"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { RegexScript } from "@/lib/regexUtils";
import { generateId } from "@/lib/utils";
import { usePlayerStore, useChatStore, useRegexFolderStore } from "@/lib/store";
import { Character, RegexFolder } from "@/lib/types";

interface RegexEditorProps {
  script?: RegexScript;
  onSave: (script: RegexScript) => void;
  onCancel: () => void;
}

export function RegexEditor({ script, onSave, onCancel }: RegexEditorProps) {
  // 获取当前玩家和角色名称用于测试
  const { players, currentPlayerId } = usePlayerStore();
  const currentPlayer = players.find(player => player.id === currentPlayerId);
  
  // 获取角色列表用于局部正则关联
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loadingCharacters, setLoadingCharacters] = useState<boolean>(false);
  
  // 获取文件夹列表
  const { folders, loadFolders } = useRegexFolderStore();
  
  // 加载角色数据
  useEffect(() => {
    const loadCharacters = async () => {
      setLoadingCharacters(true);
      try {
        // 从lib/storage中直接获取角色数据
        const { characterStorage } = await import('@/lib/storage');
        const chars = await characterStorage.listCharacters();
        setCharacters(chars);
      } catch (error) {
        console.error('加载角色列表失败:', error);
      } finally {
        setLoadingCharacters(false);
      }
    };

    loadCharacters();
    loadFolders();
  }, [loadFolders]);
  
  // 编辑状态
  const [editScript, setEditScript] = useState<RegexScript>(() => {
    if (script) return { ...script };
    
    // 创建新脚本的默认值
    return {
      id: generateId(),
      scriptName: "新正则脚本",
      findRegex: "",
      replaceString: "",
      trimStrings: [],
      placement: [2], // 默认应用于AI响应
      disabled: false,
      markdownOnly: false,
      promptOnly: true,
      runOnEdit: true,
      substituteRegex: 0,
      minDepth: null,
      maxDepth: null,
      scope: 'global', // 默认为全局作用域
      characterIds: [],
      folderId: 'default' // 默认文件夹
    };
  });
  
  // 测试状态
  const [testMode, setTestMode] = useState(false);
  const [testInput, setTestInput] = useState("");
  const [testOutput, setTestOutput] = useState("");
  const [playerName, setPlayerName] = useState(currentPlayer?.name || "用户");
  const [charName, setCharName] = useState("助手");
  
  // 修剪字符串（以换行符分隔）
  const [trimInput, setTrimInput] = useState(() => {
    return editScript.trimStrings?.join("\n") || "";
  });
  
  // 处理字段变更
  const handleChange = (field: keyof RegexScript, value: any) => {
    setEditScript(prev => ({ ...prev, [field]: value }));
  };
  
  // 处理修剪字符串变更
  const handleTrimChange = (value: string) => {
    setTrimInput(value);
    const trimArray = value.split("\n").filter(line => line.trim() !== "");
    handleChange("trimStrings", trimArray);
  };
  
  // 处理应用位置变更
  const handlePlacementChange = (position: number, checked: boolean) => {
    let newPlacement = [...editScript.placement];
    
    if (checked) {
      // 添加位置
      if (!newPlacement.includes(position)) {
        newPlacement.push(position);
      }
    } else {
      // 移除位置
      newPlacement = newPlacement.filter(p => p !== position);
    }
    
    handleChange("placement", newPlacement);
  };

  // 处理作用域变更
  const handleScopeChange = (value: string) => {
    handleChange("scope", value as 'global' | 'character');
    
    // 如果切换到全局作用域，清空角色ID列表
    if (value === 'global') {
      handleChange("characterIds", []);
    }
  };
  
  // 处理角色选择变更
  const handleCharacterChange = (characterId: string, checked: boolean) => {
    let newCharacterIds = [...(editScript.characterIds || [])];
    
    if (checked) {
      // 添加角色ID
      if (!newCharacterIds.includes(characterId)) {
        newCharacterIds.push(characterId);
      }
    } else {
      // 移除角色ID
      newCharacterIds = newCharacterIds.filter(id => id !== characterId);
    }
    
    handleChange("characterIds", newCharacterIds);
  };
  
  // 运行测试
  const runTest = () => {
    try {
      // 从其中提取正则表达式
      let findRegexStr = editScript.findRegex;
      
      // 处理宏替换
      if (editScript.substituteRegex === 1) {
        findRegexStr = findRegexStr.replace(/\{\{user\}\}/g, playerName);
        findRegexStr = findRegexStr.replace(/\{\{char\}\}/g, charName);
      } else if (editScript.substituteRegex === 2) {
        let macroReplaced = findRegexStr.replace(/\{\{user\}\}/g, playerName);
        macroReplaced = macroReplaced.replace(/\{\{char\}\}/g, charName);
        findRegexStr = macroReplaced.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      }
      
      // 提取正则表达式标志
      let flags = '';
      let patternString = findRegexStr;
      
      // 检查是否包含 /pattern/flags 格式
      const regexMatch = findRegexStr.match(/^\/(.+)\/([gimsu]*)$/);
      if (regexMatch) {
        patternString = regexMatch[1];
        flags = regexMatch[2];
      }
      
      // 创建正则表达式对象
      const regex = new RegExp(patternString, flags);
      
      // 应用替换
      let replacementStr = editScript.replaceString;
      
      // 处理修剪字符串
      if (editScript.trimStrings && editScript.trimStrings.length > 0) {
        for (const trim of editScript.trimStrings) {
          if (trim.trim() !== "") {
            const trimRegex = new RegExp(trim, 'g');
            replacementStr = replacementStr.replace(trimRegex, '');
          }
        }
      }
      
      // 替换匹配项
      const processed = testInput.replace(regex, (match, ...args) => {
        // 处理捕获组
        let result = replacementStr;
        
        // 替换 {{match}} 为完整匹配
        result = result.replace(/\{\{match\}\}/g, match);
        
        // 替换捕获组变量 $1, $2 等
        for (let i = 0; i < args.length - 2; i++) {
          if (args[i] !== undefined) {
            const capturegroupVar = new RegExp('\\$' + (i + 1), 'g');
            result = result.replace(capturegroupVar, args[i]);
          }
        }
        
        return result;
      });
      
      setTestOutput(processed);
    } catch (error) {
      console.error("测试正则表达式失败:", error);
      setTestOutput(`错误: ${(error as Error).message}`);
    }
  };
  
  // 当测试输入改变时自动运行测试
  useEffect(() => {
    if (testMode && testInput) {
      runTest();
    }
  }, [testInput, testMode, editScript.findRegex, editScript.replaceString, trimInput, editScript.substituteRegex]);
  
  return (
    <div className="w-full">
      <div className="flex justify-between mb-4">
        <Button 
          variant="outline"
          onClick={onCancel}
        >
          取消
        </Button>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => setTestMode(!testMode)}
          >
            {testMode ? "关闭测试" : "测试模式"}
          </Button>
          <Button 
            onClick={() => onSave(editScript)}
          >
            保存
          </Button>
        </div>
      </div>
      
      {testMode && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>测试模式</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="testInput">输入文本</Label>
                <Textarea 
                  id="testInput"
                  value={testInput}
                  onChange={(e) => setTestInput(e.target.value)}
                  className="h-32"
                  placeholder="在此输入测试文本..."
                />
              </div>
              <div>
                <Label htmlFor="testOutput">处理结果</Label>
                <Textarea 
                  id="testOutput"
                  value={testOutput}
                  readOnly
                  className="h-32 bg-muted"
                />
              </div>
              <div className="flex gap-4 items-center">
                <div className="flex flex-col gap-1 w-1/2">
                  <Label htmlFor="playerName">玩家名称 ({'{{user}}'})</Label>
                  <Input 
                    id="playerName"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1 w-1/2">
                  <Label htmlFor="charName">角色名称 ({'{{char}}'})</Label>
                  <Input 
                    id="charName"
                    value={charName}
                    onChange={(e) => setCharName(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      <div className="space-y-6">
        {/* 基本设置 */}
        <div className="space-y-4">
          <div>
            <Label htmlFor="scriptName">脚本名称</Label>
            <Input 
              id="scriptName"
              value={editScript.scriptName}
              onChange={(e) => handleChange("scriptName", e.target.value)}
              placeholder="输入脚本名称"
            />
          </div>
          
          <div>
            <Label htmlFor="findRegex">查找正则表达式</Label>
            <Textarea 
              id="findRegex"
              value={editScript.findRegex}
              onChange={(e) => handleChange("findRegex", e.target.value)}
              placeholder="输入要匹配的正则表达式"
            />
            <p className="text-xs text-muted-foreground mt-1">
              使用JavaScript正则表达式语法，如果需要标志可以使用 /pattern/flags 格式
            </p>
          </div>
          
          <div>
            <Label htmlFor="replaceString">替换为</Label>
            <Textarea 
              id="replaceString"
              value={editScript.replaceString}
              onChange={(e) => handleChange("replaceString", e.target.value)}
              placeholder="输入替换内容"
            />
            <p className="text-xs text-muted-foreground mt-1">
              使用 {'{{match}}'} 表示匹配的全文，使用 $1, $2 等表示捕获组
            </p>
          </div>
          
          <div>
            <Label htmlFor="trimStrings">裁剪字符串</Label>
            <Textarea 
              id="trimStrings"
              value={trimInput}
              onChange={(e) => handleTrimChange(e.target.value)}
              placeholder="每行输入一个需要从匹配结果中裁剪的字符串"
            />
            <p className="text-xs text-muted-foreground mt-1">
              在应用替换前从匹配文本中移除的字符串，每行一个
            </p>
          </div>
        </div>

        {/* 文件夹设置 */}
        <div className="space-y-2">
          <Label htmlFor="folderId">所属文件夹</Label>
          <Select
            value={editScript.folderId || 'default'}
            onValueChange={(value) => handleChange("folderId", value)}
          >
            <SelectTrigger id="folderId" className="w-full">
              <SelectValue placeholder="选择文件夹" />
            </SelectTrigger>
            <SelectContent>
              {folders.map((folder) => (
                <SelectItem key={folder.id} value={folder.id}>
                  {folder.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground mt-1">
            选择此正则脚本所属的文件夹
          </p>
        </div>

        {/* 作用域设置 */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium">作用域</h3>
          <RadioGroup
            value={editScript.scope || 'global'}
            onValueChange={handleScopeChange}
            className="flex flex-col space-y-2"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="global" id="scope-global" />
              <Label htmlFor="scope-global">全局 (应用于所有角色)</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="character" id="scope-character" />
              <Label htmlFor="scope-character">局部 (仅应用于指定角色)</Label>
            </div>
          </RadioGroup>
          
          {/* 当选择"局部"作用域时，显示角色选择 */}
          {editScript.scope === 'character' && (
            <div className="mt-4 border rounded-md p-4">
              <h4 className="text-sm font-medium mb-2">选择应用的角色</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                {loadingCharacters ? (
                  <p className="text-sm text-muted-foreground">加载角色中...</p>
                ) : characters.length === 0 ? (
                  <p className="text-sm text-muted-foreground">暂无角色可选择</p>
                ) : (
                  characters.map((character) => (
                    <div key={character.id} className="flex items-center space-x-2">
                      <Checkbox 
                        id={`char-${character.id}`}
                        checked={(editScript.characterIds || []).includes(character.id)}
                        onCheckedChange={(checked) => handleCharacterChange(character.id, checked === true)}
                      />
                      <Label htmlFor={`char-${character.id}`} className="truncate">
                        {character.name}
                      </Label>
                    </div>
                  ))
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {(editScript.characterIds || []).length === 0 
                  ? "未选择角色，该正则将不会应用于任何角色" 
                  : `已选择 ${(editScript.characterIds || []).length} 个角色`}
              </p>
            </div>
          )}
        </div>
        
        {/* 应用位置 */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium">应用位置</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="affectUserInput"
                checked={editScript.placement.includes(1)}
                onCheckedChange={(checked) => handlePlacementChange(1, checked === true)}
              />
              <Label htmlFor="affectUserInput">用户输入</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="affectAIResponse"
                checked={editScript.placement.includes(2)}
                onCheckedChange={(checked) => handlePlacementChange(2, checked === true)}
              />
              <Label htmlFor="affectAIResponse">AI回复</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="affectCommands"
                checked={editScript.placement.includes(3)}
                onCheckedChange={(checked) => handlePlacementChange(3, checked === true)}
              />
              <Label htmlFor="affectCommands">命令</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="affectPrompts"
                checked={editScript.placement.includes(4)}
                onCheckedChange={(checked) => handlePlacementChange(4, checked === true)}
              />
              <Label htmlFor="affectPrompts">提示词</Label>
            </div>
          </div>
        </div>
        
        {/* 其他选项 */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="disabled">禁用</Label>
            <Switch 
              id="disabled"
              checked={editScript.disabled}
              onCheckedChange={(checked) => handleChange("disabled", checked)}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <Label htmlFor="markdownOnly">仅显示效果</Label>
            <Switch 
              id="markdownOnly"
              checked={editScript.markdownOnly}
              onCheckedChange={(checked) => handleChange("markdownOnly", checked)}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <Label htmlFor="promptOnly">仅提示词效果</Label>
            <Switch 
              id="promptOnly"
              checked={editScript.promptOnly}
              onCheckedChange={(checked) => handleChange("promptOnly", checked)}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <Label htmlFor="runOnEdit">编辑时运行</Label>
            <Switch 
              id="runOnEdit"
              checked={editScript.runOnEdit}
              onCheckedChange={(checked) => handleChange("runOnEdit", checked)}
            />
          </div>
          
          <div>
            <Label htmlFor="substituteRegex">正则表达式中的宏</Label>
            <Select
              value={editScript.substituteRegex.toString()}
              onValueChange={(value) => handleChange("substituteRegex", parseInt(value))}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="选择宏处理方式" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">不替换</SelectItem>
                <SelectItem value="1">原始替换</SelectItem>
                <SelectItem value="2">转义替换</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* 深度设置 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="minDepth">最小深度</Label>
              <Input 
                id="minDepth"
                type="number"
                value={editScript.minDepth?.toString() || ""}
                onChange={(e) => {
                  const val = e.target.value ? parseInt(e.target.value) : null;
                  handleChange("minDepth", val);
                }}
                placeholder="不限"
              />
            </div>
            <div>
              <Label htmlFor="maxDepth">最大深度</Label>
              <Input 
                id="maxDepth"
                type="number"
                value={editScript.maxDepth?.toString() || ""}
                onChange={(e) => {
                  const val = e.target.value ? parseInt(e.target.value) : null;
                  handleChange("maxDepth", val);
                }}
                placeholder="不限"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 