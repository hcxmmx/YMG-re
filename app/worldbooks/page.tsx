"use client";

import { useEffect, useState } from "react";
import { useWorldBookStore } from "@/lib/store";
import { WorldBook } from "@/lib/types";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Plus, FileUp, Download, Trash, Edit, Link2, Users } from "lucide-react";
import { ViewToggle } from "@/components/ui/view-toggle";
import { useResponsiveView } from "@/lib/useResponsiveView";
import { WorldBookListItem } from "@/components/ui/worldbook-list-item";

type ViewMode = 'grid' | 'list';

export default function WorldBooksPage() {
  const { worldBooks, loadWorldBooks, importWorldBookFromFile, exportWorldBookToFile, deleteWorldBook, toggleWorldBookEnabled, getLinkedCharacters } = useWorldBookStore();
  const [isLoading, setIsLoading] = useState(true);
  const [linkedCharacters, setLinkedCharacters] = useState<Record<string, number>>({});
  const [viewMode, setViewMode] = useResponsiveView('worldbooks-view-mode');

  // 加载世界书列表
  useEffect(() => {
    document.title = "世界书 - AI角色扮演平台";
    
    const loadData = async () => {
      await loadWorldBooks();
      
      // 加载关联的角色信息
      const charactersInfo: Record<string, number> = {};
      
      for (const worldBook of worldBooks) {
        try {
          const characters = await getLinkedCharacters(worldBook.id);
          charactersInfo[worldBook.id] = characters.length;
        } catch (error) {
          console.error(`获取世界书 ${worldBook.id} 关联角色失败`, error);
          charactersInfo[worldBook.id] = 0;
        }
      }
      
      setLinkedCharacters(charactersInfo);
      setIsLoading(false);
    };
    
    loadData();
  }, [loadWorldBooks, worldBooks, getLinkedCharacters]);

  // 导入世界书文件
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        await importWorldBookFromFile(file);
        // 重置文件选择器，允许再次导入相同的文件
        e.target.value = '';
      } catch (error) {
        console.error("导入世界书失败", error);
        alert("导入世界书失败");
      }
    }
  };

  // 导出世界书
  const handleExport = async (id: string) => {
    try {
      await exportWorldBookToFile(id);
    } catch (error) {
      console.error("导出世界书失败", error);
      alert("导出世界书失败");
    }
  };

  // 删除世界书
  const handleDelete = async (id: string) => {
    if (confirm("确定要删除这个世界书吗？此操作不可撤销。")) {
      try {
        await deleteWorldBook(id);
      } catch (error) {
        console.error("删除世界书失败", error);
        alert("删除世界书失败");
      }
    }
  };

  // 切换世界书启用状态
  const handleToggleEnabled = async (id: string) => {
    try {
      await toggleWorldBookEnabled(id);
    } catch (error) {
      console.error("切换世界书启用状态失败", error);
      alert("切换世界书启用状态失败");
    }
  };

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">世界书管理</h1>
        <div className="flex space-x-2 items-center">
          {/* 视图切换组件 */}
          <div className="hidden sm:block mr-2">
            <ViewToggle viewMode={viewMode} onChange={handleViewModeChange} />
          </div>
          
          <Button asChild>
            <Link href="/worldbooks/new">
              <Plus className="mr-2 h-4 w-4" /> 新建
            </Link>
          </Button>
          <div className="relative">
            <input
              id="import-file"
              type="file"
              accept=".json"
              className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
              onChange={handleImport}
            />
            <Button variant="outline">
              <FileUp className="mr-2 h-4 w-4" /> 导入
            </Button>
          </div>
        </div>
      </div>

      {/* 移动端专用的视图切换按钮 */}
      <div className="sm:hidden flex justify-end items-center mb-4">
        <ViewToggle viewMode={viewMode} onChange={handleViewModeChange} />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10">
          <p className="text-muted-foreground">加载中...</p>
        </div>
      ) : worldBooks.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-muted-foreground mb-6">还没有世界书</p>
          <div className="flex justify-center gap-4">
            <Button asChild>
              <Link href="/worldbooks/new">新建世界书</Link>
            </Button>
            <div className="relative">
              <input
                id="import-file-empty"
                type="file"
                accept=".json"
                className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                onChange={handleImport}
              />
              <Button variant="outline">导入世界书</Button>
            </div>
          </div>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {worldBooks.map((worldBook) => (
            <WorldBookCard
              key={worldBook.id}
              worldBook={worldBook}
              characterCount={linkedCharacters[worldBook.id] || 0}
              onExport={() => handleExport(worldBook.id)}
              onDelete={() => handleDelete(worldBook.id)}
              onToggleEnabled={() => handleToggleEnabled(worldBook.id)}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {worldBooks.map((worldBook) => (
            <WorldBookListItem
              key={worldBook.id}
              worldBook={worldBook}
              characterCount={linkedCharacters[worldBook.id] || 0}
              onExport={() => handleExport(worldBook.id)}
              onDelete={() => handleDelete(worldBook.id)}
              onToggleEnabled={() => handleToggleEnabled(worldBook.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// 世界书卡片组件
function WorldBookCard({ worldBook, characterCount, onExport, onDelete, onToggleEnabled }: { 
  worldBook: WorldBook,
  characterCount: number,
  onExport: () => void,
  onDelete: () => void,
  onToggleEnabled: () => void
}) {
  return (
    <Card className={`${!worldBook.enabled ? 'opacity-60' : ''}`}>
      <CardHeader>
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-2">
            <Switch 
              checked={worldBook.enabled} 
              onCheckedChange={onToggleEnabled}
              aria-label={worldBook.enabled ? "禁用世界书" : "启用世界书"}
            />
            <span className="text-sm text-muted-foreground">
              {worldBook.enabled ? "已启用" : "已禁用"}
            </span>
          </div>
          
          {characterCount > 0 && (
            <div className="flex items-center text-sm">
              <Users className="h-4 w-4 mr-1 text-blue-500" />
              <span className="text-blue-500">{characterCount} 个角色</span>
            </div>
          )}
        </div>
        
        <CardTitle className="truncate">{worldBook.name}</CardTitle>
        <CardDescription>
          {worldBook.description || "无描述"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-sm text-muted-foreground">
          <div>条目数量: {worldBook.entries.length}</div>
          <div>创建时间: {new Date(worldBook.createdAt).toLocaleDateString()}</div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" size="sm" asChild>
          <Link href={`/worldbooks/${worldBook.id}`}>
            <Edit className="h-4 w-4 mr-1" />
            编辑
          </Link>
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onExport}>
            <Download className="h-4 w-4 mr-1" />
            导出
          </Button>
          <Button variant="outline" size="sm" className="text-red-500 hover:text-red-600" onClick={onDelete}>
            <Trash className="h-4 w-4 mr-1" />
            删除
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
} 