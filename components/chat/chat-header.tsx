"use client";

import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useChatStore } from "@/lib/store";
import { useNavbar } from "@/app/layout";
import { ChevronUp, ChevronDown, User, Plus, MessageCircle, MoreHorizontal, MessageSquare, Pencil, Trash, MoreVertical, GitBranch, Check } from "lucide-react";
import { Character, Conversation } from "@/lib/types";
import Image from "next/image";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { useRouter } from 'next/navigation';

interface ChatHeaderProps {
  character?: Character | null;
}

export function ChatHeader({ character }: ChatHeaderProps) {
  const { 
    currentTitle, 
    currentConversationId, 
    updateConversationTitle,
    getCharacterConversations,
    createNewCharacterChat,
    setCurrentConversation,
    conversations,
    deleteConversation,
    renameConversation,
    branches,
    currentBranchId,
    loadBranches,
    switchBranch,
    renameBranch,
    deleteBranch
  } = useChatStore();
  const { isNavbarVisible, toggleNavbar } = useNavbar();
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(currentTitle);
  const [characterConversations, setCharacterConversations] = useState<Conversation[]>([]);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState<{id: string, title: string} | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // 分支操作状态
  const [isRenameBranchDialogOpen, setIsRenameBranchDialogOpen] = useState(false);
  const [isDeleteBranchDialogOpen, setIsDeleteBranchDialogOpen] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<{id: string, name: string} | null>(null);
  const [newBranchName, setNewBranchName] = useState('');
  const branchRenameInputRef = useRef<HTMLInputElement>(null);

  // 当currentTitle从store中更新时，同步本地状态
  useEffect(() => {
    setTitle(currentTitle);
  }, [currentTitle]);

  // 获取角色相关的对话
  useEffect(() => {
    if (character?.id) {
      const convs = getCharacterConversations(character.id);
      setCharacterConversations(convs);
    }
  }, [character, getCharacterConversations, conversations]);
  
  // 加载分支信息
  useEffect(() => {
    if (currentConversationId) {
      loadBranches();
    }
  }, [currentConversationId, loadBranches]);

  // 处理导航栏切换并滚动到适当位置
  const handleToggleNavbar = () => {
    toggleNavbar();
    
    // 如果导航栏将变为不可见，滚动页面到头部导航栏的位置
    if (isNavbarVisible) {
      // 延迟执行以等待导航栏隐藏动画
      setTimeout(() => {
        window.scrollTo({
          top: 0,
          behavior: 'smooth'
        });
      }, 10);
    } else {
      // 如果导航栏将变为可见，等待导航栏显示后聚焦在头部
      setTimeout(() => {
        headerRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }, 10);
    }
  };

  // 处理标题编辑
  const handleTitleEdit = () => {
    if (!currentConversationId) return;
    setIsEditing(true);
    // 等待DOM更新后聚焦输入框
    setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 0);
  };

  // 保存编辑后的标题
  const saveTitle = () => {
    if (currentConversationId && title.trim()) {
      updateConversationTitle(title.trim());
    }
    setIsEditing(false);
  };

  // 按回车保存，按Esc取消
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      saveTitle();
    } else if (e.key === 'Escape') {
      setTitle(currentTitle);
      setIsEditing(false);
    }
  };

  // 创建新对话
  const handleCreateNewChat = async () => {
    if (character?.id) {
      const newConversationId = await createNewCharacterChat(character.id);
      if (newConversationId) {
        // 刷新页面以加载新对话
        router.push(`/chat?characterId=${character.id}&conversationId=${newConversationId}`);
      }
    }
  };

  // 切换到指定对话
  const handleSwitchConversation = (conversationId: string) => {
    setCurrentConversation(conversationId);
  };

  // 格式化日期
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // 处理对话删除
  const handleDeleteConversation = async (conversationId: string) => {
    try {
      await deleteConversation(conversationId);
      setIsDeleteDialogOpen(false);
      setSelectedConversation(null);
    } catch (error) {
      console.error('删除对话失败:', error);
    }
  };

  // 打开重命名对话框
  const handleOpenRenameDialog = (conversation: {id: string, title: string}) => {
    setSelectedConversation(conversation);
    setNewTitle(conversation.title);
    setIsRenameDialogOpen(true);
    
    // 等待对话框打开后聚焦输入框
    setTimeout(() => {
      renameInputRef.current?.focus();
      renameInputRef.current?.select();
    }, 100);
  };

  // 执行重命名
  const handleRenameConversation = async () => {
    if (!selectedConversation || !newTitle.trim()) return;
    
    try {
      await renameConversation(selectedConversation.id, newTitle.trim());
      setIsRenameDialogOpen(false);
      setSelectedConversation(null);
      setNewTitle('');
    } catch (error) {
      console.error('重命名对话失败:', error);
    }
  };

  // 打开删除对话框
  const handleOpenDeleteDialog = (conversation: {id: string, title: string}) => {
    setSelectedConversation(conversation);
    setIsDeleteDialogOpen(true);
  };
  
  // 处理分支切换
  const handleSwitchBranch = async (branchId: string) => {
    try {
      await switchBranch(branchId);
    } catch (error) {
      console.error('切换分支失败:', error);
    }
  };
  
  // 打开分支重命名对话框
  const handleOpenRenameBranchDialog = (branch: {id: string, name: string}) => {
    setSelectedBranch(branch);
    setNewBranchName(branch.name);
    setIsRenameBranchDialogOpen(true);
    
    // 等待对话框打开后聚焦输入框
    setTimeout(() => {
      branchRenameInputRef.current?.focus();
      branchRenameInputRef.current?.select();
    }, 100);
  };
  
  // 执行分支重命名
  const handleRenameBranch = async () => {
    if (!selectedBranch || !newBranchName.trim()) return;
    
    try {
      await renameBranch(selectedBranch.id, newBranchName.trim());
      setIsRenameBranchDialogOpen(false);
      setSelectedBranch(null);
      setNewBranchName('');
    } catch (error) {
      console.error('重命名分支失败:', error);
      // TODO: 添加友好的错误提示
    }
  };
  
  // 打开删除分支对话框
  const handleOpenDeleteBranchDialog = (branch: {id: string, name: string}) => {
    setSelectedBranch(branch);
    setIsDeleteBranchDialogOpen(true);
  };
  
  // 执行分支删除
  const handleDeleteBranch = async () => {
    if (!selectedBranch) return;
    
    try {
      await deleteBranch(selectedBranch.id);
      setIsDeleteBranchDialogOpen(false);
      setSelectedBranch(null);
    } catch (error) {
      console.error('删除分支失败:', error);
      // TODO: 添加友好的错误提示
    }
  };
  
  // 获取当前分支
  const currentBranch = branches.find(b => b.id === currentBranchId);
  // 判断是否为主分支
  const isMainBranch = !currentBranch || currentBranch.parentMessageId === '';
  // 当前分支名称
  const branchName = isMainBranch ? '主分支' : (currentBranch?.name || '未知分支');

  return (
    <div ref={headerRef} className="w-full border-b">
      <div className="h-12 flex items-center px-4">
        <div className="flex items-center gap-2 flex-1">
          {character && (
            <div className="flex items-center">
              <div className="h-8 w-8 rounded-full overflow-hidden bg-muted flex-shrink-0">
                {character.avatar ? (
                  <Image
                    src={character.avatar}
                    alt={character.name}
                    width={32}
                    height={32}
                    className="object-cover w-full h-full"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary">
                    {character.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
            </div>
          )}
          
          <div className="flex-1 truncate">
            {isEditing ? (
              <Input
                ref={inputRef}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={saveTitle}
                onKeyDown={handleKeyDown}
                className="h-8"
                placeholder="对话名称"
              />
            ) : (
              <div className="flex items-center gap-2">
                <div 
                  className="font-medium truncate cursor-pointer py-1"
                  onClick={handleTitleEdit}
                  title={currentTitle}
                >
                  {character ? character.name : currentTitle}
                </div>
                
                {/* 分支管理下拉菜单 */}
                {currentConversationId && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-6 px-1.5 flex items-center gap-1 text-xs">
                        <GitBranch className="h-3.5 w-3.5" />
                        <span>{branchName}</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-56">
                      <div className="text-xs font-medium text-muted-foreground px-2 py-1.5">
                        当前对话的分支
                      </div>
                      
                      {/* 主分支 */}
                      {branches.filter(b => !b.parentMessageId || b.parentMessageId === '').map(branch => (
                        <DropdownMenuItem
                          key={branch.id}
                          onClick={() => handleSwitchBranch(branch.id)}
                          className="flex items-center justify-between"
                        >
                          <div className="flex items-center gap-1">
                            <GitBranch className="h-4 w-4" />
                            <span className="font-medium">主分支</span>
                          </div>
                          <div className="flex items-center gap-1">
                            {branch.id === currentBranchId && (
                              <Check className="h-3.5 w-3.5" />
                            )}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-5 w-5 p-0"
                                >
                                  <MoreVertical className="h-3 w-3" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-36">
                                <DropdownMenuItem
                                  className="cursor-pointer flex items-center gap-2"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenRenameBranchDialog({id: branch.id, name: '主分支'});
                                  }}
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                  <span>重命名</span>
                                </DropdownMenuItem>
                                {/* 主分支不允许删除 */}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </DropdownMenuItem>
                      ))}
                      
                      {/* 其他分支 */}
                      {branches.filter(b => b.parentMessageId && b.parentMessageId !== '').map(branch => (
                        <DropdownMenuItem
                          key={branch.id}
                          onClick={() => handleSwitchBranch(branch.id)}
                          className="flex items-center justify-between"
                        >
                          <div className="flex items-center gap-1">
                            <GitBranch className="h-4 w-4" />
                            <span>{branch.name}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            {branch.id === currentBranchId && (
                              <Check className="h-3.5 w-3.5" />
                            )}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-5 w-5 p-0"
                                >
                                  <MoreVertical className="h-3 w-3" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-36">
                                <DropdownMenuItem
                                  className="cursor-pointer flex items-center gap-2"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenRenameBranchDialog({id: branch.id, name: branch.name});
                                  }}
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                  <span>重命名</span>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="cursor-pointer text-destructive flex items-center gap-2"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenDeleteBranchDialog({id: branch.id, name: branch.name});
                                  }}
                                  disabled={branch.id === currentBranchId}
                                >
                                  <Trash className="h-3.5 w-3.5" />
                                  <span>删除</span>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </DropdownMenuItem>
                      ))}
                      
                      {branches.length === 0 && (
                        <div className="px-2 py-2 text-sm text-muted-foreground">
                          暂无分支
                        </div>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
                
                {/* 对话管理下拉菜单 */}
                {character && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                        <MessageCircle className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-56">
                      <div className="text-xs font-medium text-muted-foreground px-2 py-1.5">
                        对话管理
                      </div>
                      
                      <DropdownMenuSeparator />
                      
                      {/* 创建新对话 */}
                      <DropdownMenuItem
                        className="cursor-pointer flex items-center gap-2"
                        onClick={handleCreateNewChat}
                      >
                        <Plus className="h-4 w-4" />
                        <span>创建新对话</span>
                      </DropdownMenuItem>
                      
                      {characterConversations.length > 0 && <DropdownMenuSeparator />}
                      
                      {/* 已有对话列表 */}
                      <div className="max-h-60 overflow-y-auto">
                        {characterConversations.map(conv => (
                          <DropdownMenuItem
                            key={conv.id}
                            className={`cursor-pointer flex items-start justify-between gap-2 pr-1 ${
                              conv.id === currentConversationId ? 'bg-muted' : ''
                            }`}
                            onClick={() => handleSwitchConversation(conv.id)}
                          >
                            <div className="flex items-start gap-2 flex-1 min-w-0">
                              <MessageSquare className="h-4 w-4 mt-0.5 flex-shrink-0" />
                              <div className="flex flex-col min-w-0">
                                <span className="truncate">{conv.title}</span>
                                <span className="text-xs text-muted-foreground">
                                  {formatDate(conv.lastUpdated)}
                                  {' · '}
                                  {conv.messages.length}条消息
                                </span>
                              </div>
                            </div>
                            
                            {/* 对话操作按钮 */}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 p-0"
                                >
                                  <MoreVertical className="h-3.5 w-3.5" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-36">
                                <DropdownMenuItem
                                  className="cursor-pointer flex items-center gap-2"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenRenameDialog({id: conv.id, title: conv.title});
                                  }}
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                  <span>重命名</span>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="cursor-pointer text-destructive flex items-center gap-2"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenDeleteDialog({id: conv.id, title: conv.title});
                                  }}
                                >
                                  <Trash className="h-3.5 w-3.5" />
                                  <span>删除</span>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </DropdownMenuItem>
                        ))}
                      </div>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center ml-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleToggleNavbar}
            className="h-8 w-8"
            title={isNavbarVisible ? "隐藏导航栏" : "显示导航栏"}
          >
            {isNavbarVisible ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
            <span className="sr-only">
              {isNavbarVisible ? "隐藏导航栏" : "显示导航栏"}
            </span>
          </Button>
        </div>
      </div>

      {character && character.description && (
        <div className="px-4 py-2 text-sm text-muted-foreground border-t bg-muted/30">
          <p className="line-clamp-1">
            {character.description}
          </p>
        </div>
      )}
      
      {/* 删除对话确认对话框 */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>删除对话</DialogTitle>
            <DialogDescription>
              确定要删除这个对话吗？此操作不可撤销。
            </DialogDescription>
          </DialogHeader>
          
          {selectedConversation && (
            <div className="py-2">
              <p className="text-sm font-medium">对话名称：{selectedConversation.title}</p>
            </div>
          )}
          
          <DialogFooter className="flex space-x-2 justify-end">
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              取消
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => selectedConversation && handleDeleteConversation(selectedConversation.id)}
            >
              确认删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* 重命名对话对话框 */}
      <Dialog open={isRenameDialogOpen} onOpenChange={setIsRenameDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>重命名对话</DialogTitle>
            <DialogDescription>
              请输入新的对话名称。
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <Input
              ref={renameInputRef}
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="对话名称"
              className="w-full"
            />
          </div>
          
          <DialogFooter className="flex space-x-2 justify-end">
            <Button variant="outline" onClick={() => setIsRenameDialogOpen(false)}>
              取消
            </Button>
            <Button 
              variant="default"
              onClick={handleRenameConversation}
              disabled={!newTitle.trim()}
            >
              确认
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* 分支重命名对话框 */}
      <Dialog open={isRenameBranchDialogOpen} onOpenChange={setIsRenameBranchDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>重命名分支</DialogTitle>
            <DialogDescription>
              为分支"{selectedBranch?.name || ''}"输入新名称
            </DialogDescription>
          </DialogHeader>
          <div className="mt-2">
            <Input
              ref={branchRenameInputRef}
              value={newBranchName}
              onChange={(e) => setNewBranchName(e.target.value)}
              placeholder="分支名称"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleRenameBranch();
                }
              }}
            />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">取消</Button>
            </DialogClose>
            <Button onClick={handleRenameBranch}>确认</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* 删除分支确认对话框 */}
      <Dialog open={isDeleteBranchDialogOpen} onOpenChange={setIsDeleteBranchDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>删除分支</DialogTitle>
            <DialogDescription>
              确定要删除分支"{selectedBranch?.name || ''}"吗？此操作不可撤销。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">取消</Button>
            </DialogClose>
            <Button
              variant="destructive"
              onClick={handleDeleteBranch}
            >
              删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 