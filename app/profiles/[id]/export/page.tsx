"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useProfilesStore } from "@/lib/store";
import { Profile, CharacterCardExport } from "@/lib/types";
import { Download, ArrowLeft } from "lucide-react";

export default function ExportProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { profiles } = useProfilesStore();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [exportFormat, setExportFormat] = useState<"json" | "text">("json");
  const [exportData, setExportData] = useState<string>("");

  // 根据ID加载角色信息
  useEffect(() => {
    const id = params.id as string;
    const foundProfile = profiles.find(p => p.id === id);
    if (foundProfile) {
      setProfile(foundProfile);
      generateExportData(foundProfile, exportFormat);
    } else {
      router.push("/profiles");
    }
  }, [params.id, profiles, router, exportFormat]);

  // 生成导出数据
  const generateExportData = (profile: Profile, format: "json" | "text") => {
    if (format === "json") {
      const exportObj: CharacterCardExport = {
        version: 1,
        name: profile.name,
        description: profile.description,
        personality: "",
        scenario: "",
        first_message: "",
        avatar: profile.avatar,
        example_dialogs: [],
      };
      
      // 从系统提示词中提取个性和场景信息
      const lines = profile.systemPrompt.split("\n");
      let currentSection = "personality";
      let personality = "";
      let scenario = "";
      
      for (const line of lines) {
        if (line.toLowerCase().includes("场景") || line.toLowerCase().includes("scenario")) {
          currentSection = "scenario";
          continue;
        }
        
        if (currentSection === "personality") {
          personality += line + "\n";
        } else {
          scenario += line + "\n";
        }
      }
      
      exportObj.personality = personality.trim();
      exportObj.scenario = scenario.trim();
      
      // 如果没有成功提取，则整个提示词作为个性
      if (!exportObj.personality) {
        exportObj.personality = profile.systemPrompt;
      }
      
      setExportData(JSON.stringify(exportObj, null, 2));
    } else {
      // 文本格式，简单展示
      let textData = `名称: ${profile.name}\n`;
      textData += `描述: ${profile.description}\n`;
      textData += `标签: ${profile.tags.join(', ')}\n`;
      textData += `系统提示词:\n${profile.systemPrompt}\n`;
      
      setExportData(textData);
    }
  };

  // 下载导出文件
  const handleDownload = () => {
    if (!profile) return;
    
    const filename = `${profile.name.replace(/\s+/g, '_')}_character_card.${exportFormat === 'json' ? 'json' : 'txt'}`;
    const blob = new Blob([exportData], { type: exportFormat === 'json' ? 'application/json' : 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    
    // 清理
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 0);
  };

  if (!profile) {
    return <div className="flex justify-center items-center h-screen">正在加载...</div>;
  }

  return (
    <div className="container mx-auto p-4 max-w-3xl">
      <header className="flex items-center gap-4 mb-8">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">{profile.name} - 导出角色卡</h1>
          <p className="text-muted-foreground">将角色信息导出为可分享的格式</p>
        </div>
      </header>

      <div className="space-y-8">
        {/* 导出格式选择 */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">选择导出格式</h2>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="exportFormat"
                checked={exportFormat === "json"}
                onChange={() => setExportFormat("json")}
                className="h-4 w-4"
              />
              <span>JSON格式 (角色卡格式)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="exportFormat"
                checked={exportFormat === "text"}
                onChange={() => setExportFormat("text")}
                className="h-4 w-4"
              />
              <span>纯文本格式</span>
            </label>
          </div>
        </div>

        {/* 预览 */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">预览</h2>
          <pre className="bg-card border rounded-md p-4 overflow-auto max-h-[400px] text-sm">
            {exportData}
          </pre>
        </div>

        {/* 下载按钮 */}
        <div className="flex justify-end">
          <Button onClick={handleDownload} className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            下载 {exportFormat === 'json' ? 'JSON' : '文本'} 文件
          </Button>
        </div>
      </div>
    </div>
  );
} 