"use client";

import { useState, useEffect } from 'react';
import { useRegexStore } from '@/lib/store';
import { RegexEditor } from '@/components/extensions/regex-editor';
import { RegexList } from '@/components/extensions/regex-list';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RegexScript } from '@/lib/regexUtils';
import { BatchImport, ImportResult } from '@/components/ui/batch-import';

export default function RegexPage() {
  const [activeTab, setActiveTab] = useState<string>("list");
  const [editingScriptId, setEditingScriptId] = useState<string | null>(null);
  const [currentScript, setCurrentScript] = useState<RegexScript | undefined>(undefined);
  
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
  
  // 加载脚本列表
  useEffect(() => {
    loadScripts();
  }, [loadScripts]);
  
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
      substituteRegex: 0
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

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">正则表达式</h1>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="list">脚本列表</TabsTrigger>
          <TabsTrigger value="edit" disabled={activeTab !== "edit"}>
            {editingScriptId ? "编辑脚本" : "新建脚本"}
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="list">
          <RegexList 
            scripts={scripts}
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