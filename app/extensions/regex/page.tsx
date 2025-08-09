"use client";

import { useState, useEffect } from 'react';
import { useRegexStore, useRegexFolderStore, useCharacterStore } from '@/lib/store';
import { RegexEditor } from '@/components/extensions/regex-editor';
import { RegexList } from '@/components/extensions/regex-list';
import { FolderManagement } from '@/components/extensions/regex-folder-management';
import { SimpleBatchActions } from '@/components/extensions/regex-batch-actions-simple';
import { FolderBatchImport } from '@/components/extensions/regex-folder-import';
import { QuickFolderCreate } from '@/components/extensions/regex-quick-folder-create';
import { RegexHelpGuide } from '@/components/extensions/regex-help-guide';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RegexScript } from '@/lib/regexUtils';
import { BatchImport, ImportResult } from '@/components/ui/batch-import';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { RegexFolder } from '@/lib/types';
import { Button } from '@/components/ui/button';

// 视图类型定义
type ViewMode = 'all' | 'preset' | 'character' | 'folder';

export default function RegexPage() {
  const [activeTab, setActiveTab] = useState<string>("list");
  const [editingScriptId, setEditingScriptId] = useState<string | null>(null);
  const [currentScript, setCurrentScript] = useState<RegexScript | undefined>(undefined);
  const [viewMode, setViewMode] = useState<ViewMode>('all');
  const [selectedFolderId, setSelectedFolderId] = useState<string>("all");
  const [selectedFolderType, setSelectedFolderType] = useState<"all" | "preset" | "character">("all");
  const [selectedCharacterId, setSelectedCharacterId] = useState<string>("all");
  
  // 从 store 获取数据
  const { 
    scripts, 
    loadScripts,
    addScript,
    updateScript,
    deleteScript,
    toggleScriptEnabled,
    exportScriptToFile,
    importScriptFromFile,
    reorderScripts,
    getScript
  } = useRegexStore();
  
  const {
    folders,
    loadFolders
  } = useRegexFolderStore();
  
  const {
    characters,
    loadCharacters
  } = useCharacterStore();
  
  // 加载数据
  useEffect(() => {
    loadScripts();
    loadFolders();
    loadCharacters();
  }, [loadScripts, loadFolders, loadCharacters]);
  
  // 过滤脚本
  const filteredScripts = (() => {
    switch (viewMode) {
      case 'preset':
        return scripts.filter(script => script.scope === 'global' || !script.scope);
      case 'character':
        if (selectedCharacterId !== "all") {
          return scripts.filter(script => 
            script.scope === 'character' && 
            script.characterIds?.includes(selectedCharacterId)
          );
        }
        return scripts.filter(script => script.scope === 'character');
      case 'folder':
        if (selectedFolderId !== "all") {
          return scripts.filter(script => script.folderId === selectedFolderId);
        }
        // 如果是"全部文件夹"，则按文件夹类型筛选
        const presetFolderIds = folders
          .filter(folder => folder.type === 'preset')
          .map(folder => folder.id);
        const characterFolderIds = folders
          .filter(folder => folder.type === 'character')
          .map(folder => folder.id);
          
        // 根据选择的文件夹类型筛选脚本
        if (selectedFolderType === 'preset') {
          return scripts.filter(script => presetFolderIds.includes(script.folderId || 'default'));
        } else if (selectedFolderType === 'character') {
          return scripts.filter(script => characterFolderIds.includes(script.folderId || 'default'));
        }
        return scripts;
      case 'all':
      default:
        return scripts;
    }
  })();
  
  // 处理编辑
  const handleEditScript = (scriptId: string) => {
    const script = getScript(scriptId);
    if (script) {
      setCurrentScript({...script});
      setEditingScriptId(scriptId);
      setActiveTab("edit");
    }
  };
  
  // 处理创建新脚本
  const handleCreateNewScript = () => {
    // 智能确定目标文件夹
    const getTargetFolderId = () => {
      // 如果当前是按文件夹视图且选择了具体文件夹，创建到该文件夹
      if (viewMode === 'folder' && selectedFolderId !== "all") {
        return selectedFolderId;
      }
      // 其他情况创建到默认文件夹
      return 'default';
    };

    setCurrentScript({
      id: '',
      scriptName: '新脚本',
      findRegex: '',
      replaceString: '',
      trimStrings: [],
      placement: [1, 2],
      disabled: false,
      markdownOnly: false,
      promptOnly: false,
      runOnEdit: false,
      substituteRegex: 0,
      scope: 'global',
      folderId: getTargetFolderId()
    });
    setEditingScriptId(null);
    setActiveTab("edit");
  };
  
  // 处理保存脚本
  const handleSaveScript = async (script: RegexScript) => {
    try {
      if (editingScriptId) {
        await updateScript(editingScriptId, script);
      } else {
        await addScript(script);
      }
      setActiveTab("list");
    } catch (error) {
      console.error("保存脚本失败:", error);
      alert("保存脚本失败");
    }
  };
  
  // 处理脚本排序
  const handleReorderScripts = async (newScripts: RegexScript[]) => {
    await reorderScripts(newScripts);
  };
  
  // 处理取消编辑
  const handleCancelEdit = () => {
    setCurrentScript(undefined);
    setEditingScriptId(null);
    setActiveTab("list");
  };

  // 处理批量导入
  const handleBatchImport = async (files: File[]): Promise<ImportResult[]> => {
    const results: ImportResult[] = [];
    
    // 智能确定目标文件夹
    const getTargetFolderId = () => {
      // 如果当前是按文件夹视图且选择了具体文件夹，导入到该文件夹
      if (viewMode === 'folder' && selectedFolderId !== "all") {
        return selectedFolderId;
      }
      // 其他情况导入到默认文件夹
      return 'default';
    };

    const targetFolderId = getTargetFolderId();
    const targetFolder = folders.find(f => f.id === targetFolderId);
    const folderName = targetFolder?.name || '默认文件夹';
    
    for (const file of files) {
      try {
        const script = await importScriptFromFile(file);
        
        if (script) {
          // 设置脚本的文件夹ID
          script.folderId = targetFolderId;
          
          // 保存更新后的脚本
          await updateScript(script.id, script);
          
          results.push({
            success: true,
            fileName: file.name,
            id: script.id,
            name: script.scriptName,
            message: `成功导入脚本: ${script.scriptName} 至 ${folderName}`
          });
        } else {
          results.push({
            success: false,
            fileName: file.name,
            message: "无效的脚本文件"
          });
        }
      } catch (error) {
        console.error("导入脚本失败:", error);
        results.push({
          success: false,
          fileName: file.name,
          message: error instanceof Error ? error.message : "导入失败"
        });
      }
    }
    
    return results;
  };
  
  // 处理文件夹选择
  const handleFolderSelect = (folderId: string) => {
    setViewMode('folder');
    setSelectedFolderId(folderId || "all");
    setActiveTab('list');
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex items-center gap-2 mb-6">
        <h1 className="text-2xl font-bold">正则表达式</h1>
        <RegexHelpGuide />
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="list">脚本列表</TabsTrigger>
          <TabsTrigger value="folders">文件夹管理</TabsTrigger>
          <TabsTrigger value="edit" disabled={activeTab !== "edit"}>
            {editingScriptId ? "编辑脚本" : "新建脚本"}
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="list">
          {/* 当前上下文提示 */}
          {viewMode === 'folder' && selectedFolderId !== "all" && (
            <div className="mb-4 p-3 bg-primary/10 border border-primary/20 rounded-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-primary font-medium">当前文件夹：</span>
                  <span>{folders.find(f => f.id === selectedFolderId)?.name || '未知文件夹'}</span>
                  <span className="text-muted-foreground">
                    • 新建脚本和批量导入将自动保存到此文件夹
                  </span>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setActiveTab('folders')}
                  className="text-xs"
                >
                  返回文件夹管理
                </Button>
              </div>
            </div>
          )}
          
          {/* 新用户引导提示 */}
          {viewMode === 'folder' && selectedFolderId === "all" && folders.length <= 1 && (
            <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
              <div className="flex items-start gap-3">
                <div className="text-blue-500 mt-0.5">
                  💡
                </div>
                <div>
                  <h3 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                    开始使用正则表达式功能
                  </h3>
                  <p className="text-xs text-blue-800 dark:text-blue-200 mb-2">
                    建议为不同的预设创建专门的文件夹，这样可以自动管理正则脚本的启用状态。
                  </p>
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    👉 点击下方文件夹选择器旁的 <strong>+</strong> 按钮来创建你的第一个文件夹
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* 视图选择器和操作按钮 */}
          <div className="flex flex-wrap justify-between items-end gap-4 mb-4">
            <div className="flex flex-wrap gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="view-mode">视图模式</Label>
                <Select 
                  value={viewMode} 
                  onValueChange={(value) => setViewMode(value as ViewMode)}
                >
                  <SelectTrigger id="view-mode" className="w-[180px]">
                    <SelectValue placeholder="选择视图模式" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部脚本</SelectItem>
                    <SelectItem value="preset">预设脚本</SelectItem>
                    <SelectItem value="character">角色脚本</SelectItem>
                    <SelectItem value="folder">按文件夹</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {viewMode === 'folder' && (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="folder-select">选择文件夹</Label>
                  <div className="flex items-center">
                    <Select 
                      value={selectedFolderId} 
                      onValueChange={setSelectedFolderId}
                    >
                      <SelectTrigger id="folder-select" className="w-[180px]">
                        <SelectValue placeholder="选择文件夹" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">全部文件夹</SelectItem>
                        {folders.map(folder => (
                          <SelectItem key={folder.id} value={folder.id}>
                            {folder.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <QuickFolderCreate 
                      onFolderCreated={(folderId) => {
                        // 自动切换到新创建的文件夹
                        setSelectedFolderId(folderId);
                        // 重新加载文件夹列表
                        loadFolders();
                      }}
                    />
                  </div>
                </div>
              )}
              
              {viewMode === 'folder' && selectedFolderId === "all" && (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="folder-type-select">文件夹类型</Label>
                  <Select 
                    value={selectedFolderType} 
                    onValueChange={(value) => setSelectedFolderType(value as "all" | "preset" | "character")}
                  >
                    <SelectTrigger id="folder-type-select" className="w-[180px]">
                      <SelectValue placeholder="选择文件夹类型" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全部类型</SelectItem>
                      <SelectItem value="preset">预设文件夹</SelectItem>
                      <SelectItem value="character">角色文件夹</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              {viewMode === 'character' && (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="character-select">选择角色</Label>
                  <Select 
                    value={selectedCharacterId} 
                    onValueChange={setSelectedCharacterId}
                  >
                    <SelectTrigger id="character-select" className="w-[180px]">
                      <SelectValue placeholder="选择角色" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全部角色</SelectItem>
                      {characters.map(character => (
                        <SelectItem key={character.id} value={character.id}>
                          {character.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            
            <div className="flex gap-2">
              <SimpleBatchActions onComplete={() => loadScripts()} />
            </div>
          </div>
          
          <RegexList 
            scripts={filteredScripts}
            onEdit={handleEditScript}
            onDelete={async (id) => {
              try {
                await deleteScript(id);
              } catch (error) {
                console.error("删除脚本失败:", error);
                alert("删除脚本失败");
              }
            }}
            onToggleEnabled={async (id) => {
              try {
                await toggleScriptEnabled(id);
              } catch (error) {
                console.error("切换脚本状态失败:", error);
                alert("切换脚本状态失败");
              }
            }}
            onExport={async (id) => {
              try {
                await exportScriptToFile(id);
              } catch (error) {
                console.error("导出脚本失败:", error);
                alert("导出脚本失败");
              }
            }}
            batchImportComponent={
              <BatchImport
                onImport={handleBatchImport}
                accept=".json"
                buttonText="批量导入"
                variant="outline"
              />
            }
            onCreateNew={handleCreateNewScript}
            onReorder={handleReorderScripts}
          />
        </TabsContent>
        
        <TabsContent value="folders">
          <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">文件夹管理</h2>
            <div className="flex gap-2">
              <FolderBatchImport 
                onComplete={() => loadScripts()}
              />
            </div>
          </div>
          <FolderManagement onFolderSelect={handleFolderSelect} />
        </TabsContent>
        
        <TabsContent value="edit">
          <RegexEditor 
            script={currentScript}
            onSave={handleSaveScript}
            onCancel={handleCancelEdit}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
} 