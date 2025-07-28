import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "云边有个妙妙馆",
  description: "基于Gemini API的高度可定制AI对话平台",
  manifest: "/manifest.json",
  themeColor: "#000000",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "云妙馆"
  },
  icons: {
    icon: "/icons/icon-956x956.png",
    apple: "/icons/icon-956x956.png"
  }
}; 