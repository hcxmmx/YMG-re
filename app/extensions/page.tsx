"use client";

import { useEffect } from "react";

export default function ExtensionsPage() {
  useEffect(() => {
    document.title = "拓展功能 - AI角色扮演平台";
  }, []);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">拓展功能</h1>
      <p className="text-muted-foreground">此功能正在开发中，敬请期待...</p>
    </div>
  );
} 