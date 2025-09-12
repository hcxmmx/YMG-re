"use client";

import { useState, useEffect, useRef } from "react";
import { Character, CharacterImportResult } from "@/lib/types";
import { characterStorage } from "@/lib/storage";
import { CharacterCard } from "@/components/ui/character-card";
import { CharacterListItem } from "@/components/ui/character-list-item";
import { CharacterCardWithBatch } from "@/components/ui/character-card-with-batch";
import { CharacterListItemWithBatch } from "@/components/ui/character-list-item-with-batch";
import { CharacterForm } from "@/components/ui/character-form";
import { Button } from "@/components/ui/button";
import { ViewToggle } from "@/components/ui/view-toggle";
import { useResponsiveView } from "@/lib/useResponsiveView";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useChatStore } from "@/lib/store";
import { BatchImport, ImportResult } from "@/components/ui/batch-import";
import { BatchManagementContainer, BatchAction } from "@/components/ui/batch-management-container";
import { Trash2, Users } from "lucide-react";

type ViewMode = 'grid' | 'list';

export default function CharactersPage() {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogTitle, setDialogTitle] = useState("");
  const [editingCharacter, setEditingCharacter] = useState<Character | null>(null);
  const [viewMode, setViewMode] = useResponsiveView('characters-view-mode');
  const [batchMode, setBatchMode] = useState(false);
  
  useEffect(() => {
    document.title = "角色管理";
    loadCharacters();
  }, []);

  const loadCharacters = async () => {
    try {
      setLoading(true);
      const loadedCharacters = await characterStorage.listCharacters();
      setCharacters(loadedCharacters.reverse()); // 最新创建的角色排在前面
    } catch (error) {
      console.error('加载角色失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCharacter = () => {
    setIsCreating(true);
    setEditingCharacter(null);
    setDialogTitle("创建新角色");
    setIsDialogOpen(true);
  };

  const handleEditCharacter = (character: Character) => {
    setEditingCharacter(character);
    setIsCreating(false);
    setDialogTitle(`编辑角色: ${character.name}`);
    setIsDialogOpen(true);
  };

  const handleSaveCharacter = async (character: Character) => {
    setIsDialogOpen(false);
    await loadCharacters();
  };

  const handleCancelEdit = () => {
    setIsDialogOpen(false);
  };

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
  };

  // 批量删除角色
  const handleBatchDelete = async (selectedIds: string[]) => {
    try {
      const { getCharacterConversations, deleteConversation } = useChatStore.getState();
      
      // 批量删除角色及其相关对话
      for (const characterId of selectedIds) {
        // 获取该角色的所有对话并删除
        const characterChats = getCharacterConversations(characterId);
        const deletePromises = characterChats.map(chat => deleteConversation(chat.id));
        await Promise.all(deletePromises);
        
        // 删除角色
        await characterStorage.deleteCharacter(characterId);
      }
      
      // 重新加载角色列表
      await loadCharacters();
    } catch (error) {
      console.error('批量删除角色失败:', error);
    }
  };

  // 定义批量操作
  const batchActions: BatchAction[] = [
    {
      id: 'delete',
      label: '删除',
      icon: Trash2,
      variant: 'destructive',
      confirmTitle: '批量删除角色',
      confirmMessage: '确定要删除选中的 {count} 个{itemName}吗？此操作无法撤销，相关的聊天记录也会被删除。',
      handler: handleBatchDelete
    }
  ];

  // 处理角色卡批量导入
  const handleBatchImportCharacter = async (files: File[]): Promise<ImportResult[]> => {
    const results: ImportResult[] = [];
    
    for (const file of files) {
      try {
        const result = await characterStorage.importCharacter(file);
        
        if (result?.characterId) {
          let successMessage = `导入成功`;
          
          // 如果有导入的世界书，添加相关信息
          if (result.importedWorldBooks && result.importedWorldBooks.length > 0) {
            successMessage += `，导入了${result.importedWorldBooks.length}个世界书并自动关联`;
          }
          
          // 如果有导入的正则脚本，添加相关信息
          if (result.importedRegexScripts && result.importedRegexScripts.length > 0) {
            successMessage += `，导入了${result.importedRegexScripts.length}个正则脚本并自动关联`;
          }
          
          results.push({
            success: true,
            fileName: file.name,
            id: result.characterId,
            message: successMessage
          });
        } else {
          results.push({
            success: false,
            fileName: file.name,
            message: result?.error || '未知错误'
          });
        }
      } catch (error) {
        console.error('导入角色卡失败:', error);
        results.push({
          success: false,
          fileName: file.name,
          message: error instanceof Error ? error.message : '导入过程中出错'
        });
      }
    }
    
    // 完成后重新加载角色列表
    await loadCharacters();
    
    return results;
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">角色管理</h1>
        <div className="flex space-x-2 items-center">
          {/* 视图切换组件 */}
          <div className="hidden sm:block mr-2">
            <ViewToggle viewMode={viewMode} onChange={handleViewModeChange} />
          </div>
          
          {/* 批量导入按钮 */}
          <div className="hidden sm:block">
            <BatchImport 
              onImport={handleBatchImportCharacter}
              accept=".json,.png"
              buttonText="批量导入"
              disabled={isImporting}
            />
          </div>
          
          <Button onClick={handleCreateCharacter}>
            创建角色
          </Button>
        </div>
      </div>
      
      {/* 移动端专用的视图切换和导入按钮 */}
      <div className="sm:hidden flex justify-between items-center mb-4">
        <ViewToggle viewMode={viewMode} onChange={handleViewModeChange} />
        <BatchImport 
          onImport={handleBatchImportCharacter}
          accept=".json,.png"
          buttonText="导入"
          size="sm"
          disabled={isImporting}
        />
      </div>

      {/* 角色表单模态框 */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[850px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{dialogTitle}</DialogTitle>
            <DialogDescription>
              {editingCharacter ? "编辑角色信息，包括名称、描述、开场白和头像" : "创建一个新的角色，填写基本信息"}
            </DialogDescription>
          </DialogHeader>
          <CharacterForm
            initialCharacter={editingCharacter || undefined}
            onSave={handleSaveCharacter}
            onCancel={handleCancelEdit}
          />
        </DialogContent>
      </Dialog>

      {loading ? (
        <div className="flex justify-center items-center h-40">
          <p>加载中...</p>
        </div>
      ) : characters.length > 0 ? (
        <BatchManagementContainer
          items={characters}
          actions={batchActions}
          itemName="角色"
          className="space-y-4"
          showKeyboardHints={true}
          batchMode={batchMode}
        >
          {({ selectedIds, isSelected, toggleSelection, clearSelection }) => (
            <>
              {/* 批量模式切换按钮 */}
              <div className="flex justify-between items-center mb-4">
                <Button
                  variant={batchMode ? "default" : "outline"}
                  onClick={() => {
                    if (batchMode) {
                      // 退出批量模式时清空选择
                      clearSelection();
                    }
                    setBatchMode(!batchMode);
                  }}
                  className="gap-2"
                >
                  <Users className="h-4 w-4" />
                  {batchMode ? "退出批量模式" : "批量管理"}
                </Button>
              </div>

              {/* 角色列表 */}
              {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {characters.map((character) => 
                    batchMode ? (
                      <CharacterCardWithBatch
                        key={character.id}
                        character={character}
                        onEdit={() => handleEditCharacter(character)}
                        onDelete={loadCharacters}
                        isSelected={isSelected(character.id)}
                        onToggleSelection={() => toggleSelection(character.id)}
                        showCheckbox={batchMode}
                        batchMode={batchMode}
                      />
                    ) : (
                      <CharacterCard 
                        key={character.id} 
                        character={character} 
                        onEdit={() => handleEditCharacter(character)}
                        onDelete={loadCharacters}
                      />
                    )
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {characters.map((character) => 
                    batchMode ? (
                      <CharacterListItemWithBatch
                        key={character.id}
                        character={character}
                        onEdit={() => handleEditCharacter(character)}
                        onDelete={loadCharacters}
                        isSelected={isSelected(character.id)}
                        onToggleSelection={() => toggleSelection(character.id)}
                        showCheckbox={batchMode}
                        batchMode={batchMode}
                      />
                    ) : (
                      <CharacterListItem
                        key={character.id}
                        character={character}
                        onEdit={() => handleEditCharacter(character)}
                        onDelete={loadCharacters}
                      />
                    )
                  )}
                </div>
              )}
            </>
          )}
        </BatchManagementContainer>
      ) : (
        <div className="flex flex-col items-center justify-center h-60">
          <p className="text-muted-foreground mb-4">还没有创建角色</p>
          <div className="flex space-x-2">
            {/* 使用批量导入组件替代旧的导入方法 */}
            <BatchImport 
              onImport={handleBatchImportCharacter}
              accept=".json,.png"
              buttonText="导入角色卡"
              variant="outline"
              disabled={isImporting}
            />
            <Button onClick={handleCreateCharacter}>
              创建角色
            </Button>
          </div>
        </div>
      )}
    </div>
  );
} 