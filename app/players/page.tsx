"use client";

import { useState, useEffect } from "react";
import { Player } from "@/lib/types";
import { usePlayerStore } from "@/lib/store";
import { PlayerCard } from "@/components/ui/player-card";
import { PlayerListItem } from "@/components/ui/player-list-item";
import { PlayerCardWithBatch } from "@/components/ui/player-card-with-batch";
import { PlayerListItemWithBatch } from "@/components/ui/player-list-item-with-batch";
import { PlayerForm } from "@/components/ui/player-form";
import { Button } from "@/components/ui/button";
import { Plus, Users, Trash2 } from "lucide-react";
import { ViewToggle } from "@/components/ui/view-toggle";
import { useResponsiveView } from "@/lib/useResponsiveView";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { generateId } from "@/lib/utils";
import { BatchManagementContainer, BatchAction } from "@/components/ui/batch-management-container";

type ViewMode = 'grid' | 'list';

export default function PlayersPage() {
  const { players, loadPlayers, savePlayer, deletePlayer, currentPlayerId, setCurrentPlayer } = usePlayerStore();
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogTitle, setDialogTitle] = useState("");
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [viewMode, setViewMode] = useResponsiveView('players-view-mode');
  const [batchMode, setBatchMode] = useState(false);

  useEffect(() => {
    document.title = "玩家管理 - AI角色扮演平台";
    loadPlayers().then(() => setLoading(false));
  }, [loadPlayers]);

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
  };

  const handleCreatePlayer = () => {
    setEditingPlayer(null);
    setDialogTitle("创建新玩家");
    setIsDialogOpen(true);
  };

  const handleEditPlayer = (player: Player) => {
    setEditingPlayer(player);
    setDialogTitle(`编辑玩家: ${player.name}`);
    setIsDialogOpen(true);
  };

  const handleSelectPlayer = async (player: Player) => {
    await setCurrentPlayer(player.id);
  };

  const handleDeletePlayer = async (player: Player) => {
    try {
      await deletePlayer(player.id);
    } catch (error) {
      console.error('删除玩家失败:', error);
    }
  };

  // 批量删除玩家
  const handleBatchDelete = async (selectedIds: string[]) => {
    try {
      for (const playerId of selectedIds) {
        await deletePlayer(playerId);
      }
    } catch (error) {
      console.error('批量删除玩家失败:', error);
    }
  };

  // 定义批量操作
  const batchActions: BatchAction[] = [
    {
      id: 'delete',
      label: '删除',
      icon: Trash2,
      variant: 'destructive',
      confirmTitle: '批量删除玩家',
      confirmMessage: '确定要删除选中的 {count} 个{itemName}吗？此操作无法撤销。',
      handler: handleBatchDelete
    }
  ];  const handleSavePlayer = async (player: Player) => {
    await savePlayer(player);
    setIsDialogOpen(false);
  };

  if (loading) {
    return (
      <div className="container mx-auto p-4 flex justify-center items-center h-60">
        <p>加载中...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">玩家管理</h1>
        <div className="flex space-x-2 items-center">
          {/* 视图切换组件 */}
          <div className="hidden sm:block">
            <ViewToggle viewMode={viewMode} onChange={handleViewModeChange} />
          </div>
          <Button onClick={handleCreatePlayer} className="flex items-center gap-1">
            <Plus className="h-4 w-4" />
            创建玩家
          </Button>
        </div>
      </div>
      
      {/* 移动端专用的视图切换按钮 */}
      <div className="sm:hidden flex justify-end items-center mb-4">
        <ViewToggle viewMode={viewMode} onChange={handleViewModeChange} />
      </div>

      {players.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-muted-foreground mb-4">
            还没有创建任何玩家。点击"创建玩家"按钮开始创建。
          </p>
          <Button onClick={handleCreatePlayer}>创建第一个玩家</Button>
        </div>
      ) : players.length > 0 ? (
        <BatchManagementContainer
          items={players}
          actions={batchActions}
          itemName="玩家"
          className="space-y-4"
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

              {/* 玩家列表 */}
              {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {players.map((player) => 
                    batchMode ? (
                      <PlayerCardWithBatch
                        key={player.id}
                        player={player}
                        isActive={player.id === currentPlayerId}
                        onSelect={handleSelectPlayer}
                        onEdit={handleEditPlayer}
                        onDelete={handleDeletePlayer}
                        isSelected={isSelected(player.id)}
                        onToggleSelection={() => toggleSelection(player.id)}
                        showCheckbox={batchMode}
                        batchMode={batchMode}
                      />
                    ) : (
                      <PlayerCard
                        key={player.id}
                        player={player}
                        isActive={player.id === currentPlayerId}
                        onSelect={handleSelectPlayer}
                        onEdit={handleEditPlayer}
                        onDelete={handleDeletePlayer}
                      />
                    )
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {players.map((player) => 
                    batchMode ? (
                      <PlayerListItemWithBatch
                        key={player.id}
                        player={player}
                        isActive={player.id === currentPlayerId}
                        onSelect={handleSelectPlayer}
                        onEdit={handleEditPlayer}
                        onDelete={handleDeletePlayer}
                        isSelected={isSelected(player.id)}
                        onToggleSelection={() => toggleSelection(player.id)}
                        showCheckbox={batchMode}
                        batchMode={batchMode}
                      />
                    ) : (
                      <PlayerListItem
                        key={player.id}
                        player={player}
                        isActive={player.id === currentPlayerId}
                        onSelect={handleSelectPlayer}
                        onEdit={handleEditPlayer}
                        onDelete={handleDeletePlayer}
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
          <p className="text-muted-foreground mb-4">还没有创建玩家</p>
          <Button onClick={handleCreatePlayer}>创建第一个玩家</Button>
        </div>
      )}

      {/* 玩家创建/编辑对话框 */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{dialogTitle}</DialogTitle>
            <DialogDescription>
              {editingPlayer ? "编辑玩家信息，包括名称、描述和头像" : "创建一个新的玩家，填写基本信息"}
            </DialogDescription>
          </DialogHeader>
          <PlayerForm
            initialPlayer={editingPlayer || undefined}
            onSave={handleSavePlayer}
            onCancel={() => setIsDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
} 