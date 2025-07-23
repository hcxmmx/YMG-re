"use client";

import { useState, useEffect, useRef } from "react";
import { RegexList } from "@/components/extensions/regex-list";
import { RegexEditor } from "@/components/extensions/regex-editor";
import { RegexScript } from "@/lib/regexUtils";
import { useRegexStore, usePlayerStore } from "@/lib/store";
import { generateId } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function RegexPage() {
  // 初始化标题
  useEffect(() => {
    document.title = "正则表达式 - AI角色扮演平台";
  }, []);

  // 获取状态
  const { 
    scripts,
    loadScripts,
    addScript,
    getScript,
    updateScript,
    deleteScript,
    importScriptFromFile,
    exportScriptToFile,
    toggleScriptEnabled,
    reorderScripts
  } = useRegexStore();
  
  // 状态
  const [editingScriptId, setEditingScriptId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("list");
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // 加载脚本
  useEffect(() => {
    loadScripts();
  }, [loadScripts]);
  
  // 获取当前编辑的脚本
  const currentScript = editingScriptId ? getScript(editingScriptId) : undefined;
  
  // 处理脚本编辑
  const handleEditScript = (scriptId: string) => {
    setEditingScriptId(scriptId);
    setActiveTab("edit");
  };
  
  // 处理新建脚本
  const handleCreateNewScript = () => {
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
      setEditingScriptId(null);
      setActiveTab("list");
    } catch (error) {
      console.error("保存脚本失败:", error);
      alert("保存脚本失败");
    }
  };
  
  // 处理重新排序
  const handleReorderScripts = async (newScripts: RegexScript[]) => {
    try {
      await reorderScripts(newScripts);
    } catch (error) {
      console.error("重新排序脚本失败:", error);
      alert("重新排序脚本失败");
    }
  };
  
  // 处理取消编辑
  const handleCancelEdit = () => {
    setEditingScriptId(null);
    setActiveTab("list");
  };
  
  // 处理导入点击
  const handleImportClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  // 处理导入文件变化
  const handleImportChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    
    try {
      const script = await importScriptFromFile(file);
      
      if (script) {
        // 导入成功提示
        alert(`成功导入脚本: ${script.scriptName}`);
      }
    } catch (error) {
      console.error("导入脚本失败:", error);
      alert("导入脚本失败");
    }
    
    // 重置文件输入
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">正则表达式</h1>
      
      {/* 隐藏的文件输入 */}
      <input 
        type="file"
        ref={fileInputRef}
        onChange={handleImportChange}
        accept=".json"
        className="hidden"
      />
      
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
            onImportClick={handleImportClick}
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