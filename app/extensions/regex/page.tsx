"use client";

import { useState, useEffect } from 'react';
import { useRegexStore, useRegexFolderStore, useCharacterStore } from '@/lib/store';
import { RegexEditor } from '@/components/extensions/regex-editor';
import { RegexList } from '@/components/extensions/regex-list';
import { FolderManagement } from '@/components/extensions/regex-folder-management';
import { BatchFolderActions } from '@/components/extensions/regex-batch-actions';
import { FolderBatchImport } from '@/components/extensions/regex-folder-import';
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
type ViewMode = 'all' | 'global' | 'character' | 'folder' | 'preset';

export default function RegexPage() {
  const [activeTab, setActiveTab] = useState<string>("list");
  const [editingScriptId, setEditingScriptId] = useState<string | null>(null);
  const [currentScript, setCurrentScript] = useState<RegexScript | undefined>(undefined);
  const [viewMode, setViewMode] = useState<ViewMode>('all');
  const [selectedFolderId, setSelectedFolderId] = useState<string>("all");
  const [selectedFolderType, setSelectedFolderType] = useState<"all" | "global" | "character">("all");
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
      case 'global':
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
        const globalFolderIds = folders
          .filter(folder => folder.type === 'global')
          .map(folder => folder.id);
        const characterFolderIds = folders
          .filter(folder => folder.type === 'character')
          .map(folder => folder.id);
          
        // 根据选择的文件夹类型筛选脚本
        if (selectedFolderType === 'global') {
          return scripts.filter(script => globalFolderIds.includes(script.folderId || 'default'));
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
      folderId: 'default'
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
    
    for (const file of files) {
      try {
        const script = await importScriptFromFile(file);
        
        if (script) {
          results.push({
            success: true,
            fileName: file.name,
            id: script.id,
            name: script.scriptName,
            message: `成功导入脚本: ${script.scriptName}`
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
      <h1 className="text-2xl font-bold mb-6">正则表达式</h1>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="list">脚本列表</TabsTrigger>
          <TabsTrigger value="folders">文件夹管理</TabsTrigger>
          <TabsTrigger value="edit" disabled={activeTab !== "edit"}>
            {editingScriptId ? "编辑脚本" : "新建脚本"}
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="list">
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
                    <SelectItem value="global">全局脚本</SelectItem>
                    <SelectItem value="character">角色脚本</SelectItem>
                    <SelectItem value="folder">按文件夹</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {viewMode === 'folder' && (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="folder-select">选择文件夹</Label>
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
                </div>
              )}
              
              {viewMode === 'folder' && selectedFolderId === "all" && (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="folder-type-select">文件夹类型</Label>
                  <Select 
                    value={selectedFolderType} 
                    onValueChange={(value) => setSelectedFolderType(value as "all" | "global" | "character")}
                  >
                    <SelectTrigger id="folder-type-select" className="w-[180px]">
                      <SelectValue placeholder="选择文件夹类型" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全部类型</SelectItem>
                      <SelectItem value="global">全局文件夹</SelectItem>
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
              <BatchFolderActions />
              <Button onClick={handleCreateNewScript}>新建脚本</Button>
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