"use client";

import { useEffect, useState } from "react";
import { Player } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { PlayerForm } from "@/components/ui/player-form";
import { PlayerCard } from "@/components/ui/player-card";
import { usePlayerStore } from "@/lib/store";
import { Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { generateId } from "@/lib/utils";

export default function PlayersPage() {
  const { players, loadPlayers, savePlayer, deletePlayer, currentPlayerId, setCurrentPlayer } = usePlayerStore();
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogTitle, setDialogTitle] = useState("");
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);

  useEffect(() => {
    document.title = "玩家管理 - AI角色扮演平台";
    loadPlayers().then(() => setLoading(false));
  }, [loadPlayers]);

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
    await deletePlayer(player.id);
  };

  const handleSavePlayer = async (player: Player) => {
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
        <Button onClick={handleCreatePlayer} className="flex items-center gap-1">
          <Plus className="h-4 w-4" />
          创建玩家
        </Button>
      </div>

      {players.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-muted-foreground mb-4">
            还没有创建任何玩家。点击"创建玩家"按钮开始创建。
          </p>
          <Button onClick={handleCreatePlayer}>创建第一个玩家</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {players.map((player) => (
            <PlayerCard
              key={player.id}
              player={player}
              isActive={player.id === currentPlayerId}
              onSelect={handleSelectPlayer}
              onEdit={handleEditPlayer}
              onDelete={handleDeletePlayer}
            />
          ))}
        </div>
      )}

      {/* 玩家创建/编辑对话框 */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{dialogTitle}</DialogTitle>
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