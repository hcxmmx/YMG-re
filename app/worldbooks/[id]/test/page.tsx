"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Play, RefreshCw } from "lucide-react";
import { useWorldBookStore } from "@/lib/store";
import { WorldBook } from "@/lib/types";
import { 
  generateWorldInfoBefore, 
  generateWorldInfoAfter, 
  activateEntries,
  WorldBookEntryWithActivationInfo
} from "@/lib/worldBookUtils"; 

interface TestPageProps {
  params: {
    id: string;
  };
}

export default function TestPage({ params }: TestPageProps) {
  const { id } = params;
  const router = useRouter();
  
  const { worldBooks, loadWorldBooks, getWorldBook } = useWorldBookStore();
  
  const [isLoading, setIsLoading] = useState(true);
  const [worldBook, setWorldBook] = useState<WorldBook | null>(null);
  const [notFound, setNotFound] = useState(false);
  
  // 测试状态
  const [testText, setTestText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<{
    activatedEntries: WorldBookEntryWithActivationInfo[];
    notActivatedEntries: WorldBookEntryWithActivationInfo[];
    beforeContent: string | null;
    afterContent: string | null;
    log: string[];
  } | null>(null);
  
  // 加载世界书详情
  useEffect(() => {
    const loadData = async () => {
      // 先尝试从状态中获取世界书
      let wb = getWorldBook(id);
      
      // 如果状态中没有，尝试从存储中加载
      if (!wb) {
        await loadWorldBooks();
        wb = getWorldBook(id);
      }
      
      if (wb) {
        setWorldBook(wb);
        setIsLoading(false);
      } else {
        setNotFound(true);
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [id, getWorldBook, loadWorldBooks]);
  
  // 运行测试
  const handleRunTest = async () => {
    if (!worldBook || !testText) return;
    
    setIsProcessing(true);
    
    try {
      // 创建测试消息列表
      const testMessages = [
        {
          id: "1",
          role: "user" as const,
          content: testText,
          timestamp: new Date(),
          name: "用户" // 模拟用户消息
        }
      ];
      
      const log: string[] = [];
      
      // 激活条目
      const activatedEntries = await activateEntries({
        worldBook,
        chatMessages: testMessages,
        onDebug: (message: string) => {
          log.push(message);
        }
      });
      
      // 获取未激活的条目信息（仅选择性条目）
      const notActivatedEntries = worldBook.entries
        .filter(entry => entry.enabled && entry.strategy === 'selective')
        .filter(entry => !activatedEntries.some(a => a.id === entry.id))
        .map(entry => ({
          ...entry,
          _notActivatedReason: "未匹配关键字"
        }));
      
      // 生成世界信息
      const beforeContent = await generateWorldInfoBefore({
        worldBook,
        chatMessages: testMessages
      });
      
      const afterContent = await generateWorldInfoAfter({
        worldBook,
        chatMessages: testMessages
      });
      
      setResult({
        activatedEntries,
        notActivatedEntries,
        beforeContent,
        afterContent,
        log
      });
    } catch (error) {
      console.error("测试过程中出错:", error);
    } finally {
      setIsProcessing(false);
    }
  };
  
  // 重置测试
  const handleReset = () => {
    setTestText("");
    setResult(null);
  };
  
  if (isLoading) {
    return (
      <div className="container mx-auto p-4">
        <div className="flex justify-center py-10">
          <p className="text-muted-foreground">加载中...</p>
        </div>
      </div>
    );
  }
  
  if (notFound) {
    return (
      <div className="container mx-auto p-4">
        <div className="text-center py-10">
          <h2 className="text-xl font-bold mb-4">世界书不存在</h2>
          <Button asChild>
            <Link href="/worldbooks">返回世界书列表</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="mb-6">
        <Button variant="ghost" className="mb-2" asChild>
          <Link href={`/worldbooks/${id}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            返回世界书
          </Link>
        </Button>
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">世界书测试</h1>
            <p className="text-muted-foreground">{worldBook?.name}</p>
          </div>
        </div>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>测试输入</CardTitle>
            <CardDescription>输入聊天文本测试世界书条目激活</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={testText}
              onChange={(e) => setTestText(e.target.value)}
              placeholder="输入聊天文本，用于测试世界书条目的激活..."
              className="min-h-[150px]"
            />
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button 
              variant="outline" 
              onClick={handleReset}
              disabled={isProcessing || !testText}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              重置
            </Button>
            <Button 
              onClick={handleRunTest}
              disabled={isProcessing || !testText}
            >
              {isProcessing ? (
                <>处理中...</>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  运行测试
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
        
        {result && (
          <>
            <Card className="md:col-span-2 mb-4">
              <CardHeader>
                <CardTitle>测试状态信息</CardTitle>
                <CardDescription>测试参数和关键信息</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <h4 className="text-sm font-medium mb-2">世界书设置</h4>
                    <div className="bg-secondary p-3 rounded-md space-y-1">
                      <p className="text-sm">启用状态: {worldBook?.enabled ? "已启用" : "已禁用"}</p>
                      <p className="text-sm">扫描深度: {worldBook?.settings?.scanDepth || 5}</p>
                      <p className="text-sm">最大递归步骤: {worldBook?.settings?.maxRecursionSteps || 0}</p>
                      <p className="text-sm">包含角色名称: {worldBook?.settings?.includeNames ? "是" : "否"}</p>
                      <p className="text-sm">默认区分大小写: {worldBook?.settings?.caseSensitive ? "是" : "否"}</p>
                      <p className="text-sm">默认全词匹配: {worldBook?.settings?.matchWholeWords ? "是" : "否"}</p>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium mb-2">条目统计</h4>
                    <div className="bg-secondary p-3 rounded-md space-y-1">
                      <p className="text-sm">总条目数量: {worldBook?.entries?.length || 0}</p>
                      <p className="text-sm">启用条目数量: {worldBook?.entries?.filter(e => e.enabled)?.length || 0}</p>
                      <p className="text-sm">常量条目数量: {worldBook?.entries?.filter(e => e.enabled && e.strategy === 'constant')?.length || 0}</p>
                      <p className="text-sm">选择性条目数量: {worldBook?.entries?.filter(e => e.enabled && e.strategy === 'selective')?.length || 0}</p>
                      <p className="text-sm">向量条目数量: {worldBook?.entries?.filter(e => e.enabled && e.strategy === 'vectorized')?.length || 0}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>激活条目 ({result.activatedEntries.length})</CardTitle>
                <CardDescription>
                  以下条目被成功激活
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 max-h-[500px] overflow-y-auto">
                {result.activatedEntries.length === 0 ? (
                  <p className="text-yellow-500">没有条目被激活</p>
                ) : (
                  result.activatedEntries.map((entry) => (
                    <div key={entry.id} className="p-3 border rounded-md">
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`w-3 h-3 rounded-full ${
                          entry.strategy === 'constant' ? 'bg-blue-500' : 
                          entry.strategy === 'selective' ? 'bg-green-500' : 
                          'bg-purple-500'
                        }`} />
                        <h4 className="font-medium">{entry.title}</h4>
                        <span className="text-xs bg-secondary px-2 py-0.5 rounded">
                          {entry.position === 'before' ? '前置' : '后置'}
                        </span>
                        {entry._activationInfo && (
                          <span className="text-xs text-muted-foreground">
                            {entry._activationInfo}
                          </span>
                        )}
                      </div>
                      <div className="text-sm mb-2">
                        <strong>主要关键字:</strong> {entry.primaryKeys?.join(', ') || '无'}
                        {entry.secondaryKeys?.length > 0 && (
                          <><br/><strong>次要关键字:</strong> {entry.secondaryKeys?.join(', ')}</>
                        )}
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{entry.content}</p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
            
            {result.notActivatedEntries?.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>未激活条目 ({result.notActivatedEntries.length})</CardTitle>
                  <CardDescription>
                    以下选择性条目没有被激活
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 max-h-[500px] overflow-y-auto">
                  {result.notActivatedEntries.map((entry) => (
                    <div key={entry.id} className="p-3 border border-gray-200 rounded-md opacity-70">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-3 h-3 rounded-full bg-gray-400" />
                        <h4 className="font-medium">{entry.title}</h4>
                        <span className="text-xs bg-secondary px-2 py-0.5 rounded">
                          {entry.position === 'before' ? '前置' : '后置'}
                        </span>
                      </div>
                      <div className="text-sm mb-2">
                        <strong>主要关键字:</strong> {entry.primaryKeys?.join(', ') || '无'}
                        {entry.secondaryKeys?.length > 0 && (
                          <><br/><strong>次要关键字:</strong> {entry.secondaryKeys?.join(', ')}</>
                        )}
                        <br/>
                        <strong>匹配设置:</strong> 
                        {entry.caseSensitive ? "区分大小写" : "不区分大小写"}, 
                        {entry.matchWholeWords ? "全词匹配" : "部分匹配"}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
            
            <Card>
              <CardHeader>
                <CardTitle>激活日志</CardTitle>
                <CardDescription>
                  条目激活过程的详细日志
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-secondary p-3 rounded-md max-h-[500px] overflow-y-auto">
                  {result.log.length === 0 ? (
                    <p className="text-muted-foreground">没有日志</p>
                  ) : (
                    <pre className="text-xs">
                      {result.log.join('\n')}
                    </pre>
                  )}
                </div>
              </CardContent>
            </Card>
            
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>生成结果</CardTitle>
                <CardDescription>
                  最终生成的世界信息内容
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <h4 className="text-sm font-medium mb-2">前置世界信息</h4>
                    <div className="bg-secondary p-3 rounded-md min-h-[100px] max-h-[300px] overflow-y-auto">
                      {result.beforeContent ? (
                        <pre className="whitespace-pre-wrap text-sm">
                          {result.beforeContent}
                        </pre>
                      ) : (
                        <p className="text-muted-foreground">没有生成前置世界信息</p>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium mb-2">后置世界信息</h4>
                    <div className="bg-secondary p-3 rounded-md min-h-[100px] max-h-[300px] overflow-y-auto">
                      {result.afterContent ? (
                        <pre className="whitespace-pre-wrap text-sm">
                          {result.afterContent}
                        </pre>
                      ) : (
                        <p className="text-muted-foreground">没有生成后置世界信息</p>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
} 