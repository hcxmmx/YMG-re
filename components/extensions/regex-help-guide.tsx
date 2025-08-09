"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { HelpCircle, Folder, FileText, Link, Settings } from "lucide-react";

export function RegexHelpGuide() {
  const [isOpen, setIsOpen] = useState(false);

  const steps = [
    {
      icon: <Folder className="h-5 w-5 text-blue-500" />,
      title: "1. 创建文件夹",
      description: "为不同预设创建专门的正则文件夹，便于管理和自动切换。",
      tips: [
        "在「按文件夹」视图中，点击文件夹选择器旁的 + 按钮快速创建",
        "也可在「文件夹管理」Tab中创建和编辑文件夹",
        "文件夹类型：预设文件夹（可关联预设）、角色文件夹（角色专属）",
        "预设文件夹作用域：全局（所有预设都启用）、局部（仅关联预设启用）"
      ]
    },
    {
      icon: <FileText className="h-5 w-5 text-green-500" />,
      title: "2. 添加正则脚本",
      description: "创建或导入正则表达式脚本到指定文件夹。",
      tips: [
        "在文件夹视图中新建脚本会自动保存到当前文件夹",
        "批量导入也会自动导入到当前查看的文件夹",
        "支持从其他地方导出的 .json 格式脚本文件"
      ]
    },
    {
      icon: <Settings className="h-5 w-5 text-amber-500" />,
      title: "3. 理解文件夹作用域",
      description: "掌握全局和局部文件夹的区别，实现精确的正则控制。",
      tips: [
        "全局预设文件夹：在所有预设（包括无预设）时都会启用",
        "局部预设文件夹：仅在关联的特定预设启用时才会启用",
        "角色文件夹：与预设无关，仅在对应角色对话时生效",
        "默认的「未分类」文件夹是全局作用域，始终启用"
      ]
    },
    {
      icon: <Link className="h-5 w-5 text-purple-500" />,
      title: "4. 关联到预设",
      description: "将文件夹关联到预设，实现自动启用/禁用。",
      tips: [
        "在「文件夹管理」中点击链子图标 🔗 关联文件夹到预设",
        "切换预设时，系统会自动启用关联的文件夹，禁用其他文件夹",
        "这样每个预设只会使用对应的正则脚本"
      ]
    },
    {
      icon: <Settings className="h-5 w-5 text-orange-500" />,
      title: "5. 管理和维护",
      description: "使用各种工具管理你的正则脚本。",
      tips: [
        "使用批量操作快速移动、启用、禁用或删除多个脚本",
        "可以导出重要脚本作为备份",
        "删除文件夹会同时删除其中的所有脚本，请谨慎操作"
      ]
    }
  ];

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <HelpCircle className="h-4 w-4 text-muted-foreground hover:text-foreground" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5" />
            正则表达式功能使用指南
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <p className="text-sm text-muted-foreground">
            正则表达式功能可以自动处理聊天消息和提示词，支持文件夹管理和预设关联。
          </p>
          
          <div className="space-y-4">
            {steps.map((step, index) => (
              <Card key={index} className="border-l-4 border-l-primary/30">
                <CardContent className="pt-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">{step.icon}</div>
                    <div className="flex-1">
                      <h4 className="font-medium text-sm mb-2">{step.title}</h4>
                      <p className="text-sm text-muted-foreground mb-3">
                        {step.description}
                      </p>
                      <ul className="space-y-1">
                        {step.tips.map((tip, tipIndex) => (
                          <li key={tipIndex} className="text-xs text-muted-foreground flex items-start gap-2">
                            <span className="inline-block w-1.5 h-1.5 bg-primary/60 rounded-full mt-1.5 flex-shrink-0"></span>
                            <span>{tip}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-md">
            <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
              💡 快速开始建议
            </h4>
            <ol className="text-xs text-blue-800 dark:text-blue-200 space-y-1">
              <li>1. 切换到「按文件夹」视图</li>
              <li>2. 点击文件夹选择器旁的 + 按钮创建文件夹</li>
              <li>3. 选择适当的作用域：全局（通用脚本）或局部（预设专用）</li>
              <li>4. 在该文件夹中新建或导入正则脚本</li>
              <li>5. 对于局部文件夹，到「文件夹管理」中关联到预设</li>
            </ol>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
